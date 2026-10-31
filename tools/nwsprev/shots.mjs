// nws design preview (31.10.2026): screenshots of the locally served build (dist) at phone and desktop width.
// usage: node shots.mjs <outdir>   (expects the site served on http://localhost:8765)
import { chromium } from 'playwright';
import fs from 'node:fs';
const out = process.argv[2] || 'shots';
fs.mkdirSync(out, { recursive: true });
const base = 'http://localhost:8765';
const b = await chromium.launch();
// pick a section page and an article from the home page links
const p0 = await b.newPage();
await p0.goto(base + '/', { waitUntil: 'networkidle' }).catch(() => {});
const links = await p0.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
const art = links.find((h) => /^\/[a-z-]+\/n\d+\/?$/.test(h || '')) || '/';
await p0.close();
const pages = [['home', '/'], ['section', '/city/'], ['article', art], ['economy', '/economy/']];
for (const [name, path] of pages) {
  for (const [dev, w, h, full] of [['m', 390, 844, 9000], ['d', 1300, 900, 5200]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await pg.goto(base + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
    await pg.addStyleTag({ content: '#nck{display:none!important}' }).catch(() => {});
    await pg.waitForTimeout(800);
    const H = Math.min(full, await pg.evaluate(() => document.documentElement.scrollHeight));
    await pg.screenshot({ path: `${out}/${name}-${dev}.jpg`, type: 'jpeg', quality: 72, fullPage: true, clip: { x: 0, y: 0, width: w, height: H } });
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    console.log(name, dev, path, 'h', H, 'overflow', ov);
    await pg.close();
  }
}
await b.close();
