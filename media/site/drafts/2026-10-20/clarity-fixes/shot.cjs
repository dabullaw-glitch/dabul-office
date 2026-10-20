// node shot.cjs page.html out.png width [marks]  -> offline screenshot with real CSS/JS/fonts, placeholder photos
const { chromium } = require('/tmp/claude-0/node_modules/playwright');
const fs = require('fs'), path = require('path');
const S = path.resolve(__dirname, '../_site');
const amap = JSON.parse(fs.readFileSync(path.join(__dirname,'live/assets-map.json')));
const imap = JSON.parse(fs.readFileSync(path.join(__dirname,'live/img-map.json')));
const fonts = [[/NotoSansHebrew-Light\.woff2/, '300'], [/NotoSansHebrew-Regular\.woff2/, '400'], [/NotoSansHebrew-Bold\.woff2/, '700']];
(async () => {
  const [inp, out, w0, clipH] = process.argv.slice(2); const w = +(w0 || 390);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const ctx = await b.newContext({ viewport: { width: w, height: w < 600 ? 844 : 900 }, deviceScaleFactor: 2, isMobile: w < 600, hasTouch: w < 600 });
  const p = await ctx.newPage();
  await p.route('**/*', async r => {
    const ru = r.request().url(); const k = ru.split('?')[0];
    if (ru.startsWith('file:') || ru.startsWith('data:')) return r.continue();
    if (amap[k]) { const f = path.join(__dirname, amap[k]); return r.fulfill({ body: fs.readFileSync(f), contentType: f.endsWith('.css') ? 'text/css' : 'application/javascript' }); }
    for (const [re, wt] of fonts) if (re.test(ru)) return r.fulfill({ body: fs.readFileSync(S + '/fonts/noto-sans-hebrew-hebrew-' + wt + '-normal.woff2'), contentType: 'font/woff2', headers: { 'access-control-allow-origin': '*' } });
    if (/yakir-dabul-headshot-circle|Yakir-Dabul-Avatar|%D7%99%D7%A7%D7%99%D7%A8-%D7%93%D7%91%D7%95%D7%9C/.test(ru)) return r.fulfill({ body: fs.readFileSync(S + '/yakir.webp'), contentType: 'image/webp' });
    if (/logo-2\.png|logo-head|unnamed-3-1\.jpg/.test(ru)) return r.fulfill({ body: fs.readFileSync(S + (/logo-2/.test(ru) ? '/logo-site.webp' : '/logo-head.webp')), contentType: 'image/webp' });
    if (imap[ru]) return r.fulfill({ body: fs.readFileSync(path.join(__dirname, imap[ru])), contentType: 'image/png' });
    return r.abort();
  });
  await p.goto('file://' + path.resolve(inp), { waitUntil: 'load', timeout: 90000 });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200);
  const marks = await p.evaluate(() => { const o = {}; for (const [k, s] of [['h1','h1'],['dark','.dlb'],['calc','.dabul-fee-wrapper'],['focus','#dlbe'],['top','#dlbtop']]) { const e = document.querySelector(s); if (e) o[k] = Math.round(e.getBoundingClientRect().top + scrollY); } o.H = document.documentElement.scrollHeight; return o; });
  console.log(JSON.stringify(marks));
  const H = clipH ? Math.min(+clipH, marks.H) : marks.H;
  await p.screenshot({ path: out, fullPage: true, clip: { x: 0, y: 0, width: w, height: H } });
  await b.close();
})();
