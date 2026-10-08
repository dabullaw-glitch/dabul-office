// Speed diagnosis (read only): layout shifts with their elements, LCP element, RUCSS status, hero background, cache headers.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results'; fs.mkdirSync(OUT, { recursive: true });
const U = {
  home: 'https://dabullaw.co.il/',
  netanya: 'https://dabullaw.co.il/%d7%a2%d7%95%d7%a8%d7%9a-%d7%93%d7%99%d7%9f-%d7%9e%d7%a7%d7%a8%d7%a7%d7%a2%d7%99%d7%9f-%d7%91%d7%a0%d7%aa%d7%a0%d7%99%d7%94/',
  article: 'https://dabullaw.co.il/%d7%9e%d7%93%d7%a8%d7%99%d7%9a-%d7%9e%d7%a7%d7%99%d7%a3-%d7%9c%d7%a8%d7%9b%d7%99%d7%a9%d7%aa-%d7%93%d7%99%d7%a8%d7%94-%d7%99%d7%93-%d7%a9%d7%a0%d7%99%d7%94/',
  en: 'https://dabullaw.co.il/real-estate-lawyer-netanya-english/',
  fr: 'https://dabullaw.co.il/avocat-immobilier-netanya-francais/',
};
const init = () => {
  window.__ls = []; window.__lcp = [];
  const d = (n) => { if (!n || !n.tagName) return String(n && n.nodeName); return n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.dataset && n.dataset.id ? '[data-id=' + n.dataset.id + ']' : '') + '.' + String(n.className || '').split(/\s+/).slice(0, 4).join('.'); };
  new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__ls.push({ t: Math.round(e.startTime), v: +e.value.toFixed(4), src: (e.sources || []).map((s) => ({ n: d(s.node), anc: s.node && s.node.parentElement ? d(s.node.parentElement) : '', p: [s.previousRect.y, s.previousRect.height].map(Math.round), c: [s.currentRect.y, s.currentRect.height].map(Math.round) })) }); } }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp.push({ t: Math.round(e.startTime), size: e.size, url: e.url || '', n: d(e.element) }); }).observe({ type: 'largest-contentful-paint', buffered: true });
};
const b = await chromium.launch(); const rep = {};
const runs = [['home', 'mobile'], ['home', 'desktop'], ['netanya', 'mobile'], ['netanya', 'desktop'], ['article', 'mobile'], ['article', 'desktop'], ['en', 'desktop'], ['en', 'mobile'], ['fr', 'desktop']];
for (const [name, mode] of runs) {
  const ctx = mode === 'mobile' ? await b.newContext({ ...devices['Pixel 7'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1366, height: 860 }, locale: 'he-IL' });
  await ctx.addInitScript(init);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  if (mode === 'mobile') { await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1.6 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8 }); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
  const shots = [];
  const t0 = Date.now();
  const nav = p.goto(U[name] + '?nocache=' + Date.now() % 1000, { waitUntil: 'load', timeout: 90000 }).catch((e) => null);
  if (name === 'netanya' || name === 'home' || name === 'en') for (const ms of [1500, 3000, 4500, 6500]) { await p.waitForTimeout(Math.max(0, ms - (Date.now() - t0))); const f = `${OUT}/${name}-${mode}-${ms}.jpg`; await p.screenshot({ path: f, type: 'jpeg', quality: 55 }).catch(() => null); shots.push(f); }
  await nav; await p.waitForTimeout(3000);
  const r = await p.evaluate(() => {
    const hero = document.querySelector('[data-id="9056c3a"]');
    return {
      ls: window.__ls, cls: +window.__ls.reduce((a, x) => a + x.v, 0).toFixed(3), lcp: window.__lcp.slice(-2),
      usedcss: !!document.querySelector('#wpr-usedcss'), sheets: document.querySelectorAll('link[rel=stylesheet]').length,
      heroBg: hero ? getComputedStyle(hero).backgroundImage.slice(0, 200) : null, heroAttrs: hero ? [...hero.attributes].map((a) => a.name + '=' + a.value.slice(0, 80)).join(' | ') : null,
      htmlAttrs: document.documentElement.outerHTML.slice(0, 120), title: document.title, h1: (document.querySelector('h1') || {}).textContent,
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight).slice(0, 12),
    };
  });
  rep[name + '-' + mode] = r;
  await p.screenshot({ path: `${OUT}/${name}-${mode}-final.jpg`, type: 'jpeg', quality: 60 });
  await ctx.close();
}
// cache headers of static files
const ctx = await b.newContext(); const hd = {};
for (const u of ['https://dabullaw.co.il/wp-content/uploads/2026/03/NotoSansHebrew-Regular.woff2', 'https://dabullaw.co.il/wp-content/uploads/2026/03/yakir-mob-2.webp', 'https://dabullaw.co.il/wp-content/plugins/elementor/assets/css/frontend.min.css?ver=4.2.1', 'https://dabullaw.co.il/']) {
  const r = await ctx.request.get(u).catch(() => null);
  if (r) { const h = r.headers(); hd[u] = { status: r.status(), server: h.server, cache: h['cache-control'], expires: h.expires, cf: h['cf-cache-status'], age: h.age, via: h['x-litespeed-cache'] || h['x-cache'] || '', powered: h['x-powered-by'] || '' }; }
}
rep.headers = hd;
await b.close(); fs.writeFileSync(`${OUT}/diag.json`, JSON.stringify(rep, null, 1)); console.log('done');
