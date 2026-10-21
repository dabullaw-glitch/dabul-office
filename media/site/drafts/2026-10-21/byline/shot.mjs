import { chromium } from '/opt/node-tools/node_modules/playwright/index.mjs';
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium', args:['--headless=new'], headless:false});
const p = await b.newPage({viewport:{width:390,height:1400}, deviceScaleFactor:2, userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'});
await p.goto('https://dabullaw.co.il/איך-משלמים-מס-רכישה/', {waitUntil:'networkidle', timeout:60000});
await p.waitForTimeout(1500);
await p.screenshot({path:'current-mobile.png', clip:{x:0,y:0,width:390,height:1300}});
const info = await p.evaluate(()=>{const el=document.querySelector('.elementor-widget-post-info, .elementor-post-info'); const au=document.querySelector('[class*="author"]'); return {postinfo: el? el.outerHTML.slice(0,2500):null, h1: document.querySelector('h1')?.outerHTML.slice(0,300), modified: document.querySelector('meta[property="article:modified_time"]')?.content, published: document.querySelector('meta[property="article:published_time"]')?.content}});
console.log(JSON.stringify(info,null,1));
await b.close();
