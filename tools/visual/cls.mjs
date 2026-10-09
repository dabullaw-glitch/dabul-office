// Which parts of a page jump while it loads and while a visitor scrolls (layout shifts), phone and computer.
// Like a real visit: load, wait, first touch / mouse move, then scroll to the bottom slowly. Records every shift with
// the elements that moved (and how far), ignoring shifts right after a click or key press (as Google does).
// Usage: node cls.mjs <name> <url> [<url> ...]
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const [name, ...urls] = process.argv.slice(2);
const out = new URL(`../visual/${name}`, import.meta.url).pathname; fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const report = {};
const init = () => {
  window.__ls = [];
  const sel = (n) => { if (!n || !n.tagName) return String(n && n.nodeName); let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; const c = (n.getAttribute('class') || '').split(/\s+/).filter((x) => x && !/^elementor-(element|widget|column|section)$/.test(x)).slice(0, 4).join('.'); if (c) s += '.' + c; const did = n.getAttribute && n.getAttribute('data-id'); if (did) s += '[' + did + ']'; return s; };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__ls.push({ t: Math.round(e.startTime), v: Math.round(e.value * 10000) / 10000, input: e.hadRecentInput, y: Math.round(scrollY),
    src: (e.sources || []).slice(0, 4).map((s) => ({ el: sel(s.node), from: [Math.round(s.previousRect.y), Math.round(s.previousRect.height)], to: [Math.round(s.currentRect.y), Math.round(s.currentRect.height)], parent: s.node && s.node.parentElement ? sel(s.node.parentElement) : '' })) }); }).observe({ type: 'layout-shift', buffered: true });
};
for (const url of urls) {
  for (const [dev, opts] of [['phone', { ...devices['Pixel 7'] }], ['computer', { viewport: { width: 1366, height: 900 } }]]) {
    for (const run of [1, 2]) {
      const ctx = await b.newContext({ ...opts, locale: 'he-IL' });
      const p = await ctx.newPage();
      await p.addInitScript(init);
      await p.goto(url, { waitUntil: 'load', timeout: 90000 });
      await p.waitForTimeout(2500);
      await p.mouse.move(300, 400).catch(() => {}); await p.mouse.move(320, 420).catch(() => {});
      const H = await p.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < H; y += 300) { await p.mouse.wheel(0, 300); await p.waitForTimeout(350); }
      await p.waitForTimeout(2500);
      const ls = await p.evaluate(() => window.__ls);
      const counted = ls.filter((e) => !e.input);
      // session windows like CLS: max sum of shifts within 5s windows with gaps < 1s
      let best = 0, cur = 0, start = 0, last = -1e9;
      for (const e of counted) { if (e.t - last > 1000 || e.t - start > 5000) { cur = 0; start = e.t; } cur += e.v; last = e.t; best = Math.max(best, cur); }
      report[`${url} | ${dev} | ${run}`] = { cls: Math.round(best * 1000) / 1000, total: Math.round(counted.reduce((a, e) => a + e.v, 0) * 1000) / 1000, shifts: counted.filter((e) => e.v >= 0.002) };
      await ctx.close();
    }
  }
}
await b.close();
fs.writeFileSync(`${out}/report.json`, JSON.stringify(report, null, 1));
for (const [k, v] of Object.entries(report)) console.log(k, v.cls, v.total, v.shifts.length);
