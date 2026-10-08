// round 3 check: the preview must look the same as the live site (phone and computer), and must not jump
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/cmp27'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const b = await chromium.launch();
const hide = '.elementor-popup-modal{display:none!important} video{visibility:hidden!important} .swiper-wrapper{transform:none!important;transition:none!important} *{animation:none!important;transition:none!important}';
for (const [name, opt] of [['desk', { viewport: { width: 1440, height: 900 }, locale: 'he-IL' }], ['phone', { ...devices['iPhone 13'], locale: 'he-IL' }]]) {
  for (const v of ['live', 'prev']) {
    const ctx = await b.newContext(opt); const p = await ctx.newPage();
    await p.goto(S + (v === 'prev' ? '?dblprev=1&c=' : '?c=') + Date.now(), { waitUntil: 'load', timeout: 90000 });
    await p.waitForTimeout(3500); await p.addStyleTag({ content: hide });
    for (let y = 0; y < 14000; y += 700) { await p.evaluate((yy) => scrollTo(0, yy), y); await p.waitForTimeout(120); }
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(1500);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    rep[`${name}-${v}-h`] = h;
    await p.screenshot({ path: `${OUT}/${name}-${v}.png`, fullPage: true });
    rep[`${name}-${v}-info`] = await p.evaluate(() => ({ logo: [...document.querySelectorAll('img')].filter((i) => /unnamed-3-1/.test(i.src)).map((i) => i.getBoundingClientRect().width + 'x' + i.getBoundingClientRect().height).slice(0, 2), ox: getComputedStyle(document.documentElement).overflowX, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
