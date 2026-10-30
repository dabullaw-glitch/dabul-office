// 30.10.2026 (mobile speed): the 1200px and 400px WebP sizes of the stock photos (public/img/stock), made once from their 1600px
// copies (same 3:2 crop), for the section headers on phones (1200) and the small card thumbnails (400). Run by hand:
// node scripts/stock-sizes.mjs   (skips sizes that already exist)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
const D = path.resolve('public/img/stock');
for (const f of fs.readdirSync(D).filter((x) => x.endsWith('-1600.webp'))) {
  const name = f.replace(/-1600\.webp$/, '');
  for (const [w, h, q] of [[1200, 800, 62], [400, 267, 64]]) {
    const out = path.join(D, `${name}-${w}.webp`);
    if (fs.existsSync(out)) continue;
    await sharp(path.join(D, f)).resize({ width: w, height: h, fit: 'cover' }).webp({ quality: q }).toFile(out);
    console.log(out, fs.statSync(out).size);
  }
}
