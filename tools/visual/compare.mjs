// Visual check before a site change goes live: the same page with and without the change, on a phone and a computer.
// Scrolls through the page like a visitor (so lazy pictures and entrance animations run) and takes a picture of every
// screen-height slice. Also records script errors and elements that stayed hidden. Usage: node compare.mjs <urlA> <urlB> <name>
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const [A, B, name] = process.argv.slice(2);
const out = new URL(`../visual/${name}`, import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const report = {};
for (const [dev, ctxOpts] of [['phone', { ...devices['Pixel 7'] }], ['computer', { viewport: { width: 1366, height: 900 } }]]) {
  for (const [tag, url] of [['a', A], ['b', B]]) {
    const ctx = await b.newContext({ ...ctxOpts, locale: 'he-IL' });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 200)));
    await p.goto(url, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(1500);
    await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' }).catch(() => {});
    const vh = p.viewportSize().height;
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    let i = 0;
    for (let y = 0; y < H && i < 30; y += vh, i++) {
      await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(900);
      await p.screenshot({ path: `${out}/${dev}-${tag}-${String(i).padStart(2, '0')}.png` });
    }
    report[`${dev}-${tag}`] = { errors, ...(await p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth,
      invisible: [...document.querySelectorAll('.elementor-invisible')].map((e) => e.getAttribute('data-id')), styles: document.querySelectorAll('style').length, links: document.querySelectorAll('link[rel=stylesheet]').length }))) };
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
