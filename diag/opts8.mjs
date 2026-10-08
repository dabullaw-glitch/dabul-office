// Round 8 mockups (phone hero options, seals, about, footer, menu). Round 4 base: trust seal next to the hero photo (3 styles), 3 new "about" sketches, footer fixes + social networks, phone menu socials.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts8'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/';
const M = S + '__mock/';
const rep = {};
const SOC = {
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  yt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22 8.2c-.2-1.6-1-2.6-2.6-2.8C17 5 12 5 12 5s-5 0-7.4.4C3 5.6 2.2 6.6 2 8.2 1.8 9.4 1.8 12 1.8 12s0 2.6.2 3.8c.2 1.6 1 2.6 2.6 2.8C7 19 12 19 12 19s5 0 7.4-.4c1.6-.2 2.4-1.2 2.6-2.8.2-1.2.2-3.8.2-3.8s0-2.6-.2-3.8zM10 15V9l5.2 3L10 15z"/></svg>',
  tt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3c.3 2.2 1.6 3.6 3.9 3.8v3.1c-1.4.1-2.6-.3-3.9-1.1v5.9c0 7.4-8.1 9.7-11.3 4.4-2.1-3.4-.8-9.4 5.9-9.6v3.3c-.5.1-1 .2-1.5.4-1.5.5-2.3 1.4-2.1 3 .5 3.1 6.2 4 5.7-2V3h3.3z"/></svg>',
  li: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9.5h4V21H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6V21h-4v-5.1c0-1.2 0-2.8-1.7-2.8s-2 1.3-2 2.7V21h-4z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.8 3h3.1l-6.8 7.8 8 10.2h-6.3l-4.9-6.4L5.3 21H2.2l7.3-8.4L1.8 3h6.4l4.4 5.9L17.8 3zm-1.1 16.2h1.7L7.4 4.7H5.6l11.1 14.5z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg>',
};
const SOC_LIST = [['fb', 'פייסבוק'], ['ig', 'אינסטגרם'], ['yt', 'יוטיוב'], ['tt', 'טיקטוק'], ['li', 'לינקדאין'], ['x', 'X']];
const IC = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
  city: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M5 21V8l6-3v16M11 21V3l8 4v14"/><path d="M14 10h2M14 14h2M7 12h2M7 16h2"/></svg>',
  tax: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
};
const INTRO = 'אני יקיר דבול, <a href="#">עורך דין מקרקעין בנתניה</a>. אני מלווה לקוחות בעסקאות מקרקעין ונדל״ן, בפרויקטים של התחדשות עירונית ופינוי בינוי ובהליכי חדלות פירעון. מדי שנה אני מלווה מעל 100 עסקאות, עם ליווי אישי מהבדיקות הראשונות ועד הרישום בטאבו.';
const MEDIA = ['ערוץ 13', 'ישראל היום', 'וואלה נדל״ן', 'ביזפורטל'];
const VID = '2ZJ664F6458';

const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
const MAIL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>';
const CLOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
const NAV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-8-8 18-2-8z"/></svg>';
const CHEV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

