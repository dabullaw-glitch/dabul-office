// Phone check: no floating WhatsApp circles left, the bottom bar is there.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/wa'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await ctx.newPage();
for (const [n, u] of [['home', 'https://dabullaw.co.il/?wa=1'], ['sublet', 'https://dabullaw.co.il/%d7%a1%d7%90%d7%91%d7%9c%d7%98-%d7%97%d7%95%d7%a7%d7%99/?wa=1']]) {
  await p.goto(u, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null);
  await p.mouse.wheel(0, 600); await p.waitForTimeout(2000);
  rep[n] = await p.evaluate(() => ({
    fixedWA: [...document.querySelectorAll('.elementor-fixed')].filter((e) => e.querySelector('.e-fab-whatsapp') && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 0).map((e) => e.dataset.id),
    bar: !!document.querySelector('#dbl-cbar') && getComputedStyle(document.querySelector('#dbl-cbar')).display,
  }));
  await p.screenshot({ path: `${OUT}/${n}.jpg`, type: 'jpeg', quality: 70 });
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
