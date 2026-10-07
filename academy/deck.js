// The lesson video: an explainer that plays like a video (narration, animated visuals, captions, seek),
// built from lesson.deck = { scenes: [{ kind, audio?, say, ...visual data }] }. Each scene has its own narration file;
// without one (or before the narration is ready) the scene is timed by its text and shown with captions.
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = s => esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  const ICON = { // simple line icons, drawn in gold
    home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    bank: '<path d="M3 9l9-5 9 5"/><path d="M4 10h16"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/><path d="M3 20h18"/>',
    law: '<path d="M12 3v18"/><path d="M5 7h14"/><path d="M5 7l-3 7h6z"/><path d="M19 7l-3 7h6z"/><path d="M8 21h8"/>',
    person: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',
    doc: '<path d="M6 3h9l4 4v14H6z"/><path d="M15 3v4h4"/><path d="M9 12h7M9 16h7"/>',
    key: '<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M17 5l3 3M14 8l2 2"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
    money: '<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="3"/><path d="M6 9v.01M18 15v.01"/>',
    tax: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z"/><path d="M9 9l6 6M9.5 14.5h.01M14.5 9.5h.01"/>',
    building: '<rect x="5" y="3" width="14" height="18"/><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2"/><path d="M11 21v-3h2v3"/>',
    warn: '<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.01"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
    search: '<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>',
    pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
    handshake: '<path d="M3 12l4-4 4 3 3-2 7 5"/><path d="M7 14l3 3M10 13l3 3M13 12l3 3"/>',
  };
  const ic = (n, sz = 44) => `<svg class="dk-ic" viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${ICON[n] || ICON.check}</svg>`;
  const list = (a, cls = '') => (a || []).map((x, i) => `<li class="rv ${cls}" data-i="${i}">${typeof x === 'string' ? rich(x) : `<b>${rich(x.t)}</b>${x.d ? `<span>${rich(x.d)}</span>` : ''}`}</li>`).join('');
  const T = {
    title: s => `<div class="dk-title"><div class="k rv">${esc(s.kicker || '')}</div><h2 class="rv">${rich(s.title)}</h2>${s.sub ? `<p class="rv">${rich(s.sub)}</p>` : ''}</div>`,
    big: s => `<div class="dk-big"><p class="rv">${rich(s.text)}</p>${s.sub ? `<small class="rv">${rich(s.sub)}</small>` : ''}</div>`,
    bullets: s => `<div class="dk-pad"><h3>${rich(s.title)}</h3><ul class="dk-bul">${list(s.items)}</ul></div>`,
    steps: s => `<div class="dk-pad"><h3>${rich(s.title)}</h3><ol class="dk-steps">${list(s.items)}</ol></div>`,
    key: s => `<div class="dk-call key"><span class="lab rv">${esc(s.label || 'הכי חשוב לזכור')}</span><p class="rv">${rich(s.text)}</p></div>`,
    warn: s => `<div class="dk-call warn"><span class="lab rv">${esc(s.label || 'טעות נפוצה')}</span><p class="rv">${rich(s.text)}</p></div>`,
    tip: s => `<div class="dk-call tip"><span class="lab rv">${esc(s.label || 'טיפ')}</span><p class="rv">${rich(s.text)}</p></div>`,
    example: s => `<div class="dk-pad dk-ex"><span class="lab">${esc(s.label || 'דוגמה מהחיים')}</span><h3>${rich(s.title || '')}</h3><ol class="dk-story">${list(s.items)}</ol></div>`,
    compare: s => `<div class="dk-pad"><h3>${rich(s.title)}</h3><table class="dk-tbl"><tr>${(s.cols || []).map(c => `<th>${esc(c)}</th>`).join('')}</tr>${(s.rows || []).map((r, i) => `<tr class="rv" data-i="${i}">${r.map(c => `<td>${rich(c)}</td>`).join('')}</tr>`).join('')}</table></div>`,
    svg: s => `<div class="dk-pad dk-fig">${s.title ? `<h3>${rich(s.title)}</h3>` : ''}<div class="fig rv">${s.svg || ''}</div></div>`,
    checklist: s => `<div class="dk-pad"><h3>${rich(s.title || 'מה עושים עכשיו')}</h3><ul class="dk-chk">${list(s.items)}</ul></div>`,
    summary: s => `<div class="dk-pad dk-sum"><h3>${rich(s.title || 'בקיצור')}</h3><ul class="dk-bul">${list(s.items)}</ul></div>`,
    flow: s => `<div class="dk-pad"><h3>${rich(s.title)}</h3><div class="dk-flow">${(s.items || []).map((x, i) => `${i ? '<span class="ar rv">←</span>' : ''}<div class="fc rv">${ic(x.icon, 52)}<b>${rich(x.t)}</b>${x.d ? `<span>${rich(x.d)}</span>` : ''}</div>`).join('')}</div>${s.note ? `<p class="dk-note rv">${rich(s.note)}</p>` : ''}</div>`,
    cards: s => `<div class="dk-pad"><h3>${rich(s.title)}</h3><div class="dk-cards n${Math.min(4, (s.items || []).length)}">${(s.items || []).map(x => `<div class="cd rv">${ic(x.icon, 56)}<b>${rich(x.t)}</b>${x.d ? `<span>${rich(x.d)}</span>` : ''}</div>`).join('')}</div></div>`,
    doc: s => `<div class="dk-docwrap"><div class="dk-side"><h3>${rich(s.title)}</h3>${s.note ? `<p>${rich(s.note)}</p>` : ''}</div><div class="dk-doc"><div class="dh">${esc(s.docTitle || '')}</div>${(s.rows || []).map(r => `<div class="dr rv ${r.mark || ''}"><span class="k">${esc(r.k)}</span><span class="v">${rich(r.v)}</span>${r.tag ? `<em>${esc(r.tag)}</em>` : ''}</div>`).join('')}</div></div>`,
    split: s => `<div class="dk-pad"><h3>${rich(s.title)}</h3><div class="dk-split"><div class="col bad rv"><div class="h">${ic('warn', 40)}${esc(s.badT || 'לא כך')}</div><ul>${(s.bad || []).map(x => `<li>${rich(x)}</li>`).join('')}</ul></div><div class="col good rv"><div class="h">${ic('check', 40)}${esc(s.goodT || 'כך')}</div><ul>${(s.good || []).map(x => `<li>${rich(x)}</li>`).join('')}</ul></div></div></div>`,
    quote: s => `<div class="dk-quote">${ic(s.icon || 'law', 70)}<p class="rv">${rich(s.text)}</p>${s.by ? `<small class="rv">${esc(s.by)}</small>` : ''}</div>`,
    photo: s => `<div class="dk-photo"><img class="rv" src="${esc(s.img)}" alt="${esc(s.caption || '')}">${s.caption ? `<p class="rv">${rich(s.caption)}</p>` : ''}</div>`,
  };
  const textDur = s => Math.max(4, String(s.say || '').length / 13 + 1.2); // seconds, when there is no narration file

  function mount(box, lesson) {
    const sc = (lesson.deck && lesson.deck.scenes) || [];
    if (!sc.length) { box.hidden = true; return; }
    box.hidden = false;
    box.className = 'video dk';
    box.innerHTML = `<div class="dk-frame"><div class="dk-stage"><div class="dk-brand">עו״ד יקיר דבול · קונים דירה ראשונה</div><div class="dk-scene"></div><div class="dk-cap" hidden></div>
      <button class="dk-big-play" aria-label="הפעלה"><svg viewBox="0 0 24 24" width="54" height="54"><path d="M8 5v14l11-7z" fill="currentColor"/></svg><span>צפייה בשיעור</span></button></div></div>
      <div class="dk-bar"><button class="dk-pp" aria-label="הפעלה">▶</button><div class="dk-seg">${sc.map((_, i) => `<i data-i="${i}"><b></b></i>`).join('')}</div><span class="dk-time">0:00</span>
      <button class="dk-cc" aria-pressed="false" title="כתוביות">כתוביות</button><button class="dk-fs" title="מסך מלא">⛶</button></div>`;
    const $ = q => box.querySelector(q);
    const stage = $('.dk-stage'), scene = $('.dk-scene'), cap = $('.dk-cap'), pp = $('.dk-pp'), segs = [...box.querySelectorAll('.dk-seg i')];
    const audio = new Audio(); audio.preload = 'auto';
    let cur = -1, playing = false, t0 = 0, elapsed = 0, timer = 0, dur = 0, raf = 0, cc = false;
    const fit = () => { const f = $('.dk-frame'), w = f.clientWidth, h = document.fullscreenElement === f ? f.clientHeight : w * 720 / 1280; const k = Math.min(w / 1280, h / 720); stage.style.transform = `translate(${(w - 1280 * k) / 2}px, ${(h - 720 * k) / 2}px) scale(${k})`; if (document.fullscreenElement !== f) f.style.height = h + 'px'; };
    window.addEventListener('resize', fit); setTimeout(fit, 0);
    const ro = 'ResizeObserver' in window ? new ResizeObserver(fit) : null; if (ro) ro.observe($('.dk-frame'));
    const reveal = (p) => { // items appear in turn across the scene
      const it = [...scene.querySelectorAll('.rv')]; const n = it.length;
      it.forEach((el, i) => { const at = n <= 1 ? 0 : (i / n) * 0.85; el.classList.toggle('in', p >= at); });
    };
    const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
    const tick = () => {
      const pos = sc[cur].audio && audio.src ? audio.currentTime : elapsed + (playing ? (performance.now() - t0) / 1000 : 0);
      const p = window.__dkPreview ? 1 : dur ? Math.min(1, pos / dur) : 0;
      reveal(p);
      segs.forEach((g, i) => { g.firstChild.style.width = i < cur ? '100%' : i > cur ? '0' : (p * 100) + '%'; });
      $('.dk-time').textContent = `${cur + 1}/${sc.length} · ${fmt(pos)}`;
      if (playing && !sc[cur].audio && pos >= dur) return next();
      raf = requestAnimationFrame(tick);
    };
    function load(i, autoplay) {
      cancelAnimationFrame(raf); clearTimeout(timer); audio.pause();
      cur = Math.max(0, Math.min(sc.length - 1, i)); const s = sc[cur];
      scene.className = 'dk-scene k-' + (s.kind || 'big'); scene.innerHTML = (T[s.kind] || T.big)(s);
      cap.textContent = s.say || ''; elapsed = 0; dur = textDur(s);
      if (s.audio) { audio.src = s.audio; audio.onloadedmetadata = () => { if (isFinite(audio.duration)) dur = audio.duration; }; audio.onended = () => next(); }
      else audio.removeAttribute('src');
      if (autoplay) play(); else { playing = false; pp.textContent = '▶'; }
      raf = requestAnimationFrame(tick);
    }
    function play() {
      playing = true; pp.textContent = '❚❚'; $('.dk-big-play').hidden = true; t0 = performance.now();
      if (sc[cur].audio) audio.play().catch(() => {});
      cancelAnimationFrame(raf); raf = requestAnimationFrame(tick);
    }
    function pause() {
      if (!sc[cur].audio) elapsed += (performance.now() - t0) / 1000;
      playing = false; pp.textContent = '▶'; audio.pause();
    }
    function next() { if (cur < sc.length - 1) load(cur + 1, true); else { pause(); $('.dk-big-play').hidden = false; $('.dk-big-play span').textContent = 'לצפות שוב'; cur = -1; segs.forEach(g => (g.firstChild.style.width = '100%')); } }
    pp.onclick = () => (cur < 0 ? load(0, true) : playing ? pause() : play());
    $('.dk-big-play').onclick = () => load(cur < 0 ? 0 : cur, true);
    segs.forEach((g, i) => (g.onclick = () => load(i, playing || cur >= 0)));
    $('.dk-cc').onclick = e => { cc = !cc; cap.hidden = !cc; e.currentTarget.setAttribute('aria-pressed', cc); };
    $('.dk-fs').onclick = () => { const f = $('.dk-frame'); (document.fullscreenElement ? document.exitFullscreen() : (f.requestFullscreen || f.webkitRequestFullscreen || (() => {})).call(f)); setTimeout(fit, 200); };
    document.addEventListener('fullscreenchange', () => setTimeout(fit, 100));
    stage.onclick = e => { if (e.target.closest('.dk-big-play')) return; if (cur >= 0) (playing ? pause() : play()); };
    load(0, false); cur = 0;
    // stop when the reader moves to another lesson
    return () => { pause(); cancelAnimationFrame(raf); window.removeEventListener('resize', fit); if (ro) ro.disconnect(); };
  }
  window.DabulDeck = { mount };
})();
