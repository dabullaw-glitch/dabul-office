import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/check'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
const ctxOf = (mode) => mode === 'phone' ? b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
for (const mode of ['phone', 'desktop']) {
  const ctx = await ctxOf(mode);
  const p = await ctx.newPage(); await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/?g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2000);
  await p.evaluate(() => { const c = document.querySelector('#cookie-law-info-bar, .cky-consent-container, [class*=cookie]'); });
  for (let y = 0; y < 16000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(150); }
  await p.waitForTimeout(1200);
  rep['vid-' + mode] = await p.evaluate(() => {
    const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.top + scrollY), Math.round(b.height), Math.round(b.left), Math.round(b.width)]; };
    const nv = document.querySelector('.dbl-vnew'); const g = document.querySelector('.elementor-loop-container');
    const t = document.querySelector('.elementor-element-aeb2157 .elementor-heading-title, .elementor-element-aeb2157 *'); const tcs = t ? getComputedStyle(t) : null;
    return { vnew: nv ? r(nv) : null, vnewParent: nv ? nv.parentElement.className.slice(0, 80) : null, cards: [...document.querySelectorAll('.dbl-vcard')].map(r), grid: g ? r(g) : null, rows: g ? getComputedStyle(g).gridTemplateRows.slice(0, 100) : null, items: [...document.querySelectorAll('.e-loop-item')].slice(0, 6).map(r), title: tcs && [t.tagName, tcs.fontSize, tcs.fontWeight, tcs.fontFamily.slice(0, 40), tcs.color, tcs.lineHeight], docH: document.documentElement.scrollHeight };
  });
  for (const y of [0, 1, 2, 3]) { await p.evaluate((y) => scrollTo(0, 250 + y * innerHeight * 0.9), y); await p.waitForTimeout(500); await p.screenshot({ path: `${OUT}/vid-${mode}-${y}.jpg`, quality: 60 }); }
  await p.close();
  const h = await ctx.newPage(); await h.goto('https://dabullaw.co.il/?dblprev=1&g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await h.waitForTimeout(2000);
  for (let y = 0; y < 9000; y += 600) { await h.mouse.wheel(0, 600); await h.waitForTimeout(150); }
  await h.locator('.elementor-element-abb2800').first().scrollIntoViewIfNeeded(); await h.waitForTimeout(3000);
  rep['cert-' + mode] = await h.evaluate(() => [...document.querySelectorAll('.elementor-element-abb2800, .elementor-element-abb2800 *')].map((e) => { const cs = getComputedStyle(e); const b = e.getBoundingClientRect(); return (cs.boxShadow !== 'none' || cs.backgroundImage !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && b.height > 40)) ? [e.tagName, e.className.toString().slice(0, 60), Math.round(b.height), cs.boxShadow.slice(0, 60), cs.backgroundImage.slice(0, 80), cs.backgroundColor] : null; }).filter(Boolean).slice(0, 30));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
