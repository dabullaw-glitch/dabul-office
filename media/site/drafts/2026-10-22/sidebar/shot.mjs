import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new','--allow-file-access-from-files'], headless:false});
const p = await b.newPage({ viewport: { width: 1376, height: 900 }, deviceScaleFactor: 1.5 });
await p.goto('file://' + process.cwd() + '/sketch.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
await p.screenshot({ path: 'sidebar-sketch.png' });
await b.close();
