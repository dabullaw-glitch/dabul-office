// Mockups, round 2: home hero with the new studio photo, 3 directions for "הכירו את יקיר דבול", 3 directions for the footer.
// Everything is injected into the live page only for the screenshot.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/';
const M = S + '__mock/';
const rep = {};

const IC = {
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.2 4.2L19 7"/></svg>',
  tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
  waze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 15a7 7 0 1 1 14-1c0 2.5-1.5 4-4 5H9c-1 0-2 .6-2.5 1.3"/><circle cx="9.5" cy="11" r=".9" fill="currentColor"/><circle cx="14.5" cy="11" r=".9" fill="currentColor"/><path d="M10 14c1 .8 3 .8 4 0"/><circle cx="8" cy="20" r="1.6"/><circle cx="16" cy="20" r="1.6"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="#f4b400"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z"/></svg>',
};

/* ---------------- about: shared copy ---------------- */
const INTRO = 'אני יקיר דבול, <a href="#">עורך דין מקרקעין בנתניה</a>. אני מלווה לקוחות בעסקאות מקרקעין ונדל״ן, בפרויקטים של התחדשות עירונית ופינוי בינוי ובהליכי חדלות פירעון. מדי שנה אני מלווה מעל 100 עסקאות, עם ליווי אישי מהבדיקות הראשונות ועד הרישום בטאבו.';
const POINTS = ['מעל 100 עסקאות מקרקעין בכל שנה', 'חבר ועדות הקניין, המקרקעין וההתחדשות העירונית בלשכת עורכי הדין', 'עבודה משותפת עם שמאים, מהנדסים ויועצי משכנתאות'];
const BASE = `.dbl-a{direction:rtl;font-family:"Noto Local",sans-serif}.dbl-a *{box-sizing:border-box;font-family:inherit}.dbl-a a{text-decoration:none}
.dbl-a .hd{text-align:center}.dbl-a .hd h2{font-size:44px;line-height:1;font-weight:500;color:#141414;margin:0}
.dbl-a .dv{position:relative;width:200px;height:1px;background:#a8a8a8;margin:22px auto 0}.dbl-a .dv:after{content:"";position:absolute;left:50%;top:-1px;width:44px;height:3px;margin-left:-22px;background:#c9a961}
.dbl-a .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:50px;padding:0 26px;border-radius:8px;font-size:17px;font-weight:600}
.dbl-a .btn.g{background:#e7cd96;color:#141414}.dbl-a .btn.o{border:1.5px solid #25d366;color:#128c4b;background:#fff}.dbl-a .btn svg{width:20px;height:20px}
.dbl-a .rt{display:inline-flex;align-items:center;gap:6px;font-size:15px;color:#54595f}.dbl-a .rt b{color:#141414;font-size:16px}.dbl-a .rt svg{width:16px;height:16px}`;

// A: white, site style, photo on a light panel
const A_CSS = `.dbl-a.A{background:#fff;padding:80px 30px 86px}
.A .w{max-width:1140px;margin:48px auto 0;display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:72px;align-items:center}
.A p{font-size:20px;line-height:1.75;color:#54595f;margin:0 0 22px}.A p a{color:#141414;font-weight:600;border-bottom:1px solid #e7cd96}
.A ul{list-style:none;margin:0 0 28px;padding:0;display:flex;flex-direction:column;gap:12px}
.A li{display:flex;gap:12px;align-items:flex-start;font-size:18px;color:#141414;line-height:1.5}
.A li i{flex:0 0 26px;height:26px;border-radius:50%;background:#f7efdc;color:#a8853f;display:flex;align-items:center;justify-content:center;margin-top:1px}.A li i svg{width:15px;height:15px}
.A .row{display:flex;align-items:center;gap:18px;flex-wrap:wrap}
.A .ph{position:relative;height:580px;display:flex;align-items:flex-end;justify-content:center}
.A .ph:before{content:"";position:absolute;inset:70px 0 0;background:linear-gradient(180deg,#f4f1ea,#ebe5d8);border-radius:22px}
.A .ph:after{content:"";position:absolute;inset:84px 14px 14px;border:1px solid rgba(201,169,97,.55);border-radius:14px}
.A .ph img{position:relative;z-index:1;height:100%;width:auto;display:block}
@media (max-width:767px){.dbl-a.A{padding:44px 20px 48px}.A .hd h2{font-size:32px}.A .dv{width:160px;margin-top:18px}
.A .w{grid-template-columns:1fr;gap:26px;margin-top:28px}.A .ph{order:-1;height:400px;max-width:340px;margin:0 auto;width:100%}.A .ph:before{inset:56px 0 0}.A .ph:after{inset:68px 10px 10px}
.A p{font-size:16.5px;margin-bottom:18px}.A li{font-size:15.5px}.A ul{margin-bottom:22px}.A .btn{flex:1}.A .row{gap:12px}.A .rt{width:100%;justify-content:center}}`;
const A_HTML = `<section class="dbl-a A"><div class="hd"><h2>הכירו את יקיר דבול</h2><div class="dv"></div></div><div class="w"><div class="tx">
<p>${INTRO}</p><ul>${POINTS.map((t) => `<li><i>${IC.check}</i><span>${t}</span></li>`).join('')}</ul>
<div class="row"><a class="btn g" href="#">קראו עליי עוד</a><a class="btn o" href="#">${IC.wa} שיחה בוואטסאפ</a><span class="rt">${IC.star}<b>4.9</b> · 73 ביקורות בגוגל</span></div></div>
<div class="ph"><img src="${M}cut-p1.webp" alt=""></div></div></section>`;

