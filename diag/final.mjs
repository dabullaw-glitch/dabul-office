import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/final'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {}; const errs = [];
const hideCookie = async (p) => { await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }); await p.waitForTimeout(400); };
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(mode + ' ' + String(e).slice(0, 160)));
  await p.goto('https://dabullaw.co.il/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await hideCookie(p);
  await p.screenshot({ path: `${OUT}/${mode}-home.jpg`, quality: 70 });
  for (let y = 0; y < 9000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(150); }
  const c = p.locator('.elementor-element-abb2800').first(); await c.scrollIntoViewIfNeeded(); await p.waitForTimeout(2000); await c.screenshot({ path: `${OUT}/${mode}-cert.jpg`, quality: 72 });
  rep[mode + '-home'] = await p.evaluate(() => ({ cbar: !!document.getElementById('dbl-cbar'), forms: document.querySelectorAll('form.elementor-form').length, swap: [...document.querySelectorAll('style')].some((s) => /Noto Local[\s\S]{0,80}font-display:\s*swap/.test(s.textContent)) }));
  await p.goto('https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2000); await hideCookie(p);
  for (let y = 0; y < 6000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(150); }
  const g = await p.evaluate(() => { const e = document.querySelector('.elementor-loop-container'); return Math.round(e.getBoundingClientRect().top + scrollY); });
  await p.evaluate((g) => scrollTo(0, g - 80), g); await p.waitForTimeout(800); await p.screenshot({ path: `${OUT}/${mode}-videos.jpg`, quality: 72 });
  // one click starts the video
  const f = p.locator('.dbl-yt').nth(2); await f.scrollIntoViewIfNeeded(); await f.click(); await p.waitForTimeout(4000);
  rep[mode + '-play'] = await p.evaluate(() => !!document.querySelector('.dbl-yt iframe'));
  await p.goto('https://dabullaw.co.il/%d7%99%d7%99%d7%a4%d7%95%d7%99-%d7%9b%d7%97-%d7%9e%d7%aa%d7%9e%d7%a9%d7%9a/', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2000); await hideCookie(p);
  const v = await p.evaluate(() => { const x = document.querySelector('figure.dbl-vid'); if (!x) return null; x.scrollIntoView({ block: 'center' }); return true; });
  rep[mode + '-page46'] = v; await p.waitForTimeout(900); if (v) await p.screenshot({ path: `${OUT}/${mode}-page46.jpg`, quality: 70 });
  await ctx.close();
}
rep.errors = errs;
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
