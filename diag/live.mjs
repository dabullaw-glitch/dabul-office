import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/live'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(); const rep = {};
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  for (const prev of [0, 1]) {
    const p = await ctx.newPage();
    await p.goto('https://dabullaw.co.il/?' + (prev ? 'dblprev=1&' : '') + 'g=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
    if (!prev) await p.screenshot({ path: `${OUT}/${mode}-hero.jpg`, quality: 80 });
    for (let y = 0; y < 9000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(200); }
    const el = p.locator('.elementor-element-abb2800').first();
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(3500);
    await el.screenshot({ path: `${OUT}/${mode}-cert-${prev ? 'new' : 'now'}.jpg`, quality: 82 });
    rep[mode + prev] = await p.evaluate(() => { const r = document.querySelector('.elementor-element-f595e2b'); if (!r) return null; const vis = [...r.querySelectorAll('.swiper-slide')].filter((s) => { const b = s.getBoundingClientRect(); return b.right > 0 && b.left < innerWidth && b.width > 20; }); return { vis: vis.length, h: vis.map((s) => Math.round(s.getBoundingClientRect().height)), src: (r.querySelector('img') || {}).currentSrc }; });
    await p.close();
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
