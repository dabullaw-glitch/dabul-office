// Courses site: purchase button, wait-list form, and the course player (personal link #t=<token>).
(() => {
  const API = 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/academy';
  const GROWTH = 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/growth';
  const $ = (s, el = document) => el.querySelector(s);
  const post = (u, body) => fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json()).catch(() => ({ ok: false }));

  // buy: the payment page address comes from the server, so the price and provider can change without a new site version
  document.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', async () => {
    b.disabled = true;
    const r = await fetch(`${API}?a=buy&c=${encodeURIComponent(b.dataset.buy)}`).then(x => x.json()).catch(() => ({}));
    b.disabled = false;
    if (r.url) { location.href = r.url; return; }
    const w = $('#wait'); if (w) { w.classList.add('on'); b.hidden = true; $('input[name=email]', w).focus(); }
  }));
  const wait = $('#wait');
  if (wait) wait.addEventListener('submit', async e => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(wait)); const m = $('.msg', wait);
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(f.email || '')) { m.textContent = 'בדקו את כתובת המייל.'; return; }
    if (!f.consent) { m.textContent = 'כדי שנוכל לעדכן אתכם, צריך לסמן את תיבת האישור.'; return; }
    const r = await post(`${GROWTH}?a=sub`, { ...f, magnet: 'buyer-checklist', source: 'academy-first-home' });
    m.textContent = r.msg || (r.ok ? 'נרשמתם. נעדכן אתכם כשההרשמה תיפתח.' : 'משהו לא עבד. נסו שוב בעוד דקה.');
  });

  // player
  if (!$('#player')) return;
  const hashTok = (location.hash.match(/t=([a-f0-9]{20,64})/) || [])[1];
  if (hashTok) { try { localStorage.setItem('dabul-course-t', hashTok); } catch (_) {} history.replaceState(null, '', location.pathname + location.search); }
  let tok = hashTok; try { tok = tok || localStorage.getItem('dabul-course-t'); } catch (_) {}
  const preview = new URLSearchParams(location.search).get('preview');
  const resend = $('#resend');
  resend.addEventListener('submit', async e => {
    e.preventDefault(); const m = $('.msg', resend); const email = resend.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(email)) { m.textContent = 'בדקו את כתובת המייל.'; return; }
    await post(`${API}?a=resend`, { email });
    m.textContent = 'אם הכתובת רשומה לקורס, הקישור בדרך אליה. בדקו גם בספאם.';
  });
  if (!tok && !preview) return;
  (async () => {
    const r = await fetch(`${API}?a=course&c=first-home${tok ? '&t=' + tok : '&preview=1'}`).then(x => x.json()).catch(() => ({}));
    if (!r.ok) { if (tok) { $('.msg', resend).textContent = 'הקישור הזה לא פעיל. הקלידו את המייל ונשלח קישור חדש.'; } return; }
    $('#gate').hidden = true; $('#player').hidden = false;
    $('#ctitle').textContent = r.title;
    const done = new Set(r.done || []);
    const toc = $('#toc');
    let cur = Math.max(0, r.lessons.findIndex(l => !done.has(l.n) && !l.locked));
    const paint = () => {
      toc.innerHTML = '';
      r.lessons.forEach((l, i) => {
        const b = document.createElement('button'); b.type = 'button';
        b.innerHTML = `<span class="n">${l.n}</span><span></span><span class="ok">${done.has(l.n) ? '✓' : l.locked ? '🔒' : ''}</span>`;
        b.children[1].textContent = l.title;
        b.setAttribute('aria-current', i === cur ? 'true' : 'false');
        b.addEventListener('click', () => { cur = i; show(); });
        toc.appendChild(b);
      });
      $('#pbar').style.width = Math.round(100 * done.size / r.lessons.length) + '%';
    };
    const show = () => {
      const l = r.lessons[cur];
      $('#ltitle').textContent = l.title;
      $('#lmeta').textContent = `שיעור ${l.n} מתוך ${r.lessons.length}${l.minutes ? ` · כ-${l.minutes} דקות קריאה` : ''}`;
      const v = $('#lvideo'); v.hidden = !l.video; v.innerHTML = l.video ? `<iframe src="${l.video}" allow="fullscreen; picture-in-picture" title="${l.title}"></iframe>` : '';
      $('#lbody').innerHTML = l.locked ? `<div class="box gold"><p><b>השיעור הזה פתוח למי שנרשם לקורס.</b></p><p>${l.summary || ''}</p><p><a class="btn btn-ink" href="first-home.html#buy">להרשמה לקורס</a></p></div>` : l.html;
      $('#prev').disabled = cur === 0; $('#next').textContent = cur === r.lessons.length - 1 ? 'סיימתי את הקורס' : 'סיימתי, לשיעור הבא';
      paint(); window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    $('#prev').addEventListener('click', () => { if (cur > 0) { cur--; show(); } });
    $('#next').addEventListener('click', async () => {
      const l = r.lessons[cur];
      if (!l.locked && tok && !done.has(l.n)) { done.add(l.n); post(`${API}?a=done`, { t: tok, c: 'first-home', n: l.n }); }
      if (cur < r.lessons.length - 1) { cur++; show(); } else paint();
    });
    show();
  })();
})();
