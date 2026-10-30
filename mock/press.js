// Sketch only: shows on the live page what would be ADDED, marked with a dashed gold frame. Nothing is saved to the site.
(() => {
  const D = {
    'emess.co.il/rec/1916011': ['16.8.2026', 'למה דיירים בהתחדשות עירונית בנתניה צריכים ייצוג משפטי משלהם.'],
    'bizportal.co.il': ['7.7.2026', 'בדיקות לפני העסקה ותכנון מוקדם, ולמה הם חוסכים הפתעות.'],
    '13tv.co.il': ['2.6.2026', 'איך ליווי משפטי הופך עסקת נדל״ן לברורה ובטוחה יותר.'],
    'bhol.co.il': ['13.4.2026', 'שלבי רכישת דירה מקבלן, צעד אחר צעד.'],
    'maariv.co.il': ['19.2.2026', 'טכנולוגיה עוזרת, אבל לא מחליפה ליווי משפטי בעסקת נדל״ן.'],
    'rotter.net': ['12.2.2026', 'איך בוחרים עורך דין נדל״ן לפני שקונים דירה.'],
    'israelhayom.co.il': ['29.1.2026', 'הדרך של משפחה מהחובות ועד המפתח לדירה חדשה.'],
    'news08.net': ['17.1.2026', 'למה לא כדאי לחתום מול יזמים בלי בדיקה מסודרת.'],
    'inn.co.il': ['14.1.2026', 'מאמר שכתבתי על שלבי רכישת דירה, מהבדיקות ועד הרישום בטאבו.'],
    'mynet.co.il': ['5.1.2026', 'למה כדאי עורך דין מקרקעין מקומי כשקונים דירה בנתניה.'],
    'walla.co.il': ['29.12.2025', 'ליווי משפטי מוקדם ובדיקות מעמיקות בכל עסקה.'],
    'psakdin.co.il': ['13.4.2021', 'מאמר שכתבתי על פסק דין שבו נדחתה בקשת הפטר.'],
  };
  // floating buttons (call / WhatsApp / accessibility) hidden in the pictures only, so they don't cover the additions
  document.querySelectorAll('body *').forEach((el) => { const cs = getComputedStyle(el); if (cs.position === 'fixed' && !el.closest('header')) el.style.visibility = 'hidden'; });
  const mark = (el) => { el.style.outline = '2px dashed #C5A25A'; el.style.outlineOffset = '4px'; el.style.borderRadius = '6px'; };
  // 1. opening paragraph under the page title
  const h1 = document.querySelector('h1');
  if (h1) {
    const w = h1.closest('.elementor-widget') || h1;
    const cs = getComputedStyle(h1);
    const p = document.createElement('p');
    p.textContent = 'עו״ד יקיר דבול כותב ומסביר בכלי התקשורת על קניית דירה, מכירת דירה, בדיקות לפני חתימה והתחדשות עירונית. כאן תמצאו את הכתבות, מהחדשה לישנה.';
    p.style.cssText = `margin:14px 0 0;max-width:760px;font-family:${cs.fontFamily};font-size:18px;line-height:1.65;color:${cs.color};opacity:.85;text-align:${cs.textAlign}`;
    w.after(p); mark(p); p.setAttribute('data-shot', '1');
  }
  // 2. date + one line in each card, under the headline
  let first = null;
  document.querySelectorAll('[data-column-clickable]').forEach((box) => {
    const u = box.getAttribute('data-column-clickable') || '';
    const k = Object.keys(D).find((x) => u.includes(x)); if (!k) return;
    const t = box.querySelector('.elementor-element-a245260') || box.querySelector('h2,h3');
    if (!t) return;
    const hc = getComputedStyle(t.querySelector('.elementor-heading-title') || t);
    // the date joins the existing small line "המשרד בתקשורת", so it adds no height
    const info = box.querySelector('.elementor-element-26ed915 .elementor-post-info__terms-list, .elementor-element-26ed915 .elementor-icon-list-text');
    if (info) { const dt = document.createElement('span'); dt.textContent = ' · ' + D[k][0]; info.appendChild(dt); mark(dt); }
    // one short line under the headline, readable over the photo
    const d = document.createElement('p');
    d.textContent = D[k][1];
    d.style.cssText = `margin:10px 0 0;font-size:16px;line-height:1.5;font-weight:500;color:${hc.color};font-family:${hc.fontFamily};text-shadow:0 1px 3px rgba(0,0,0,.75)`;
    t.after(d); mark(d);
    // the card grows a little instead of hiding the new line
    for (let el = box; el && el !== document.body; el = el.parentElement) { if (el === box || el.classList.contains('e-con-inner')) { el.style.height = 'auto'; } }
    box.querySelectorAll('.e-con-inner').forEach((x) => { x.style.height = 'auto'; });
    box.style.minHeight = box.offsetHeight + 'px'; box.style.height = 'auto';
    if (!first) first = box;
  });
  // close-up of the first row of cards
  if (first) { const grid = first.closest('.elementor-loop-container') || first.parentElement; grid.setAttribute('data-shot', '2'); }
})();
