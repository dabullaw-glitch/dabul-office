// How fast do the pictures of the "הצלחות" carousel on the home page appear, for a visitor who scrolls down to it?
// Phone (Pixel 7, slow 4G, 4x slower processor, like PageSpeed) and computer. Records, every 250ms after the section
// comes into view, how many carousel pictures on screen are still empty, plus when each picture was requested and arrived.
// Usage: node carousel.mjs <url> <name>
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const [URL_, name] = process.argv.slice(2);
const out = new URL(`../visual/${name}`, import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const report = {};
for (const [dev, opts, slow] of [['phone', { ...devices['Pixel 7'] }, true], ['computer', { viewport: { width: 1366, height: 900 } }, false]]) {
  const ctx = await b.newContext({ ...opts, locale: 'he-IL' });
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (slow) {
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6e6 / 8 * 1.0, uploadThroughput: 750e3 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  }
  const t0 = Date.now(); const net = {};
  p.on('request', (r) => { const u = r.url(); if (/uploads\/(2025|2026)\/(05|12|03)\//.test(u) && /\.(webp|jpg|png)/.test(u)) net[u] = { req: Date.now() - t0 }; });
  p.on('requestfinished', async (r) => { const u = r.url(); if (net[u]) { net[u].done = Date.now() - t0; try { net[u].bytes = (await r.sizes()).responseBodySize; } catch (e) {} } });
  const errors = []; p.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
  await p.goto(URL_, { waitUntil: 'load', timeout: 90000 });
  const loadAt = Date.now() - t0;
  await p.waitForTimeout(2000);
  // the visitor scrolls down with the finger / mouse wheel until the section is on screen
  const target = await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find((e) => e.textContent.trim() === 'הצלחות'); return h ? h.getBoundingClientRect().top + scrollY - 80 : -1; });
  let y = 0; const scrollStart = Date.now() - t0;
  while (y < target) { const step = Math.min(600, target - y); await p.mouse.wheel(0, step); y += step; await p.waitForTimeout(120); }
  await p.evaluate((v) => window.scrollTo(0, v), target);
  const inView = Date.now() - t0;
  const samples = [];
  for (let i = 0; i < 48; i++) {
    const s = await p.evaluate(() => {
      const vh = innerHeight, vw = innerWidth;
      const imgs = [...document.querySelectorAll('.elementor-widget-image-carousel img')].filter((im) => { const r = im.getBoundingClientRect(); return r.width > 5 && r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw; });
      const w = document.querySelector('.elementor-widget-image-carousel .swiper');
      return { onScreen: imgs.length, empty: imgs.filter((im) => im.src.startsWith('data:') || !im.complete || !im.naturalWidth).length,
        swiper: !!(w && (w.classList.contains('swiper-initialized') || w.swiper)), firstSrc: imgs[0] ? imgs[0].currentSrc.slice(-60) : '' };
    });
    samples.push({ t: Date.now() - t0 - inView, ...s });
    if ([0, 4, 8, 16, 32, 47].includes(i)) await p.screenshot({ path: `${out}/${dev}-${String(i).padStart(2, '0')}.png` });
    await p.waitForTimeout(250);
  }
  report[dev] = { loadAt, scrollStart, inView, errors, samples, net: Object.fromEntries(Object.entries(net).map(([u, v]) => [u.split('/').pop(), { ...v, reqAfterView: v.req - inView, doneAfterView: v.done ? v.done - inView : null }])) };
  await ctx.close();
}
await b.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report).slice(0, 3000));
