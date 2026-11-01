/* addon-video.js: "סרטונים" in the office system (כספים > סרטונים), added 9.10.2026.
   The teleprompter link, the scripts Claude writes for Yakir (collection "prompt"), the content formula, and the takes that
   arrived from the teleprompter (collection "rawvid").
   1.11.2026 (Yakir): video requests (collection "vidreq") and HeyGen. "🎬 בקשת סרטון חדש" opens a short form (type, topic,
   notes, HeyGen or filming myself). Claude writes the script, Yakir approves it (here or in Telegram), HeyGen makes the
   avatar video, Claude edits it like every reel, and Yakir approves the finished video before anything is published
   (reels go to the existing reels flow and publishing slots). For every script not filmed yet: "🎬 להכין בהייגן",
   "🎥 אצלם בעצמי", "✏️ עריכת הטקסט" (before it goes to HeyGen) and "לא אצלם". Filmed and published scripts leave the list
   (closed archive at the bottom). The scheduled task "סרטוני הייגן" (every 3 hours, 8:00 to 22:00) does the work. */
(function (s) {
  if (!s || s.VIDEO) return; s.VIDEO = '20261101a';
  const n = s.esc;
  const PROMPTER = ((window.OFFICE_CONFIG || {}).appUrl || 'https://dabullaw-glitch.github.io/dabul-office/') + 'prompter.html';
  const COLLS = ['prompt', 'rawvid', 'vidreq'];
  const bump = () => (s.bump ? s.bump() : s.render());
  COLLS.forEach(c => { s.S.data[c] = s.S.data[c] || {}; });
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); else COLLS.forEach(c => { s.S.loaded[c] = true; }); return; }
    COLLS.forEach(c => db.collection(c).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[c] = r; s.S.loaded[c] = true; bump(); }, () => { s.S.loaded[c] = true; }));
  })(0);
  const st = document.createElement('style');
  st.textContent = `.vd-go{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:14px;background:var(--accent);color:#fff;font-weight:800;font-size:18px;text-decoration:none;margin-bottom:10px}
.vd-new{display:flex;align-items:center;justify-content:center;gap:10px;width:100%;padding:15px;border-radius:14px;border:2px solid var(--accent);background:var(--panel);color:var(--accent);font:inherit;font-weight:800;font-size:18px;cursor:pointer;margin-bottom:14px}
.vd-row{display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line2)}.vd-row:last-child{border-bottom:0}.vd-row .grow{min-width:0;flex:1}
.vd-row .txt{white-space:pre-wrap;font-size:14px;color:var(--muted);margin-top:6px;max-height:4.6em;overflow:hidden}
.vd-row a.btn-s{white-space:nowrap;padding:6px 12px;border-radius:999px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;font-size:13px;text-align:center}
.vd-row .acts{display:flex;flex-direction:column;gap:6px;align-items:stretch}.vd-row button.btn-s{border:1.5px solid var(--line2);background:none;color:var(--ink2);border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.vd-row button.btn-s.hg{border-color:var(--accent);color:var(--accent)}.vd-row button.btn-s.ok{background:#1a6b34;border-color:#1a6b34;color:#fff}.vd-row button.btn-s:disabled{opacity:.45;cursor:default}
.vd-row .note{font-size:13px;margin-top:6px;color:var(--ink2);background:var(--panel2);border-radius:8px;padding:6px 10px}
.vd-skip{margin-top:12px}.vd-skip summary{cursor:pointer;color:var(--muted);padding:6px 0}
.vd-f ol{margin:6px 0 0;padding-inline-start:20px}.vd-f li{margin:4px 0}
@media (max-width:600px){.vd-row{flex-direction:column}.vd-row .acts{flex-direction:row;flex-wrap:wrap;width:100%}.vd-row .acts>*{flex:1 1 auto}}`;
  document.head.appendChild(st);
  const all = c => s.all(c);
  const TYPE = { story: ['סיפור', 'p-info'], dont: ['אל תעשו', 'p-bad'], value: ['הסבר עם ערך', 'p-ok'], myth: ['מיתוס מול עובדה', 'p-warn'], curious: ['מעניין', 'p-info'], qa: ['שאלה מהקהל', 'p-mute'], news: ['אקטואליה', 'p-info'], simple: ['בואו נעשה את זה פשוט', 'p-ok'], special: ['מיוחד', 'p-info'] };
  const ST = { draft: ['ממתין לאישור שלך', 'p-warn'], ready: ['מאושר', 'p-ok'], filmed: ['צולם', 'p-info'], done: ['פורסם', 'p-mute'], published: ['פורסם', 'p-mute'], new: ['הגיע, ממתין לעריכה', 'p-warn'], editing: ['בעריכה', 'p-info'], edited: ['נערך', 'p-ok'], skipped: ['לא יצולם', 'p-mute'] };
  const RQ = { new: ['חדש', 'p-warn'], writing: ['כותב תסריט', 'p-info'], 'script-fix': ['כותב תסריט', 'p-info'], 'script-wait': ['תסריט מחכה לאישור שלך', 'p-warn'], heygen: ['בהכנה בהייגן', 'p-info'], editing: ['בעריכה', 'p-info'], 'final-wait': ['מחכה לאישור סופי', 'p-warn'], approved: ['אושר', 'p-ok'], published: ['פורסם', 'p-mute'], rejected: ['נדחה', 'p-mute'], film: ['מחכה לצילום שלך', 'p-info'], later: ['ממתין לשלב הקורס', 'p-mute'], 'test-done': ['בדיקה', 'p-mute'] };
  const RTYPE = { reel: 'רילס לרשתות', course: 'שיעור בקורס', other: 'אחר' };
  const pill = (map, k) => { const [t, c] = map[k] || [k || '', 'p-mute']; return `<span class="pill ${c}">${n(t)}</span>`; };
  const fdt = d => d ? s.fmtDate(String(d).slice(0, 10)) : '';
  const nowIso = () => new Date().toISOString();
  const GONE = ['filmed', 'done', 'published', 'edited'];   // filmed or published: not in the list to film any more
  // a request's status, following its reel row once the finished reel went to the reels flow
  const reqStatus = r => {
    if (r.status === 'final-wait' && r.reelId) { const rl = (s.S.data.reel || {})[r.reelId]; if (rl) { if (rl.status === 'published') return 'published'; if (['approved', 'handed'].includes(rl.status)) return 'approved'; if (rl.status === 'rejected') return 'rejected'; } }
    return r.status || 'new';
  };
  const reqOf = p => (p.req && s.get('vidreq', p.req)) || all('vidreq').find(r => r.promptId === p.id && !r.test);
  const started = r => !!(r && ((r.hg && r.hg.videoId) || ['editing', 'final-wait', 'approved', 'published'].includes(reqStatus(r))));

  // ---- scripts to film (the same list the teleprompter shows) ----
  const scripts = () => all('prompt').filter(p => !p.arch).sort((a, b) => (a.order || 0) - (b.order || 0));
  const modeTag = (p, r) => {
    if (r && !['new', 'test-done'].includes(reqStatus(r))) return pill(RQ, reqStatus(r));
    if (p.mode === 'heygen') return '<span class="pill p-info">יוכן בהייגן</span>';
    if (p.mode === 'self') return '<span class="pill p-mute">אצלם בעצמי</span>';
    return '';
  };
  const row = p => {
    const r = reqOf(p), busy = started(r), skipped = p.status === 'skipped', gone = GONE.includes(p.status);
    let acts;
    if (skipped) acts = `<button class="btn-s" data-a="vd-back" data-id="${n(p.id)}">החזרה לרשימה</button>`;
    else if (gone) acts = r && r.finalUrl ? `<a class="btn-s" href="${n(r.finalUrl)}" target="_blank" rel="noopener">👁 צפייה</a>` : '';
    else acts = `${p.status === 'draft' ? `<button class="btn-s ok" data-a="vd-ok" data-id="${n(p.id)}">✅ מאשר את התסריט</button>` : ''}
      <button class="btn-s hg" data-a="vd-hg" data-id="${n(p.id)}"${busy || p.mode === 'heygen' ? ' disabled' : ''}>🎬 להכין בהייגן</button>
      ${p.mode === 'self' && !busy ? `<a class="btn-s" href="${PROMPTER}#p=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">🎥 לצילום או העלאה</a>` : `<button class="btn-s" data-a="vd-self" data-id="${n(p.id)}"${busy ? ' disabled' : ''}>🎥 אצלם בעצמי</button>`}
      <button class="btn-s" data-a="vd-edit" data-id="${n(p.id)}"${busy ? ' disabled' : ''}>✏️ עריכת הטקסט</button>
      ${!busy ? `<button class="btn-s" data-a="vd-skip" data-id="${n(p.id)}">לא אצלם</button>` : ''}`;
    return `<div class="vd-row"><div class="grow"><div><b>${n(p.title || '')}</b> ${pill(TYPE, p.type)} ${pill(ST, p.status)} ${modeTag(p, r)}</div>
      <small class="muted">${p.plan ? 'לצילום עד ' + fdt(p.plan) + ' · ' : ''}${p.sec ? 'כ-' + p.sec + ' שניות' : ''}${p.onScreen ? ' · כיתוב על המסך: ' + n(p.onScreen) : ''}</small>
      <div class="txt">${n(p.text || '')}</div>${busy && !gone ? '<div class="note">הסרטון כבר בהכנה בהייגן, ולכן אי אפשר לשנות כאן את הטקסט.</div>' : ''}</div><div class="acts">${acts}</div></div>`;
  };
  function scriptsView() {
    const P = scripts(), main = P.filter(p => p.status !== 'skipped' && !GONE.includes(p.status)), skip = P.filter(p => p.status === 'skipped'), gone = P.filter(p => GONE.includes(p.status));
    return `<div class="card card-b">${main.map(row).join('') || s.empty('אין כרגע תסריטים לצילום', 'תסריטים חדשים יופיעו כאן.')}
      ${skip.length ? `<details class="vd-skip"><summary>סימנתי שלא אצלם (${skip.length})</summary>${skip.map(row).join('')}</details>` : ''}
      ${gone.length ? `<details class="vd-skip"><summary>כבר צולמו או פורסמו (${gone.length})</summary>${gone.map(row).join('')}</details>` : ''}</div>`;
  }
  // a request row for a script (created the first time Yakir picks HeyGen or filming for it)
  async function ensureReq(p, mode, status) {
    let r = reqOf(p);
    if (r) { await s.patch('vidreq', r.id, { mode, status, updated: nowIso() }); return r.id; }
    const id = 'vr-' + Date.now().toString(36);
    await s.save('vidreq', id, { type: 'reel', topic: p.title || '', notes: '', mode, status, promptId: p.id, source: 'script', created: nowIso(), by: 'office' });
    await s.patch('prompt', p.id, { req: id });
    return id;
  }
  s.act('vd-ok', async (el, d) => {
    const p = s.get('prompt', d.id); if (!p) return;
    await s.patch('prompt', d.id, { status: 'ready', approvedAt: nowIso(), approvedBy: 'office' });
    const r = reqOf(p);
    if (r && ['script-wait', 'script-fix', 'writing'].includes(r.status)) await s.patch('vidreq', r.id, { status: r.mode === 'self' ? 'film' : r.type === 'course' ? 'later' : 'heygen', scriptApprovedAt: nowIso() });
    s.toast(r && r.mode !== 'self' ? 'התסריט אושר. הסרטון יוכן בהייגן ויגיע אליך לאישור סופי.' : 'התסריט אושר.');
  });
  s.act('vd-hg', async (el, d) => {
    const p = s.get('prompt', d.id); if (!p) return;
    if (started(reqOf(p))) { s.toast('הסרטון כבר בהכנה'); return; }
    if (!(await s.confirm(`להכין בהייגן את "${p.title || ''}"?\nהטקסט יישלח כמו שהוא עכשיו (אפשר קודם ללחוץ "עריכת הטקסט"). הסרטון ייערך ויגיע אליך לאישור סופי לפני כל פרסום.`, '🎬 להכין בהייגן'))) return;
    el.disabled = true;
    try {
      await s.patch('prompt', d.id, { mode: 'heygen', status: 'ready', approvedAt: p.approvedAt || nowIso(), approvedBy: p.approvedBy || 'office' });
      await ensureReq(p, 'heygen', 'heygen');
      s.toast('נשלח להכנה בהייגן. הסרטון הערוך יגיע אליך לאישור.');
    } catch { el.disabled = false; }
  });
  s.act('vd-self', async (el, d) => {
    const p = s.get('prompt', d.id); if (!p) return;
    if (started(reqOf(p))) { s.toast('הסרטון כבר בהכנה בהייגן'); return; }
    await s.patch('prompt', d.id, { mode: 'self' });
    const r = reqOf(p); if (r) await s.patch('vidreq', r.id, { mode: 'self', status: p.status === 'draft' ? r.status : 'film', updated: nowIso() });
    s.toast('מעולה. התסריט מחכה לך בטלפרומטר.');
  });
  s.act('vd-edit', (el, d) => {
    const p = s.get('prompt', d.id); if (!p) return;
    if (started(reqOf(p))) { s.toast('הסרטון כבר בהכנה בהייגן'); return; }
    s.formModal({ title: 'עריכת הטקסט', wide: true, submit: 'שמירה',
      fields: [['title', 'כותרת', 'text', { req: true, full: true }], ['text', 'הטקסט שנאמר בסרטון (שורה קצרה בכל נשימה)', 'textarea', { rows: 16, full: true, req: true }], ['caption', 'הטקסט שיעלה עם הסרטון ברשתות', 'textarea', { rows: 5, full: true }]],
      values: { title: p.title || '', text: p.text || '', caption: p.caption || '' },
      onSubmit: async v => {
        if (/[–—]/.test(v.text + v.title + v.caption)) { v.text = v.text.replace(/[–—]/g, '-'); v.title = v.title.replace(/[–—]/g, '-'); v.caption = v.caption.replace(/[–—]/g, '-'); }
        await s.patch('prompt', d.id, { title: v.title.trim(), text: v.text.trim(), caption: v.caption.trim(), editedAt: nowIso(), editedBy: 'office' });
        s.toast('הטקסט נשמר. זה הטקסט שיישלח להייגן.');
      } });
  });
  s.act('vd-skip', async (el, d) => { const p = s.get('prompt', d.id); if (!p) return; if (!(await s.confirm(`לסמן שלא תצלם את "${p.title || ''}"? אפשר להחזיר אותו בכל רגע.`, 'לא אצלם'))) return; await s.patch('prompt', d.id, { status: 'skipped', skippedAt: nowIso(), prevStatus: p.status || 'ready' }); });
  s.act('vd-back', async (el, d) => { const p = s.get('prompt', d.id); if (!p) return; await s.patch('prompt', d.id, { status: p.prevStatus && p.prevStatus !== 'skipped' ? p.prevStatus : 'ready', skippedAt: '' }); });

  // ---- video requests ----
  const requests = () => all('vidreq').filter(r => !r.test && r.status !== 'test-done').sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
  const OPEN = r => !['approved', 'published', 'rejected'].includes(reqStatus(r));
  function reqRow(r) {
    const p = r.promptId ? s.get('prompt', r.promptId) : null, k = reqStatus(r);
    const src = r.source === 'upd' ? ' · מלוח העדכונים' : r.source === 'script' ? ' · מרשימת התסריטים' : '';
    return `<div class="vd-row"><div class="grow"><div><b>${n((p && p.title) || r.topic || '')}</b> ${pill(RQ, k)}</div>
      <small class="muted">${n(RTYPE[r.type] || 'סרטון')} · ${r.mode === 'self' ? 'אצלם בעצמי' : 'הייגן'} · ${fdt(r.created)}${src}${r.publishAt && k === 'approved' ? ' · יפורסם ב-' + fdt(r.publishAt) : ''}</small>
      ${p && p.text && k !== 'new' ? `<div class="txt">${n(p.text)}</div>` : r.notes ? `<div class="txt">${n(r.notes)}</div>` : ''}
      ${r.status === 'script-fix' && r.fixNote ? `<div class="note">ביקשת שינוי: ${n(r.fixNote)}</div>` : ''}
      ${r.error && k !== 'approved' ? `<div class="note">${n(r.error)}</div>` : ''}</div>
      <div class="acts">${r.finalUrl ? `<a class="btn-s" href="${n(r.finalUrl)}" target="_blank" rel="noopener">👁 צפייה</a>` : ''}
      ${p && k === 'script-wait' ? `<button class="btn-s ok" data-a="vd-ok" data-id="${n(p.id)}">✅ מאשר את התסריט</button><button class="btn-s" data-a="vd-edit" data-id="${n(p.id)}">✏️ עריכת הטקסט</button><button class="btn-s" data-a="vd-fix" data-id="${n(r.id)}">צריך שינוי</button>` : ''}
      ${k === 'new' ? `<button class="btn-s" data-a="vd-cancel" data-id="${n(r.id)}">ביטול</button>` : ''}</div></div>`;
  }
  function requestsView() {
    const R = requests(), open = R.filter(OPEN), closed = R.filter(r => !OPEN(r));
    return `<div class="card card-b">${open.map(reqRow).join('') || s.empty('אין בקשות פתוחות', 'לוחצים "בקשת סרטון חדש" למעלה, ואני כותב תסריט ושולח אליך לאישור.')}
      ${closed.length ? `<details class="vd-skip"><summary>בקשות שהסתיימו (${closed.length})</summary>${closed.map(reqRow).join('')}</details>` : ''}</div>
      <p class="muted" style="margin:10px 4px 0;font-size:13px">כל שלב עובר אישור שלך: קודם התסריט, ובסוף הסרטון הערוך. שום דבר לא מתפרסם לפני האישור הסופי שלך.</p>`;
  }
  s.newVideoRequest = (pre = {}) => s.formModal({ title: '🎬 בקשת סרטון חדש', submit: 'שליחת הבקשה',
    fields: [['type', 'סוג', 'select', { options: [['reel', 'רילס לרשתות'], ['course', 'שיעור בקורס'], ['other', 'אחר']] }],
      ['topic', 'נושא', 'text', { req: true, full: true }],
      ['notes', 'הערות (לא חובה)', 'textarea', { rows: 4, full: true }],
      ['mode', 'איך מכינים', 'select', { options: [['heygen', 'הייגן (בלי לצלם)'], ['self', 'אצלם בעצמי']] }]],
    values: Object.assign({ type: 'reel', mode: 'heygen' }, pre),
    onSubmit: async v => {
      const id = 'vr-' + Date.now().toString(36);
      await s.save('vidreq', id, Object.assign({ type: v.type || 'reel', topic: String(v.topic || '').trim().slice(0, 300), notes: String(v.notes || '').trim().slice(0, 2000), mode: v.mode || 'heygen', status: 'new', created: nowIso(), by: 'office', source: pre.source || 'office' }, pre.extra || {}));
      try { s.ui('video', 't', 'req'); } catch { /* the tab stays */ }
      s.toast('הבקשה נשלחה. התסריט יגיע אליך לאישור בטלגרם ובמסך הזה.');
    } });
  s.act('vd-new', () => s.newVideoRequest());
  s.act('vd-fix', (el, d) => {
    const r = s.get('vidreq', d.id); if (!r) return;
    s.formModal({ title: 'מה לשנות בתסריט?', submit: 'שליחה', fields: [['note', 'כתוב במילים פשוטות מה לשנות', 'textarea', { rows: 5, full: true, req: true }]], values: {},
      onSubmit: async v => { await s.patch('vidreq', d.id, { status: 'script-fix', fixNote: String(v.note || '').trim(), fixAt: nowIso(), fixes: (r.fixes || []).concat([{ note: String(v.note || '').trim(), at: nowIso() }]) }); s.toast('קיבלתי. גרסה חדשה תגיע אליך לאישור.'); } });
  });
  s.act('vd-cancel', async (el, d) => { const r = s.get('vidreq', d.id); if (!r) return; if (!(await s.confirm('לבטל את הבקשה?', 'ביטול הבקשה'))) return; await s.patch('vidreq', d.id, { status: 'rejected', cancelledAt: nowIso() }); });

  function takesView() {
    const R = all('rawvid').sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
    return `<div class="card card-b">${R.map(r => `<div class="vd-row"><div class="grow"><div><b>${n(r.title || 'צילום')}</b>${r.parts > 1 ? ` · חלק ${r.part} מתוך ${r.parts}` : ''} ${pill(ST, r.status)}</div>
      <small class="muted">${fdt(r.created)} · ${r.sec || 0} שניות · ${r.h > r.w ? 'לאורך' : 'לרוחב'}${r.source === 'upload' ? ' · הועלה מהטלפון' + (r.name ? ' (' + n(r.name) + ')' : '') : ' · מהטלפרומטר'}</small>${r.text ? `<div class="txt">${n(r.text)}</div>` : ''}</div></div>`).join('') || s.empty('עוד לא הגיעו צילומים', 'צילום שנשלח מהטלפרומטר, או סרטון שהועלה מהטלפון, יופיע כאן.')}</div>`;
  }
  function formulaView() {
    return `<div class="card card-b vd-f"><b>הנוסחה לכל סרטון (30 עד 50 שניות)</b><ol>
      <li><b>2 השניות הראשונות:</b> התוצאה, הסכנה או השאלה. בלי "שלום, אני יקיר".</li>
      <li><b>משפטים קצרים:</b> משפט אחד בכל נשימה.</li>
      <li><b>מתח באמצע:</b> "ואז הוא גילה...", "תחשבו מה היה קורה...".</li>
      <li><b>לקח אחד ברור:</b> מה עושים, ומתי.</li>
      <li><b>למי זה שייך:</b> "אם אתם...", כדי שאנשים יזהו את עצמם.</li>
      <li><b>סיום שמבקש שיתוף או שמירה:</b> שליחה לחבר היא הדבר שהכי מביא אנשים חדשים.</li>
      <li><b>כיתוב גדול בפריים הראשון:</b> הרבה צופים בלי קול.</li></ol>
      <p class="muted" style="margin:10px 0 0"><b>הקצב בשבוע:</b> ראשון: סיפור מהשטח או "אל תעשו". שלישי: הסבר עם ערך. חמישי: מעניין, מיתוס מול עובדה או שאלה מהקהל.</p></div>`;
  }
  s.V.video = {
    title: 'סרטונים',
    render(el) {
      const t = s.ui('video', 't', 'scripts');
      const body = t === 'takes' ? takesView() : t === 'formula' ? formulaView() : t === 'req' ? requestsView() : scriptsView();
      const nScripts = scripts().filter(p => p.status !== 'skipped' && !GONE.includes(p.status)).length, nReq = requests().filter(OPEN).length;
      el.innerHTML = `<div>${s.pageHead('סרטונים', 'בקשות לסרטונים, תסריטים, הכנה בהייגן או צילום בטלפרומטר, וסרטונים שנשלחו לעריכה.', '')}
        <button class="vd-new" data-a="vd-new">🎬 בקשת סרטון חדש</button>
        <a class="vd-go" href="${PROMPTER}" target="_blank" rel="noopener">🎥 פתיחת הטלפרומטר</a>
        <div class="toolbar">${s.segs ? s.segs('t', [['scripts', `תסריטים לצילום (${nScripts})`], ['req', `בקשות סרטון (${nReq})`], ['takes', 'צילומים שנשלחו'], ['formula', 'הנוסחה']], t) : ''}</div>${body}</div>`;
    }
  };
  try { const a = (s.AREAS || []).find(x => x[0] === 'money'); if (a && !a[3].some(x => x[0] === 'video')) a[3].push(['video', 'סרטונים']); } catch { /* menu stays as is */ }
  // link from Telegram: .../dabul-office/#video opens this screen (#video/req: the requests tab)
  try {
    const m = location.hash.match(/^#video(?:\/(req|scripts))?$/);
    if (m) { const t0 = Date.now(), iv = setInterval(() => { if ((s.S.loaded && s.S.loaded.vidreq && typeof s.go === 'function') || Date.now() - t0 > 15000) { clearInterval(iv); try { if (m[1]) s.ui('video', 't', m[1]); history.replaceState(null, '', location.pathname); s.go('video'); } catch { /* stays on the home screen */ } } }, 300); }
  } catch { /* no deep link */ }
})(window.O);
