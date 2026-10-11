/* svc-app.js: the order form of the online legal services on dabullaw.co.il (dabul-widget).
   One engine for every service. The service definitions (questions, prices, documents) come from svc-config.json,
   the same file the server uses to recompute the price, so the page and the server always agree.
   Mount: <div class="svc-app" data-svc="poa" data-cfg="...svc-config.json" data-fn="https://.../functions/v1/services"></div>
   Without data-fn the form runs in preview mode (nothing is sent). Built 10.10.2026 for Yakir's approval. */
(function () {
  'use strict';
  var ROOTS = document.querySelectorAll('.svc-app');
  if (!ROOTS.length) return;
  var CFG_CACHE = {};
  function loadCfg(url) {
    if (!CFG_CACHE[url]) CFG_CACHE[url] = fetch(url, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('cfg'); return r.json(); });
    return CFG_CACHE[url];
  }
  Array.prototype.forEach.call(ROOTS, function (root) {
    var cfgUrl = root.getAttribute('data-cfg');
    loadCfg(cfgUrl).then(function (cfg) { start(root, cfg); }).catch(function () {
      root.innerHTML = '<div class="sv-err">הטופס לא נטען. אפשר להתקשר למשרד: <a href="tel:098613413">09-8613413</a></div>';
    });
  });

  // ---------- where the visitor came from (11.10.2026) ----------
  // Kept in this browser: the first visit's source (kept 90 days) and the latest outside source, plus the page that
  // led here. Sent with the order so the office knows which channel and which article brought each sale.
  var SRC_KEY = 'dabul_src_v1';
  function readSrc() {
    var o = {}; try { o = JSON.parse(localStorage.getItem(SRC_KEY) || '{}') || {}; } catch (e) { o = {}; }
    var q = new URLSearchParams(location.search), ref = document.referrer || '', ext = ref && ref.indexOf(location.host) < 0;
    var hasUtm = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid', 'fbclid'].some(function (k) { return q.get(k); });
    if (hasUtm || ext || !o.first) {
      var v = { ref: ext ? ref.slice(0, 200) : '', landing: location.href.split('#')[0].slice(0, 300), at: new Date().toISOString() };
      ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'].forEach(function (k) { if (q.get(k)) v[k] = q.get(k).slice(0, 120); });
      var old = o.first && o.first.at && (Date.now() - Date.parse(o.first.at)) < 90 * 864e5;
      if (!old) o.first = v;
      if (hasUtm || ext) o.last = v;
    }
    if (ref && !ext) o.from = ref.split('#')[0].slice(0, 300);
    try { localStorage.setItem(SRC_KEY, JSON.stringify(o)); } catch (e) { /* ignore */ }
    return o;
  }
  var SRC = readSrc();

  // ---------- small helpers ----------
  var nf = new Intl.NumberFormat('he-IL', { maximumFractionDigits: 0 });
  var nf2 = new Intl.NumberFormat('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  var nfc = new Intl.NumberFormat('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  function ils(n) { var r = Math.round(n * 100) / 100; return (r % 1 ? nfc : nf).format(r) + ' ₪'; }
  function nFiles(n) { return n === 1 ? 'קובץ אחד' : n + ' קבצים'; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function digits(s) { return String(s || '').replace(/\D/g, ''); }
  function idOk(v) { var d = digits(v); if (d.length < 5 || d.length > 9) return false; d = ('000000000' + d).slice(-9); var s = 0; for (var i = 0; i < 9; i++) { var x = +d[i] * ((i % 2) + 1); s += x > 9 ? x - 9 : x; } return s % 10 === 0; }
  function phoneOk(v) { var s = String(v || '').trim(); if (/^(\+|00)/.test(s)) { var x = digits(s); return x.length >= 8 && x.length <= 15; } var d = digits(s); if (d.indexOf('972') === 0) d = '0' + d.slice(3); return /^0\d{8,9}$/.test(d); }
  function emailOk(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v || '').trim()); }
  var FILE_MAX = 15 * 1024 * 1024, FILE_TYPES = /\.(pdf|jpe?g|png|heic|heif|webp|docx?|tiff?)$/i;
  var ICONS = {
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>',
    building: '<path d="M4 21V5l8-2v18M12 7l8 3v11"/><path d="M8 8h1M8 12h1M8 16h1M15 13h2M15 17h2M3 21h18"/>',
    'file-edit': '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h5"/><path d="M14 3v6h6"/><path d="M20.5 13.5l-5 5L13 19l.5-2.5 5-5a1.4 1.4 0 0 1 2 2z"/>',
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
    scroll: '<path d="M8 4h11v13a3 3 0 0 1-3 3H7"/><path d="M8 4a2 2 0 0 0-2 2v12a2 2 0 1 1-2-2h2"/><path d="M11 9h5M11 13h5"/>',
    shield: '<path d="M12 3l8 4v5c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V7z"/><path d="M9 12l2 2 4-4"/>',
    layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>'
  };
  function icon(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[n] || ICONS.search) + '</svg>'; }

  // ---------- the rules shared with the server: visibility, price, review ----------
  function visible(f, a) {
    var w = f.when; if (!w) return true;
    var v = a[w.k];
    if (w.v !== undefined) return v === w.v;
    if (w.has !== undefined) return Array.isArray(v) && v.indexOf(w.has) >= 0;
    if (w.not !== undefined) return v !== undefined && v !== '' && v !== w.not;
    if (w.min !== undefined) return Array.isArray(v) && v.length >= w.min;
    return true;
  }
  function price(svc, cfg, a, meet) {
    var lines = [], net = 0;
    function add(l, p) { if (p) { lines.push({ l: l, p: p }); net += p; } }
    if (svc.base) add(svc.title, svc.base);
    svc.fields.forEach(function (f) {
      if (!visible(f, a)) return;
      if (f.t === 'choice') { (f.opts || []).forEach(function (o) { if (a[f.k] === o.v && o.p) add(o.line || o.l, o.p); }); }
      if (f.t === 'checks') { (f.opts || []).forEach(function (o) { if (Array.isArray(a[f.k]) && a[f.k].indexOf(o.v) >= 0 && o.p) add(o.line || o.l, o.p); }); }
      if (f.t === 'list' && f.each) { var n = (a[f.k] || []).length, extra = Math.max(0, n - (f.free || 0)); if (extra) add((f.line || f.item) + (extra > 1 ? ' × ' + extra : ''), extra * f.each); }
    });
    if (svc.sign === 'meet' && meet && cfg.meeting[meet] && cfg.meeting[meet].p) add(cfg.meeting[meet].line || cfg.meeting[meet].l, cfg.meeting[meet].p);
    var vat = Math.round(net * cfg.vat * 100) / 100;
    return { lines: lines, net: net, vat: vat, total: Math.round((net + vat) * 100) / 100 };
  }
  function reviews(svc, a) {
    var out = [];
    svc.fields.forEach(function (f) {
      if (!visible(f, a) || !f.opts) return;
      f.opts.forEach(function (o) { var on = f.t === 'checks' ? (Array.isArray(a[f.k]) && a[f.k].indexOf(o.v) >= 0) : a[f.k] === o.v; if (on && o.review) out.push(o.review); });
    });
    return out;
  }

  // ---------- the form ----------
  function start(root, cfg) {
    var id = root.getAttribute('data-svc'), fnUrl = root.getAttribute('data-fn') || '';
    var svc = null; cfg.services.forEach(function (s) { if (s.id === id) svc = s; });
    if (!svc) { root.innerHTML = '<div class="sv-err">השירות לא נמצא.</div>'; return; }
    var KEY = 'dabul-svc-' + svc.id;
    function lim(f) { var r = f.lim && f.lim[st.a[f.lim.k]]; return r ? { min: r[0], max: r[1] } : { min: f.min || 0, max: f.max || 1 }; }
    var st = { a: {}, files: {}, meet: svc.sign === 'meet' ? 'office' : '', c: { name: '', phone: '', email: '', note: '' }, step: 0, agree: false, sending: false, done: null, slots: null, err: {} };
    try { var saved = JSON.parse(localStorage.getItem(KEY) || 'null'); if (saved && saved.a) { st.a = saved.a; st.c = saved.c || st.c; st.meet = saved.meet || st.meet; } } catch (e) { /* private mode */ }
    function save() { try { localStorage.setItem(KEY, JSON.stringify({ a: st.a, c: st.c, meet: st.meet })); } catch (e) { /* ignore */ } }

    // steps: the services' own steps, then "signing and details", then the summary
    var stepNames = [];
    svc.fields.forEach(function (f) { var s = f.step || 'פרטים'; if (stepNames.indexOf(s) < 0) stepNames.push(s); });
    stepNames.push(svc.sign === 'meet' ? 'חתימה ופרטי קשר' : 'פרטי קשר');
    stepNames.push('סיכום');
    var LAST = stepNames.length - 1, CONTACT = LAST - 1;

    root.innerHTML = '';
    root.classList.add('sv');
    var head = el('div', 'sv-head'), body = el('div', 'sv-body'), side = el('aside', 'sv-side'), bar = el('div', 'sv-bar');
    var main = el('div', 'sv-main');
    main.appendChild(head); main.appendChild(body);
    var grid = el('div', 'sv-grid'); grid.appendChild(main); grid.appendChild(side);
    root.appendChild(grid); root.appendChild(bar);

    function fieldsOf(i) { return svc.fields.filter(function (f) { return (f.step || 'פרטים') === stepNames[i] && visible(f, st.a); }); }

    // ---- validation ----
    function checkVal(f, v) {
      var empty = v == null || v === '' || (Array.isArray(v) && !v.length);
      if (empty) return f.req ? 'צריך למלא' : '';
      if (f.fmt === 'id' && !idOk(v)) return 'מספר תעודת זהות לא תקין';
      if (f.fmt === 'phone' && !phoneOk(v)) return 'מספר טלפון לא תקין';
      if (f.fmt === 'email' && !emailOk(v)) return 'כתובת מייל לא תקינה';
      if (f.fmt === 'hp' && !/^5\d{8}$/.test(digits(v))) return 'מספר חברה הוא 9 ספרות שמתחילות ב־5';
      if (f.fmt === 'pct' && !(+v > 0 && +v <= 100)) return 'אחוז בין 1 ל־100';
      if (f.fmt === 'url' && !/^https?:\/\//.test(String(v).trim())) return 'קישור מלא, שמתחיל ב־https://';
      return '';
    }
    function validate(i) {
      var err = {};
      if (i < CONTACT) {
        fieldsOf(i).forEach(function (f) {
          if (f.t === 'list') {
            var arr = st.a[f.k] || [];
            var L = lim(f); if (arr.length < L.min) err[f.k] = L.min > 1 ? 'צריך לפחות ' + L.min + ' ' + (f.items || f.item) : 'צריך להוסיף ' + f.item; else if (arr.length > L.max) err[f.k] = L.max === 1 ? 'בחברת יחיד יש ' + f.item + ' אחד. הסירו את השאר או שנו את סוג החברה.' : 'אפשר עד ' + L.max;
            arr.forEach(function (row, r) { f.fields.forEach(function (g) { var m = checkVal(g, row[g.k]); if (m) err[f.k + '.' + r + '.' + g.k] = m; }); });
            if (f.fields.some(function (g) { return g.fmt === 'pct'; }) && arr.length) { var sum = arr.reduce(function (s, x) { return s + (+x.pct || 0); }, 0); if (Math.abs(sum - 100) > 0.01) err[f.k] = 'סך האחוזים צריך להיות 100 (עכשיו ' + nf2.format(sum) + ')'; }
          } else if (f.t === 'file') {
            if (f.req && !(st.files[f.k] || []).length) err[f.k] = 'צריך לצרף קובץ';
          } else { var m = checkVal(f, st.a[f.k]); if (m) err[f.k] = m; }
        });
      } else if (i === CONTACT) {
        if (!String(st.c.name).trim()) err['c.name'] = 'צריך למלא';
        if (!phoneOk(st.c.phone)) err['c.phone'] = 'מספר טלפון לא תקין';
        if (!emailOk(st.c.email)) err['c.email'] = 'כתובת מייל לא תקינה';
      } else if (i === LAST) { if (!st.agree) err.agree = 'צריך לאשר את התנאים'; }
      st.err = err; return !Object.keys(err).length;
    }

    // ---- rendering ----
    function render() {
      if (st.done) { renderDone(); return; }
      var pct = Math.round(st.step / LAST * 100);
      head.innerHTML = '<div class="sv-steps" role="list">' + stepNames.map(function (n, i) { return '<span role="listitem" class="' + (i < st.step ? 'ok' : i === st.step ? 'on' : '') + '"><b>' + (i < st.step ? '✓' : i + 1) + '</b><em>' + esc(n) + '</em></span>'; }).join('') + '</div><div class="sv-prog"><i style="width:' + pct + '%"></i></div>';
      body.innerHTML = '';
      var h = el('h3', 'sv-h', esc(stepNames[st.step])); body.appendChild(h);
      if (st.step < CONTACT) fieldsOf(st.step).forEach(function (f) { body.appendChild(renderField(f)); });
      else if (st.step === CONTACT) renderContact();
      else renderSummary();
      var nav = el('div', 'sv-nav');
      if (st.step > 0) { var back = el('button', 'sv-back', '→ חזרה'); back.type = 'button'; back.onclick = function () { st.step--; st.err = {}; render(); scrollTop(); }; nav.appendChild(back); }
      var rv = reviews(svc, st.a);
      var nextLabel = st.step === LAST ? (rv.length ? 'שליחה לבדיקה' : (fnUrl ? 'שליחה ומעבר לתשלום' : 'שליחה (תצוגה מקדימה)')) : 'המשך ←';
      var next = el('button', 'sv-next', esc(st.sending ? 'שולחים...' : nextLabel)); next.type = 'button'; next.disabled = st.sending;
      next.onclick = function () { if (!validate(st.step)) { render(); var e = root.querySelector('.sv-bad'); if (e) e.scrollIntoView({ block: 'center', behavior: 'smooth' }); return; } if (st.step === LAST) submit(); else { st.step++; st.err = {}; render(); scrollTop(); } };
      nav.appendChild(next); body.appendChild(nav);
      renderSide(); save();
    }
    function scrollTop() { var t = root.getBoundingClientRect().top + window.pageYOffset - 90; if (window.pageYOffset > t) window.scrollTo({ top: t, behavior: 'smooth' }); }
    function errHtml(k) { return st.err[k] ? '<span class="sv-msg">' + esc(st.err[k]) + '</span>' : ''; }

    function renderField(f) {
      var w = el('div', 'sv-f' + (st.err[f.k] ? ' sv-bad' : '')), v = st.a[f.k];
      var lab = '<label class="sv-q">' + esc(f.q) + (f.req ? ' <i>*</i>' : '') + '</label>' + (f.help ? '<p class="sv-help">' + esc(f.help) + '</p>' : '');
      if (f.t === 'choice' || f.t === 'checks') {
        w.innerHTML = lab;
        var box = el('div', 'sv-opts' + (f.opts.length > 3 ? ' many' : ''));
        f.opts.forEach(function (o) {
          var on = f.t === 'checks' ? (Array.isArray(v) && v.indexOf(o.v) >= 0) : v === o.v;
          var b = el('button', 'sv-opt' + (on ? ' on' : '') + (f.t === 'checks' ? ' chk' : ''), '<span class="mk"></span><span class="tx"><b>' + esc(o.l) + '</b>' + (o.s ? '<small>' + esc(o.s) + '</small>' : '') + '</span>' + (o.p ? '<span class="pr">' + (svc.base || f.t === 'checks' ? '+' : '') + ils(o.p) + '</span>' : ''));
          b.type = 'button'; b.setAttribute('aria-pressed', on ? 'true' : 'false');
          b.onclick = function () {
            if (f.t === 'checks') { var arr = Array.isArray(st.a[f.k]) ? st.a[f.k].slice() : []; var i = arr.indexOf(o.v); if (i >= 0) arr.splice(i, 1); else arr.push(o.v); st.a[f.k] = arr; }
            else st.a[f.k] = o.v;
            delete st.err[f.k]; render();
          };
          box.appendChild(b);
          if (on && o.review) { var n = el('p', 'sv-note', 'במקרה כזה נבדוק את הפרטים לפני תשלום, ונחזור אליכם. ממשיכים למלא כרגיל.'); box.appendChild(n); }
        });
        w.appendChild(box); w.insertAdjacentHTML('beforeend', errHtml(f.k));
      } else if (f.t === 'text' || f.t === 'textarea') {
        w.innerHTML = lab + errHtml(f.k);
        var inp = input(f, v, function (x) { st.a[f.k] = x; renderSide(); save(); });
        w.insertBefore(inp, w.querySelector('.sv-msg'));
      } else if (f.t === 'list') {
        w.innerHTML = lab;
        var arr = st.a[f.k] = Array.isArray(v) ? v : [];
        var L = lim(f); while (arr.length < L.min) arr.push({});
        arr.forEach(function (row, r) {
          var card = el('div', 'sv-row');
          card.innerHTML = '<div class="sv-row-h"><b>' + esc(f.item) + ' ' + (r + 1) + '</b>' + (r >= (f.free || 99) && f.each ? '<span class="pr">+' + ils(f.each) + '</span>' : '') + '</div>';
          var g2 = el('div', 'sv-row-g');
          f.fields.forEach(function (g) {
            var key = f.k + '.' + r + '.' + g.k, cell = el('div', 'sv-f sm' + (st.err[key] ? ' sv-bad' : ''));
            cell.innerHTML = '<label class="sv-q">' + esc(g.q) + (g.req ? ' <i>*</i>' : '') + '</label>';
            if (g.t === 'choice') {
              var b2 = el('div', 'sv-mini');
              g.opts.forEach(function (o) { var bb = el('button', row[g.k] === o.v ? 'on' : '', esc(o.l)); bb.type = 'button'; bb.onclick = function () { row[g.k] = o.v; delete st.err[key]; render(); }; b2.appendChild(bb); });
              cell.appendChild(b2);
            } else cell.appendChild(input(g, row[g.k], function (x) { row[g.k] = x; save(); }));
            cell.insertAdjacentHTML('beforeend', errHtml(key));
            g2.appendChild(cell);
          });
          card.appendChild(g2);
          if (arr.length > L.min) { var rm = el('button', 'sv-rm', 'הסרה'); rm.type = 'button'; rm.onclick = function () { arr.splice(r, 1); render(); }; card.appendChild(rm); }
          w.appendChild(card);
        });
        if (arr.length < L.max) { var add = el('button', 'sv-add', '+ הוספת ' + esc(f.item) + (arr.length >= (f.free || 99) && f.each ? ' (' + ils(f.each) + ')' : '')); add.type = 'button'; add.onclick = function () { arr.push({}); render(); }; w.appendChild(add); }
        w.insertAdjacentHTML('beforeend', errHtml(f.k));
      } else if (f.t === 'file') {
        var list = st.files[f.k] = st.files[f.k] || [];
        w.innerHTML = lab;
        var drop = el('label', 'sv-drop', '<input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,.webp,.doc,.docx,.tif,.tiff"><span>' + icon('file-edit') + '<b>בחירת קבצים</b><small>או צילום מהטלפון. PDF, תמונה או Word, עד 15MB לקובץ</small></span>');
        var fi = drop.querySelector('input');
        fi.onchange = function () { Array.prototype.forEach.call(fi.files, function (x) { if (list.length >= (f.max || 8)) return; if (x.size > FILE_MAX) { alertMsg(x.name + ': הקובץ גדול מ־15MB'); return; } if (!FILE_TYPES.test(x.name)) { alertMsg(x.name + ': סוג קובץ לא נתמך'); return; } list.push(x); }); delete st.err[f.k]; render(); };
        w.appendChild(drop);
        if (list.length) { var ul = el('ul', 'sv-files'); list.forEach(function (x, i) { var li = el('li', '', '<span>' + esc(x.name) + ' <small>' + nf2.format(x.size / 1048576) + 'MB</small></span>'); var rb = el('button', '', 'הסרה'); rb.type = 'button'; rb.onclick = function () { list.splice(i, 1); render(); }; li.appendChild(rb); ul.appendChild(li); }); w.appendChild(ul); }
        w.insertAdjacentHTML('beforeend', errHtml(f.k));
      } else if (f.t === 'slot') {
        w.innerHTML = lab;
        var sbox = el('div', 'sv-slots'); w.appendChild(sbox); renderSlots(f, sbox);
        w.insertAdjacentHTML('beforeend', errHtml(f.k));
      }
      return w;
    }
    function alertMsg(t) { var n = el('div', 'sv-toast', esc(t)); root.appendChild(n); setTimeout(function () { n.remove(); }, 3500); }
    function input(f, v, set) {
      var x;
      if (f.t === 'textarea') { x = el('textarea'); x.rows = 4; }
      else { x = el('input'); x.type = f.fmt === 'date' ? 'date' : f.fmt === 'email' ? 'email' : f.fmt === 'phone' ? 'tel' : f.fmt === 'url' ? 'url' : 'text'; if (f.fmt === 'id' || f.fmt === 'hp' || f.fmt === 'num' || f.fmt === 'money' || f.fmt === 'pct' || f.fmt === 'phone') x.inputMode = 'numeric'; }
      if (f.fmt === 'phone' || f.fmt === 'email' || f.fmt === 'url' || f.fmt === 'id' || f.fmt === 'hp') x.dir = 'ltr';
      if (f.ph) x.placeholder = f.ph;
      x.value = v == null ? '' : (f.fmt === 'money' && v ? nf.format(+digits(v)) : v);
      x.oninput = function () { var val = x.value; if (f.fmt === 'money') { var d = digits(val).slice(0, 10); x.value = d ? nf.format(+d) : ''; val = d; } set(val); };
      return x;
    }
    function renderSlots(f, box) {
      function draw() {
        box.innerHTML = '';
        if (!st.slots) { box.innerHTML = '<p class="sv-help">טוענים מועדים פנויים...</p>'; return; }
        if (!st.slots.length) { box.innerHTML = '<p class="sv-help">אין כרגע מועדים פנויים באתר. כתבו בתיאור מתי נוח לכם, ונחזור אליכם לקבוע.</p>'; st.a[f.k] = 'later'; return; }
        var cur = st.a[f.k] || '', curDay = cur.slice(0, 10);
        var days = el('div', 'sv-days');
        st.slots.forEach(function (d) {
          var b = el('button', d.date === curDay ? 'on' : '', '<b>' + esc(d.dow) + '</b><span>' + esc(d.label) + '</span>'); b.type = 'button';
          b.onclick = function () { st.a[f.k] = d.date; draw(); }; days.appendChild(b);
        });
        box.appendChild(days);
        var day = null; st.slots.forEach(function (d) { if (d.date === curDay) day = d; });
        if (day) {
          var times = el('div', 'sv-times');
          day.times.forEach(function (t) { var v2 = day.date + ' ' + t, b = el('button', cur === v2 ? 'on' : '', esc(t)); b.type = 'button'; b.onclick = function () { st.a[f.k] = v2; delete st.err[f.k]; draw(); renderSide(); save(); }; times.appendChild(b); });
          box.appendChild(times);
        }
      }
      if (!st.slots) {
        var make = function () {
          var h = cfg.hours, out = [], d = new Date(), names = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
          d.setDate(d.getDate() + (h.notBefore || 1));
          while (out.length < h.horizon) { if (h.days.indexOf(d.getDay()) >= 0) out.push({ date: d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2), dow: names[d.getDay()], label: d.getDate() + '.' + (d.getMonth() + 1), times: h.slots.slice() }); d.setDate(d.getDate() + 1); }
          return out;
        };
        if (fnUrl) fetch(fnUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'slots', svc: svc.id }) }).then(function (r) { return r.json(); }).then(function (j) { st.slots = j.days || make(); draw(); }).catch(function () { st.slots = make(); draw(); });
        else st.slots = make();
      }
      draw();
      // keep only a full date + time as a valid choice
      var orig = f.req; f.req = orig;
    }
    function renderContact() {
      if (svc.sign === 'meet') {
        var m = el('div', 'sv-f');
        m.innerHTML = '<label class="sv-q">איפה חותמים? <i>*</i></label><p class="sv-help">החתימה על המסמכים נעשית בפני עורך דין, בפגישה קצרה אחת. נתאם איתכם מועד אחרי ההזמנה.</p>';
        var box = el('div', 'sv-opts');
        Object.keys(cfg.meeting).forEach(function (k) {
          var o = cfg.meeting[k], b = el('button', 'sv-opt' + (st.meet === k ? ' on' : ''), '<span class="mk"></span><span class="tx"><b>' + esc(o.l) + '</b><small>' + esc(o.s) + '</small></span>' + (o.p ? '<span class="pr">+' + ils(o.p) + '</span>' : '<span class="pr">כלול</span>'));
          b.type = 'button'; b.onclick = function () { st.meet = k; render(); }; box.appendChild(b);
        });
        m.appendChild(box); body.appendChild(m);
      } else if (svc.sign === 'digital') {
        body.appendChild(el('p', 'sv-info', 'אין צורך להגיע למשרד. אחרי ההזמנה תקבלו לטלפון ייפוי כוח לייצוג, לחתימה דיגיטלית.'));
      }
      [['name', 'שם מלא', 'text'], ['phone', 'טלפון', 'tel'], ['email', 'מייל', 'email']].forEach(function (x) {
        var key = 'c.' + x[0], w = el('div', 'sv-f' + (st.err[key] ? ' sv-bad' : ''));
        w.innerHTML = '<label class="sv-q">' + x[1] + ' <i>*</i></label>';
        var i = el('input'); i.type = x[2]; i.value = st.c[x[0]] || ''; if (x[0] !== 'name') i.dir = 'ltr'; i.autocomplete = x[0] === 'name' ? 'name' : x[0] === 'phone' ? 'tel' : 'email';
        i.oninput = function () { st.c[x[0]] = i.value; save(); };
        w.appendChild(i); w.insertAdjacentHTML('beforeend', errHtml(key)); body.appendChild(w);
      });
      var n = el('div', 'sv-f'); n.innerHTML = '<label class="sv-q">משהו נוסף שחשוב שנדע?</label>';
      var t = el('textarea'); t.rows = 3; t.value = st.c.note || ''; t.oninput = function () { st.c.note = t.value; save(); }; n.appendChild(t); body.appendChild(n);
      var hp = el('input'); hp.type = 'text'; hp.name = 'website'; hp.tabIndex = -1; hp.autocomplete = 'off'; hp.className = 'sv-hp'; hp.setAttribute('aria-hidden', 'true'); body.appendChild(hp);
    }
    function answerText(f, v) {
      if (f.t === 'choice') { var o = (f.opts || []).filter(function (x) { return x.v === v; })[0]; return o ? o.l : ''; }
      if (f.t === 'checks') return (f.opts || []).filter(function (x) { return Array.isArray(v) && v.indexOf(x.v) >= 0; }).map(function (x) { return x.l; }).join(', ');
      if (f.t === 'list') return (v || []).map(function (r) { return r.name || ''; }).filter(Boolean).join(', ');
      if (f.t === 'file') return nFiles((st.files[f.k] || []).length);
      if (f.t === 'slot') { if (!v || v === 'later') return 'נתאם בטלפון'; var p = v.split(' '); return p[0].split('-').reverse().join('.') + ' בשעה ' + (p[1] || ''); }
      if (f.fmt === 'money' && v) return ils(+digits(v));
      return String(v || '');
    }
    function renderSummary() {
      var rv = reviews(svc, st.a), rows = '';
      svc.fields.forEach(function (f) { if (!visible(f, st.a)) return; var t = answerText(f, f.t === 'file' ? null : st.a[f.k]); if (t) rows += '<div><span>' + esc(f.q) + '</span><b>' + esc(t) + '</b></div>'; });
      if (svc.sign === 'meet') rows += '<div><span>חתימה</span><b>' + esc(cfg.meeting[st.meet].l) + '</b></div>';
      rows += '<div><span>פרטי קשר</span><b>' + esc(st.c.name) + ' · <bdi>' + esc(st.c.phone) + '</bdi> · <bdi>' + esc(st.c.email) + '</bdi></b></div>';
      body.insertAdjacentHTML('beforeend', '<div class="sv-sum">' + rows + '</div>');
      if (rv.length) body.insertAdjacentHTML('beforeend', '<div class="sv-review"><b>נבדוק לפני תשלום.</b> לפי מה שמילאתם (' + esc(rv.join(', ')) + ') המקרה צריך בדיקה קצרה. שולחים את הפרטים, ונחזור אליכם בתוך יום עבודה עם אישור ומחיר. שום תשלום לא נגבה עכשיו.</div>');
      var terms = el('div', 'sv-terms' + (st.err.agree ? ' sv-bad' : ''));
      terms.innerHTML = '<ul>' + cfg.terms.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + (svc.gov ? '<li>' + esc(svc.gov) + '</li>' : '') + '</ul>';
      var lb = el('label', 'sv-agree', '<input type="checkbox"' + (st.agree ? ' checked' : '') + '> קראתי ואני מסכים לתנאים, ומאשר שהפרטים נכונים');
      lb.querySelector('input').onchange = function (e) { st.agree = e.target.checked; delete st.err.agree; };
      terms.appendChild(lb); terms.insertAdjacentHTML('beforeend', errHtml('agree'));
      body.appendChild(terms);
    }
    function renderSide() {
      var p = price(svc, cfg, st.a, st.meet), rv = reviews(svc, st.a);
      var lines = p.lines.map(function (l) { return '<div><span>' + esc(l.l) + '</span><b>' + ils(l.p) + '</b></div>'; }).join('');
      side.innerHTML = '<div class="sv-card"><div class="sv-svc">' + icon(svc.icon) + '<b>' + esc(svc.title) + '</b></div>' +
        (p.net ? '<div class="sv-lines">' + lines + '<div class="vat"><span>מע״מ ' + Math.round(cfg.vat * 100) + '%</span><b>' + ils(p.vat) + '</b></div></div><div class="sv-total"><span>סה״כ לתשלום</span><b>' + ils(p.total) + '</b></div>' : '<p class="sv-help">המחיר יופיע כשתבחרו.</p>') +
        (rv.length ? '<p class="sv-flag">נבדוק לפני תשלום</p>' : '') +
        (svc.gov ? '<p class="sv-gov">' + esc(svc.gov) + '</p>' : '') + '<p class="sv-sla">' + esc(svc.sla) + '</p></div>';
      bar.innerHTML = p.net ? '<span>סה״כ כולל מע״מ</span><b>' + ils(p.total) + '</b>' : '<span>' + esc(svc.title) + '</span>';
    }
    function renderDone() {
      head.innerHTML = ''; side.innerHTML = ''; bar.innerHTML = '';
      var d = st.done;
      body.innerHTML = '<div class="sv-done"><div class="ok">✓</div><h3>' + esc(d.review ? 'קיבלנו. נבדוק ונחזור אליכם' : d.preview ? 'תצוגה מקדימה: כך תיראה ההזמנה' : 'ההזמנה נקלטה') + '</h3><p>' + esc(d.msg) + '</p>' + (d.id ? '<p class="ref">מספר הזמנה: <bdi>' + esc(d.id) + '</bdi></p>' : '') + '<p class="sv-help">שאלות? <a href="tel:098613413">09-8613413</a></p></div>';
    }

    // ---- sending ----
    function submit() {
      var rv = reviews(svc, st.a), p = price(svc, cfg, st.a, st.meet);
      var hp = root.querySelector('.sv-hp');
      var files = []; Object.keys(st.files).forEach(function (k) { (st.files[k] || []).forEach(function (x, i) { files.push({ k: k, i: i, name: x.name, size: x.size, type: x.type || '' }); }); });
      if (!fnUrl) { st.done = { preview: true, review: !!rv.length, msg: 'בגרסה האמיתית ההזמנה נשמרת במערכת המשרד, הקבצים עולים לאחסון המאובטח, ו' + (rv.length ? 'המשרד חוזר אליכם לפני תשלום.' : 'אתם עוברים לדף התשלום (' + ils(p.total) + ').') }; render(); return; }
      st.sending = true; render();
      var payload = { action: 'order', svc: svc.id, a: st.a, c: st.c, meet: st.meet, files: files, website: hp ? hp.value : '', page: location.href.split('#')[0], total: p.total, src: SRC };
      fetch(fnUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
        .then(function (r) { return r.json().then(function (j) { if (!r.ok || !j.ok) throw new Error(j.error || 'שגיאה'); return j; }); })
        .then(function (j) {
          var ups = (j.uploads || []).map(function (u) {
            var x = (st.files[u.k] || [])[u.i]; if (!x) return Promise.resolve();
            return fetch(u.url, { method: 'PUT', headers: { 'content-type': x.type || 'application/octet-stream', 'x-upsert': 'false' }, body: x }).then(function (r) { if (!r.ok) throw new Error('העלאת הקובץ ' + x.name + ' נכשלה'); });
          });
          return Promise.all(ups).then(function () { return fetch(fnUrl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'uploaded', id: j.id, token: j.token }) }).then(function (r) { return r.json(); }); }).then(function (k) { return { j: j, k: k }; });
        })
        .then(function (x) {
          try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
          if (x.k && x.k.payUrl) { location.href = x.k.payUrl; return; }
          st.sending = false;
          st.done = { id: x.j.id, review: x.j.review, msg: x.j.review ? 'הפרטים והמסמכים אצלנו. נעבור עליהם ונחזור אליכם בתוך יום עבודה, לפני כל תשלום.' : 'הפרטים והמסמכים אצלנו. שלחנו אליכם מייל עם סיכום ההזמנה וקישור לתשלום.' };
          render();
        })
        .catch(function (e) { st.sending = false; render(); alertMsg((e && e.message) || 'השליחה נכשלה. נסו שוב או התקשרו 09-8613413'); });
    }
    render();
  }
})();
