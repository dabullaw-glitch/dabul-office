// which file makes the home page jump on the computer: a slow-network run, then runs where each late style file is held back 2.5s
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/cls24'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = {};
const b = await chromium.launch();
const INIT = () => {
  window.__ls = [];
  const d = (n) => { if (!n || !n.tagName) return String(n && n.nodeName); let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.'); const p = n.closest && n.closest('[data-id]'); return s + (p ? ' @' + p.getAttribute('data-id') : ''); };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__ls.push({ v: Math.round(e.value * 10000) / 10000, t: Math.round(e.startTime), src: (e.sources || []).slice(0, 5).map((s) => d(s.node) + ' ' + [s.previousRect.y, s.previousRect.height].map(Math.round).join('/') + '>' + [s.currentRect.y, s.currentRect.height].map(Math.round).join('/')) }); })).observe({ type: 'layout-shift', buffered: true });
};
const HOLD = ['', 'accessibility-onetap-front-end', 'onetap-fonts-readable', 'document-embedder', 'fadeInRight', 'slideInUp', 'widget-google_maps', 'widget-video', 'widget-price-list', 'unnamed-3-1', 'NotoSansHebrew', 'post-619.css', 'bgmain'];
for (const h of HOLD) {
  const ctx = await b.newContext({ viewport: { width: 1350, height: 940 }, locale: 'he-IL' }); await ctx.addInitScript(INIT);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40, downloadThroughput: 10 * 1024 * 1024 / 8, uploadThroughput: 10 * 1024 * 1024 / 8 });
  if (h) await p.route((u) => u.href.includes(h), async (r) => { await new Promise((z) => setTimeout(z, 2500)); await r.continue(); });
  await p.goto(S + '?c24=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(5000);
  rep[h || 'base'] = await p.evaluate(() => ({ cls: Math.round(window.__ls.reduce((a, e) => a + e.v, 0) * 10000) / 10000, ls: window.__ls }));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
