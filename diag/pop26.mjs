// what the cookie popup does to the page when it opens: scroll lock, focus, position; and any scrolling during load
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/pop26'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const rep = [];
const b = await chromium.launch();
const INIT = () => {
  window.__ev = []; const t = () => Math.round(performance.now());
  const d = (n) => { if (!n || !n.tagName) return String(n && n.nodeName); let s = n.tagName.toLowerCase(); if (n.id) s += '#' + n.id; if (n.className && typeof n.className === 'string') s += '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.'); return s; };
  addEventListener('focusin', (e) => window.__ev.push(t() + ' focus ' + d(e.target) + ' sy=' + Math.round(scrollY) + ' ' + (new Error().stack || '').split('\n').slice(2, 6).join(' / ').slice(0, 300)), true);
  let ly = 0; addEventListener('scroll', () => { if (Math.abs(scrollY - ly) > 50) { window.__ev.push(t() + ' scroll ' + Math.round(ly) + '>' + Math.round(scrollY)); ly = scrollY; } }, true);
  const of = HTMLElement.prototype.focus; HTMLElement.prototype.focus = function (o) { window.__ev.push(t() + ' focus() on ' + d(this) + ' opts=' + JSON.stringify(o || null) + ' ' + (new Error().stack || '').split('\n').slice(2, 5).join(' / ').slice(0, 300)); return of.call(this, o); };
  const osi = Element.prototype.scrollIntoView; Element.prototype.scrollIntoView = function (o) { window.__ev.push(t() + ' scrollIntoView ' + d(this) + ' ' + (new Error().stack || '').split('\n').slice(2, 5).join(' / ').slice(0, 300)); return osi.call(this, o); };
  const sto = window.scrollTo; window.scrollTo = function () { window.__ev.push(t() + ' scrollTo ' + JSON.stringify([...arguments]).slice(0, 80) + ' ' + (new Error().stack || '').split('\n').slice(2, 5).join(' / ').slice(0, 300)); return sto.apply(this, arguments); };
  new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__ev.push(Math.round(e.startTime) + ' SHIFT ' + e.value.toFixed(4) + ' ' + (e.sources || []).map((s) => d(s.node)).join(',')))).observe({ type: 'layout-shift', buffered: true });
};
for (let i = 0; i < 6; i++) {
  const ctx = await b.newContext({ viewport: { width: 1350, height: 940 }, locale: 'he-IL' }); await ctx.addInitScript(INIT);
  const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 40 + i * 30, downloadThroughput: 1.25e6, uploadThroughput: 1e6 });
  await p.goto(S + '?p26=' + Date.now() + i, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(6000);
  const r = await p.evaluate(() => {
    const pop = document.getElementById('elementor-popup-modal-1023'); const cs = (el) => el ? getComputedStyle(el) : null;
    return { ev: window.__ev, sy: scrollY, html: { ov: cs(document.documentElement).overflow, cls: document.documentElement.className }, body: { ov: cs(document.body).overflow, cls: document.body.className.split(' ').filter((c) => /popup|modal|dialog|prevent|scroll/.test(c)) },
      pop: pop ? { pos: cs(pop).position, disp: cs(pop).display, rect: JSON.stringify(pop.getBoundingClientRect()), msg: pop.querySelector('.dialog-message') ? cs(pop.querySelector('.dialog-message')).position : '', html: pop.outerHTML.slice(0, 600), settings: (document.querySelector('[data-elementor-id="1023"]') || {}).getAttribute ? document.querySelector('[data-elementor-id="1023"]').getAttribute('data-elementor-settings') : '' } : null };
  });
  rep.push({ i, ...r });
  if (i === 0) await p.screenshot({ path: `${OUT}/s0.jpg`, type: 'jpeg', quality: 60 });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
