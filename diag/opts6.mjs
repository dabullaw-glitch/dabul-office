// Round 6 mockups (phone hero options, seals, about, footer, menu). Round 4 base: trust seal next to the hero photo (3 styles), 3 new "about" sketches, footer fixes + social networks, phone menu socials.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts6'; fs.mkdirSync(OUT, { recursive: true });
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

/* ---------- phone hero: option 2, improved (two versions) ---------- */
const CITY = 'https://dabullaw.co.il/wp-content/uploads/2026/10/netanya-city-night-mobile.webp';
const ME = M + 'cut-p1-hd.webp';
const BUL = ['אני יקיר דבול, עורך דין המתמחה בנדל״ן, התחדשות עירונית וחדלות פירעון.', 'מעל 100 עסקאות מקרקעין מדי שנה. ניסיון מוכח שמעניק לכם שקט.', 'חבר ועדות הקניין, המקרקעין וההתחדשות העירונית בלשכת עורכי הדין.', 'אני והצוות שלי זמינים עבורכם 24/7 למקרי חירום.'];
const PH_CSS = `.dbl-ph{position:relative;direction:rtl;font-family:"Noto Local",sans-serif;color:#fff;overflow:hidden;background:#0a1226 url(${CITY}) center bottom/cover no-repeat;isolation:isolate;padding:26px 20px 30px}
.dbl-ph *{box-sizing:border-box;font-family:inherit}
.dbl-ph:before{content:"";position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,rgba(8,13,30,.9) 0%,rgba(8,13,30,.72) 42%,rgba(8,13,30,.42) 100%)}
.dbl-ph .top{display:grid;grid-template-columns:minmax(0,1fr) 164px;gap:16px;align-items:center}
.dbl-ph h1{margin:0;line-height:1}.dbl-ph h1 b{display:block;font-size:41px;font-weight:800;letter-spacing:-.5px}.dbl-ph h1 span{display:block;font-size:23px;font-weight:300;margin-top:8px;white-space:nowrap;color:#f1efe9}
.dbl-ph .ln{width:46px;height:2px;background:linear-gradient(90deg,#f0d9a0,#b8913f);margin:15px 0 12px}
.dbl-ph .tg{color:#e7cd96;font-size:15.5px;font-weight:700;white-space:nowrap;letter-spacing:.2px}
.dbl-ph .arch{position:relative;height:228px;border-radius:999px 999px 18px 18px;overflow:hidden;background:radial-gradient(120% 75% at 50% 22%,#33498a 0,#15214d 52%,#0a1230 100%);box-shadow:0 0 0 1.5px #e7cd96,0 0 0 7px rgba(231,205,150,.1),0 20px 40px rgba(0,0,0,.55)}
.dbl-ph .arch:after{content:"";position:absolute;inset:7px;border-radius:999px 999px 12px 12px;border:1px solid rgba(231,205,150,.32);pointer-events:none}
.dbl-ph .arch img{position:absolute;left:50%;top:10px;width:124%;transform:translateX(-50%);max-width:none}
.dbl-ph ul{list-style:none;margin:24px 0 0;padding:0;display:flex;flex-direction:column}
.dbl-ph li{display:flex;gap:12px;align-items:flex-start;font-size:16px;line-height:1.55;color:#f3f1ec}
.dbl-ph li i{flex:0 0 26px;height:26px;border-radius:50%;border:1.5px solid rgba(231,205,150,.75);color:#e7cd96;display:flex;align-items:center;justify-content:center;margin-top:1px}.dbl-ph li i svg{width:15px;height:15px}
/* a: plain points with thin lines between */
.dbl-ph.a li{padding:12px 0;border-top:1px solid rgba(255,255,255,.1)}.dbl-ph.a li:first-child{border-top:0;padding-top:0}
/* b: the points inside a glass card */
.dbl-ph.b ul{gap:14px;padding:18px 16px;border-radius:18px;background:linear-gradient(160deg,rgba(255,255,255,.09),rgba(255,255,255,.03));border:1px solid rgba(231,205,150,.28);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);box-shadow:0 14px 30px rgba(0,0,0,.25)}
.dbl-ph.b li i{background:linear-gradient(135deg,#f0d9a0,#c9a14f);border:0;color:#141008}`;
const PH = Object.fromEntries(['a', 'b'].map((k) => [k, `<div class="dbl-ph ${k}"><div class="top"><div><h1><b>יקיר דבול</b><span>עורך דין מקרקעין</span></h1><div class="ln"></div><div class="tg">מקצועיות. ניסיון. תוצאות</div></div><div class="arch"><img src="${ME}" alt=""></div></div><ul>${BUL.map((t) => `<li><i>${IC.check}</i><span>${t}</span></li>`).join('')}</ul></div>`]));

