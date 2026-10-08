// Round 4 mockups: trust seal next to the hero photo (3 styles), 3 new "about" sketches, footer fixes + social networks, phone menu socials.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/opts4'; fs.mkdirSync(OUT, { recursive: true });
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

/* ---------- trust seals (facts only) ---------- */
const SEAL_CSS = `.dbl-seal{position:absolute;z-index:5;direction:rtl;font-family:"Noto Local",sans-serif;pointer-events:none}
.dbl-seal.s1{width:var(--sz);height:var(--sz)}.dbl-seal.s1 svg.ring{position:absolute;inset:0;width:100%;height:100%;animation:dblspin 28s linear infinite}
.dbl-seal.s1 .core{position:absolute;inset:18%;border-radius:50%;background:radial-gradient(circle at 35% 30%,#2a3b6b,#0b1530 70%);border:1.5px solid #e7cd96;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;box-shadow:0 10px 26px rgba(0,0,0,.35)}
.dbl-seal.s1 .core b{font-size:calc(var(--sz)*.2);line-height:1;color:#e7cd96;font-weight:700}.dbl-seal.s1 .core span{font-size:calc(var(--sz)*.085);line-height:1.2;text-align:center;margin-top:3px}
@keyframes dblspin{to{transform:rotate(-360deg)}}
.dbl-seal.s2{width:var(--sz);height:var(--sz);border-radius:50%;background:#fff;box-shadow:0 12px 30px rgba(0,0,0,.3);display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid #e7cd96;outline:1.5px solid #e7cd96;outline-offset:-9px}
.dbl-seal.s2 b{font-size:calc(var(--sz)*.25);line-height:1;color:#141414;font-weight:700}.dbl-seal.s2 .st{color:#f4b400;font-size:calc(var(--sz)*.1);letter-spacing:1px;margin:2px 0}.dbl-seal.s2 span{font-size:calc(var(--sz)*.085);color:#54595f;text-align:center;line-height:1.2}
.dbl-seal.s3{width:var(--sz);height:calc(var(--sz)*1.25)}.dbl-seal.s3 svg{position:absolute;inset:0;width:100%;height:100%;filter:drop-shadow(0 10px 18px rgba(0,0,0,.35))}
.dbl-seal.s3 .tx{position:absolute;left:0;right:0;top:calc(var(--sz)*.17);height:calc(var(--sz)*.66);display:flex;flex-direction:column;align-items:center;justify-content:center;color:#3a2a0c;text-align:center}
.dbl-seal.s3 .tx b{font-size:calc(var(--sz)*.17);line-height:1;font-weight:800}.dbl-seal.s3 .tx span{font-size:calc(var(--sz)*.075);line-height:1.25;font-weight:600;max-width:70%}`;
const RING_TXT = 'עו״ד יקיר דבול • דיני מקרקעין • נתניה • עו״ד יקיר דבול • דיני מקרקעין • נתניה • ';
const SEALS = {
  s1: `<div class="dbl-seal s1"><svg class="ring" viewBox="0 0 200 200"><defs><path id="dblc" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0"/></defs><circle cx="100" cy="100" r="98" fill="#141414" stroke="#e7cd96" stroke-width="2"/><text fill="#e7cd96" font-size="15" font-weight="600" letter-spacing="1.5" font-family="Noto Local, sans-serif"><textPath href="#dblc">${RING_TXT}</textPath></text></svg><div class="core"><b>100+</b><span>עסקאות<br>בכל שנה</span></div></div>`,
  s2: `<div class="dbl-seal s2"><b>4.9</b><div class="st">★★★★★</div><span>73 ביקורות<br>בגוגל</span></div>`,
  s3: `<div class="dbl-seal s3"><svg viewBox="0 0 100 125"><defs><linearGradient id="dblg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6e3b0"/><stop offset=".5" stop-color="#d7b76a"/><stop offset="1" stop-color="#b38b3e"/></linearGradient></defs><path d="M30 78 L18 122 L34 112 L42 124 L50 88Z M70 78 L82 122 L66 112 L58 124 L50 88Z" fill="#9c7a35"/><g transform="translate(50 50)">${Array.from({ length: 24 }, (_, i) => `<circle r="9" cx="${(40 * Math.cos(i * Math.PI / 12)).toFixed(2)}" cy="${(40 * Math.sin(i * Math.PI / 12)).toFixed(2)}" fill="url(#dblg)"/>`).join('')}<circle r="41" fill="url(#dblg)"/><circle r="34" fill="none" stroke="#fff6dc" stroke-width="1.2" stroke-dasharray="2 2"/></g></svg><div class="tx"><b>3</b><span>ועדות בלשכת עורכי הדין</span></div></div>`,
};

