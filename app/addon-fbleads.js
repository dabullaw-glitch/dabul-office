/* addon-fbleads.js (23.10.2026, Yakir asked: everything the Facebook groups scan finds goes into the office system,
   not into Telegram, with a direct link to each post so he can answer there).
   Screen "מפייסבוק" under לקוחות: every post the scan marked as relevant (docs coll fbleads, written by the server
   function fbleads): 🔥 someone looking for a lawyer, or ❓ a question in his fields. Each card shows the group, the post,
   a ready reply (name, office phone, site, or a short answer with a link to a matching article), and buttons:
   copy the reply, open the post on Facebook, "טופל" and "לא רלוונטי" (kept, to tune the filter later).
   Nothing is ever posted to Facebook by the system; Yakir pastes the reply himself. */
(function (O) {
  if (!O || !O.V || O.FBLEADS) return;
  O.FBLEADS = '20261023a';
  const esc = v => (O.esc ? O.esc(v == null ? '' : String(v)) : String(v == null ? '' : v));
  const icon = (n, z) => (O.icon ? O.icon(n, z) : '');
  const items = () => O.all('fbleads').filter(x => x && (x.type === 'seek' || x.type === 'question'));
  const isNew = x => !x.state || x.state === 'new';
  const when = iso => {
    const t = Date.parse(iso || ''); if (!(t > 0)) return '';
    const m = (Date.now() - t) / 60e3;
    if (m < 60) return `לפני ${Math.max(1, Math.round(m))} דק׳`;
    if (m < 24 * 60) return `לפני ${Math.round(m / 60)} שע׳`;
    const d = new Date(t); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  };
  // the screen sits under "לקוחות", next to "לידים"
  try { const area = (O.AREAS || []).find(a => a[0] === 'people'); if (area && !area[3].some(s => s[0] === 'fbleads')) area[3].push(['fbleads', 'מפייסבוק']); } catch { /* menu stays as is */ }

  O.V.fbleads = {
    title: 'לידים מקבוצות פייסבוק',
    render(p) {
      const f = O.ui('fbleads', 'f', 'new');
      const all = items().sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')));
      const cnt = { new: all.filter(isNew).length, seek: all.filter(x => isNew(x) && x.type === 'seek').length, done: all.filter(x => x.state === 'done').length, no: all.filter(x => x.state === 'no').length, all: all.length };
      let L = all;
      if (f === 'new') L = all.filter(isNew); else if (f === 'seek') L = all.filter(x => isNew(x) && x.type === 'seek'); else if (f === 'done') L = all.filter(x => x.state === 'done'); else if (f === 'no') L = all.filter(x => x.state === 'no');
      const last = (O.get && O.get('fbleads', 'lastrun')) || null;
      const sub = last && last.at ? `סריקה אחרונה ${esc(when(last.at))} · נבדקו ${+last.seen || 0} פוסטים, ${+last.hits || 0} רלוונטיים` : 'עדיין לא הייתה סריקה';
      const card = x => {
        const seek = x.type === 'seek';
        return `<div class="card" style="margin-bottom:12px${seek && isNew(x) ? ';border-color:var(--accent)' : ''}">
          <div class="card-h" style="align-items:flex-start;gap:10px;flex-wrap:wrap"><div class="grow" style="min-width:0">
            <span class="pill ${seek ? 'p-warn' : 'p-info'} plain">${seek ? '🔥 מחפש עורך דין' : '❓ שאלה בתחום'}</span>
            <b style="display:block;margin-top:6px">${esc(x.summary || x.topic || '')}</b>
            <div class="small muted">${esc(x.group || '')}${x.area ? ' · ' + esc(x.area) : ''}${x.author ? ' · ' + esc(x.author) : ''} · ${esc(when(x.at))}</div></div>
            ${x.state === 'done' ? '<span class="pill p-ok plain">טופל</span>' : x.state === 'no' ? '<span class="pill plain">לא רלוונטי</span>' : ''}</div>
          <div class="card-b">
            <details><summary class="small" style="cursor:pointer">הפוסט המלא</summary><p style="white-space:pre-wrap;margin:8px 0 0">${esc(x.text || '')}</p></details>
            <div class="small muted" style="margin:12px 0 4px">התגובה המוכנה (אפשר לערוך אחרי ההדבקה):</div>
            <div style="white-space:pre-wrap;background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;line-height:1.6">${esc(x.reply || '')}</div>
            <div class="btn-row" style="gap:8px;flex-wrap:wrap;margin-top:12px">
              <button class="btn pri sm" data-a="fbl-go" data-id="${esc(x.id)}">${icon('copy', 14)} העתקה ופתיחת הפוסט</button>
              ${x.url ? `<a class="btn sm" href="${esc(x.url)}" target="_blank" rel="noopener">פתיחת הפוסט בלבד</a>` : ''}
              <button class="btn sm" data-a="fbl-copy" data-id="${esc(x.id)}">${icon('copy', 14)} העתקה</button>
              ${x.state === 'done' ? '' : `<button class="btn sm" data-a="fbl-state" data-id="${esc(x.id)}" data-s="done">${icon('check', 14)} טופל</button>`}
              ${x.state === 'no' ? '' : `<button class="btn sm ghost" data-a="fbl-state" data-id="${esc(x.id)}" data-s="no">לא רלוונטי</button>`}
              ${x.state && x.state !== 'new' ? `<button class="btn sm ghost" data-a="fbl-state" data-id="${esc(x.id)}" data-s="new">החזרה לחדשים</button>` : ''}
            </div></div></div>`;
      };
      p.innerHTML = O.pageHead('לידים מקבוצות פייסבוק', sub)
        + `<div class="toolbar">${O.segs('f', [['new', 'חדשים', cnt.new], ['seek', 'מחפשים עורך דין', cnt.seek], ['done', 'טופלו', cnt.done], ['no', 'לא רלוונטי', cnt.no], ['all', 'הכל', cnt.all]], f)}</div>`
        + `<p class="small muted" style="margin:0 0 12px">הסורק עובר על הקבוצות שלך בפייסבוק ומביא לכאן רק מי שמחפש עורך דין או שואל שאלה בתחומים שלך. "העתקה ופתיחת הפוסט" מעתיקה את התגובה ופותחת את הפוסט, ושם מדביקים ומפרסמים.</p>`
        + (L.length ? L.map(card).join('') : O.empty(f === 'new' ? 'אין כרגע פוסטים חדשים' : 'אין פוסטים כאן', 'הסורק יוסיף לכאן פוסטים רלוונטיים אחרי כל סריקה.'));
    },
  };
  const byId = id => O.get && O.get('fbleads', id);
  const copy = async txt => { try { if (O.copy) await O.copy(txt); else await navigator.clipboard.writeText(txt); return true; } catch { return false; } };
  O.act('fbl-copy', async (el, a) => { const x = byId(a.id); if (x && await copy(x.reply || '')) O.toast && O.toast('התגובה הועתקה'); });
  O.act('fbl-go', async (el, a) => {
    const x = byId(a.id); if (!x) return;
    const w = x.url ? window.open(x.url, '_blank', 'noopener') : null; // open first, while the tap still counts as the user's action
    await copy(x.reply || '');
    O.toast && O.toast(x.url ? 'התגובה הועתקה. בפוסט: ללחוץ על תגובה ולהדביק.' : 'התגובה הועתקה');
    if (!w && x.url) location.href = x.url;
  });
  O.act('fbl-state', async (el, a) => {
    const x = byId(a.id); if (!x) return;
    await O.patch('fbleads', a.id, { state: a.s, stateAt: new Date().toISOString() });
    O.toast && O.toast(a.s === 'done' ? 'סומן כטופל' : a.s === 'no' ? 'סומן כלא רלוונטי' : 'הוחזר לחדשים');
  });
})(window.O);
