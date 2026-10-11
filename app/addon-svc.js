/* addon-svc.js: "הזמנות אונליין" in the office system. The orders of the online legal services from the website
   (docs coll "svc", written by the "services" function): list by status and service, and for each order the client,
   the answers with the questions as the client saw them, the price, the files (download links from the server),
   status changes, an email to the client, and the history. The service definitions come from svc-config.json,
   the same file the order form uses. Built 10.10.2026; live in the office system from 11.10.2026. */
(function (s) {
  if (!s || s.SVC) return; s.SVC = '20261010a';
  const n = s.esc;
  const CFG_URL = 'https://dabullaw-glitch.github.io/dabul-office/media/widgets/svc-config.json';
  let CFG = null;
  fetch(CFG_URL, { cache: 'no-store' }).then(r => r.json()).then(c => { CFG = c; redraw(); }).catch(() => {});
  let later = false;
  const redraw = () => { const a = document.activeElement; if (a && a.dataset && a.dataset.svField !== undefined) { later = true; return; } later = false; try { if (s.bump) s.bump(); } catch { /* memo only */ } if (s.render) s.render(); };
  document.addEventListener('focusout', () => { if (later) setTimeout(redraw, 50); });
  s.S.data.svc = s.S.data.svc || {};
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); return; }
    db.collection('svc').onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data.svc = r; s.S.loaded.svc = true; redraw(); }, () => { s.S.loaded.svc = true; });
  })(0);

  const STATUS = {
    draft: ['הטופס לא הושלם', 'p-mute'], review: ['לבדיקה לפני תשלום', 'p-warn'], awaiting: ['ממתין לתשלום', 'p-info'],
    paid: ['שולם, לטיפול', 'p-warn'], working: ['בטיפול', 'p-info'], done: ['הסתיים ✓', 'p-ok'], cancelled: ['בוטל', 'p-mute'], refund: ['הוחזר', 'p-mute'],
  };
  const NEXT = ['review', 'awaiting', 'paid', 'working', 'done', 'cancelled', 'refund'];
  const money = v => (v || v === 0) ? Number(v).toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' ₪' : '';
  const svcDef = id => (CFG && CFG.services.find(x => x.id === id)) || null;
  const all = () => Object.entries(s.S.data.svc || {}).map(([id, d]) => Object.assign({ id }, d)).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
  const pill = st => { const [t, c] = STATUS[st] || [st, 'p-mute']; return `<span class="pill ${c}">${n(t)}</span>`; };
  const when = iso => { if (!iso) return ''; const d = new Date(iso); return d.toLocaleDateString('he-IL') + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); };
  const slotTxt = v => v && v !== 'later' ? v.split(' ')[0].split('-').reverse().join('.') + ' ' + (v.split(' ')[1] || '') : (v === 'later' ? 'יתואם בטלפון' : '');

  // the answer of one field, written the way the client saw it
  function answer(f, v) {
    if (v == null || v === '' || (Array.isArray(v) && !v.length)) return '';
    if (f.t === 'choice') { const o = (f.opts || []).find(x => x.v === v); return n(o ? o.l : v); }
    if (f.t === 'checks') return (Array.isArray(v) ? v : []).map(x => { const o = (f.opts || []).find(y => y.v === x); return n(o ? o.l : x); }).join(', ');
    if (f.t === 'slot') return n(slotTxt(v));
    if (f.t === 'list') return (Array.isArray(v) ? v : []).map((row, i) => `<div class="sv-li"><b>${n(f.item || '')} ${i + 1}</b>${(f.fields || []).map(g => row[g.k] ? `<span>${n(g.q)}: ${g.t === 'choice' ? n(((g.opts || []).find(o => o.v === row[g.k]) || {}).l || row[g.k]) : n(row[g.k])}</span>` : '').join('')}</div>`).join('');
    if (f.fmt === 'money') return n(money(+String(v).replace(/[^\d.]/g, '')));
    if (f.fmt === 'url') return `<a href="${n(v)}" target="_blank" rel="noopener">${n(v)}</a>`;
    return n(v).replace(/\n/g, '<br>');
  }

  const st = document.createElement('style');
  st.textContent = `.sv-row{display:flex;gap:10px;align-items:flex-start;padding:12px 4px;border-bottom:1px solid var(--line2);cursor:pointer}.sv-row:last-child{border-bottom:0}.sv-row:hover{background:var(--panel2)}
.sv-row .g{flex:1;min-width:0}.sv-row small{color:var(--muted)}
.sv-fl{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 10px}.sv-fl button{border:1px solid var(--line);background:var(--panel);border-radius:999px;padding:4px 12px;font:inherit;font-size:13.5px;cursor:pointer;color:var(--ink2)}.sv-fl button.on{background:var(--ink);color:var(--panel);border-color:var(--ink)}
.sv-grid{display:grid;grid-template-columns:minmax(0,1fr) 330px;gap:12px;align-items:start}@media(max-width:1100px){.sv-grid{grid-template-columns:minmax(0,1fr)}}
.sv-sec{border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px;background:var(--panel)}
.sv-sec h4{margin:0 0 8px;font-size:15px}
.sv-dl{display:grid;grid-template-columns:minmax(0,40%) minmax(0,1fr);gap:6px 12px;font-size:14px;margin:0}.sv-dl dt{color:var(--muted)}.sv-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}
.sv-li{display:flex;flex-direction:column;gap:1px;background:var(--panel2);border-radius:8px;padding:6px 9px;margin-bottom:6px}
.sv-pr{display:flex;justify-content:space-between;gap:8px;font-size:14px;padding:3px 0;font-variant-numeric:tabular-nums}.sv-pr.t{border-top:1px solid var(--line);margin-top:4px;padding-top:6px;font-weight:800}
.sv-files{display:grid;gap:6px}.sv-file{display:flex;gap:8px;align-items:center;font-size:14px;background:var(--panel2);border-radius:8px;padding:6px 9px}.sv-file .g{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.sv-rev{background:var(--warn-soft);border-radius:10px;padding:8px 10px;font-size:14px;margin-bottom:10px}
.sv-log{font-size:13.5px;color:var(--ink2);display:grid;gap:4px}.sv-log small{color:var(--muted)}
.sv-sec input,.sv-sec textarea{width:100%;font:inherit;font-size:14.5px;border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:var(--panel);color:var(--ink);margin-bottom:6px}
.sv-sec textarea{min-height:110px;resize:vertical;line-height:1.6}
.sv-sts{display:flex;flex-wrap:wrap;gap:6px}`;
  document.head.appendChild(st);

  function listView() {
    const f = s.ui('svc', 'st', 'open'), sv = s.ui('svc', 'sv', ''), test = s.ui('svc', 'test', false);
    const open = o => !['done', 'cancelled', 'refund', 'draft'].includes(o.status);
    let rows = all().filter(o => test || !o.test);
    const counts = { open: rows.filter(open).length, review: 0, awaiting: 0, paid: 0, working: 0, done: 0, all: rows.length };
    rows.forEach(o => { if (counts[o.status] !== undefined) counts[o.status]++; });
    rows = rows.filter(o => f === 'all' ? true : f === 'open' ? open(o) : o.status === f).filter(o => !sv || o.svc === sv);
    const tabs = [['open', 'פתוחות'], ['review', 'לבדיקה'], ['awaiting', 'ממתינות לתשלום'], ['paid', 'שולמו'], ['working', 'בטיפול'], ['done', 'הסתיימו'], ['all', 'הכול']]
      .map(([k, t]) => `<button data-a="sv-f" data-k="st" data-v="${k}" class="${f === k ? 'on' : ''}">${t} (${counts[k] || 0})</button>`).join('');
    const svs = (CFG ? CFG.services : []).map(x => `<button data-a="sv-f" data-k="sv" data-v="${sv === x.id ? '' : x.id}" class="${sv === x.id ? 'on' : ''}">${n(x.title)}</button>`).join('');
    const list = rows.length ? rows.map(o => `<div class="sv-row" data-a="sv-open" data-id="${n(o.id)}"><div class="g"><b>${n(o.c && o.c.name || '')}</b> · ${n(o.title || o.svc)}${o.slot ? ` · 🗓 ${n(slotTxt(o.slot))}` : ''}<br><small>${n(o.id)} · ${n(when(o.created))}${o.test ? ' · בדיקה' : ''}</small></div><div style="text-align:left">${pill(o.status)}<br><small>${n(money(o.price && o.price.total))}</small></div></div>`).join('')
      : `<div class="empty">אין הזמנות כאן.</div>`;
    return `<div class="sv-fl">${tabs}</div><div class="sv-fl">${svs}<button data-a="sv-f" data-k="test" data-v="${test ? '' : '1'}" class="${test ? 'on' : ''}">להציג בדיקות</button></div><div class="card" style="padding:4px 12px">${list}</div>`;
  }

  function orderView(o) {
    const d = svcDef(o.svc), a = o.a || {}, c = o.c || {};
    const fields = d ? d.fields.filter(f => f.t !== 'file') : Object.keys(a).map(k => ({ k, q: k, t: 'text' }));
    const qa = fields.map(f => { const v = answer(f, a[f.k]); return v ? `<dt>${n(f.q)}</dt><dd>${v}</dd>` : ''; }).join('');
    const meet = o.meet && CFG && CFG.meeting[o.meet] ? `<dt>חתימה</dt><dd>${n(CFG.meeting[o.meet].l)}</dd>` : '';
    const pr = o.price || { lines: [] };
    const price = (pr.lines || []).map(l => `<div class="sv-pr"><span>${n(l.l)}</span><span>${money(l.p)}</span></div>`).join('') + `<div class="sv-pr"><span>מע״מ</span><span>${money(pr.vat)}</span></div><div class="sv-pr t"><span>סה״כ</span><span>${money(pr.total)}</span></div>`;
    const files = (o.files || []).length ? `<div class="sv-files">${o.files.map((f, i) => `<div class="sv-file"><span class="g">${n(f.name)}</span>${f.up ? `<button class="btn sm" data-a="sv-file" data-id="${n(o.id)}" data-i="${i}">הורדה</button>` : '<small>לא הועלה</small>'}</div>`).join('')}</div>` : '<small>לא צורפו קבצים.</small>';
    const sts = NEXT.filter(x => x !== o.status).map(x => `<button class="btn sm" data-a="sv-status" data-id="${n(o.id)}" data-s="${x}">${n(STATUS[x][0])}</button>`).join('');
    const log = (o.log || []).slice().reverse().map(l => `<div>${n(l.text)} <small>${n(when(l.at))}</small></div>`).join('');
    const chk = o.svc === 'precheck' ? `<button class="btn" data-a="sv-chk" data-id="${n(o.id)}">לכתוב את התשובה בבדיקות דירה ←</button>` : '';
    return `<p><button class="btn ghost sm" data-a="sv-back">→ לכל ההזמנות</button></p>
    <div class="sv-grid"><div>
      ${(o.review || []).length ? `<div class="sv-rev"><b>צריך בדיקה לפני תשלום:</b> ${n(o.review.join(', '))}</div>` : ''}
      <div class="sv-sec"><h4>${n(o.title || o.svc)} ${pill(o.status)}</h4><dl class="sv-dl">${qa}${meet}</dl></div>
      <div class="sv-sec"><h4>קבצים</h4>${files}</div>
      <div class="sv-sec"><h4>מייל ללקוח</h4><input id="sv_subj" data-sv-field="" placeholder="נושא" value="${n((o.title || '') + ' - הזמנה ' + o.id)}"><textarea id="sv_text" data-sv-field="" placeholder="מה לכתוב ללקוח"></textarea><button class="btn" data-a="sv-mail" data-id="${n(o.id)}">שליחה ל-${n(c.email || '')}</button></div>
    </div><div class="sv-side">
      <div class="sv-sec"><h4>הלקוח</h4><dl class="sv-dl"><dt>שם</dt><dd>${n(c.name || '')}</dd><dt>טלפון</dt><dd><a href="tel:${n(c.phone || '')}">${n(c.phone || '')}</a></dd><dt>מייל</dt><dd><a href="mailto:${n(c.email || '')}">${n(c.email || '')}</a></dd>${c.note ? `<dt>הערה</dt><dd>${n(c.note)}</dd>` : ''}<dt>מספר</dt><dd>${n(o.id)}</dd><dt>נשלח</dt><dd>${n(when(o.created))}</dd></dl></div>
      <div class="sv-sec"><h4>מחיר</h4>${price}${o.payUrl ? `<p><a href="${n(o.payUrl)}" target="_blank" rel="noopener">קישור התשלום</a></p>` : ''}</div>
      <div class="sv-sec"><h4>סטטוס</h4><div class="sv-sts">${sts}</div>${chk ? `<p style="margin:10px 0 0">${chk}</p>` : ''}</div>
      <div class="sv-sec"><h4>היסטוריה</h4><div class="sv-log">${log}</div></div>
    </div></div>`;
  }

  s.V.svc = { title: 'הזמנות אונליין', render(el) {
    const id = s.ui('svc', 'id', '');
    const o = id && all().find(x => x.id === id);
    el.innerHTML = `<div>${s.pageHead('הזמנות אונליין', 'השירותים המשפטיים שמזמינים באתר: בדיקה, תשלום, טיפול.', '')}${o ? orderView(o) : listView()}</div>`;
  } };
  try { const a = (s.AREAS || []).find(x => x[0] === 'money'); if (a && !a[3].some(x => x[0] === 'svc')) a[3].push(['svc', 'הזמנות אונליין']); } catch { /* menu stays */ }

  const call = async (body) => {
    const { data, error } = await window.SB.functions.invoke('services', { body });
    if (error || !data || !data.ok) throw new Error((data && data.error) || 'הפעולה נכשלה');
    return data;
  };
  s.act('sv-f', (b, d) => { s.UI.svc = s.UI.svc || {}; s.UI.svc[d.k] = d.k === 'test' ? !!d.v : d.v; redraw(); });
  s.act('sv-open', (b, d) => { s.UI.svc = s.UI.svc || {}; s.UI.svc.id = d.id; redraw(); window.scrollTo(0, 0); });
  s.act('sv-back', () => { s.UI.svc = s.UI.svc || {}; s.UI.svc.id = ''; redraw(); });
  s.act('sv-chk', (b, d) => { s.UI.chk = s.UI.chk || {}; s.UI.chk.id = d.id; if (s.go) s.go('chk'); });
  s.act('sv-file', async (b, d) => {
    const o = s.S.data.svc[d.id] || {}; const f = (o.files || [])[+d.i]; if (!f) return;
    try { const r = await call({ action: 'admin-file', id: d.id, path: f.path }); window.open(r.url, '_blank', 'noopener'); } catch (e) { s.toast(e.message, 'bad'); }
  });
  s.act('sv-status', async (b, d) => {
    if (!(await s.confirm(`לשנות את הסטטוס ל"${STATUS[d.s][0]}"?`, 'לשנות'))) return;
    try { await call({ action: 'admin-status', id: d.id, status: d.s }); s.toast('עודכן'); } catch (e) { s.toast(e.message, 'bad'); }
  });
  s.act('sv-mail', async (b, d) => {
    const subject = (document.getElementById('sv_subj') || {}).value || '', text = (document.getElementById('sv_text') || {}).value || '';
    if (!subject.trim() || !text.trim()) { s.toast('חסר נושא או תוכן', 'bad'); return; }
    const o = s.S.data.svc[d.id] || {};
    if (!(await s.confirm(`לשלוח את המייל ל-${(o.c || {}).email}?`, 'שליחה'))) return;
    try { await call({ action: 'admin-mail', id: d.id, subject, text }); s.toast('נשלח ✓'); const t = document.getElementById('sv_text'); if (t) t.value = ''; } catch (e) { s.toast(e.message, 'bad'); }
  });
})(window.O);