// B: dark band, gold accents, photo standing at the bottom edge
const B_CSS = `.dbl-a.B{background:radial-gradient(90% 120% at 18% 100%,#2a2416 0,#141414 55%);color:#fff;padding:0 30px;overflow:hidden}
.B .w{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr) 480px;gap:64px;align-items:end;min-height:660px}
.B .tx{padding:84px 0}.B h2{font-size:44px;font-weight:500;line-height:1.1;margin:0;color:#fff}
.B .ln{width:56px;height:3px;background:#c9a961;margin:20px 0 22px}
.B p{font-size:20px;line-height:1.75;color:#cfccc6;margin:0 0 28px;max-width:600px}.B p a{color:#e7cd96}
.B .st{display:grid;grid-template-columns:repeat(3,auto);justify-content:start;gap:0;margin:0 0 30px;border:1px solid #2e2e2e;border-radius:12px;overflow:hidden;width:max-content;max-width:100%}
.B .st div{padding:14px 22px}.B .st div+div{border-inline-start:1px solid #2e2e2e}.B .st b{display:block;font-size:26px;font-weight:600;color:#e7cd96;line-height:1.1}.B .st span{font-size:13.5px;color:#a9a6a0}
.B .row{display:flex;gap:12px;flex-wrap:wrap}.B .btn.o{background:transparent;color:#fff;border:1.5px solid #3a3a3a}.B .btn.o svg{color:#25d366}
.B .ph{align-self:end;display:flex;justify-content:center;position:relative;height:630px}
.B .ph:before{content:"";position:absolute;bottom:0;left:50%;width:380px;height:380px;margin-left:-190px;border-radius:50%;background:radial-gradient(circle,rgba(201,169,97,.28),rgba(201,169,97,0) 70%)}
.B .ph img{position:relative;height:100%;width:auto;display:block}
@media (max-width:767px){.dbl-a.B{padding:0 20px}.B .w{grid-template-columns:1fr;gap:0;min-height:0}.B .ph{order:-1;height:420px;margin-top:40px}.B .ph:before{width:280px;height:280px;margin-left:-140px}
.B .tx{padding:26px 0 44px}.B h2{font-size:32px}.B p{font-size:16.5px;margin-bottom:22px}.B .st{width:100%;grid-template-columns:repeat(3,1fr)}.B .st div{padding:12px 10px;text-align:center}.B .st b{font-size:21px}.B .st span{font-size:12px}.B .btn{flex:1;padding:0 12px}}`;
const B_HTML = `<section class="dbl-a B"><div class="w"><div class="tx"><h2>הכירו את יקיר דבול</h2><div class="ln"></div><p>${INTRO}</p>
<div class="st"><div><b>100+</b><span>עסקאות בשנה</span></div><div><b>4.9 ★</b><span>73 ביקורות בגוגל</span></div><div><b>3</b><span>ועדות בלשכת עורכי הדין</span></div></div>
<div class="row"><a class="btn g" href="#">קראו עליי עוד</a><a class="btn o" href="#">${IC.wa} שיחה בוואטסאפ</a></div></div>
<div class="ph"><img src="${M}cut-p2.webp" alt=""></div></div></section>`;

