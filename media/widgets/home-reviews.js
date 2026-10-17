/* home-reviews.js: "לקוחות ממליצים" on the home page (11.10.2026, Yakir).
   A carousel of Google reviews with arrows and dots, plus the Google and LawReviews ratings.
   Mount: <div class="dbr" data-src="https://.../functions/v1/reviews" data-json='{...}'></div>
   data-json (optional) is the copy the server already has, so the section shows at once; data-src then brings the
   newest reviews (the "reviews" function refreshes them from Google every day). No cookies, no outside script. */
(function () {
  'use strict';
  var STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z"/></svg>';
  var G = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
  var GAVEL = '<svg viewBox="0 0 24 24" fill="none" stroke="#2F9BDB" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13.5 4.5l6 6M11 7l6 6M12.2 5.8l-4.6 4.6M18.2 11.8l-4.6 4.6M9.8 13.8L3.6 20"/><path d="M14 20h7"/></svg>';
  var ARW = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>'; };
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function stars(n) { var s = ''; for (var i = 0; i < Math.round(n || 5); i++) s += STAR; return '<span class="dbr-stars" role="img" aria-label="' + (n || 5) + ' כוכבים">' + s + '</span>'; }
  function num(n) { return (Math.round((+n || 0) * 10) / 10).toFixed(1); }
  function ago(iso) {
    var t = Date.parse(iso); if (!t) return '';
    var d = Math.max(0, Math.floor((Date.now() - t) / 864e5));
    if (d < 1) return 'היום'; if (d === 1) return 'אתמול'; if (d < 7) return 'לפני ' + d + ' ימים';
    var w = Math.floor(d / 7); if (d < 30) return w === 1 ? 'לפני שבוע' : w === 2 ? 'לפני שבועיים' : 'לפני ' + w + ' שבועות';
    var m = Math.floor(d / 30.4); if (m < 12) return m <= 1 ? 'לפני חודש' : m === 2 ? 'לפני חודשיים' : 'לפני ' + m + ' חודשים';
    var y = Math.floor(d / 365); return y <= 1 ? 'לפני שנה' : y === 2 ? 'לפני שנתיים' : 'לפני ' + y + ' שנים';
  }
  function badge(cls, href, logo, n, label, sub) {
    return '<a class="dbr-badge ' + cls + '" href="' + esc(href) + '" target="_blank" rel="noopener nofollow"><span class="dbr-logo">' + logo + '</span><span class="dbr-num">' + num(n) + '</span>' +
      '<span class="dbr-meta">' + stars(5) + '<b>' + esc(label) + '</b><small>' + esc(sub) + '</small></span></a>';
  }
  function card(r, i) {
    var first = String(r.name || '?').trim().charAt(0);
    var av = r.photo ? '<img class="dbr-av" src="' + esc(r.photo) + '" alt="" width="46" height="46" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.outerHTML=\'<span class=dbr-av>' + esc(first) + '</span>\'">' : '<span class="dbr-av">' + esc(first) + '</span>';
    return '<li class="dbr-card"><div class="dbr-who">' + av + '<div class="dbr-nm"><b><bdi>' + esc(r.name) + '</bdi></b><small>' + esc(r.ago_he || ago(r.at)) + '</small></div></div>' +
      '<div class="dbr-rate">' + stars(r.rating) + '</div><p class="dbr-txt">' + esc(r.text) + '</p><button type="button" class="dbr-more" hidden>קרא עוד</button>' +
      '<div class="dbr-src"><span>' + G + 'ביקורת בגוגל</span></div></li>';
  }
  function build(root, d) {
    var g = d.google || {}, lw = d.lawreviews || {}, list = (g.reviews || []).filter(function (r) { return r && r.text && (r.rating || 5) >= 4; });
    if (!list.length) return false;
    var top = '<div class="dbr-top">' +
      (g.rating ? badge('gg', g.url || 'https://www.google.com/maps', G, g.rating, (g.count || '') + ' ביקורות בגוגל', 'דירוג המשרד בגוגל') : '') +
      (lw.rating ? badge('lw', lw.url || 'https://www.lawreviews.co.il/', GAVEL, lw.rating, (lw.count || '') + ' חוות דעת ב-LawReviews', 'דירוג המשרד ב-LawReviews') : '') + '</div>';
    root.innerHTML = top + '<div class="dbr-vp"><button type="button" class="dbr-arw dbr-prev" aria-label="הביקורת הקודמת">' + ARW('M9 6l6 6-6 6') + '</button>' +
      '<ul class="dbr-track" tabindex="0" aria-label="ביקורות לקוחות">' + list.map(card).join('') + '</ul>' +
      '<button type="button" class="dbr-arw dbr-next" aria-label="הביקורת הבאה">' + ARW('M15 6l-6 6 6 6') + '</button></div><div class="dbr-dots"></div>' +
      '<p class="dbr-note">ביקורות שלקוחות המשרד פרסמו בגוגל. כל מקרה שונה.</p>';
    wire(root);
    return true;
  }
  function wire(root) {
    var tr = root.querySelector('.dbr-track'), prev = root.querySelector('.dbr-prev'), next = root.querySelector('.dbr-next'), dots = root.querySelector('.dbr-dots');
    var cards = tr.children;
    // "read more" only where the text is cut
    Array.prototype.forEach.call(cards, function (c) {
      var p = c.querySelector('.dbr-txt'), b = c.querySelector('.dbr-more');
      if (p.scrollHeight > p.clientHeight + 4) b.hidden = false;
      b.addEventListener('click', function () { var o = c.classList.toggle('open'); b.textContent = o ? 'פחות' : 'קרא עוד'; stop(); });
    });
    function step() { var c = cards[0]; if (!c) return 300; var g = parseFloat(getComputedStyle(tr).columnGap || getComputedStyle(tr).gap) || 0; return c.getBoundingClientRect().width + g; }
    function per() { return Math.max(1, Math.round(tr.clientWidth / step())); }
    function pos() { return Math.abs(tr.scrollLeft); }
    function max() { return tr.scrollWidth - tr.clientWidth; }
    function go(dir) { tr.scrollBy({ left: (getComputedStyle(tr).direction === 'rtl' ? -1 : 1) * dir * step() * (per() > 2 ? per() - 1 : 1), behavior: 'smooth' }); }
    function pages() { return Math.max(1, Math.ceil((cards.length - per()) / Math.max(1, per() - (per() > 2 ? 1 : 0))) + 1); }
    var nP = 0;
    function drawDots() {
      nP = pages(); var h = '';
      for (var i = 0; i < nP; i++) h += '<button type="button" aria-label="קבוצה ' + (i + 1) + '"></button>';
      dots.innerHTML = h;
      Array.prototype.forEach.call(dots.children, function (b, i) { b.addEventListener('click', function () { var s = Math.round(i * (max() / Math.max(1, nP - 1))); tr.scrollTo({ left: (getComputedStyle(tr).direction === 'rtl' ? -s : s), behavior: 'smooth' }); stop(); }); });
      sync();
    }
    function sync() {
      var p = pos(), m = max();
      prev.disabled = p < 4; next.disabled = p > m - 4;
      var a = m > 0 ? Math.round(p / m * (nP - 1)) : 0;
      Array.prototype.forEach.call(dots.children, function (b, i) { b.classList.toggle('on', i === a); if (i === a) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    }
    prev.addEventListener('click', function () { go(-1); stop(); });
    next.addEventListener('click', function () { go(1); stop(); });
    tr.addEventListener('keydown', function (e) { if (e.key === 'ArrowLeft') { go(1); stop(); } if (e.key === 'ArrowRight') { go(-1); stop(); } });
    var raf = 0; tr.addEventListener('scroll', function () { cancelAnimationFrame(raf); raf = requestAnimationFrame(sync); }, { passive: true });
    window.addEventListener('resize', function () { clearTimeout(drawDots.t); drawDots.t = setTimeout(drawDots, 150); });
    // gentle autoplay while visible, until the visitor touches the carousel
    var timer = 0, seen = false, stopped = false;
    function tick() { if (stopped || !seen || document.hidden) return; if (pos() > max() - 4) tr.scrollTo({ left: 0, behavior: 'smooth' }); else go(1); }
    function stop() { stopped = true; clearInterval(timer); }
    if (!window.matchMedia || !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      timer = setInterval(tick, 6500);
      ['pointerdown', 'wheel', 'touchstart', 'focusin'].forEach(function (ev) { root.addEventListener(ev, stop, { passive: true }); });
      root.addEventListener('mouseenter', function () { seen = false; }); root.addEventListener('mouseleave', function () { seen = true; });
      if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; }, { threshold: .4 }).observe(root); else seen = true;
    }
    drawDots();
  }
  function start(root) {
    if (root.__dbr) return; root.__dbr = 1;
    var have = false;
    try { var j = root.getAttribute('data-json'); if (j) have = build(root, JSON.parse(j)); } catch (e) { /* ignore */ }
    var src = root.getAttribute('data-src');
    if (src && !root.hasAttribute('data-static')) fetch(src, { credentials: 'omit' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || !d.google) return;
      var L = (d.google.reviews || []).filter(function (r) { return r && r.text && (r.rating || 5) >= 4; });
      var cur = root.querySelector('.dbr-card bdi'), old = root.querySelectorAll('.dbr-card').length;
      if (!have || L.length !== old || (L[0] && cur && cur.textContent !== L[0].name)) build(root, d);
    }).catch(function () { /* the copy from the server stays */ });
  }
  // 17.10.2026: the carousel is built only when it comes near the screen, so it does not slow down the first view of the page
  function all() {
    var els = document.querySelectorAll('.dbr');
    if (!('IntersectionObserver' in window)) { Array.prototype.forEach.call(els, function (el) { start(el); }); return; }
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); start(e.target); } }); }, { rootMargin: '600px 0px' });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', all); else all();
})();
