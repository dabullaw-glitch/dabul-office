import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
for (const [n, w, s] of [['desktop', 1300, 1], ['mobile', 390, 2]]) { const p = await b.newPage({ viewport: { width: w, height: 900 }, deviceScaleFactor: s }); await p.goto('file://' + process.cwd() + '/local2.html'); await p.waitForTimeout(500); await p.screenshot({ path: `succ2-${n}.png`, fullPage: true }); }
await b.close();
