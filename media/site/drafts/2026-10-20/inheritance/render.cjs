const { chromium } = require('playwright');
(async()=>{const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1200, height: 900 } });
for (const n of ['tzav-yerusha', 'tzav-kiyum-tzavaa']) {
  await p.goto('file://' + process.cwd() + '/' + n + '.preview.html', { waitUntil: 'networkidle' }).catch(() => {});
  await p.waitForTimeout(800);
  await p.screenshot({ path: n + '.png', fullPage: true });
}
await b.close();})();
