/* addon-upd.js (31.10.2026, approved by Yakir): "לוח עדכונים" under היום.
   Real estate and legal updates of the last days (written by the edge function upd into docs coll "upd", one doc per day),
   ranked by importance, with a topic filter. Each update: its source and link, and the buttons "פוסט" / "מאמר" / "סרטון"
   (video since 1.11.2026: a request in docs coll "vidreq", HeyGen or filming) with an optional note. A tap writes a request into docs coll "updreq" through the app's
   normal data layer; the upd function prepares it and sends it to Yakir in Telegram for approval. Nothing is published from here. */
(function (s) {
  /* 2.11.2026 (Yakir): only news from the last 3 days stay on the board ("כל מה שעבר את ה-3 ימים ולא סימנתי, שימחק");
     an older item stays only if he asked for a post / article / video on it. Every item has "🗑 לא מעניין" (a hide mark in
     updreq: {kind:'hide', status:'hidden'}; the upd function never processes it). Nothing is deleted from the database. */
  if (!s || s.UPD) return; s.UPD = '20261102a';
  const n = v => s.esc(v == null ? '' : String(v));
  const C = 'upd', Q = 'updreq';
  [C, Q].forEach(c => { s.S.data[c] = s.S.data[c] || {}; });
  const redraw = () => { try { if (s.bump) s.bump(); } catch { /* memo only */ } if (s.R && s.R.view === 'upd' && s.render) s.render(); };
  let typing = false;
  document.addEventListener('focusout', () => { if (typing) { typing = false; setTimeout(redraw, 60); } });
  const busy = () => { const a = document.activeElement; if (a && a.dataset && a.dataset.updNote !== undefined) { typing = true; return true; } return false; };
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); else { s.S.loaded[C] = s.S.loaded[Q] = true; } return; }
    [C, Q].forEach(c => db.collection(c).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[c] = r; s.S.loaded[c] = true; if (!busy()) redraw(); }, () => { s.S.loaded[c] = true; redraw(); }));
  })(0);

  const st = document.createElement('style');
  st.textContent = `.ud-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;max-width:980px}.ud-wrap>*{min-width:0}
.ud-day{margin:10px 0 2px;font-weight:800;font-size:15px;color:var(--muted)}
.ud-it{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:grid;gap:8px;border-right:5px solid var(--line2)}
.ud-it.i5,.ud-it.i4{border-right-color:#C6A03C}.ud-it.i3{border-right-color:#8fa3c4}
.ud-top{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:13px;color:var(--muted)}
.ud-tp{font-weight:700;color:var(--ink);background:var(--panel2);border-radius:999px;padding:1px 10px}
.ud-imp{font-weight:800;color:#a8873f}
.ud-it h3{margin:0;font-size:17px;line-height:1.45}
.ud-it p{margin:0;font-size:15px;line-height:1.6}
.ud-src{font-size:13px}.ud-src a{color:#0b5fcc;overflow-wrap:anywhere}
.ud-act{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.ud-act .btn{min-height:38px}
.ud-del{color:var(--muted)}
.ud-note{flex:1 1 220px;min-width:0;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font:inherit;font-size:14px;background:var(--panel2);color:var(--ink)}
.ud-st{font-size:13px;font-weight:700;border-radius:8px;padding:4px 10px;background:var(--panel2)}
.ud-st.ok{background:#e6f4ea;color:#1a6b34}.ud-st.wait{background:#fff4dc;color:#7a5600}.ud-st.bad{background:#fde8e8;color:#9b1c1c}
.ud-req{display:grid;gap:8px}.ud-rq{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:14px;background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:10px 12px}
.ud-rq b{min-width:0;overflow-wrap:anywhere;flex:1 1 200px}
@media (max-width:600px){.ud-it{padding:12px}.ud-act .btn{flex:1 1 auto}}`;
  document.head.appendChild(st);

  const KIND = { post: 'פוסט', article: 'מאמר', video: 'סרטון' };
  const STATUS = {
    queued: ['בתור', 'wait'], write: ['בכתיבה', 'wait'], awaiting: ['מחכה לאישורך בטלגרם', 'wait'], approved: ['אושר, בדרך לפרסום', 'ok'],
    published: ['פורסם ✓', 'ok'], scheduled: ['אושר, יעלה לאתר ב-06:05', 'ok'], cancelled: ['בוטל', ''], failed: ['לא הצליח', 'bad'], held: ['נעצר בבדיקה', 'bad'],
  };
  const days = () => Object.keys(s.S.data[C] || {}).filter(k => /^feed-\d{4}-\d{2}-\d{2}$/.test(k)).sort().reverse().slice(0, 7);
  const reqs = () => Object.entries(s.S.data[Q] || {}).map(([id, r]) => Object.assign({ id }, r)).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
  const reqOf = (itemId, kind) => reqs().find(r => r.item && r.item.id === itemId && r.kind === kind && r.status !== 'cancelled');
  const hidden = itemId => reqs().some(r => r.kind === 'hide' && r.status === 'hidden' && r.item && r.item.id === itemId);
  const KEEP_DAYS = 3;
  const cutoff = () => { const t = s.today ? s.today() : new Date().toISOString().slice(0, 10); return new Date(Date.parse(t) - (KEEP_DAYS - 1) * 864e5).toISOString().slice(0, 10); };
  const dayName = d => { const t = s.today ? s.today() : new Date().toISOString().slice(0, 10); if (d === t) return 'היום'; const y = new Date(Date.parse(t) - 864e5).toISOString().slice(0, 10); return d === y ? 'אתמול' : (s.fmtDateLong ? s.fmtDateLong(d) : d); };
  const stPill = r => { const x = STATUS[r.status] || [r.status || '', '']; return `<span class="ud-st ${x[1]}">${n(KIND[r.kind] || '')}: ${n(x[0])}</span>`; };

  // 1.11.2026 (Yakir): "סרטון" makes a video request (docs coll "vidreq", loaded by addon-video.js): HeyGen or filming
  // myself, then script -> his approval -> HeyGen or teleprompter -> edit -> his final approval, like every request.
  const VST = { new: 'חדש', writing: 'כותב תסריט', 'script-fix': 'כותב תסריט', 'script-wait': 'תסריט מחכה לאישורך', heygen: 'בהכנה בהייגן', editing: 'בעריכה', 'final-wait': 'מחכה לאישור סופי', approved: 'אושר', published: 'פורסם ✓', rejected: 'נדחה', film: 'מחכה לצילום שלך' };
  const vidOf = itemId => Object.entries(s.S.data.vidreq || {}).map(([id, r]) => Object.assign({ id }, r)).find(r => r.upd && r.upd.id === itemId && r.status !== 'rejected' && !r.test);
  const vidPill = r => `<span class="ud-st ${['approved', 'published'].includes(r.status) ? 'ok' : 'wait'}">סרטון: ${n(VST[r.status] || r.status || '')}</span>`;
  function itemHtml(it) {
    const rp = reqOf(it.id, 'post'), ra = reqOf(it.id, 'article'), rv = vidOf(it.id);
    return `<article class="ud-it i${n(it.imp)}">
      <div class="ud-top"><span class="ud-tp">${n(it.topic)}</span><span class="ud-imp" title="חשיבות">${'●'.repeat(Math.max(1, Math.min(5, +it.imp || 1)))}</span><span>${n(it.date ? it.date.split('-').reverse().join('.') : '')}</span></div>
      <h3>${n(it.title)}</h3>
      ${it.summary ? `<p>${n(it.summary)}</p>` : ''}
      <div class="ud-src">מקור: <a href="${n(it.source && it.source.url)}" target="_blank" rel="noopener nofollow">${n(it.source && it.source.name)}</a></div>
      <div class="ud-act">
        <button class="btn sm ud-del" data-a="ud-hide" data-id="${n(it.id)}" title="להסיר מהלוח" aria-label="לא מעניין, להסיר מהלוח">🗑 לא מעניין</button>
        <input class="ud-note" data-upd-note="${n(it.id)}" placeholder="הערה (לא חובה), למשל: להדגיש את מס השבח" aria-label="הערה לבקשה">
        <button class="btn sm pri" data-a="ud-req" data-k="post" data-id="${n(it.id)}"${rp ? ' disabled' : ''}>${s.icon('send', 14)} פוסט</button>
        <button class="btn sm" data-a="ud-req" data-k="article" data-id="${n(it.id)}"${ra ? ' disabled' : ''}>${s.icon('doc', 14)} מאמר</button>
        <button class="btn sm" data-a="ud-vid" data-id="${n(it.id)}"${rv ? ' disabled' : ''}>🎬 סרטון</button>
      </div>
      ${rp || ra || rv ? `<div class="ud-act">${rp ? stPill(rp) : ''}${ra ? stPill(ra) : ''}${rv ? vidPill(rv) : ''}</div>` : ''}
    </article>`;
  }

  s.V.upd = { title: 'לוח עדכונים', render(el) {
    const loaded = s.S.loaded && s.S.loaded[C];
    const tp = s.ui('upd', 'tp', 'all');
    const cut = cutoff(), seen = new Set();
    const keep = (it, day) => { if (!it || !it.id || seen.has(it.id) || hidden(it.id)) return false;
      const asked = reqOf(it.id, 'post') || reqOf(it.id, 'article') || vidOf(it.id);
      const d = /^\d{4}-\d{2}-\d{2}$/.test(String(it.date || '')) ? it.date : day;
      if (!asked && d < cut) return false; seen.add(it.id); return true; };
    const D = days().map(d => ({ d: d.slice(5), items: ((s.S.data[C][d] || {}).items || []).filter(it => keep(it, d.slice(5))).sort((a, b) => (b.imp || 0) - (a.imp || 0)) }));
    const all = D.flatMap(x => x.items);
    const topics = [...new Set(all.map(i => i.topic).filter(Boolean))];
    const segs = s.segs('tp', [['all', 'הכל', all.length]].concat(topics.map(t => [t, t, all.filter(i => i.topic === t).length])), tp);
    const open = reqs().filter(r => r.kind !== 'hide' && !['published', 'scheduled', 'cancelled', 'hidden'].includes(r.status)).slice(0, 8);
    const list = D.map(x => { const L = tp === 'all' ? x.items : x.items.filter(i => i.topic === tp); return L.length ? `<div class="ud-day">${n(dayName(x.d))}</div>${L.map(itemHtml).join('')}` : ''; }).join('');
    el.innerHTML = `<div>${s.pageHead('לוח עדכונים', 'עדכוני נדל"ן ומשפט משלושת הימים האחרונים, ממקורות רשמיים ומאתרי חדשות. בוחרים עדכון ולוחצים "פוסט", "מאמר" או "סרטון": הוא מוכן ונשלח אליך לאישור בטלגרם, ועולה רק אחרי שתאשר.', '')}
      <div class="ud-wrap">
        ${open.length ? `<div class="ud-req"><b>בקשות פתוחות</b>${open.map(r => `<div class="ud-rq">${stPill(r)}<b>${n(r.item && r.item.title)}</b>${r.error && r.status === 'failed' ? `<span class="small muted">${n(r.error)}</span>` : ''}</div>`).join('')}</div>` : ''}
        <div class="toolbar">${segs}</div>
        ${!loaded ? '<p class="small muted">טוען...</p>' : list || `<div class="card">${s.empty('אין עדכונים עדיין', 'הלוח מתמלא כל בוקר ב-06:20 ומתעדכן שוב ב-13:20.')}</div>`}
      </div></div>`;
  } };

  s.act('ud-req', async (b, d) => {
    if (!(s.S.loaded && s.S.loaded[C] && s.S.loaded[Q])) { s.toast('רגע, הנתונים עוד נטענים', 'bad'); return; }
    let it = null; for (const k of days()) { it = ((s.S.data[C][k] || {}).items || []).find(x => x.id === d.id); if (it) break; }
    if (!it) return;
    if (reqOf(it.id, d.k)) { s.toast('כבר ביקשת את זה'); return; }
    const inp = document.querySelector('[data-upd-note="' + it.id + '"]');
    const note = inp ? String(inp.value || '').trim().slice(0, 500) : '';
    const id = 'q-' + Date.now().toString(36);
    b.disabled = true;
    try {
      await s.save(Q, id, { kind: d.k, status: 'queued', note, created: new Date().toISOString(), by: 'office',
        item: { id: it.id, title: it.title, summary: it.summary, topic: it.topic, date: it.date, source: it.source } });
      s.toast(d.k === 'post' ? 'הבקשה נשלחה. הפוסט יגיע אליך לאישור בטלגרם.' : 'הבקשה נשלחה. המאמר יגיע אליך לאישור בטלגרם (לוקח קצת יותר זמן).');
    } catch { b.disabled = false; }
  });

  s.act('ud-hide', async (b, d) => {
    if (!(s.S.loaded && s.S.loaded[Q])) { s.toast('רגע, הנתונים עוד נטענים', 'bad'); return; }
    let it = null; for (const k of days()) { it = ((s.S.data[C][k] || {}).items || []).find(x => x.id === d.id); if (it) break; }
    if (!it) return;
    b.disabled = true;
    try {
      await s.save(Q, 'h-' + String(it.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 60), { kind: 'hide', status: 'hidden', created: new Date().toISOString(), by: 'office', item: { id: it.id, title: it.title || '' } });
      s.toast('הוסר מהלוח');
    } catch { b.disabled = false; }
  });

  s.act('ud-vid', (b, d) => {
    let it = null; for (const k of days()) { it = ((s.S.data[C][k] || {}).items || []).find(x => x.id === d.id); if (it) break; }
    if (!it) return;
    if (vidOf(it.id)) { s.toast('כבר ביקשת סרטון על העדכון הזה'); return; }
    if (typeof s.newVideoRequest !== 'function') { s.toast('מסך הסרטונים עוד נטען, נסה שוב בעוד רגע', 'bad'); return; }
    const inp = document.querySelector('[data-upd-note="' + it.id + '"]');
    const note = inp ? String(inp.value || '').trim().slice(0, 500) : '';
    s.newVideoRequest({ type: 'reel', topic: it.title || '', notes: note, source: 'upd',
      extra: { upd: { id: it.id, title: it.title || '', summary: it.summary || '', topic: it.topic || '', date: it.date || '', source: it.source || null } } });
  });

  // menu: under "היום", after "ברכות חג" (or after "הודעות")
  try {
    const a = (s.AREAS || []).find(x => x[0] === 'today');
    if (a && !a[3].some(x => x[0] === 'upd')) { let i = a[3].findIndex(x => x[0] === 'greet'); if (i < 0) i = a[3].findIndex(x => x[0] === 'outbox'); a[3].splice(i >= 0 ? i + 1 : a[3].length, 0, ['upd', 'לוח עדכונים']); }
  } catch { /* menu stays as is */ }
  try { if (Array.isArray(s.NAV) && s.NAV[0] && Array.isArray(s.NAV[0][1]) && !s.NAV[0][1].some(x => x[0] === 'upd')) s.NAV[0][1].push(['upd', 'לוח עדכונים', 'doc']); } catch { /* fine */ }
})(window.O);
