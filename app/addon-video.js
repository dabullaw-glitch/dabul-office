/* addon-video.js: "סרטונים" in the office system (כספים > סרטונים), added 9.10.2026.
   The teleprompter link, the scripts Claude writes for Yakir to film (collection "prompt"),
   the content formula, and the takes that arrived from the teleprompter (collection "rawvid"). */
(function (s) {
  if (!s || s.VIDEO) return; s.VIDEO = '20261012a';
  const n = s.esc;
  const PROMPTER = ((window.OFFICE_CONFIG || {}).appUrl || 'https://dabullaw-glitch.github.io/dabul-office/') + 'prompter.html';
  const COLLS = ['prompt', 'rawvid'];
  const bump = () => (s.bump ? s.bump() : s.render());
  COLLS.forEach(c => { s.S.data[c] = s.S.data[c] || {}; });
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); return; }
    COLLS.forEach(c => db.collection(c).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[c] = r; s.S.loaded[c] = true; bump(); }, () => { s.S.loaded[c] = true; }));
  })(0);
  const st = document.createElement('style');
  st.textContent = `.vd-go{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px;border-radius:14px;background:var(--accent);color:#fff;font-weight:800;font-size:18px;text-decoration:none;margin-bottom:14px}
.vd-row{display:flex;gap:10px;align-items:flex-start;padding:12px 0;border-bottom:1px solid var(--line2)}.vd-row:last-child{border-bottom:0}.vd-row .grow{min-width:0;flex:1}
.vd-row .txt{white-space:pre-wrap;font-size:14px;color:var(--muted);margin-top:6px;max-height:4.6em;overflow:hidden}
.vd-row a.btn-s{white-space:nowrap;padding:6px 12px;border-radius:999px;background:var(--accent);color:#fff;text-decoration:none;font-weight:700;font-size:13px}
.vd-row .acts{display:flex;flex-direction:column;gap:6px;align-items:stretch}.vd-row button.btn-s{border:1.5px solid var(--line2);background:none;color:var(--ink2);border-radius:999px;padding:5px 12px;font:inherit;font-size:13px;font-weight:700;cursor:pointer;white-space:nowrap}
.vd-skip{margin-top:12px}.vd-skip summary{cursor:pointer;color:var(--muted);padding:6px 0}
.vd-f ol{margin:6px 0 0;padding-inline-start:20px}.vd-f li{margin:4px 0}`;
  document.head.appendChild(st);
  const all = c => s.all(c);
  const TYPE = { story: ['סיפור מהשטח', 'p-info'], dont: ['אל תעשו', 'p-bad'], value: ['הסבר עם ערך', 'p-ok'], myth: ['מיתוס מול עובדה', 'p-warn'], curious: ['מעניין', 'p-info'], qa: ['שאלה מהקהל', 'p-mute'] };
  const ST = { draft: ['ממתין לאישור שלך', 'p-warn'], ready: ['מאושר לצילום', 'p-ok'], filmed: ['צולם', 'p-info'], done: ['פורסם', 'p-mute'], new: ['הגיע, ממתין לעריכה', 'p-warn'], editing: ['בעריכה', 'p-info'], edited: ['נערך', 'p-ok'], skipped: ['לא יצולם', 'p-mute'] };
  const pill = (map, k) => { const [t, c] = map[k] || [k || '', 'p-mute']; return `<span class="pill ${c}">${n(t)}</span>`; };
  const fdt = d => d ? s.fmtDate(String(d).slice(0, 10)) : '';

  // the same list the teleprompter shows (12.10.2026): every script that is not archived; "skipped" ones in a closed section
  const scripts = () => all('prompt').filter(p => !p.arch).sort((a, b) => (a.order || 0) - (b.order || 0));
  const row = p => `<div class="vd-row"><div class="grow"><div><b>${n(p.title || '')}</b> ${pill(TYPE, p.type)} ${pill(ST, p.status)}</div>
      <small class="muted">${p.plan ? 'לצילום עד ' + fdt(p.plan) + ' · ' : ''}${p.sec ? 'כ-' + p.sec + ' שניות' : ''}${p.onScreen ? ' · כיתוב על המסך: ' + n(p.onScreen) : ''}</small>
      <div class="txt">${n(p.text || '')}</div></div><div class="acts">${p.status === 'skipped'
        ? `<button class="btn-s" data-a="vd-back" data-id="${n(p.id)}">החזרה לרשימה</button>`
        : `<a class="btn-s" href="${PROMPTER}#p=${encodeURIComponent(p.id)}" target="_blank" rel="noopener">לצילום או העלאה</a>${p.status !== 'done' ? `<button class="btn-s" data-a="vd-skip" data-id="${n(p.id)}">לא אצלם</button>` : ''}`}</div></div>`;
  function scriptsView() {
    const P = scripts(), main = P.filter(p => p.status !== 'skipped'), skip = P.filter(p => p.status === 'skipped');
    return `<div class="card card-b">${main.map(row).join('') || s.empty('אין כרגע תסריטים לצילום', 'תסריטים חדשים לצילום יופיעו כאן.')}
      ${skip.length ? `<details class="vd-skip"><summary>סימנתי שלא אצלם (${skip.length})</summary>${skip.map(row).join('')}</details>` : ''}</div>`;
  }
  s.act('vd-skip', async (el, d) => { const p = s.get('prompt', d.id); if (!p) return; if (!(await s.confirm(`לסמן שלא תצלם את "${p.title || ''}"? אפשר להחזיר אותו בכל רגע.`, 'לא אצלם'))) return; await s.patch('prompt', d.id, { status: 'skipped', skippedAt: new Date().toISOString(), prevStatus: p.status || 'ready' }); });
  s.act('vd-back', async (el, d) => { const p = s.get('prompt', d.id); if (!p) return; await s.patch('prompt', d.id, { status: p.prevStatus && p.prevStatus !== 'skipped' ? p.prevStatus : 'ready', skippedAt: '' }); });
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
      const body = t === 'takes' ? takesView() : t === 'formula' ? formulaView() : scriptsView();
      el.innerHTML = `<div>${s.pageHead('סרטונים', 'תסריטים לצילום, הטלפרומטר, וסרטונים שנשלחו לעריכה (מהטלפרומטר או שהועלו מהטלפון).', '')}
        <a class="vd-go" href="${PROMPTER}" target="_blank" rel="noopener">🎥 פתיחת הטלפרומטר</a>
        <div class="toolbar">${s.segs ? s.segs('t', [['scripts', `תסריטים לצילום (${scripts().filter(p => p.status !== 'skipped').length})`], ['takes', 'צילומים שנשלחו'], ['formula', 'הנוסחה']], t) : ''}</div>${body}</div>`;
    }
  };
  try { const a = (s.AREAS || []).find(x => x[0] === 'money'); if (a && !a[3].some(x => x[0] === 'video')) a[3].push(['video', 'סרטונים']); } catch { /* menu stays as is */ }
})(window.O);
