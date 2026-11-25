// Admin dashboard: lists and one-click actions. Every call is checked on the server (admin role only).
import { api, session, esc, ils, heDate, $, $$, say, errText } from './api';

const root = $('#admin'); const top = $('[data-top]', root); const view = $('[data-view]', root);
type Col = [string, string, ((v: any, r: any) => string)?];
const yes = (v: any) => (v ? 'כן' : '');
const date = (v: any) => esc(heDate(v));
const TABS: Record<string, { t: string; op: string; args?: any; cols: Col[]; acts?: [string, string][] }> = {
  overview: { t: 'סקירה', op: 'overview', cols: [] },
  orders: { t: 'הזמנות', op: 'orders', cols: [['created_at', 'תאריך', date], ['plan_id', 'מוצר'], ['firm_name', 'משרד'], ['email', 'מייל'], ['total_ils', 'סכום', (v) => esc(ils(v))], ['installments', 'תשלומים'], ['status', 'מצב'], ['provider', 'אמצעי'], ['is_test', 'בדיקה', yes]], acts: [['order_mark_paid', 'סימון כשולם (העברה)']] },
  payments: { t: 'תשלומים', op: 'payments', cols: [['paid_at', 'תאריך', date], ['plan_id', 'מוצר'], ['firm_name', 'משרד'], ['net_ils', 'לפני מע"מ', (v) => esc(ils(v))], ['vat_ils', 'מע"מ', (v) => esc(ils(v))], ['total_ils', 'סך הכול', (v) => esc(ils(v))], ['provider_doc', 'מסמך במורנינג'], ['is_test', 'בדיקה', yes]] },
  renewals: { t: 'חידושים', op: 'placements', args: { renewals: true }, cols: [['ends_at', 'מסתיים', date], ['kind', 'סוג'], ['plan_id', 'מוצר'], ['target', 'עמוד'], ['area_slug', 'תחום'], ['city_slug', 'עיר'], ['auto_renew', 'אוטומטי', yes], ['reminders', 'תזכורות', (v) => esc(Object.keys(v || {}).join(', '))]], acts: [['placement_cancel', 'ביטול']] },
  placements: { t: 'מיקומים', op: 'placements', cols: [['created_at', 'נוצר', date], ['kind', 'סוג'], ['plan_id', 'מוצר'], ['target', 'עמוד'], ['area_slug', 'תחום'], ['city_slug', 'עיר'], ['ends_at', 'עד', date], ['status', 'מצב'], ['is_test', 'בדיקה', yes]], acts: [['placement_cancel', 'ביטול']] },
  firms: { t: 'משרדים', op: 'firms', cols: [['name', 'שם'], ['slug', 'כתובת'], ['plan', 'חבילה'], ['plan_until', 'עד', date], ['status', 'מצב'], ['claimed', 'בעלות', yes], ['review_avg', 'ציון'], ['site_ok', 'האתר עונה', (v) => (v === false ? 'לא' : v ? 'כן' : '')], ['is_test', 'בדיקה', yes]], acts: [['firm_hide', 'הסתרה'], ['firm_publish', 'הצגה'], ['profile_unpublish', 'הסרת פרופיל מורחב']] },
  reviews: { t: 'חוות דעת', op: 'reviews', cols: [['created_at', 'תאריך', date], ['rating', 'ציון'], ['title', 'כותרת'], ['body', 'טקסט'], ['author_display', 'כותב'], ['status', 'מצב'], ['moderation', 'סיבות', (v) => esc((v || []).join(', '))]], acts: [['review_publish', 'פרסום'], ['review_hide', 'הסתרה'], ['review_reject', 'דחייה']] },
  removals: { t: 'הסרות ותיקונים', op: 'removals', cols: [['created_at', 'תאריך', date], ['firm_slug', 'משרד'], ['kind', 'סוג'], ['requester_name', 'מבקש'], ['email', 'מייל'], ['details', 'פרטים'], ['status', 'מצב'], ['owner_verified', 'בעלים מאומת', yes], ['due_at', 'יעד', date]], acts: [['removal_hide', 'הסתרת המשרד'], ['removal_done', 'טופל'], ['removal_reject', 'דחייה']] },
  claims: { t: 'בקשות בעלות', op: 'claims', cols: [['created_at', 'תאריך', date], ['firm_slug', 'משרד'], ['name', 'שם'], ['email', 'מייל'], ['phone', 'טלפון'], ['license_no', 'רישיון'], ['domain_match', 'דומיין תואם', yes], ['status', 'מצב']], acts: [['claim_approve', 'אישור'], ['claim_reject', 'דחייה']] },
  sponsored: { t: 'תוכן ממומן', op: 'sponsored', cols: [['created_at', 'תאריך', date], ['title', 'כותרת'], ['brief', 'בקשה', (v) => esc(v ? `${v.topic || ''} ${v.points || ''}` : '')], ['status', 'מצב'], ['firm_note', 'הערות המשרד'], ['slug', 'כתובת']], acts: [['sponsored_draft', 'שליחת טיוטה לאישור']] },
  outbox: { t: 'דואר יוצא', op: 'outbox', cols: [['at', 'זמן', date], ['template', 'סוג'], ['to_masked', 'אל'], ['subject', 'נושא'], ['status', 'מצב'], ['html', 'תוכן', (v) => (v ? '<button type="button" class="btn btn-line btn-sm" data-show>הצגה</button>' : '')]] },
  settings: { t: 'הגדרות', op: 'settings_get', cols: [] },
};
let current = 'overview', rows: any[] = [];