/* ---------- about: sketch 2 + sketch 3 together, more content, full size ---------- */
const IC2 = {
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.4"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><path d="M15 14.5c.6-.3 1.3-.5 2-.5 2.8 0 4 2.2 4 5"/></svg>',
  road: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h7a3.5 3.5 0 0 0 0-7H9a3.5 3.5 0 0 1 0-7h7"/></svg>',
  scale: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v18M7 21h10M5 7h14"/><path d="M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z"/></svg>',
};
const G_INTRO = 'יקיר דבול, <a href="#">עורך דין מקרקעין בנתניה</a>, מלווה לקוחות באופן אישי בעסקאות מקרקעין ונדל״ן, בהליכי חדלות פירעון ושיקום כלכלי, ובפרויקטים של התחדשות עירונית ופינוי בינוי. מדי שנה אני מלווה מעל 100 עסקאות מקרקעין ומאות לקוחות.';
const G_ADV = 'לצד הייעוץ המשפטי אני בוחן גם את הצד הכלכלי של העסקה: מה הסיכונים, מה העלויות ומה הדרך שמתאימה לכם, ברמת העסקה וברמת הפרויקט כולו.';
const G_FACTS = [['+100', 'עסקאות מקרקעין בכל שנה'], ['4.9★', '73 ביקורות בגוגל'], ['3', 'ועדות בלשכת עורכי הדין'], ['24/7', 'זמינות למקרי חירום']];
const G_TILES = [[IC.home, 'עסקאות מקרקעין', 'קנייה ומכירה, יד שנייה ומקבלן'], [IC.city, 'התחדשות עירונית', 'ייצוג דיירים בפינוי בינוי ותמ״א'], [IC.tax, 'מיסוי מקרקעין', 'מס שבח, מס רכישה והיטל השבחה'], [IC.shield, 'חדלות פירעון', 'הסדר חובות ושיקום כלכלי']];
const G_STEPS = [['שיחת היכרות', 'מבינים את העסקה, הלוחות והסיכונים, ומה חשוב לכם.'], ['בדיקות לפני חתימה', 'טאבו, היתרים, מיסוי ושמאות, יחד עם אנשי המקצוע.'], ['הסכם, חתימה ורישום', 'משא ומתן, חתימה, דיווח לרשויות ורישום בטאבו.']];
const G_CARDS = [[IC2.team, 'עובדים יחד עם אנשי המקצוע', 'שמאי מקרקעין, מהנדסי בניין, אדריכלים ויועצי משכנתאות, כדי שהעסקה תיבדק מכל הכיוונים.'], [IC2.road, 'ליווי מההתחלה ועד הסוף', 'אני לא רק מייעץ. אני מלווה אתכם לאורך כל הדרך, עם הקפדה על כל פרט.'], [IC2.scale, 'משפט ועסקים ביחד', G_ADV]];
const G_HTML = (k) => `<section class="dbl-a G ${k}"><div class="w">
<div class="ph"><div class="ring"></div><img src="${M}cut-p2-hd.webp" alt=""><div class="facts">${G_FACTS.map(([n, t]) => `<div><b>${n}</b><span>${t}</span></div>`).join('')}</div></div>
<div class="tx"><h2>הכירו את יקיר דבול</h2><div class="ln"></div><p>${G_INTRO}</p>
<div class="tiles">${G_TILES.map(([i, b, s]) => `<div class="tile"><i>${i}</i><div><b>${b}</b><span>${s}</span></div></div>`).join('')}</div>
<div class="row"><a class="btn g" href="#">קראו עליי עוד</a><a class="btn o" href="#">צפו בסרטון היכרות</a></div></div></div>
<div class="w2"><h3>איך עובדים איתי</h3><ol>${G_STEPS.map(([b, s], i) => `<li><i>${i + 1}</i><b>${b}</b><span>${s}</span></li>`).join('')}</ol>
<div class="cards">${G_CARDS.map(([i, b, s]) => `<div class="card"><i>${i}</i><b>${b}</b><span>${s}</span></div>`).join('')}</div></div></section>`;
const G_CSS = `.dbl-a.G{padding:90px 30px 84px;overflow:hidden}
.G .w{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:470px minmax(0,1fr);gap:70px;align-items:center}
.G .ph{position:relative;height:600px;display:flex;justify-content:center;align-items:flex-end}
.G .ph .ring{position:absolute;bottom:60px;left:50%;width:430px;height:430px;margin-left:-215px;border-radius:50%}
.G .ph img{position:relative;height:100%;width:auto;z-index:1}
.G .facts{position:absolute;z-index:2;left:0;right:0;bottom:-18px;display:grid;grid-template-columns:repeat(4,1fr);border-radius:16px;overflow:hidden;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
.G .facts div{padding:14px 6px;text-align:center}.G .facts div+div{border-right:1px solid var(--gl)}.G .facts b{display:block;font-size:24px;line-height:1.1;font-weight:800;color:#c9a961;direction:ltr}.G .facts span{display:block;font-size:12.5px;line-height:1.35;margin-top:4px}
.G h2{font-size:46px;font-weight:500;margin:0}.G .ln{width:60px;height:3px;background:#c9a961;margin:20px 0 24px}
.G p{font-size:19px;line-height:1.8;margin:0 0 26px}
.G .tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 30px}
.G .tile{display:flex;gap:14px;align-items:center;padding:16px 18px;border-radius:14px}
.G .tile i{flex:0 0 46px;height:46px;border-radius:12px;display:flex;align-items:center;justify-content:center}.G .tile i svg{width:24px;height:24px}.G .tile b{font-size:17px;font-weight:700}.G .tile span{display:block;font-size:14px;margin-top:2px}
.G .row{display:flex;gap:12px;flex-wrap:wrap}
.G .w2{max-width:1200px;margin:74px auto 0;padding-top:56px;border-top:1px solid var(--gl)}
.G h3{text-align:center;font-size:30px;font-weight:600;margin:0 0 34px}
.G ol{list-style:none;margin:0 0 40px;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:28px;position:relative}
.G ol:before{content:"";position:absolute;top:24px;right:16%;left:16%;height:2px;background:linear-gradient(90deg,transparent,#c9a961,transparent)}
.G ol li{position:relative;text-align:center}.G ol li i{position:relative;z-index:1;width:50px;height:50px;margin:0 auto 14px;border-radius:50%;border:2px solid #c9a961;display:flex;align-items:center;justify-content:center;font-style:normal;font-weight:800;font-size:19px;color:#c9a961}
.G ol li b{display:block;font-size:19px;font-weight:700;margin-bottom:6px}.G ol li span{font-size:15.5px;line-height:1.6}
.G .cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}
.G .card{padding:24px 22px;border-radius:16px}.G .card i{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;margin-bottom:14px}.G .card i svg{width:25px;height:25px}
.G .card b{display:block;font-size:18px;font-weight:700;margin-bottom:8px}.G .card span{font-size:15.5px;line-height:1.65}
/* dark */
.G.dk{--gl:rgba(231,205,150,.18);background:linear-gradient(180deg,#0e1730 0,#121212 100%);color:#fff}
.G.dk .ph .ring{border:1px solid rgba(231,205,150,.35);box-shadow:0 0 0 26px rgba(231,205,150,.05),0 0 0 54px rgba(231,205,150,.025)}
.G.dk .facts{background:rgba(14,23,48,.82);border:1px solid rgba(231,205,150,.3)}.G.dk .facts span{color:#cfccc6}
.G.dk p{color:#cfccc6}.G.dk p a{color:#e7cd96}
.G.dk .tile,.G.dk .card{border:1px solid rgba(231,205,150,.2);background:rgba(255,255,255,.035)}.G.dk .tile i,.G.dk .card i{background:rgba(231,205,150,.12);color:#e7cd96}
.G.dk .tile b,.G.dk .card b{color:#fff}.G.dk .tile span,.G.dk .card span,.G.dk ol li span{color:#a9a6a0}.G.dk ol li i{background:#0f1830}
.G.dk .btn.o{background:transparent;color:#fff;border-color:#3a3a3a}
/* light */
.G.lt{--gl:#ece6d8;background:#fff;color:#141414}
.G.lt .ph{border-radius:24px;background:radial-gradient(110% 70% at 50% 30%,#2b3f75,#0f1734 70%);overflow:visible}
.G.lt .ph .ring{border:1px solid rgba(231,205,150,.4)}
.G.lt .facts{background:rgba(255,255,255,.96);border:1px solid #e9dfc6;box-shadow:0 14px 34px rgba(20,20,20,.12)}.G.lt .facts b{color:#a8853f}.G.lt .facts span{color:#54595f}
.G.lt p{color:#54595f}.G.lt p a{color:#141414;font-weight:600;border-bottom:1px solid #e7cd96}
.G.lt .tile,.G.lt .card{border:1px solid #ece6d8;background:#fbfaf6}.G.lt .tile i,.G.lt .card i{background:#f3ecdc;color:#a8853f}
.G.lt .tile span,.G.lt .card span,.G.lt ol li span{color:#6b6b6b}.G.lt ol li i{background:#fff;color:#a8853f;border-color:#d9c18a}
@media (max-width:767px){.dbl-a.G{padding:50px 20px 46px}.G .w{grid-template-columns:1fr;gap:44px}.G .ph{height:430px}.G .ph .ring{width:310px;height:310px;margin-left:-155px;bottom:50px}
.G .facts{grid-template-columns:repeat(2,1fr);bottom:-34px;left:-4px;right:-4px}.G .facts div:nth-child(3){border-right:0}.G .facts div:nth-child(n+3){border-top:1px solid var(--gl)}.G .facts b{font-size:21px}
.G .tx{margin-top:18px}.G h2{font-size:32px}.G p{font-size:16.5px}.G .tiles{grid-template-columns:1fr 1fr;gap:8px}.G .tile{flex-direction:column;align-items:flex-start;padding:12px}.G .btn{flex:1}
.G .w2{margin-top:46px;padding-top:40px}.G h3{font-size:25px;margin-bottom:24px}.G ol{grid-template-columns:1fr;gap:20px;text-align:right}.G ol:before{display:none}.G ol li{text-align:right;padding-right:64px;min-height:50px}.G ol li i{position:absolute;right:0;top:0;margin:0}
.G .cards{grid-template-columns:1fr;gap:12px}}`;

