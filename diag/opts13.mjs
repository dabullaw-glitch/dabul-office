// round 11: new desktop hero photo concepts, phone hero city background levels, the new about section on a preview address
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts13'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const M = S + '__mock/';
const rep = {};
const HIDE = '.elementor-popup-modal,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.elementor-element-844bd60,.dabul-gbadge{display:none!important}';
const BASE = `.elementor-element-9056c3a{position:relative}.elementor-element-9056c3a>.e-con{position:relative;z-index:1}#dbl-hfx{position:absolute;inset:0;z-index:0;pointer-events:none}.elementor-element-2c91460{position:relative}`;
const CORN = 'linear-gradient(#d6b25e,#d6b25e) top right/60px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) top right/2px 60px no-repeat,linear-gradient(#d6b25e,#d6b25e) top left/60px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) top left/2px 60px no-repeat,linear-gradient(#d6b25e,#d6b25e) bottom right/60px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) bottom right/2px 60px no-repeat,linear-gradient(#d6b25e,#d6b25e) bottom left/60px 2px no-repeat,linear-gradient(#d6b25e,#d6b25e) bottom left/2px 60px no-repeat';
const HC = {
  d1: { css: `.elementor-element-2c91460 img:not(.dbl-x){visibility:hidden}.dbl-hp{position:absolute;left:50%;top:40px;width:430px;height:430px;margin-left:-215px}.dbl-hp:before{content:"";position:absolute;inset:-90px;border-radius:50%;background:radial-gradient(circle,rgba(214,178,94,.28),rgba(214,178,94,0) 66%)}.dbl-hp .pic{position:relative;width:100%;height:100%;border-radius:50%;overflow:hidden;background:url(${M}hero-face.webp) 50% 30%/cover no-repeat;box-shadow:0 0 0 3px #e7cd96,0 0 0 16px rgba(231,205,150,.12),0 34px 70px rgba(0,0,0,.6)}.dbl-hp img.dbl-x{visibility:visible;width:100%;height:100%;object-fit:cover;display:block}`,
    w: `<div class="dbl-hp"><div class="pic"></div></div>`, fx: '' },
  d2: { css: `.elementor-element-2c91460 img{visibility:hidden}#dbl-hfx{right:auto;width:46%;background:url(${M}hero-studio.webp) 50% 12%/cover no-repeat;-webkit-mask-image:linear-gradient(90deg,#000 55%,transparent 100%);mask-image:linear-gradient(90deg,#000 55%,transparent 100%)}#dbl-hfx:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(8,12,28,.55),rgba(8,12,28,0) 30%)}`, w: '', fx: '<div id="dbl-hfx"></div>' },
  d3: { css: `.elementor-element-2c91460 img{visibility:hidden}.dbl-hc{position:absolute;left:50%;top:30px;width:410px;height:620px;margin-left:-205px}.dbl-hc .ph{position:absolute;inset:0;border-radius:14px;overflow:hidden;background:url(${M}hero-studio.webp) 50% 8%/cover no-repeat;box-shadow:0 34px 70px rgba(0,0,0,.55)}.dbl-hc:before{content:"";position:absolute;inset:-14px;z-index:2;background:${CORN}}`, w: '<div class="dbl-hc"><div class="ph"></div></div>', fx: '' },
  d4: { css: `.elementor-element-2c91460 img{visibility:hidden}#dbl-hfx{right:auto;width:42%;background:url(${M}hero-studio.webp) 50% 12%/cover no-repeat;box-shadow:2px 0 0 #d6b25e,18px 0 40px rgba(0,0,0,.45)}`, w: '', fx: '<div id="dbl-hfx"></div>' },
};
const b = await chromium.launch();
const prep = async (ctx) => { await ctx.route(M + '*', (r) => { const f = 'mock/' + r.request().url().split('/__mock/')[1]; r.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(f) }); }); };
for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'he-IL' }); await prep(ctx);
  const p = await ctx.newPage(); await p.goto(S + '?o13=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: HIDE });
  for (const [k, v] of Object.entries(HC)) {
    await p.evaluate(({ css, wid, fx }) => { ['dbl-hv', 'dbl-hfx'].forEach((i) => document.getElementById(i)?.remove()); document.querySelectorAll('.dbl-hp,.dbl-hc').forEach((e) => e.remove()); const st = document.createElement('style'); st.id = 'dbl-hv'; st.textContent = css; document.head.appendChild(st); if (fx) document.querySelector('.elementor-element-9056c3a').insertAdjacentHTML('afterbegin', fx); if (wid) document.querySelector('.elementor-element-2c91460').insertAdjacentHTML('beforeend', wid); }, { css: BASE + v.css, wid: v.w, fx: v.fx });
    await p.waitForTimeout(1500); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/hero-${k}-${w}.jpg`, type: 'jpeg', quality: 86 });
  }
  await ctx.close();
}
/* phone hero: how dark the layer over the city is */
const G = { now: null, g1: [.8, .58, .3], g2: [.7, .45, .18], g3: [.6, .32, .08] };
{
  const ctx = await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto(S + '?o13p=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '.elementor-popup-modal{display:none!important}' });
  for (const [k, v] of Object.entries(G)) {
    await p.evaluate((v) => { document.getElementById('dbl-g')?.remove(); if (!v) return; const st = document.createElement('style'); st.id = 'dbl-g'; st.textContent = `.dbl-ph:before{background:linear-gradient(180deg,rgba(8,13,30,${v[0]}) 0%,rgba(8,13,30,${v[1]}) 42%,rgba(8,13,30,${v[2]}) 100%)!important}`; document.head.appendChild(st); }, v);
    await p.waitForTimeout(600); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/phone-${k}.jpg`, type: 'jpeg', quality: 86 });
  }
  await ctx.close();
}
/* the new about section, from the site itself (preview address) */
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto(S + '?dblprev=1&o13a=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: HIDE + '[data-elementor-type="header"]{visibility:hidden!important}#dbl-cbar{display:none!important}' });
  for (let y = 0; y < 6000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(120); }
  const n = p.locator('#dbl-about'); rep['about-' + mode] = await n.count();
  await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
  await n.screenshot({ path: `${OUT}/about-site-${mode}.jpg`, type: 'jpeg', quality: 84 });
  rep['about-geo-' + mode] = await p.evaluate(() => { const t = document.querySelector('#dbl-about .tx').getBoundingClientRect(); const ph = document.querySelector('#dbl-about .phw').getBoundingClientRect(); const im = document.querySelector('#dbl-about .ph img'); return { tx: [t.top, t.bottom], ph: [ph.top, ph.bottom], img: im.naturalWidth, links: [...document.querySelectorAll('#dbl-about a')].map((a) => a.href.slice(0, 60)) }; });
  if (mode === 'desktop') {
    await p.click('#dbl-about .btn2'); await p.waitForTimeout(2500);
    rep.modal = await p.evaluate(() => !!document.querySelector('.dbl-ytm iframe'));
    await p.screenshot({ path: `${OUT}/about-video.jpg`, type: 'jpeg', quality: 80 });
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
