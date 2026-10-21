import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new'], headless:false});
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.route(/^https?:\/\/(?!localhost)/, r => r.abort());
for (const [f, tag] of [['preview-before.html','before'],['preview.html','after']]) {
  await p.goto('file://' + process.cwd() + '/' + f);
  await p.waitForTimeout(400);
  await p.screenshot({ path: `phone-${tag}-1.png` });
  const y = await p.evaluate(() => { const e = document.getElementById('f1'); return e.getBoundingClientRect().top + scrollY - 70; });
  await p.evaluate(y => scrollTo(0, y), y); await p.waitForTimeout(200);
  await p.screenshot({ path: `phone-${tag}-2.png` });
}
// after: pick a chip to show the selected look
await p.evaluate(() => { const i = document.querySelector('#f1 input[value="100-300 אלף"]'); i.checked = true; document.getElementById('f1-n').value = 'ישראל ישראלי'; document.getElementById('f1-p').value = '050-1234567'; });
await p.screenshot({ path: 'phone-after-3.png' });
await b.close();
