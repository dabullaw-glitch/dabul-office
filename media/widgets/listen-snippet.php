/* dabul: "האזינו למאמר" on every article (10.10.2026, for Yakir's approval).
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
.dlp{width:100%;--g:#b8932f;--g2:#8a6d2c;--g3:#f0e2bd;--ink:#1c1b19;--mut:#6c675d;--line:#e6dfcf;background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px 16px;margin:0 0 22px;display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:6px 14px;align-items:center;box-shadow:0 8px 24px -18px rgba(28,27,25,.35);direction:rtl}
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
.dbl-reading{background:linear-gradient(transparent 60%,rgba(240,226,189,.7) 60%)}
@media (max-width:600px){.dlp{grid-template-columns:auto minmax(0,1fr);padding:12px}.dlp .ct{grid-column:1 / -1;justify-content:space-between;order:3}.dlp .tl{grid-column:1 / -1}.dlp .pl{width:50px;height:50px}}
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
  // the text: headings, paragraphs and list items of the article, without scripts, tables and source numbers
  var blocks = [].filter.call(host.querySelectorAll('h2,h3,h4,p,li,blockquote'), function (el) {
    if (el.closest('table,script,style,.dlp,nav,figure,details,.citation-ref')) return false;
    if (el.tagName === 'LI' && el.querySelector('p')) return false;
    return (el.innerText || '').trim().length > 1;
  });
  var parts = [];
  blocks.forEach(function (el) {
    var t = (el.innerText || '').replace(/\[\d+\]/g, '').replace(/\s+/g, ' ').trim();
    (t.match(/[^.!?:\n]+[.!?:]*/g) || [t]).forEach(function (s) { s = s.trim(); if (s.length > 1) parts.push({ t: s, el: el }); });
  });
  if (parts.length < 3) return;
  var chars = parts.reduce(function (a, p) { return a + p.t.length; }, 0), CPS = 14; // about 14 Hebrew letters a second
  var mins = Math.max(1, Math.round(chars / CPS / 60));
  var fmt = function (sec) { sec = Math.max(0, Math.round(sec)); return String(Math.floor(sec / 60)).padStart(2, '0') + ':' + String(sec % 60).padStart(2, '0'); };
  var box = document.createElement('div'); box.className = 'dlp'; box.hidden = true;
  box.innerHTML = '<button class="pl" type="button" aria-label="האזנה למאמר"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>' +
    '<div class="tt"><b>האזינו למאמר</b><span>כ־' + mins + ' דקות האזנה</span></div>' +
    '<div class="ct"><button type="button" data-j="-1" aria-label="אחורה"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v4h-4"/></svg>15</button>' +
    '<button type="button" data-j="1" aria-label="קדימה">15<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v4h4"/></svg></button>' +
    '<button type="button" data-r="1" aria-label="מהירות">1x</button></div>' +
    '<div class="tl"><span class="a">00:00</span><div class="bar" role="slider" aria-label="מיקום בהאזנה" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" tabindex="0"><i></i></div><span class="b">' + fmt(chars / CPS) + '</span></div>';
  host.parentNode.insertBefore(box, host);
  var pl = box.querySelector('.pl'), bar = box.querySelector('.bar'), fill = bar.querySelector('i'), ta = box.querySelector('.a'), tb = box.querySelector('.b'), rb = box.querySelector('[data-r]');
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>', PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>';
  var voice = null, idx = 0, on = false, rate = 1, RATES = [1, 1.25, 1.5, 0.85], done = parts.map(function () { return 0; }), seq = 0;
  for (var i = 0, acc = 0; i < parts.length; i++) { done[i] = acc; acc += parts[i].t.length; }
  function pickVoice() {
    var vs = (S.getVoices() || []).filter(function (v) { return /^(he|iw)/i.test(v.lang); });
    vs.sort(function (a, b) { var s = function (v) { return (/natural|online|neural|premium|enhanced/i.test(v.name) ? 4 : 0) + (/google/i.test(v.name) ? 2 : 0) + (v.localService ? 0 : 1); }; return s(b) - s(a); });
    voice = vs[0] || null;
    box.hidden = !(voice || force);
  }
  pickVoice(); if (S.onvoiceschanged !== undefined) S.addEventListener('voiceschanged', pickVoice);
  setTimeout(pickVoice, 1200);
  function mark(el) { var o = host.querySelector('.dbl-reading'); if (o && o !== el) o.classList.remove('dbl-reading'); if (el) el.classList.add('dbl-reading'); }
  function show() {
    var pos = idx < parts.length ? done[idx] : chars, p = chars ? pos / chars : 0;
    fill.style.width = (p * 100).toFixed(1) + '%'; bar.setAttribute('aria-valuenow', Math.round(p * 100));
    ta.textContent = fmt(pos / CPS / rate); tb.textContent = fmt((chars - pos) / CPS / rate);
    pl.innerHTML = on ? PAUSE : PLAY; pl.setAttribute('aria-label', on ? 'עצירה' : 'האזנה למאמר');
  }
  function speak() {
    var my = ++seq;
    if (idx >= parts.length) { on = false; idx = 0; mark(null); show(); return; }
    var u = new SpeechSynthesisUtterance(parts[idx].t);
    u.lang = 'he-IL'; if (voice) u.voice = voice; u.rate = rate;
    u.onend = function () { if (my !== seq || !on) return; idx++; show(); speak(); };
    u.onerror = function () { if (my !== seq) return; on = false; show(); };
    mark(parts[idx].el); show(); S.speak(u);
  }
  function stop() { seq++; S.cancel(); }
  function go(newIdx) { var was = on; stop(); idx = Math.max(0, Math.min(parts.length - 1, newIdx)); if (was) { on = true; speak(); } else show(); }
  pl.addEventListener('click', function () { if (on) { on = false; stop(); mark(null); show(); } else { on = true; stop(); speak(); } });
  box.querySelectorAll('[data-j]').forEach(function (b) { b.addEventListener('click', function () {
    var target = done[idx] + (+b.getAttribute('data-j')) * 15 * CPS * rate, k = 0;
    while (k < parts.length - 1 && done[k + 1] <= target) k++; go(k);
  }); });
  rb.addEventListener('click', function () { rate = RATES[(RATES.indexOf(rate) + 1) % RATES.length]; rb.textContent = rate + 'x'; if (on) go(idx); else show(); });
  bar.addEventListener('click', function (e) { var r = bar.getBoundingClientRect(), p = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), target = p * chars, k = 0; while (k < parts.length - 1 && done[k + 1] <= target) k++; go(k); });
  window.addEventListener('pagehide', stop);
  show();
})();
</script>
DBLLISTENJS;
}, 99);
