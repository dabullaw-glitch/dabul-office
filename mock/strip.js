// Sketch only: an "as published in" strip with the logos already on the press page, placed under the first section of
// the Netanya real estate page, marked with a dashed gold frame. Nothing is saved to the site.
(() => {
  const L = [
    ['רשת 13', 'https://dabullaw.co.il/wp-content/uploads/2026/06/רשת-13.jpg.webp'],
    ['ישראל היום', 'https://dabullaw.co.il/wp-content/uploads/2026/01/הורדה.png.webp'],
    ['מעריב', 'https://dabullaw.co.il/wp-content/uploads/2026/02/maariv.webp'],
    ['וואלה', 'https://dabullaw.co.il/wp-content/uploads/2025/12/walla.jpg.webp'],
    ['ביזפורטל', 'https://dabullaw.co.il/wp-content/uploads/2026/10/logo-bizportal.jpg.webp'],
    ['ערוץ 7', 'https://dabullaw.co.il/wp-content/uploads/2026/01/images.png'],
  ];
  const doc = document.querySelector('[data-elementor-type="wp-page"], [data-elementor-type="single-page"], main') || document.body;
  const firstSec = doc.querySelector(':scope > .e-parent, :scope > section, :scope > .elementor-section') || doc.firstElementChild;
  const ff = getComputedStyle(document.body).fontFamily;
  const s = document.createElement('section');
  s.setAttribute('aria-label', 'כפי שפורסם ב');
  s.style.cssText = `direction:rtl;font-family:${ff};background:#fff;padding:26px 16px`;
  s.innerHTML = `<div style="max-width:1180px;margin:0 auto;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:18px 30px">
    <span style="font-size:15px;font-weight:700;color:#6b665c;letter-spacing:.3px">כפי שפורסם ב</span>
    ${L.map(([n, src]) => `<img src="${src}" alt="${n}" style="height:44px;width:auto;border-radius:6px;padding:4px;background:#fff;filter:grayscale(1);opacity:.75">`).join('')}
    <a href="/מהתקשורת/" style="font-size:15px;font-weight:700;color:#141414;text-decoration:underline;text-decoration-color:#C5A25A;text-underline-offset:4px">לכל הכתבות</a>
  </div>`;
  firstSec.after(s);
  s.style.outline = '2px dashed #C5A25A'; s.style.outlineOffset = '-6px';
  s.setAttribute('data-shot', '1');
})();
