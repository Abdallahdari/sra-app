// Import the real sra.so content (downloaded by `npm run fetch:wp`) into MongoDB.
// Images are downloaded once and converted to small WebP files in /uploads.
//
//   npm run import             -> adds new items, never overwrites items already in the DB
//   npm run import -- --refresh -> also re-applies sra.so data to items that came from sra.so
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import * as cheerio from 'cheerio';
import { connectDb, disconnectDb } from '../src/db.js';
import { Content, Settings, slugify } from '../src/models.js';
import { importRemoteImage } from '../src/images.js';
import { config } from '../src/config.js';
import { htmlToMd, decode, originalImage, absolute } from './lib/html.mjs';

const REFRESH = process.argv.includes('--refresh');
const raw = async (f) => JSON.parse(await readFile(join(config.rawDir, f), 'utf8'));
const [posts, pages, media, categories] = await Promise.all(['posts.json', 'pages.json', 'media.json', 'categories.json'].map(raw));
const homeHtml = await readFile(join(config.rawDir, 'home.html'), 'utf8');

const catName = Object.fromEntries(categories.map((c) => [c.id, c.name]));
const mediaUrl = Object.fromEntries(media.map((m) => [m.id, m.source_url]));
const page = (slug) => {
  const p = pages.find((x) => x.slug === slug);
  if (!p) throw new Error(`page not found: ${slug}`);
  return p;
};
const $page = (slug) => cheerio.load(page(slug).content.rendered);
const txt = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const BOILER = /^(\*?Published by the|See all our|Source: Somali Researchers Association \(SRA\)\.?$)/i;
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };
function parseDate(s, fallback) {
  const m = String(s || '').match(/(\d{1,2})\s+([A-Za-z]{3})[a-z]*\s+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()] !== undefined) return new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1], 12));
  const y = String(s || '').match(/(20\d{2})/);
  if (y) return new Date(Date.UTC(+y[1], 0, 1, 12));
  return fallback || new Date();
}
const ytId = (url) => (String(url).match(/(?:v=|youtu\.be\/|embed\/)([\w-]{11})/) || [])[1];

// ---------- small concurrency helper ----------
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const k = i++;
        out[k] = await fn(items[k], k);
      }
    }),
  );
  return out;
}

// Try the full-size original first; some uploads only exist in their resized form.
async function img(url) {
  if (!url) return '';
  const full = originalImage(url);
  return (await importRemoteImage(full)) || (full !== absolute(url) ? await importRemoteImage(absolute(url)) : '');
}

