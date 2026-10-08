import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/style'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto('https://dabullaw.co.il/?st=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  rep[mode] = await p.evaluate(() => {
    const pick = (el) => { const s = getComputedStyle(el); return { ff: s.fontFamily, fs: s.fontSize, fw: s.fontWeight, color: s.color, lh: s.lineHeight, ls: s.letterSpacing, ta: s.textAlign }; };
    const hs = [...document.querySelectorAll('h2')].map((h) => ({ t: h.innerText.slice(0, 30), ...pick(h) }));
    const parents = [...document.querySelectorAll('.elementor-1112 > .e-parent, .elementor-1112 > section, #about-yakir')].map((e) => { const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { id: e.dataset.id || e.id, bg: s.backgroundColor, bgi: s.backgroundImage.slice(0, 120), h: Math.round(r.height), top: Math.round(r.top + scrollY), pad: s.padding, txt: (e.querySelector('h2') || {}).innerText }; });
    const div = [...document.querySelectorAll('.elementor-divider-separator')].slice(0, 3).map((d) => { const s = getComputedStyle(d); return { w: s.width, bt: s.borderTop, bg: s.backgroundColor, bi: s.backgroundImage.slice(0, 80) }; });
    const p1 = document.querySelector('.elementor-1112 .elementor-widget-text-editor p'); 
    return { hs, parents, div, p: p1 ? pick(p1) : null, bodyBg: getComputedStyle(document.body).backgroundColor };
  });
  const sv = p.locator('h2', { hasText: 'שירותי המשרד' }).first(); await sv.scrollIntoViewIfNeeded(); await p.evaluate(() => window.scrollBy(0, -120)); await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/services-${mode}.jpg`, type: 'jpeg', quality: 65 });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
