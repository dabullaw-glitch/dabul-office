import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/bar'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const dev of ['iPhone 13', 'Pixel 5', 'iPhone SE']) {
  const ctx = await b.newContext({ ...devices[dev], locale: 'he-IL' }); const p = await ctx.newPage();
  const tag = dev.replace(/\s/g, '');
  for (const [n, u] of [['home', 'https://dabullaw.co.il/'], ['art', 'https://dabullaw.co.il/?p=4308']]) {
    await p.goto(u, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
    await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }); await p.waitForTimeout(500);
    await p.evaluate(() => scrollTo(0, 1400)); await p.waitForTimeout(700);
    await p.screenshot({ path: `${OUT}/${tag}-${n}.jpg`, quality: 75 });
    if (n === 'home') { await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1200); await p.screenshot({ path: `${OUT}/${tag}-bottom.jpg`, quality: 75 }); }
    rep[tag + '-' + n] = await p.evaluate(() => { const bar = document.getElementById('dbl-cbar'); const r = bar.getBoundingClientRect(); const t = document.querySelector('.onetap-toggle'); const tr = t ? t.getBoundingClientRect() : null; return { bar: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], vh: innerHeight, links: [...bar.querySelectorAll('a')].map((a) => a.getAttribute('href').slice(0, 40)), text: bar.innerText.replace(/\s+/g, ' '), toggle: tr && [Math.round(tr.top), Math.round(tr.bottom)] }; });
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
