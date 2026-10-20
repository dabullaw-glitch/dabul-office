const { chromium } = require('/tmp/claude-0/node_modules/playwright');
const path=require('path');
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell'});
const p=await (await b.newContext({viewport:{width:390,height:800},isMobile:true})).newPage();
const seen=[];await p.route('**/*',r=>{const u=r.request().url();if(u.startsWith('file:')||u.startsWith('data:'))return r.continue();seen.push(r.request().resourceType()+' '+u);return r.abort();});
await p.goto('file://'+path.resolve(process.argv[2]),{waitUntil:'load'});await p.waitForTimeout(1500);
console.log(seen.slice(0,200).join('\n'));
const fam=await p.evaluate(()=>[getComputedStyle(document.body).fontFamily, getComputedStyle(document.querySelector('h1')).fontFamily, document.querySelector('h1').getBoundingClientRect().top]);console.log(fam);
await p.screenshot({path:'live/price-top-mobile.png'});await b.close();})();
