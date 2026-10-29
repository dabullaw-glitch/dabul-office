/* addon-greet.js (29.10.2026, approved by Yakir): "ברכות חג" under היום, next to הודעות.
   A personal holiday greeting to everyone in the system who has a phone (clients and leads, test leads left out),
   each with the person's first name. NOTHING is sent automatically: every "שליחה" opens WhatsApp (wa.me) with the
   text ready and Yakir presses send himself. The Green API sender is not used here.
   Data (docs, written through the app's normal O.patch / O.save, as the signed-in office user):
     coll "greetings", id "<holiday>-<year>"  data {holiday, label, year, text, sent: {<phone 05...>: iso time}}
     coll "greetings", id "optout"            data {<phone>: {at, name}}   people who asked not to get greetings
     coll "greetings", id "names"             data {<phone>: "first name"}  a name Yakir fixed by hand */
(function (s) {
  if (!s || s.GREET) return; s.GREET = '20261029a';
  const n = v => s.esc(v == null ? '' : String(v));
  const C = 'greetings';
  s.S.data[C] = s.S.data[C] || {};

  let later = false;
  const redraw = () => {
    const a = document.activeElement;
    if (a && a.dataset && a.dataset.grField !== undefined) { later = true; return; }
    later = false; try { if (s.bump) s.bump(); } catch { /* memo only */ }
    if (s.R && s.R.view === 'greet' && s.render) s.render();
  };
  document.addEventListener('focusout', () => { if (later) setTimeout(redraw, 60); });
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); else { s.S.loaded[C] = true; } return; }
    db.collection(C).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[C] = r; s.S.loaded[C] = true; redraw(); }, () => { s.S.loaded[C] = true; redraw(); });
  })(0);

  const st = document.createElement('style');
  st.textContent = `.gr-g{display:grid;grid-template-columns:380px minmax(0,1fr);gap:16px;align-items:start}
.gr-side{position:sticky;top:12px;display:grid;gap:14px}
.gr-hol{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}
.gr-hol .btn{min-height:36px}
.gr-ta{width:100%;min-height:210px;border:1px solid var(--line);border-radius:12px;padding:10px 12px;font:inherit;font-size:16px;line-height:1.55;background:var(--panel2);color:var(--ink);resize:vertical;box-sizing:border-box}
.gr-note{font-size:13px;color:var(--muted);margin:6px 0 0}
.gr-prog{height:10px;border-radius:5px;background:var(--line2);overflow:hidden;margin:8px 0 6px}
.gr-prog i{display:block;height:100%;background:#1faf54;border-radius:5px;transition:width .3s}
.gr-big{font-size:22px;font-weight:800}
.gr-list{display:grid;gap:10px}
.gr-row{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px;display:grid;gap:8px}
.gr-row.off{opacity:.55;background:var(--panel2)}
.gr-row.done{border-color:#1faf54}
.gr-top{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
.gr-top .who b{display:block}.gr-top .who small{color:var(--muted);font-size:12.5px}
.gr-pv{background:#e5f7d8;color:#10261a;border-radius:12px 12px 2px;padding:8px 11px;font-size:13.5px;line-height:1.5}
.gr-pv span{white-space:pre-wrap;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;max-height:4.5em}
.gr-row.off .gr-pv{display:none}
.gr-acts{display:flex;gap:6px;flex-wrap:wrap;align-items:center}
.gr-again{background:var(--panel2);border:1px solid var(--line);border-radius:10px;padding:10px 12px;display:grid;gap:8px;font-size:14px}
.gr-warn{font-size:12.5px;color:var(--muted)}
@media(prefers-color-scheme:dark){:root:not([data-theme=light]) .gr-pv{background:#1e3a2a;color:#e3f4e6}}
:root[data-theme=dark] .gr-pv{background:#1e3a2a;color:#e3f4e6}
@media(max-width:980px){.gr-g{grid-template-columns:minmax(0,1fr)}.gr-side{position:static}}
@media(max-width:560px){.gr-ta{min-height:180px}.gr-acts .btn{flex:1 1 auto;justify-content:center}.gr-top{align-items:flex-start}}`;
  document.head.appendChild(st);

  // ---------- holidays ----------
  const END = '\n\nלא רוצים לקבל ברכות? השיבו הסר';
  const HOL = [
    { k: 'rosh', l: 'ראש השנה', heb: ['Tishri', 1], t: 'שלום {שם},\nלקראת ראש השנה רציתי לאחל לך ולכל המשפחה שנה טובה ומתוקה, שנה של בריאות, שקט ושמחה.\nשנה טובה,\nיקיר דבול' + END },
    { k: 'sukkot', l: 'סוכות', heb: ['Tishri', 15], t: 'שלום {שם},\nחג סוכות שמח! מאחל לך ולכל המשפחה חג של שמחה, מנוחה וזמן טוב ביחד.\nחג שמח,\nיקיר דבול' + END },
    { k: 'hanukkah', l: 'חנוכה', heb: ['Kislev', 25], t: 'שלום {שם},\nחנוכה שמח! מאחל לך ולכל המשפחה חג מלא אור, שמחה וזמן טוב ביחד.\nחג אורים שמח,\nיקיר דבול' + END },
    { k: 'pesach', l: 'פסח', heb: ['Nisan', 15], t: 'שלום {שם},\nלקראת פסח רציתי לאחל לך ולכל המשפחה חג כשר ושמח, חג של אביב, חירות ושולחן מלא באנשים אהובים.\nחג שמח,\nיקיר דבול' + END },
    { k: 'shavuot', l: 'שבועות', heb: ['Sivan', 6], t: 'שלום {שם},\nחג שבועות שמח! מאחל לך ולכל המשפחה חג לבן, מתוק ושמח.\nחג שמח,\nיקיר דבול' + END },
    { k: 'atzmaut', l: 'יום העצמאות', heb: ['Iyar', 5], t: 'שלום {שם},\nיום עצמאות שמח! מאחל לך ולכל המשפחה חג שמח, הרבה בריאות ושקט לכולנו.\nחג שמח,\nיקיר דבול' + END },
    { k: 'other', l: 'אחר', heb: null, t: 'שלום {שם},\nחג שמח! מאחל לך ולכל המשפחה הרבה בריאות, שמחה ונחת.\nחג שמח,\nיקיר דבול' + END },
  ];
  const hol = k => HOL.find(h => h.k === k) || HOL[0];

  // the next date of each holiday (a holiday stays "current" until 10 days after it, so its sent marks stay in view)
  let nextCache = null, nextDay = '';
  function nextDates() {
    const today = s.today();
    if (nextCache && nextDay === today) return nextCache;
    const out = {};
    try {
      const f = new Intl.DateTimeFormat('en-u-ca-hebrew', { day: 'numeric', month: 'long' });
      const t0 = new Date(); t0.setHours(12, 0, 0, 0); t0.setDate(t0.getDate() - 10);
      for (let i = 0; i < 400 && Object.keys(out).length < 6; i++) {
        const d = new Date(t0); d.setDate(t0.getDate() + i);
        const p = f.formatToParts(d), m = (p.find(x => x.type === 'month') || {}).value, day = +((p.find(x => x.type === 'day') || {}).value);
        HOL.forEach(h => {
          if (!h.heb || out[h.k] || h.heb[0] !== m || h.heb[1] !== day) return;
          const x = new Date(d);
          if (h.k === 'atzmaut') { const w = x.getDay(); if (w === 5) x.setDate(x.getDate() - 1); else if (w === 6) x.setDate(x.getDate() - 2); else if (w === 1) x.setDate(x.getDate() + 1); }
          out[h.k] = s.iso(x);
        });
      }
    } catch { /* no Hebrew calendar in this browser: the year falls back to this year */ }
    nextCache = out; nextDay = today; return out;
  }
  const yearOf = k => { const d = nextDates()[k]; return d ? d.slice(0, 4) : String(new Date().getFullYear()); };
  const campId = k => k === 'other' ? 'other-' + s.today().slice(0, 7) : k + '-' + yearOf(k);
  const defaultHol = () => {
    const nd = nextDates(), t = s.today();
    const up = HOL.filter(h => nd[h.k] && s.diffDays(nd[h.k], t) >= -3).sort((a, b) => nd[a.k].localeCompare(nd[b.k]));
    return up.length ? up[0].k : 'rosh';
  };

  // ---------- people ----------
  const BIDI = /[‎‏‪-‮⁦-⁩]/g;
  const cleanName = v => String(v || '').replace(BIDI, '').replace(/\s+/g, ' ').trim();
  const isTestName = v => /בדיקה|בדיקת|לא ליד אמיתי|\btest\b/i.test(v);
  const GENERIC = /^(ליד|פונה|פנייה|לקוח|לקוחה|לא ידוע|ללא שם|אנונימי)(\s|$)|מהאתר|מפייסבוק|מגוגל/;
  const TITLES = /^(עו["״']?ד|עוה["״']?ד|ד["״']?ר|מר|גב['׳]?|גברת|הרב|רו["״']?ח|פרופ['׳]?|אדון)\.?$/;
  function firstName(full) {
    const v = cleanName(full).replace(/\([^)]*\)/g, ' ').trim();
    if (!v || GENERIC.test(v) || /^[\d\s+\-]+$/.test(v)) return '';
    const parts = v.split(/\s+/).filter(Boolean);
    while (parts.length > 1 && TITLES.test(parts[0])) parts.shift();
    return (parts[0] || '').replace(/[,.;:]+$/, '');
  }
  const doc = id => (s.S.data[C] && s.S.data[C][id]) || null;
  const optout = () => doc('optout') || {};
  const fixedNames = () => doc('names') || {};

  function people() {
    const map = new Map(), bad = { phone: 0 };
    const add = (o, type) => {
      const name = cleanName(o.name);
      if (type === 'lead' && (o.test === true || o.test === 'true' || o.test === 1)) return;
      if (isTestName(name)) return;
      if (!String(o.phone || '').trim()) return;
      const ph = s.normPhone(o.phone);
      if (!ph) { bad.phone++; return; }
      const cur = map.get(ph);
      if (cur) { if (name && cur.name !== name && !cur.also.includes(name)) cur.also.push(name); return; }
      map.set(ph, { ph, name: name || 'ללא שם', type, id: o.id, also: [], noWa: !!o.noWhatsapp, mobile: /^05/.test(ph) });
    };
    s.all('clients').forEach(o => add(o, 'client'));
    s.all('leads').forEach(o => add(o, 'lead'));
    const fx = fixedNames();
    const list = [...map.values()].map(p => Object.assign(p, { first: fx[p.ph] != null ? String(fx[p.ph]) : firstName(p.name), fixed: fx[p.ph] != null }));
    list.sort((a, b) => (a.type === b.type ? 0 : a.type === 'client' ? -1 : 1) || a.name.localeCompare(b.name, 'he'));
    return { list, bad };
  }

  const personal = (text, first) => first ? String(text).replace(/\{שם\}/g, first) : String(text).replace(/[ \t]?\{שם\}/g, '');
  const waUrl = (ph, text) => s.waLink(ph, text);
  const when = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); };

  // the text being edited, per campaign (kept here until it is saved)
  const drafts = {};
  const textOf = cid => { if (drafts[cid] != null) return drafts[cid]; const d = doc(cid); if (d && typeof d.text === 'string' && d.text.trim()) return d.text; return hol(cid.split('-')[0]).t; };
  const curHol = () => s.ui('greet', 'hol', defaultHol());

  function rowHtml(p, cid, text, sent, out, again) {
    const ot = out[p.ph], sa = sent[p.ph];
    const typ = p.type === 'client' ? '<span class="pill p-info">לקוח</span>' : '<span class="pill p-mute">פנייה</span>';
    const notes = [];
    if (!p.first) notes.push('אין שם פרטי, הברכה תתחיל ב"שלום,". אפשר להוסיף שם.');
    if (!p.mobile) notes.push('מספר קווי, ייתכן שאין בו וואטסאפ.');
    if (p.noWa) notes.push('לפי בדיקה קודמת, אין במספר הזה וואטסאפ.');
    if (p.also.length) notes.push('באותו מספר גם: ' + p.also.join(', '));
    const nameBtn = `<button class="btn xs ghost" data-a="gr-name" data-ph="${n(p.ph)}">${s.icon('edit', 13)} ${p.first ? 'שם בברכה: ' + n(p.first) : 'הוספת שם'}</button>`;
    let acts;
    if (ot) {
      acts = `<span class="pill p-mute">הוסר ${n(when(ot.at))}</span><button class="btn sm ghost" data-a="gr-unopt" data-ph="${n(p.ph)}">ביטול הסרה</button>`;
    } else if (sa && again === p.ph) {
      acts = `<div class="gr-again" style="flex:1 1 100%"><span>הברכה כבר נשלחה ל${n(p.first || p.name)} ב-${n(when(sa))}. לשלוח שוב?</span>
        <div class="gr-acts"><a class="btn sm wa" data-a="gr-send" data-ph="${n(p.ph)}" href="${n(waUrl(p.ph, text))}" target="_blank" rel="noopener">${s.icon('wa', 15)} כן, לשלוח שוב</a><button class="btn sm" data-a="gr-again-x">ביטול</button></div></div>`;
    } else if (sa) {
      acts = `<span class="pill p-ok">${s.icon('check', 13)} נשלח ${n(when(sa))}</span><button class="btn sm" data-a="gr-again" data-ph="${n(p.ph)}">שליחה שוב</button><button class="btn sm ghost" data-a="gr-unsent" data-ph="${n(p.ph)}">לא נשלח בפועל</button>`;
    } else {
      acts = `<a class="btn sm wa" data-a="gr-send" data-ph="${n(p.ph)}" href="${n(waUrl(p.ph, text))}" target="_blank" rel="noopener">${s.icon('wa', 15)} שליחה</a><button class="btn sm ghost" data-a="gr-opt" data-ph="${n(p.ph)}">סמן כהוסר</button>`;
    }
    return `<div class="gr-row${ot ? ' off' : ''}${sa && !ot ? ' done' : ''}" data-ph="${n(p.ph)}">
      <div class="gr-top"><div class="who">${s.avatar(p.name)}<div><b>${n(p.name)} ${typ}</b><small dir="ltr" style="unicode-bidi:isolate">${n(s.fmtPhone(p.ph))}</small></div></div>${ot ? '' : nameBtn}</div>
      <div class="gr-pv"><span data-gr-pv="${n(p.ph)}">${n(text)}</span></div>
      ${notes.length && !ot ? `<div class="gr-warn">${notes.map(n).join(' · ')}</div>` : ''}
      <div class="gr-acts">${acts}</div></div>`;
  }

  s.V.greet = { title: 'ברכות חג', render(el) {
    const hk = curHol(), h = hol(hk), cid = campId(hk), camp = doc(cid) || {}, sent = camp.sent || {}, out = optout();
    const text = textOf(cid), nd = nextDates()[hk];
    const { list, bad } = people();
    const f = s.ui('greet', 'f', 'all'), stt = s.ui('greet', 'st', 'all'), q = s.norm(s.ui('greet', 'q', '')), again = s.ui('greet', 'again', '');
    const active = list.filter(p => !out[p.ph]), doneN = active.filter(p => sent[p.ph]).length;
    const cnt = { all: list.length, client: list.filter(p => p.type === 'client').length, lead: list.filter(p => p.type === 'lead').length };
    let L = f === 'all' ? list : list.filter(p => p.type === f);
    if (stt === 'wait') L = L.filter(p => !out[p.ph] && !sent[p.ph]); else if (stt === 'sent') L = L.filter(p => sent[p.ph] && !out[p.ph]); else if (stt === 'off') L = L.filter(p => out[p.ph]);
    if (q) { const qd = q.replace(/\D/g, ''); L = L.filter(p => s.norm(p.name + ' ' + p.also.join(' ') + ' ' + p.first).includes(q) || (qd.length >= 3 && p.ph.includes(qd))); }
    const pct = active.length ? Math.round(doneN / active.length * 100) : 0;
    const dateTxt = nd ? `${h.l} ${nd.slice(0, 4)}: ${s.fmtDateLong(nd)} (${s.rel(nd)})` : (hk === 'other' ? 'ברכה לכל אירוע אחר. כתבו את הנוסח למטה.' : '');
    const loaded = s.S.loaded && s.S.loaded[C];
    const tid = 'gr_text_' + cid.replace(/[^a-z0-9]/gi, '_');
    const side = `<div class="gr-side">
      <div class="card"><div class="card-h"><h2>${s.icon('star', 17)} איזה חג?</h2></div><div class="card-b">
        <div class="gr-hol" role="group" aria-label="בחירת חג">${HOL.map(x => `<button class="btn sm${x.k === hk ? ' pri' : ''}" data-a="gr-hol" data-k="${x.k}"${x.k === hk ? ' aria-pressed="true"' : ''}>${n(x.l)}</button>`).join('')}</div>
        ${dateTxt ? `<p class="small muted" style="margin:0 0 10px">${n(dateTxt)}</p>` : ''}
        <label for="${tid}" style="font-weight:700;font-size:14px;display:block;margin:0 0 6px">נוסח הברכה (אפשר לערוך)</label>
        <textarea class="gr-ta" id="${tid}" data-gr-field="1" data-cid="${n(cid)}">${n(text)}</textarea>
        <p class="gr-note">איפה שכתוב {שם} יופיע השם הפרטי של כל אחד. השינויים נשמרים לבד.</p>
        <div class="btn-row" style="margin-top:10px"><button class="btn sm ghost" data-a="gr-reset" data-cid="${n(cid)}">${s.icon('refresh', 14)} החזרת הנוסח המוכן</button></div>
      </div></div>
      <div class="card"><div class="card-b">
        <div class="gr-big">נשלח ${doneN} מתוך ${active.length}</div>
        <div class="gr-prog" role="progressbar" aria-valuemin="0" aria-valuemax="${active.length}" aria-valuenow="${doneN}" aria-label="התקדמות השליחה"><i style="width:${pct}%"></i></div>
        <p class="small muted" style="margin:0">${Object.keys(out).length ? `${Object.keys(out).length} ביקשו לא לקבל ברכות ולא נספרים. ` : ''}שום הודעה לא יוצאת לבד: כל "שליחה" פותחת וואטסאפ עם הטקסט מוכן, ואתה לוחץ שלח.</p>
      </div></div></div>`;
    const segF = s.segs('f', [['all', 'הכל', cnt.all], ['client', 'לקוחות', cnt.client], ['lead', 'פניות', cnt.lead]], f);
    const segS = s.segs('st', [['all', 'כולם'], ['wait', 'עוד לא נשלח', active.length - doneN], ['sent', 'נשלח', doneN], ['off', 'הוסרו', Object.keys(out).filter(ph => list.some(p => p.ph === ph)).length]], stt);
    const main = `<div>
      <div class="toolbar">${segF}${segS}</div>
      <div class="toolbar">${s.searchBox('gr_q', 'חיפוש לפי שם או טלפון', s.ui('greet', 'q', ''))}<span class="small muted">מוצגים ${L.length} מתוך ${list.length}</span></div>
      ${!loaded ? '<p class="small muted">טוען...</p>' : ''}
      <div class="gr-list">${!loaded ? '' : L.map(p => rowHtml(p, cid, personal(text, p.first), sent, out, again)).join('') || `<div class="card">${s.empty('אין כאן אף אחד', q ? 'נסו חיפוש אחר.' : 'אין אנשים במסנן הזה.')}</div>`}</div>
      ${bad.phone ? `<p class="small muted" style="margin-top:12px">${bad.phone} כרטיסים עם מספר טלפון לא תקין לא מופיעים כאן. כדאי לתקן את המספר בכרטיס.</p>` : ''}
    </div>`;
    el.innerHTML = `<div>${s.pageHead('ברכות חג', 'ברכה אישית עם השם הפרטי לכל הלקוחות והפניות שיש להם טלפון. כל ברכה נשלחת רק כשאתה לוחץ.', '')}<div class="gr-g">${side}${main}</div></div>`;
    s.bindSearch(el, 'gr_q', 'greet', 'q');
    const ta = el.querySelector('#' + tid);
    if (ta) ta.addEventListener('input', () => onText(ta, cid));
  } };

  // ---------- editing the text ----------
  const timers = {};
  function onText(ta, cid) {
    drafts[cid] = ta.value;
    const { list } = people(), byPh = new Map(list.map(p => [p.ph, p]));
    document.querySelectorAll('[data-gr-pv]').forEach(pv => { const p = byPh.get(pv.dataset.grPv); if (p) pv.textContent = personal(ta.value, p.first); });
    document.querySelectorAll('a[data-a="gr-send"]').forEach(a => { const p = byPh.get(a.dataset.ph); if (p) a.href = waUrl(p.ph, personal(ta.value, p.first)); });
    clearTimeout(timers[cid]);
    timers[cid] = setTimeout(() => { if (s.S.loaded && s.S.loaded[C]) saveText(cid); }, 900);
  }
  function campBase(cid) { const k = cid.split('-')[0], h = hol(k); return { holiday: k, label: h.l, year: k === 'other' ? cid.slice(6) : cid.slice(k.length + 1) }; }
  async function saveText(cid) {
    if (drafts[cid] == null) return;
    const cur = doc(cid);
    if (cur && cur.text === drafts[cid]) return;
    try { await s.patch(C, cid, Object.assign(campBase(cid), { text: drafts[cid] })); } catch { /* the app shows the error */ }
  }

  // ---------- actions ----------
  // nothing is written before the saved marks have loaded (a write then could overwrite them)
  const ready = () => { if (s.S.loaded && s.S.loaded[C]) return true; s.toast('רגע, הנתונים עוד נטענים', 'bad'); return false; };
  s.act('gr-hol', (b, d) => { const prev = campId(curHol()); clearTimeout(timers[prev]); saveText(prev); s.UI.greet = s.UI.greet || {}; s.UI.greet.hol = d.k; s.UI.greet.again = ''; s.render(); });
  s.act('gr-reset', async (b, d) => {
    if (!ready()) return;
    const cid = d.cid, t = hol(cid.split('-')[0]).t;
    drafts[cid] = t; clearTimeout(timers[cid]);
    const ta = document.querySelector('textarea[data-cid="' + cid + '"]'); if (ta) ta.value = t;
    try { await s.patch(C, cid, Object.assign(campBase(cid), { text: t })); } catch { /* shown */ }
    s.render();
  });
  s.act('gr-send', (a, d, ev) => {
    if (!ready()) { if (ev) ev.preventDefault(); return; }
    const cid = campId(curHol()), text = textOf(cid);
    const p = people().list.find(x => x.ph === d.ph); if (!p) return;
    if (optout()[p.ph]) return;
    const url = waUrl(p.ph, personal(text, p.first));
    if (a.tagName === 'A' && url) a.href = url;   // the link itself opens WhatsApp in a new tab
    clearTimeout(timers[cid]);
    // mark as sent a moment later, so the screen does not redraw under the tap
    setTimeout(async () => {
      const cur = doc(cid) || {};
      const sent = Object.assign({}, cur.sent || {}, { [p.ph]: new Date().toISOString() });
      if (s.UI.greet) s.UI.greet.again = '';
      try { await s.patch(C, cid, Object.assign(campBase(cid), { text, sent })); s.toast('סומן כנשלח ל' + (p.first || p.name)); } catch { /* shown */ }
    }, 400);
  });
  s.act('gr-again', (b, d) => { s.UI.greet = s.UI.greet || {}; s.UI.greet.again = d.ph; s.render(); });
  s.act('gr-again-x', () => { if (s.UI.greet) s.UI.greet.again = ''; s.render(); });
  s.act('gr-unsent', async (b, d) => {
    if (!ready()) return;
    const cid = campId(curHol()), cur = doc(cid) || {}, sent = Object.assign({}, cur.sent || {});
    delete sent[d.ph];
    try { await s.patch(C, cid, { sent }); s.toast('הסימון בוטל'); } catch { /* shown */ }
  });
  s.act('gr-opt', async (b, d) => {
    if (!ready()) return;
    const p = people().list.find(x => x.ph === d.ph); if (!p) return;
    try { await s.patch(C, 'optout', { [p.ph]: { at: new Date().toISOString(), name: p.name } }); s.toast(p.name + ' לא יקבל יותר ברכות'); } catch { /* shown */ }
  });
  s.act('gr-unopt', async (b, d) => {
    if (!ready()) return;
    const all = Object.assign({}, optout()); delete all[d.ph];
    try { await s.save(C, 'optout', all); s.toast('ההסרה בוטלה'); } catch { /* shown */ }
  });
  s.act('gr-name', (b, d) => {
    if (!ready()) return;
    const p = people().list.find(x => x.ph === d.ph); if (!p) return;
    s.formModal({
      title: 'השם בברכה', submit: 'שמירה',
      fields: [['first', 'השם הפרטי שיופיע בברכה', 'text', { ph: 'למשל: דני', help: 'השם בכרטיס: ' + p.name + '. אם תשאירו ריק, הברכה תתחיל ב"שלום,".' }]],
      values: { first: p.first },
      onSubmit: async v => { await s.patch(C, 'names', { [p.ph]: String(v.first || '').trim() }); s.toast('השם נשמר'); },
    });
  });

  // menu: under "היום", right after "הודעות"
  try {
    const a = (s.AREAS || []).find(x => x[0] === 'today');
    if (a && !a[3].some(x => x[0] === 'greet')) { const i = a[3].findIndex(x => x[0] === 'outbox'); a[3].splice(i >= 0 ? i + 1 : a[3].length, 0, ['greet', 'ברכות חג']); }
  } catch { /* menu stays as is */ }
  // quick search (Ctrl K) knows the screen too
  try { if (Array.isArray(s.NAV) && s.NAV[0] && Array.isArray(s.NAV[0][1]) && !s.NAV[0][1].some(x => x[0] === 'greet')) s.NAV[0][1].push(['greet', 'ברכות חג', 'star']); } catch { /* fine */ }
})(window.O);