async function load(tab: string) {
  current = tab; $$('[data-tabs] button', root).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === tab)));
  const T = TABS[tab]; view.innerHTML = '<p class="muted">טוען...</p>';
  const r = await api('admin', { op: T.op, ...(T.args || {}) }, true);
  if (r.status !== 200) { view.innerHTML = ''; return say(top, errText(r), 'bad'); }
  if (tab === 'overview') {
    const L: [string, string][] = [['orders_pending', 'הזמנות ממתינות'], ['orders_review', 'תשלומים לבדיקה'], ['orders_paid', 'הזמנות ששולמו'], ['revenue', 'הכנסות (לא כולל בדיקות)'], ['placements_active', 'מיקומים פעילים'], ['renewals_30', 'חידושים ב 30 יום'], ['reviews_held', 'חוות דעת לבדיקה'], ['removals_open', 'בקשות הסרה פתוחות'], ['claims_waiting', 'בקשות בעלות לאישור'], ['sites_broken', 'אתרי משרדים שלא עונים'], ['sponsored_briefs', 'מאמרים ממומנים לכתיבה'], ['outbox', 'מיילים בתיבת היוצא']];
    view.innerHTML = `${r.test_mode ? '<div class="cm-test">מצב בדיקה פעיל: אין חיובים אמיתיים, ומיילים נשמרים בתיבת היוצא.</div>' : ''}<div class="cm-kv">${L.map(([k, t]) => `<div>${t}<b>${k === 'revenue' ? esc(ils(r[k])) : esc(r[k])}</b></div>`).join('')}</div>
      <p class="mt2"><button type="button" class="btn btn-line btn-sm" data-run="run_daily">הרצת המשימה היומית עכשיו</button> <button type="button" class="btn btn-line btn-sm" data-run="site_check">בדיקת אתרי משרדים</button></p>`;
    return;
  }
  if (tab === 'settings') {
    view.innerHTML = r.rows.map((s: any) => `<div class="field"><label>${esc(s.key)}</label><textarea rows="3" dir="ltr" data-set="${esc(s.key)}">${esc(JSON.stringify(s.value, null, 1))}</textarea><button type="button" class="btn btn-line btn-sm" data-save-set="${esc(s.key)}">שמירה</button></div>`).join('') + '<p class="xs muted">test_mode: true עד ההשקה. mail.test_to: הכתובות היחידות שמקבלות מייל אמיתי במצב בדיקה. mail.admin_to: לאן נשלחות התראות למנהל. sales.whatsapp: מספר לשאלות לפני קנייה (ריק = מוסתר).</p>';
    return;
  }
  rows = r.rows;
  view.innerHTML = rows.length ? `<div class="cm-table"><table><thead><tr>${T.cols.map((c) => `<th>${c[1]}</th>`).join('')}${T.acts ? '<th>פעולות</th>' : ''}</tr></thead><tbody>${rows.map((row, i) => `<tr data-i="${i}">${T.cols.map(([k, , f]) => `<td>${f ? f(row[k], row) : esc(row[k] ?? '')}</td>`).join('')}${T.acts ? `<td>${T.acts.map(([op, t]) => `<button type="button" class="btn btn-line btn-sm" data-act="${op}">${t}</button>`).join(' ')}</td>` : ''}</tr>`).join('')}</tbody></table></div>` : '<p>אין רשומות.</p>';
}

