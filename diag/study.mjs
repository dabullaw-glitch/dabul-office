// study the home page style: every section as its own picture, and the icon box title colors
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/study'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto('https://dabullaw.co.il/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  await p.addStyleTag({ content: '.elementor-popup-modal,#dbl-cbar,.onetap-container-toggle{display:none!important}[data-elementor-type="header"]{visibility:hidden!important}' });
  for (let y = 0; y < 14000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(150); }
  await p.waitForTimeout(1500);
  const ids = await p.evaluate(() => [...document.querySelectorAll('[data-elementor-type="wp-page"] > .e-con.e-parent, [data-elementor-type="wp-page"] > .elementor-section')].map((e, i) => { e.id = e.id || 'dbls' + i; const r = e.getBoundingClientRect(); return [e.id, e.dataset.id, Math.round(r.height), (e.innerText || '').trim().slice(0, 40).replace(/\s+/g, ' ')]; }));
  rep[mode + '-sections'] = ids;
  let i = 0; for (const [id, did, h] of ids) { if (h < 40) continue; const el = p.locator('#' + id); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await el.screenshot({ path: `${OUT}/${mode}-${String(i++).padStart(2, '0')}-${did}.jpg`, type: 'jpeg', quality: 62 }).catch(() => null); }
  if (mode === 'desktop') rep.iconbox = await p.evaluate(() => [...document.querySelectorAll('.elementor-widget-icon-box')].map((w) => { const t = w.querySelector('.elementor-icon-box-title'); const a = t && (t.querySelector('a,span') || t); let e = w, bg = ''; while (e) { const c = getComputedStyle(e).backgroundColor; if (c && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; } e = e.parentElement; } return [w.dataset.id, a && getComputedStyle(a).color, bg, (t && t.innerText || '').slice(0, 20)]; }));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
