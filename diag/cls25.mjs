// catch the rare big jump on the computer: 14 loads, keep every shift above 0.01 with full rects and what changed around it
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/cls25'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = [];
const b = await chromium.launch({ args: ['--hide-scrollbars=false'] });
const INIT = () => {
  window.__ls = []; window.__mut = [];
  const d = (n) => { if (!n || !n.tagName) return String(n && n.nodeName); let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.value > 0.01) window.__ls.push({ v: Math.round(e.value * 1000) / 1000, t: Math.round(e.startTime), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sx: scrollX, sy: scrollY, hc: document.documentElement.className.slice(0, 80), bs: document.body.getAttribute('style'), hs: document.documentElement.getAttribute('style'), src: (e.sources || []).map((s) => d(s.node) + ' ' + JSON.stringify([s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round)) + '>' + JSON.stringify([s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round))) }); })).observe({ type: 'layout-shift', buffered: true });
  document.addEventListener('DOMContentLoaded', () => {
    new MutationObserver((ms) => ms.forEach((m) => { if (performance.now() < 6000) window.__mut.push(Math.round(performance.now()) + ' ' + m.type + ' ' + d(m.target) + ' ' + (m.attributeName || '') + ' ' + (m.attributeName ? String(m.target.getAttribute(m.attributeName)).slice(0, 90) : [...m.addedNodes].map(d).join(',').slice(0, 90))); })).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
    new MutationObserver((ms) => ms.forEach((m) => { if (performance.now() < 6000) window.__mut.push(Math.round(performance.now()) + ' B ' + m.type + ' ' + (m.attributeName || '') + ' ' + (m.attributeName ? String(document.body.getAttribute(m.attributeName)).slice(0, 120) : [...m.addedNodes].map(d).join(',').slice(0, 90))); })).observe(document.body, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
  });
};
for (let i = 0; i < 14; i++) {
  const ctx = await b.newContext({ viewport: { width: 1350, height: 940 }, locale: 'he-IL' }); await ctx.addInitScript(INIT);
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40 + (i % 3) * 60, downloadThroughput: (i % 2 ? 10 : 4) * 1024 * 1024 / 8, uploadThroughput: 2e6 });
  await p.goto(S + '?c25=' + Date.now() + i, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(5000);
  const r = await p.evaluate(() => ({ ls: window.__ls, mut: window.__mut }));
  rep.push({ i, ls: r.ls, mut: r.ls.length ? r.mut : r.mut.length });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