/* ---------- 3. about: built from the site's own pieces (light background, centered title with the gold line) ---------- */
const AB_INTRO = 'יקיר דבול, <a href="#">עורך דין מקרקעין בנתניה</a>, מספק ליווי אישי ומקצועי במגוון תחומים משפטיים: עסקאות מקרקעין ונדל״ן, ייצוג חייבים בחדלות פירעון ושיקום כלכלי, ופרויקטים של התחדשות עירונית ופינוי בינוי. מדי שנה אני מלווה מעל 100 עסקאות מקרקעין ומאות לקוחות, עם שירות מותאם אישית.';
const AB_ADV = 'אני משלב ניסיון משפטי עם הבנה עסקית, ומציע ללקוחות פתרונות מותאמים, ברמת העסקה וברמת הפרויקט כולו. לצד הייעוץ המשפטי אני בוחן את הצד העסקי של המצב, מעריך סיכונים ומציע דרך פעולה מבחינה משפטית וכלכלית.';
const AB_ROWS = [['עובדים יחד עם אנשי המקצוע', 'שמאי מקרקעין, מהנדסי בניין, אדריכלים ויועצי משכנתאות, כדי להעניק לכם שירות מקיף ומקצועי.'], ['ליווי מלא מההתחלה ועד הסוף', 'אני לא רק מייעץ. אני מלווה אתכם לאורך כל הדרך, עם הקפדה על כל פרט וניתוח משפטי וכלכלי.'], ['החזון של המשרד', 'עתיד כלכלי יציב וביטחון בנכסים, ב"ארבעה קירות" וגם בתוכניות השקעה ומימוש נכסים.']];
const AB_IC = [IC.shield, IC.home, IC.city];
const AB_CSS = `.dbl-ab{direction:rtl;font-family:"Noto Local",sans-serif;background:#f8f8fd;padding:84px 30px 90px;color:#141414}.dbl-ab *{box-sizing:border-box;font-family:inherit}
.dbl-ab .hd{text-align:center;margin-bottom:54px}.dbl-ab h2{font-size:46px;font-weight:400;margin:0;line-height:1.15}
.dbl-ab .dv{position:relative;width:200px;height:1px;background:#a8a8a8;margin:24px auto 0}.dbl-ab .dv:after{content:"";position:absolute;left:50%;top:-1px;width:44px;height:3px;margin-left:-22px;background:#d6b25e}
.dbl-ab .w{max-width:1240px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 470px;gap:64px;align-items:start}
.dbl-ab p{font-size:18px;line-height:1.85;color:#54595f;margin:0 0 18px}.dbl-ab p a{color:#a88a4c;text-decoration:underline;text-decoration-color:#d6b25e;text-underline-offset:4px}
.dbl-ab h3{font-size:24px;font-weight:700;margin:26px 0 10px;color:#141414}
.dbl-ab .rows{display:grid;gap:14px;margin:28px 0 30px}
.dbl-ab .row{display:flex;gap:16px;align-items:flex-start;background:#fff;border-radius:10px;padding:20px 22px;box-shadow:0 6px 22px rgba(20,20,40,.06)}
.dbl-ab .row i{flex:0 0 46px;height:46px;border-radius:50%;background:#d6b25e;color:#fff;display:flex;align-items:center;justify-content:center}.dbl-ab .row i svg{width:22px;height:22px}
.dbl-ab .row b{display:block;font-size:19px;font-weight:700;margin-bottom:4px}.dbl-ab .row span{font-size:15.5px;line-height:1.7;color:#54595f}
.dbl-ab .btn{display:inline-flex;align-items:center;gap:8px;background:#e7cd96;color:#141414;border-radius:6px;padding:12px 26px;font-size:16px;font-weight:600;text-decoration:none}
.dbl-ab .ph{position:relative;border-radius:14px;overflow:hidden;background:#1b1b1d;aspect-ratio:4/5.2;box-shadow:0 24px 50px rgba(20,20,40,.18)}
.dbl-ab .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 10%}
.dbl-ab .ph .cap{position:absolute;left:0;right:0;bottom:0;padding:70px 26px 24px;background:linear-gradient(180deg,rgba(20,20,22,0),rgba(20,20,22,.92));color:#fff}
.dbl-ab .ph .cap q{display:block;font-size:26px;font-weight:600;line-height:1.35;quotes:none;color:#e7cd96}.dbl-ab .ph .cap small{display:block;font-size:15px;margin-top:8px;color:#d9d6cf}
.dbl-ab .stats{display:grid;grid-template-columns:repeat(3,1fr);margin-top:16px;background:#141414;border-radius:12px;overflow:hidden}
.dbl-ab .stats div{padding:16px 8px;text-align:center;color:#fff}.dbl-ab .stats div+div{border-right:1px solid rgba(255,255,255,.12)}.dbl-ab .stats b{display:block;font-size:26px;font-weight:800;color:#d6b25e;direction:ltr}.dbl-ab .stats span{font-size:13px;color:#cfccc6}
/* H2: right aligned title, like the current section */
.dbl-ab.h2 .hd{text-align:right;max-width:1240px;margin:0 auto 46px}.dbl-ab.h2 .dv{margin:22px 0 0;width:120px;background:#d6b25e;height:2px}.dbl-ab.h2 .dv:after{display:none}
.dbl-ab.h2 .rows{grid-template-columns:repeat(3,1fr)}.dbl-ab.h2 .row{flex-direction:column;background:#141414;color:#fff;box-shadow:none}.dbl-ab.h2 .row b{color:#fff}.dbl-ab.h2 .row i{width:46px}.dbl-ab.h2 .row span{color:#cfccc6}
@media (max-width:767px){.dbl-ab{padding:54px 20px 60px}.dbl-ab h2{font-size:32px}.dbl-ab .hd{margin-bottom:30px}.dbl-ab .w{grid-template-columns:1fr;gap:30px}.dbl-ab .ph{order:-1;aspect-ratio:4/4.6}.dbl-ab .ph .cap q{font-size:21px}
.dbl-ab p{font-size:16.5px}.dbl-ab h3{font-size:21px}.dbl-ab .row{padding:16px}.dbl-ab.h2 .rows{grid-template-columns:1fr}.dbl-ab .btn{width:100%;justify-content:center}.dbl-ab .stats b{font-size:22px}}`;
const AB_HTML = (k) => `<section class="dbl-ab ${k}"><div class="hd"><h2>הכירו את יקיר דבול</h2><div class="dv"></div></div><div class="w"><div class="tx"><p>${AB_INTRO}</p><h3>היתרון שלנו</h3><p>${AB_ADV}</p>
${k === 'h1' ? `<div class="rows">${AB_ROWS.map(([b, s], i) => `<div class="row"><i>${AB_IC[i]}</i><div><b>${b}</b><span>${s}</span></div></div>`).join('')}</div>` : ''}
<a class="btn" href="#">← קראו עליי עוד</a></div>
<div><div class="ph"><img src="${M}studio-p3.webp" alt=""><div class="cap"><q>הדרך שלנו, ההצלחה שלכם.</q><small>עו״ד יקיר דבול, עורך דין מקרקעין</small></div></div><div class="stats"><div><b>+100</b><span>עסקאות בכל שנה</span></div><div><b>4.9★</b><span>73 ביקורות בגוגל</span></div><div><b>3</b><span>ועדות בלשכה</span></div></div></div></div>
${k === 'h2' ? `<div class="w" style="display:block;margin-top:34px"><div class="rows">${AB_ROWS.map(([b, s], i) => `<div class="row"><i>${AB_IC[i]}</i><div><b>${b}</b><span>${s}</span></div></div>`).join('')}</div></div>` : ''}</section>`;


