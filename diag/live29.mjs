// after making speed round 3 live: key pages on computer and phone, errors, page jump, logo size, skip-link target
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/live29'; fs.mkdirSync(OUT, { recursive: true });
const pages = ['', 'category/press/', 'contact/', 'real-estate-lawyer-agamim-netanya/'];
const rep = {}; const b = await chromium.launch();
const INIT = () => { window.__cls = 0; new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: 'layout-shift', buffered: true }); };
for (const [dn, opt] of [['desk', { viewport: { width: 1366, height: 900 }, locale: 'he-IL' }], ['phone', { ...devices['iPhone 13'], locale: 'he-IL' }]]) {
  for (const pg of pages) {
    const ctx = await b.newContext(opt); await ctx.addInitScript(INIT); const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
    const r = await p.goto('https://dabullaw.co.il/' + pg + '?l29=' + Date.now(), { waitUntil: 'load', timeout: 90000 }).catch((e) => null);
    await p.waitForTimeout(4000);
    rep[dn + ':' + (pg || 'home')] = { status: r && r.status(), errs, ...(await p.evaluate(() => ({ cls: Math.round(window.__cls * 1000) / 1000, sp3: !!document.getElementById('dbl-sp3'), content: !!document.getElementById('content'), logo: [...document.images].filter((i) => /unnamed-3-1/.test(i.src)).map((i) => i.getAttribute('width') + 'x' + i.getAttribute('height'))[0] || '', h: document.documentElement.scrollHeight }))) };
    if (!pg) await p.screenshot({ path: `${OUT}/${dn}-home.jpg`, type: 'jpeg', quality: 60 });
    await ctx.close();
  }
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