/* ---------- about: three new sketches ---------- */
const ABASE = `.dbl-a{direction:rtl;font-family:"Noto Local",sans-serif}.dbl-a *{box-sizing:border-box;font-family:inherit}.dbl-a a{text-decoration:none}
.dbl-a .hd{text-align:center}.dbl-a .hd h2{font-size:44px;line-height:1;font-weight:500;color:#141414;margin:0}
.dbl-a .dv{position:relative;width:200px;height:1px;background:#a8a8a8;margin:22px auto 0}.dbl-a .dv:after{content:"";position:absolute;left:50%;top:-1px;width:44px;height:3px;margin-left:-22px;background:#c9a961}
.dbl-a .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:50px;padding:0 26px;border-radius:8px;font-size:17px;font-weight:600}
.dbl-a .btn.g{background:#e7cd96;color:#141414}.dbl-a .btn.o{border:1.5px solid #cfcfcf;color:#141414;background:#fff}
.dbl-a .media{display:flex;align-items:center;justify-content:center;gap:12px 34px;flex-wrap:wrap;padding-top:26px;margin-top:34px;border-top:1px solid #ececec}
.dbl-a .media small{font-size:14px;color:#8a8a8a;letter-spacing:.3px}.dbl-a .media b{font-size:19px;font-weight:700;color:#9a9a9a;letter-spacing:.2px;filter:grayscale(1)}
.dbl-a .vid{position:relative;display:block;border-radius:16px;overflow:hidden;background:#000;aspect-ratio:16/9}
.dbl-a .vid img{width:100%;height:100%;object-fit:cover;display:block;opacity:.92}.dbl-a .vid .pl{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:#e7cd96;color:#141414;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}
.dbl-a .vid .pl svg{width:30px;height:30px;margin-left:4px}.dbl-a .vid .cap{position:absolute;right:16px;bottom:14px;color:#fff;font-weight:600;font-size:15px;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.dbl-a .sig{font-family:"Amatic SC","Noto Local",cursive;font-size:44px;font-weight:700;color:#141414;line-height:1}`;
// D: story + numbers + intro video, media strip
const D_CSS = `.dbl-a.D{background:#fff;padding:80px 30px 70px}
.D .w{max-width:1160px;margin:46px auto 0;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,.95fr);gap:60px;align-items:center}
.D p{font-size:19px;line-height:1.75;color:#54595f;margin:0 0 20px}.D p a{color:#141414;font-weight:600;border-bottom:1px solid #e7cd96}
.D .q{position:relative;font-size:22px;line-height:1.5;color:#141414;font-weight:500;padding:4px 22px 4px 0;border-right:3px solid #e7cd96;margin:0 0 18px}
.D .nums{display:grid;grid-template-columns:repeat(3,1fr);gap:0;margin:24px 0 28px;border:1px solid #ececec;border-radius:14px;overflow:hidden}
.D .nums div{padding:16px 10px;text-align:center}.D .nums div+div{border-right:1px solid #ececec}.D .nums b{display:block;font-size:34px;line-height:1.05;color:#141414;font-weight:700}.D .nums b em{font-style:normal;color:#c9a961}.D .nums span{font-size:14px;color:#6b6b6b}
.D .row{display:flex;gap:12px;flex-wrap:wrap;align-items:center}
.D .pic{position:relative}.D .pic .vid{box-shadow:0 24px 50px rgba(20,20,20,.18)}
.D .pic .me{position:absolute;bottom:-26px;right:-22px;width:150px;height:150px;border-radius:50%;overflow:hidden;border:5px solid #fff;box-shadow:0 12px 30px rgba(0,0,0,.18);background:#1d2b52}
.D .pic .me img{width:100%;height:auto;margin-top:6px}
@media (max-width:767px){.dbl-a.D{padding:46px 20px 40px}.D .hd h2{font-size:32px}.D .dv{width:160px;margin-top:18px}.D .w{grid-template-columns:1fr;gap:40px;margin-top:30px}.D .pic{order:-1}.D .pic .me{width:104px;height:104px;right:-6px;bottom:-30px}
.D p{font-size:16.5px}.D .q{font-size:18px}.D .nums b{font-size:26px}.D .nums span{font-size:12.5px}.D .btn{flex:1}.dbl-a .media{gap:10px 20px}.dbl-a .media b{font-size:16px}}`;
const D_HTML = `<section class="dbl-a D"><div class="hd"><h2>הכירו את יקיר דבול</h2><div class="dv"></div></div><div class="w">
<div class="tx"><p class="q">"הדרך שלנו, ההצלחה שלכם."</p><p>${INTRO}</p>
<div class="nums"><div><b><em>+</em>100</b><span>עסקאות בכל שנה</span></div><div><b>4.9<em>★</em></b><span>73 ביקורות בגוגל</span></div><div><b>3</b><span>ועדות בלשכת עורכי הדין</span></div></div>
<div class="row"><a class="btn g" href="#">קראו עליי עוד</a><a class="btn o" href="#">דברו איתי</a><span class="sig">יקיר דבול</span></div></div>
<div class="pic"><a class="vid" href="#"><img src="https://i.ytimg.com/vi/${VID}/maxresdefault.jpg" alt=""><span class="pl">${IC.play}</span><span class="cap">צפו: היכרות עם המשרד (דקה)</span></a><div class="me"><img src="${M}cut-p1.webp" alt=""></div></div></div>
<div class="media"><small>כפי שהופיע ב:</small>${MEDIA.map((m) => `<b>${m}</b>`).join('')}</div></section>`;
// E: dark band, photo, areas of practice tiles, media strip
const E_CSS = `.dbl-a.E{background:linear-gradient(180deg,#0e1730 0,#141414 100%);color:#fff;padding:0 30px;overflow:hidden}
.E .w{max-width:1180px;margin:0 auto;display:grid;grid-template-columns:420px minmax(0,1fr);gap:60px;align-items:end;min-height:680px}
.E .ph{position:relative;height:640px;display:flex;justify-content:center;align-items:flex-end}.E .ph:before{content:"";position:absolute;bottom:0;width:420px;height:420px;border-radius:50%;border:1px solid rgba(231,205,150,.35);box-shadow:0 0 0 24px rgba(231,205,150,.06),0 0 0 48px rgba(231,205,150,.03)}
.E .ph img{position:relative;height:100%;width:auto}
.E .tx{padding:76px 0 60px}.E h2{font-size:44px;font-weight:500;margin:0;color:#fff}.E .ln{width:56px;height:3px;background:#c9a961;margin:20px 0 22px}
.E p{font-size:19px;line-height:1.75;color:#cfccc6;margin:0 0 26px}.E p a{color:#e7cd96}
.E .tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:0 0 28px}
.E .tile{display:flex;gap:12px;align-items:center;padding:14px 16px;border:1px solid rgba(231,205,150,.22);border-radius:14px;background:rgba(255,255,255,.03)}
.E .tile i{flex:0 0 42px;height:42px;border-radius:10px;background:rgba(231,205,150,.12);color:#e7cd96;display:flex;align-items:center;justify-content:center}.E .tile i svg{width:22px;height:22px}.E .tile b{font-size:16px;font-weight:600;color:#fff}.E .tile span{display:block;font-size:13.5px;color:#a9a6a0}
.E .row{display:flex;gap:12px;flex-wrap:wrap}.E .btn.o{background:transparent;color:#fff;border-color:#3a3a3a}
.E .media{border-top-color:rgba(255,255,255,.1)!important;margin:0!important;padding:22px 0 26px!important}.E .media b{color:#8f8c86!important}.E .media small{color:#8f8c86}
@media (max-width:767px){.dbl-a.E{padding:0 20px}.E .w{grid-template-columns:1fr;gap:0;min-height:0}.E .ph{height:400px;margin-top:36px}.E .ph:before{width:300px;height:300px}.E .tx{padding:26px 0 30px}.E h2{font-size:32px}.E p{font-size:16.5px}.E .tiles{grid-template-columns:1fr 1fr;gap:8px}.E .tile{flex-direction:column;align-items:flex-start;padding:12px}.E .btn{flex:1}}`;
const E_HTML = `<section class="dbl-a E"><div class="w"><div class="ph"><img src="${M}cut-p2.webp" alt=""></div><div class="tx"><h2>הכירו את יקיר דבול</h2><div class="ln"></div><p>${INTRO}</p>
<div class="tiles"><div class="tile"><i>${IC.home}</i><div><b>עסקאות מקרקעין</b><span>קנייה ומכירה, יד שנייה ומקבלן</span></div></div><div class="tile"><i>${IC.city}</i><div><b>התחדשות עירונית</b><span>ייצוג דיירים בפינוי בינוי ותמ״א</span></div></div>
<div class="tile"><i>${IC.tax}</i><div><b>מיסוי מקרקעין</b><span>מס שבח, מס רכישה והיטל השבחה</span></div></div><div class="tile"><i>${IC.shield}</i><div><b>חדלות פירעון</b><span>הסדר חובות ושיקום כלכלי</span></div></div></div>
<div class="row"><a class="btn g" href="#">קראו עליי עוד</a><a class="btn o" href="#">צפו בסרטון היכרות</a></div></div></div>
<div class="media"><small>כפי שהופיע ב:</small>${MEDIA.map((m) => `<b>${m}</b>`).join('')}</div></section>`;
// F: magazine: big photo panel with quote, timeline of how we work, media strip
const F_CSS = `.dbl-a.F{background:#fff;padding:80px 30px 70px}
.F .w{max-width:1160px;margin:46px auto 0;display:grid;grid-template-columns:minmax(0,1fr) 440px;gap:56px;align-items:stretch}
.F .card{position:relative;border-radius:22px;overflow:hidden;background:#141414;min-height:560px;display:flex;align-items:flex-end;justify-content:center}
.F .card img{position:absolute;bottom:0;left:50%;transform:translateX(-50%);height:96%;width:auto}
.F .card .q{position:relative;z-index:2;margin:0 18px 18px;background:rgba(20,20,20,.72);backdrop-filter:blur(6px);border:1px solid rgba(231,205,150,.35);border-radius:14px;padding:14px 16px;color:#fff;font-size:17px;line-height:1.5;width:calc(100% - 36px)}
.F .card .q b{color:#e7cd96;font-weight:600}
.F p{font-size:19px;line-height:1.75;color:#54595f;margin:0 0 22px}.F p a{color:#141414;font-weight:600;border-bottom:1px solid #e7cd96}
.F ol{list-style:none;margin:0 0 26px;padding:0;position:relative}.F ol:before{content:"";position:absolute;right:17px;top:8px;bottom:8px;width:2px;background:linear-gradient(#e7cd96,#f1e6cc)}
.F li{position:relative;display:flex;gap:16px;align-items:flex-start;padding:8px 0}.F li i{position:relative;z-index:1;flex:0 0 36px;height:36px;border-radius:50%;background:#fff;border:2px solid #e7cd96;color:#a8853f;font-style:normal;font-weight:700;display:flex;align-items:center;justify-content:center}
.F li b{display:block;font-size:17px;color:#141414;font-weight:600}.F li span{font-size:15px;color:#6b6b6b;line-height:1.5}
.F .row{display:flex;gap:12px;flex-wrap:wrap}
@media (max-width:767px){.dbl-a.F{padding:46px 20px 40px}.F .hd h2{font-size:32px}.F .dv{width:160px;margin-top:18px}.F .w{grid-template-columns:1fr;gap:28px;margin-top:30px}.F .card{min-height:430px;order:-1}.F p{font-size:16.5px}.F .btn{flex:1}}`;
const F_HTML = `<section class="dbl-a F"><div class="hd"><h2>הכירו את יקיר דבול</h2><div class="dv"></div></div><div class="w"><div class="tx"><p>${INTRO}</p>
<ol><li><i>1</i><div><b>שיחת היכרות</b><span>מבינים את העסקה, את הלוחות ואת הסיכונים.</span></div></li><li><i>2</i><div><b>בדיקות לפני חתימה</b><span>טאבו, היתרים, מיסוי ושמאות, יחד עם אנשי המקצוע.</span></div></li><li><i>3</i><div><b>הסכם וליווי עד הרישום</b><span>משא ומתן, חתימה, דיווח לרשויות ורישום בטאבו.</span></div></li></ol>
<div class="row"><a class="btn g" href="#">קראו עליי עוד</a><a class="btn o" href="#">דברו איתי</a></div></div>
<div class="card"><img src="${M}cut-p3.webp" alt=""><div class="q"><b>+100 עסקאות בשנה · 4.9★ ב-73 ביקורות בגוגל</b><br>חבר ועדות הקניין, המקרקעין וההתחדשות העירונית בלשכת עורכי הדין</div></div></div>
<div class="media"><small>כפי שהופיע ב:</small>${MEDIA.map((m) => `<b>${m}</b>`).join('')}</div></section>`;

