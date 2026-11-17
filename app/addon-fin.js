/* addon-fin.js (16.11.2026, Yakir: "מערכת מסודרת שאוספת את כל הקבלות וההוצאות שיש לי מהמייל ... ולוקחת גם את כל ההכנסות שלי
   מהמורנינג ... ואז אומר לי כמה מעמ ומס הכנסה אני צריך לשלם כל חודשיים ... ושיהיה לי דרך מאוד קלה לצלם ולהעלות דברים").
   Three screens under the existing "כספים" area:
   - מע״מ ומקדמות: the two-month period: VAT to pay, income tax advance, due date, what still waits for his check. Upload button, Morning sync,
     accountant export, settings (advance %) and the Gmail script setup.
   - הוצאות וקבלות: every receipt (mail, Telegram, upload). Fix details, mark business / private, open the file, delete.
   - הכנסות: tax documents from Morning.
   Data: docs "finexp", "fininc", settings/fin. The edge function "fin" reads receipts and syncs Morning. */
(function (s) {
  if (!s || s.FIN) return; s.FIN = '20261117c';
  const n = v => s.esc(v == null ? '' : String(v));
  const CX = ['finexp', 'fininc'];
  const VIEWS = ['fin', 'finexp', 'fininc'];
  CX.forEach(c => { s.S.data[c] = s.S.data[c] || {}; });
  const redraw = () => { try { if (s.bump) s.bump(); } catch { /* memo only */ } if (s.R && VIEWS.includes(s.R.view) && s.render) s.render(); };
  CX.forEach(C => (function wait(k) {
    const db = s.S.db; if (!db || !db.collection) { if (k < 240) setTimeout(() => wait(k + 1), 500); else s.S.loaded[C] = true; return; }
    db.collection(C).onSnapshot(q => { const r = {}; q.docs.forEach(d => { r[d.id] = d.data(); }); s.S.data[C] = r; s.S.loaded[C] = true; redraw(); }, () => { s.S.loaded[C] = true; redraw(); });
  })(0));

  const call = async body => {
    const sb = window.SB; if (!sb) throw new Error('אין חיבור לשרת');
    const { data, error } = await sb.functions.invoke('fin', { body });
    if (error) { let m = ''; try { m = (await error.context.json()).error; } catch { /* plain */ } throw new Error(m || 'הפעולה נכשלה'); }
    if (data && data.error) throw new Error(data.error);
    return data;
  };
  const run = async (el, label, body, okMsg) => {
    const b = el && el.closest('button'); const was = b ? b.innerHTML : '';
    if (b) { b.disabled = true; b.innerHTML = '<span class="spin sm"></span> ' + label; }
    try { const r = await call(body); if (okMsg) s.toast(typeof okMsg === 'function' ? okMsg(r) : okMsg, 'ok'); return r; }
    catch (e) { s.toast(e.message, 'bad'); return null; }
    finally { if (b && b.isConnected) { b.disabled = false; b.innerHTML = was; } }
  };

  /* ---------- periods and sums (same rules as the server) ---------- */
  const PN = ['', 'ינואר-פברואר', 'מרץ-אפריל', 'מאי-יוני', 'יולי-אוגוסט', 'ספטמבר-אוקטובר', 'נובמבר-דצמבר'];
  const today = () => new Date(Date.now() + 2 * 3600e3).toISOString().slice(0, 10);
  const periodOf = d => `${d.slice(0, 4)}-${Math.ceil(+d.slice(5, 7) / 2)}`;
  const pName = p => { const [y, k] = p.split('-'); return `${PN[+k]} ${y}`; };
  const pDue = p => { const [y, k] = p.split('-').map(Number); const m = k * 2 + 1; return m > 12 ? `${y + 1}-01-15` : `${y}-${String(m).padStart(2, '0')}-15`; };
  const pPrev = p => { let [y, k] = p.split('-').map(Number); k--; if (!k) { k = 6; y--; } return `${y}-${k}`; };
  const pNext = p => { let [y, k] = p.split('-').map(Number); k++; if (k > 6) { k = 1; y++; } return `${y}-${k}`; };
  // the period to show first: the one whose payment is still ahead (until the 15th, the period that just ended)
  const defPeriod = () => { const t = today(), cur = periodOf(t), m = +t.slice(5, 7), d = +t.slice(8, 10); return m % 2 === 1 && d <= 15 ? pPrev(cur) : cur; };
  const period = () => s.ui('fin', 'p', defPeriod());
  const CATS = { 'משרד וציוד': 1, 'תוכנה ומנויים': 1, 'אתר ואחסון': 1, 'פרסום ושיווק': 1, 'טלפון ותקשורת': 2 / 3, 'רכב ודלק': 2 / 3, 'ביטוח מקצועי': 1, 'אגרות ורישום': 1, 'נסיעות וחניה': 1, 'ספרות והשתלמויות': 1, 'הנהלת חשבונות': 1, 'שכירות ואחזקת משרד': 1, 'כיבוד ואירוח': 0, 'אחר': 1 };
  const share = x => x.vatShare === undefined ? (CATS[x.category] ?? 1) : +x.vatShare;
  const EXP = () => Object.entries(s.S.data.finexp || {}).map(([id, v]) => Object.assign({ id }, v));
  const INC = () => Object.entries(s.S.data.fininc || {}).map(([id, v]) => Object.assign({ id }, v));
  const set = () => s.get('settings', 'fin') || {};
  const sum = p => {
    const inc = INC().filter(x => x.period === p), ex = EXP().filter(x => x.period === p);
    const biz = ex.filter(x => x.biz !== 'no');
    const vatOut = inc.reduce((a, x) => a + (+x.vat || 0), 0), incNet = inc.reduce((a, x) => a + (+x.net || 0), 0);
    const vatIn = biz.reduce((a, x) => a + (+x.vat || 0) * share(x), 0), expNet = biz.reduce((a, x) => a + (+x.net || 0), 0);
    const pct = +set().advPct || 0;
    return { inc, ex, biz, vatOut, vatIn, vat: vatOut - vatIn, incNet, expNet, adv: pct ? incNet * pct / 100 : null, pct, check: ex.filter(x => x.biz === 'check').length };
  };
  const ils = v => '₪' + Math.round(+v || 0).toLocaleString('he-IL');
  const ils2 = v => '₪' + (Math.round((+v || 0) * 100) / 100).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  const fd = d => d ? d.slice(8, 10) + '.' + d.slice(5, 7) + '.' + d.slice(2, 4) : '';
  const daysTo = d => Math.round((new Date(d + 'T12:00:00') - new Date(today() + 'T12:00:00')) / 864e5);
  const SRC = { mail: 'מייל', telegram: 'טלגרם', upload: 'העלאה' };
  const BIZ = { yes: ['עסקי', 'p-ok'], no: ['פרטי', ''], check: ['לבדיקה', 'p-warn'] };

  const st = document.createElement('style');
  st.textContent = `.fn-wrap{display:grid;grid-template-columns:minmax(0,1fr);gap:14px;max-width:1200px}.fn-wrap>*{min-width:0}
.fn-per{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.fn-per b{font-size:18px;min-width:170px;text-align:center}
.fn-tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.fn-tile{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:13px 15px;display:grid;gap:3px}
.fn-tile small{color:var(--muted);font-size:12.5px;font-weight:600}.fn-tile b{font-size:26px;font-variant-numeric:tabular-nums}.fn-tile span{font-size:12.5px;color:var(--muted)}
.fn-tile.main{border:2px solid var(--accent,#C6A03C)}
.fn-note{background:var(--teal-soft,#E2F2EE);border:1px solid var(--line);border-radius:12px;padding:11px 14px;font-size:14px;line-height:1.6}
.fn-note.warn{background:#FFF4DC}
.fn-bar{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.fn-bar .grow{flex:1}
.fn-tbl-w{overflow-x:auto;background:var(--panel);border:1px solid var(--line);border-radius:14px}
.fn-tbl{width:100%;border-collapse:collapse;font-size:14px}.fn-tbl th{font-size:12.5px;color:var(--muted);text-align:right;padding:9px 10px;border-bottom:1px solid var(--line);white-space:nowrap}
.fn-tbl td{padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:middle}.fn-tbl tr:last-child td{border-bottom:0}
.fn-tbl td.num{font-variant-numeric:tabular-nums;white-space:nowrap}.fn-tbl .sub{display:block;color:var(--muted);font-size:12.5px}
.fn-tbl tfoot td{font-weight:700;background:var(--bg)}
.fn-acts{display:flex;gap:4px;flex-wrap:nowrap}
.fn-box{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;display:grid;gap:10px}
.fn-box h3{margin:0;font-size:16px}
.fn-code{direction:ltr;text-align:left;white-space:pre;overflow:auto;max-height:260px;background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:10px;font:12px/1.5 ui-monospace,monospace}
.fn-steps{margin:0;padding-inline-start:20px;line-height:1.8}
@media(max-width:640px){.fn-tbl .hide-m{display:none}.fn-tile b{font-size:22px}}`;
  document.head.appendChild(st);

  /* ---------- upload (camera on the phone, files on the computer) ---------- */
  s.act('fin-up', () => {
    const i = document.createElement('input'); i.type = 'file'; i.multiple = true; i.accept = 'image/*,application/pdf';
    i.onchange = async () => {
      const files = [...i.files]; if (!files.length) return;
      s.toast(files.length > 1 ? `קורא ${files.length} קבלות...` : 'קורא את הקבלה...');
      let ok = 0, dup = 0, bad = 0;
      for (const f of files) {
        try {
          const ext = (f.name.match(/\.(\w+)$/) || ['', f.type === 'application/pdf' ? 'pdf' : 'jpg'])[1].toLowerCase();
          const path = `fin/${today().slice(0, 7)}/${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}.${ext}`;
          const { error } = await window.SB.storage.from('files').upload(path, f, { contentType: f.type || 'application/octet-stream' });
          if (error) throw error;
          const r = await call({ action: 'ingest', path, mime: f.type, name: f.name, source: 'upload' });
          if (r && r.skipped) { dup++; await window.SB.storage.from('files').remove([path]).catch(() => null); } else ok++;
        } catch { bad++; }
      }
      s.toast([ok ? `${ok} נקלטו` : '', dup ? `${dup} כבר היו במערכת` : '', bad ? `${bad} נכשלו` : ''].filter(Boolean).join(' · ') || 'לא נקלט כלום', bad ? 'bad' : 'ok');
      if (ok && s.R.view !== 'finexp') s.go('finexp');
    };
    i.click();
  });
  s.act('fin-sync', b => run(b, 'מעדכן...', { action: 'sync' }, r => `עודכן ממורנינג: ${r.n} מסמכים`));
  s.act('fin-per', (b, d) => { s.setUi('fin', 'p', d.dir === 'prev' ? pPrev(period()) : pNext(period())); redraw(); });
  s.act('fin-biz', async (b, d) => { await s.patch('finexp', d.id, { biz: d.v, needsCheck: false }); });
  s.act('fin-del', async (b, d) => {
    const x = (s.S.data.finexp || {})[d.id]; if (!x) return;
    if (!await s.confirm(`למחוק את ההוצאה "${x.vendor}" (${ils(x.total)})? גם הקובץ יימחק.`, 'מחיקה', true)) return;
    if (x.file) await window.SB.storage.from('files').remove([String(x.file).replace(/^sbfile:/, '')]).catch(() => null);
    await s.remove('finexp', d.id); s.toast('נמחק');
  });
  s.act('fin-edit', (b, d) => {
    const x = (s.S.data.finexp || {})[d.id]; if (!x) return;
    s.formModal({ title: 'פרטי ההוצאה', fields: [
      ['vendor', 'ספק', 'text', { req: true }], ['date', 'תאריך', 'date', { req: true }],
      ['total', 'סכום כולל מע״מ', 'money', { req: true }], ['vat', 'מע״מ במסמך', 'money'],
      ['category', 'סוג הוצאה', 'select', { options: Object.keys(CATS).map(k => [k, k]) }],
      ['desc', 'מה נקנה', 'text', { full: true }]],
      values: { vendor: x.vendor, date: x.date, total: x.total, vat: x.vat, category: x.category || 'אחר', desc: x.desc || '' },
      onSubmit: async v => {
        const total = +v.total || 0, vat = +v.vat || 0;
        await s.patch('finexp', d.id, { unread: false, vendor: v.vendor, date: v.date, period: periodOf(v.date), total, vat, net: Math.round((total - vat) * 100) / 100, category: v.category, vatShare: CATS[v.category] ?? 1, biz: 'yes', desc: v.desc, needsCheck: false, currency: 'ILS', edited: true });
        s.toast('נשמר');
      } });
  });
  s.act('fin-add', () => { // a receipt without a file (cash, a payment he remembers)
    s.formModal({ title: 'הוצאה בלי קבלה מצולמת', fields: [
      ['vendor', 'ספק', 'text', { req: true }], ['date', 'תאריך', 'date', { req: true }],
      ['total', 'סכום כולל מע״מ', 'money', { req: true }], ['vat', 'מע״מ (אם יש חשבונית מס)', 'money'],
      ['category', 'סוג הוצאה', 'select', { options: Object.keys(CATS).map(k => [k, k]) }], ['desc', 'מה נקנה', 'text', { full: true }]],
      values: { date: today(), category: 'משרד וציוד' },
      onSubmit: async v => {
        const total = +v.total || 0, vat = +v.vat || 0;
        await s.save('finexp', s.uid('x'), { vendor: v.vendor, date: v.date, period: periodOf(v.date), total, vat, net: Math.round((total - vat) * 100) / 100, currency: 'ILS', category: v.category, vatShare: CATS[v.category] ?? 1, biz: 'yes', desc: v.desc || '', source: 'manual', at: new Date().toISOString() });
        s.toast('נוסף');
      } });
  });
  s.act('fin-adv', () => {
    s.formModal({ title: 'אחוז מקדמות מס הכנסה', fields: [['advPct', 'האחוז שמופיע בפנקס המקדמות או במכתב של מס הכנסה', 'text', { req: true, full: true }]],
      values: { advPct: set().advPct || '' },
      onSubmit: async v => { const p = parseFloat(String(v.advPct).replace(/[^\d.]/g, '')); if (!(p >= 0 && p <= 50)) { s.toast('צריך מספר בין 0 ל-50', 'bad'); return false; } await call({ action: 'settings', advPct: p }); s.toast('נשמר'); } });
  });
  // 17.11.2026 (Yakir: "אחד כזה והשני עם כל המסמכים שצורפו סרוקים ומוכנים"): two files for the accountant,
  // an Excel report and a zip with every document, numbered the same way. Built on the server (action "pack").
  s.act('fin-pack', async b => {
    const p = period();
    const r = await run(b, 'מכין את הקבצים, זה לוקח עד דקה...', { action: 'pack', period: p }); if (!r) return;
    const miss = (r.missing || []).slice(0, 30);
    s.modal({ title: `קבצים לרואה החשבון: ${n(r.name)}`, body: `
      <p style="margin-top:0">שני קבצים, אפשר להוריד ולשלוח לרואה החשבון כמו שהם. הקישורים פעילים 14 יום.</p>
      <div class="fn-box"><h3>1. דוח לרואה החשבון (אקסל)</h3><p class="small">סיכום מע״מ ומקדמות, טבלת הכנסות (${r.nInc}) וטבלת הוצאות (${r.nExp}). לכל שורה יש מספר, וזה גם שם הקובץ שלה בקובץ המסמכים.</p>
        <a class="btn pri" href="${n(r.xlsx)}" target="_blank" rel="noopener">${s.icon('doc', 14)} הורדת הדוח</a></div>
      <div class="fn-box"><h3>2. כל המסמכים (קובץ מכווץ, ${r.mb} מגה)</h3><p class="small">תיקיית הכנסות: כל החשבוניות ממורנינג. תיקיית הוצאות: כל הקבלות והחשבוניות. בפנים יש גם עותק של הדוח.</p>
        <a class="btn pri" href="${n(r.zip)}" target="_blank" rel="noopener">${s.icon('doc', 14)} הורדת המסמכים</a></div>
      ${r.missExp + r.missInc ? `<div class="fn-box"><h3>חסר מסמך ל-${r.missExp + r.missInc} שורות</h3>
        <p class="small">רוב החסרים הם קבלות שהגיעו בתוך גוף המייל, בלי קובץ מצורף. אחרי שמעדכנים את קוד המייל (כפתור "הוראות וקוד" בהגדרות), המערכת שומרת כל מייל כזה כקובץ, וגם משלימה לבד את הישנים. אז מפיקים את הקבצים מחדש.</p>
        <div class="small">${miss.map(m => `${n(fd(m.date))} · ${n(m.vendor)} · ${ils(m.total)}`).join('<br>')}${(r.missing || []).length > miss.length ? '<br>ועוד ' + ((r.missing || []).length - miss.length) : ''}</div></div>` : '<p class="small">לכל השורות יש מסמך.</p>'}` });
  });

  /* ---------- Gmail script ---------- */
  const script = (url, key, box) => `// איסוף קבלות מהמייל למערכת המשרד. לא לשתף את הקוד הזה, יש בו מפתח.
const FIN_URL = '${url}';
const FIN_KEY = '${key}';
const MAILBOX = '${box}';
const LABEL = 'הוצאות-נקלט';

function run() {
  const start = Date.now();
  const label = GmailApp.getUserLabelByName(LABEL) || GmailApp.createLabel(LABEL);
  const q = 'after:2026/01/01 -label:' + LABEL + ' -in:sent -in:chats (קבלה OR קבלות OR חשבונית OR חשבוניות OR "חשבון עסקה" OR "אישור תשלום" OR "אישור הזמנה" OR "פירוט חיוב" OR receipt OR invoice OR "payment received" OR "payment confirmation" OR "your order" OR billing)';
  const threads = GmailApp.search(q, 0, 40);
  for (const t of threads) {
    if (Date.now() - start > 270000) break; // stop before the 6 minute limit, the next run continues
    t.getMessages().forEach(function (m) {
      const files = m.getAttachments({ includeInlineImages: false })
        .filter(function (a) { return /pdf|image\\/(jpeg|png|webp)/i.test(a.getContentType()) && a.getSize() < 8000000; })
        .slice(0, 5)
        .map(function (a) { return { name: a.getName(), mime: a.getContentType(), b64: Utilities.base64Encode(a.getBytes()) }; });
      UrlFetchApp.fetch(FIN_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({
        action: 'mail', key: FIN_KEY, mailbox: MAILBOX, msgId: m.getId(), from: m.getFrom(), subject: m.getSubject(),
        date: m.getDate().toISOString(), text: m.getPlainBody().slice(0, 15000), files: files, pdf: files.length ? '' : mailPdf(m) }) });
    });
    t.addLabel(label);
  }
  backfill(start);
}

// מייל בלי קובץ מצורף נשמר כקובץ PDF של המייל עצמו, כדי שגם לו יהיה מסמך לרואה החשבון
function mailPdf(m) {
  try {
    var head = '<div dir="rtl" style="font-family:Arial,sans-serif;font-size:12px;border-bottom:1px solid #999;padding-bottom:6px;margin-bottom:12px">'
      + '<b>מאת:</b> ' + esc(m.getFrom()) + '<br><b>אל:</b> ' + esc(m.getTo())
      + '<br><b>תאריך:</b> ' + Utilities.formatDate(m.getDate(), 'Asia/Jerusalem', 'dd.MM.yyyy HH:mm')
      + '<br><b>נושא:</b> ' + esc(m.getSubject()) + '</div>';
    var html = '<html><head><meta charset="utf-8"></head><body>' + head + m.getBody() + '</body></html>';
    return Utilities.base64Encode(Utilities.newBlob(html, 'text/html', 'mail.html').getAs('application/pdf').getBytes());
  } catch (e) { return ''; }
}
function esc(t) { return String(t || '').replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

// משלים מסמך לקבלות ישנות שנקלטו מגוף המייל
function backfill(start) {
  if (Date.now() - start > 280000) return;
  var r = UrlFetchApp.fetch(FIN_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ action: 'missing', key: FIN_KEY, mailbox: MAILBOX }) });
  var ids = []; try { ids = JSON.parse(r.getContentText()).ids || []; } catch (e) { return; }
  for (var i = 0; i < ids.length; i++) {
    if (Date.now() - start > 320000) break;
    var m = null; try { m = GmailApp.getMessageById(ids[i]); } catch (e) { m = null; }
    UrlFetchApp.fetch(FIN_URL, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ action: 'attach', key: FIN_KEY, mailbox: MAILBOX, msgId: ids[i], pdf: m ? mailPdf(m) : '' }) });
  }
}

function setup() {
  ScriptApp.getProjectTriggers().forEach(function (tr) { ScriptApp.deleteTrigger(tr); });
  ScriptApp.newTrigger('run').timeBased().everyMinutes(10).create();
  run();
}
`;
  let mailInfo = null;
  s.act('fin-mail', async b => {
    const r = await run(b, 'מכין...', { action: 'mail-key' }); if (!r) return;
    mailInfo = r;
    const boxes = ['dabullaw@gmail.com', 'yakird44@gmail.com'];
    s.modal({ title: 'חיבור המייל: פעם אחת בכל תיבה', wide: true, body: `
      <p style="margin-top:0">עושים את זה במחשב, פעם אחת בכל אחת משתי התיבות. לוקח בערך 3 דקות לתיבה. מהרגע הזה, כל עשר דקות המערכת בודקת את המייל, מוצאת קבלות וחשבוניות ומכניסה אותן לכאן. כל מייל שנבדק מקבל תווית "הוצאות-נקלט", כדי שלא ייקלט פעמיים.</p>
      <ol class="fn-steps">
        <li>נכנסים לחשבון גוגל של התיבה הראשונה ופותחים את הכתובת <b dir="ltr">script.google.com</b></li>
        <li>לוחצים "פרויקט חדש" (למעלה משמאל)</li>
        <li>מוחקים את כל מה שכתוב בחלון, ומדביקים את הקוד של התיבה (כפתור ההעתקה למטה)</li>
        <li>לוחצים על סמל הדיסקט (שמירה). אם מבקשים שם, כותבים "קבלות"</li>
        <li>ברשימה שליד כפתור "הפעלה" למעלה בוחרים <b dir="ltr">setup</b>, ולוחצים "הפעלה"</li>
        <li>גוגל מבקש אישור: "בדיקת הרשאות", בוחרים את החשבון, "מתקדם", "מעבר אל קבלות", ו"אישור". זה הקוד שלך בחשבון שלך, ההרשאה היא רק לך</li>
        <li>עוברים לתיבה השנייה וחוזרים על הכל, עם הקוד של התיבה השנייה</li>
      </ol>
      ${boxes.map((x, i) => `<div class="fn-box"><h3>קוד לתיבה ${i + 1}: <span dir="ltr">${x}</span></h3><div class="fn-code" id="fn-sc${i}">${n(script(r.url, r.key, x))}</div><div><button class="btn pri" data-a="fin-copy" data-i="${i}">${s.icon('doc', 14)} העתקת הקוד</button></div></div>`).join('')}
      <p class="small muted">בהתחלה נבדקים כל המיילים מתחילת 2026. כל קבלה שנקלטת נספרת כהוצאה עסקית, ומה שלא שייך מוחקים.</p>` });
  });
  s.act('fin-copy', (b, d) => { if (!mailInfo) return; const boxes = ['dabullaw@gmail.com', 'yakird44@gmail.com']; s.copy(script(mailInfo.url, mailInfo.key, boxes[+d.i])); s.toast('הקוד הועתק', 'ok'); });

  /* ---------- screens ---------- */
  const perBar = p => `<div class="fn-per"><button class="btn sm" data-a="fin-per" data-dir="prev" title="תקופה קודמת">→</button><b>${pName(p)}</b><button class="btn sm" data-a="fin-per" data-dir="next" title="תקופה הבאה">←</button></div>`;
  const fileLink = x => x.file ? `<a class="btn xs" href="${n(x.file)}" title="פתיחת הקובץ">${s.icon('doc', 13)}</a>` : x.mailUrl ? `<a class="btn xs" href="${n(x.mailUrl)}" target="_blank" rel="noopener" title="פתיחת המייל">✉</a>` : '';

  s.V.fin = { title: 'מע״מ ומקדמות', render(el) {
    const p = period(), x = sum(p), due = pDue(p), dd = daysTo(due), S = set();
    const cur = periodOf(today()) === p;
    const dueTxt = dd < 0 ? `המועד עבר (${fd(due)})` : dd === 0 ? 'היום!' : `עד ${fd(due)} · עוד ${dd} ימים`;
    el.innerHTML = s.pageHead('מע״מ ומקדמות', 'כמה לשלם בכל תקופה של חודשיים. ההכנסות מגיעות ממורנינג, ההוצאות מהמייל, מטלגרם ומהעלאה כאן',
      `<button class="btn pri" data-a="fin-up">${s.icon('plus', 16)} הוספת קבלה</button>`) + `<div class="fn-wrap">
      <div class="fn-bar">${perBar(p)}<span class="grow"></span><span class="pill ${dd < 0 ? '' : dd <= 5 ? 'p-warn' : ''}">${cur ? 'תקופה נוכחית, עוד לא נסגרה' : 'תשלום ' + dueTxt}</span></div>
      <div class="fn-tiles">
        <div class="fn-tile main"><small>מע״מ לתשלום</small><b>${ils(x.vat)}</b><span>${ils(x.vatOut)} על ההכנסות, פחות ${ils(x.vatIn)} על ההוצאות</span></div>
        <div class="fn-tile main"><small>מקדמת מס הכנסה</small><b>${x.adv == null ? '?' : ils(x.adv)}</b><span>${x.pct ? `${x.pct}% מההכנסות לפני מע״מ` : '<a href="#" data-a="fin-adv">חסר אחוז המקדמות. להזנה</a>'}</span></div>
        <div class="fn-tile"><small>הכנסות לפני מע״מ</small><b>${ils(x.incNet)}</b><span>${x.inc.length} מסמכים ממורנינג</span></div>
        <div class="fn-tile"><small>הוצאות עסקיות לפני מע״מ</small><b>${ils(x.expNet)}</b><span>${x.biz.length} קבלות</span></div>
      </div>
      <div class="fn-note">זו הערכה שמתעדכנת כל הזמן, לא הדיווח עצמו. הסכום הסופי לפי רואה החשבון. מע״מ על טלפון ורכב נספר לפי שני שלישים, ועל כיבוד לא נספר.</div>
      <div class="fn-bar">
        <button class="btn" data-a="go" data-v="finexp">הוצאות וקבלות (${x.ex.length})</button>
        <button class="btn" data-a="go" data-v="fininc">הכנסות (${x.inc.length})</button>
        <button class="btn" data-a="fin-add">${s.icon('edit', 13)} הוצאה בלי קבלה</button>
        <button class="btn" data-a="fin-pack">${s.icon('doc', 13)} קבצים לרואה החשבון</button>
      </div>
      <div class="fn-box"><h3>חיבורים והגדרות</h3>
        <div class="fn-bar"><span class="grow">מורנינג: ${S.lastSync ? 'עודכן ' + new Date(S.lastSync).toLocaleString('he-IL', { day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'עוד לא עודכן'}${S.lastErr ? ` · <span class="t-bad">${n(S.lastErr)}</span>` : ''}. מתעדכן לבד כל בוקר.</span><button class="btn sm" data-a="fin-sync">עדכון עכשיו</button></div>
        <div class="fn-bar"><span class="grow">אחוז מקדמות מס הכנסה: <b>${S.advPct ? S.advPct + '%' : 'לא הוזן'}</b></span><button class="btn sm" data-a="fin-adv">${S.advPct ? 'שינוי' : 'הזנה'}</button></div>
        <div class="fn-bar"><span class="grow">איסוף קבלות מהמייל (שתי התיבות): מתקינים פעם אחת במחשב.</span><button class="btn sm" data-a="fin-mail">הוראות וקוד</button></div>
        <div class="small muted">מטלגרם: שולחים לבוט צילום או קובץ, ובכיתוב כותבים "קבלה" (או "הוצאה"). בלי המילה הזו, הקובץ ממשיך לתיקי הלקוחות כמו היום.</div>
      </div></div>`;
  } };

  s.V.finexp = { title: 'הוצאות וקבלות', render(el) {
    const p = period();
    const all = EXP().filter(x => x.period === p).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const rows = all;
    const tot = rows.reduce((a, x) => a + (+x.total || 0), 0), tv = rows.reduce((a, x) => a + (+x.vat || 0) * share(x), 0);
    el.innerHTML = s.pageHead('הוצאות וקבלות', 'כל קבלה שנקלטה מהמייל, מטלגרם או מהעלאה נספרת כהוצאה עסקית. מה שלא שייך, מוחקים ב-✕',
      `<button class="btn pri" data-a="fin-up">${s.icon('plus', 16)} הוספת קבלה</button>`) + `<div class="fn-wrap">
      <div class="fn-bar">${perBar(p)}<span class="grow"></span><button class="btn sm" data-a="fin-add">${s.icon('edit', 13)} הוצאה בלי קבלה</button><button class="btn sm" data-a="go" data-v="fin">לסיכום התקופה</button></div>
      ${rows.length ? `<div class="fn-tbl-w"><table class="fn-tbl"><thead><tr><th>תאריך</th><th>ספק</th><th class="num">סכום</th><th class="num hide-m">מע״מ</th><th class="hide-m">סוג</th><th></th></tr></thead><tbody>
        ${rows.map(x => { return `<tr>
          <td class="num">${fd(x.date)}<span class="sub">${SRC[x.source] || 'ידני'}</span></td>
          <td><b>${n(x.vendor)}</b>${x.unread || !(+x.total) ? `<span class="sub" style="color:#b45309">⚠️ לא הצלחתי לקרוא את הסכום. ${x.file ? 'פותחים את הקובץ' : x.mailUrl ? `<a href="${n(x.mailUrl)}" target="_blank" rel="noopener">פותחים את המייל</a>` : 'בודקים'}, ואז מזינים סכום בעיפרון, או מוחקים ב-✕ אם זו לא קבלה.</span>` : ''}<span class="sub">${n(x.desc || '')}${x.currency && x.currency !== 'ILS' ? ` · מטבע ${n(x.currency)}, לבדוק סכום` : ''}${x.notReceipt ? ' · ייתכן שזו לא קבלה' : ''}</span></td>
          <td class="num">${ils2(x.total)}</td><td class="num hide-m">${x.vat ? ils2(x.vat) : '-'}${x.vat && share(x) < 1 ? `<span class="sub">נספר ${share(x) ? '2/3' : '0'}</span>` : ''}</td>
          <td class="hide-m">${n(x.category || '')}</td>
          <td><div class="fn-acts">${fileLink(x)}<button class="btn xs" data-a="fin-edit" data-id="${x.id}" title="עריכה">${s.icon('edit', 13)}</button><button class="btn xs" data-a="fin-del" data-id="${x.id}" title="מחיקה">✕</button></div></td></tr>`; }).join('')}
        </tbody><tfoot><tr><td colspan="2">סה״כ (${rows.length})</td><td class="num">${ils2(tot)}</td><td class="num hide-m" title="מע״מ מוכר מהעסקיות">${ils2(tv)}</td><td class="hide-m"></td><td></td></tr></tfoot></table></div>`
        : `<div class="card">${s.empty('עוד אין הוצאות בתקופה הזו', 'מצלמים קבלה בכפתור "הוספת קבלה", או שולחים אותה לבוט בטלגרם עם המילה "קבלה".')}</div>`}
    </div>`;
  } };

  s.V.fininc = { title: 'הכנסות', render(el) {
    const p = period();
    const rows = INC().filter(x => x.period === p).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const t = k => rows.reduce((a, x) => a + (+x[k] || 0), 0);
    el.innerHTML = s.pageHead('הכנסות', 'חשבוניות מס, חשבוניות מס קבלה וזיכויים שהוצאו במורנינג. מתעדכן לבד כל בוקר',
      `<button class="btn" data-a="fin-sync">עדכון ממורנינג</button>`) + `<div class="fn-wrap">
      <div class="fn-bar">${perBar(p)}<span class="grow"></span><button class="btn sm" data-a="go" data-v="fin">לסיכום התקופה</button></div>
      ${rows.length ? `<div class="fn-tbl-w"><table class="fn-tbl"><thead><tr><th>תאריך</th><th>מסמך</th><th>לקוח</th><th class="num">סכום</th><th class="num">מע״מ</th><th class="num hide-m">לפני מע״מ</th><th></th></tr></thead><tbody>
        ${rows.map(x => `<tr><td class="num">${fd(x.date)}</td><td>${n(x.typeName || '')}<span class="sub">${n(x.number || '')}</span></td><td>${n(x.client || '')}<span class="sub">${n((x.desc || '').slice(0, 60))}</span></td>
          <td class="num">${ils2(x.total)}</td><td class="num">${ils2(x.vat)}</td><td class="num hide-m">${ils2(x.net)}</td><td>${x.url ? `<a class="btn xs" href="${n(x.url)}" target="_blank" rel="noopener" title="המסמך במורנינג">${s.icon('doc', 13)}</a>` : ''}</td></tr>`).join('')}
        </tbody><tfoot><tr><td colspan="3">סה״כ (${rows.length})</td><td class="num">${ils2(t('total'))}</td><td class="num">${ils2(t('vat'))}</td><td class="num hide-m">${ils2(t('net'))}</td><td></td></tr></tfoot></table></div>`
        : `<div class="card">${s.empty('אין הכנסות בתקופה הזו', 'אם הוצאת חשבוניות במורנינג, לוחצים "עדכון ממורנינג".')}</div>`}
    </div>`;
  } };

  try {
    const A = s.AREAS || [], m = A.find(x => x[0] === 'money');
    const add = [['fin', 'מע״מ ומקדמות'], ['finexp', 'הוצאות וקבלות'], ['fininc', 'הכנסות']];
    if (m) add.forEach(v => { if (!m[3].some(y => y[0] === v[0])) m[3].push(v); });
    else A.push(['money2', 'מע״מ והוצאות', 'money', add]);
  } catch { /* menu stays as is */ }
  try { const m = location.hash.match(/^#(fin|finexp|fininc)$/); if (m) { const t0 = Date.now(), iv = setInterval(() => { if (typeof s.go === 'function' && s.S.loaded && s.S.loaded.finexp || Date.now() - t0 > 15000) { clearInterval(iv); try { s.go(m[1]); } catch { /* home */ } } }, 300); } } catch { /* no deep link */ }
})(window.O);
