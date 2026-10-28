// Before every build: the AI illustrations of the published stories (feed.json -> image.url, Supabase Storage bucket nws-img)
// are made into small WebP files in public/ai/ (two widths each), so the site never sends the large original PNG/JPEG.
// Files are kept in .imgcache/ (restored between builds by the GitHub Actions cache), so an image is downloaded only once.
// src/data/aiimg.json maps story id -> { files: [{ src, w }], w, h }. When a download or conversion fails, the story keeps
// its original image address ({ remote }) so the page still shows the picture.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
let sharp = null;
try { sharp = (await import('sharp')).default; } catch { console.warn('img: sharp not available, AI images stay remote'); }

const CACHE = '.imgcache';
const OUT = 'public/ai';
const MAP = 'src/data/aiimg.json';
fs.mkdirSync(CACHE, { recursive: true });
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let stories = [];
try { stories = JSON.parse(fs.readFileSync('src/data/feed.json', 'utf8')).stories || []; } catch { /* no feed */ }
const map = {};
let made = 0, cached = 0, failed = 0;
for (const s of stories) {
  const url = s?.image?.url;
  if (!url || !/^https:\/\//.test(url)) continue;
  const h = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  const widths = s.image.model === 'lucid' ? [640, 1280] : [480, 960];
  const names = widths.map((w) => `n${s.id}-${h}-${w}.webp`);
  const metaF = path.join(CACHE, `n${s.id}-${h}.json`);
  try {
    if (!sharp) throw new Error('no sharp');
    let meta;
    if (names.every((n) => fs.existsSync(path.join(CACHE, n))) && fs.existsSync(metaF)) {
      meta = JSON.parse(fs.readFileSync(metaF, 'utf8')); cached++;
    } else {
      const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!r.ok) throw new Error(`download ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const m = await sharp(buf).metadata();
      if (!m.width || !m.height) throw new Error('not an image');
      for (let i = 0; i < widths.length; i++) {
        await sharp(buf).resize({ width: Math.min(widths[i], m.width) }).webp({ quality: 72 }).toFile(path.join(CACHE, names[i]));
      }
      meta = { w: m.width, h: m.height };
      fs.writeFileSync(metaF, JSON.stringify(meta));
      made++;
    }
    for (const n of names) fs.copyFileSync(path.join(CACHE, n), path.join(OUT, n));
    const W = widths[widths.length - 1];
    map[s.id] = { files: names.map((n, i) => ({ src: `/ai/${n}`, w: widths[i] })), w: W, h: Math.round((W * meta.h) / meta.w) };
  } catch (e) {
    failed++;
    map[s.id] = { remote: url };
    console.warn(`img: story ${s.id} kept as remote (${e.message})`);
  }
}
fs.writeFileSync(MAP, JSON.stringify(map));
console.log(`img: ${Object.keys(map).length} AI images (${made} new, ${cached} from cache, ${failed} remote)`);
