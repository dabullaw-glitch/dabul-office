import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/check3'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
const ctxOf = (mode) => mode === 'phone' ? b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
const noCookie = async (p) => { await p.evaluate(() => document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.position === 'fixed' && /cookie|cky|consent|מדיניות/i.test(e.className + e.id + e.textContent.slice(0, 60))) e.style.display = 'none'; })); };
const load = async (p, url) => { await p.goto(url + (url.includes('?') ? '&' : '?') + 'g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2000); for (let y = 0; y < 16000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(120); } await p.waitForTimeout(1200); await noCookie(p); };
for (const mode of ['phone', 'desktop']) {
  const ctx = await ctxOf(mode); const p = await ctx.newPage();
  await load(p, 'https://dabullaw.co.il/%D7%A1%D7%A8%D7%98%D7%95%D7%A0%D7%99%D7%9D/');
  rep['vid-' + mode] = await p.evaluate(() => { const r = (e) => { const b = e.getBoundingClientRect(); return [Math.round(b.top + scrollY), Math.round(b.height), Math.round(b.left), Math.round(b.width)]; }; const g = document.querySelector('.elementor-loop-container'); return { kids: [...g.children].slice(0, 7).map((c) => [c.className.slice(0, 30), ...r(c)]), imgs: [...document.querySelectorAll('.dbl-yt img')].slice(0, 4).map((i) => i.currentSrc.slice(-40)), docH: document.documentElement.scrollHeight }; });
  const tops = await p.evaluate(() => [...document.querySelector('.elementor-loop-container').children].filter((c) => c.offsetHeight).slice(0, 8).map((e) => Math.round(e.getBoundingClientRect().top + scrollY)));
  const uniq = [...new Set(tops)].slice(0, 3); let k = 0;
  for (const t of uniq) { await p.evaluate((t) => scrollTo(0, t - 100), t); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/vid-${mode}-${k++}.jpg`, quality: 72 }); }
  for (const [name, url] of [['a1335', 'https://dabullaw.co.il/?p=1335'], ['a4308', 'https://dabullaw.co.il/?p=4308']]) {
    await load(p, url);
    const box = await p.evaluate(() => { const f = document.querySelector('figure.dbl-vid'); if (!f) return null; f.scrollIntoView({ block: 'center' }); const b = f.getBoundingClientRect(); return [Math.round(b.width), Math.round(b.height), f.querySelector('img') && f.querySelector('img').currentSrc.slice(-40)]; });
    rep[name + '-' + mode] = box; await p.waitForTimeout(800); if (box) await p.screenshot({ path: `${OUT}/${name}-${mode}.jpg`, quality: 70 });
  }
  await load(p, 'https://dabullaw.co.il/');
  await p.locator('.elementor-element-abb2800').first().scrollIntoViewIfNeeded(); await p.waitForTimeout(2500);
  await p.locator('.elementor-element-abb2800').first().screenshot({ path: `${OUT}/cert-${mode}.jpg`, quality: 75 });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
