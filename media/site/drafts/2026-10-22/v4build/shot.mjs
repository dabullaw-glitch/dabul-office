import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--allow-file-access-from-files']});
const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1.2 });
await p.goto('file://' + process.cwd() + '/render.html'); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
await p.screenshot({ path: 'render.png', fullPage: true });
await p.setViewportSize({width:390,height:900}); await p.evaluate(()=>{document.body.style.display='block'}); await p.waitForTimeout(200);
await (await p.$('.dab')).screenshot({path:'render-m.png'});
await b.close();
