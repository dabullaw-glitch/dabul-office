import { chromium } from '/home/claude/.npm-global/lib/node_modules/playwright/index.mjs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 900, height: 1200 }, deviceScaleFactor: 1.4 });
await p.goto('file://' + process.cwd() + '/terms-sketch.html'); await p.waitForTimeout(400);
await p.screenshot({ path: 'terms-sketch.png', fullPage: true }); await b.close();
