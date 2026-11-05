/* addon-delays.js (5.11.2026, Yakir: "במערכת הקודמת מ-lovable היה לי גם מחשבון פיצוי איחור במסירה ... תסדר שיהיה").
   Restores the old system's page "תביעות איחור במסירה מקבלן" (Lovable: ContractorDelaysPage + lib/contractorDelayCalc +
   lib/generateDemandLetter) inside the office app, under תיקים, tab "פיצוי איחור".
   - A quick calculator at the top (nothing is saved): contract date, promised date, actual date (empty = today), monthly rent.
   - Cases are kept in docs coll "delays" (client, contractor, project, dates, rent, contractor defenses, notes).
   - Each case: law that applies, days late, grace days, total, breakdown by period, and a demand letter to the contractor
     (saved in מסמכים as a Word document, linked to the client).
   - Delete is an archive mark (arch:true), like the rest of the system. Nothing is removed from the database.
   The calculation is the same as in the old system:
   - Contracts before 7.7.2022 (old wording): 60 days grace; past it, from day 1: months 1 to 8 at 150% of the rent, month 9 on at 125%.
   - Contracts from 7.7.2022 (amendment 9): 30 days grace; month 1 at 0%, months 2 to 4 at 100%, 5 to 10 at 125%, 11 on at 150%.
   - A month is 30 days. A contractor defense (buyer fault, force majeure) only shows a warning, the sum is still shown. */
