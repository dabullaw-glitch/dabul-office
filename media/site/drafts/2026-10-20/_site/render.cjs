// node _site/render.cjs page.html out-desktop.png out-mobile.png
// Offline render: every request to the live site is answered from local copies or blocked. Read only.
const { chromium } = require('/tmp/claude-0/node_modules/playwright');
const fs = require('fs'), path = require('path');
const S = __dirname;
const map = [
  [/NotoSansHebrew-Light\.woff2/, S + '/fonts/noto-sans-hebrew-hebrew-300-normal.woff2', 'font/woff2'],
  [/NotoSansHebrew-Regular\.woff2/, S + '/fonts/noto-sans-hebrew-hebrew-400-normal.woff2', 'font/woff2'],
  [/NotoSansHebrew-Bold\.woff2/, S + '/fonts/noto-sans-hebrew-hebrew-700-normal.woff2', 'font/woff2'],
  [/post-920\.css/, S + '/css/post-920.css', 'text/css'],
  [/post-3815\.css/, S + '/css/post-3815.css', 'text/css'],
  [/widget-post-info-rtl/, S + '/css/post-info.css', 'text/css'],
  [/block-library\/style-rtl/, S + '/css/block-library.css', 'text/css'],
  [/unnamed-3-1\.jpg|logo-footer/, S + '/logo-site.webp', 'image/webp'],
  [/yakir-dabul-headshot-circle|Yakir-Dabul-Avatar|%D7%99%D7%A7%D7%99%D7%A8-%D7%93%D7%91%D7%95%D7%9C\.png|יקיר-דבול\.png/, S + '/yakir.webp', 'image/webp'],
  [/\.(webp|png|jpe?g|svg|gif)(\?|$)/i, S + '/ph.png', 'image/png'],
];
(async () => {
  const [inp, outD, outM] = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  for (const [out, w, dpr] of [[outD, 1200, 1], [outM, 390, 2]]) {
    if (!out) continue;
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, deviceScaleFactor: dpr, isMobile: w < 600, hasTouch: w < 600 });
    const p = await ctx.newPage();
    await p.route('**/*', r => {
      const u = decodeURIComponent(r.request().url());
      if (u.startsWith('file:') || u.startsWith('data:')) return r.continue();
      for (const [re, f, ct] of map) if (re.test(u) && fs.existsSync(f)) return r.fulfill({ body: fs.readFileSync(f), contentType: ct });
      return r.abort();
    });
    await p.goto('file://' + path.resolve(inp), { waitUntil: 'load', timeout: 90000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(700);
    const h = await p.evaluate(() => document.documentElement.scrollHeight);
    await p.screenshot({ path: out, fullPage: true, clip: { x: 0, y: 0, width: w, height: h } });
    await ctx.close();
  }
  await b.close();
})();