const UP_CSS = `
.dbl-ab{background:radial-gradient(90% 70% at 85% 10%,#ffffff 0,#f6f6fb 60%,#f1f1f7 100%)!important}
.dbl-ab .w{grid-template-columns:minmax(0,1fr) 480px!important;gap:76px!important;align-items:center!important}
.dbl-ab .lead{font-size:21px!important;line-height:1.7!important;color:#141414!important;font-weight:500}
.dbl-ab .lead a{color:#141414!important;font-weight:700}
.dbl-ab h3{display:flex;align-items:center;gap:12px}.dbl-ab h3:before{content:"";width:28px;height:2px;background:#d6b25e}
.dbl-ab .row{position:relative;border:1px solid #ece7da;box-shadow:0 10px 28px rgba(20,20,40,.06)!important;transition:transform .2s,box-shadow .2s;overflow:hidden}
.dbl-ab .row:before{content:"";position:absolute;right:0;top:0;bottom:0;width:3px;background:linear-gradient(180deg,#f0d9a0,#c9a14f)}
.dbl-ab .row:hover{transform:translateY(-3px);box-shadow:0 16px 34px rgba(20,20,40,.1)!important}
.dbl-ab .row i{background:linear-gradient(135deg,#f0d9a0,#c49a4a)!important;color:#141008!important;box-shadow:0 6px 16px rgba(201,161,79,.35)}
.dbl-ab .row b{font-size:19px}
.dbl-ab .phw{position:relative;padding:0 0 0 18px}
.dbl-ab .phw:before{content:"";position:absolute;left:0;top:26px;right:26px;bottom:-18px;border:1.5px solid #d6b25e;border-radius:18px;z-index:0}
.dbl-ab .ph{z-index:1;border-radius:16px!important;aspect-ratio:4/5!important}
.dbl-ab .ph:after{content:"";position:absolute;inset:10px;border:1px solid rgba(231,205,150,.35);border-radius:10px;pointer-events:none}
.dbl-ab .ph .cap{padding:90px 28px 26px!important}
.dbl-ab .ph .cap q{font-size:28px!important}
.dbl-ab.u1 .ph .stats{position:absolute;left:18px;right:18px;bottom:96px;margin:0;background:rgba(14,14,16,.72);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);border:1px solid rgba(231,205,150,.35)}
.dbl-ab.u1 .ph .cap{padding-top:40px!important}
.dbl-ab .btn{padding:14px 30px!important;font-size:16.5px!important;box-shadow:0 8px 20px rgba(201,161,79,.3)}
@media (max-width:767px){.dbl-ab{padding:0 0 56px!important}.dbl-ab .sec{display:flex;flex-direction:column}.dbl-ab .w{display:contents!important}
.dbl-ab .phw{order:1;padding:0;margin:0}.dbl-ab .phw:before{display:none}.dbl-ab .hd{order:2;padding:30px 20px 0;margin-bottom:22px!important}.dbl-ab .tx{order:3;padding:0 20px}
.dbl-ab .ph{border-radius:0 0 26px 26px!important;aspect-ratio:auto!important;height:470px}.dbl-ab .ph img{object-position:50% 6%!important}.dbl-ab .ph:after{display:none}
.dbl-ab.u1 .ph .stats{bottom:92px;left:14px;right:14px}.dbl-ab.u2 .stats{margin:14px 20px 0!important}
.dbl-ab .lead{font-size:18px!important}}`;
const UP_HTML = (k) => `<section class="dbl-ab h1 ${k}"><div class="sec"><div class="hd"><h2>הכירו את יקיר דבול</h2><div class="dv"></div></div><div class="w"><div class="tx"><p class="lead">${AB_INTRO}</p><h3>היתרון שלנו</h3><p>${AB_ADV}</p>
<div class="rows">${AB_ROWS.map(([b, s], i) => `<div class="row"><i>${AB_IC[i]}</i><div><b>${b}</b><span>${s}</span></div></div>`).join('')}</div>
<a class="btn" href="#">← קראו עליי עוד</a></div>
<div class="phw"><div class="ph"><img src="${M}studio-p3.webp" alt="">${k === 'u1' ? '<div class="stats"><div><b>+100</b><span>עסקאות בכל שנה</span></div><div><b>4.9★</b><span>73 ביקורות בגוגל</span></div><div><b>3</b><span>ועדות בלשכה</span></div></div>' : ''}<div class="cap"><q>הדרך שלנו, ההצלחה שלכם.</q><small>עו״ד יקיר דבול, עורך דין מקרקעין</small></div></div>${k === 'u2' ? '<div class="stats"><div><b>+100</b><span>עסקאות בכל שנה</span></div><div><b>4.9★</b><span>73 ביקורות בגוגל</span></div><div><b>3</b><span>ועדות בלשכה</span></div></div>' : ''}</div></div></div></section>`;