view.addEventListener('click', async (e) => {
  const b = e.target as HTMLElement; const tr = b.closest('tr'); const row = tr ? rows[Number(tr.dataset.i)] : null;
  if (b.matches('[data-show]') && row) { const w = window.open('', '_blank'); if (w) { w.document.write(row.html); w.document.close(); } return; }
  if (b.matches('[data-run]')) { say(top, 'רץ...', 'info'); const r = await api('admin', { op: b.dataset.run }, true); say(top, r.status === 200 ? 'בוצע: ' + JSON.stringify(r).slice(0, 300) : errText(r), r.status === 200 ? 'ok' : 'bad'); return; }
  if (b.matches('[data-save-set]')) {
    const k = b.dataset.saveSet!; let value; try { value = JSON.parse(($(`[data-set="${k}"]`, view) as HTMLTextAreaElement).value); } catch { return say(top, 'זה לא JSON תקין.', 'bad'); }
    if (k === 'test_mode' && value === false && !confirm('לכבות את מצב הבדיקה? מעכשיו יהיו חיובים אמיתיים ומיילים אמיתיים.')) return;
    const r = await api('admin', { op: 'settings_set', key: k, value }, true); return say(top, r.status === 200 ? 'נשמר.' : errText(r), r.status === 200 ? 'ok' : 'bad');
  }
  if (b.matches('[data-act]') && row) {
    const op = b.dataset.act!; const extra: any = {};
    if (op === 'sponsored_draft') { extra.title = prompt('כותרת המאמר') || ''; extra.body_md = prompt('טקסט המאמר (Markdown). אפשר גם לשלוח מהמערכת של צוות התוכן.') || ''; if (!extra.title) return; }
    if (op === 'order_mark_paid') { extra.ref = prompt('אסמכתא של ההעברה') || ''; if (!extra.ref) return; }
    if (['firm_hide', 'removal_reject', 'claim_reject', 'placement_cancel'].includes(op) && !confirm('לבצע?')) return;
    const r = await api('admin', { op, id: row.id, ...extra }, true);
    say(top, r.status === 200 ? 'בוצע.' : errText(r) + (r.issues ? ' ' + r.issues.join(' ') : ''), r.status === 200 ? 'ok' : 'bad');
    if (r.status === 200) load(current);
  }
});

(async () => {
  if (!session()) { say(top, '', 'info'); top.innerHTML = `צריך להיכנס קודם. <a href="${esc(root.dataset.portal!)}">לכניסה</a>`; return; }
  $('[data-tabs]', root).innerHTML = Object.entries(TABS).map(([k, v]) => `<button type="button" role="tab" data-t="${k}">${v.t}</button>`).join('');
  $$('[data-tabs] button', root).forEach((b) => b.addEventListener('click', () => load(b.dataset.t!)));
  load('overview');
})();