/* ---------- footer: upgrades on top of the approved footer ---------- */
const PHONE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>';
const FUP_CSS = `#dbl-new-foot{position:relative;background:radial-gradient(90% 60% at 50% 0,#1a2440 0,#121212 62%)!important;padding-top:40px!important}
#dbl-new-foot:before{content:"";position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#c9a961,transparent)}
#dbl-new-foot .cta{max-width:1340px;margin:0 auto 34px;display:flex;align-items:center;justify-content:space-between;gap:18px;flex-wrap:wrap;padding:22px 28px;border-radius:20px;background:linear-gradient(120deg,#16213f,#0f1630);border:1px solid rgba(231,205,150,.4);box-shadow:0 18px 44px rgba(0,0,0,.4);font-family:"Noto Local",sans-serif}
#dbl-new-foot .cta b{display:block;color:#fff;font-size:24px;font-weight:700}#dbl-new-foot .cta span{color:#cfccc6;font-size:15.5px}
#dbl-new-foot .cta .bt{display:flex;gap:10px;flex-wrap:wrap}#dbl-new-foot .cta a{display:inline-flex;align-items:center;gap:9px;height:50px;padding:0 22px;border-radius:999px;font-weight:800;font-size:16.5px;text-decoration:none}
#dbl-new-foot .cta a svg{width:20px;height:20px}#dbl-new-foot .cta .c{background:linear-gradient(135deg,#f0d9a0,#c9a14f);color:#141008}#dbl-new-foot .cta .w{border:1.5px solid #25d366;color:#fff}#dbl-new-foot .cta .w svg{color:#25d366}
#dbl-new-foot .r1{padding-top:4px}
#dbl-new-foot .r2 .elementor-icon-list-item>a,#dbl-new-foot .r2 .elementor-icon-list-item>span{position:relative;padding-right:14px!important}
#dbl-new-foot .r2 .col:not(.contact) .elementor-icon-list-item>a:before{content:"";position:absolute;right:0;top:50%;width:5px;height:5px;margin-top:-2px;border-radius:50%;background:#c9a961;opacity:.7}
#dbl-new-foot .r2 .elementor-icon-list-item{padding:6px 0!important}
#dbl-new-foot .contact .elementor-icon-list-icon{width:34px!important;height:34px!important;border-radius:50%;background:rgba(231,205,150,.1);border:1px solid rgba(231,205,150,.3);display:inline-flex!important;align-items:center;justify-content:center;margin-left:10px}
#dbl-new-foot .contact .elementor-icon-list-icon svg{width:15px!important;height:15px!important}
#dbl-new-foot .soc a{width:46px;height:46px;background:linear-gradient(160deg,rgba(231,205,150,.14),rgba(231,205,150,.03))}
#dbl-new-foot .mapw iframe{box-shadow:0 14px 30px rgba(0,0,0,.35)}
@media (max-width:767px){#dbl-new-foot .cta{margin:0 0 28px;padding:18px;text-align:center;justify-content:center}#dbl-new-foot .cta b{font-size:20px}#dbl-new-foot .cta .bt{width:100%}#dbl-new-foot .cta a{flex:1;justify-content:center;padding:0 12px;font-size:15.5px}}`;
const FUP_HTML = `<div class="cta"><div><b>יש לכם שאלה על עסקה?</b><span>דברו איתנו, נחזור אליכם בהקדם.</span></div><div class="bt"><a class="c" href="#">${PHONE_SVG}09-861-3413</a><a class="w" href="#">${SOC.wa}וואטסאפ</a></div></div>`;