const b = await chromium.launch();
const prep = async (ctx) => { await ctx.route(M + '*', (r) => { const f = 'mock/' + r.request().url().split('/__mock/')[1]; r.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(fs.existsSync(f) ? f : f.replace('-hd.webp', '.webp')) }); }); };
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  await prep(ctx);
  const p = await ctx.newPage(); await p.goto(S + '?o8=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: '.elementor-popup-modal,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.elementor-element-844bd60,.dabul-gbadge,#dbl-cbar{display:none!important}[data-elementor-type="header"]{visibility:hidden!important}' });
  for (let y = 0; y < 6000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(120); }
  await p.evaluate(() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } c.id = 'dbl-old-about'; });
  for (const k of ['u1', 'u2']) {
    await p.evaluate((h) => { document.getElementById('dbl-new-about')?.remove(); const o = document.getElementById('dbl-old-about'); o.style.display = 'none'; o.insertAdjacentHTML('afterend', '<div id="dbl-new-about">' + h + '</div>'); }, `<style>${AB_CSS}${UP_CSS}</style>${UP_HTML(k)}`);
    await p.waitForTimeout(1500); const n = p.locator('#dbl-new-about'); await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await n.screenshot({ path: `${OUT}/about-${mode}-${k}.jpg`, type: 'jpeg', quality: 82 });
    rep[`about-${k}-${mode}`] = await p.evaluate(() => Math.round(document.getElementById('dbl-new-about').getBoundingClientRect().height));
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