// C: white section, site heading, a wide card with the photo popping out of it
const C_CSS = `.dbl-a.C{background:#fff;padding:80px 30px 86px}
.C .card{max-width:1160px;margin:110px auto 0;background:#f6f6f8;border-radius:24px;display:grid;grid-template-columns:minmax(0,1fr) 360px;gap:40px;align-items:end;padding:0 48px 0 0;position:relative}
.C .tx{padding:64px 0 64px}.C p{font-size:20px;line-height:1.75;color:#54595f;margin:0 0 22px}.C p a{color:#141414;font-weight:600;border-bottom:1px solid #e7cd96}
.C .tags{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 26px}.C .tags span{background:#fff;border:1px solid #e6e6ea;border-radius:999px;padding:7px 14px;font-size:14.5px;color:#141414}
.C .row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.C .ph{height:620px;margin-top:-130px;display:flex;justify-content:center;align-items:flex-end;position:relative}
.C .ph img{height:100%;width:auto;display:block;border-radius:0 0 24px 0}
.C .badge{position:absolute;bottom:22px;left:-10px;background:#141414;color:#fff;border-radius:14px;padding:12px 16px;display:flex;flex-direction:column;gap:2px;box-shadow:0 12px 30px rgba(0,0,0,.18)}
.C .badge b{font-size:24px;color:#e7cd96;font-weight:600;line-height:1}.C .badge span{font-size:13px;color:#cfccc6}
@media (max-width:767px){.dbl-a.C{padding:44px 16px 48px}.C .hd h2{font-size:32px}.C .dv{width:160px;margin-top:18px}
.C .card{grid-template-columns:1fr;padding:0 20px;margin-top:80px;gap:0}.C .ph{order:-1;height:380px;margin-top:-70px}.C .badge{left:0;bottom:14px;padding:9px 12px}.C .badge b{font-size:19px}
.C .tx{padding:20px 0 26px}.C p{font-size:16.5px}.C .btn{flex:1}.C .rt{width:100%;justify-content:center}}`;
const C_HTML = `<section class="dbl-a C"><div class="hd"><h2>הכירו את יקיר דבול</h2><div class="dv"></div></div>
<div class="card"><div class="tx"><p>${INTRO}</p><div class="tags"><span>עסקאות מקרקעין</span><span>דירות מקבלן</span><span>התחדשות עירונית</span><span>מיסוי מקרקעין</span><span>חדלות פירעון</span></div>
<div class="row"><a class="btn g" href="#">קראו עליי עוד</a><a class="btn o" href="#">${IC.wa} שיחה בוואטסאפ</a><span class="rt">${IC.star}<b>4.9</b> · 73 ביקורות בגוגל</span></div></div>
<div class="ph"><img src="${M}cut-p3.webp" alt=""><div class="badge"><b>100+</b><span>עסקאות בשנה</span></div></div></div></section>`;

/* ---------------- footer: shared data ---------------- */
const COLS = [
  ['המשרד', ['אודות המשרד', 'תעודות והסמכות', 'המלצות לקוחות', 'המשרד בתקשורת', 'סיפורי מקרה', 'מידע משפטי']],
  ['קונים דירה', ['דירה יד שנייה', 'דירה מקבלן', 'בדיקות לפני קנייה', 'זיכרון דברים', 'הסכם מכר', 'איחור במסירה']],
  ['מוכרים דירה', ['עורך דין למכירת דירה', 'מס שבח', 'היטל השבחה', 'העברה ללא תמורה', 'הפרת חוזה מכר']],
  ['התחדשות ומיסוי', ['פינוי בינוי', 'תמ״א 38', 'דיירים סרבנים', 'מס רכישה', 'מיסוי דירת ירושה']],
];
const AREAS = ['נתניה', 'הרצליה', 'חדרה', 'כפר יונה'];
const LEGAL = '<a href="#">מדיניות פרטיות</a><a href="#">הצהרת נגישות</a><a href="#">מפת אתר</a>';
const colsHTML = (cls) => COLS.map(([h, ls]) => `<div class="${cls}"><h4>${h}</h4><ul>${ls.map((t) => `<li><a href="#">${t}</a></li>`).join('')}</ul></div>`).join('');
const FBASE = `.dbl-f{direction:rtl;font-family:"Noto Local",sans-serif}.dbl-f *{box-sizing:border-box;font-family:inherit}.dbl-f a{text-decoration:none;color:inherit}.dbl-f ul{list-style:none;margin:0;padding:0}`;

// F1: dark, centered and calm: logo, 3 big contact buttons, 4 columns, one bottom line
const F1_CSS = `.dbl-f.F1{background:#121212;color:#bdbab3;padding:56px 30px 0;text-align:center}
.F1 .logo{height:70px;width:auto}.F1 .sub{margin:12px 0 26px;font-size:15.5px;color:#8f8c86}
.F1 .cta{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}.F1 .cta a{display:inline-flex;align-items:center;gap:10px;height:52px;padding:0 24px;border-radius:10px;font-size:16.5px;font-weight:600;border:1px solid #2f2f2f;color:#fff;background:#1a1a1a}
.F1 .cta a.g{background:#e7cd96;color:#141414;border-color:#e7cd96}.F1 .cta svg{width:20px;height:20px}.F1 .cta a.w svg{color:#25d366}
.F1 .cols{max-width:1000px;margin:44px auto 0;padding:36px 0;border-top:1px solid #262626;border-bottom:1px solid #262626;display:grid;grid-template-columns:repeat(4,1fr);gap:24px;text-align:right}
.F1 h4{margin:0 0 14px;color:#e7cd96;font-size:16px;font-weight:600;letter-spacing:.2px}.F1 li{margin:0 0 9px;font-size:15px}.F1 li a:hover{color:#fff}
.F1 .info{display:flex;justify-content:center;gap:26px;flex-wrap:wrap;padding:24px 0;font-size:15px}.F1 .info span{display:inline-flex;align-items:center;gap:8px}.F1 .info svg{width:17px;height:17px;color:#c9a961}
.F1 .areas{font-size:14.5px;color:#8f8c86;padding-bottom:22px}.F1 .areas a{color:#bdbab3;margin:0 8px}
.F1 .bot{border-top:1px solid #262626;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 0 20px;font-size:13.5px;color:#7d7a74;max-width:1140px;margin:0 auto}.F1 .bot nav{display:flex;gap:18px}
@media (max-width:767px){.dbl-f.F1{padding:40px 20px 0}.F1 .logo{height:56px}.F1 .cta{display:grid;grid-template-columns:1fr 1fr;gap:10px}.F1 .cta a{justify-content:center;padding:0 10px;font-size:15.5px}.F1 .cta a.g{grid-column:1/-1}
.F1 .cols{grid-template-columns:1fr 1fr;gap:26px 18px;margin-top:32px;padding:28px 0}.F1 .info{flex-direction:column;align-items:center;gap:12px}.F1 .bot{flex-direction:column;align-items:center;text-align:center}}`;
const F1_HTML = (logo) => `<footer class="dbl-f F1"><img class="logo" src="${logo}" alt=""><p class="sub">משרד עורכי דין לדיני מקרקעין ונדל״ן · רזיאל 1, נתניה</p>
<div class="cta"><a class="g" href="#">${IC.tel} 09-8613413</a><a class="w" href="#">${IC.wa} וואטסאפ</a><a href="#">${IC.waze} ניווט ב-Waze</a></div>
<div class="cols">${colsHTML('c')}</div>
<div class="info"><span>${IC.pin} רזיאל 1, נתניה (קומת כניסה)</span><span>${IC.clock} א׳ עד ה׳, 9:00 עד 18:00</span><span>${IC.mail} dabullaw@gmail.com</span></div>
<div class="areas">עורך דין מקרקעין ב: ${AREAS.map((a) => `<a href="#">${a}</a>`).join('·')} · <a href="#">English</a> · <a href="#">Français</a></div>
<div class="bot"><span>© כל הזכויות שמורות ליקיר דבול, משרד עורכי דין</span><nav>${LEGAL}</nav></div></footer>`;

