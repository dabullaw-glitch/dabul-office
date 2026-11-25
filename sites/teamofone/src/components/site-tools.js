(function () {
  // Accessibility menu + cookie consent. Self built, no outside services. Settings live in localStorage (try/catch).
  var root = document.getElementById('sx'); if (!root) return;
  var html = document.documentElement, P = root.getAttribute('data-key') || 'site';
  var KA = P + '-a11y', KC = P + '-consent', VER = +(root.getAttribute('data-ver') || 1), MAXAGE = 365 * 864e5;
  function get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  function drop(k) { try { localStorage.removeItem(k); } catch (e) {} }
  function $(s, el) { return (el || root).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || root).querySelectorAll(s)); }

  /* skip link target: the first <main> on the page */
  var main = document.getElementById('main') || document.querySelector('main');
  var skip = document.querySelector('.sx-skip');
  if (main) { if (!main.id) main.id = 'main'; if (!main.hasAttribute('tabindex')) main.setAttribute('tabindex', '-1'); }
  else if (skip) skip.remove();

  /* ---------- accessibility menu ---------- */
  var A = get(KA) || {}, FL = ['hc', 'ul', 'rf', 'nm'];
  var btn = $('#sx-a11y-btn'), panel = $('#sx-a11y');
  function apply() {
    html.classList.toggle('a11y-t1', A.size === 1); html.classList.toggle('a11y-t2', A.size === 2);
    FL.forEach(function (k) { html.classList.toggle('a11y-' + k, !!A[k]); });
    $$('[data-a11y-size]').forEach(function (b) { b.setAttribute('aria-pressed', String((A.size || 0) === +b.getAttribute('data-a11y-size'))); });
    $$('[data-a11y]').forEach(function (b) { b.setAttribute('aria-pressed', String(!!A[b.getAttribute('data-a11y')])); });
    if (A.nm) $$('video[autoplay]', document).forEach(function (v) { try { v.pause(); } catch (e) {} });
  }
  function save() { var any = A.size || FL.some(function (k) { return A[k]; }); if (any) put(KA, A); else drop(KA); apply(); }
  function openA(o) {
    panel.hidden = !o; btn.setAttribute('aria-expanded', String(o));
    if (o) { var f = $('button', panel); if (f) f.focus(); }
  }
  if (btn && panel) {
    btn.addEventListener('click', function () { openA(panel.hidden); });
    $$('[data-a11y-size]').forEach(function (b) { b.addEventListener('click', function () { A.size = +b.getAttribute('data-a11y-size'); save(); }); });
    $$('[data-a11y]').forEach(function (b) { b.addEventListener('click', function () { var k = b.getAttribute('data-a11y'); A[k] = !A[k]; save(); }); });
    var rs = $('[data-a11y-reset]'); if (rs) rs.addEventListener('click', function () { A = {}; save(); });
    $$('[data-sx-close]', panel).forEach(function (b) { b.addEventListener('click', function () { openA(false); btn.focus(); }); });
    panel.addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); openA(false); btn.focus(); } });
    document.addEventListener('click', function (e) { if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) openA(false); });
    document.addEventListener('focusin', function (e) { if (!panel.hidden && !panel.contains(e.target) && e.target !== btn) openA(false); });
  }
  apply();

  /* ---------- cookie consent ---------- */
  var C = get(KC), ck = $('#sx-ck'), set = $('#sx-ck-set'), opener = null;
  function valid() { return !!(C && C.v === VER && C.date && (Date.now() - Date.parse(C.date)) < MAXAGE); }
  function activate() {
    // non essential tags wait as <script type="text/plain" data-consent="stats|marketing" data-src="..."> until allowed
    $$('script[type="text/plain"][data-consent]', document).forEach(function (s) {
      if (!valid() || !C[s.getAttribute('data-consent')] || s.getAttribute('data-done')) return;
      var n = document.createElement('script');
      if (s.getAttribute('data-src')) n.src = s.getAttribute('data-src'); else n.text = s.text;
      s.setAttribute('data-done', '1'); s.parentNode.insertBefore(n, s.nextSibling);
    });
  }
  function lift() { root.style.setProperty('--sx-ck-h', ck && !ck.hidden ? ck.offsetHeight + 'px' : '0px'); }
  function showCk(withSettings) {
    if (!ck) return;
    ck.hidden = false; root.classList.add('sx-ck-on');
    var st = $('[name="stats"]', ck), mk = $('[name="marketing"]', ck);
    if (st) st.checked = !!(valid() && C.stats); if (mk) mk.checked = !!(valid() && C.marketing);
    settings(!!withSettings); lift();
  }
  function settings(o) { if (!set) return; set.hidden = !o; var b = $('[data-ck="settings"]', ck); if (b) b.setAttribute('aria-expanded', String(o)); lift(); }
  function choose(stats, marketing) {
    var before = valid() ? C : null;
    C = { v: VER, date: new Date().toISOString(), necessary: true, stats: !!stats, marketing: !!marketing };
    put(KC, C); ck.hidden = true; root.classList.remove('sx-ck-on'); lift();
    var msg = $('#sx-ck-msg'); if (msg) msg.textContent = 'הבחירה נשמרה.';
    activate();
    try { document.dispatchEvent(new CustomEvent('consentchange', { detail: C })); } catch (e) {}
    // turning a category off takes effect on the next page load (scripts that already ran cannot be unloaded)
    if (before && ((before.stats && !C.stats) || (before.marketing && !C.marketing))) location.reload();
    else if (opener && document.contains(opener)) opener.focus();
    opener = null;
  }
  window.siteConsent = {
    get: function () { return valid() ? C : null; },
    has: function (cat) { return cat === 'necessary' || !!(valid() && C[cat]); },
    open: function () { showCk(true); }
  };
  if (ck) {
    $$('[data-ck]', ck).forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-ck');
        if (k === 'all') choose(true, true);
        else if (k === 'necessary') choose(false, false);
        else if (k === 'settings') settings(set.hidden);
        else if (k === 'save') choose($('[name="stats"]', ck).checked, $('[name="marketing"]', ck).checked);
      });
    });
    window.addEventListener('resize', lift);
    if (!valid()) showCk(false); else activate();
  }
  $$('[data-ck-open]', document).forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (!ck) return; e.preventDefault(); opener = a; showCk(true);
      var h = $('#sx-ck-h', ck); if (h) h.focus();
    });
  });
})();