/* ---------- run ---------- */
const b = await chromium.launch();
const prep = async (ctx) => { await ctx.route(M + '*', (r) => { const f = 'mock/' + r.request().url().split('/__mock/')[1]; r.fulfill({ status: 200, contentType: 'image/webp', body: fs.readFileSync(f) }); }); };
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  await prep(ctx);
  const p = await ctx.newPage(); await p.goto(S + '?o4=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(3000);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null);
  await p.addStyleTag({ content: '#dbl-cbar,.onetap-container-toggle,.elementor-element-094a351,.elementor-element-74d8bec,.elementor-element-844bd60,.dabul-gbadge{visibility:hidden!important}' });
  await p.addStyleTag({ content: SEAL_CSS + '@import url("https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&display=swap");' });
  await p.addStyleTag({ url: 'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&display=swap' }).catch(() => null);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(500);
  await p.screenshot({ path: `${OUT}/hero-${mode}-now.jpg`, type: 'jpeg', quality: 78 });
  // seals: placed next to the photo
  for (const k of ['s1', 's2', 's3']) {
    await p.evaluate(({ html, mode }) => {
      document.querySelector('.dbl-seal')?.remove();
      const hero = document.querySelector('.elementor-element-9056c3a'); hero.style.position = 'relative';
      hero.insertAdjacentHTML('beforeend', html); const s = hero.querySelector('.dbl-seal');
      if (mode === 'phone') { s.style.setProperty('--sz', '104px'); s.style.left = '150px'; s.style.bottom = '18px'; }
      else { const img = document.querySelector('.elementor-element-2c91460 img'); const r = img.getBoundingClientRect(), h = hero.getBoundingClientRect(); s.style.setProperty('--sz', '138px'); s.style.left = Math.round(r.right - h.left - 30) + 'px'; s.style.top = Math.round(r.top - h.top + r.height * 0.42) + 'px'; }
    }, { html: SEALS[k], mode });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${OUT}/hero-${mode}-${k}.jpg`, type: 'jpeg', quality: 80 });
  }
  await p.evaluate(() => document.querySelector('.dbl-seal')?.remove());
  await p.addStyleTag({ content: 'header.elementor-location-header,[data-elementor-type="header"]{display:none!important}' });
  // about sketches
  await p.evaluate(() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /הכירו את/.test(e.textContent)); let c = h; for (let i = 0; i < 8 && c.parentElement; i++) { c = c.parentElement; if (c.classList.contains('e-parent')) break; } c.id = 'dbl-old-about'; });
  for (const [k, css, html] of [['D', D_CSS, D_HTML], ['E', E_CSS, E_HTML], ['F', F_CSS, F_HTML]]) {
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
  await nf.screenshot({ path: `${OUT}/footer-${mode}.jpg`, type: 'jpeg', quality: 82 });
  // phone menu with the social row
  if (mode === 'phone') {
    await p.addStyleTag({ content: 'header.elementor-location-header,[data-elementor-type="header"]{display:block!important}' });
    await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(800);
    await p.locator('header a.elementor-icon[href*="off_canvas"]:visible, header .elementor-menu-toggle:visible').first().click().catch(() => null); await p.waitForTimeout(1500);
    await p.evaluate(({ SOC, SOC_LIST }) => {
      const all = [...document.querySelectorAll('.elementor-social-icons-wrapper')].filter((w) => w.getBoundingClientRect().width > 0 && w.getBoundingClientRect().top < innerHeight);
      const w = all[all.length - 1]; if (!w) return;
      const row = document.createElement('div'); row.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:16px;direction:rtl';
      row.innerHTML = '<div style="flex-basis:100%;text-align:center;font-size:14px;color:#6b6b6b;font-family:Noto Local,sans-serif">עקבו אחרינו</div>' + SOC_LIST.map(([k, t]) => `<a href="#" aria-label="${t}" style="width:42px;height:42px;border-radius:50%;border:1px solid #d9c18a;display:flex;align-items:center;justify-content:center;color:#a8853f"><span style="width:19px;height:19px;display:block">${SOC[k]}</span></a>`).join('');
      w.after(row);
    }, { SOC, SOC_LIST });
    await p.waitForTimeout(800);
    await p.screenshot({ path: `${OUT}/menu-phone-social.jpg`, type: 'jpeg', quality: 78 });
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
