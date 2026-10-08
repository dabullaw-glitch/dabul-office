// Round 7 mockups (phone hero options, seals, about, footer, menu). Round 4 base: trust seal next to the hero photo (3 styles), 3 new "about" sketches, footer fixes + social networks, phone menu socials.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts7'; fs.mkdirSync(OUT, { recursive: true });
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

/* ---------- 1. phone buttons: shade 3 with a faint white frame around the WhatsApp half ---------- */
const BAR_FINAL = '#dbl-cbar{background:#070a14!important;border-color:rgba(231,205,150,.32)!important}#dbl-cbar .w{box-shadow:inset 0 0 0 1px rgba(255,255,255,.26)!important;margin-right:6px}';

/* ---------- 2. phone hero 2b: four photo treatments ---------- */
const CITY = 'https://dabullaw.co.il/wp-content/uploads/2026/10/netanya-city-night-mobile.webp';
const BUL = ['אני יקיר דבול, עורך דין המתמחה בנדל״ן, התחדשות עירונית וחדלות פירעון.', 'מעל 100 עסקאות מקרקעין מדי שנה. ניסיון מוכח שמעניק לכם שקט.', 'חבר ועדות הקניין, המקרקעין וההתחדשות העירונית בלשכת עורכי הדין.', 'אני והצוות שלי זמינים עבורכם 24/7 למקרי חירום.'];
const PH_CSS = `.dbl-ph{position:relative;direction:rtl;font-family:"Noto Local",sans-serif;color:#fff;overflow:hidden;background:#0a1226 url(${CITY}) center bottom/cover no-repeat;isolation:isolate;padding:26px 20px 30px}
.dbl-ph *{box-sizing:border-box;font-family:inherit}
.dbl-ph:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,13,30,.9) 0%,rgba(8,13,30,.72) 42%,rgba(8,13,30,.42) 100%)}
.dbl-ph .top{display:grid;grid-template-columns:minmax(0,1fr) 164px;gap:16px;align-items:center}
.dbl-ph h1{margin:0;line-height:1}.dbl-ph h1 b{display:block;font-size:41px;font-weight:800;letter-spacing:-.5px}.dbl-ph h1 span{display:block;font-size:23px;font-weight:300;margin-top:8px;white-space:nowrap;color:#f1efe9}
.dbl-ph .ln{width:46px;height:2px;background:linear-gradient(90deg,#f0d9a0,#b8913f);margin:15px 0 12px}
.dbl-ph .tg{color:#e7cd96;font-size:15.5px;font-weight:700;white-space:nowrap;letter-spacing:.2px}
.dbl-ph ul{list-style:none;margin:24px 0 0;padding:18px 16px;display:flex;flex-direction:column;gap:14px;border-radius:18px;background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid rgba(231,205,150,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 14px 30px rgba(0,0,0,.25)}
.dbl-ph li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.55;color:#f3f1ec}
.dbl-ph li i{flex:0 0 26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#f0d9a0,#c9a14f);color:#141008;display:flex;align-items:center;justify-content:center;margin-top:1px}.dbl-ph li i svg{width:15px;height:15px}
.dbl-ph .pic{position:relative;height:228px}
/* v1: the studio photo itself (dark grey studio background) inside the arch */
.v1 .pic{border-radius:999px 999px 18px 18px;overflow:hidden;box-shadow:0 0 0 1.5px #e7cd96,0 0 0 7px rgba(231,205,150,.1),0 20px 40px rgba(0,0,0,.55);background:#1b1b1d}
.v1 .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 0;transform:scale(1.7);transform-origin:50% 4%}
/* v2: the cut-out photo with the same night city behind it, inside the arch */
.v2 .pic{border-radius:999px 999px 18px 18px;overflow:hidden;box-shadow:0 0 0 1.5px #e7cd96,0 0 0 7px rgba(231,205,150,.1),0 20px 40px rgba(0,0,0,.55);background:#0c1430 url(${CITY}) 40% 85%/260% auto no-repeat}
.v2 .pic:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(8,13,30,.15),rgba(8,13,30,.55))}
.v2 .pic img{position:absolute;left:50%;top:10px;width:124%;transform:translateX(-50%);max-width:none}
/* v3: no box at all, the photo stands free with a thin gold arch line behind it */
.v3 .pic{overflow:visible}.v3 .pic:before{content:"";position:absolute;left:8px;right:8px;top:6px;bottom:0;border:1.5px solid rgba(231,205,150,.8);border-bottom:0;border-radius:999px 999px 0 0}
.v3 .pic:after{content:"";position:absolute;left:-10px;right:-10px;bottom:0;height:46px;background:linear-gradient(180deg,rgba(10,16,36,0),rgba(10,16,36,.95))}
.v3 .pic img{position:absolute;left:50%;bottom:0;height:100%;transform:translateX(-50%);filter:drop-shadow(0 0 20px rgba(0,0,0,.6))}
/* v4: a round portrait from the studio photo with a gold ring */
.v4 .top{grid-template-columns:minmax(0,1fr) 150px}.v4 .pic{height:150px;width:150px;border-radius:50%;overflow:hidden;box-shadow:0 0 0 2px #e7cd96,0 0 0 8px rgba(231,205,150,.12),0 18px 36px rgba(0,0,0,.5);background:#1b1b1d}
.v4 .pic img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 2%;transform:scale(1.55);transform-origin:50% 0}`;
const PH_IMG = { v1: M + 'studio-p2.webp', v2: M + 'cut-p1-hd.webp', v3: M + 'cut-p1-hd.webp', v4: M + 'studio-p2.webp' };
const PH = Object.fromEntries(['v1', 'v2', 'v3', 'v4'].map((k) => [k, `<div class="dbl-ph ${k}"><div class="top"><div><h1><b>יקיר דבול</b><span>עורך דין מקרקעין</span></h1><div class="ln"></div><div class="tg">מקצועיות. ניסיון. תוצאות</div></div><div class="pic"><img src="${PH_IMG[k]}" alt=""></div></div><ul>${BUL.map((t) => `<li><i>${IC.check}</i><span>${t}</span></li>`).join('')}</ul></div>`]));

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