// F2: light footer that continues the white site, with a dark contact card
const F2_CSS = `.dbl-f.F2{background:#f6f5f2;color:#54595f;padding:60px 30px 0;border-top:1px solid #ebe8e1}
.F2 .in{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:340px minmax(0,1fr);gap:56px}
.F2 .card{background:#141414;color:#d8d5ce;border-radius:20px;padding:28px}.F2 .card .logo{height:58px;width:auto;margin-bottom:18px}
.F2 .card li{display:flex;gap:10px;align-items:flex-start;font-size:15.5px;margin-bottom:12px;line-height:1.45}.F2 .card li svg{width:18px;height:18px;flex:0 0 18px;color:#e7cd96;margin-top:2px}
.F2 .card .bt{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:20px}.F2 .card .bt a{height:46px;border-radius:10px;display:flex;align-items:center;justify-content:center;gap:8px;font-weight:600;font-size:15px}
.F2 .card .bt a.g{background:#e7cd96;color:#141414}.F2 .card .bt a.w{background:#25d366;color:#fff}.F2 .card .bt svg{width:18px;height:18px}
.F2 .card .soc{display:flex;gap:8px;margin-top:16px}.F2 .card .soc a{width:40px;height:40px;border-radius:50%;border:1px solid #333;display:flex;align-items:center;justify-content:center;color:#e7cd96}.F2 .card .soc svg{width:18px;height:18px}
.F2 .cols{display:grid;grid-template-columns:repeat(4,1fr);gap:28px;padding-top:8px}
.F2 h4{margin:0 0 16px;color:#141414;font-size:17px;font-weight:600;padding-bottom:10px;border-bottom:2px solid #e7cd96;display:inline-block}.F2 li{margin:0 0 10px;font-size:15.5px}.F2 .cols a:hover{color:#141414}
.F2 .areas{grid-column:2;display:flex;flex-wrap:wrap;gap:8px;align-items:center;font-size:14.5px;margin-top:6px}.F2 .areas b{color:#141414;font-weight:600;margin-inline-end:4px}.F2 .areas a{background:#fff;border:1px solid #e6e2d8;border-radius:999px;padding:6px 14px;color:#141414}
.F2 .bot{max-width:1180px;margin:40px auto 0;border-top:1px solid #e3dfd6;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:18px 0 22px;font-size:13.5px;color:#7d7a74}.F2 .bot nav{display:flex;gap:18px}
@media (max-width:767px){.dbl-f.F2{padding:36px 16px 0}.F2 .in{grid-template-columns:1fr;gap:30px}.F2 .cols{grid-template-columns:1fr 1fr;gap:24px 16px}.F2 .areas{grid-column:auto}.F2 .bot{flex-direction:column}}`;
const F2_HTML = (logo) => `<footer class="dbl-f F2"><div class="in"><div class="card"><img class="logo" src="${logo}" alt=""><ul>
<li>${IC.pin}<span>רזיאל 1, נתניה (קומת כניסה)</span></li><li>${IC.tel}<span>09-8613413</span></li><li>${IC.mail}<span>dabullaw@gmail.com</span></li><li>${IC.clock}<span>א׳ עד ה׳, 9:00 עד 18:00 · ו׳ ושבת סגור</span></li></ul>
<div class="bt"><a class="g" href="#">${IC.tel} התקשרו</a><a class="w" href="#">${IC.wa} וואטסאפ</a></div>
<div class="soc"><a href="#">${IC.waze}</a><a href="#">${IC.fb}</a><a href="#">${IC.mail}</a></div></div>
<div><div class="cols">${colsHTML('c')}</div><div class="areas" style="margin-top:30px"><b>אזורי שירות:</b>${AREAS.map((a) => `<a href="#">${a}</a>`).join('')}<a href="#">English</a><a href="#">Français</a></div></div></div>
<div class="bot"><span>© כל הזכויות שמורות ליקיר דבול, משרד עורכי דין</span><nav>${LEGAL}</nav></div></footer>`;

