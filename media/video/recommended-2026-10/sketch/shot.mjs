import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--allow-file-access-from-files']});
const p = await b.newPage({ viewport: { width: 1520, height: 900 }, deviceScaleFactor: 1.4 });
await p.goto('file://' + process.cwd() + '/storylines.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(500);
await p.screenshot({ path: 'storylines.png', fullPage: true }); await b.close();