/* ---------- about: three new sketches ---------- */
const ABASE = `.dbl-a{direction:rtl;font-family:"Noto Local",sans-serif}.dbl-a *{box-sizing:border-box;font-family:inherit}.dbl-a a{text-decoration:none}
.dbl-a .hd{text-align:center}.dbl-a .hd h2{font-size:44px;line-height:1;font-weight:500;color:#141414;margin:0}
.dbl-a .dv{position:relative;width:200px;height:1px;background:#a8a8a8;margin:22px auto 0}.dbl-a .dv:after{content:"";position:absolute;left:50%;top:-1px;width:44px;height:3px;margin-left:-22px;background:#c9a961}
.dbl-a .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:50px;padding:0 26px;border-radius:8px;font-size:17px;font-weight:600}
.dbl-a .btn.g{background:#e7cd96;color:#141414}.dbl-a .btn.o{border:1.5px solid #cfcfcf;color:#141414;background:#fff}
.dbl-a .media{display:flex;align-items:center;justify-content:center;gap:12px 34px;flex-wrap:wrap;padding-top:26px;margin-top:34px;border-top:1px solid #ececec}
.dbl-a .media small{font-size:14px;color:#8a8a8a;letter-spacing:.3px}.dbl-a .media b{font-size:19px;font-weight:700;color:#9a9a9a;letter-spacing:.2px;filter:grayscale(1)}
.dbl-a .vid{position:relative;display:block;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:9/14;max-width:360px;margin:0 auto}
.dbl-a .vid img{width:100%;height:100%;object-fit:cover;display:block;opacity:.92}.dbl-a .vid .pl{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:#e7cd96;color:#141414;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.dbl-a .vid .pl svg{width:30px;height:30px;margin-left:4px}.dbl-a .vid .cap{position:absolute;right:16px;bottom:14px;color:#fff;font-weight:600;font-size:15px;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.dbl-a .sig{font-family:"Amatic SC","Noto Local",cursive;font-size:44px;font-weight:700;color:#141414;line-height:1}`;

