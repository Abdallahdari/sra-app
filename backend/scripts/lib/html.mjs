// Convert WordPress/Elementor HTML into the simple "markdown-lite" format the app renders:
//   ## Heading      - bullet      ![caption](image)      [▶ title](youtube-url)      **bold**
import * as cheerio from 'cheerio';

const clean = (s) => String(s || '').replace(/\s+/g, ' ').replace(/ /g, ' ').trim();

export function decode(s) {
  return cheerio.load(`<p>${s || ''}</p>`)('p').text().replace(/\s+/g, ' ').trim();
}

export function absolute(src) {
  if (!src) return '';
  if (src.startsWith('//')) return `https:${src}`;
  if (src.startsWith('/')) return `https://www.sra.so${src}`;
  return src;
}

/** Strip a WordPress size suffix (-1024x683) to get the original upload. */
export function originalImage(src) {
  return absolute(src).replace(/-\d{2,4}x\d{2,4}(?=\.(jpe?g|png|webp|gif)$)/i, '');
}

function inline($, el) {
  let out = '';
  $(el).contents().each((_, n) => {
    if (n.type === 'text') out += n.data;
    else if (n.type === 'tag') {
      if (n.tagName === 'br') out += ' ';
      else if (n.tagName === 'strong' || n.tagName === 'b') {
        const t = clean($(n).text());
        if (t) out += ` **${t}** `;
      } else out += inline($, n);
    }
  });
  return out;
}

/**
 * @param {string} html
 * @param {{ skip?: RegExp }} opts  paragraphs matching `skip` are dropped (boilerplate)
 * @returns {{ md: string, images: string[], youtube: string[] }}
 */
export function htmlToMd(html, opts = {}) {
  const $ = cheerio.load(html || '');
  $('script,style,noscript,form,button,input,select,svg').remove();
  const lines = [];
  const images = [];
  const youtube = [];
  const push = (s) => {
    const t = s.replace(/\s+\*\*\s*\*\*\s+/g, ' ').replace(/[ \t]+/g, ' ').replace(/\*\*\s+([.,:;])/g, '**$1').trim();
    if (!t || (opts.skip && opts.skip.test(t))) return;
    if (lines[lines.length - 1] === t) return;
    lines.push(t);
  };

  const walk = (el) => {
    $(el).children().each((_, n) => {
      const tag = n.tagName;
      const $n = $(n);
      if (/^h[1-6]$/.test(tag)) {
        const t = clean($n.text());
        if (t) push(`## ${t}`);
      } else if (tag === 'p' || tag === 'figcaption' || tag === 'blockquote') {
        // images inside paragraphs
        $n.find('img').each((__, img) => addImg($(img)));
        const t = clean(inline($, n));
        if (t) push(t);
      } else if (tag === 'ul' || tag === 'ol') {
        $n.children('li').each((__, li) => {
          const t = clean(inline($, li));
          if (t) push(`- ${t}`);
        });
      } else if (tag === 'img') {
        addImg($n);
      } else if (tag === 'iframe') {
        const src = $n.attr('src') || '';
        const m = src.match(/youtube(?:-nocookie)?\.com\/embed\/([\w-]{11})/);
        if (m) {
          youtube.push(m[1]);
          push(`[▶ Watch the video](https://www.youtube.com/watch?v=${m[1]})`);
        }
      } else if (tag === 'table') {
        $n.find('tr').each((__, tr) => {
          const cells = $(tr).find('th,td').map((___, c) => clean($(c).text())).get().filter(Boolean);
          if (cells.length) push(`- ${cells.join(' · ')}`);
        });
      } else if (tag === 'a' && $n.children().length === 0) {
        const t = clean($n.text());
        const href = absolute($n.attr('href'));
        if (t && /^https?:/.test(href) && !/sra\.so\/?$/.test(href)) push(`[${t}](${href})`);
      } else if ($n.children().length === 0) {
        const t = clean($n.text());
        if (t && t.length > 2) push(t);
      } else {
        // fact-card pattern: <div><b>Label</b><span>Value</span></div>
        const kids = $n.children();
        if (kids.length === 2 && /^(b|strong)$/.test(kids[0].tagName) && !$(kids[1]).children().length) {
          push(`**${clean($(kids[0]).text())}:** ${clean($(kids[1]).text())}`);
        } else walk(n);
      }
    });
  };
  const addImg = ($img) => {
    // keep the URL as published; the importer tries the full-size original first and falls back to this
    const src = absolute($img.attr('src') || $img.attr('data-src'));
    if (!src || /data:image|emoji|\.svg$/.test(src)) return;
    images.push(src);
    push(`![${clean($img.attr('alt')).replace(/[\[\]]/g, '')}](${src})`);
  };

  walk($.root());
  return { md: lines.join('\n\n'), images, youtube };
}