/* ---------- 4. footer: three new designs, built from the same links ---------- */
const FT_CSS = `.dbl-ft{direction:rtl;font-family:"Noto Local",sans-serif}.dbl-ft *{box-sizing:border-box;font-family:inherit}.dbl-ft a{text-decoration:none;color:inherit}
.dbl-ft .in{max-width:1300px;margin:0 auto}.dbl-ft ul{list-style:none;margin:0;padding:0}.dbl-ft .soc{display:flex;gap:10px;align-items:center;flex-wrap:wrap}.dbl-ft .soc a{width:42px;height:42px;border-radius:50%;display:flex;align-items:center;justify-content:center}.dbl-ft .soc svg{width:19px;height:19px}
.dbl-ft .cols{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:32px}.dbl-ft .col li.sub{font-weight:700;font-size:17px;padding:18px 0 8px}.A .col li.sub{color:#141414}.B .col li.sub,.C .col li.sub{color:#e7cd96}.dbl-ft .col h4{margin:0 0 14px;font-size:17px;font-weight:700}.dbl-ft .col li{padding:5px 0;font-size:15px;line-height:1.45}
.dbl-ft details summary{list-style:none;cursor:pointer}.dbl-ft details summary::-webkit-details-marker{display:none}.dbl-ft details summary svg{display:none}
.dbl-ft .ct li{display:flex;gap:10px;align-items:center;padding:6px 0;font-size:15.5px}.dbl-ft .ct i{flex:0 0 34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center}.dbl-ft .ct i svg{width:16px;height:16px}
.dbl-ft .wa{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:10px 18px;font-weight:700;font-size:15px;background:#25d366;color:#fff!important}.dbl-ft .wa svg{width:18px;height:18px}
.dbl-ft .bot{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;font-size:14px}.dbl-ft .bot .lg{display:flex;gap:14px;flex-wrap:wrap}
.dbl-ft .mart{height:64px;width:auto}
/* A: light */
.dbl-ft.A{background:#f8f8fd;color:#141414;border-top:3px solid #d6b25e}.A .top{display:flex;justify-content:space-between;align-items:center;gap:20px;padding:40px 0 30px;border-bottom:1px solid #e3e1da}.A .logo{height:62px}
.A .soc small{color:#6b6b6b;font-size:14px;margin-left:6px}.A .soc a{border:1px solid #d6b25e;color:#a88a4c;background:#fff}
.A .mid{display:grid;grid-template-columns:minmax(0,3.4fr) minmax(0,1.3fr);gap:44px;padding:40px 0}.A .col h4{color:#141414}.A .col h4:after{content:"";display:block;width:26px;height:2px;background:#d6b25e;margin-top:10px}.A .col li a{color:#54595f}
.A .cols{grid-template-columns:repeat(4,minmax(0,1fr))}.A .ct i{background:#fff;border:1px solid #e3d3a8;color:#a88a4c}.A .side{display:flex;flex-direction:column;gap:16px}.A .map{border-radius:12px;overflow:hidden;height:170px;border:1px solid #e3e1da}.A .map iframe{width:100%;height:100%;border:0}
.A .bot{background:#141414;color:#bdbab3;padding:16px 30px;margin:0 -30px}.A .bot a{color:#e7cd96}
/* B: centered black */
.dbl-ft.B{background:#0d0d0f;color:#e9e6df}.B .top{text-align:center;padding:52px 0 30px}.B .logo{height:66px}.B .soc{justify-content:center;margin-top:22px}.B .soc a{border:1px solid rgba(231,205,150,.5);color:#e7cd96}
.B .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:6px 0 40px}.B .card{display:flex;gap:14px;align-items:center;padding:18px 20px;border-radius:14px;background:#17171a;border:1px solid rgba(231,205,150,.18)}.B .card i{flex:0 0 44px;height:44px;border-radius:12px;background:rgba(231,205,150,.1);color:#e7cd96;display:flex;align-items:center;justify-content:center}.B .card i svg{width:21px;height:21px}.B .card b{display:block;font-size:16px;color:#fff}.B .card span{font-size:14px;color:#a9a6a0}
.B .cols{padding:34px 0;border-top:1px solid rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.08)}.B .col h4{color:#e7cd96}.B .col li a{color:#bdbab3}
.B .mid2{display:flex;justify-content:center;align-items:center;gap:22px;padding:26px 0;flex-wrap:wrap}.B .bot{justify-content:center;flex-direction:column;text-align:center;padding:0 0 26px;color:#8f8c86}.B .bot a{color:#cfccc6}
/* C: map split */
.dbl-ft.C{background:linear-gradient(180deg,#0f1833,#0b0f1d);color:#e9e6df}.C .split{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.1fr);border-radius:20px;overflow:hidden;border:1px solid rgba(231,205,150,.25);margin-bottom:34px;background:#121a33;box-shadow:0 20px 50px rgba(0,0,0,.35)}
.C .info{padding:30px 32px}.C .info h3{margin:0 0 4px;font-size:26px;color:#fff}.C .info p{margin:0 0 18px;color:#a9a6a0;font-size:15px}.C .ct i{background:rgba(231,205,150,.12);color:#e7cd96}.C .ct li{color:#e9e6df}
.C .btns{display:flex;gap:10px;margin-top:18px;flex-wrap:wrap}.C .call{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:10px 18px;font-weight:800;background:linear-gradient(135deg,#f0d9a0,#c9a14f);color:#141008!important}.C .call svg{width:18px;height:18px}
.C .map{min-height:320px}.C .map iframe{width:100%;height:100%;border:0;filter:grayscale(.3)}
.C .top{display:flex;justify-content:space-between;align-items:center;padding:0 0 28px}.C .logo{height:58px}.C .soc a{border:1px solid rgba(231,205,150,.45);color:#e7cd96}
.C .cols{padding:32px 0;border-top:1px solid rgba(231,205,150,.15)}.C .col h4{color:#e7cd96}.C .col li a{color:#bdbab3}.C .bot{border-top:1px solid rgba(231,205,150,.15);padding:16px 0 20px;color:#8f8c86}.C .bot a{color:#cfccc6}
@media (max-width:767px){.dbl-ft{padding:0 20px}.A .top,.C .top{flex-direction:column;gap:16px}.A .mid{grid-template-columns:1fr;gap:26px}.A .cols{grid-template-columns:1fr 1fr;gap:24px 16px}.A .bot{margin:0 -20px;padding:16px 20px;flex-direction:column;text-align:center}
.B .cards{grid-template-columns:1fr}.dbl-ft.B .cols,.dbl-ft.C .cols{display:block;padding:10px 0}.B .col,.C .col{border-bottom:1px solid rgba(255,255,255,.08)}
.B .col h4,.C .col h4{margin:0;padding:14px 0;display:flex;justify-content:space-between;align-items:center}.dbl-ft details summary svg{display:block;width:18px;height:18px;color:#e7cd96}.dbl-ft details[open] summary svg{transform:rotate(180deg)}.B .col ul,.C .col ul{padding-bottom:12px}
.C .split{grid-template-columns:1fr}.C .map{min-height:200px;order:2}.C .bot{flex-direction:column;text-align:center}}`;

