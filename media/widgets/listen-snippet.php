/* dabul: "האזינו למאמר" on every article (10.10.2026, for Yakir's approval). Translation added 10.10.2026: the reader can
   switch the article to English, Russian, French or Arabic (Google's free page translator, loaded only when chosen) and
   listen in that language.
   Free and automatic: the reader's own phone or computer reads the article aloud (the browser's built in voice),
   so there are no audio files, no cost and nothing to do when a new article is published.
   The player sits under the table of contents, right above the article text. It shows only where the device has a
   Hebrew voice (iPhone, Android, Edge and most computers in Israel); elsewhere it stays hidden.
   Preview before going live: add ?dblprev=1 to an article address. To undo: deactivate this snippet. */
define('DABUL_LISTEN_LIVE', 0);

function dabul_listen_on() {
	if (!is_singular('post')) return false;
	if (DABUL_LISTEN_LIVE) return true;
	$q = isset($_SERVER['QUERY_STRING']) ? $_SERVER['QUERY_STRING'] : '';
	return strpos($q, 'dblprev=1') !== false;
}
add_action('wp_head', function () {
	if (!dabul_listen_on()) return;
	echo '<style id="dbl-listen-css">
.dlp{width:100%;--g:#b8932f;--g2:#8a6d2c;--g3:#f0e2bd;--ink:#1c1b19;--mut:#6c675d;--line:#e6dfcf;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin:0 0 -8px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:6px 14px;align-items:center;box-shadow:0 8px 24px -18px rgba(28,27,25,.35);direction:rtl}
.dlp[hidden]{display:none!important}
.dlp *{box-sizing:border-box}
.dlp .pl{grid-row:span 2;width:56px;height:56px;border-radius:50%;border:0;padding:0;background:var(--ink);color:var(--g3);display:grid;place-items:center;cursor:pointer;box-shadow:0 0 0 5px rgba(184,147,47,.18)}
.dlp .pl:hover{background:#2c2925}
.dlp .pl svg{width:24px;height:24px}
.dlp .tt{min-width:0}
.dlp .tt b{display:block;font-size:16.5px;color:var(--ink);line-height:1.3}
.dlp .tt span{font-size:13.5px;color:var(--mut)}
.dlp .ct{display:flex;gap:6px;align-items:center}
.dlp .ct button{border:1px solid var(--line);background:#fff;color:var(--ink);border-radius:99px;height:34px;min-width:34px;padding:0 10px;font:inherit;font-size:13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:4px;line-height:1}
.dlp .ct button:hover{border-color:var(--g)}
.dlp .ct svg{width:16px;height:16px}
.dlp .tl{grid-column:2 / -1;direction:ltr;display:flex;align-items:center;gap:10px;font-size:12.5px;color:var(--mut);font-variant-numeric:tabular-nums}
.dlp .bar{flex:1;height:6px;border-radius:6px;background:#efe9dc;position:relative;cursor:pointer}
.dlp .bar i{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,var(--g3),var(--g));border-radius:6px}
.dlp .bar i::after{content:"";position:absolute;right:-6px;top:50%;width:14px;height:14px;margin-top:-7px;border-radius:50%;background:#fff;border:2px solid var(--g)}
.dlp .lw{position:relative;display:inline-flex}
.dlp .lb em{font-style:normal}
.dlp .lb svg{width:17px;height:17px}
.dlp .lm{position:absolute;top:calc(100% + 6px);left:0;z-index:30;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 40px -18px rgba(28,27,25,.5);padding:6px;display:grid;gap:2px;min-width:160px}
.dlp .lm[hidden]{display:none}
.dlp .lm button{border:0;background:none;text-align:right;border-radius:10px;padding:9px 12px;font:inherit;font-size:14.5px;font-weight:700;color:var(--ink);cursor:pointer;height:auto}
.dlp .lm button:hover{background:#f6f1e4}.dlp .lm button.on{background:var(--ink);color:var(--g3)}
.goog-te-banner-frame,.skiptranslate>iframe,iframe.VIpgJd-ZVi9od-ORHb-OEVmcd,#goog-gt-tt,.VIpgJd-ZVi9od-aZ2wEe-wOHMyf{display:none!important}
body{top:0!important}
.goog-text-highlight{background:none!important;box-shadow:none!important}
.dbl-reading{background:linear-gradient(transparent 60%,rgba(240,226,189,.7) 60%)}
@media (max-width:600px){.dlp{grid-template-columns:auto minmax(0,1fr);padding:12px}.dlp .ct{grid-column:1 / -1;justify-content:space-between;order:3;flex-wrap:wrap}.dlp .tl{grid-column:1 / -1}.dlp .pl{width:50px;height:50px}}
</style>' . "\n";
}, 40);
add_action('wp_footer', function () {
	if (!dabul_listen_on()) return;
	echo <<<'DBLLISTENJS'
<script nowprocket data-no-optimize="1">
(function () {
  var host = document.querySelector('.elementor-widget-theme-post-content');
  var S = window.speechSynthesis;
  if (!host || !S || !window.SpeechSynthesisUtterance) return;
  var force = /dblforce=1/.test(location.search);
  var LANGS = [
    { k: 'he', l: 'עברית (המקור)', name: 'עברית', re: /^(he|iw)/i, tag: 'he-IL', cps: 14, dir: 'rtl' },
    { k: 'en', l: 'English', name: 'English', re: /^en/i, tag: 'en-US', cps: 15, dir: 'ltr' },
    { k: 'ru', l: 'Русский', name: 'Русский', re: /^ru/i, tag: 'ru-RU', cps: 14, dir: 'ltr' },
    { k: 'fr', l: 'Français', name: 'Français', re: /^fr/i, tag: 'fr-FR', cps: 15, dir: 'ltr' },
    { k: 'ar', l: 'العربية', name: 'العربية', re: /^ar/i, tag: 'ar-SA', cps: 13, dir: 'rtl' }
  ];
  var L = LANGS[0];
  var parts = [], chars = 0, done = [];
  // the text: headings, paragraphs and list items of the article, without scripts, tables and source numbers
  function collect() {
    parts = [];
    [].forEach.call(host.querySelectorAll('h2,h3,h4,p,li,blockquote'), function (el) {
      if (el.closest('table,script,style,.dlp,nav,figure,details,.citation-ref')) return;
      if (el.tagName === 'LI' && el.querySelector('p')) return;
      var t = (el.innerText || '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
      if (t.length < 2) return;
      (t.match(/[^.!?:\n]+[.!?:]*/g) || [t]).forEach(function (x) { x = x.trim(); if (x.length > 1) parts.push({ t: x, el: el }); });
    });
    chars = 0; done = parts.map(function (p) { var d = chars; chars += p.t.length; return d; });
  }
  collect();
  if (parts.length < 3) return;
  var fmt = function (sec) { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };
  var TR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h9M8.5 3v2M6 5c.5 3 2.5 5.5 5 7M11 5c-.8 3.6-3.4 6.4-7 8"/><path d="M13 21l4-9 4 9M14.5 18h5"/></svg>';
  var box = document.createElement('div'); box.className = 'dlp notranslate'; box.setAttribute('translate', 'no'); box.hidden = true;
  box.innerHTML = '<button class="pl" type="button" aria-label="האזנה למאמר"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>' +
    '<div class="tt"><b>האזינו למאמר</b><span class="mn"></span></div>' +
    '<div class="ct"><button type="button" data-j="-1" aria-label="אחורה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4h-4"/></svg>15</button>' +
    '<button type="button" data-j="1" aria-label="קדימה">15<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/></svg></button>' +
    '<button type="button" data-r="1" aria-label="מהירות">1x</button>' +
    '<span class="lw"><button type="button" class="lb" aria-label="תרגום" aria-haspopup="true" aria-expanded="false">' + TR + '<em>תרגום</em></button><span class="lm" hidden>' +
    LANGS.map(function (x) { return '<button type="button" data-l="' + x.k + '"' + (x.k === 'he' ? ' class="on"' : '') + '>' + x.l + '</button>'; }).join('') + '</span></span></div>' +
    '<div class="tl"><span class="a">00:00</span><div class="bar" role="slider" aria-label="מיקום בהאזנה" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><i></i></div><span class="b"></span></div>';
  host.parentNode.insertBefore(box, host);
  var pl = box.querySelector('.pl'), bar = box.querySelector('.bar'), fill = bar.querySelector('i'), ta = box.querySelector('.a'), tb = box.querySelector('.b'), rb = box.querySelector('[data-r]'),
      mn = box.querySelector('.mn'), lb = box.querySelector('.lb'), lm = box.querySelector('.lm'), ttl = box.querySelector('.tt b');
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  var voice = null, idx = 0, on = false, rate = 1, RATES = [1, 1.25, 1.5, 0.85], seq = 0, busy = false;
  function voicesFor(lang) {
    var vs = (S.getVoices() || []).filter(function (v) { return lang.re.test(v.lang); });
    vs.sort(function (a, b) { var sc = function (v) { return (/natural|online|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1); }; return sc(b) - sc(a); });
    return vs[0] || null;
  }
  function pickVoice() { voice = voicesFor(L); if (L.k === 'he') box.hidden = !(voice || force); }
  pickVoice(); if (S.onvoiceschanged !== undefined) S.addEventListener('voiceschanged', pickVoice);
  setTimeout(pickVoice, 1200);
  function mark(el) { var o = host.querySelector('.dbl-reading'); if (o && o !== el) o.classList.remove('dbl-reading'); if (el) el.classList.add('dbl-reading'); }
  function show() {
    var pos = idx < parts.length ? done[idx] : chars, p = chars ? pos / chars : 0;
    fill.style.width = (p * 100).toFixed(1) + '%'; bar.setAttribute('aria-valuenow', Math.round(p * 100));
    ta.textContent = fmt(pos / L.cps / rate); tb.textContent = fmt((chars - pos) / L.cps / rate);
    pl.innerHTML = on ? PAUSE : PLAY; pl.setAttribute('aria-label', on ? 'עצירה' : 'האזנה למאמר');
    if (!busy) mn.textContent = 'כ־' + Math.max(1, Math.round(chars / L.cps / 60)) + ' דקות האזנה' + (L.k === 'he' ? '' : ' · ' + L.name) + (L.k !== 'he' && !voice ? ' · אין במכשיר הזה קול בשפה הזו' : '');
  }
  function speak() {
    var my = ++seq;
    if (idx >= parts.length) { on = false; idx = 0; mark(null); show(); return; }
    var u = new SpeechSynthesisUtterance(parts[idx].t);
    u.lang = L.tag; if (voice) u.voice = voice; u.rate = rate;
    u.onend = function () { if (my !== seq || !on) return; idx++; show(); speak(); };
    u.onerror = function () { if (my !== seq) return; on = false; show(); };
    mark(parts[idx].el); show(); S.speak(u);
  }
  function stop() { seq++; S.cancel(); }
  function go(newIdx) { var was = on; stop(); idx = Math.max(0, Math.min(parts.length - 1, newIdx)); if (was) { on = true; speak(); } else show(); }
  pl.addEventListener('click', function () { if (busy) return; if (on) { on = false; stop(); mark(null); show(); } else { on = true; stop(); speak(); } });
  box.querySelectorAll('[data-j]').forEach(function (b) { b.addEventListener('click', function () {
    var target = done[idx] + (+b.getAttribute('data-j')) * 15 * L.cps * rate, k = 0;
    while (k < parts.length - 1 && done[k + 1] <= target) k++; go(k);
  }); });
  rb.addEventListener('click', function () { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; rb.textContent = rate + 'x'; if (on) go(idx); else show(); });
  bar.addEventListener('click', function (e) { var r = bar.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), target = p * chars, k = 0; while (k < parts.length - 1 && done[k + 1] <= target) k++; go(k); });

  // ---- translation: Google's free page translator, loaded only when a language is chosen ----
  function menu(open) { lm.hidden = !open; lb.setAttribute('aria-expanded', open ? 'true' : 'false'); }
  lb.addEventListener('click', function (e) { e.stopPropagation(); menu(lm.hidden); });
  document.addEventListener('click', function (e) { if (!e.target.closest || !e.target.closest('.dlp .lw')) menu(false); });
  function gtReady(cb) {
    var combo = document.querySelector('#dbl-gt select.goog-te-combo');
    if (combo) return cb(combo);
    if (!window.dblGtInit) {
      var d = document.createElement('div'); d.id = 'dbl-gt'; d.style.display = 'none'; document.body.appendChild(d);
      window.dblGtInit = function () { new google.translate.TranslateElement({ pageLanguage: 'iw', includedLanguages: 'en,ru,fr,ar', autoDisplay: false }, 'dbl-gt'); };
      var sc = document.createElement('script'); sc.src = 'https://translate.google.com/translate_a/element.js?cb=dblGtInit'; sc.async = true;
      sc.onerror = function () { busy = false; mn.textContent = 'התרגום לא נטען. נסו שוב בעוד רגע.'; }; document.head.appendChild(sc);
    }
    var n = 0, t = setInterval(function () { var c = document.querySelector('#dbl-gt select.goog-te-combo'); if (c && c.options.length > 1) { clearInterval(t); cb(c); } else if (++n > 60) { clearInterval(t); busy = false; mn.textContent = 'התרגום לא נטען. נסו שוב בעוד רגע.'; } }, 200);
  }
  function setLang(k) {
    var nl = LANGS.filter(function (x) { return x.k === k; })[0]; if (!nl || nl === L) return;
    if (nl.k === 'he') { // back to the original: clear Google's choice and reload the article
      stop(); var past = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
      document.cookie = past; document.cookie = past + '; domain=' + location.hostname; document.cookie = past + '; domain=.' + location.hostname.replace(/^www\./, '');
      location.reload(); return;
    }
    on = false; stop(); mark(null); busy = true; mn.textContent = 'מתרגם ל' + nl.name + '...';
    var before = (host.innerText || '').slice(0, 400);
    gtReady(function (combo) {
      combo.value = nl.k; combo.dispatchEvent(new Event('change'));
      var n = 0, last = '', same = 0, t = setInterval(function () {
        var now = (host.innerText || '').slice(0, 400);
        if (now !== before) { same = now === last ? same + 1 : 0; last = now; }
        if ((now !== before && same >= 3) || ++n > 50) {
          clearInterval(t); busy = false; L = nl; collect(); idx = 0; voice = voicesFor(L);
          host.style.direction = L.dir; host.style.textAlign = L.dir === 'ltr' ? 'left' : '';
          ttl.textContent = L.k === 'he' ? 'האזינו למאמר' : 'האזינו למאמר ב' + L.name;
          lm.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-l') === L.k); });
          show();
        }
      }, 250);
    });
  }
  lm.addEventListener('click', function (e) { var b = e.target.closest('[data-l]'); if (!b) return; menu(false); setLang(b.getAttribute('data-l')); });
  window.addEventListener('pagehide', stop);
  show();
})();
</script>
DBLLISTENJS;
}, 99);
