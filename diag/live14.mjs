// check after going live: the about section and the phone hero
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/live14'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const b = await chromium.launch();
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto(S + '?l14=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
  if (mode === 'phone') await p.screenshot({ path: `${OUT}/phone-top.jpg`, type: 'jpeg', quality: 84 });
  rep[mode] = await p.evaluate(() => ({ about: !!document.getElementById('dbl-about'), old: !!document.querySelector('.elementor-element-c7b857d'), bg: getComputedStyle(document.querySelector('.dbl-ph') || document.body).backgroundImage.slice(0, 120) }));
  await p.addStyleTag({ content: '[data-elementor-type="header"]{visibility:hidden!important}#dbl-cbar{display:none!important}' });
  for (let y = 0; y < 6000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(120); }
  const n = p.locator('#dbl-about'); if (await n.count()) { await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(1200); await n.screenshot({ path: `${OUT}/about-${mode}.jpg`, type: 'jpeg', quality: 80 }); }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