(function (s) {
  if (!s || s.DELAYS) return; s.DELAYS = '20261105a';
  const C = 'delays';
  const n = v => s.esc(v == null ? '' : String(v));
  const money = v => '₪' + Math.round(+v || 0).toLocaleString('he-IL');
  s.S.data[C] = s.S.data[C] || {};
  const redraw = () => { try { if (s.bump) s.bump(); } catch { /* memo only */ } if (s.R && s.R.view === C && s.render) s.render(); };
  (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); else s.S.loaded[C] = true; return; }
    db.collection(C).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[C] = r; s.S.loaded[C] = true; redraw(); }, () => { s.S.loaded[C] = true; redraw(); });
  })(0);

  /* ---------- the calculation (port of contractorDelayCalc.ts) ---------- */
  const AMEND9 = '2022-07-07';
  const dayMs = 864e5;
  const toUTC = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : NaN; };
  const todayIso = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  const r2 = x => Math.round(x * 100) / 100;
  function calc(o) {
    if (!o.contractDate || !o.promisedDate) return null;
    const actual = o.actualDate || todayIso();
    const a9 = o.contractDate >= AMEND9;
    const lawLabel = a9 ? 'תיקון 9 לחוק המכר (דירות): חוזים מיום 7.7.2022' : 'חוק המכר (דירות) בנוסח שלפני תיקון 9';
    const days = Math.max(0, Math.floor((toUTC(actual) - toUTC(o.promisedDate)) / dayMs));
    const months = days / 30, rent = +o.monthlyRent || 0, grace = a9 ? 30 : 60;
    const defense = !!(o.buyerFault || o.forceMajeure);
    const base = { a9, lawLabel, days, months, grace, actual, defense, tiers: [], total: 0 };
    if (days <= grace) { base.tiers = [{ label: `תקופת חסד (${grace} יום)`, months: r2(months), rate: 0, amount: 0 }]; return base; }
    const add = (label, m, rate) => { if (m <= 0 && rate) return; const amt = m * rent * rate / 100; base.tiers.push({ label, months: r2(m), rate, amount: Math.round(amt) }); base.total += amt; };
    if (!a9) {
      add('חודשים 1 עד 8 (150%)', Math.min(months, 8), 150);
      add('מחודש 9 (125%)', Math.max(0, months - 8), 125);
    } else {
      base.tiers.push({ label: 'חודש 1 (0%)', months: r2(Math.min(months, 1)), rate: 0, amount: 0 });
      add('חודשים 2 עד 4 (100%)', Math.min(Math.max(months - 1, 0), 3), 100);
      add('חודשים 5 עד 10 (125%)', Math.min(Math.max(months - 4, 0), 6), 125);
      add('מחודש 11 (150%)', Math.max(months - 10, 0), 150);
    }
    base.total = Math.round(base.total);
    return base;
  }
  s.delayCalc = calc;

  /* ---------- screen ---------- */
  const st = document.createElement('style');
  st.textContent = `.dl-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;max-width:1040px}.dl-wrap>*{min-width:0}
.dl-q{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:grid;gap:12px}
.dl-q .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px}
.dl-q label{display:grid;gap:4px;font-size:13px;color:var(--muted)}
.dl-res{display:grid;gap:10px}
.dl-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px}
.dl-kpi>div{background:var(--panel2);border-radius:10px;padding:8px 10px;text-align:center}
.dl-kpi small{display:block;color:var(--muted);font-size:12px}.dl-kpi b{font-size:18px}
.dl-kpi .tot{outline:2px solid var(--acc,#C6A03C)}
.dl-law{display:inline-block;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:700;background:var(--panel2)}
.dl-law.a9{color:#2b6cb0}.dl-law.old{color:#a8873f}
.dl-warn{color:var(--bad);font-weight:700;font-size:13px}
.dl-list{display:grid;gap:10px}
.dl-it{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:12px 16px;display:grid;gap:8px}
.dl-top{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center}.dl-top .grow{flex:1;min-width:180px}
.dl-act{display:flex;flex-wrap:wrap;gap:6px}
.dl-tbl{width:100%;border-collapse:collapse;font-size:13px}.dl-tbl td,.dl-tbl th{padding:6px 8px;border-bottom:1px solid var(--line);text-align:right}
.dl-note{font-size:12px;color:var(--muted)}`;
  document.head.appendChild(st);

  const open = {}; // which cases show the breakdown
  const q = { contractDate: '', promisedDate: '', actualDate: '', monthlyRent: '' };
  const lawTag = r => r ? `<span class="dl-law ${r.a9 ? 'a9' : 'old'}">${r.a9 ? 'תיקון 9' : 'חוק ישן'}</span>` : '';
  const resultHtml = r => {
    if (!r) return '<p class="dl-note">ממלאים תאריך חוזה ומועד מסירה מובטח, והחישוב מופיע כאן.</p>';
    return `<div class="dl-res">
      ${r.defense ? '<div class="dl-warn">⚠ סומנה הגנת קבלן (אשמת רוכש או כוח עליון). ייתכן שאין זכאות לפיצוי.</div>' : ''}
      <div class="dl-kpi"><div><small>חוק חל</small>${lawTag(r)}</div><div><small>ימי איחור</small><b class="num">${r.days}</b></div>
      <div><small>תקופת חסד</small><b class="num">${r.grace} יום</b></div><div class="tot"><small>סה״כ פיצוי</small><b class="num">${money(r.total)}</b></div></div>
      <div class="dl-note">${n(r.lawLabel)}${r.actual === todayIso() ? ' · עד היום (הדירה עוד לא נמסרה)' : ''}</div>
      <div class="tw"><table class="dl-tbl"><thead><tr><th>תקופה</th><th>חודשים</th><th>שיעור</th><th>סכום</th></tr></thead><tbody>
      ${r.tiers.map(t => `<tr><td>${n(t.label)}</td><td class="num">${t.months.toFixed(2)}</td><td class="num">${t.rate}%</td><td class="num"><b>${money(t.amount)}</b></td></tr>`).join('')}
      </tbody></table></div></div>`;
  };
  const cases = () => Object.entries(s.S.data[C] || {}).map(([id, d]) => Object.assign({ id }, d)).filter(d => !d.arch).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')));
  const asCalc = d => ({ contractDate: d.contractDate, promisedDate: d.promisedDate, actualDate: d.actualDate, monthlyRent: d.monthlyRent, buyerFault: d.buyerFault, forceMajeure: d.forceMajeure });

  s.V[C] = { title: 'פיצוי איחור במסירה', render(el) {
    const list = cases();
    const loaded = s.S.loaded && s.S.loaded[C];
    el.innerHTML = s.pageHead('פיצוי איחור במסירה', 'תביעות איחור במסירת דירה מקבלן: חישוב לפי חוק המכר (דירות) ותיקון 9, ומכתב דרישה לקבלן',
      `<button class="btn pri" data-a="dl-new">${s.icon('plus', 16)} תיק חדש</button>`) +
    `<div class="dl-wrap">
      <section class="dl-q" aria-label="חישוב מהיר"><b>חישוב מהיר</b>
        <div class="row">
          <label>תאריך חתימת החוזה<input type="date" data-dlq="contractDate" value="${n(q.contractDate)}"></label>
          <label>מועד מסירה לפי החוזה<input type="date" data-dlq="promisedDate" value="${n(q.promisedDate)}"></label>
          <label>מועד מסירה בפועל (ריק = היום)<input type="date" data-dlq="actualDate" value="${n(q.actualDate)}"></label>
          <label>שכר דירה חודשי לדירה דומה (₪)<input type="number" inputmode="numeric" data-dlq="monthlyRent" value="${n(q.monthlyRent)}"></label>
        </div>
        <div data-dlq-out>${resultHtml(calc(q))}</div>
        <div class="dl-act"><button class="btn sm" data-a="dl-new" data-fromq="1">שמירה כתיק</button></div>
      </section>
      <h3 style="margin:6px 0 0">תיקים (${list.length})</h3>
      <div class="dl-list">${!loaded ? '<div class="card"><span class="spin"></span> טוען...</div>' : list.length ? list.map(d => {
        const r = calc(asCalc(d)); const cl = d.clientId ? s.get('clients', d.clientId) : null;
        return `<article class="dl-it">
          <div class="dl-top"><div class="grow"><b>${n(cl ? cl.name : d.clientName || 'ללא לקוח')}</b> · <span class="small">קבלן: ${n(d.contractor || '')}</span><div class="small muted">${n(d.address || '')}</div></div>
            ${lawTag(r)}<span class="small">ימי איחור: <b class="num">${r ? r.days : '-'}</b></span><span>פיצוי: <b class="num">${r ? money(r.total) : '-'}</b></span></div>
          ${d.notes ? `<div class="dl-note">${n(d.notes)}</div>` : ''}
          ${open[d.id] ? resultHtml(r) : ''}
          <div class="dl-act">
            <button class="btn sm" data-a="dl-calc" data-id="${d.id}">${open[d.id] ? 'הסתרת החישוב' : 'חישוב מפורט'}</button>
            <button class="btn sm" data-a="dl-letter" data-id="${d.id}">מכתב דרישה לקבלן</button>
            <button class="btn sm" data-a="dl-edit" data-id="${d.id}">עריכה</button>
            <button class="btn sm ghost" data-a="dl-del" data-id="${d.id}">🗑 מחיקה</button>
          </div></article>`;
      }).join('') : `<div class="card">${s.empty ? s.empty('אין תיקים עדיין', 'לחיצה על "תיק חדש" כדי להוסיף.') : 'אין תיקים עדיין'}</div>`}</div>
      <p class="dl-note">החישוב זהה לחישוב שהיה במערכת הקודמת. חודש נספר כ-30 יום. כדאי לעבור על הסכום מול לשון החוק והחוזה לפני שליחת מכתב.</p>
    </div>`;
    el.querySelectorAll('[data-dlq]').forEach(inp => inp.addEventListener('input', () => {
      q[inp.dataset.dlq] = inp.value; const out = el.querySelector('[data-dlq-out]'); if (out) out.innerHTML = resultHtml(calc(q));
    }));
  } };

  const FIELDS = () => [
    ['clientId', 'לקוח מהכרטסת', 'select', { options: [['', 'בחירה...']].concat(s.all('clients').slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'he')).map(c => [c.id, c.name])) }],
    ['clientName', 'שם הלקוח (אם הוא לא בכרטסת)', 'text'],
    ['clientIdNo', 'ת.ז. הלקוח', 'text'],
    ['contractor', 'שם הקבלן', 'text', { req: true }],
    ['contractorNo', 'ח.פ. הקבלן', 'text'],
    ['address', 'כתובת הפרויקט / הדירה', 'text', { req: true, full: true }],
    ['contractDate', 'תאריך חתימת החוזה', 'date', { req: true }],
    ['promisedDate', 'מועד מסירה לפי החוזה', 'date', { req: true }],
    ['actualDate', 'מועד מסירה בפועל (ריק = עוד לא נמסרה)', 'date'],
    ['monthlyRent', 'שכר דירה חודשי לדירה דומה (₪)', 'money'],
    ['buyerFault', 'טענת קבלן: אשמת הרוכש', 'check'],
    ['forceMajeure', 'טענת קבלן: כוח עליון', 'check'],
    ['notes', 'הערות', 'textarea'],
  ];
  const clean = v => { const o = Object.assign({}, v); o.monthlyRent = +String(o.monthlyRent || '').replace(/[^\d.]/g, '') || 0; o.buyerFault = !!o.buyerFault; o.forceMajeure = !!o.forceMajeure; if (o.clientId) { const c = s.get('clients', o.clientId); if (c) { o.clientName = c.name; if (!o.clientIdNo && c.idNo) o.clientIdNo = c.idNo; } } return o; };
  s.act('dl-new', (b, d) => s.formModal({ title: 'תיק איחור במסירה', fields: FIELDS(), wide: true, values: d.fromq ? Object.assign({}, q) : {},
    onSubmit: async v => { const id = s.uid('dl'); await s.save(C, id, Object.assign(clean(v), { created: new Date().toISOString(), by: 'office' })); open[id] = true; s.toast('התיק נשמר'); } }));
  s.act('dl-edit', (b, d) => { const x = (s.S.data[C] || {})[d.id]; if (!x) return; s.formModal({ title: 'עריכת תיק', fields: FIELDS(), wide: true, values: x,
    onSubmit: async v => { await s.patch(C, d.id, Object.assign(clean(v), { updated: new Date().toISOString() })); s.toast('עודכן'); } }); });
  s.act('dl-calc', (b, d) => { open[d.id] = !open[d.id]; redraw(); });
  s.act('dl-del', async (b, d) => {
    const ok = s.confirm ? await s.confirm('למחוק את התיק מהרשימה?', 'מחיקה', true) : true; if (!ok) return;
    await s.patch(C, d.id, { arch: true, deletedAt: new Date().toISOString() }); s.toast('נמחק מהרשימה');
  });

  /* ---------- demand letter (port of generateDemandLetter.ts, with the promised date filled in) ---------- */
  const dmy = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? `${+m[3]}.${+m[2]}.${m[1]}` : ''; };
  function letterText(d, r) {
    const today = dmy(todayIso());
    const basis = r.a9 ? 'תיקון 9 לחוק המכר (דירות), התשל"ג-1973, החל על הסכמים שנחתמו מיום 7.7.2022 ואילך' : 'חוק המכר (דירות), התשל"ג-1973, בנוסחו שקדם לתיקון 9';
    const delivered = d.actualDate ? `הדירה נמסרה בפועל ביום ${dmy(d.actualDate)}` : 'עד היום הדירה טרם נמסרה';
    const rows = r.tiers.map(t => `${t.label}: ${t.months.toFixed(2)} חודשים, ${t.rate}%, ${money(t.amount)}`).join('\n');
    return `מכתב דרישה

תאריך: ${today}

לכבוד
${d.contractor || ''}${d.contractorNo ? `\nח.פ. ${d.contractorNo}` : ''}

הנדון: דרישה לתשלום פיצוי בגין איחור במסירת דירה, ${d.address || ''}

1. משרדנו מייצג את ${d.clientName || ''}${d.clientIdNo ? `, ת.ז. ${d.clientIdNo}` : ''}, אשר רכש/ה מכם דירה בפרויקט ב${d.address || ''} בהסכם מיום ${dmy(d.contractDate)}.
2. על פי ההסכם, מועד המסירה היה ${dmy(d.promisedDate)}. ${delivered}, כלומר איחור של ${r.days} ימים (כ-${r.months.toFixed(1)} חודשים).
3. בהתאם ל${basis}, מרשנו זכאי/ת לפיצוי כספי בגין תקופת האיחור, לפי שכר דירה חודשי של ${money(d.monthlyRent)} לדירה דומה, כמפורט להלן:

${rows}
סה"כ: ${money(r.total)}

4. הנכם נדרשים לשלם למרשנו את הסכום האמור תוך 7 ימים ממועד קבלת מכתב זה.
5. ככל שהסכום לא ישולם במועד, לא תהיה למרשנו ברירה אלא לפנות לערכאות המשפטיות, בתוספת ריבית, הפרשי הצמדה, הוצאות משפט ושכר טרחת עורך דין, וזאת ללא הודעה נוספת.
6. אין באמור במכתב זה כדי לגרוע מכל טענה או זכות של מרשנו.

בכבוד רב,
יקיר דבול, עו"ד
יקיר דבול - משרד עורכי דין`;
  }
  s.act('dl-letter', async (b, d) => {
    const x = Object.assign({ id: d.id }, (s.S.data[C] || {})[d.id] || {}); const r = calc(asCalc(x));
    if (!r) { s.toast('חסרים תאריך חוזה או מועד מסירה', 'bad'); return; }
    if (x.clientId) { const c = s.get('clients', x.clientId); if (c) { x.clientName = c.name; if (!x.clientIdNo && c.idNo) x.clientIdNo = c.idNo; } }
    const title = `מכתב דרישה איחור במסירה - ${x.clientName || ''} - ${x.contractor || ''}`;
    const content = letterText(x, r);
    s.modal({ title, wide: true,
      body: `${r.defense ? '<p class="dl-warn">⚠ בתיק סומנה טענת הגנה של הקבלן. כדאי לבדוק לפני שליחה.</p>' : ''}<div class="paper" style="min-height:0;white-space:pre-wrap">${n(content)}</div>`,
      foot: `<button class="btn pri" id="dlsave">שמירה במסמכים</button>${s.buildDocx && s.download ? '<button class="btn" id="dlword">Word</button>' : ''}<button class="btn" id="dlcopy">העתקה</button><button class="btn" data-close>סגירה</button>`,
      onMount: m => {
        m.querySelector('#dlcopy').onclick = () => { if (s.copy) s.copy(content); };
        const w = m.querySelector('#dlword'); if (w) w.onclick = async () => s.download(title + '.docx', await s.buildDocx(title, content));
        m.querySelector('#dlsave').onclick = async () => {
          const id = s.uid('f');
          await s.save('documents', id, { title, content, type: 'generated', docType: 'מכתב', clientId: x.clientId || null, folder: 'מכתבים', source: 'delays', delayId: x.id, created: todayIso(), at: new Date().toISOString() });
          await s.patch(C, x.id, { letterDocId: id, letterAt: new Date().toISOString() });
          s.toast('המכתב נשמר במסמכים');
        };
      } });
  });

  // menu: under "תיקים", right after "נדל״ן"
  try {
    const a = (s.AREAS || []).find(x => x[0] === 'cases');
    if (a && !a[3].some(x => x[0] === C)) { const i = a[3].findIndex(x => x[0] === 'deals'); a[3].splice(i >= 0 ? i + 1 : a[3].length, 0, [C, 'פיצוי איחור']); }
  } catch { /* menu stays as is */ }
  try { if (Array.isArray(s.NAV) && s.NAV[0] && Array.isArray(s.NAV[0][1]) && !s.NAV[0][1].some(x => x[0] === C)) s.NAV[0][1].push([C, 'פיצוי איחור במסירה', 'gavel']); } catch { /* fine */ }
})(window.O);
