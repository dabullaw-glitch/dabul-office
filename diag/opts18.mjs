// round 12 mockups: desktop hero text on one right edge (2 versions), newsletter strip with the newsletter video (2 versions, computer only)
import { chromium } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts18b'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/'; const M = S + '__mock/'; const rep = {};
const b = await chromium.launch();
const HIDE = '.elementor-popup-modal,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.dabul-gbadge{display:none!important}';
const ALIGN = `@media (min-width:1025px){.elementor-element-9056c3a{--dbl-hx:max(34px,calc((100vw - 1440px) / 2 + 34px))}
.elementor-1112 .elementor-element.elementor-element-6d16458,.elementor-1112 .elementor-element.elementor-element-94c4b61{--padding-right:var(--dbl-hx)!important;padding-right:var(--dbl-hx)!important}
.elementor-1112 .elementor-element.elementor-element-6bb6c07{right:var(--dbl-hx)!important;left:auto!important;margin-left:0!important;margin-right:0!important;width:auto!important;max-width:none!important}
.elementor-element-6bb6c07 h1{text-align:right!important}}`;
const HA = { a: ALIGN, b: ALIGN + `
@media (min-width:1025px){.elementor-element-6bb6c07 h1 i{font-size:.6em!important;font-weight:300!important;display:block;margin-top:6px}
.elementor-element-6bb6c07 h1 i:after{content:"";display:block;width:84px;height:3px;border-radius:2px;background:linear-gradient(90deg,#b8913f,#f0d9a0);margin:16px 0 0 auto}
.elementor-element-464d8c8 h2{font-size:30px!important}.elementor-element-464d8c8{margin-top:26px!important}
.elementor-element-a3067eb .elementor-icon-list-text{font-size:18px!important;line-height:1.6!important}}` };
const NV = {
  v1: `#dbl-nl{padding:54px 24px 52px!important}#dbl-nl .dn-in{max-width:1120px!important;display:grid!important;grid-template-columns:3px minmax(0,1fr) 280px;column-gap:52px;align-items:center}
#dbl-nl .dn-bar{grid-column:1;align-self:stretch}#dbl-nl .dn-main{grid-column:2;display:flex;flex-direction:column;gap:24px;max-width:600px}
#dbl-nl .dn-main .dn-tx,#dbl-nl .dn-main form{flex:none!important;width:100%}
#dbl-nl .dn-vid{grid-column:3}
#dbl-nl .dn-vid .fr{position:relative;width:250px;aspect-ratio:9/16;margin:0 auto;border-radius:28px;overflow:hidden;background:#000;box-shadow:0 0 0 1px rgba(231,205,150,.45),0 0 0 8px rgba(231,205,150,.08),0 30px 60px rgba(0,0,0,.55)}
#dbl-nl .dn-vid video{width:100%;height:100%;object-fit:cover;display:block}
#dbl-nl .dn-vid .snd{position:absolute;left:12px;bottom:12px;width:40px;height:40px;border-radius:50%;border:1px solid rgba(231,205,150,.6);background:rgba(20,20,20,.7);color:#e7cd96;display:flex;align-items:center;justify-content:center}
#dbl-nl .dn-vid .snd svg{width:18px;height:18px}
#dbl-nl .dn-vid small{display:block;text-align:center;color:#a9a59e;font-size:13px;margin-top:12px}`,
  v2: `#dbl-nl{padding:60px 24px 58px!important}#dbl-nl .dn-in{max-width:1120px!important;display:grid!important;grid-template-columns:minmax(0,1fr) 320px;column-gap:60px;align-items:center}
#dbl-nl .dn-bar{display:none!important}#dbl-nl .dn-main{grid-column:1;display:flex;flex-direction:column;gap:26px;padding:38px 40px;border:1px solid rgba(231,205,150,.25);border-radius:18px;background:linear-gradient(160deg,rgba(255,255,255,.045),rgba(255,255,255,.01))}
#dbl-nl .dn-main .dn-tx,#dbl-nl .dn-main form{flex:none!important;width:100%}
#dbl-nl .dn-main .dn-h{font-size:34px!important}
#dbl-nl .dn-vid{grid-column:2;position:relative}
#dbl-nl .dn-vid:before{content:"";position:absolute;inset:-50px;background:radial-gradient(circle,rgba(214,178,94,.2),rgba(214,178,94,0) 62%);z-index:0}
#dbl-nl .dn-vid .fr{position:relative;z-index:1;width:270px;aspect-ratio:9/16;margin:0 auto;border-radius:32px;overflow:hidden;background:#000;border:7px solid #1d1d1d;box-shadow:0 0 0 1px rgba(231,205,150,.5),0 34px 70px rgba(0,0,0,.6)}
#dbl-nl .dn-vid video{width:100%;height:100%;object-fit:cover;display:block}
#dbl-nl .dn-vid .snd{position:absolute;left:14px;bottom:14px;width:42px;height:42px;border-radius:50%;border:1px solid rgba(231,205,150,.6);background:rgba(20,20,20,.7);color:#e7cd96;display:flex;align-items:center;justify-content:center;z-index:2}
#dbl-nl .dn-vid .snd svg{width:18px;height:18px}`,
};
const SND = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M23 9l-6 6M17 9l6 6"/></svg>';
for (const [w, h] of [[1440, 900], [1920, 1080]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'he-IL' });
  await ctx.route(M + '*', (r) => { const f = 'mock/' + r.request().url().split('/__mock/')[1].split('?')[0]; r.fulfill({ status: 200, contentType: f.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', body: fs.readFileSync(f) }); });
  const p = await ctx.newPage(); await p.goto(S + '?o18=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: HIDE });
  await p.screenshot({ path: `${OUT}/hero-now-${w}.jpg`, type: 'jpeg', quality: 86 });
  for (const [k, css] of Object.entries(process.env.NLONLY ? {} : HA)) {
    await p.evaluate(({ css, k }) => {
      document.getElementById('dbl-h18')?.remove(); const st = document.createElement('style'); st.id = 'dbl-h18'; st.textContent = css; document.head.appendChild(st);
      document.querySelectorAll('.dbl-ln').forEach((e) => e.remove());
      const box = document.querySelector('.elementor-element-6bb6c07');
      const all = [...box.querySelectorAll('*')].filter((e) => e.children.length === 0 || e.childNodes.length === 1);
      const t2 = all.find((e) => e.textContent.trim() === 'עורך דין מקרקעין');
      document.querySelectorAll('.dbl-t2').forEach((e) => e.classList.remove('dbl-t2'));
      
    }, { css, k });
    await p.waitForTimeout(800); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(300);
    await p.screenshot({ path: `${OUT}/hero-${k}-${w}.jpg`, type: 'jpeg', quality: 86 });
    rep['edges-' + k + w] = await p.evaluate(() => ['6bb6c07', '464d8c8', 'a3067eb'].map((id) => { const e = document.querySelector('.elementor-element-' + id); const r = e.getBoundingClientRect(); return [id, Math.round(r.left), Math.round(r.right), Math.round(r.top), Math.round(r.bottom)]; }));
  }
  await p.evaluate(() => { document.getElementById('dbl-h18')?.remove(); document.querySelectorAll('.dbl-ln').forEach((e) => e.remove()); });
  {
  // newsletter strip
  await p.addStyleTag({ content: '[data-elementor-type="header"]{visibility:hidden!important}#dbl-cbar{display:none!important}' });
  const nl = p.locator('#dbl-nl'); await nl.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  await nl.screenshot({ path: `${OUT}/nl-now-${w}.jpg`, type: 'jpeg', quality: 84 });
  for (const [k, css] of Object.entries(NV)) {
    await p.evaluate(({ css, k, M, SND }) => {
      document.getElementById('dbl-n18')?.remove(); const st = document.createElement('style'); st.id = 'dbl-n18'; st.textContent = css; document.head.appendChild(st);
      const s = document.getElementById('dbl-nl'); const inn = s.querySelector('.dn-in');
      s.querySelector('.dn-vid')?.remove();
      const main = s.querySelector('.dn-main'); if (main) { while (main.firstChild) inn.insertBefore(main.firstChild, main); main.remove(); }
      { const m = document.createElement('div'); m.className = 'dn-main'; m.appendChild(s.querySelector('.dn-tx')); m.appendChild(s.querySelector('form')); inn.appendChild(m); }
      inn.insertAdjacentHTML('beforeend', `<div class="dn-vid"><div class="fr"><video src="${M}nl-video-540.mp4" poster="${M}nl-poster.jpg" muted autoplay loop playsinline></video><span class="snd">${SND}</span></div>${k === 'v1' ? '<small>ככה נראה הניוזלטר, 45 שניות</small>' : ''}</div>`);
      const v = s.querySelector('video'); v.currentTime = 3;
    }, { css, k, M, SND });
    await p.waitForTimeout(3500); await nl.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await nl.screenshot({ path: `${OUT}/nl-${k}-${w}.jpg`, type: 'jpeg', quality: 84 });
  }
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
