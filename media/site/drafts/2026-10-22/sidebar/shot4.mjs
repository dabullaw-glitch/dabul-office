import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new','--allow-file-access-from-files'], headless:false});
const p = await b.newPage({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: 1.3 });
await p.goto('file://' + process.cwd() + '/sketch4.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
await p.screenshot({ path: 'sketch4.png', fullPage: true });
await b.close();
