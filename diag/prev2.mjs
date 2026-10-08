// the phone hero on the preview address, top and the move into the form; the live footer without the preview
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/prev2'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await ctx.newPage();
await p.goto('https://dabullaw.co.il/?dblprev=1', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
await p.screenshot({ path: `${OUT}/hero-0.jpg`, type: 'jpeg', quality: 84 });
await p.evaluate(() => scrollTo(0, 330)); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/hero-1.jpg`, type: 'jpeg', quality: 84 });
rep.ph = await p.evaluate(() => { const e = document.querySelector('.dbl-ph'); const r = e.getBoundingClientRect(); return [Math.round(r.top + scrollY), Math.round(r.height)]; });
for (const [m, opts] of [['phone', { ...devices['iPhone 13'] }], ['desktop', { viewport: { width: 1440, height: 900 } }]]) {
  const c = await b.newContext({ ...opts, locale: 'he-IL' }); const q = await c.newPage();
  await q.goto('https://dabullaw.co.il/%D7%A6%D7%A8%D7%95-%D7%A7%D7%A9%D7%A8/', { waitUntil: 'load', timeout: 90000 }); await q.waitForTimeout(2000);
  rep['live-' + m] = await q.evaluate(() => ({ newFoot: !!document.getElementById('dbl-foot'), oldParts: document.querySelectorAll('footer .elementor-element-f5c1ba4, footer .elementor-element-09ce0d1').length }));
  await c.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
