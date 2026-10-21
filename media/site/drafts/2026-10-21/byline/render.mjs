import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new'], headless:false});
for (const [w,name] of [[390,'mobile'],[1200,'desktop']]) {
  const p = await b.newPage({viewport:{width:w,height:900}, deviceScaleFactor:2});
  await p.goto('file://'+process.cwd()+'/sketch.html'); await p.waitForTimeout(500);
  const h = await p.evaluate(()=>document.querySelector('.wrap').getBoundingClientRect().bottom);
  await p.screenshot({path:`byline-${name}.png`, clip:{x:0,y:0,width:w,height:Math.ceil(h)+10}});
}
await b.close();