// F3: navy like the home hero, skyline fading in at the top, contact strip of 4 tiles
const F3_CSS = `.dbl-f.F3{background:#0b1530;color:#c3c9d8;padding:0 30px;position:relative;overflow:hidden}
.F3:before{content:"";position:absolute;inset:0 0 auto 0;height:300px;background:url(${S}wp-content/uploads/2026/05/bgmain.webp) center 70%/cover;opacity:.28;-webkit-mask:linear-gradient(#000,transparent);mask:linear-gradient(#000,transparent)}
.F3 .in{position:relative;max-width:1180px;margin:0 auto}
.F3 .tiles{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:54px 0 40px}
.F3 .tile{background:rgba(255,255,255,.06);border:1px solid rgba(231,205,150,.22);border-radius:16px;padding:18px;display:flex;gap:14px;align-items:center;backdrop-filter:blur(4px)}
.F3 .tile i{flex:0 0 46px;height:46px;border-radius:12px;background:#e7cd96;color:#0b1530;display:flex;align-items:center;justify-content:center}.F3 .tile i svg{width:22px;height:22px}
.F3 .tile b{display:block;color:#fff;font-size:16px;font-weight:600}.F3 .tile span{font-size:14px;color:#aab2c5}
.F3 .mid{display:grid;grid-template-columns:300px repeat(4,1fr);gap:28px;padding:34px 0;border-top:1px solid rgba(255,255,255,.1)}
.F3 .logo{height:60px;width:auto}.F3 .about p{font-size:15px;line-height:1.7;margin:14px 0 0;color:#aab2c5}
.F3 h4{margin:0 0 14px;color:#e7cd96;font-size:16px;font-weight:600}.F3 li{margin:0 0 9px;font-size:15px}.F3 .mid a:hover{color:#fff}
.F3 .areas{display:flex;gap:10px;flex-wrap:wrap;align-items:center;font-size:14.5px;padding:0 0 26px}.F3 .areas a{border:1px solid rgba(255,255,255,.16);border-radius:999px;padding:6px 14px;color:#dfe3ec}
.F3 .bot{border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 0 22px;font-size:13.5px;color:#8a93a8}.F3 .bot nav{display:flex;gap:18px}
@media (max-width:767px){.dbl-f.F3{padding:0 16px}.F3 .tiles{grid-template-columns:1fr 1fr;padding:36px 0 26px;gap:10px}.F3 .tile{flex-direction:column;align-items:flex-start;padding:14px;gap:10px}
.F3 .mid{grid-template-columns:1fr 1fr;gap:24px 16px}.F3 .about{grid-column:1/-1}.F3 .bot{flex-direction:column}}`;
const F3_HTML = (logoW) => `<footer class="dbl-f F3"><div class="in"><div class="tiles">
<a class="tile" href="#"><i>${IC.tel}</i><div><b>09-8613413</b><span>לשיחת ייעוץ</span></div></a>
<a class="tile" href="#"><i>${IC.wa}</i><div><b>וואטסאפ</b><span>050-5580189</span></div></a>
<a class="tile" href="#"><i>${IC.pin}</i><div><b>רזיאל 1, נתניה</b><span>ניווט ב-Waze</span></div></a>
<a class="tile" href="#"><i>${IC.clock}</i><div><b>א׳ עד ה׳</b><span>9:00 עד 18:00</span></div></a></div>
<div class="mid"><div class="about"><img class="logo" src="${logoW}" alt=""><p>משרד עורכי דין לדיני מקרקעין ונדל״ן בנתניה. ליווי בעסקאות, התחדשות עירונית ומיסוי מקרקעין.</p></div>${colsHTML('c')}</div>
<div class="areas"><span>עורך דין מקרקעין ב:</span>${AREAS.map((a) => `<a href="#">${a}</a>`).join('')}<a href="#">English</a><a href="#">Français</a></div>
<div class="bot"><span>© כל הזכויות שמורות ליקיר דבול, משרד עורכי דין</span><nav>${LEGAL}</nav></div></div></footer>`;

