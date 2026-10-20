const { chromium } = require('/tmp/claude-0/node_modules/playwright');
const fs=require('fs'),path=require('path');
const amap=JSON.parse(fs.readFileSync('live/assets-map.json'));
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
for (const w of [390,1280]){const p=await (await b.newContext({viewport:{width:w,height:844},isMobile:w<600})).newPage();
await p.route('**/*',r=>{const u=r.request().url();const k=u.split('?')[0];if(u.startsWith('file:'))return r.continue();if(amap[k]){const f=amap[k];return r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.css')?'text/css':'application/javascript'});}return r.abort();});
await p.goto('file://'+path.resolve('live/price.html'),{waitUntil:'load'});await p.waitForTimeout(800);
const o=await p.evaluate(()=>{const c=document.querySelector('.dlb').closest('.elementor-widget-container, .elementor-widget-theme-post-content')||document.body;const r=[];
document.querySelectorAll('.elementor-widget-theme-post-content h2, .elementor-widget-theme-post-content h3, .elementor-widget-theme-post-content table, .dlb, #dlbe, .dabul-fee-wrapper').forEach(e=>r.push([e.tagName+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:''),Math.round(e.getBoundingClientRect().top+scrollY),(e.innerText||'').trim().slice(0,45).replace(/\n/g,' ')]));
return {H:document.documentElement.scrollHeight,r};});
console.log('W',w,'H',o.H);o.r.forEach(x=>console.log(x.join(' | ')));}
await b.close();})();
