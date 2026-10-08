// what the browser really loads on the home page: stylesheets, the old phone picture, the big article pictures
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/speed15'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const b = await chromium.launch();
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); const reqs = [];
  p.on('response', async (r) => { const u = r.url(); if (/\.(jpe?g|png|webp|css)(\?|$)/.test(u) || /yakir-mob/.test(u)) { let size = 0; try { size = (await r.body()).length; } catch {} reqs.push({ u: u.slice(0, 160), t: r.request().resourceType(), size, by: (r.request().frame() ? '' : '') }); } });
  const raw = await (await fetch(S + '?raw=' + Date.now(), { headers: { 'user-agent': mode === 'phone' ? devices['iPhone 13'].userAgent : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36' } })).text();
  fs.writeFileSync(`${OUT}/raw-${mode}.html`, raw);
  await p.goto(S + '?s15=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(4000);
  rep[mode] = await p.evaluate(() => ({
    css: [...document.querySelectorAll('link[rel=stylesheet],link[as=style]')].map((l) => [l.rel, l.media, l.href.slice(0, 150)]),
    mob2: [...document.querySelectorAll('*')].filter((e) => /yakir-mob-2/.test(getComputedStyle(e).backgroundImage) || /yakir-mob-2/.test(e.getAttribute('src') || '') || /yakir-mob-2/.test(e.getAttribute('srcset') || '')).map((e) => e.tagName + '.' + String(e.className).slice(0, 90) + ' disp=' + getComputedStyle(e).display),
    pic: (document.querySelector('.wp-image-6750') || {}).outerHTML?.slice(0, 900),
    picCur: [...document.querySelectorAll('picture img')].slice(0, 6).map((i) => [i.currentSrc.slice(-60), i.getBoundingClientRect().width]),
  }));
  rep[mode].reqs = reqs;
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
