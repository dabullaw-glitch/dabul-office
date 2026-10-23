const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
  const p = await b.newPage({ viewport: { width: 1200, height: 1500 }, deviceScaleFactor: 1 });
  await p.goto('file://' + process.cwd() + '/' + (process.argv[2] || 'issue1.html'));
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
  const out = process.argv[3] || 'out';
  require('fs').mkdirSync(out, { recursive: true });
  const n = await p.$$eval('section.slide', s => s.length);
  for (let i = 1; i <= n; i++) { const el = await p.$('#s' + i); await el.screenshot({ path: `${out}/${String(i).padStart(2, '0')}.png` }); }
  // overflow check
  const ov = await p.$$eval('section.slide', ss => ss.map(s => { const f = s.querySelector('.foot'); if(!f) return s.id; const kids = [...s.children].filter(c => !c.classList.contains('foot') && getComputedStyle(c).position !== 'absolute'); const fb = f.getBoundingClientRect().top; const mx = Math.max(...kids.map(k => k.getBoundingClientRect().bottom)); return s.id + ' gap ' + Math.round(fb - mx); }));
  console.log(ov.join('\n'));
  await b.close();
})();
