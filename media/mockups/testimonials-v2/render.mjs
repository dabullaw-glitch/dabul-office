import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
for (const [n, w, s] of [['desktop', 1366, 1], ['mobile', 390, 2]]) {
  const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: s });
  await p.goto('file://' + process.cwd() + '/index.html'); await p.waitForTimeout(400);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  console.log(n, 'scrollWidth', sw);
  await p.screenshot({ path: `testimonials-v2-${n}.png`, fullPage: true });
}
await b.close();
