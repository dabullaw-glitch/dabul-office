/* addon-academy.js: "קורסים" in the office system (כספים > קורסים).
   Buyers, payments, course visits and progress, lesson and video status, and the reels queue for Grok Bot.
   Read-only view of collections the server writes: enroll, payhook, course, reel. */
(function (s) {
  if (!s || s.ACAD) return; s.ACAD = '20261007a';
  const n = s.esc, ic = s.icon, fd = s.fmtDate;
  const SITE = 'https://dabullaw-glitch.github.io/dabul-office/portal.html';
  const API = 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/academy';
  const COLLS = ['enroll', 'payhook', 'course', 'reel'];
  const bump = () => (s.bump ? s.bump() : s.render());
  COLLS.forEach(c => { s.S.data[c] = s.S.data[c] || {}; });
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); return; }
    COLLS.forEach(c => db.collection(c).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[c] = r; s.S.loaded[c] = true; bump(); }, () => { s.S.loaded[c] = true; }));
  })(0);
  const st = document.createElement('style');
  st.textContent = `.ac-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}.ac-kpi .card{padding:14px}.ac-kpi b{display:block;font-size:24px;font-variant-numeric:tabular-nums}.ac-kpi span{color:var(--muted);font-size:13px}
.ac-row{display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-bottom:1px solid var(--line2)}.ac-row:last-child{border-bottom:0}.ac-row .grow{min-width:0;flex:1}.ac-row .grow div{overflow-wrap:anywhere}
.ac-bar{height:6px;border-radius:6px;background:var(--line);overflow:hidden;margin-top:6px}.ac-bar i{display:block;height:100%;background:var(--accent)}
.ac-links a{display:block;padding:8px 0;border-bottom:1px solid var(--line2);font-weight:600;text-decoration:none;color:var(--accent)}.ac-links a:last-child{border-bottom:0}`;
  document.head.appendChild(st);
  const all = c => s.all(c);
  const when = a => a ? `${fd(String(a).slice(0, 10))} ${new Date(a).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' })}` : '';
  const nis = v => '₪' + Math.round(Number(v) || 0).toLocaleString('he-IL');
  const PILL = { active: ['פעיל', 'p-ok'], awaiting: ['ממתין לאישור שלך', 'p-warn'], approved: ['אושר, ממתין להעברה', 'p-info'], handed: ['אצל גרוק בוט', 'p-info'], published: ['פורסם', 'p-ok'], rejected: ['לא לפרסם', 'p-mute'] };
  const pill = k => { const [t, c] = PILL[k] || [k || '', 'p-mute']; return `<span class="pill ${c}">${n(t)}</span>`; };
  const course = () => s.get('course', 'first-home') || {};
  const lessonsN = () => (course().lessons || []).length || 10;
  const paid = e => (e.payments || []).filter(p => !p.manual).reduce((a, p) => a + (Number(p.sum) || 0), 0);
  const buyers = () => all('enroll').filter(e => e.status === 'active').sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));

  s.act('ac-resend', async b => {
    const e = s.get('enroll', b.dataset.id); if (!e) return;
    b.disabled = true;
    try { await fetch(`${API}?a=resend`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: e.email }) }); s.toast('הקישור האישי נשלח שוב למייל של ' + (e.name || e.email)); }
    catch { s.toast('השליחה נכשלה, נסה שוב'); }
    b.disabled = false;
  });

  function overview() {
    const B = buyers(), c = course(), L = c.lessons || [], wk = Date.now() - 7 * 864e5;
    const revenue = B.reduce((a, e) => a + paid(e), 0);
    const seen = B.filter(e => e.lastSeen && Date.parse(e.lastSeen) > wk).length;
    const avg = B.length ? Math.round(B.reduce((a, e) => a + (e.done || []).length, 0) / B.length / lessonsN() * 100) : 0;
    const written = L.filter(l => l.html).length, videos = L.filter(l => l.video).length;
    const sale = c.sale || {};
    return `<div class="ac-kpi">
      <div class="card"><b>${B.length}</b><span>רוכשים</span></div>
      <div class="card"><b>${nis(revenue)}</b><span>הכנסות מהקורס</span></div>
      <div class="card"><b>${seen}</b><span>נכנסו לקורס השבוע</span></div>
      <div class="card"><b>${avg}%</b><span>התקדמות ממוצעת</span></div>
      <div class="card"><b>${written}/${L.length || 10}</b><span>שיעורים כתובים</span></div>
      <div class="card"><b>${videos}/${L.length || 10}</b><span>שיעורים עם סרטון</span></div>
    </div>
    <div class="card card-b" style="margin-top:12px"><div class="ac-row"><div class="grow"><b>${n(c.title || 'קונים דירה ראשונה, בלי הפתעות')}</b><div class="small muted">מחיר ${nis(sale.price || 390)} · ${sale.open ? 'המכירה פתוחה' : 'המכירה סגורה עד חיבור מערכת התשלום'}</div></div><span class="pill ${sale.open ? 'p-ok' : 'p-warn'}">${sale.open ? 'פתוח' : 'סגור'}</span></div></div>
    <div class="card card-b ac-links" style="margin-top:12px"><b>קישורים</b>
      <a href="${SITE}#academy" target="_blank" rel="noopener">אתר הקורסים</a>
      <a href="${SITE}#academy/first-home" target="_blank" rel="noopener">עמוד הקורס והרכישה</a>
      <a href="${SITE}#academy/learn/preview" target="_blank" rel="noopener">השיעור הפתוח לכולם</a>
    </div>`;
  }
  function buyersView() {
    const B = buyers(), N = lessonsN();
    return `<div class="card card-b">${B.map(e => {
      const d = (e.done || []).length, pct = Math.round(d / N * 100), last = (e.payments || []).slice(-1)[0] || {};
      return `<div class="ac-row"><div class="grow"><div><b>${n(e.name || e.email)}</b> · <small class="muted" dir="ltr">${n(e.email)}</small></div>
        <small class="muted">נרשם ${fd(String(e.created || '').slice(0, 10))}${paid(e) ? ' · שילם ' + nis(paid(e)) : last.manual ? ' · גישה ידנית' : ''}${last.ref ? ' · אסמכתא ' + n(last.ref) : ''} · ${e.lastSeen ? 'כניסה אחרונה ' + when(e.lastSeen) : 'עוד לא נכנס'}${e.visits ? ' · ' + e.visits + ' כניסות' : ''}</small>
        <div class="ac-bar"><i style="width:${pct}%"></i></div><small class="muted">סיים ${d} מתוך ${N} שיעורים</small>
        <div class="btn-row" style="margin-top:6px"><button class="btn sm ghost" data-a="ac-resend" data-id="${n(e.id || '')}">לשלוח שוב את הקישור</button></div></div></div>`;
    }).join('') || s.empty('עוד אין רוכשים', 'כל מי שירכוש את הקורס יופיע כאן אוטומטית, עם התשלום, הכניסות וההתקדמות שלו.')}</div>`;
  }
  function paymentsView() {
    const P = all('payhook').sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
    const flat = p => Object.assign({}, p.body || {}, (p.body || {}).data || {}, (p.body || {}).customer || {});
    return `<div class="card card-b">${P.map(p => { const f = flat(p); return `<div class="ac-row"><div class="grow"><div><b>${n(f.fullName || f.full_name || f.name || f.email || 'תשלום')}</b> · ${nis(f.sum || f.amount || f.total || 0)}</div><small class="muted">${when(p.at)} · קורס ${n(p.course || '')}${f.transactionId || f.asmachta ? ' · אסמכתא ' + n(f.transactionId || f.asmachta) : ''}</small></div></div>`; }).join('') || s.empty('עוד אין תשלומים', 'אחרי חיבור מערכת התשלום, כל תשלום יירשם כאן מיד, והרוכש יקבל את הקישור לקורס למייל.')}</div>`;
  }
  function lessonsView() {
    const L = course().lessons || [];
    return `<div class="card card-b">${L.map(l => `<div class="ac-row"><div class="grow"><div><b>${n(l.n)}. ${n(l.title)}</b>${l.free ? ' <span class="pill p-info">פתוח לכולם</span>' : ''}</div><small class="muted">${l.html ? 'שיעור כתוב' + (l.minutes ? ' · ' + l.minutes + ' דק׳ קריאה' : '') : 'בכתיבה'} · ${l.script ? 'תסריט מוכן' : 'אין תסריט עדיין'} · ${l.video ? 'יש סרטון' : 'אין סרטון עדיין'}</small>${l.video ? `<div><a class="small" href="${n(String(l.video).replace('/preview', '/view'))}" target="_blank" rel="noopener">לצפייה בסרטון</a></div>` : ''}</div>${pill(l.html && l.video ? 'published' : l.html ? 'approved' : 'awaiting')}</div>`).join('')}</div>`;
  }
  function reelsView() {
    const R = all('reel').sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    return `<div class="card card-b"><p class="muted" style="margin-top:0">רילסים ערוכים: מאשרים בטלגרם, וגרוק בוט מפרסם סרטון אחד בשבוע בפייסבוק וביוטיוב, ביום שלישי ב-19:00. אינסטגרם וטיקטוק אתה מעלה בעצמך.</p>${R.map(r => `<div class="ac-row"><div class="grow"><div><b>${n(r.name || '')}</b></div><small class="muted">${r.publishAt ? 'מתוזמן ל-' + when(r.publishAt) : 'נוצר ' + when(r.created)}</small>${r.link ? `<div><a class="small" href="${n(r.link)}" target="_blank" rel="noopener">לצפייה</a></div>` : ''}</div>${pill(r.status)}</div>`).join('') || s.empty('עוד אין רילסים', 'רילסים חדשים יופיעו כאן אחרי שהמחשב במשרד יערוך אותם.')}</div>`;
  }
  s.V.academy = {
    title: 'קורסים',
    render(el) {
      const t = s.ui('academy', 't', 'home');
      const body = t === 'buyers' ? buyersView() : t === 'pay' ? paymentsView() : t === 'lessons' ? lessonsView() : t === 'reels' ? reelsView() : overview();
      el.innerHTML = `<div>${s.pageHead('קורסים', 'הקורסים שלנו: רוכשים, תשלומים, כניסות והתקדמות, מצב השיעורים והסרטונים.', '')}
        <div class="toolbar">${s.segs ? s.segs('t', [['home', 'סקירה'], ['buyers', 'רוכשים'], ['pay', 'תשלומים'], ['lessons', 'שיעורים'], ['reels', 'רילסים']], t) : ''}</div>${body}</div>`;
    }
  };
  try { const a = (s.AREAS || []).find(x => x[0] === 'money'); if (a && !a[3].some(x => x[0] === 'academy')) a[3].push(['academy', 'קורסים']); } catch { /* menu stays as is */ }
})(window.O);