/* ---------- run ---------- */
const b = await chromium.launch();
const prep = async (ctx) => { await ctx.route(M + '*', (r) => { const f = 'mock/' + r.request().url().split('/__mock/')[1]; r.fulfill({ status: 200, contentType: f.endsWith('.png') ? 'image/png' : 'image/webp', body: fs.readFileSync(fs.existsSync(f) ? f : f.replace('-hd.webp', '.webp')) }); }); };
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  await prep(ctx);
  const p = await ctx.newPage(); await p.goto(S + '?o4=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a,div,span')].filter((e) => (e.textContent || '').trim() === 'הבנתי').pop(); if (x) x.click(); document.querySelectorAll('body *').forEach((e) => { const cs = getComputedStyle(e); if (cs.position === 'fixed' && /Cookies/.test(e.textContent || '') && e.id !== 'dbl-cbar') e.style.display = 'none'; }); }).catch(() => null);
  await p.addStyleTag({ content: '#dbl-cbar,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.elementor-element-844bd60,.dabul-gbadge{visibility:hidden!important}' });
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/hero-${mode}-now.jpg`, type: 'jpeg', quality: 78 });
  // phone: option 2 improved, two versions
  if (mode === 'phone') {
    await p.addStyleTag({ content: PH_CSS });
    for (const k of ['a', 'b']) {
      await p.evaluate((html) => { const hero = document.querySelector('.elementor-element-9056c3a'); document.getElementById('dbl-ph-wrap')?.remove(); hero.style.display = 'none'; hero.insertAdjacentHTML('afterend', '<div id="dbl-ph-wrap">' + html + '</div>'); }, PH[k]);
      await p.waitForTimeout(1500); await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(400);
      await p.screenshot({ path: `${OUT}/hero-phone-${k}.jpg`, type: 'jpeg', quality: 84 });
      await p.evaluate(() => { const st = document.createElement('style'); st.id = 'dbl-nohead'; st.textContent = '[data-elementor-type="header"]{visibility:hidden!important}'; document.head.appendChild(st); });
      await p.locator('#dbl-ph-wrap').screenshot({ path: `${OUT}/hero-phone-${k}-full.jpg`, type: 'jpeg', quality: 82 });
      await p.evaluate(() => document.getElementById('dbl-nohead')?.remove());
      rep['ph-' + k] = await p.evaluate(() => Math.round(document.getElementById('dbl-ph-wrap').getBoundingClientRect().height));
    }
    await p.evaluate(() => { document.getElementById('dbl-ph-wrap')?.remove(); document.querySelector('.elementor-element-9056c3a').style.display = ''; });
  }
  // from here on the sticky header is hidden so it does not cover the element shots
  await p.addStyleTag({ content: '[data-elementor-type="header"]{visibility:hidden!important}' });
  // speed / accessibility visual fixes: before and after
  {
    const box = await p.evaluate(() => { const t = document.querySelector('h3.elementor-icon-box-title a, h3.elementor-icon-box-title span'); if (!t) return null; let c = t.closest('.e-con.e-parent') || t.closest('.e-con'); c.id = 'dbl-contrast'; const cs = getComputedStyle(t); const bg = (() => { let e = t; while (e) { const b = getComputedStyle(e).backgroundColor; if (b && b !== 'rgba(0, 0, 0, 0)') return b; e = e.parentElement; } return 'white'; })(); return { color: cs.color, bg }; });
    rep['contrast-' + mode] = box;
    if (box) {
      const el = p.locator('#dbl-contrast'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
      await el.screenshot({ path: `${OUT}/contrast-${mode}-before.jpg`, type: 'jpeg', quality: 80 });
      await p.addStyleTag({ content: 'h3.elementor-icon-box-title,h3.elementor-icon-box-title a,h3.elementor-icon-box-title span{color:#7a5a1e!important}' });
      await p.waitForTimeout(400); await el.screenshot({ path: `${OUT}/contrast-${mode}-after.jpg`, type: 'jpeg', quality: 80 });
    }
    const lk = await p.evaluate(() => { const a = [...document.querySelectorAll('.e-con-inner > .elementor-element > p > a, .elementor-widget-text-editor p > a')].find((x) => x.offsetParent && !x.closest('footer,[data-elementor-type="footer"]')); if (!a) return false; a.closest('p').id = 'dbl-linkp'; return true; });
    if (lk) {
      const el = p.locator('#dbl-linkp'); await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
      await el.screenshot({ path: `${OUT}/link-${mode}-before.jpg`, type: 'jpeg', quality: 85 });
      await p.addStyleTag({ content: '#dbl-linkp a{text-decoration:underline!important;text-decoration-thickness:1px!important;text-underline-offset:4px!important;text-decoration-color:#c9a961!important}' });
      await p.waitForTimeout(300); await el.screenshot({ path: `${OUT}/link-${mode}-after.jpg`, type: 'jpeg', quality: 85 });
    }
  }
  // about sketches
  await p.evaluate(() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } c.id = 'dbl-old-about'; });
  for (const [k, css, html] of [['dk', G_CSS, G_HTML('dk')], ['lt', G_CSS, G_HTML('lt')]]) {
    await p.evaluate((h) => { document.getElementById('dbl-new-about')?.remove(); const o = document.getElementById('dbl-old-about'); o.style.display = 'none'; o.insertAdjacentHTML('afterend', '<div id="dbl-new-about">' + h + '</div>'); }, `<style>${ABASE}${css}</style>${html}`);
    await p.waitForTimeout(1800);
    const n = p.locator('#dbl-new-about'); await n.scrollIntoViewIfNeeded(); await p.waitForTimeout(500);
    await n.screenshot({ path: `${OUT}/about-${mode}-${k}.jpg`, type: 'jpeg', quality: 82 });
    rep[`about-${k}-${mode}`] = await p.evaluate(() => Math.round(document.getElementById('dbl-new-about').getBoundingClientRect().height));
  }
  // FOOTER
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2500);
  await p.evaluate(({ SOC, SOC_LIST }) => {
    const f = document.querySelector('[data-elementor-type="footer"]'); [...f.children].forEach((e) => { if (!e.querySelector('.elementor-element-0647149')) e.dataset.dblHide = '1'; });
    const old = document.createElement('div'); old.id = 'dbl-old-foot'; const hide = [...f.children].filter((e) => e.dataset.dblHide); hide[0].before(old); hide.forEach((e) => old.appendChild(e));
    const W = (id) => old.querySelector('.elementor-element-' + id);
    const st = document.createElement('style');
    st.textContent = `#dbl-new-foot{background:radial-gradient(120% 80% at 50% 0,#1c1c1c 0,#121212 60%);padding:46px 30px 0;direction:rtl}
