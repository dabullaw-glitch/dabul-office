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
    const d = document.createElement('div');
    d.innerHTML = `<div style="font-size:14px;opacity:.75;margin:8px 0 4px">${D[k][0]}</div><p style="margin:0;font-size:16px;line-height:1.55;font-weight:400">${D[k][1]}</p>`;
    d.style.cssText = `color:${hc.color};font-family:${hc.fontFamily}`;
    t.after(d); mark(d);
    if (!first) first = box;
  });
  // close-up of the first row of cards
  if (first) { const grid = first.closest('.elementor-loop-container') || first.parentElement; grid.setAttribute('data-shot', '2'); }
})();
