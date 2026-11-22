// Image pipeline: every image (imported from sra.so or uploaded by an admin)
// is resized and re-encoded to WebP so the app downloads small files.
import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { mkdir, access, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { config } from './config.js';

const MAX_WIDTH = 1200;

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

/** Process an image buffer and store it. Returns the public path, e.g. /uploads/ab/abcd.webp */
export async function storeImage(buffer, { folder = 'u', name } = {}) {
  const hash = createHash('sha1').update(buffer).digest('hex').slice(0, 16);
  const file = `${name ? `${name}-` : ''}${hash}.webp`;
  const dir = join(config.uploadsDir, folder);
  const out = join(dir, file);
  if (!(await exists(out))) {
    await mkdir(dir, { recursive: true });
    const img = sharp(buffer, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    const data = await img
      .resize({ width: Math.min(meta.width || MAX_WIDTH, MAX_WIDTH), withoutEnlargement: true })
      .webp({ quality: meta.hasAlpha ? 90 : 76 })
      .toBuffer();
    await writeFile(out, data);
  }
  return `/uploads/${folder}/${file}`;
}

const cache = new Map();
/** Download a remote image once and store it. Returns '' on failure. */
export async function importRemoteImage(url, folder = 'wp') {
  if (!url) return '';
  if (cache.has(url)) return cache.get(url);
  const p = (async () => {
    for (let i = 0; i < 3; i++) {
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (sra-app import)' },
          signal: AbortSignal.timeout(60_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const base = url.split('/').pop().replace(/\.[a-z0-9]+$/i, '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40);
        return await storeImage(buf, { folder, name: base });
      } catch (e) {
        if (i === 2) {
          console.warn(`  image failed ${url}: ${e.message}`);
          return '';
        }
        await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
      }
    }
  })();
  cache.set(url, p);
  return p;
}
