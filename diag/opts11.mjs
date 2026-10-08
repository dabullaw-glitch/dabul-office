// hero plate (no photo) for offline blending, the live "about" text, and a phone footer check
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts11'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/';
const rep = {};
const b = await chromium.launch();
const HIDE = '.elementor-popup-modal,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.elementor-element-844bd60,.dabul-gbadge{display:none!important}';
for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto(S + '?o11=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: HIDE });
  rep['img' + w] = await p.evaluate(() => { const i = document.querySelector('.elementor-element-2c91460 img'); const r = i.getBoundingClientRect(); const c = document.querySelector('.elementor-element-9056c3a'); const cr = c.getBoundingClientRect(); return { src: i.currentSrc, x: r.x, y: r.y, w: r.width, h: r.height, nat: [i.naturalWidth, i.naturalHeight], hero: { x: cr.x, y: cr.y, w: cr.width, h: cr.height }, bg: getComputedStyle(c).backgroundImage, bgs: getComputedStyle(c).backgroundSize, bgp: getComputedStyle(c).backgroundPosition, ov: [...c.children].map((e) => e.className.slice(0, 80)) }; });
  await p.screenshot({ path: `${OUT}/with-${w}.png` });
  await p.addStyleTag({ content: '.elementor-element-2c91460 img{visibility:hidden!important}' });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/plate-${w}.png` });
  if (w === 1440) {
    rep.about = await p.evaluate(() => { const hh = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); let c = hh; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } return { id: c.dataset.id, text: c.innerText, html: c.outerHTML.length }; });
  }
  await ctx.close();
}
const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
const p = await ctx.newPage(); await p.goto(S + '?o11p=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
for (let y = 0; y < 14000; y += 700) { await p.mouse.wheel(0, 700); await p.waitForTimeout(100); }
await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(1500);
await p.screenshot({ path: `${OUT}/phone-bottom.jpg`, type: 'jpeg', quality: 80 });
rep.bodyPad = await p.evaluate(() => [getComputedStyle(document.body).paddingBottom, getComputedStyle(document.getElementById('dbl-foot')).paddingBottom]);
await ctx.close();
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
