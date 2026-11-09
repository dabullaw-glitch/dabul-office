// Section positions and heights of a page on a phone (Lighthouse size 412x823) and a computer (1350x940), before any touch
// (like Lighthouse) and after a touch and scrolling to the bottom (like a visitor). Usage: node measure.mjs <url> <name>
import { chromium } from 'playwright';
import fs from 'node:fs';
const [url, name] = process.argv.slice(2);
const out = new URL(`../visual/${name}`, import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const sel = '#content > *, header.elementor-location-header, footer.elementor-location-footer > *, #dbl-nl, .dsvc, .dwhy-n, .r25i, #dbl-cbar';
const b = await chromium.launch();
const res = {};
for (const [dev, opt] of [['phone', { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Mobile Safari/537.36' }], ['computer', { viewport: { width: 1350, height: 940 } }]]) {
  const ctx = await b.newContext({ ...opt, locale: 'he-IL' }); const p = await ctx.newPage();
  const errors = []; p.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
  await p.goto(url, { waitUntil: 'load', timeout: 60000 }); await p.waitForTimeout(2500);
  const m = () => p.evaluate((s) => ({ H: document.documentElement.scrollHeight, cvOff: document.documentElement.classList.contains('dbl-cv-off'),
    secs: [...document.querySelectorAll(s)].filter((e) => e.tagName !== 'STYLE' && e.tagName !== 'SCRIPT').map((e) => { const r = e.getBoundingClientRect(); return [(e.id ? '#' + e.id : '') + '.' + (e.getAttribute('data-id') || (e.className || '').toString().split(' ')[0]), Math.round(r.top + scrollY), Math.round(r.height), getComputedStyle(e).contentVisibility]; }) }), sel);
  const before = await m();
  await p.mouse.move(100, 200).catch(() => {}); await p.evaluate(() => { dispatchEvent(new Event('touchstart')); }); await p.mouse.wheel(0, 300).catch(() => {});
  await p.waitForTimeout(2500);
  const H = await p.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 600) { await p.evaluate((v) => scrollTo(0, v), y); await p.waitForTimeout(250); }
  await p.waitForTimeout(1500); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(500);
  const after = await m();
  res[dev] = { errors, before, after }; await ctx.close();
}
await b.close();
fs.writeFileSync(`${out}/measure.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res).slice(0, 3000));