#dbl-new-foot .r1{max-width:1340px;margin:0 auto;display:flex;justify-content:space-between;align-items:center;gap:20px;padding-bottom:28px;border-bottom:1px solid rgba(231,205,150,.18)}
#dbl-new-foot .soc{display:flex;align-items:center;gap:10px}#dbl-new-foot .soc small{color:#9d9a93;font-size:14px;margin-left:6px}
#dbl-new-foot .soc a{width:44px;height:44px;border-radius:50%;border:1px solid rgba(231,205,150,.45);display:flex;align-items:center;justify-content:center;color:#e7cd96;transition:.2s}#dbl-new-foot .soc a:hover{background:#e7cd96;color:#141414}#dbl-new-foot .soc svg{width:20px;height:20px}
#dbl-new-foot .r2{max-width:1340px;margin:0 auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr)) minmax(0,1.3fr) 300px;gap:34px;padding:38px 0 34px}
#dbl-new-foot .col{display:flex;flex-direction:column;gap:14px}#dbl-new-foot .col .gap{margin-top:18px!important}
#dbl-new-foot .elementor-widget{width:auto!important;max-width:100%!important;position:static!important;margin:0!important}
#dbl-new-foot .r2 .elementor-heading-title{color:#e7cd96!important;font-size:17px!important;font-weight:600!important;line-height:1.3!important;position:relative;padding-bottom:12px!important}
#dbl-new-foot .r2 .elementor-heading-title:after{content:"";position:absolute;right:0;bottom:0;width:28px;height:2px;background:#c9a961}
#dbl-new-foot .r2 .elementor-icon-list-item{padding:4px 0!important}#dbl-new-foot .r2 .elementor-icon-list-text{color:#cfccc6!important;font-size:15px!important;line-height:1.5!important}
#dbl-new-foot .contact .elementor-icon-list-icon svg{fill:#e7cd96!important;color:#e7cd96!important}
#dbl-new-foot .mapw iframe{width:100%!important;height:220px!important;border-radius:14px;border:1px solid rgba(231,205,150,.25)!important}
#dbl-new-foot .r3{max-width:1340px;margin:0 auto;padding:0 0 30px;display:flex;justify-content:center}
#dbl-new-foot .r3>.e-con{background:linear-gradient(90deg,#1d1d1d,#202020)!important;border:1px solid rgba(231,205,150,.22)!important;border-radius:16px!important;width:auto!important;max-width:100%!important;padding:16px 28px!important;flex:0 0 auto!important;display:inline-flex!important}
#dbl-new-foot .r4{max-width:1340px;margin:0 auto;border-top:1px solid rgba(231,205,150,.18);display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;padding:16px 0 18px}
#dbl-new-foot .r4 .lang{display:flex;gap:14px;font-size:14px}#dbl-new-foot .r4 .lang a{color:#cfccc6;text-decoration:none}#dbl-new-foot .r4 .rc{flex-basis:100%;text-align:center;opacity:.6}
@media (max-width:767px){#dbl-new-foot{padding:34px 20px 0}#dbl-new-foot .r1{flex-direction:column;gap:18px}#dbl-new-foot .soc{flex-wrap:wrap;justify-content:center}#dbl-new-foot .soc small{flex-basis:100%;text-align:center;margin:0}#dbl-new-foot .r2{grid-template-columns:1fr 1fr;gap:28px 18px}#dbl-new-foot .r2 .contact,#dbl-new-foot .r2 .mapw{grid-column:1/-1}#dbl-new-foot .mapw .elementor-element-832a7d8{display:none!important}#dbl-new-foot .mapw{align-items:center}#dbl-new-foot .r4{flex-direction:column;text-align:center}}`;
    document.head.appendChild(st);
    const box = document.createElement('div'); box.id = 'dbl-new-foot'; box.className = old.className; old.after(box);
    const mk = (cls, ...els) => { const d = document.createElement('div'); d.className = cls; els.filter(Boolean).forEach((e) => d.appendChild(e)); return d; };
    const rename = (id, t) => { const h = W(id)?.querySelector('.elementor-heading-title'); if (h) h.textContent = t; return W(id); };
    const drop = (id, re) => { W(id)?.querySelectorAll('li').forEach((li) => { if (re.test(li.innerText.trim())) li.remove(); }); return W(id); };
    drop('e3a6a41', /נאמנות|מושכרת|חריגות|להריסה|קטין/); drop('cf26f1d', /מדד תשומות/); W('e3a6a41').querySelector('ul').append(...W('cf26f1d').querySelectorAll('li'));
    drop('5f04f5a', /לנכים|לעולים|מציאת סכום/); drop('023fe63', /צרו קשר/);
    const legal = W('56f4633'); const seen = new Set(); legal?.querySelectorAll('li').forEach((li) => { const t = li.innerText.trim(); if (seen.has(t)) li.remove(); else seen.add(t); });
    const links = [...W('886145f').querySelectorAll('a')].map((a) => [a.innerText.trim(), a.getAttribute('href')]);
    const lang = links.filter(([t]) => !/עורך דין/.test(t)).map(([t, h]) => `<a href="${h}">${t}</a>`).join('');
    const soc = document.createElement('div'); soc.className = 'soc'; soc.innerHTML = '<small>עקבו אחרינו</small>' + SOC_LIST.map(([k, t]) => `<a href="#" aria-label="${t}">${SOC[k]}</a>`).join('');
    box.appendChild(mk('r1', W('35de91f'), soc));
    const c1 = mk('col', rename('3f4ec02', 'המשרד'), W('023fe63'));
    const c2 = mk('col', rename('dd98793', 'קונים דירה'), W('e3a6a41'));
    const c3 = mk('col', rename('20c9d78', 'מוכרים דירה'), W('270273d'));
    const c4 = mk('col', W('6dccef0'), W('5f04f5a')); const h47 = W('47fbee4'); h47.classList.add('gap'); c4.append(h47, W('796bc41'));
    const c5 = mk('col contact', rename('ff5ffac', 'יצירת קשר'), W('bced874')); const h93 = W('9339779'); h93.classList.add('gap'); c5.append(h93, W('a58e6fa'));
    const c6 = mk('col mapw', W('832a7d8'), W('5d367c3'));
    box.appendChild(mk('r2', c1, c2, c3, c4, c5, c6));
    const waBox = W('f3a95db').closest('.e-con.e-child');
    box.appendChild(mk('r3', waBox));
    const rc = W('02509a1'); rc?.classList.add('rc'); const lg = document.createElement('div'); lg.className = 'lang'; lg.innerHTML = lang;
    box.appendChild(mk('r4', W('555996b'), lg, legal, rc));
    old.style.display = 'none';
  }, { SOC, SOC_LIST });
  await p.waitForTimeout(2500);
  const nf = p.locator('#dbl-new-foot'); await nf.scrollIntoViewIfNeeded(); await p.waitForTimeout(600);
  await nf.screenshot({ path: `${OUT}/footer-${mode}-ok.jpg`, type: 'jpeg', quality: 82 });
  await p.addStyleTag({ content: FUP_CSS }); await p.evaluate((h) => { const f = document.getElementById('dbl-new-foot'); f.insertAdjacentHTML('afterbegin', h); }, FUP_HTML);
  await p.waitForTimeout(900); await p.evaluate(() => { const f = document.getElementById('dbl-new-foot'); window.scrollTo(0, f.getBoundingClientRect().top + scrollY - 120); }); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/footer-${mode}-up-top.jpg`, type: 'jpeg', quality: 82 });
  await nf.screenshot({ path: `${OUT}/footer-${mode}-up.jpg`, type: 'jpeg', quality: 82 });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
