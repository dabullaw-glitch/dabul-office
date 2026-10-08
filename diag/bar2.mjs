// darker background for the floating phone buttons: the live one and two darker shades
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/bar2'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await ctx.newPage();
const shades = { now: null, d1: '#0b1020', d2: '#070a14' };
for (const [pg, u, y] of [['home', 'https://dabullaw.co.il/', 1350], ['art', 'https://dabullaw.co.il/?p=4308', 900]]) {
  await p.goto(u, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a,div,span')].filter((e) => (e.textContent || '').trim() === 'הבנתי').pop(); if (x) x.click(); document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.position === 'fixed' && /Cookies/.test(e.textContent || '') && e.id !== 'dbl-cbar') e.style.display = 'none'; }); });
  await p.addStyleTag({ content: '#elementor-popup-modal-1023,.elementor-popup-modal{display:none!important}' });
  await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(800);
  for (const [k, c] of Object.entries(shades)) {
    await p.evaluate((c) => { const bar = document.getElementById('dbl-cbar'); if (c) { bar.style.setProperty('background', c, 'important'); bar.style.setProperty('border-color', 'rgba(231,205,150,.32)', 'important'); } else { bar.style.removeProperty('background'); bar.style.removeProperty('border-color'); } }, c);
    await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/${pg}-${k}.jpg`, type: 'jpeg', quality: 85 });
  }
}
await b.close();