/* ---------------- run ---------------- */
const b = await chromium.launch();
const prep = async (ctx) => { await ctx.route(M + '*', (r) => { const f = 'mock/' + r.request().url().split('/__mock/')[1]; r.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(f) }); }); };
const open = async (ctx, url) => { const p = await ctx.newPage(); await p.goto(url, { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null);
  await p.addStyleTag({ content: '#dbl-cbar,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.elementor-element-844bd60,.dabul-gbadge{visibility:hidden!important}' }); return p; };
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  await prep(ctx);
  // hero
  let p = await open(ctx, S + '?o=' + Date.now());
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(600);
  await p.screenshot({ path: `${OUT}/hero-${mode}-before.jpg`, type: 'jpeg', quality: 80 });
  await p.evaluate((M) => {
    const st = document.createElement('style'); st.textContent = `@media (max-width:767px){.elementor-element-9056c3a{background-image:url(${M}hero-phone-new.webp)!important}}`; document.head.appendChild(st);
    const i = document.querySelector('.elementor-element-2c91460 img'); if (i) { i.removeAttribute('srcset'); i.src = M + 'cut-p1.webp'; i.style.height = i.getBoundingClientRect().height + 'px'; i.style.width = 'auto'; i.style.objectFit = 'contain'; }
  }, M);
  await p.waitForTimeout(2000);
  await p.screenshot({ path: `${OUT}/hero-${mode}-after.jpg`, type: 'jpeg', quality: 80 });
  await p.addStyleTag({ content: 'header.elementor-location-header,[data-elementor-type="header"]{display:none!important}' });
  // about options
  const box = await p.evaluate(() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } c.id = 'dbl-old-about'; return !!c; });
  await p.locator('#dbl-old-about').scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  await p.locator('#dbl-old-about').screenshot({ path: `${OUT}/about-${mode}-before.jpg`, type: 'jpeg', quality: 78 });
  rep['about-before-' + mode] = await p.evaluate(() => Math.round(document.getElementById('dbl-old-about').getBoundingClientRect().height));
  for (const [k, css, html] of [['A', A_CSS, A_HTML], ['B', B_CSS, B_HTML], ['C', C_CSS, C_HTML]]) {
    await p.evaluate(({ k, h }) => { document.getElementById('dbl-new-about')?.remove(); const o = document.getElementById('dbl-old-about'); o.style.display = 'none'; o.insertAdjacentHTML('afterend', '<div id="dbl-new-about">' + h + '</div>'); }, { k, h: `<style>${BASE}${css}</style>${html}` });
    await p.waitForTimeout(1500);
    const n = p.locator('#dbl-new-about'); await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await n.screenshot({ path: `${OUT}/about-${mode}-${k}.jpg`, type: 'jpeg', quality: 82 });
    rep[`about-${k}-${mode}`] = await p.evaluate(() => Math.round(document.getElementById('dbl-new-about').getBoundingClientRect().height));
  }
  // certificates: 4 large cards like the reference site, button below stays
  {
    const sec = p.locator('.elementor-element-abb2800'); await sec.scrollIntoViewIfNeeded(); await p.waitForTimeout(1500);
    await sec.screenshot({ path: `${OUT}/cert-${mode}-before.jpg`, type: 'jpeg', quality: 78 });
    await p.evaluate((mode) => {
      const st = document.createElement('style');
      const H = mode === 'phone' ? 400 : 470;
      st.textContent = `html body .elementor-element-abb2800 .certificates-carousel .elementor-image-carousel-wrapper,html body .elementor-element-abb2800 .certificates-carousel .elementor-image-carousel,html body .elementor-element-abb2800 .certificates-carousel .swiper-wrapper,html body .elementor-element-abb2800 .certificates-carousel .swiper-slide,html body .elementor-element-abb2800 .certificates-carousel .swiper-slide-inner,html body .elementor-element-abb2800 .certificates-carousel a,html body .elementor-element-abb2800 .certificates-carousel figure{height:${H}px!important}
html body .elementor-element-abb2800 .certificates-carousel .swiper-slide a{position:relative;display:block!important;width:100%!important}
html body .elementor-element-abb2800 .certificates-carousel img{height:${H}px!important;min-height:${H}px!important;max-height:${H}px!important;width:100%!important;object-fit:cover!important;border:0!important;border-radius:6px!important;padding:0!important;background:#fff!important;box-shadow:0 14px 34px rgba(20,20,20,.10)!important}
html body .elementor-element-abb2800 .certificates-carousel .swiper-slide a:after{content:"";position:absolute;left:18px;bottom:18px;width:52px;height:52px;border-radius:10px;background:#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a8853f' stroke-width='2' stroke-linecap='round'%3E%3Ccircle cx='10.5' cy='10.5' r='6.5'/%3E%3Cpath d='M15.5 15.5L21 21M10.5 7.5v6M7.5 10.5h6'/%3E%3C/svg%3E") center/26px no-repeat;box-shadow:0 6px 16px rgba(0,0,0,.12)}
html body .elementor-element-abb2800 .certificates-carousel .swiper-pagination{display:none!important}
html body .elementor-element-abb2800 .certificates-carousel .elementor-swiper-button{width:64px!important;height:64px!important;border-radius:50%!important;border:1px solid #cfcfcf!important;background:#fff!important;display:flex!important;align-items:center!important;justify-content:center!important}
html body .elementor-element-abb2800 .certificates-carousel .elementor-swiper-button svg{width:22px!important;height:22px!important;fill:#141414!important}
html body .elementor-element-abb2800 .certificates-carousel{max-width:1440px;margin-inline:auto}`;
      document.head.appendChild(st);
      document.querySelectorAll('.elementor-element-abb2800 .certificates-carousel .swiper-slide').forEach((sl) => { const a = sl.querySelector('a'); const i = sl.querySelector('img'); if (a && i && a.href) { i.removeAttribute('srcset'); i.src = a.href; } });
      const el = document.querySelector('.elementor-element-abb2800 .certificates-carousel .swiper');
      const sw = el && el.swiper; if (sw) { sw.params.slidesPerView = mode === 'phone' ? 1.25 : 4; sw.params.spaceBetween = mode === 'phone' ? 16 : 36; if (sw.params.breakpoints) sw.params.breakpoints = {}; sw.update(); sw.slideTo(sw.params.loop ? 6 : 0, 0); }
    }, mode);
    await p.waitForTimeout(3500);
    await sec.screenshot({ path: `${OUT}/cert-${mode}-after.jpg`, type: 'jpeg', quality: 80 });
  }
  // footer: same design, better order (existing widgets are moved, not redrawn)
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2500);
  await p.evaluate(() => { const f = document.querySelector('[data-elementor-type="footer"]'); [...f.children].forEach((e) => { if (!e.querySelector('.elementor-element-0647149')) e.dataset.dblHide = '1'; }); const w = document.createElement('div'); w.id = 'dbl-old-foot'; const hide = [...f.children].filter((e) => e.dataset.dblHide); hide[0].before(w); hide.forEach((e) => w.appendChild(e)); });
  await p.locator('#dbl-old-foot').screenshot({ path: `${OUT}/footer-${mode}-before.jpg`, type: 'jpeg', quality: 75 });
  rep['footer-before-' + mode] = await p.evaluate(() => Math.round(document.getElementById('dbl-old-foot').getBoundingClientRect().height));
  await p.evaluate(() => {
    const old = document.getElementById('dbl-old-foot'); const W = (id) => old.querySelector('.elementor-element-' + id);
    const bg = getComputedStyle(old.firstElementChild).backgroundColor;
    const st = document.createElement('style');
    st.textContent = `#dbl-new-foot{background:radial-gradient(120% 80% at 50% 0,#1c1c1c 0,#121212 60%);padding:46px 30px 0;direction:rtl}
#dbl-new-foot .r1{max-width:1340px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:28px;border-bottom:1px solid rgba(231,205,150,.18)}
#dbl-new-foot .tag{color:#9d9a93;font-size:15px;flex:1;text-align:center}
#dbl-new-foot .r2{max-width:1340px;margin:0 auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(0,1.3fr) 300px;gap:34px;padding:38px 0 34px}
#dbl-new-foot .col{display:flex;flex-direction:column;gap:14px}#dbl-new-foot .col .gap{margin-top:18px!important}
#dbl-new-foot .elementor-widget{width:auto!important;max-width:100%!important;position:static!important;margin:0!important}
#dbl-new-foot .elementor-heading-title{color:#e7cd96!important;font-size:17px!important;font-weight:600!important;line-height:1.3!important;position:relative;padding-bottom:12px!important}
#dbl-new-foot .elementor-heading-title:after{content:"";position:absolute;right:0;bottom:0;width:28px;height:2px;background:#c9a961}
#dbl-new-foot .r2 .elementor-icon-list-item{padding:4px 0!important}
#dbl-new-foot .r2 .elementor-icon-list-text{color:#cfccc6!important;font-size:15px!important;line-height:1.5!important;transition:color .15s}
#dbl-new-foot .r2 a:hover .elementor-icon-list-text{color:#e7cd96!important}
#dbl-new-foot .contact .elementor-icon-list-icon svg{fill:#e7cd96!important;color:#e7cd96!important}
#dbl-new-foot .areas{font-size:13.5px;color:#8f8c86;line-height:1.7}#dbl-new-foot .areas a{color:#cfccc6;text-decoration:none}#dbl-new-foot .areas a:hover{color:#e7cd96}
#dbl-new-foot .mapw iframe{width:100%!important;height:220px!important;border-radius:14px;border:1px solid rgba(231,205,150,.25)!important;filter:grayscale(.3) contrast(1.05)}
#dbl-new-foot .r3{max-width:1340px;margin:0 auto;padding:0 0 30px}
#dbl-new-foot .r3>.e-con{background:linear-gradient(90deg,#1d1d1d,#202020)!important;border:1px solid rgba(231,205,150,.22)!important;border-radius:16px!important;max-width:none!important;width:100%!important}
#dbl-new-foot .r4{max-width:1340px;margin:0 auto;border-top:1px solid rgba(231,205,150,.18);display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 0 18px}
#dbl-new-foot .r4 .lang{display:flex;gap:14px;font-size:14px}#dbl-new-foot .r4 .lang a{color:#cfccc6;text-decoration:none}
#dbl-new-foot .r4 .rc{flex-basis:100%;text-align:center;opacity:.6}
#dbl-new-foot .r1 .elementor-social-icon{background:transparent!important;border:1px solid rgba(231,205,150,.45)!important}#dbl-new-foot .r1 .elementor-social-icon svg{fill:#e7cd96!important}
@media (max-width:767px){#dbl-new-foot{padding:34px 20px 0}#dbl-new-foot .r1{flex-direction:column;gap:16px}#dbl-new-foot .tag{order:3}#dbl-new-foot .r2{grid-template-columns:1fr 1fr;gap:28px 18px}#dbl-new-foot .r2 .contact,#dbl-new-foot .r2 .mapw{grid-column:1/-1}#dbl-new-foot .mapw .elementor-element-832a7d8{display:none!important}#dbl-new-foot .mapw{align-items:center}
#dbl-new-foot .r4{flex-direction:column;text-align:center}}`;
    document.head.appendChild(st);
    const box = document.createElement('div'); box.id = 'dbl-new-foot'; box.className = old.className; old.after(box);
    const mk = (cls, ...els) => { const d = document.createElement('div'); d.className = cls; els.filter(Boolean).forEach((e) => d.appendChild(e)); return d; };
    const rename = (id, t) => { const h = W(id)?.querySelector('.elementor-heading-title'); if (h) h.textContent = t; return W(id); };
    const drop = (id, re) => { W(id)?.querySelectorAll('li').forEach((li) => { if (re.test(li.innerText.trim())) li.remove(); }); return W(id); };
    // links: keep the strong ones, drop duplicates and wrong targets
    drop('e3a6a41', /נאמנות|מושכרת|חריגות|להריסה|קטין/);
    drop('cf26f1d', /מדד תשומות/);
    W('e3a6a41').querySelector('ul').append(...W('cf26f1d').querySelectorAll('li'));
    drop('5f04f5a', /לנכים|לעולים|מציאת סכום/);
    drop('023fe63', /צרו קשר/);
    drop('886145f', /^$/);
    const legal = W('56f4633'); const seen = new Set(); legal?.querySelectorAll('li').forEach((li) => { const t = li.innerText.trim(); if (seen.has(t)) li.remove(); else seen.add(t); });
    // row 1: logo + one set of icons
    const tag = document.createElement('div'); tag.className = 'tag'; tag.textContent = 'משרד עורכי דין לדיני מקרקעין ונדל״ן · רזיאל 1, נתניה';
    box.appendChild(mk('r1', W('35de91f'), tag, W('d678948')));
    // row 2: 4 link columns, contact + hours, map
    const c1 = mk('col', rename('3f4ec02', 'המשרד'), W('023fe63'));
    const c2 = mk('col', rename('dd98793', 'קונים דירה'), W('e3a6a41'));
    const c3 = mk('col', rename('20c9d78', 'מוכרים דירה'), W('270273d'));
    const c4 = mk('col', W('6dccef0'), W('5f04f5a')); const h47 = W('47fbee4'); h47.classList.add('gap'); c4.append(h47, W('796bc41'));
    const links = [...W('886145f').querySelectorAll('a')].map((a) => [a.innerText.trim(), a.getAttribute('href')]);
    const city = links.filter(([t]) => /עורך דין/.test(t)).map(([t, h]) => `<a href="${h}">${t.replace('עורך דין מקרקעין ב', '')}</a>`).join(' · ');
    const lang = links.filter(([t]) => !/עורך דין/.test(t)).map(([t, h]) => `<a href="${h}">${t}</a>`).join('');
    const areas = document.createElement('div'); areas.className = 'areas'; areas.innerHTML = 'עורך דין מקרקעין ב: ' + city;
    const c5 = mk('col contact', rename('ff5ffac', 'יצירת קשר'), W('bced874')); const h93 = W('9339779'); h93.classList.add('gap'); c5.append(h93, W('a58e6fa'), areas);
    const c6 = mk('col mapw', W('832a7d8'), W('5d367c3'));
    box.appendChild(mk('r2', c1, c2, c3, c4, c5, c6));
    // row 3: local pages + WhatsApp group box
    const waBox = W('f3a95db').closest('.e-con.e-child') || mk('', W('f3a95db'), W('831ef6d'));
    box.appendChild(mk('r3', waBox));
    // row 4: legal line once
    const rc = W('02509a1'); rc?.classList.add('rc');
    const lg = document.createElement('div'); lg.className = 'lang'; lg.innerHTML = lang;
    box.appendChild(mk('r4', W('555996b'), lg, legal, rc));
    old.style.display = 'none';
    W('e501cf7')?.remove();
  });
  await p.waitForTimeout(2500);
  const nf = p.locator('#dbl-new-foot'); await nf.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  await nf.screenshot({ path: `${OUT}/footer-${mode}-new.jpg`, type: 'jpeg', quality: 82 });
  rep['footer-new-' + mode] = await p.evaluate(() => Math.round(document.getElementById('dbl-new-foot').getBoundingClientRect().height));
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
// r3
