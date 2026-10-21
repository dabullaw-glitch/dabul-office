import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new'], headless:false});
const p = await b.newPage({viewport:{width:402,height:1000}, deviceScaleFactor:3});
await p.goto('file://'+process.cwd()+'/sketch-v2-clean.html'); await p.waitForTimeout(600);
const h = await p.evaluate(()=>document.querySelector('.card').getBoundingClientRect().bottom);
await p.screenshot({path:'byline-v2-clean.png', clip:{x:0,y:0,width:402,height:Math.ceil(h)+16}});
await b.close();
