/* addon-rank.js (15.11.2026, Yakir: "תבנה את הכל ותעשה את כל החיבורים. תוסיף את זה כקטגוריה חדשה"):
   a new sidebar category "קידום בגוגל" with three screens:
   - מיקומים: every tracked keyword, mobile or desktop: before / now / change / first / top, search volume, CPC, intent,
     SERP features, AI Overview citation and ChatGPT search citation. A row opens its history graph and the competitors.
   - מילות מפתח: words found by scanning the site (Yoast focus keywords) and Search Console, plus his own words; pick what to track.
   - חיבור והגדרות: the DataForSEO connection (exact positions), how deep and how often to check, balance and spend.
   Data: docs coll "rankkw" + settings/rank, written only by the edge function "rank". This screen calls the function. */
(function (s) {
  if (!s || s.RANK) return; s.RANK = '20261116a';
  const n = v => s.esc(v == null ? '' : String(v));
  const C = 'rankkw';
  s.S.data[C] = s.S.data[C] || {};
  const redraw = () => { try { if (s.bump) s.bump(); } catch { /* memo only */ } if (s.R && ['rank', 'rankkw', 'rankset'].includes(s.R.view) && s.render) s.render(); };
  let typing = false;
  document.addEventListener('focusout', () => { if (typing) { typing = false; setTimeout(redraw, 60); } });
  const busy = () => { const a = document.activeElement; if (a && a.dataset && a.dataset.rk !== undefined) { typing = true; return true; } return false; };
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); else s.S.loaded[C] = true; return; }
    db.collection(C).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[C] = r; s.S.loaded[C] = true; if (!busy()) redraw(); }, () => { s.S.loaded[C] = true; redraw(); });
  })(0);

  const call = async (body, quiet) => {
    const sb = window.SB; if (!sb) throw new Error('אין חיבור לשרת');
    const { data, error } = await sb.functions.invoke('rank', { body });
    if (error) { let m = ''; try { m = (await error.context.json()).error; } catch { /* plain */ } throw new Error(m || 'הפעולה נכשלה'); }
    if (data && data.error) throw new Error(data.error);
    if (!quiet) redraw();
    return data;
  };
  let status = null, stAt = 0, stBusy = false;
  const loadStatus = async (force) => { if (stBusy || (!force && status && Date.now() - stAt < 60000)) return; stBusy = true; try { status = await call({ action: 'status' }, true); stAt = Date.now(); } catch (e) { status = { error: e.message }; } stBusy = false; redraw(); };
  const set = () => (s.get('settings', 'rank') || (status && status.settings) || {});
  const connected = () => !!(status && status.connected);
  const KW = () => s.all(C);
  const run = async (el, label, body, okMsg) => {
    const b = el && el.closest('button'); const was = b ? b.innerHTML : '';
    if (b) { b.disabled = true; b.innerHTML = '⏳ ' + label; }
    try { const r = await call(body); s.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok'); return r; }
    catch (e) { s.toast(e.message, 'bad'); }
    finally { if (b) { b.disabled = false; b.innerHTML = was; } }
  };

  /* ---------- helpers ---------- */
  const INTENT = { info: 'מידע', commercial: 'השוואה', transactional: 'מוכן לפנות', navigational: 'חיפוש אתר' };
  const FEAT = { ai_overview: 'סיכום בינה מלאכותית', featured_snippet: 'תשובה מודגשת', people_also_ask: 'שאלות נוספות', local_pack: 'מפה ועסקים', video: 'סרטונים', images: 'תמונות', related_searches: 'חיפושים קשורים', knowledge_graph: 'כרטיס מידע', top_stories: 'חדשות', paid: 'מודעות', perspectives: 'דעות', discussions_and_forums: 'פורומים', short_videos: 'סרטונים קצרים', carousel: 'קרוסלה', map: 'מפה', twitter: 'רשת X', recipes: 'מתכונים', find_results_on: 'תוצאות באתרים', popular_products: 'מוצרים', answer_box: 'תשובה ישירה', hotels_pack: 'מלונות', jobs: 'משרות', people_also_search: 'אנשים חיפשו גם', google_reviews: 'ביקורות גוגל', third_party_reviews: 'ביקורות', local_services: 'שירותים מקומיים', questions_and_answers: 'שאלות ותשובות', top_sights: 'מקומות', events: 'אירועים', scholarly_articles: 'מאמרים', mention_carousel: 'אזכורים', visual_stories: 'סיפורים', commercial_units: 'מוצרים', shopping: 'קניות', google_flights: 'טיסות', math_solver: 'מחשבון', currency_box: 'מטבע', stocks_box: 'מניות', courses: 'קורסים', podcasts: 'פודקאסטים', explore_brands: 'מותגים', ai_mode: 'מצב בינה מלאכותית' };
  const featTxt = f => FEAT[f] || '';
  const dev = () => s.ui('rank', 'dev', 'm');
  const exact = k => !!(k.last && (k.last.m !== undefined || k.last.d !== undefined));
  const posNow = (k, d) => exact(k) ? k.last[d] : (k.g7 ? k.g7[d] : null);
  const posPrev = (k, d) => exact(k) ? (k.prev ? k.prev[d] : null) : (k.gprev ? k.gprev[d] : null);
  const posFirst = (k, d) => exact(k) ? (k.first ? k.first[d] : null) : null;
  const posBest = (k, d) => exact(k) ? (k.best ? k.best[d] : null) : null;
  // was there an exact check of this device on an earlier day?
  const hasPrevCheck = (k, d) => { const t = (k.last && k.last.at || '').slice(0, 10); return Array.isArray(k.hist) && k.hist.some(h => h && h.day && h.day < t && d in h); };
  const depthOf = k => (k.last && k.last.depth) || 50;
  const fp = (v, ex, k) => v == null || v === '' ? (ex ? `<span class="rk-nf" title="האתר לא הופיע ב-${k ? depthOf(k) : 50} התוצאות הראשונות בבדיקה">אחרי ${k ? depthOf(k) : 50}</span>` : '<span class="rk-mut">אין נתון</span>') : `<b>${ex ? v : Math.round(v * 10) / 10}</b>`;
  const gAvg = (k, d) => k.g7 && k.g7[d] ? `<div class="rk-mut small" title="מיקום ממוצע של השבוע האחרון מכלי הניהול של גוגל. כולל גם הופעה בסיכום הבינה המלאכותית ובמפה">ממוצע בגוגל ${Math.round(k.g7[d] * 10) / 10}</div>` : '';
  const delta = (k, d) => {
    const a = posPrev(k, d), b = posNow(k, d);
    if (exact(k) && !(k.prev && k.prev[d] !== undefined && k.prev[d] !== null) && !hasPrevCheck(k, d)) return '<span class="rk-mut">בדיקה ראשונה</span>';
    if (b && (a == null || a === undefined)) return exact(k) && k.prev && d in k.prev ? '<span class="rk-up">▲ נכנס</span>' : '<span class="rk-mut">חדש</span>';
    if (!b && a) return '<span class="rk-dn">▼ יצא</span>';
    if (!a || !b) return '<span class="rk-mut">-</span>';
    const x = Math.round((a - b) * 10) / 10;
    return x > 0 ? `<span class="rk-up">▲ ${x}</span>` : x < 0 ? `<span class="rk-dn">▼ ${-x}</span>` : '<span class="rk-mut">ללא שינוי</span>';
  };
  const mv = (k, d) => { const a = posPrev(k, d), b = posNow(k, d); return a && b ? a - b : (b && !a ? 0.5 : (!b && a ? -0.5 : 0)); };
  const money = v => v == null ? '-' : '₪' + (Math.round(v * 3.7 * 10) / 10).toLocaleString('he-IL');
  const num = v => v == null ? '-' : Number(v).toLocaleString('he-IL');
  const pathOf = u => { try { const p = decodeURIComponent(new URL(u).pathname).replace(/\/$/, ''); if (!p) return 'דף הבית'; const t = p.split('/').pop().replace(/-/g, ' '); return /[א-ת]/.test(t) ? t.slice(0, 40) : 'עמוד באתר'; } catch { return ''; } };
  const fdt = iso => { if (!iso) return 'עוד לא'; const d = new Date(iso); return d.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric' }) + ' ' + d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }); };

  const st = document.createElement('style');
  st.textContent = `.rk-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;max-width:1400px}.rk-wrap>*{min-width:0}
.rk-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.rk-tile{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px}.rk-tile small{display:block;color:var(--muted);font-size:12.5px;font-weight:600}.rk-tile b{font-size:24px;font-variant-numeric:tabular-nums}
.rk-note{background:var(--teal-soft,#E2F2EE);border:1px solid var(--line);border-radius:12px;padding:11px 14px;font-size:14px;line-height:1.6}
.rk-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.rk-bar .grow{flex:1}
.rk-bar input[type=search]{border:1px solid var(--line);border-radius:10px;padding:8px 11px;font:inherit;background:var(--panel);min-width:180px}
.rk-tbl-w{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:14px}
.rk-tbl{width:100%;border-collapse:collapse;font-size:14px;min-width:1150px}
.rk-tbl th{position:sticky;top:0;background:var(--panel2);text-align:right;font-size:12.5px;color:var(--muted);font-weight:700;padding:9px 10px;border-bottom:1px solid var(--line);white-space:nowrap;cursor:pointer}
.rk-tbl td{padding:9px 10px;border-bottom:1px solid var(--line2);vertical-align:middle;font-variant-numeric:tabular-nums}
.rk-tbl tr:hover td{background:var(--panel2)}.rk-tbl td.kw{max-width:260px}.rk-tbl td.kw b{display:block;cursor:pointer}.rk-tbl td.kw small{color:var(--muted)}
.rk-up{color:#0B7F6B;font-weight:800}.rk-dn{color:#C0392B;font-weight:800}.rk-mut{color:var(--faint)}.rk-nf{color:var(--faint);font-size:12.5px}
.rk-chip{display:inline-block;font-size:11.5px;padding:2px 7px;border-radius:999px;background:var(--panel2);border:1px solid var(--line);margin:1px;white-space:nowrap}
.rk-chip.on{background:#E2F2EE;border-color:#9CD3C5;color:#0B5E50;font-weight:700}.rk-chip.warn{background:#FCEBDD;border-color:#F0C2A0}
.rk-yes{color:#0B7F6B;font-weight:800}.rk-no{color:var(--faint)}
.rk-act{display:flex;gap:4px}.rk-act button{border:1px solid var(--line);background:var(--panel);border-radius:8px;padding:4px 7px;cursor:pointer;font:inherit;font-size:13px}
.rk-btn{border:1px solid var(--line);background:var(--panel);border-radius:10px;padding:8px 12px;font:inherit;font-weight:700;cursor:pointer}.rk-btn.pri{background:var(--accent);border-color:var(--accent);color:#fff}
.rk-btn:disabled{opacity:.6;cursor:wait}
.rk-add{display:grid;gap:8px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px}
.rk-add textarea{border:1px solid var(--line);border-radius:10px;padding:10px;font:inherit;min-height:70px;resize:vertical}
.rk-steps{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px 18px;line-height:1.75}.rk-steps ol{margin:6px 0 0;padding-inline-start:20px}.rk-steps li{margin:4px 0}
.rk-form{display:grid;gap:10px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:16px;max-width:520px}.rk-form label{display:grid;gap:4px;font-weight:700;font-size:14px}
.rk-form input,.rk-form select{border:1px solid var(--line);border-radius:10px;padding:9px 11px;font:inherit;background:var(--panel2)}
.rk-hist svg{width:100%;height:auto;background:var(--panel2);border-radius:10px}
.rk-two{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}.rk-box{border:1px solid var(--line);border-radius:12px;padding:10px 12px}.rk-box h4{margin:0 0 6px;font-size:14px}
.rk-box ol{margin:0;padding-inline-start:18px;font-size:13.5px}.rk-box a{color:var(--accent);word-break:break-all}
@media (max-width:640px){.rk-tile b{font-size:20px}}`;
  document.head.appendChild(st);

  /* ---------- actions ---------- */
  s.act('rk-go', (el, d) => s.go(d.v));
  s.act('rk-check', el => run(el, 'שולח לבדיקה...', { action: 'check' }, r => r && r.skipped ? 'קודם צריך לחבר את שירות הנתונים (חיבור והגדרות)' : `נשלחו ${r.posted} בדיקות. התוצאות יגיעו תוך כמה דקות.`));
  s.act('rk-now', (el, d) => run(el, '', { action: 'now', id: d.id }, 'המיקום עודכן'));
  s.act('rk-kwdata', el => run(el, 'מעדכן...', { action: 'kwdata' }, r => `עודכנו נתונים ל-${(r && r.n) || 0} מילים`));
  s.act('rk-gpt', el => run(el, 'בודק...', { action: 'gpt' }, r => r && r.skipped ? 'קודם צריך לחבר את שירות הנתונים' : r && r.err ? 'הבדיקה נכשלה: ' + r.err : `נבדקו ${r.n} מילים בצ׳אט ג׳י פי טי`));
  s.act('rk-gsc', el => run(el, 'מעדכן...', { action: 'gsc' }, 'המיקום הממוצע מגוגל עודכן'));
  s.act('rk-scan', el => run(el, 'סורק את האתר...', { action: 'scan' }, r => `נמצאו ${r.found} מילים. ${r.added} חדשות.`));
  s.act('rk-track', (el, d) => run(el, '', { action: 'track', id: d.id, on: d.on !== '0' }, d.on !== '0' ? 'נוסף למעקב' : 'הוצא מהמעקב'));
  s.act('rk-hide', async (el, d) => { const k = s.get(C, d.id); if (!(await s.confirm(`להסיר את "${k ? k.kw : ''}" מהרשימה? אפשר להחזיר אותה מהלשונית "הוסתרו".`, 'הסרה'))) return; run(el, '', { action: 'hide', id: d.id }, 'הוסר'); });
  s.act('rk-unhide', (el, d) => run(el, '', { action: 'unhide', id: d.id }, 'הוחזר לרשימה'));
  s.act('rk-bulk', (el, d) => {
    const ids = [...document.querySelectorAll('input[data-rkpick]:checked')].map(x => x.dataset.rkpick);
    if (!ids.length) return s.toast('לא סימנת מילים', 'bad');
    run(el, '', d.op === 'hide' ? { action: 'hide', ids } : { action: 'track', ids, on: true }, d.op === 'hide' ? `${ids.length} מילים הוסרו` : `${ids.length} מילים נוספו למעקב`);
  });
  s.act('rk-pickall', el => { const on = el.checked; document.querySelectorAll('input[data-rkpick]').forEach(x => { x.checked = on; }); });
  s.act('rk-addown', el => {
    const t = document.querySelector('textarea[data-rk="own"]'); const v = t ? t.value.trim() : '';
    if (!v) return s.toast('כתוב מילה אחת או יותר, כל מילה בשורה', 'bad');
    run(el, 'מוסיף...', { action: 'add', kws: v }, r => { if (t) t.value = ''; return `${r.n} מילים נוספו למעקב`; });
  });
  s.act('rk-savekey', el => {
    const l = document.querySelector('input[data-rk="login"]'), p = document.querySelector('input[data-rk="pass"]');
    run(el, 'בודק את החיבור...', { action: 'save-key', login: l && l.value, password: p && p.value }, () => { if (p) p.value = ''; loadStatus(true); return 'החיבור הצליח. אפשר להריץ בדיקה.'; });
  });
  s.act('rk-saveset', el => {
    const dp = document.querySelector('select[data-rk="depth"]'), fq = document.querySelector('select[data-rk="freq"]');
    run(el, '', { action: 'settings', depth: dp && dp.value, freq: fq && fq.value }, 'נשמר');
  });
  s.act('rk-open', (el, d) => openKw(d.id));
  s.act('rk-sort', (el, d) => { const cur = s.ui('rank', 'sort', 'now'); s.setUi('rank', 'sort', cur === d.k ? d.k + '-r' : d.k); });
  document.addEventListener('input', e => { const t = e.target; if (t && t.dataset && t.dataset.rk === 'q') { s.UI.rank = s.UI.rank || {}; s.UI.rank.q = t.value; clearTimeout(t._rk); t._rk = setTimeout(() => { typing = false; s.render(); const x = document.querySelector('input[data-rk="q"]'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }, 350); } });

  /* ---------- history chart + detail ---------- */
  function chart(k) {
    const ex = exact(k);
    const rows = (ex ? (k.hist || []) : (k.gh || [])).filter(h => h && h.day).map(h => [h.day, h.m, h.d]);
    if (!rows.length) return '<p class="small muted">עוד אין היסטוריה. היא תתמלא אחרי הבדיקה הבאה.</p>';
    const W = 640, H = 220, P = 30;
    const vals = rows.flatMap(r => [r[1], r[2]]).filter(v => v != null);
    const maxV = Math.max(10, ...vals.map(v => +v)) + 2;
    const x = i => rows.length === 1 ? W / 2 : P + i * (W - 2 * P) / (rows.length - 1);
    const y = v => P + (v - 1) / (maxV - 1) * (H - 2 * P);
    const line = (ix, col) => { const p = rows.map((r, i) => r[ix] != null ? [x(i), y(+r[ix])] : null); let d = '', on = false; p.forEach(q => { if (!q) { on = false; return; } d += (on ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ' '; on = true; }); return `<path d="${d}" fill="none" stroke="${col}" stroke-width="2.5"/>` + p.map(q => q ? `<circle cx="${q[0].toFixed(1)}" cy="${q[1].toFixed(1)}" r="3.5" fill="${col}"/>` : '').join(''); };
    const grid = [1, 3, 10, 20, 30, 50, 100].filter(v => v <= maxV).map(v => `<line x1="${P}" x2="${W - P}" y1="${y(v)}" y2="${y(v)}" stroke="#d6dfdd" stroke-dasharray="3 4"/><text x="${W - P + 4}" y="${y(v) + 4}" font-size="11" fill="#7b8f8f">${v}</text>`).join('');
    const lab = rows.map((r, i) => (i === 0 || i === rows.length - 1 || rows.length < 9) ? `<text x="${x(i)}" y="${H - 8}" font-size="11" text-anchor="middle" fill="#7b8f8f">${r[0].slice(8, 10)}.${r[0].slice(5, 7)}</text>` : '').join('');
    return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="גרף מיקומים">${grid}${line(1, '#B4532A')}${line(2, '#0B7F6B')}${lab}</svg>
      <div class="small muted" style="margin-top:4px"><span style="color:#B4532A;font-weight:800">● נייד</span> &nbsp; <span style="color:#0B7F6B;font-weight:800">● מחשב</span> &nbsp; למעלה = מיקום טוב יותר${ex ? '' : ' · מיקום ממוצע מכלי המעקב של גוגל'}</div>`;
  }
  function openKw(id) {
    const k = s.get(C, id); if (!k) return;
    const ex = exact(k), L = k.last || {};
    const comp = d => (L[d + 'top'] || []).length ? `<ol>${L[d + 'top'].map(t => `<li>מקום ${n(t.p)}: <a href="${n(t.u)}" target="_blank" rel="noopener">${n(t.d)}</a></li>`).join('')}</ol>` : '<p class="small muted">יופיע אחרי בדיקה מדויקת.</p>';
    const tr = (k.trend || []).slice().reverse();
    const trend = tr.length ? (() => { const mx = Math.max(1, ...tr.map(t => t[2] || 0)); return `<div style="display:flex;gap:3px;align-items:flex-end;height:60px">${tr.map(t => `<div title="${t[1]}/${t[0]}: ${t[2] || 0}" style="flex:1;background:#9CD3C5;border-radius:3px 3px 0 0;height:${Math.max(3, (t[2] || 0) / mx * 60)}px"></div>`).join('')}</div><div class="small muted">חיפושים בחודש, 12 חודשים אחרונים</div>`; })() : '<p class="small muted">אין עדיין נתוני נפח.</p>';
    s.modal({ title: k.kw, wide: true, body: `<div class="rk-hist">${chart(k)}</div>
      <div class="rk-two" style="margin-top:12px">
        <div class="rk-box"><h4>העמוד שלך שמופיע</h4>${L.mu || L.du || k.page ? `<a href="${n(L.mu || L.du || k.page)}" target="_blank" rel="noopener">${n(pathOf(L.mu || L.du || k.page))}</a>` : '<span class="small muted">לא נמצא בתוצאות</span>'}
          <div class="small muted" style="margin-top:6px">בדיקה אחרונה: ${ex ? fdt(L.at) : (k.g7 ? 'ממוצע 7 ימים עד ' + n(k.g7.at) : 'עוד לא')}</div></div>
        <div class="rk-box"><h4>נפח חיפוש ועלות</h4><div>חיפושים בחודש: <b>${num(k.vol)}</b> · מחיר לקליק במודעות: <b>${money(k.cpc)}</b> · תחרות: <b>${k.comp ? n({ LOW: 'נמוכה', MEDIUM: 'בינונית', HIGH: 'גבוהה' }[k.comp] || k.comp) : '-'}</b></div><div style="margin-top:6px">${trend}</div></div>
        <div class="rk-box"><h4>מעליך בנייד</h4>${comp('m')}</div>
        <div class="rk-box"><h4>מעליך במחשב</h4>${comp('d')}</div>
        <div class="rk-box"><h4>מה יש בעמוד התוצאות</h4>${(L.feat || []).length ? L.feat.filter(featTxt).map(f => `<span class="rk-chip${f === 'ai_overview' ? ' on' : ''}">${n(featTxt(f))}</span>`).join(' ') : '<span class="small muted">יופיע אחרי בדיקה מדויקת.</span>'}</div>
        <div class="rk-box"><h4>בינה מלאכותית</h4>
          <div>סיכום הבינה המלאכותית של גוגל: ${L.aio ? (L.aio.on ? (L.aio.cited ? '<span class="rk-yes">מצטט את האתר שלך ✓</span>' : 'מופיע, בלי ציטוט שלך') : 'לא מופיע לחיפוש הזה') : '<span class="rk-no">עוד לא נבדק</span>'}</div>
          <div>חיפוש בצ׳אט ג׳י פי טי: ${k.gpt ? (k.gpt.cited ? '<span class="rk-yes">מצטט את האתר שלך ✓</span>' : k.gpt.named ? '<span class="rk-yes">מזכיר אותך בשם ✓</span>' : 'לא מזכיר אותך') : '<span class="rk-no">עוד לא נבדק</span>'}</div>
          ${k.gpt && (k.gpt.sources || []).length ? `<div class="small muted" style="margin-top:4px">המקורות שצוטטו: ${k.gpt.sources.map(n).join(', ')}</div>` : ''}</div>
      </div>`,
      foot: `<button class="rk-btn" data-a="rk-now" data-id="${n(id)}" ${connected() ? '' : 'disabled title="צריך לחבר את שירות הנתונים"'}>🔄 בדיקה עכשיו</button><button class="btn ghost" data-close>סגירה</button>` });
  }

  /* ---------- screen: positions ---------- */
  s.V.rank = { title: 'מיקומים בגוגל', render(el) {
    loadStatus();
    const d = dev(), f = s.ui('rank', 'f', 'all'), q = (s.ui('rank', 'q', '') || '').trim(), sort = s.ui('rank', 'sort', 'now');
    const all = KW().filter(k => k.tracked && !k.hidden);
    const anyExact = all.some(exact);
    const cnt = { all: all.length, up: all.filter(k => mv(k, d) > 0).length, down: all.filter(k => mv(k, d) < 0).length, top: all.filter(k => posNow(k, d) && posNow(k, d) <= 10).length, nf: all.filter(k => !posNow(k, d)).length };
    let L = all.filter(k => f === 'up' ? mv(k, d) > 0 : f === 'down' ? mv(k, d) < 0 : f === 'top' ? posNow(k, d) && posNow(k, d) <= 10 : f === 'nf' ? !posNow(k, d) : true);
    if (q) L = L.filter(k => String(k.kw).includes(q));
    const key = sort.replace(/-r$/, ''), rev = sort.endsWith('-r');
    const val = k => key === 'kw' ? k.kw : key === 'mv' ? -mv(k, d) : key === 'vol' ? -(k.vol || 0) : key === 'cpc' ? -(k.cpc || 0) : (posNow(k, d) || 999);
    L.sort((a, b) => { const x = val(a), y = val(b); const r = typeof x === 'string' ? x.localeCompare(y, 'he') : x - y; return rev ? -r : r; });
    const aio = all.filter(k => k.last && k.last.aio && k.last.aio.cited).length, gp = all.filter(k => k.gpt && (k.gpt.cited || k.gpt.named)).length;
    const top3 = all.filter(k => posNow(k, d) && posNow(k, d) <= 3).length;
    const S = set();
    const th = (k, label) => `<th data-a="rk-sort" data-k="${k}">${label}${key === k ? (rev ? ' ▲' : ' ▼') : ''}</th>`;
    const row = k => {
      const L2 = k.last || {}; const ex = exact(k);
      const feat = (L2.feat || []).filter(x => x !== 'organic' && featTxt(x)).slice(0, 4).map(x => `<span class="rk-chip${x === 'ai_overview' ? ' on' : ''}">${n(featTxt(x))}</span>`).join('');
      const url = L2[d + 'u'] || k.page || '';
      return `<tr>
        <td class="kw"><b data-a="rk-open" data-id="${n(k.id)}">${n(k.kw)}</b>${url ? `<small>${n(pathOf(url))}</small>` : ''}</td>
        <td>${ex ? (hasPrevCheck(k, d) ? fp(posPrev(k, d), true, k) : '<span class="rk-mut" title="זו הבדיקה המדויקת הראשונה. בבדיקה הבאה יופיע כאן המיקום הקודם">אין עדיין</span>') : (posPrev(k, d) ? fp(posPrev(k, d), false) : '<span class="rk-mut">-</span>')}</td>
        <td>${fp(posNow(k, d), ex, k)}${!ex && posNow(k, d) ? ' <span class="rk-mut small">ממוצע</span>' : ''}${ex ? gAvg(k, d) : ''}</td>
        <td>${delta(k, d)}</td>
        <td>${ex ? fp(posFirst(k, d), true, k) : '<span class="rk-mut">-</span>'}</td>
        <td>${ex && posBest(k, d) ? `<b>${posBest(k, d)}</b>` : '<span class="rk-mut">-</span>'}</td>
        <td>${num(k.vol)}</td><td>${money(k.cpc)}</td>
        <td>${k.intent ? `<span class="rk-chip">${n(INTENT[k.intent] || k.intent)}</span>${k.local ? '<span class="rk-chip">מקומי</span>' : ''}` : '<span class="rk-mut">-</span>'}</td>
        <td>${feat || '<span class="rk-mut">-</span>'}</td>
        <td>${L2.aio ? (L2.aio.cited ? '<span class="rk-yes">מצוטט ✓</span>' : L2.aio.on ? '<span class="rk-chip warn">בלי ציטוט</span>' : '<span class="rk-no">אין</span>') : '<span class="rk-no">-</span>'}</td>
        <td>${k.gpt ? (k.gpt.cited ? '<span class="rk-yes">מצוטט ✓</span>' : k.gpt.named ? '<span class="rk-yes">מוזכר ✓</span>' : '<span class="rk-no">לא</span>') : '<span class="rk-no">-</span>'}</td>
        <td><div class="rk-act"><button data-a="rk-open" data-id="${n(k.id)}" title="גרף ופרטים">📈</button><button data-a="rk-now" data-id="${n(k.id)}" title="בדיקה עכשיו" ${connected() ? '' : 'disabled'}>🔄</button><button data-a="rk-track" data-id="${n(k.id)}" data-on="0" title="הוצאה מהמעקב">✕</button></div></td></tr>`;
    };
    const runInfo = S.pending && S.pending.length ? `<div class="rk-note">⏳ בדיקה רצה עכשיו: ${S.runDone || 0} מתוך ${S.runTasks || 0} תוצאות הגיעו. הטבלה מתעדכנת לבד.</div>` : '';
    el.innerHTML = `<div>${s.pageHead('מיקומים בגוגל', 'איפה האתר שלך מופיע בגוגל בכל מילת חיפוש, בנייד ובמחשב, ומה השתנה מהבדיקה הקודמת.', '')}
      <div class="rk-wrap">
        ${!connected() && status ? `<div class="rk-note">כרגע המיקומים כאן הם <b>מיקום ממוצע</b> מכלי המעקב של גוגל (חינם, מתעדכן פעם בשבוע). לבדיקה מדויקת בנייד ובמחשב, עם המתחרים, הבינה המלאכותית של גוגל וצ׳אט ג׳י פי טי, צריך לחבר את שירות הנתונים. <a href="#rankset" data-a="rk-go" data-v="rankset"><b>לחיבור ←</b></a></div>` : ''}
        ${runInfo}
        <div class="rk-tiles">
          <div class="rk-tile"><small>מילים במעקב</small><b>${all.length}</b></div>
          <div class="rk-tile"><small>בעמוד הראשון</small><b>${cnt.top}</b></div>
          <div class="rk-tile"><small>בשלושת הראשונים</small><b>${top3}</b></div>
          <div class="rk-tile"><small>עלו</small><b class="rk-up">${cnt.up}</b></div>
          <div class="rk-tile"><small>ירדו</small><b class="rk-dn">${cnt.down}</b></div>
          <div class="rk-tile"><small>מצוטט בבינה המלאכותית של גוגל</small><b>${anyExact ? aio : '-'}</b></div>
          <div class="rk-tile"><small>מופיע בצ׳אט ג׳י פי טי</small><b>${all.some(k => k.gpt) ? gp : '-'}</b></div>
        </div>
        <div class="rk-bar">${s.segs('dev', [['m', '📱 נייד'], ['d', '🖥 מחשב']], d)}
          ${s.segs('f', [['all', 'הכל', cnt.all], ['up', 'עלו', cnt.up], ['down', 'ירדו', cnt.down], ['top', 'עמוד ראשון', cnt.top], ['nf', 'לא בתוצאות', cnt.nf]], f)}
          <input type="search" data-rk="q" placeholder="חיפוש מילה" value="${n(q)}"><span class="grow"></span>
          <button class="rk-btn pri" data-a="rk-check">🔄 בדיקה עכשיו לכל המילים</button>
          <button class="rk-btn" data-a="rk-gpt">🤖 בדיקת צ׳אט ג׳י פי טי</button>
          <button class="rk-btn" data-a="rk-kwdata">📊 עדכון נפח ומחיר</button>
          <button class="rk-btn" data-a="rk-gsc">עדכון ממוצע מגוגל</button></div>
        ${anyExact ? `<div class="rk-note">איך לקרוא את הטבלה: <b>עכשיו</b> הוא המיקום המדויק בבדיקה של היום, בגוגל בישראל, בלי היסטוריה אישית (מתוך ${n(String(S.depth || 50))} התוצאות הראשונות). מתחתיו <b>ממוצע בגוגל</b> מכלי הניהול של גוגל לשבוע האחרון. הממוצע לפעמים טוב יותר, כי גוגל סופר בו גם הופעה בסיכום הבינה המלאכותית, במפה ובחיפושים של אנשים באזור שלך. <b>קודם</b> יתמלא אחרי הבדיקה המדויקת הבאה.</div>` : ''}
        <div class="small muted">בדיקה מדויקת אחרונה: ${fdt(S.runAt)} · עדכון ממוצע מגוגל: ${all.find(k => k.g7) ? n(all.find(k => k.g7).g7.at) : 'עוד לא'} · הבדיקה האוטומטית: ${S.freq === 'daily' ? 'כל יום' : 'כל יום ראשון'} בבוקר, וסיכום בטלגרם</div>
        ${!s.S.loaded[C] ? '<p class="small muted">טוען...</p>' : !all.length ? `<div class="card">${s.empty('עוד אין מילים במעקב', 'בלשונית "מילות מפתח" סורקים את האתר, בוחרים מילים מהרשימה או מוסיפים מילים משלך.')}<p style="text-align:center"><button class="rk-btn pri" data-a="rk-go" data-v="rankkw">לבחירת מילים ←</button></p></div>` : `
        <div class="rk-tbl-w"><table class="rk-tbl"><thead><tr>${th('kw', 'מילת מפתח')}<th>קודם</th>${th('now', 'עכשיו')}${th('mv', 'שינוי')}<th>בבדיקה הראשונה</th><th>שיא</th>${th('vol', 'חיפושים בחודש')}${th('cpc', 'מחיר לקליק')}<th>כוונת חיפוש</th><th>בעמוד התוצאות</th><th>בינה מלאכותית של גוגל</th><th>צ׳אט ג׳י פי טי</th><th></th></tr></thead>
        <tbody>${L.map(row).join('') || '<tr><td colspan="13" class="small muted">אין מילים בסינון הזה</td></tr>'}</tbody></table></div>`}
      </div></div>`;
  } };

  /* ---------- screen: keywords ---------- */
  s.V.rankkw = { title: 'מילות מפתח', render(el) {
    loadStatus();
    const t = s.ui('rankkw', 't', 'sug'), src = s.ui('rankkw', 'src', 'all');
    const all = KW();
    const sug = all.filter(k => !k.tracked && !k.hidden), tr = all.filter(k => k.tracked && !k.hidden), hid = all.filter(k => k.hidden);
    let L = t === 'tr' ? tr : t === 'hid' ? hid : sug;
    if (src !== 'all') L = L.filter(k => (k.src || []).includes(src));
    L = L.slice().sort((a, b) => ((b.gsc28 && b.gsc28.impr) || 0) - ((a.gsc28 && a.gsc28.impr) || 0) || String(a.kw).localeCompare(String(b.kw), 'he'));
    const SRC = { site: 'מהאתר', gsc: 'מגוגל', own: 'שלי' };
    const S = set();
    const row = k => `<tr>
      <td><input type="checkbox" data-rkpick="${n(k.id)}" aria-label="סימון"></td>
      <td class="kw"><b>${n(k.kw)}</b>${k.page ? `<small>${n(pathOf(k.page))}</small>` : ''}</td>
      <td>${(k.src || []).map(x => `<span class="rk-chip">${n(SRC[x] || x)}</span>`).join('')}</td>
      <td>${k.gsc28 ? num(k.gsc28.impr) : '-'}</td><td>${k.gsc28 ? num(k.gsc28.clicks) : '-'}</td><td>${k.gsc28 ? `<b>${k.gsc28.pos}</b>` : '-'}</td>
      <td>${num(k.vol)}</td>
      <td><div class="rk-act">${t === 'hid' ? `<button data-a="rk-unhide" data-id="${n(k.id)}">החזרה</button>` : k.tracked ? `<button data-a="rk-track" data-id="${n(k.id)}" data-on="0">הוצאה מהמעקב</button>` : `<button data-a="rk-track" data-id="${n(k.id)}">+ למעקב</button>`}${t !== 'hid' ? `<button data-a="rk-hide" data-id="${n(k.id)}" title="לא מעניין">🗑</button>` : ''}</div></td></tr>`;
    el.innerHTML = `<div>${s.pageHead('מילות מפתח', 'מילים שנמצאו באתר ובגוגל. מסמנים מה לעקוב, או מוסיפים מילים משלך.', '')}
      <div class="rk-wrap">
        <div class="rk-add"><b>הוספת מילים משלך</b><span class="small muted">כל מילה או ביטוי בשורה נפרדת. הן נכנסות ישר למעקב.</span>
          <textarea data-rk="own" placeholder="עורך דין מקרקעין נתניה&#10;בדיקת דירה לפני קנייה"></textarea>
          <div><button class="rk-btn pri" data-a="rk-addown">➕ הוספה למעקב</button></div></div>
        <div class="rk-bar"><button class="rk-btn" data-a="rk-scan">🔎 סריקת האתר ומילים מגוגל</button><span class="small muted">סריקה אחרונה: ${fdt(S.lastScan)}. הסריקה רצה גם לבד כל שבוע.</span></div>
        <div class="rk-bar">${s.segs('t', [['sug', 'הצעות', sug.length], ['tr', 'במעקב', tr.length], ['hid', 'הוסתרו', hid.length]], t)}
          ${s.segs('src', [['all', 'כל המקורות'], ['site', 'מהאתר'], ['gsc', 'מגוגל'], ['own', 'שלי']], src)}<span class="grow"></span>
          ${t !== 'hid' ? `${t === 'sug' ? '<button class="rk-btn pri" data-a="rk-bulk" data-op="track">+ מעקב אחרי המסומנות</button>' : ''}<button class="rk-btn" data-a="rk-bulk" data-op="hide">🗑 הסתרת המסומנות</button>` : ''}</div>
        ${!s.S.loaded[C] ? '<p class="small muted">טוען...</p>' : !all.length ? `<div class="card">${s.empty('עוד לא נסרק', 'לחיצה על "סריקת האתר" תביא את המילים שהגדרנו לכל מאמר, ואת המילים שגוגל כבר מציג אותך עליהן.')}</div>` : `
        <div class="rk-tbl-w"><table class="rk-tbl" style="min-width:820px"><thead><tr><th><input type="checkbox" data-a="rk-pickall" aria-label="סימון הכל"></th><th>מילה</th><th>מקור</th><th>חשיפות ב-28 ימים</th><th>כניסות</th><th>מיקום ממוצע</th><th>חיפושים בחודש</th><th></th></tr></thead>
        <tbody>${L.slice(0, 400).map(row).join('') || '<tr><td colspan="8" class="small muted">אין מילים כאן</td></tr>'}</tbody></table></div>
        ${L.length > 400 ? `<p class="small muted">מוצגות 400 הראשונות מתוך ${L.length}, לפי מספר החשיפות.</p>` : ''}`}
      </div></div>`;
  } };

  /* ---------- screen: connection + settings ---------- */
  s.V.rankset = { title: 'חיבור והגדרות', render(el) {
    loadStatus();
    const S = set(), m = new Date().toISOString().slice(0, 7);
    const tr = KW().filter(k => k.tracked && !k.hidden).length;
    const depth = +S.depth || 50, runs = S.freq === 'daily' ? 30 : 4.3;
    const est = tr * 2 * runs * (depth / 10) * 0.0006 + (tr * 4.3 * 0.0044);
    el.innerHTML = `<div>${s.pageHead('חיבור והגדרות', 'החיבור לשירות הנתונים שבודק את המיקום המדויק בגוגל, ותדירות הבדיקה.', '')}
      <div class="rk-wrap">
        <div class="rk-tiles">
          <div class="rk-tile"><small>החיבור</small><b style="font-size:18px">${!status ? 'בודק...' : connected() ? '<span class="rk-yes">מחובר ✓</span>' : 'לא מחובר'}</b></div>
          <div class="rk-tile"><small>יתרה בשירות</small><b>${status && status.balance != null ? '$' + Number(status.balance).toFixed(2) : '-'}</b></div>
          <div class="rk-tile"><small>הוצאה החודש</small><b>${S.spent && S.spent[m] ? '$' + Number(S.spent[m]).toFixed(2) : '$0'}</b></div>
          <div class="rk-tile"><small>הערכה לחודש</small><b>$${est.toFixed(2)}</b></div>
        </div>
        ${status && status.err ? `<div class="rk-note">⚠️ ${n(status.err)}</div>` : ''}
        ${connected() ? '' : `<div class="rk-steps"><b>איך מחברים (פעם אחת, כ-5 דקות)</b><ol>
          <li>נכנסים לאתר של השירות: <b>dataforseo.com</b>, ולוחצים על הכפתור הירוק להרשמה (Sign Up). ממלאים שם, מייל וסיסמה.</li>
          <li>מאשרים את המייל שהשירות שולח.</li>
          <li>אחרי הכניסה, בתפריט בצד, נכנסים ל"API Access". שם מופיעים שני פרטים: <b>API Login</b> (המייל שלך) ו-<b>API Password</b> (סיסמה ארוכה שהשירות יצר, שונה מהסיסמה שלך לאתר).</li>
          <li>מעתיקים את שניהם לשדות כאן למטה ולוחצים "חיבור". המערכת בודקת שהחיבור עובד.</li>
          <li>כדי להתחיל לבדוק צריך יתרה: בהרשמה מקבלים דולר אחד לניסיון. לטעינה, בתפריט "Billing" טוענים 50 דולר (המינימום). זה תשלום חד פעמי, בלי מנוי, והיתרה לא פגה.</li></ol></div>`}
        <div class="rk-form"><b>${connected() ? 'החלפת פרטי החיבור' : 'חיבור'}</b>${connected() && status.login ? `<span class="small muted">מחובר כ: ${n(status.login)}</span>` : ''}
          <label>שם משתמש לממשק (API Login)<input data-rk="login" type="email" autocomplete="off" placeholder="המייל שנרשמת איתו"></label>
          <label>סיסמת ממשק (API Password)<input data-rk="pass" type="password" autocomplete="new-password" placeholder="הסיסמה הארוכה מעמוד API Access"></label>
          <div><button class="rk-btn pri" data-a="rk-savekey">🔗 חיבור</button></div>
          <span class="small muted">הפרטים נשמרים בשרת בצורה מוגנת, ולא מוצגים שוב.</span></div>
        <div class="rk-form"><b>הגדרות בדיקה</b>
          <label>כמה תוצאות לבדוק בכל חיפוש<select data-rk="depth">${[10, 30, 50, 100].map(v => `<option value="${v}" ${depth === v ? 'selected' : ''}>${v} התוצאות הראשונות${v === 50 ? ' (מומלץ)' : ''}</option>`).join('')}</select></label>
          <label>כל כמה זמן<select data-rk="freq"><option value="weekly" ${S.freq !== 'daily' ? 'selected' : ''}>פעם בשבוע, ביום ראשון בבוקר (מומלץ)</option><option value="daily" ${S.freq === 'daily' ? 'selected' : ''}>כל יום בבוקר</option></select></label>
          <div><button class="rk-btn pri" data-a="rk-saveset">שמירה</button></div>
          <span class="small muted">כל בדיקה כוללת נייד ומחשב בגוגל ישראל בעברית. הערכת העלות מבוססת על ${tr} מילים במעקב.</span></div>
      </div></div>`;
  } };

  try {
    const A = s.AREAS || [];
    if (!A.some(x => x[0] === 'seo')) A.push(['seo', 'קידום בגוגל', 'search', [['rank', 'מיקומים'], ['rankkw', 'מילות מפתח'], ['rankset', 'חיבור והגדרות']]]);
  } catch { /* menu stays as is */ }
  try { const m = location.hash.match(/^#(rank|rankkw|rankset)$/); if (m) { const t0 = Date.now(), iv = setInterval(() => { if (typeof s.go === 'function' && s.S.loaded && s.S.loaded[C] || Date.now() - t0 > 15000) { clearInterval(iv); try { s.go(m[1]); } catch { /* home */ } } }, 300); } } catch { /* no deep link */ }
})(window.O);
