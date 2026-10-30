// marks the live strip for a close-up picture only (no change on the site)
(() => { document.querySelectorAll('body *').forEach((el) => { const cs = getComputedStyle(el); if (cs.position === 'fixed' && !el.closest('header')) el.style.visibility = 'hidden'; });
  const s = document.querySelector('.dnt-press'); if (s) s.setAttribute('data-shot', '1'); })();
