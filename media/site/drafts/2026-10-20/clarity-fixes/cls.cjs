// node cls.cjs page.html  -> measures layout shifts offline (fonts and images arrive late, like a slow phone)
const { chromium } = require('/tmp/claude-0/node_modules/playwright');
const fs = require('fs'), path = require('path');
const S = path.resolve(__dirname, '../_site');
const amap = JSON.parse(fs.readFileSync(path.join(__dirname,'live/assets-map.json')));
const imap = JSON.parse(fs.readFileSync(path.join(__dirname,'live/img-map.json')));
const D = { css: +(process.env.DCSS||400), js: +(process.env.DJS||700), font: +(process.env.DFONT||1500), img: +(process.env.DIMG||900) };
const map = [
  [/NotoSansHebrew-Light\.woff2/, S + '/fonts/noto-sans-hebrew-hebrew-300-normal.woff2', 'font/woff2', D.font],
  [/NotoSansHebrew-Regular\.woff2/, S + '/fonts/noto-sans-hebrew-hebrew-400-normal.woff2', 'font/woff2', D.font],
  [/NotoSansHebrew-Bold\.woff2/, S + '/fonts/noto-sans-hebrew-hebrew-700-normal.woff2', 'font/woff2', D.font],
  [/yakir-dabul-headshot-circle|Yakir-Dabul-Avatar/, S + '/yakir.webp', 'image/webp', D.img],
  [/\.(webp|png|jpe?g|svg|gif)(\?|$)/i, S + '/ph.png', 'image/png', D.img],
];
(async () => {
  const [inp, w0] = process.argv.slice(2); const w = +(w0 || 390);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 800 : 900 }, deviceScaleFactor: 1, isMobile: w < 600, hasTouch: w < 600 });
  const p = await ctx.newPage();
  await p.addInitScript(() => {
    window.__ls = [];
    new PerformanceObserver(l => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue;
      window.__ls.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: (e.sources || []).map(s => { const n = s.node; let d = '';
        if (n && n.nodeType === 1) { d = n.tagName.toLowerCase() + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.') : ''); }
        else if (n) d = '#text:' + (n.textContent || '').trim().slice(0, 30);
        return d + ' y' + Math.round(s.previousRect.y) + '->' + Math.round(s.currentRect.y) + ' h' + Math.round(s.previousRect.height) + '->' + Math.round(s.currentRect.height); }) }); } }).observe({ type: 'layout-shift', buffered: true });
  });
  const errs=[]; p.on('pageerror', e => errs.push(String(e).slice(0,140))); p.on('console', m => { if (m.type()==='error') errs.push('console: '+m.text().slice(0,120)); });
  await p.route('**/*', async r => {
    const u = decodeURIComponent(r.request().url());
    if (u.startsWith('file:') || u.startsWith('data:')) return r.continue();
    const k = u.split('?')[0]; const raw = r.request().url().split('?')[0];
    for (const kk of [raw, k]) if (amap[kk]) { const f = path.join(__dirname, amap[kk]); const css = f.endsWith('.css'); await new Promise(x => setTimeout(x, css ? D.css : D.js)); return r.fulfill({ body: fs.readFileSync(f), contentType: css ? 'text/css' : 'application/javascript' }); }
    const ru = r.request().url(); if (imap[ru] && !/yakir-dabul-headshot/.test(ru)) { await new Promise(x => setTimeout(x, D.img)); return r.fulfill({ body: fs.readFileSync(path.join(__dirname, imap[ru])), contentType: 'image/png' }); }
    for (const [re, f, ct, d] of map) if (re.test(u) && fs.existsSync(f)) { await new Promise(x => setTimeout(x, d)); return r.fulfill({ body: fs.readFileSync(f), contentType: ct }); }
    return r.abort();
  });
  await p.goto('file://' + path.resolve(inp), { waitUntil: 'load', timeout: 90000 });
  await p.waitForTimeout(+(process.env.WAIT||4500));
  if (process.env.SCROLL) { const H = await p.evaluate(() => document.documentElement.scrollHeight); for (let y = 0; y < H; y += 300) { await p.mouse.wheel(0, 300); await p.waitForTimeout(250); } await p.waitForTimeout(2000); }
  const ls = await p.evaluate(() => window.__ls);
  const tot = ls.reduce((a, x) => a + x.v, 0);
  const sticky = await p.evaluate(() => [...document.querySelectorAll('.elementor-sticky--active,.elementor-sticky__spacer')].length);
  console.log(JSON.stringify({ width: w, total: +tot.toFixed(4), sticky, errs: errs.filter(e=>!/ERR_FAILED|net::/.test(e)).slice(0,8), shifts: ls }, null, 1));
  await b.close();
})();
