// Footer mockup: the top form stays; the dark part below it is replaced by the proposed layout. Desktop + phone.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
const OUT = 'diag-results/foot'; fs.mkdirSync(OUT, { recursive: true });
const S = 'https://dabullaw.co.il/';
const L = (p) => S + p + '/';
const COLS = [
  ['המשרד', [['אודות המשרד', L('אודות-המשרד')], ['תעודות והסמכות', L('תעודות-והסמכות-עו״ד-יקיר-דבול')], ['המלצות לקוחות', L('המלצות')], ['המשרד בתקשורת', S + 'category/press/'], ['סיפורי מקרה', S + 'category/סיפורי-מקרה/'], ['מידע משפטי', L('מידע-משפטי')], ['טפסים וקישורים', L('קישורים-וטפסים')]]],
  ['קונים דירה', [['רכישת דירה יד שנייה', L('מדריך-מקיף-לרכישת-דירה-יד-שניה')], ['קניית דירה מקבלן', L('המדריך-המלא-לרכישת-דירה-מקבלן-2026')], ['קניית דירה על הנייר', L('קניה-מקבלן')], ['בדיקות לפני קנייה', L('בדיקות-מקדמיות-לפני-רכישת-דירה-2')], ['זיכרון דברים', L('זיכרון-דברים-המפית-הכי-יקרה-שתחתמו-עלי')], ['עריכת הסכם מכר', L('עריכת-הסכם-מקרקעין')], ['איחור במסירה מקבלן', L('איחור-במסירת-דירה-מקבלן')], ['קנייה מכונס נכסים', L('קניית-דירה-מכונס-נכסים-הזדמנות-פז-או-הר')]]],
  ['מוכרים דירה', [['עורך דין למכירת דירה', '#'], ['היטל השבחה', L('שאלות-נפוצות-היטל-השבחה')], ['העברה ללא תמורה במשפחה', L('העברה-ללא-תמורה-עסקת-מתנה-במשפחה-המדר')], ['הפרת חוזה מכר', L('הפרת-חוזה-מכר-דירה')], ['קנייה ומכירה לתושבי חוץ', L('המדריך-לתושבי-חוץ-איך-לקנות-ולמכור-נד')]]],
  ['התחדשות ומיסוי', [['עורך דין פינוי בינוי', L('התחדשות-עירונית')], ['דיירים סרבנים', L('הדייר-הסרבן-המדריך-המשפטי-המלא-להתמוד')], ['מס רכישה', L('המדריך-למס-רכישה-2025-כמה-תשלמו-למדינה-ואי')], ['חישוב מס שבח', L('תכנון-מס-וליווי-במיסוי-מקרקעין-שבח-רכי')], ['הקטנת מס שבח', L('דרכים-חוקיות-להפחתת-מס-שבח-ומיסוי')], ['מיסוי דירת ירושה', L('אתם-שואלים-עוד-יקיר-דבול-עונה-המדריך-2')]]],
];
const IC = {
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  tel: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.2 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.8s.7-2 .9-2.3c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.5.3.1.2.1.6-.1 1.2z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H8v4h2v8h4v-8h3l1-4h-4V8z"/></svg>',
  waze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 15a7 7 0 1 1 14-1c0 2.5-1.5 4-4 5H9c-1 0-2 .6-2.5 1.3"/><circle cx="9.5" cy="11" r=".9" fill="currentColor"/><circle cx="14.5" cy="11" r=".9" fill="currentColor"/><path d="M10 14c1 .8 3 .8 4 0"/><circle cx="8" cy="20" r="1.6"/><circle cx="16" cy="20" r="1.6"/></svg>',
};
const CSS = `.dbl-foot{--g:#c9a961;--g2:#e4d19c;--bg:#111214;--bg2:#1a1c20;--tx:#c9c6bf;--mut:#8d8a83;background:var(--bg);color:var(--tx);direction:rtl;font-family:inherit;padding:44px 24px 0}
.dbl-foot *{box-sizing:border-box}.dbl-foot a{color:inherit;text-decoration:none}.dbl-foot a:hover{color:var(--g2)}
.dbl-foot .in{max-width:1240px;margin:0 auto}
.dbl-foot .top{display:flex;align-items:center;justify-content:space-between;gap:24px;padding-bottom:28px;border-bottom:1px solid #2a2c31;flex-wrap:wrap}
.dbl-foot .brand{display:flex;align-items:center;gap:18px}.dbl-foot .brand img{height:64px;width:auto}
.dbl-foot .brand p{margin:0;font-size:15px;color:var(--mut);max-width:330px;line-height:1.6}
.dbl-foot .soc{display:flex;gap:10px}.dbl-foot .soc a{width:44px;height:44px;border-radius:50%;border:1px solid #3a3c42;display:flex;align-items:center;justify-content:center;color:var(--g2)}.dbl-foot .soc svg{width:20px;height:20px}
.dbl-foot .grid{display:grid;grid-template-columns:repeat(4,1fr) 1.25fr;gap:28px;padding:32px 0}
.dbl-foot h4{color:#fff;font-size:17px;font-weight:800;margin:0 0 14px;padding-bottom:10px;border-bottom:2px solid var(--g);display:inline-block}
.dbl-foot ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:9px;font-size:15px}
.dbl-foot .ct li{display:flex;gap:10px;align-items:flex-start;line-height:1.5}.dbl-foot .ct svg{width:18px;height:18px;flex:0 0 18px;color:var(--g);margin-top:2px}
.dbl-foot .ct small{display:block;color:var(--mut);font-size:13.5px}
.dbl-foot .nav{display:flex;gap:10px;margin-top:16px;flex-wrap:wrap}.dbl-foot .nav a{flex:1;min-width:120px;height:42px;border-radius:10px;border:1px solid #3a3c42;display:flex;align-items:center;justify-content:center;gap:8px;font-size:14.5px;font-weight:700;color:#fff}.dbl-foot .nav svg{width:18px;height:18px;color:var(--g2)}
.dbl-foot .band{display:flex;align-items:center;justify-content:space-between;gap:16px;background:var(--bg2);border:1px solid #2a2c31;border-radius:14px;padding:16px 20px;flex-wrap:wrap}
.dbl-foot .band b{color:#fff;font-size:16px}.dbl-foot .band span{color:var(--mut);font-size:14.5px;margin-inline-start:8px}
.dbl-foot .band a.j{display:inline-flex;align-items:center;gap:8px;background:#25d366;color:#fff;border-radius:10px;height:42px;padding:0 18px;font-weight:800}.dbl-foot .band a.j svg{width:18px;height:18px}
.dbl-foot .areas{display:flex;align-items:center;gap:10px 16px;flex-wrap:wrap;padding:22px 0;font-size:14.5px;color:var(--mut)}.dbl-foot .areas b{color:#fff}.dbl-foot .areas a{color:var(--tx)}.dbl-foot .areas i{font-style:normal;color:#3a3c42}
.dbl-foot .badge{display:flex;align-items:center}.dbl-foot .badge img{height:56px;width:auto}
.dbl-foot .legal{border-top:1px solid #2a2c31;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:16px 0 18px;font-size:13.5px;color:var(--mut)}.dbl-foot .legal nav{display:flex;gap:16px;flex-wrap:wrap}
.dbl-foot .legal p{margin:0}.dbl-foot .cap{font-size:12px;color:#6d6a64;padding-bottom:18px;margin:0}
.dbl-foot details{border:0}.dbl-foot summary{list-style:none;cursor:pointer}.dbl-foot summary::-webkit-details-marker{display:none}
@media (min-width:768px){.dbl-foot details>summary{pointer-events:none}}
@media (max-width:767px){.dbl-foot{padding:30px 16px 0}.dbl-foot .top{flex-direction:column;align-items:flex-start;gap:18px}.dbl-foot .brand img{height:52px}
.dbl-foot .grid{grid-template-columns:1fr;gap:0;padding:18px 0}.dbl-foot .grid>.ct{order:-1;padding-bottom:18px;margin-bottom:6px;border-bottom:1px solid #2a2c31}
.dbl-foot details{border-bottom:1px solid #2a2c31}.dbl-foot details h4{border:0;padding:14px 0;margin:0;display:flex;justify-content:space-between;width:100%;font-size:16px}
.dbl-foot details h4:after{content:"+";color:var(--g2);font-weight:400;font-size:22px;line-height:1}.dbl-foot details[open] h4:after{content:"−"}
.dbl-foot details ul{padding:0 0 16px}.dbl-foot .legal{flex-direction:column}}`;
const footHTML = (logo, mart) => `<style>${CSS}</style><footer class="dbl-foot" id="dbl-foot-mock"><div class="in">
<div class="top"><div class="brand"><img src="${logo}" alt="יקיר דבול משרד עורכי דין"><p>משרד עורכי דין לדיני מקרקעין ונדל״ן. רזיאל 1, נתניה.</p></div>
<div class="soc"><a href="#" aria-label="טלפון">${IC.tel}</a><a href="#" aria-label="וואטסאפ">${IC.wa}</a><a href="#" aria-label="מייל">${IC.mail}</a><a href="#" aria-label="פייסבוק">${IC.fb}</a><a href="#" aria-label="Waze">${IC.waze}</a></div></div>
<div class="grid">${COLS.map(([h, ls], i) => `<details${i === 0 ? '' : ''} open><summary><h4>${h}</h4></summary><ul>${ls.map(([t, u]) => `<li><a href="${u}">${t}</a></li>`).join('')}</ul></details>`).join('')}
<div class="ct"><h4>יצירת קשר</h4><ul><li>${IC.pin}<span>רזיאל 1, נתניה (קומת כניסה)</span></li><li>${IC.tel}<span>09-8613413</span></li><li>${IC.wa}<span>050-5580189 (וואטסאפ)</span></li><li>${IC.mail}<span>dabullaw@gmail.com</span></li><li>${IC.clock}<span>א׳ עד ה׳ 9:00 עד 18:00<small>ו׳ ושבת: סגור</small></span></li></ul>
<div class="nav"><a href="#">${IC.waze} נווטו ב-Waze</a><a href="#">${IC.pin} Google Maps</a></div></div></div>
<div class="band"><div><b>יש לכם שאלות?</b><span>הצטרפו לקבוצת הוואטסאפ של המשרד: עדכונים ותשובות בנושאי נדל״ן.</span></div><a class="j" href="#">${IC.wa} להצטרפות</a></div>
<div class="areas"><b>אזורי שירות:</b><a href="#">נתניה</a><i>|</i><a href="#">הרצליה</a><i>|</i><a href="#">חדרה</a><i>|</i><a href="#">כפר יונה</a><i>|</i><a href="#">English</a><i>|</i><a href="#">Français</a>${mart ? `<span class="badge" style="margin-inline-start:auto"><img src="${mart}" alt="מרטינדייל"></span>` : ''}</div>
<div class="legal"><p>© כל הזכויות שמורות ליקיר דבול, משרד עורכי דין</p><nav><a href="#">מדיניות פרטיות</a><a href="#">הצהרת נגישות</a><a href="#">מפת אתר</a></nav></div>
<p class="cap">אתר זה מוגן על ידי reCAPTCHA, ומדיניות הפרטיות ותנאי השירות של Google חלים עליו.</p></div></footer>`;
const b = await chromium.launch(); const rep = {};
for (const mode of ['desktop', 'phone']) {
  const ctx = mode === 'phone' ? await b.newContext({ ...devices['iPhone 13'], locale: 'he-IL' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, locale: 'he-IL' });
  const p = await ctx.newPage(); await p.goto(S + '?fm=' + Date.now(), { waitUntil: 'load', timeout: 90000 }); await p.waitForTimeout(2500);
  await p.evaluate(() => { const x = [...document.querySelectorAll('button,a')].find((e) => /הבנתי/.test(e.textContent || '')); if (x) x.click(); }).catch(() => null);
  await p.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight)); await p.waitForTimeout(2500);
  const f = p.locator('[data-elementor-type="footer"]').first();
  await f.screenshot({ path: `${OUT}/before-${mode}.jpg`, type: 'jpeg', quality: 70 });
  rep[mode] = await p.evaluate(({ html }) => {
    const f = document.querySelector('[data-elementor-type="footer"]');
    const logo = (f.querySelector('.elementor-element-35de91f img') || {}).currentSrc || '';
    const mart = (f.querySelector('.elementor-element-5d367c3 img') || {}).currentSrc || '';
    const tops = [...f.children].filter((e) => e.classList.contains('elementor-element') || e.classList.contains('e-con'));
    const formBox = tops.find((e) => e.querySelector('.elementor-element-0647149'));
    tops.forEach((e) => { if (e !== formBox) e.style.display = 'none'; });
    formBox.insertAdjacentHTML('afterend', html(logo, mart));
    for (const el of document.querySelectorAll('body *')) { const s = getComputedStyle(el); if (s.position === 'fixed' && !el.closest('header') && !el.closest('#dbl-cbar')) el.style.setProperty('visibility', 'hidden', 'important'); }
    return { tops: tops.length, logo, mart };
  }, { html: null }).catch((e) => ({ err: String(e) }));
  if (rep[mode].err) { // functions can't be passed; inject by string instead
    const info = await p.evaluate(() => { const f = document.querySelector('[data-elementor-type="footer"]'); return { logo: (f.querySelector('.elementor-element-35de91f img') || {}).currentSrc || '', mart: (f.querySelector('.elementor-element-5d367c3 img') || {}).currentSrc || '' }; });
    rep[mode] = await p.evaluate((h) => { const f = document.querySelector('[data-elementor-type="footer"]'); const tops = [...f.children]; const formBox = tops.find((e) => e.querySelector('.elementor-element-0647149')); tops.forEach((e) => { if (e !== formBox) e.style.display = 'none'; }); formBox.insertAdjacentHTML('afterend', h); for (const el of document.querySelectorAll('body *')) { const s = getComputedStyle(el); if (s.position === 'fixed' && !el.closest('header') && !el.closest('#dbl-cbar')) el.style.setProperty('visibility', 'hidden', 'important'); } return { tops: tops.length }; }, footHTML(info.logo, info.mart));
  }
  await p.waitForTimeout(1500);
  if (mode === 'phone') await p.evaluate(() => { document.querySelectorAll('#dbl-foot-mock details').forEach((d, i) => { if (i > 0) d.removeAttribute('open'); }); });
  await p.locator('#dbl-foot-mock').screenshot({ path: `${OUT}/after-${mode}.jpg`, type: 'jpeg', quality: 80 });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/rep.json`, JSON.stringify(rep, null, 1)); await b.close();
