import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/sa'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['phone']) for (const prev of [0, 1]) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); const fonts = [];
  p.on('request', (r) => { if (/\.woff2?|\.ttf/.test(r.url())) fonts.push(r.url().split('/').pop().split('?')[0]); });
  await p.goto('https://dabullaw.co.il/?' + (prev ? 'dblprev=1&' : '') + 'g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  const k = mode + prev;
  rep[k] = await p.evaluate(() => ({ swap: [...document.querySelectorAll('style')].some((s) => /Noto Local[\s\S]{0,80}font-display:\s*swap/.test(s.textContent)), menuName: [...document.querySelectorAll('a.elementor-icon[href*="off_canvas"]')].map((a) => a.getAttribute('aria-label')), lists: document.querySelectorAll('.swiper.elementor-loop-container[role="list"]').length, arrowsNoName: document.querySelectorAll('.elementor-swiper-button:not([aria-label])').length }));
  await p.screenshot({ path: `${OUT}/${k}-top.jpg`, quality: 70 });
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); });
  await p.waitForTimeout(600);
  const box = await p.evaluate(() => { const c = [...document.querySelectorAll('[class*="onetap"]')].map((e) => [e, e.getBoundingClientRect()]).filter(([e, r]) => r.width > 30 && r.width < 90 && r.height > 30 && r.height < 90 && getComputedStyle(e).visibility !== 'hidden'); if (!c.length) return null; const [e, r] = c[0]; return { cls: e.className.toString().slice(0, 80), x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
  rep[k].toggle = box; if (box) { await p.mouse.click(box.x, box.y); }
  await p.waitForTimeout(1800);
  await p.screenshot({ path: `${OUT}/${k}-panel.jpg`, quality: 70 });
  rep[k].fonts = [...new Set(fonts)];
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
