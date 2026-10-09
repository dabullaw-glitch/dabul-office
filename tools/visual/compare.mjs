// Visual check before a site change goes live: the same page with and without the change, on a phone and a computer.
// Scrolls slowly through the page like a visitor (so lazy pictures and entrance animations run), then takes a full-page
// picture of each, and writes a difference report. Usage: node compare.mjs <urlA> <urlB> <name>
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const [A, B, name] = process.argv.slice(2);
const out = `tools/visual/${name}`; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const report = {};
for (const [dev, ctxOpts] of [['phone', { ...devices['Pixel 7'] }], ['computer', { viewport: { width: 1366, height: 900 } }]]) {
  for (const [tag, url] of [['a', A], ['b', B]]) {
    const ctx = await b.newContext({ ...ctxOpts, locale: 'he-IL' });
    const p = await ctx.newPage();
    await p.goto(url, { waitUntil: 'load', timeout: 60000 });
    await p.waitForTimeout(1500);
    // a visitor: touch + scroll down slowly, then back to the top
    await p.mouse.move(50, 50).catch(() => {});
    const H = await p.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < H; y += 500) { await p.evaluate((v) => window.scrollTo(0, v), y); await p.waitForTimeout(250); }
    await p.waitForTimeout(2500);
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
    // hide the cookie window so both pictures show the page itself
    await p.addStyleTag({ content: '.elementor-popup-modal,#dbl-cookie{display:none!important}' }).catch(() => {});
    await p.screenshot({ path: `${out}/${dev}-${tag}.png`, fullPage: true });
    report[`${dev}-${tag}`] = await p.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth,
      invisible: [...document.querySelectorAll('.elementor-invisible')].length, styles: document.querySelectorAll('style').length, links: document.querySelectorAll('link[rel=stylesheet]').length }));
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
