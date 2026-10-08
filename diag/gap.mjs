import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/gap'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/?g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  for (let y = 0; y < 12000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500);
  rep[mode] = await p.evaluate(() => [...document.querySelectorAll('.elementor-widget-video')].slice(0, 8).map((w) => {
    const r = (e) => e ? Math.round(e.getBoundingClientRect().height) : null; const wr = w.querySelector('.elementor-wrapper'); const cs = wr ? getComputedStyle(wr) : null; const par = w.parentElement;
    return { id: w.dataset.id, cls: w.className.slice(0, 160), h: r(w), wrapH: r(wr), wrapW: wr ? Math.round(wr.getBoundingClientRect().width) : null, ar: cs && cs.aspectRatio, pad: cs && cs.paddingBottom, varAr: cs && cs.getPropertyValue('--video-aspect-ratio'), parH: r(par), parCls: par.className.slice(0, 100), sibs: [...par.children].map((c) => [c.dataset.id || c.className.slice(0, 30), r(c)]) };
  }));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
