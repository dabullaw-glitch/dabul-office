// Which photo is in the home hero at each width, and how big each candidate photo really is.
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/img'; fs.mkdirSync(OUT, { recursive: true });
const U = 'https://dabullaw.co.il/wp-content/uploads/';
const C = ['2026/03/yakir-mob-2.webp', '2025/12/yakir-mob-2.jpg', '2025/12/yakir-mob-1.jpg', '2025/12/yakir-mob-3.jpg', '2025/12/yakir-dabul.jpg', '2025/11/yakir-dabul.png', '2025/11/yakir-dabul-adv.png', '2026/04/יקיר-דבול-עורך-דין.webp', '2026/03/יקיר.webp', '2026/03/יקיר-דבול-1.jpeg', '2026/03/0יקיר-דבול-2-copy.webp', '2026/03/2יקיר.webp', '2026/03/יקיר-דבול-2-copy.webp', '2026/03/יקיר-1.jpg', '2026/03/יקיר-2.jpg', '2026/04/יקיר-3.jpg', '2026/04/יקיר-4.jpg', '2026/04/יקיר5.jpg', '2026/04/יקיר44.jpg', '2026/04/יקיר-1.jpg', '2026/03/דבול.webp', '2026/03/yakir-banner.webp', '2026/02/יקיר-דובול-באנר.webp', '2026/05/bgmain.webp', '2025/11/Yakir-Dabul-Avatar.png', '2026/03/p1.webp'];
const b = await chromium.launch(); const rep = { cand: {}, hero: {} };
const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
await p.goto('https://dabullaw.co.il/wp-json/', { timeout: 60000 }).catch(() => null);
for (const c of C) {
  const src = U + c.split('/').map(encodeURIComponent).join('/');
  rep.cand[c] = await p.evaluate(async (s) => { try { const r = await fetch(s); if (!r.ok) return { st: r.status }; const bl = await r.blob(); const bm = await createImageBitmap(bl); return { w: bm.width, h: bm.height, kb: Math.round(bl.size / 1024), type: bl.type }; } catch (e) { return { err: String(e).slice(0, 80) }; } }, src);
  await p.goto(src).catch(() => null); await p.screenshot({ path: `${OUT}/c-${c.replace(/[\/]/g, '_').replace(/\.[a-z]+$/, '')}.jpg`, type: 'jpeg', quality: 60 }).catch(() => null);
}
for (const [n, vp] of [['phone', { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }], ['tablet', { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true }], ['desktop', { width: 1440, height: 900 }]]) {
  const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.deviceScaleFactor || 1, isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch, locale: 'he-IL' }); const q = await ctx.newPage();
  await q.goto('https://dabullaw.co.il/?im=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await q.waitForTimeout(3000);
  rep.hero[n] = await q.evaluate(() => { const out = []; for (const el of document.querySelectorAll('img,[style*="background"],.elementor-element')) { const r = el.getBoundingClientRect(); if (r.top > 1200 || r.width < 150 || r.height < 150) continue; if (el.tagName === 'IMG') out.push({ img: el.currentSrc || el.src, nw: el.naturalWidth, nh: el.naturalHeight, rw: Math.round(r.width), rh: Math.round(r.height), id: el.closest('[data-id]')?.dataset.id }); else { const bg = getComputedStyle(el).backgroundImage; if (bg && bg !== 'none' && /url/.test(bg)) out.push({ bg: bg.slice(0, 200), rw: Math.round(r.width), rh: Math.round(r.height), id: el.dataset.id, vis: getComputedStyle(el).display }); } } return out; });
  await q.screenshot({ path: `${OUT}/hero-${n}.jpg`, type: 'jpeg', quality: 70 }); await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
