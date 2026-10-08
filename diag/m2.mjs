// Measurements: cutout photo subject position, phone header on the blog page, current footer structure.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/m2'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il';
const INFO = S + '/%d7%9e%d7%99%d7%93%d7%a2-%d7%9e%d7%a9%d7%a4%d7%98%d7%99/';
const CUT = S + '/wp-content/uploads/2026/04/%D7%99%D7%A7%D7%99%D7%A8-%D7%93%D7%91%D7%95%D7%9C-%D7%A2%D7%95%D7%A8%D7%9A-%D7%93%D7%99%D7%9F.webp';
const b = await chromium.launch(); const rep = {};
const close = async (p) => { await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null); await p.waitForTimeout(300); };
{ const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await ctx.newPage();
  await p.goto(INFO + '?m=2', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000); await close(p);
  rep.phoneHeader = await p.evaluate(() => { const h = document.querySelector('header[data-elementor-type="header"], .elementor-location-header'); const out = { y: scrollY }; let e = h; const chain = []; while (e && e !== document.body) { const cs = getComputedStyle(e); chain.push({ tag: e.tagName, id: e.dataset.id || e.id || '', cls: (e.className || '').toString().slice(0, 120), pos: cs.position, top: cs.top, h: Math.round(e.getBoundingClientRect().height) }); e = e.parentElement; } out.chain = chain;
    out.inner = [...h.querySelectorAll('[data-settings*="sticky"], .elementor-sticky, .elementor-sticky__spacer')].map((x) => ({ id: x.dataset.id, cls: x.className.slice(0, 160), pos: getComputedStyle(x).position, h: Math.round(x.getBoundingClientRect().height), top: Math.round(x.getBoundingClientRect().top), set: (x.dataset.settings || '').slice(0, 300) }));
    const m = document.querySelector('main'); out.mainTop = m ? Math.round(m.getBoundingClientRect().top) : null; out.bodyPad = getComputedStyle(document.body).paddingTop; return out; });
  await p.screenshot({ path: `${OUT}/info-phone-top.jpg`, type: 'jpeg', quality: 70 });
  await ctx.close(); }
{ const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' }); const p = await ctx.newPage();
  await p.goto(S + '/?m=2', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p);
  rep.cut = await p.evaluate(async (src) => { const im = new Image(); im.crossOrigin = 'anonymous'; im.src = src; await im.decode(); const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight; const x = c.getContext('2d'); x.drawImage(im, 0, 0); let d; try { d = x.getImageData(0, 0, c.width, c.height).data; } catch (e) { return { err: String(e), w: c.width, h: c.height }; }
    const W = c.width, H = c.height; let minX = W, maxX = 0, minY = H, maxY = 0; const colSum = new Array(W).fill(0); const headCol = new Array(W).fill(0);
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) { const a = d[(y * W + X) * 4 + 3]; if (a > 40) { if (X < minX) minX = X; if (X > maxX) maxX = X; if (y < minY) minY = y; if (y > maxY) maxY = y; colSum[X]++; } }
    for (let y = minY; y < minY + (maxY - minY) * 0.22; y++) for (let X = 0; X < W; X++) if (d[(y * W + X) * 4 + 3] > 40) headCol[X]++;
    const cm = (arr) => { let s = 0, t = 0; arr.forEach((v, i) => { s += v * i; t += v; }); return Math.round(s / t); };
    return { w: W, h: H, bbox: [minX, minY, maxX, maxY], massX: cm(colSum), headX: cm(headCol) }; }, CUT);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2000);
  const f = p.locator('footer, [data-elementor-type="footer"]').first();
  await f.screenshot({ path: `${OUT}/footer-desktop.jpg`, type: 'jpeg', quality: 72 });
  rep.footer = await p.evaluate(() => { const f = document.querySelector('[data-elementor-type="footer"]'); const r = f.getBoundingClientRect();
    const walk = [...f.querySelectorAll('.elementor-widget')].map((w) => ({ id: w.dataset.id, type: w.dataset.widget_type, text: (w.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300), links: [...w.querySelectorAll('a')].map((a) => [(a.innerText || a.getAttribute('aria-label') || '').trim().slice(0, 60), decodeURIComponent(a.getAttribute('href') || '').slice(0, 120)]).slice(0, 40) }));
    const css = getComputedStyle(f.querySelector('.e-con, .elementor-section') || f); return { h: Math.round(r.height), bg: css.backgroundColor, bgi: css.backgroundImage.slice(0, 200), widgets: walk }; });
  fs.writeFileSync(`${OUT}/footer.html`, await p.evaluate(() => document.querySelector('[data-elementor-type="footer"]').outerHTML));
  await ctx.close(); }
{ const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }); const p = await ctx.newPage();
  await p.goto(S + '/?m=2', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await close(p);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2000);
  await p.locator('[data-elementor-type="footer"]').first().screenshot({ path: `${OUT}/footer-phone.jpg`, type: 'jpeg', quality: 72 });
  await ctx.close(); }
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
