/* addon-check.js: "בדיקות דירה" in the office system. The admin panel of the paid service "בדיקת דירה לפני קנייה"
   (orders from the office website, docs coll "chk"). For each paid order: the property and buyer details, the documents
   that were ordered (uploaded to the private files bucket), a writing box for each topic, a purchase tax estimate,
   the summary, an email preview, and sending the full answer to the client's email.
   Built 10.10.2026; not live until Yakir approves. */
(function (s) {
  if (!s || s.CHK) return; s.CHK = '20261010a';
  const n = s.esc;
  // never redraw while Yakir is typing in a box (it would drop what he typed); redraw when he leaves it
  let later = false;
  const redraw = () => { const a = document.activeElement; if (a && a.dataset && a.dataset.ckField !== undefined) { later = true; return; } later = false; try { if (s.bump) s.bump(); } catch { /* memo only */ } if (s.render) s.render(); };
  document.addEventListener('focusout', () => { if (later) setTimeout(redraw, 50); });
  s.S.data.chk = s.S.data.chk || {};
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); return; }
    db.collection('chk').onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data.chk = r; s.S.loaded.chk = true; redraw(); }, () => { s.S.loaded.chk = true; });
  })(0);

  const STATUS = { pending: ['ממתין לתשלום', 'p-mute'], paid: ['שולם, לטיפול', 'p-warn'], working: ['בעבודה', 'p-info'], sent: ['נשלח ללקוח ✓', 'p-ok'], refund: ['הוחזר', 'p-mute'] };
  const BUYER = { first: 'דירה יחידה', replace: 'מחליפים דירה', extra: 'דירה נוספת', oleh: 'עולים חדשים', foreign: 'תושבי חוץ' };
  const DOCS = { tabu: 'נסח טאבו', tzav: 'צו בית משותף', takanon: 'תקנון', tashrit: 'תשריט', permit: 'היתר בנייה', tik: 'תיק בניין', plan: 'מידע תכנוני', other: 'אחר' };
  const MARK = { ok: ['תקין', '#1e7a3c'], note: ['שימו לב', '#a86a06'], risk: ['בעיה', '#c13b2e'], na: ['לא נבדק', '#8a8f98'] };
  // the topics of the answer, in the order the client reads them
  const TOPICS = [
    ['tabu', 'נסח טאבו: בעלות, משכנתאות, עיקולים והערות', 'הנכס רשום על שם '],
    ['condo', 'בית משותף: הצמדות (חניה, מחסן, גג, חצר)', 'לפי צו הבית המשותף והתשריט, לדירה מוצמדים '],
    ['permit', 'תיק בניין והיתרים', 'לפי ההיתר האחרון בתיק הבניין, '],
    ['violations', 'חשד לחריגות בנייה', 'לא מצאנו פער בין ההיתר לבין תיאור הדירה.'],
    ['planning', 'מידע תכנוני והתחדשות עירונית', 'באזור הנכס '],
    ['tax', 'הערכת מס רכישה', ''],
    ['questions', 'שאלות למוכר ולמתווך, ומה לבקש לפני חתימה', '1. \n2. \n3. '],
  ];
  const VAT = 0.18, PRICE = 490;

  // purchase tax 2026 (the brackets are frozen until 15.1.2028); same table as the calculator on the site
  const BR = {
    first: [[0, 1978745, 0], [1978745, 2347040, 0.035], [2347040, 6055070, 0.05], [6055070, 20183565, 0.08], [20183565, Infinity, 0.1]],
    extra: [[0, 6055070, 0.08], [6055070, Infinity, 0.1]],
    oleh: [[0, 1978745, 0], [1978745, 6055070, 0.005], [6055070, 20183565, 0.08], [20183565, Infinity, 0.1]],
  };
  function tax(price, status) {
    const t = status === 'extra' || status === 'foreign' ? BR.extra : status === 'oleh' ? BR.oleh : BR.first;
    let sum = 0; for (const [a, b, r] of t) if (price > a) sum += (Math.min(price, b) - a) * r;
    return Math.round(sum);
  }
  const money = v => (v || v === 0) ? Math.round(v).toLocaleString('he-IL') + ' ₪' : '';
  // due = 2 working days (Sunday to Thursday) after payment
  function due(paidAt) {
    if (!paidAt) return null; const d = new Date(paidAt); let left = 2;
    while (left > 0) { d.setDate(d.getDate() + 1); const w = d.getDay(); if (w !== 5 && w !== 6) left--; }
    return d;
  }
  function dueText(o) {
    if (o.status === 'sent') return o.sentAt ? 'נשלח ' + s.fmtDate(String(o.sentAt).slice(0, 10)) : 'נשלח';
    const d = o.due ? new Date(o.due) : due(o.paidAt); if (!d) return '';
    const h = Math.round((d - Date.now()) / 36e5);
    if (h < 0) return `<b style="color:#c13b2e">באיחור של ${Math.ceil(-h / 24)} ימים</b>`;
    return h <= 24 ? `<b style="color:#a86a06">נשארו ${h} שעות</b>` : `נשארו ${Math.ceil(h / 24)} ימים`;
  }
  const all = () => Object.entries(s.S.data.chk || {}).map(([id, d]) => Object.assign({ id }, d));
  const addr = o => [o.address, o.city].filter(Boolean).join(', ') + (o.gush ? ` · גוש ${o.gush} חלקה ${o.chelka}${o.sub ? ' תת ' + o.sub : ''}` : '');
  const pill = st => { const [t, c] = STATUS[st] || [st, 'p-mute']; return `<span class="pill ${c}">${n(t)}</span>`; };

  const st = document.createElement('style');
  st.textContent = `.ck-row{display:flex;gap:10px;align-items:flex-start;padding:12px 4px;border-bottom:1px solid var(--line2);cursor:pointer}.ck-row:last-child{border-bottom:0}.ck-row:hover{background:var(--panel2)}
.ck-row .g{flex:1;min-width:0}.ck-row small{color:var(--muted)}
.ck-sec{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--panel)}
.ck-sec h4{margin:0 0 8px;font-size:15px;display:flex;justify-content:space-between;gap:8px;align-items:center;flex-wrap:wrap}
.ck-sec textarea{width:100%;min-height:92px;font:inherit;font-size:15px;line-height:1.6;border:1px solid var(--line);border-radius:10px;padding:9px 11px;background:var(--panel);color:var(--ink);resize:vertical}
.ck-marks{display:inline-flex;gap:4px;flex-wrap:wrap}.ck-marks button{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:2px 10px;font:inherit;font-size:12.5px;cursor:pointer;color:var(--ink2)}
.ck-marks button.on{color:#fff;border-color:transparent}
.ck-grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:12px;align-items:start}@media(max-width:1100px){.ck-grid{grid-template-columns:minmax(0,1fr)}}
.ck-side{position:sticky;top:12px}
.ck-dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;font-size:14px;margin:0}.ck-dl dt{color:var(--muted)}.ck-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}
.ck-files{display:grid;gap:6px;margin-top:8px}.ck-file{display:flex;gap:8px;align-items:center;font-size:14px;background:var(--panel2);border-radius:8px;padding:6px 9px}.ck-file .g{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ck-flags{display:grid;gap:6px;margin:8px 0}.ck-flags label{display:flex;gap:8px;align-items:center;font-size:14px}
.ck-tax{display:flex;justify-content:space-between;align-items:baseline;background:var(--panel2);border-radius:10px;padding:8px 10px;margin:8px 0;font-variant-numeric:tabular-nums}
.ck-worry{background:var(--warn-soft);border-radius:10px;padding:8px 10px;font-size:14px;margin-top:8px;white-space:pre-wrap}`;
  document.head.appendChild(st);

  // ---------- list ----------
  function listView() {
    const tab = s.ui('chk', 't', 'open');
    const A = all().sort((a, b) => String(b.paidAt || b.created || '').localeCompare(String(a.paidAt || a.created || '')));
    const F = { open: A.filter(o => o.status === 'paid' || o.status === 'working'), pending: A.filter(o => o.status === 'pending'), sent: A.filter(o => o.status === 'sent'), all: A }[tab] || A;
    const cnt = k => ({ open: A.filter(o => o.status === 'paid' || o.status === 'working').length, pending: A.filter(o => o.status === 'pending').length, sent: A.filter(o => o.status === 'sent').length, all: A.length })[k];
    const month = new Date().toISOString().slice(0, 7);
    const paidMonth = A.filter(o => o.paidAt && String(o.paidAt).slice(0, 7) === month && o.status !== 'refund').length;
    const conv = A.filter(o => o.converted).length;
    return `<div class="toolbar">${s.segs ? s.segs('t', [['open', 'לטיפול', cnt('open')], ['pending', 'ממתינות לתשלום', cnt('pending')], ['sent', 'נשלחו', cnt('sent')], ['all', 'הכל', cnt('all')]], tab) : ''}</div>
      <p class="muted small" style="margin:4px 0 10px">החודש: ${paidMonth} בדיקות שולמו · ${conv} המשיכו לעסקה מלאה</p>
      <div class="card card-b">${F.map(o => `<div class="ck-row" data-a="ck-open" data-id="${n(o.id)}"><div class="g"><div><b>${n(o.name || '')}</b> ${pill(o.status)}</div>
        <small>${n(addr(o))}${o.askPrice ? ' · ' + money(+o.askPrice) : ''} · ${n(BUYER[o.status_buyer || o.buyer] || '')}</small></div>
        <div class="small" style="text-align:left;white-space:nowrap">${dueText(o)}</div></div>`).join('') || s.empty('אין כאן הזמנות', 'הזמנות מהאתר יופיעו כאן אחרי התשלום.')}</div>`;
  }

  // ---------- one order ----------
  function orderView(o) {
    const sec = o.sections || {};
    const files = o.files || [];
    const price = +o.askPrice || 0, buyer = o.buyer || 'first';
    const t = price ? tax(price, buyer) : 0;
    const topics = TOPICS.map(([k, title, starter]) => {
      const v = sec[k] || {}; const mark = v.mark || '';
      return `<div class="ck-sec"><h4><span>${n(title)}</span><span class="ck-marks">${Object.entries(MARK).map(([m, [lbl, c]]) => `<button type="button" class="${mark === m ? 'on' : ''}" style="${mark === m ? 'background:' + c : ''}" data-a="ck-mark" data-id="${n(o.id)}" data-k="${k}" data-m="${m}">${lbl}</button>`).join('')}</span></h4>
        ${k === 'tax' ? `<div class="ck-tax"><span>${price ? `לפי ${money(price)}, ${n(BUYER[buyer] || '')}` : 'אין מחיר מבוקש בהזמנה'}</span><b>${price ? money(t) : ''}</b></div>${price && !v.text ? `<button class="btn sm ghost" data-a="ck-taxfill" data-id="${n(o.id)}">להכניס את ההערכה לטקסט</button>` : ''}` : ''}
        <textarea data-ck-field="${k}" data-id="${n(o.id)}" placeholder="${n(starter || 'מה מצאנו, ומה זה אומר בשבילכם')}">${n(v.text || '')}</textarea></div>`;
    }).join('');
    return `<div class="toolbar"><button class="btn sm ghost" data-a="ck-back">← כל ההזמנות</button></div>
      <div class="ck-grid"><div style="min-width:0">
        ${topics}
        <div class="ck-sec"><h4><span>סיכום והמלצה</span></h4>
          <textarea data-ck-field="summary" data-id="${n(o.id)}" style="min-height:120px" placeholder="בשורה התחתונה: מה מצאנו, האם יש סיבה לעצור, ומה הצעד הבא">${n(o.summary || '')}</textarea>
          <div class="ck-flags">${[['appraiser', 'כדאי שמאי (פער אפשרי במחיר)'], ['inspector', 'כדאי בודק מבנה (מצב פיזי)'], ['engineer', 'כדאי מהנדס או אדריכל (חריגות, הרחבות)']].map(([f, l]) => `<label><input type="checkbox" data-ck-flag="${f}" data-id="${n(o.id)}" ${o.flags && o.flags[f] ? 'checked' : ''}> ${l}</label>`).join('')}</div>
        </div>
      </div>
      <aside class="ck-side"><div class="card card-b">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><b>${n(o.name || '')}</b>${pill(o.status)}</div>
        <p class="small" style="margin:4px 0 10px">${dueText(o)}</p>
        <dl class="ck-dl"><dt>נכס</dt><dd>${n(addr(o))}${o.floor ? ' · ' + n(o.floor) : ''}</dd>
          <dt>מחיר</dt><dd>${price ? money(price) : 'לא צוין'}</dd><dt>מעמד</dt><dd>${n(BUYER[buyer] || '')}${o.mortgage === 'yes' ? ' · עם משכנתא' : o.mortgage === 'no' ? ' · בלי משכנתא' : ''}</dd>
          <dt>טלפון</dt><dd dir="ltr" style="text-align:right">${n(o.phone || '')}</dd><dt>מייל</dt><dd dir="ltr" style="text-align:right">${n(o.email || '')}</dd>
          ${o.link ? `<dt>מודעה</dt><dd><a href="${n(o.link)}" target="_blank" rel="noopener">פתיחה</a></dd>` : ''}
          <dt>שולם</dt><dd>${o.paidAt ? s.fmtDate(String(o.paidAt).slice(0, 10)) + ' · ' + money(PRICE * (1 + VAT)) : 'עוד לא'}</dd></dl>
        ${o.worry ? `<div class="ck-worry"><b>מה מטריד את הלקוח:</b> ${n(o.worry)}</div>` : ''}
        <hr style="border:0;border-top:1px solid var(--line2);margin:12px 0">
        <b>המסמכים שהזמנו</b>
        <div class="ck-files">${files.map((f, i) => `<div class="ck-file"><span class="g">${n(DOCS[f.kind] || f.kind)}: ${n(f.name)}</span><button class="btn sm ghost" data-a="ck-fopen" data-id="${n(o.id)}" data-i="${i}">פתיחה</button><button class="btn sm ghost" data-a="ck-fdel" data-id="${n(o.id)}" data-i="${i}" aria-label="הסרה">✕</button></div>`).join('') || '<span class="small muted">עוד לא הועלו מסמכים</span>'}</div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap"><select id="ck_kind">${Object.entries(DOCS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select><button class="btn sm" data-a="ck-up" data-id="${n(o.id)}">העלאת מסמך</button></div>
        <p class="small muted" style="margin:6px 0 0">המסמכים יישלחו ללקוח כקישורים מאובטחים, יחד עם התשובה.</p>
        <hr style="border:0;border-top:1px solid var(--line2);margin:12px 0">
        <div style="display:grid;gap:6px">
          <button class="btn" data-a="ck-preview" data-id="${n(o.id)}">תצוגה מקדימה של המייל</button>
          ${o.status === 'sent' ? `<button class="btn ghost" data-a="ck-send" data-id="${n(o.id)}">שליחה חוזרת</button>` : `<button class="btn pri" data-a="ck-send" data-id="${n(o.id)}">שליחת התשובה ללקוח</button>`}
          ${o.converted ? '<span class="small" style="color:var(--ok)">✓ המשיך לעסקה. 490 ₪ לקיזוז משכר הטרחה</span>' : `<button class="btn ghost" data-a="ck-convert" data-id="${n(o.id)}">הלקוח ממשיך לעסקה</button>`}
        </div>
      </div></aside></div>`;
  }

  // ---------- the email the client gets (the server sends the same layout) ----------
  function emailHtml(o) {
    const sec = o.sections || {};
    const block = ([k, title]) => { const v = sec[k] || {}; if (!v.text && !v.mark) return ''; const [lbl, c] = MARK[v.mark] || ['', '#8a8f98'];
      return `<tr><td style="padding:14px 0;border-top:1px solid #eee3cf"><div style="font-weight:800;color:#5c4528;font-size:16px">${n(title)} ${lbl ? `<span style="display:inline-block;font-size:12px;color:#fff;background:${c};border-radius:99px;padding:1px 9px;margin-right:6px">${lbl}</span>` : ''}</div><div style="white-space:pre-wrap;color:#1f2937;font-size:15px;line-height:1.7;margin-top:6px">${n(v.text || '')}</div></td></tr>`; };
    const flags = o.flags || {}; const rec = [flags.appraiser && 'שמאי', flags.inspector && 'בודק מבנה', flags.engineer && 'מהנדס או אדריכל'].filter(Boolean);
    const files = (o.files || []).map(f => `<li><a href="#" style="color:#8b6f47">${n(DOCS[f.kind] || f.kind)}</a></li>`).join('');
    return `<div dir="rtl" style="background:#f7f4ee;padding:20px 10px;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:14px;border:1px solid #e6dcc6" cellpadding="0" cellspacing="0"><tr><td style="padding:22px 22px 8px">
      <div style="color:#8b6f47;font-weight:800;font-size:13px">יקיר דבול - משרד עורכי דין</div>
      <h1 style="margin:6px 0 4px;font-size:22px;color:#5c4528">בדיקת הדירה שלכם מוכנה</h1>
      <div style="color:#6b7280;font-size:14px">${n(addr(o))}</div>
      <p style="font-size:15px;line-height:1.7;color:#1f2937">שלום ${n((o.name || '').split(' ')[0])}, בדקנו את המסמכים הרשמיים של הנכס. הנה מה שמצאנו, נושא אחרי נושא.</p></td></tr>
      ${o.summary ? `<tr><td style="padding:0 22px"><div style="background:#faf6ee;border-radius:12px;padding:14px"><div style="font-weight:800;color:#5c4528">בשורה התחתונה</div><div style="white-space:pre-wrap;font-size:15px;line-height:1.7;margin-top:6px">${n(o.summary)}</div>${rec.length ? `<div style="margin-top:8px;font-size:14px;color:#a86a06"><b>מומלץ להוסיף:</b> ${rec.join(', ')}. העלות שלהם לא כלולה בבדיקה.</div>` : ''}</div></td></tr>` : ''}
      <tr><td style="padding:0 22px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${TOPICS.map(block).join('')}</table></td></tr>
      ${files ? `<tr><td style="padding:6px 22px"><div style="font-weight:800;color:#5c4528">המסמכים שהזמנו ובדקנו</div><ul style="margin:6px 0 0;padding-right:18px;font-size:15px">${files}</ul><div style="font-size:12.5px;color:#6b7280">הקישורים פעילים 30 יום.</div></td></tr>` : ''}
      <tr><td style="padding:16px 22px"><div style="border:1px solid #e6dcc6;border-radius:12px;padding:12px 14px;font-size:15px;line-height:1.7">רוצים שנמשיך איתכם לעסקה? <b>490 ₪ ששילמתם מקוזזים משכר הטרחה</b> אם נחתם הסכם בתוך 90 יום.<br>טלפון: <a href="tel:098613413" style="color:#8b6f47;font-weight:800">09-8613413</a></div></td></tr>
      <tr><td style="padding:0 22px 20px;font-size:12px;color:#6b7280;line-height:1.6">הבדיקה מבוססת על המסמכים הרשמיים שהיו זמינים ועל המידע שמסרתם. היא אינה מחליפה שמאי, מהנדס או בודק מבנה, ואינה אישור לחתום על חוזה.<br>יקיר דבול - משרד עורכי דין · רזיאל 1, נתניה</td></tr>
    </table></div>`;
  }
  s.chkEmail = emailHtml;

  s.V.chk = { title: 'בדיקות דירה', render(el) {
    const id = s.ui('chk', 'id', '');
    const o = id && all().find(x => x.id === id);
    el.innerHTML = `<div>${s.pageHead('בדיקות דירה לפני קנייה', 'הזמנות מהאתר: 490 ₪ + מע"מ, תשובה ללקוח עד 2 ימי עבודה.', '')}${o ? orderView(o) : listView()}</div>`;
  } };
  try { const a = (s.AREAS || []).find(x => x[0] === 'money'); if (a && !a[3].some(x => x[0] === 'chk')) a[3].push(['chk', 'בדיקות דירה']); } catch { /* menu stays */ }

  // ---------- actions ----------
  const save = (id, patch) => s.patch('chk', id, Object.assign(patch, { updatedAt: new Date().toISOString() })).catch(() => s.toast('לא נשמר, נסה שוב', 'bad'));
  s.act('ck-open', (b, d) => { s.UI.chk = s.UI.chk || {}; s.UI.chk.id = d.id; const o = s.S.data.chk[d.id]; if (o && o.status === 'paid') save(d.id, { status: 'working' }); redraw(); window.scrollTo(0, 0); });
  s.act('ck-back', () => { s.UI.chk = s.UI.chk || {}; s.UI.chk.id = ''; redraw(); });
  s.act('ck-mark', (b, d) => { const o = s.S.data.chk[d.id] || {}; const sec = Object.assign({}, o.sections || {}); sec[d.k] = Object.assign({}, sec[d.k] || {}, { mark: d.m }); save(d.id, { sections: sec }); });
  s.act('ck-taxfill', (b, d) => {
    const o = s.S.data.chk[d.id] || {}; const p = +o.askPrice || 0; const t = tax(p, o.buyer || 'first');
    const txt = `לפי מחיר של ${money(p)} ו${BUYER[o.buyer || 'first']}, מס הרכישה המשוער הוא כ-${money(t)}. ההערכה לפי מדרגות 2026, והסכום הסופי נקבע לפי המחיר בחוזה והמצב שלכם ביום הרכישה.`;
    const sec = Object.assign({}, o.sections || {}); sec.tax = Object.assign({}, sec.tax || {}, { text: txt, mark: sec.tax && sec.tax.mark || 'ok' }); save(d.id, { sections: sec });
  });
  s.act('ck-convert', async (b, d) => { if (await s.confirm('לסמן שהלקוח ממשיך איתך לעסקה? 490 ₪ יירשמו לקיזוז משכר הטרחה.', 'לסמן')) save(d.id, { converted: true, convertedAt: new Date().toISOString() }); });
  s.act('ck-preview', (b, d) => { const o = Object.assign({ id: d.id }, s.S.data.chk[d.id] || {}); s.modal({ title: 'כך הלקוח יקבל את המייל', wide: true, body: `<div style="max-height:70vh;overflow:auto">${emailHtml(o)}</div>` }); });
  s.act('ck-send', async (b, d) => {
    const o = s.S.data.chk[d.id] || {};
    const empty = TOPICS.filter(([k]) => !(o.sections && o.sections[k] && (o.sections[k].text || o.sections[k].mark === 'na'))).map(x => x[1].split(':')[0]);
    if (!o.summary) { s.toast('חסר סיכום והמלצה', 'bad'); return; }
    if (empty.length && !(await s.confirm('אלה עוד ריקים: ' + empty.join(', ') + '.\nלשלוח בכל זאת?', 'לשלוח'))) return;
    if (!(await s.confirm(`לשלוח את התשובה ל-${o.email}?`, 'שליחה'))) return;
    try {
      const { data, error } = await window.SB.functions.invoke('precheck', { body: { action: 'send', id: d.id } });
      if (error || !data || !data.ok) throw new Error((data && data.error) || 'השליחה נכשלה');
      s.toast('נשלח ללקוח ✓');
    } catch (e) { s.toast(e.message || 'השליחה נכשלה', 'bad'); }
  });
  s.act('ck-up', (b, d) => {
    const kind = (document.getElementById('ck_kind') || {}).value || 'other';
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.pdf,image/*'; inp.multiple = true;
    inp.onchange = async () => {
      const o = s.S.data.chk[d.id] || {}; const files = (o.files || []).slice();
      for (const f of inp.files) {
        if (f.size > 20e6) { s.toast(`${f.name} גדול מ-20MB`, 'bad'); continue; }
        const path = `precheck/${d.id}/${Date.now()}-${f.name.replace(/[^\w.\-א-ת]+/g, '_')}`;
        const { error } = await window.SB.storage.from('files').upload(path, f, { contentType: f.type || 'application/pdf' });
        if (error) { s.toast('ההעלאה נכשלה: ' + f.name, 'bad'); continue; }
        files.push({ kind, name: f.name, path, size: f.size, at: new Date().toISOString() });
      }
      save(d.id, { files }); s.toast('הועלה');
    };
    inp.click();
  });
  s.act('ck-fopen', async (b, d) => { const f = ((s.S.data.chk[d.id] || {}).files || [])[+d.i]; if (!f) return; const { data } = await window.SB.storage.from('files').createSignedUrl(f.path, 600); if (data && data.signedUrl) window.open(data.signedUrl, '_blank', 'noopener'); });
  s.act('ck-fdel', async (b, d) => { const o = s.S.data.chk[d.id] || {}; const files = (o.files || []).slice(); const f = files[+d.i]; if (!f || !(await s.confirm(`להסיר את "${f.name}" מהבדיקה?`, 'הסרה', true))) return; files.splice(+d.i, 1); save(d.id, { files }); });
  // writing boxes and flags save when you leave them
  document.addEventListener('change', e => {
    const t = e.target;
    if (t.matches && t.matches('[data-ck-field]')) { const id = t.dataset.id, k = t.dataset.ckField; const o = s.S.data.chk[id] || {};
      if (k === 'summary') save(id, { summary: t.value }); else { const sec = Object.assign({}, o.sections || {}); sec[k] = Object.assign({}, sec[k] || {}, { text: t.value }); save(id, { sections: sec }); } }
    if (t.matches && t.matches('[data-ck-flag]')) { const id = t.dataset.id; const o = s.S.data.chk[id] || {}; save(id, { flags: Object.assign({}, o.flags || {}, { [t.dataset.ckFlag]: t.checked }) }); }
  });
})(window.O);