// The bulk media listing can come back incomplete, so look up missing ids one by one.
async function mediaById(id) {
  if (!id) return '';
  if (mediaUrl[id]) return mediaUrl[id];
  try {
    const r = await fetch(`https://www.sra.so/wp-json/wp/v2/media/${id}?_fields=source_url`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (sra-app import)' },
      signal: AbortSignal.timeout(60_000),
    });
    if (r.ok) mediaUrl[id] = (await r.json()).source_url || '';
  } catch {}
  return mediaUrl[id] || '';
}
async function localiseBody(md) {
  // replace remote image URLs inside the markdown with local copies
  const urls = [...md.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((m) => m[1]);
  for (const u of urls) {
    const local = await img(u);
    md = local ? md.split(`(${u})`).join(`(${local})`) : md.replace(new RegExp(`!\\[[^\\]]*\\]\\(${u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\)\\n*`, 'g'), '');
  }
  return md;
}

// ---------- YouTube titles (public oEmbed, no API key) ----------
const ytCache = new Map();
async function ytInfo(id) {
  if (ytCache.has(id)) return ytCache.get(id);
  let info = { title: '', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (r.ok) {
      const j = await r.json();
      info = { title: j.title || '', thumb: j.thumbnail_url || info.thumb };
    }
  } catch {}
  ytCache.set(id, info);
  return info;
}

// ---------- upsert ----------
const stats = {};
async function save(doc) {
  doc.slug ||= slugify(doc.title);
  doc.source = 'wp';
  stats[doc.type] = (stats[doc.type] || 0) + 1;
  const existing = await Content.findOne({ wpKey: doc.wpKey }).select('_id image gallery').lean();
  if (existing && !REFRESH) return;
  // sra.so sometimes fails to serve an image; never replace a saved image with nothing
  if (existing) {
    if (!doc.image && existing.image) doc.image = existing.image;
    if ((doc.gallery?.length ?? 0) < (existing.gallery?.length ?? 0)) doc.gallery = existing.gallery;
  }
  // avoid slug collisions with other docs of the same type
  let slug = doc.slug;
  let n = 1;
  while (await Content.exists({ type: doc.type, slug, wpKey: { $ne: doc.wpKey } })) slug = `${doc.slug}-${++n}`;
  doc.slug = slug;
  await Content.updateOne({ wpKey: doc.wpKey }, { $set: doc }, { upsert: true });
}

// =====================================================================
await connectDb();
await Content.init();
console.log(`Importing sra.so content ${REFRESH ? '(refresh mode)' : ''}...`);

// ---------- 1. Flash cards + policy impact stories (WordPress posts) ----------
const realPosts = posts.filter((p) => p.slug !== 'articles');
await mapLimit(realPosts, 6, async (p) => {
  const cats = p.categories.map((c) => catName[c]).filter(Boolean);
  const isStory = cats.includes('Policy Impact');
  const { md, images } = htmlToMd(p.content.rendered, { skip: BOILER });
  const featured = (await mediaById(p.featured_media)) || images[0] || '';
  const image = await img(featured);
  let body = await localiseBody(md);
  if (!isStory && image) body = body.replace(/^!\[[^\]]*\]\([^)]+\)\n*/, ''); // the card image is shown above
  const firstPara = (md.split('\n\n').find((l) => !/^(##|!\[|- |\[)/.test(l)) || '').replace(/\*\*/g, '');
  const gallery = isStory ? (await Promise.all(images.slice(0, 12).map(img))).filter((g) => g && g !== image) : [];
  await save({
    wpKey: `post:${p.id}`,
    type: isStory ? 'story' : 'insight',
    title: decode(p.title.rendered),
    slug: p.slug,
    summary: decode(p.excerpt?.rendered).replace(/\s*\[…\]$/, '').slice(0, 400) || firstPara.slice(0, 400),
    body,
    image,
    gallery,
    date: new Date(p.date),
    category: isStory ? 'Policy Impact' : cats.find((c) => c !== 'Policy Impact') || 'Economy',
    link: p.link,
    featured: isStory,
  });
});
console.log('posts done');

// ---------- 2. Research library ----------
{
  const $ = $page('research-reports');
  const cards = $('.r-card').toArray();
  await mapLimit(cards, 4, async (el, i) => {
    const c = $(el);
    const [kind, year] = txt(c.find('.r-type').text()).split('·').map((s) => s.trim());
    const isYearOnly = /^\d{4}$/.test(kind);
    const title = txt(c.find('h3').text());
    await save({
      wpKey: `research:${slugify(title)}`,
      type: 'research',
      title,
      summary: txt(c.find('.r-what').text()),
      category: txt(c.find('.r-tag').text()),
      link: absolute(c.find('a.r-dl, .r-foot a').attr('href') || ''),
      date: parseDate(isYearOnly ? kind : year),
      order: i,
      meta: {
        kind: isYearOnly ? 'Journal article' : kind,
        year: Number(isYearOnly ? kind : year) || undefined,
        authors: txt(c.find('.r-by').text()),
        journal: txt(c.find('.r-jr').text()),
        source: /SRA research/i.test(c.text()) ? 'SRA research' : 'Network researcher',
      },
      featured: i < 4,
    });
  });
  console.log('research done');
}

// ---------- 3. Projects ----------
{
  const $ = $page('projects-assignments');
  const cards = $('.p-card').toArray();
  for (const [i, el] of cards.entries()) {
    const c = $(el);
    const title = txt(c.find('h3').first().text());
    const period = txt(c.find('.p-yr').text());
    await save({
      wpKey: `project:${slugify(title)}`,
      type: 'project',
      title,
      summary: txt(c.children('p').first().text() || c.find('p').first().text()),
      category: txt(c.find('.p-tag').first().text()),
      date: parseDate(period),
      order: i,
      meta: {
        client: txt(c.find('.p-for').text()),
        period,
        ongoing: c.find('.p-live').length > 0,
        facts: c.find('.p-facts span').map((_, s) => txt($(s).text())).get().filter(Boolean),
      },
      featured: i < 4,
    });
  }
  console.log('projects done');
}

// ---------- 4. Researchers + podcast guests + episodes ----------
{
  const $ = $page('our-researchers');
  const cards = $('.cr-card').toArray();
  await mapLimit(cards, 6, async (el, i) => {
    const c = $(el);
    const name = txt(c.find('h3').text());
    await save({
      wpKey: `researcher:${slugify(name)}`,
      type: 'researcher',
      title: name,
      summary: txt(c.find('.cr-bio').text()),
      category: txt(c.find('.cr-tag').text()),
      image: await img(c.find('img').attr('src')),
      order: i,
      meta: { group: i === 0 ? 'Leadership' : 'Network researcher', role: i === 0 ? 'Managing Director' : '' },
    });
  });

  const $g = $page('cilmi-iyo-cod-researchers');
  const guests = $g('.cr-card').toArray();
  const seenIds = new Set();
  await mapLimit(guests, 4, async (el, i) => {
    const c = $g(el);
    const name = txt(c.find('h3').text());
    const photo = await img(c.find('img').attr('src'));
    const area = txt(c.find('.cr-tag').text());
    const study = txt(c.find('.cr-art p').text()).replace(/^[“"]|[”"]$/g, '');
    await save({
      wpKey: `guest:${slugify(name)}`,
      type: 'researcher',
      title: name,
      summary: txt(c.find('.cr-bio').text()),
      category: area,
      image: photo,
      order: 100 + i,
      meta: { group: 'Podcast guest', role: 'Guest on Cilmi iyo Cod' },
    });
    for (const a of c.find('a.cr-ep').toArray()) {
      const url = $g(a).attr('href');
      const id = ytId(url);
      if (!id) continue;
      seenIds.add(id);
      const number = Number((txt($g(a).text()).match(/\d+/) || [])[0]) || undefined;
      const info = await ytInfo(id);
      await save({
        wpKey: `episode:${id}`,
        type: 'episode',
        title: info.title || `Cilmi iyo Cod with ${name}`,
        summary: study ? `Study discussed: ${study}` : '',
        category: area,
        link: `https://www.youtube.com/watch?v=${id}`,
        image: photo || (await importRemoteImage(info.thumb)),
        meta: { guest: name, number },
        featured: number && number >= 30,
      });
    }
  });

  // Episodes on the podcast page that aren't linked to a guest card
  const pod = page('sra-podcast').content.rendered;
  const podIds = [...new Set([...pod.matchAll(/youtube_url&quot;:&quot;([^&]+)/g)].map((m) => ytId(m[1].replace(/\\\//g, '/'))).filter(Boolean))];
  await mapLimit(podIds.filter((id) => !seenIds.has(id)), 4, async (id) => {
    const info = await ytInfo(id);
    await save({
      wpKey: `episode:${id}`,
      type: 'episode',
      title: info.title || 'Cilmi iyo Cod episode',
      summary: '',
      link: `https://www.youtube.com/watch?v=${id}`,
      image: await importRemoteImage(info.thumb),
      meta: { guest: '' },
    });
  });
  console.log('researchers + episodes done');
}

// ---------- 5. Videos: narrated flash card videos + event videos ----------
{
  const $ = $page('flash-card-videos');
  const cards = $('.fv-card').toArray();
  await mapLimit(cards, 6, async (el) => {
    const c = $(el);
    const title = txt(c.find('h3').text());
    const src = absolute(c.find('video source').attr('src') || c.find('video').attr('src'));
    if (!src) return;
    const d = txt(c.find('.fv-d').clone().children().remove().end().text());
    await save({
      wpKey: `video:${src}`,
      type: 'video',
      title,
      summary: txt(c.find('.fv-t').text()),
      category: c.attr('data-c') || d.split('·')[0].trim(),
      date: parseDate(d),
      videoUrl: src,
      image: await img(c.find('video').attr('poster')),
      link: absolute(c.find('.fv-a a').first().attr('href') || ''),
    });
  });

  const ev = page('event-videos').content.rendered;
  const ids = [...new Set([...ev.matchAll(/youtube_url&quot;:&quot;([^&]+)/g)].map((m) => ytId(m[1].replace(/\\\//g, '/'))).filter(Boolean))];
  await mapLimit(ids, 4, async (id, i) => {
    const info = await ytInfo(id);
    await save({
      wpKey: `video:yt:${id}`,
      type: 'video',
      title: info.title || `Researchers' Night video ${i + 1}`,
      category: 'Events',
      videoUrl: `https://www.youtube.com/watch?v=${id}`,
      image: await importRemoteImage(info.thumb),
      date: new Date(Date.UTC(2025, 11, 26, 12)),
    });
  });
  console.log('videos done');
}

// ---------- 6. Events ----------
{
  const eventPage = async ({ slug, key, title, date, venue, category, summary, featured, bodySlug }) => {
    const p = page(slug);
    const { md, images } = htmlToMd((bodySlug ? page(bodySlug) : p).content.rendered);
    const pageImages = htmlToMd(p.content.rendered).images;
    const all = [...new Set([...images, ...pageImages])];
    const gallery = (await mapLimit(all.slice(0, 40), 6, img)).filter(Boolean);
    // keep the body text-only; photos go in the gallery
    const body = md.replace(/!\[[^\]]*\]\([^)]+\)\n*/g, '').replace(/\n{3,}/g, '\n\n').trim();
    await save({
      wpKey: key,
      type: 'event',
      title,
      slug,
      summary,
      body,
      image: gallery[0] || '',
      gallery,
      date,
      category,
      link: p.link,
      meta: { venue },
      featured,
    });
  };
  await eventPage({
    slug: 'researchers-night-2026',
    key: 'event:rn-2026',
    title: 'Somalia Researchers’ Night 2026',
    date: new Date(Date.UTC(2026, 11, 25, 15)),
    venue: 'Mogadishu',
    category: "Researchers' Night",
    summary: 'The third annual Researchers’ Night, held on the last Friday of December. Researchers who published in 2026 can register to be recognised.',
    featured: true,
  });
  await eventPage({
    slug: 'researchers-night-2025',
    key: 'event:rn-2025',
    bodySlug: 'event-report',
    title: 'Researchers’ Night 2025',
    date: new Date(Date.UTC(2025, 11, 26, 15)),
    venue: 'Jazeera Hotel, Mogadishu',
    category: "Researchers' Night",
    summary: 'SRA’s annual evening recognising 80 Somali researchers who published peer-reviewed articles in 2025, with roundtables linking findings to policy.',
    featured: true,
  });
  await eventPage({
    slug: 'researchers-night',
    key: 'event:rn-2024',
    title: 'Researchers’ Night 2024',
    date: new Date(Date.UTC(2024, 11, 27, 15)),
    venue: 'Mogadishu',
    category: "Researchers' Night",
    summary: 'The first Somalia Researchers’ Night, honouring Somali researchers who published peer-reviewed work in 2024 in front of universities, companies and hospital leaders.',
    featured: false,
  });
  console.log('events done');
}

// ---------- 7. Services ----------
{
  const SERVICES = [
    ['Research & Evaluation', 'Baseline, midline and endline studies and evaluations.', 'research-and-evaluation'],
    ['Third-Party Monitoring', 'Independent field verification of projects and services.', null],
    ['CAPI & CATI Data Collection', 'Tablet and phone surveys by trained enumerators.', 'data-collection'],
    ['Data Quality & Analysis', 'Cleaning, checking and analysis into clear findings.', 'data-quality-analysis'],
    ['GIS and Mapping', 'Maps of services, needs and coverage.', 'gis-and-mapping'],
    ['Policy Advisory', 'Evidence-based advice and policy briefs.', 'policy'],
    ['Translation Services', 'Somali and English translation of tools and reports.', 'translation-services'],
    ['Ethical Approval', 'Independent ethics review and approval letters.', 'ethics-review'],
  ];
  const $h = cheerio.load(homeHtml);
  const homeImgs = $h('img').map((_, e) => $h(e).attr('src')).get();
  const pick = (re) => homeImgs.find((s) => re.test(s));
  const serviceImg = [/h07-u-interview/, /h06-u-training/, /h03-field-handwash/, /h08-u-fgdTree/, /h02-map/, /h25-u-sdgTable/, /h10-u-sdgTable/, /h12-u-bigGroup/];
  for (const [i, [title, summary, slug]] of SERVICES.entries()) {
    let body = '';
    if (slug) body = await localiseBody(htmlToMd(page(slug).content.rendered).md);
    body = body.replace(/!\[[^\]]*\]\([^)]+\)\n*/g, '').trim();
    await save({
      wpKey: `service:${slugify(title)}`,
      type: 'service',
      title,
      summary,
      body,
      image: await img(pick(serviceImg[i])),
      order: i + 1,
      link: slug === 'ethics-review' ? 'https://www.sra.so/ethics-review/' : '',
    });
  }
  console.log('services done');
}

// ---------- 8. Partners (client logos + university MoUs) ----------
{
  const $h = cheerio.load(homeHtml);
  const logos = $h('img').filter((_, e) => /-logo-/.test($h(e).attr('src') || '')).toArray();
  for (const [i, e] of logos.entries()) {
    const name = $h(e).attr('alt') || 'Partner';
    await save({
      wpKey: `partner:${slugify(name)}`,
      type: 'partner',
      title: name,
      category: 'Client',
      image: await importRemoteImage(absolute($h(e).attr('src'))),
      order: i,
    });
  }
  const mous = [
    { name: 'Darul Hikmah University', year: 2022, re: /2022\/02\/MoU/ },
    { name: 'Salaam University', year: 2021, re: /2021\/09\/MoU/ },
  ];
  for (const m of mous) {
    const src = $h('img').map((_, e) => $h(e).attr('src')).get().find((s) => m.re.test(s));
    await save({
      wpKey: `partner:mou:${slugify(m.name)}`,
      type: 'partner',
      title: m.name,
      category: 'MoU',
      summary: 'Memorandum of Understanding with the Somali Researchers Association to build research capacity together.',
      image: await img(src),
      date: new Date(Date.UTC(m.year, 0, 1, 12)),
      order: 50,
    });
  }
  console.log('partners done');
}

// ---------- 9. Site settings (hero, stats, regions, contact) ----------
{
  const $h = cheerio.load(homeHtml);
  const existing = await Settings.findById('site').lean();
  if (!existing || REFRESH) {
    const heroSrc = $h('img').map((_, e) => $h(e).attr('src')).get().find((s) => /hero-field/.test(s));
    const about = htmlToMd(page('about-us').content.rendered).md.replace(/!\[[^\]]*\]\([^)]+\)\n*/g, '').trim();
    await Settings.findByIdAndUpdate(
      'site',
      {
        hero: {
          title: txt($h('h1').first().text()) || 'We go to the field so decisions are based on evidence',
          subtitle: 'Somali researchers and enumerators collecting reliable data across Somalia, for government, UN agencies, NGOs and businesses.',
          image: await img(heroSrc),
        },
        stats: [
          { value: '2010', label: 'Founded in Somalia' },
          { value: '200+', label: 'Researchers in our network' },
          { value: '150+', label: 'Trained enumerators' },
          { value: '40+', label: 'Podcast episodes' },
        ],
        regions: ['Banadir', 'Galmudug', 'Puntland', 'South West', 'Hirshabelle', 'Jubaland', 'North East', 'Somaliland'],
        contact: {
          address: 'Adani Tower, 5th floor, Maka Al-Mukarama Rd, Hodan District, Mogadishu, Somalia',
          phones: ['+252 61 551 3952', '+252 62 000 0067'],
          email: 'sra@sra.so',
          website: 'https://www.sra.so',
        },
        social: {
          facebook: 'https://www.facebook.com/somaliresearcher',
          x: 'https://x.com/SomaliSra',
          linkedin: 'https://www.linkedin.com/company/somali-researchers-association-sra/',
          youtube: 'https://www.youtube.com/channel/UCBI8kju_3nuJIgOk4Ua0NBA',
        },
        about,
      },
      { upsert: true },
    );
  }
  console.log('settings done');
}

// ---------- 10. Fill gaps: video posters from their flash card, and vice versa ----------
{
  const cards = await Content.find({ type: 'insight' }).select('link image').lean();
  const byLink = new Map(cards.map((c) => [c.link?.replace(/\/$/, ''), c]));
  let fixed = 0;
  for (const v of await Content.find({ type: 'video', link: { $ne: '' } }).select('link image').lean()) {
    const card = byLink.get(v.link.replace(/\/$/, ''));
    if (!card) continue;
    if (!v.image && card.image) {
      await Content.updateOne({ _id: v._id }, { $set: { image: card.image } });
      fixed++;
    } else if (v.image && !card.image) {
      await Content.updateOne({ _id: card._id }, { $set: { image: v.image } });
      fixed++;
    }
  }
  console.log(`linked ${fixed} card/video images`);
}

const counts = await Content.aggregate([{ $group: { _id: '$type', n: { $sum: 1 } } }, { $sort: { _id: 1 } }]);
console.log('\nSeen on sra.so:', stats);
console.log('In database:', Object.fromEntries(counts.map((c) => [c._id, c.n])));
await disconnectDb();
