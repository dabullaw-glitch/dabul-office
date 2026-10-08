// speed check: which elements move while the home page loads (layout shift), the biggest element (LCP),
// images without width/height, and the style/script files that block the first paint. Computer and phone.
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/cls23'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const b = await chromium.launch();
const INIT = () => {
  window.__ls = []; window.__lcp = [];
  const d = (n) => { if (!n || !n.tagName) return String(n && n.nodeName); let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 4).join('.'); let p = n.closest && n.closest('[data-id]'); return s + (p ? ' in data-id=' + p.getAttribute('data-id') : ''); };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__ls.push({ v: Math.round(e.value * 10000) / 10000, t: Math.round(e.startTime), input: e.hadRecentInput, src: (e.sources || []).map((s) => ({ n: d(s.node), from: [s.previousRect.x, s.previousRect.y, s.previousRect.width, s.previousRect.height].map(Math.round), to: [s.currentRect.x, s.currentRect.y, s.currentRect.width, s.currentRect.height].map(Math.round) })) }))).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lcp.push({ t: Math.round(e.startTime), size: e.size, n: d(e.element), url: e.url }))).observe({ type: 'largest-contentful-paint', buffered: true });
};
for (const [name, ctxo] of [['desk', { viewport: { width: 1350, height: 940 }, locale: 'he-IL' }], ['phone', { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36', locale: 'he-IL' }]]) {
  const ctx = await b.newContext(ctxo); await ctx.addInitScript(INIT);
  const p = await ctx.newPage();
  const resp = await p.goto(S + '?c23=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(6000);
  if (name === 'desk') fs.writeFileSync(`${OUT}/home.html`, await resp.text());
  rep[name] = await p.evaluate(() => ({
    ls: window.__ls, cls: Math.round(window.__ls.filter((e) => !e.input).reduce((a, e) => a + e.v, 0) * 10000) / 10000, lcp: window.__lcp,
    unsized: [...document.images].filter((i) => !i.getAttribute('width') || !i.getAttribute('height')).map((i) => { const r = i.getBoundingClientRect(); const p = i.closest('[data-id]'); return (i.currentSrc || i.src).slice(-70) + ' | ' + Math.round(r.width) + 'x' + Math.round(r.height) + ' @y' + Math.round(r.top + scrollY) + ' | ' + (p ? p.getAttribute('data-id') : '') + ' | ' + (i.className || '').slice(0, 50); }),
    blocking: [...document.querySelectorAll('head link[rel=stylesheet]')].filter((l) => l.media === 'all' || !l.media).map((l) => l.href.replace('https://dabullaw.co.il', '').slice(0, 120)),
    syncjs: [...document.querySelectorAll('head script[src]')].filter((s) => !s.async && !s.defer && s.type !== 'module').map((s) => s.src.slice(0, 120)),
    res: performance.getEntriesByType('resource').filter((r) => r.startTime < 4000).map((r) => Math.round(r.startTime) + ' ' + Math.round(r.duration) + ' ' + r.initiatorType + ' ' + r.name.replace('https://dabullaw.co.il', '').slice(0, 110)),
    nav: (() => { const n = performance.getEntriesByType('navigation')[0]; return { ttfb: Math.round(n.responseStart), dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) }; })(),
  }));
  await p.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 70 });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
