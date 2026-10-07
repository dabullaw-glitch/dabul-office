// The lesson video: an explainer that plays like a video (narration, animated visuals, captions, seek),
// built from lesson.deck = { scenes: [{ kind, audio?, say, ...visual data }] }. Each scene has its own narration file;
// without one (or before the narration is ready) the scene is timed by its text and shown with captions.
(() => {
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rich = s => esc(s).replace(/&lt;(\/?)b&gt;/g, '<$1b>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
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
