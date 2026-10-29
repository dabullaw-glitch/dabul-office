// Before every build: the AI illustrations of the published stories (feed.json -> image.url, Supabase Storage bucket nws-img)
// are made into small WebP files in public/ai/ (two widths each), so the site never sends the large original PNG/JPEG.
// Files are kept in .imgcache/ (restored between builds by the GitHub Actions cache), so an image is downloaded only once.
// 29.10.2026 (Google News and Discover): also a 16:9, a 4:3 and a 1:1 JPEG crop, 1200 wide when the original allows it (a crop up to
// 20% narrower is enlarged to 1200; a smaller one keeps its own width), for og:image and the NewsArticle image list.
// src/data/aiimg.json maps story id -> { files: [{ src, w }], w, h, crops: [{ src, w, h }] }. When a download or conversion fails, the story keeps
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
const RATIOS = [['16x9', 16, 9], ['4x3', 4, 3], ['1x1', 1, 1]];
let made = 0, cached = 0, failed = 0;
for (const s of stories) {
  const url = s?.image?.url;
  if (!url || !/^https:\/\//.test(url)) continue;
  const h = crypto.createHash('sha1').update(url).digest('hex').slice(0, 10);
  const widths = s.image.model === 'lucid' ? [640, 1280] : [480, 960];
  const names = widths.map((w) => `n${s.id}-${h}-${w}.webp`);
  const cropNames = RATIOS.map(([tag]) => `n${s.id}-${h}-${tag}.jpg`);
  const metaF = path.join(CACHE, `n${s.id}-${h}.json`);
  try {
    if (!sharp) throw new Error('no sharp');
    let meta;
    if ([...names, ...cropNames].every((n) => fs.existsSync(path.join(CACHE, n))) && fs.existsSync(metaF) && JSON.parse(fs.readFileSync(metaF, 'utf8')).crops) {
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
      const crops = [];
      for (let i = 0; i < RATIOS.length; i++) {
        const [, rw, rh] = RATIOS[i];
        const cw = Math.min(m.width, Math.floor((m.height * rw) / rh));
        const W = cw >= 1000 ? 1200 : cw; const H = Math.round((W * rh) / rw);
        await sharp(buf).resize({ width: W, height: H, fit: 'cover', position: sharp.strategy.attention }).jpeg({ quality: 80, mozjpeg: true, progressive: true }).toFile(path.join(CACHE, cropNames[i]));
        crops.push({ w: W, h: H });
      }
      meta = { w: m.width, h: m.height, crops };
      fs.writeFileSync(metaF, JSON.stringify(meta));
      made++;
    }
    for (const n of [...names, ...cropNames]) fs.copyFileSync(path.join(CACHE, n), path.join(OUT, n));
    const W = widths[widths.length - 1];
    map[s.id] = { files: names.map((n, i) => ({ src: `/ai/${n}`, w: widths[i] })), w: W, h: Math.round((W * meta.h) / meta.w),
      crops: cropNames.map((n, i) => ({ src: `/ai/${n}`, w: meta.crops[i].w, h: meta.crops[i].h })) };
  } catch (e) {
    failed++;
    map[s.id] = { remote: url };
    console.warn(`img: story ${s.id} kept as remote (${e.message})`);
  }
}
fs.writeFileSync(MAP, JSON.stringify(map));
console.log(`img: ${Object.keys(map).length} AI images (${made} new, ${cached} from cache, ${failed} remote)`);