/* ---------- run ---------- */
const b = await chromium.launch();
const prep = async (ctx) => { await ctx.route(M + '*', (r) => { const f = 'mock/' + r.request().url().split('/__mock/')[1]; r.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(fs.existsSync(f) ? f : f.replace('-hd.webp', '.webp')) }); }); };
const quiet = '.elementor-popup-modal,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.elementor-element-844bd60,.dabul-gbadge{display:none!important}';
for (const mode of ['phone', 'desktop']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  await prep(ctx);
  const p = await ctx.newPage(); await p.goto(S + '?o7=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.addStyleTag({ content: quiet });
  // live check of the approved fixes: darker gold titles, underline, the reviews widget after a scroll
  for (let y = 0; y < 12000; y += 600) { await p.mouse.wheel(0, 600); await p.waitForTimeout(140); }
  await p.waitForTimeout(2500);
  rep['live-' + mode] = await p.evaluate(() => ({ gold: getComputedStyle(document.querySelector('.elementor-element-c835999 .elementor-icon-box-title a, .elementor-element-c835999 .elementor-icon-box-title')).color, under: (() => { const a = document.querySelector('.elementor-widget-text-editor p a'); return a && getComputedStyle(a).textDecorationLine; })(), tiScript: !!document.querySelector('script[src*="trustindex.io/loader"]'), tiLater: document.querySelectorAll('script[type="text/dbl-later"]').length, tiWidget: document.querySelectorAll('[class*="ti-widget"], .ti-reviews-container, .ti-review-item').length }));
  const rv = await p.evaluate(() => { const h = [...document.querySelectorAll('h2')].find((e) => /לקוחות ממליצים/.test(e.textContent)); if (!h) return false; const c = h.closest('.e-con.e-parent') || h.parentElement; c.id = 'dbl-rev'; return true; });
  if (rv) { const el = p.locator('#dbl-rev'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500); await el.screenshot({ path: `${OUT}/live-reviews-${mode}.jpg`, type: 'jpeg', quality: 72 }); }
  if (mode === 'phone') {
    // 1. buttons
    await p.addStyleTag({ content: BAR_FINAL });
    for (const [n, y] of [['home', 1350]]) { await p.evaluate((y) => scrollTo(0, y), y); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/bar-${n}.jpg`, type: 'jpeg', quality: 86 }); }
    await p.goto('https://dabullaw.co.il/?p=4308', { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await p.addStyleTag({ content: quiet + BAR_FINAL });
    await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(700); await p.screenshot({ path: `${OUT}/bar-art.jpg`, type: 'jpeg', quality: 86 });
    await p.goto(S + '?o7b=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500); await p.addStyleTag({ content: quiet });
    // 2. hero photo treatments
    await p.addStyleTag({ content: PH_CSS });
    for (const k of ['v1', 'v2', 'v3', 'v4']) {
      await p.evaluate((html) => { const hero = document.querySelector('.elementor-element-9056c3a'); document.getElementById('dbl-ph-wrap')?.remove(); hero.style.display = 'none'; hero.insertAdjacentHTML('afterend', '<div id="dbl-ph-wrap">' + html + '</div>'); }, PH[k]);
      await p.waitForTimeout(1300); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/hero-${k}.jpg`, type: 'jpeg', quality: 84 });
    }
    await p.evaluate(() => { document.getElementById('dbl-ph-wrap')?.remove(); document.querySelector('.elementor-element-9056c3a').style.display = ''; });
  }
  await p.addStyleTag({ content: '[data-elementor-type="header"]{visibility:hidden!important}#dbl-cbar{display:none!important}' });
  // 3. about
  await p.evaluate(() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } c.id = 'dbl-old-about'; });
  { const o = p.locator('#dbl-old-about'); await o.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); await o.screenshot({ path: `${OUT}/about-${mode}-now.jpg`, type: 'jpeg', quality: 78 }); }
  for (const k of ['h1', 'h2']) {
    await p.evaluate((h) => { document.getElementById('dbl-new-about')?.remove(); const o = document.getElementById('dbl-old-about'); o.style.display = 'none'; o.insertAdjacentHTML('afterend', '<div id="dbl-new-about">' + h + '</div>'); }, `<style>${AB_CSS}</style>${AB_HTML(k)}`);
    await p.waitForTimeout(1500); const n = p.locator('#dbl-new-about'); await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await n.screenshot({ path: `${OUT}/about-${mode}-${k}.jpg`, type: 'jpeg', quality: 82 });
    rep[`about-${k}-${mode}`] = await p.evaluate(() => Math.round(document.getElementById('dbl-new-about').getBoundingClientRect().height));
  }
  // 4. footers: collect the links from the live footer, then draw three designs
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2500);
  const data = await p.evaluate(() => {
    const W = (id) => document.querySelector('[data-elementor-type="footer"] .elementor-element-' + id);
    const items = (id, drop) => [...(W(id)?.querySelectorAll('li') || [])].map((li) => [li.innerText.trim(), (li.querySelector('a') || {}).href || '#']).filter(([t]) => t && !(drop && drop.test(t)));
    const seen = new Set(); const legal = items('56f4633').filter(([t]) => { if (seen.has(t)) return false; seen.add(t); return true; });
    const lang = [...(W('886145f')?.querySelectorAll('a') || [])].map((a) => [a.innerText.trim(), a.href]).filter(([t]) => t && !/עורך דין/.test(t));
    return { logo: W('35de91f')?.querySelector('img')?.src, mart: W('5d367c3')?.querySelector('img')?.src, map: W('832a7d8')?.querySelector('iframe')?.src,
      cols: [['המשרד', items('023fe63', /צרו קשר/)], ['קונים דירה', items('e3a6a41', /נאמנות|מושכרת|חריגות|להריסה|קטין/).concat(items('cf26f1d', /מדד תשומות/))], ['מוכרים דירה', items('270273d')], ['מיסוי מקרקעין', items('5f04f5a', /לנכים|לעולים|מציאת סכום/)], ['התחדשות עירונית', items('796bc41')]],
      dark: document.querySelector('[data-elementor-type="header"] img')?.src,
      contact: items('bced874'), hours: (W('a58e6fa')?.innerText || '').trim().split('\n').filter(Boolean), legal, lang, copy: (W('555996b')?.innerText || '').trim(), group: (document.querySelector('[data-elementor-type="footer"] a[href*="chat.whatsapp.com"]') || {}).href || '#' };
  });
  rep['footer-data'] = { cols: data.cols.map(([t, l]) => [t, l.length]), contact: data.contact.length, hours: data.hours, logo: !!data.logo, map: !!data.map };
  const soc = '<div class="soc"><small>עקבו אחרינו</small>' + SOC_LIST.slice(0, 3).map(([k, t]) => `<a href="#" aria-label="${t}">${SOC[k]}</a>`).join('') + '</div>';
  { const ur = data.cols.pop(); data.cols[3][1] = data.cols[3][1].concat([['__h', ur[0]]]).concat(ur[1]); }
  const li = ([x, h]) => x === '__h' ? `<li class="sub">${h}</li>` : `<li><a href="${h}">${x}</a></li>`;
  const cols = (acc) => `<div class="cols">${data.cols.map(([t, l]) => acc ? `<details class="col" ${mode === 'desktop' ? 'open' : ''}><summary><h4>${t}${CHEV}</h4></summary><ul>${l.map(li).join('')}</ul></details>` : `<div class="col"><h4>${t}</h4><ul>${l.map(li).join('')}</ul></div>`).join('')}</div>`;
  const ctIcons = [PIN, PHONE_SVG, MAIL, SOC.fb];
  const ct = `<ul class="ct">${data.contact.map(([x, h], i) => `<li><i>${ctIcons[i] || PIN}</i><a href="${h}">${x}</a></li>`).join('')}</ul>`;
  const hours = data.hours.join(' · ');
  const bot = `<div class="bot"><span>${data.copy}</span><span class="lg">${data.legal.map(([x, h]) => `<a href="${h}">${x}</a>`).join('')}${data.lang.map(([x, h]) => `<a href="${h}">${x}</a>`).join('')}</span></div>`;
  const wa = `<a class="wa" href="${data.group}">${SOC.wa}הצטרפו לקבוצת הוואטסאפ</a>`;
  const F = {
    A: `<footer class="dbl-ft A" style="padding:0 30px"><div class="in"><div class="top"><img class="logo" src="${data.dark || data.logo}" alt="">${soc}</div><div class="mid">${cols(false).replace('class="cols"', 'class="cols"')}<div class="side"><h4 style="margin:0;font-size:17px">יצירת קשר</h4>${ct}<div style="color:#54595f;font-size:14.5px">${CLOCK.replace('<svg', '<svg style="width:15px;height:15px;vertical-align:-2px;margin-left:6px;color:#a88a4c"')}${hours}</div>${wa}<div class="map"><iframe src="${data.map}" loading="lazy"></iframe></div><img class="mart" src="${data.mart}" alt=""></div></div></div>${bot}</footer>`.replace(data.cols.map(() => '').join(''), ''),
    B: `<footer class="dbl-ft B" style="padding:0 30px"><div class="in"><div class="top"><img class="logo" src="${data.logo}" alt="">${soc}</div><div class="cards"><div class="card"><i>${PIN}</i><div><b>${(data.contact[0] || [''])[0]}</b><span>ניווט בוויז ובגוגל מפות</span></div></div><div class="card"><i>${PHONE_SVG}</i><div><b>${(data.contact[1] || [''])[0]}</b><span>${hours}</span></div></div><div class="card"><i>${MAIL}</i><div><b>${(data.contact[2] || [''])[0]}</b><span>נחזור אליכם בהקדם</span></div></div></div>${cols(true)}<div class="mid2">${wa}<img class="mart" src="${data.mart}" alt=""></div>${bot}</div></footer>`,
    C: `<footer class="dbl-ft C" style="padding:46px 30px 0"><div class="in"><div class="split"><div class="info"><h3>בואו נדבר</h3><p>המשרד ברחוב רזיאל 1 בנתניה. אפשר להגיע, להתקשר או לכתוב.</p>${ct}<div style="color:#a9a6a0;font-size:14.5px;margin-top:8px">${hours}</div><div class="btns"><a class="call" href="#">${PHONE_SVG}התקשרו</a>${wa}</div></div><div class="map"><iframe src="${data.map}" loading="lazy"></iframe></div></div><div class="top"><img class="logo" src="${data.logo}" alt="">${soc}</div>${cols(true)}<div style="display:flex;justify-content:center;padding:20px 0"><img class="mart" src="${data.mart}" alt=""></div>${bot}</div></footer>`,
  };
  await p.addStyleTag({ content: FT_CSS });
  await p.evaluate(() => { const f = document.querySelector('[data-elementor-type="footer"]'); f.id = 'dbl-old-foot'; });
  { const o = p.locator('#dbl-old-foot'); await o.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await o.screenshot({ path: `${OUT}/footer-${mode}-now.jpg`, type: 'jpeg', quality: 76 }); }
  for (const k of ['A', 'B', 'C']) {
    await p.evaluate((h) => { document.getElementById('dbl-ft-wrap')?.remove(); const o = document.getElementById('dbl-old-foot'); o.style.display = 'none'; o.insertAdjacentHTML('afterend', '<div id="dbl-ft-wrap">' + h + '</div>'); }, F[k]);
    await p.waitForTimeout(2500); const n = p.locator('#dbl-ft-wrap'); await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
    await n.screenshot({ path: `${OUT}/footer-${mode}-${k}.jpg`, type: 'jpeg', quality: 80 });
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
