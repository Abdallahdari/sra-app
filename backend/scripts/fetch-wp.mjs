// Downloads posts, pages, media and categories from the sra.so WordPress REST API
// into data/raw/*.json. The API is slow, so we page small and retry.
import { writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.sra.so/wp-json/wp/v2';
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'data', 'raw');
await mkdir(OUT, { recursive: true });

async function get(url, tries = 4) {
  for (let i = 1; i <= tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (sra-app sync)' },
        signal: AbortSignal.timeout(90_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { json: await res.json(), totalPages: Number(res.headers.get('x-wp-totalpages') || 1) };
    } catch (e) {
      console.warn(`  retry ${i}/${tries} ${url}: ${e.message}`);
      if (i === tries) throw e;
      await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
}

async function all(type, fields, perPage) {
  const items = [];
  let page = 1, total = 1;
  do {
    const url = `${BASE}/${type}?per_page=${perPage}&page=${page}${fields ? `&_fields=${fields}` : ''}`;
    const { json, totalPages } = await get(url);
    total = totalPages;
    items.push(...json);
    console.log(`${type}: page ${page}/${total} (${items.length})`);
    page++;
  } while (page <= total);
  await writeFile(join(OUT, `${type}.json`), JSON.stringify(items, null, 1));
  return items;
}

const only = process.argv.slice(2);
const jobs = {
  categories: () => all('categories', 'id,name,slug,count', 100),
  posts: () => all('posts', 'id,date,slug,link,title,excerpt,content,categories,featured_media', 20),
  pages: () => all('pages', 'id,date,modified,slug,link,title,content,parent,featured_media', 10),
  media: () => all('media', 'id,date,source_url,alt_text,mime_type,media_details.width,media_details.height,post', 100),
};
for (const [name, fn] of Object.entries(jobs)) {
  if (only.length && !only.includes(name)) continue;
  try { await fn(); } catch (e) { console.error(`FAILED ${name}: ${e.message}`); }
}
console.log('done');
