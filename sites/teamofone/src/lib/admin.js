// Admin panel (Yakir only): overview and money, students and access, orders, articles, course content, skills, plans, settings, log.
import { sb, BASE, esc, fmtDate, ils, toast, errText } from './sb.js';
import { md, words } from './md.js';
import { CATS } from './articles.js';
import { renderMail, SAMPLE } from './mailtpl.js';
import { KIND as DKIND, REASONS } from './retention.js';

const $ = (id) => document.getElementById(id);
const pane = () => $('pane');
const STATUS = { test: ['בדיקה', 'warn'], paid: ['שולם', 'ok'], refunded: ['הוחזר', 'no'], failed: ['נכשל', 'no'], cancelled: ['בוטל', 'no'], pending: ['לא הושלם', ''], review: ['לבדיקה', 'warn'] };
const PLAN = { course: 'הקורס המלא', monthly: 'מנוי חודשי' };
// single courses: 'module-11' -> 'קורס בודד: <name>' (filled from too_plans when the panel opens)
const MODNAME = {};
async function loadPlanNames() {
  const { data } = await sb.from('too_plans').select('code,name,kind,module_id').eq('kind', 'module').order('sort');
  (data || []).forEach((p) => { PLAN[p.code] = 'קורס בודד: ' + p.name; MODNAME[p.module_id] = p.name; });
  return data || [];
}
const ACTIONS = { signup: 'הרשמה', checkout_test: 'רכישת בדיקה', cancel_subscription: 'ביטול חידוש מנוי', admin_grant: 'מתן גישה', admin_revoke: 'ביטול גישה', admin_block: 'חסימה', admin_unblock: 'ביטול חסימה', admin_set_role: 'שינוי הרשאה', admin_refund: 'החזר כספי', admin_record_payment: 'רישום תשלום', pause_subscription: 'עצירת מנוי לחודש', resume_subscription: 'חזרה מעצירה', renew_on: 'החזרת חידוש מנוי', article_publish: 'פרסום מאמר', article_save: 'שמירת מאמר', settings: 'שינוי הגדרות' };
let users = [];

function modal(html) { $('mbox').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; $('mbox').innerHTML = ''; }
function twice(btn, fn, txt = 'לחצו שוב לאישור') { btn.addEventListener('click', () => { if (btn.dataset.sure === '1') return fn(); btn.dataset.sure = '1'; const o = btn.textContent; btn.textContent = txt; setTimeout(() => { btn.dataset.sure = ''; btn.textContent = o; }, 4000); }); }
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;
async function rpc(name, args) { const { data, error } = await sb.rpc(name, args); if (error) { toast(errText(error), true); throw error; } return data; }

const SECTIONS = [
  ['overview', 'סקירה וכספים', overview], ['retention', 'שימור מנויים', retention], ['students', 'תלמידים והרשאות', students], ['orders', 'הזמנות ותשלומים', orders],
  ['articles', 'מאמרים', articles], ['content', 'תוכן הקורס', content], ['drops', 'השבוע בצוות', drops], ['assets', 'סקילים ותבניות', assets],
  ['lives', 'שידורים חיים', lives], ['community', 'קהילה', community], ['mails', 'מיילים אוטומטיים', mails], ['plans', 'מסלולים ומחירים', plans], ['settings', 'הגדרות', settings], ['log', 'יומן פעולות', log],
];
function go(key) {
  const s = SECTIONS.find((x) => x[0] === key) || SECTIONS[0];
  $('snav').querySelectorAll('button').forEach((b) => b.setAttribute('aria-current', b.dataset.k === s[0]));
  history.replaceState(null, '', '#' + s[0]);
  pane().innerHTML = '<div class="card">טוען...</div>';
  s[2]().catch((e) => { pane().innerHTML = '<div class="card">' + esc(errText(e)) + '</div>'; });
}

export async function initAdmin() {
  const { data } = await sb.auth.getSession();
  if (!data.session) { location.replace(BASE + 'knisa/?m=login&next=' + encodeURIComponent(location.pathname)); return; }
  const me = await sb.rpc('too_me');
  if (!me.data?.admin) { $('gate').innerHTML = '<div class="card"><h2>אין הרשאה</h2><p class="muted">הפאנל פתוח רק למנהלי האתר.</p><a class="btn btn-k sm" href="' + BASE + 'ezor-ishi/">לאזור האישי</a></div>'; return; }
  $('gate').hidden = true; $('adm').hidden = false;
  const nav = $('anav'); nav.innerHTML = `<a class="hide-m" href="${BASE}">לאתר</a><a href="${BASE}ezor-ishi/">האזור האישי</a>`;
  const out = document.createElement('button'); out.textContent = 'יציאה'; out.onclick = async () => { await sb.auth.signOut(); location.replace(BASE); }; nav.appendChild(out);
  $('snav').innerHTML = SECTIONS.map((s) => `<button data-k="${s[0]}">${s[1]}</button>`).join('');
  $('snav').onclick = (e) => { const b = e.target.closest('button'); if (b) go(b.dataset.k); };
  $('modal').onclick = (e) => { if (e.target.id === 'modal') closeModal(); };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  go(location.hash.slice(1));
}

/* ---------- overview ---------- */
async function overview() {
  const [st, { data: tm }, { data: lg }] = await Promise.all([rpc('too_admin_stats'), sb.from('too_settings').select('value').eq('key', 'test_mode').maybeSingle(), sb.from('too_audit').select('*').order('at', { ascending: false }).limit(8)]);
  const mx = Math.max(1, ...st.by_month.map((m) => m.paid + m.test));
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:20px"><div><h2 class="t">סקירה</h2><p class="muted" style="margin:0">כל המספרים מתעדכנים בזמן אמת.</p></div>${tm?.value === true ? '<span class="pill warn">האתר במצב בדיקה: אין חיובים אמיתיים</span>' : '<span class="pill ok">תשלומים אמיתיים פעילים</span>'}</div>
    <div class="grid4" style="margin-bottom:14px">
      <div class="kp dk"><b>${ils(st.revenue_month)}</b><span>הכנסות החודש (תשלומים אמיתיים)</span></div>
      <div class="kp"><b>${ils(st.mrr)}</b><span>הכנסה חודשית קבועה ממנויים שמתחדשים</span></div>
      <div class="kp"><b>${ils(st.revenue_total)}</b><span>סך כל ההכנסות</span></div>
      <div class="kp"><b>${ils(st.refunds_total)}</b><span>החזרים כספיים</span></div>
      <div class="kp"><b>${st.students}</b><span>נרשמים (${st.signups_30} ב־30 הימים האחרונים)</span></div>
      <div class="kp"><b>${st.course_owners}</b><span>בעלי הקורס המלא</span></div>
      <div class="kp"><b>${st.active_subs}</b><span>מנויים פעילים (${st.renewing_subs} מתחדשים)</span></div>
      <div class="kp"><b>${st.test_orders}</b><span>רכישות בדיקה</span></div>
    </div>
    <div class="grid2">
      <div class="card"><h3>הכנסות לפי חודש</h3><p class="muted" style="font-size:13px;margin:0">שחור: תשלומים אמיתיים. מפוספס: רכישות בדיקה.</p>
        <div class="bars">${st.by_month.map((m) => `<div title="${m.m}: ${ils(m.paid)} אמיתי, ${ils(m.test)} בדיקה"><i style="height:${(m.paid / mx) * 100}%"></i><i class="t" style="height:${(m.test / mx) * 100}%;${m.test ? '' : 'display:none'}"></i><small>${m.m}</small></div>`).join('')}</div></div>
      <div class="card"><h3>מצב התוכן</h3><div style="display:grid;gap:10px;margin-top:10px">
        <div class="spread"><span>מאמרים שפורסמו</span><b>${st.articles}</b></div><div class="spread"><span>טיוטות מאמרים</span><b>${st.drafts}</b></div>
        <div class="spread"><span>שיעורים בקורס</span><b>${st.lessons}</b></div><div class="spread"><span>שיעורים עם סרטון</span><b>${st.with_video} מתוך ${st.lessons}</b></div></div></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="spread"><h3>פעולות אחרונות</h3><button class="btn btn-w sm" id="toLog">לכל היומן</button></div>${logRows(lg || [])}</div>`;
  $('toLog').onclick = () => go('log');
}
function logRows(rows) {
  if (!rows.length) return '<div class="empty">עדיין אין פעולות.</div>';
  return '<div class="tbl2" style="margin-top:10px"><table><thead><tr><th>מתי</th><th>מי</th><th>פעולה</th><th>פרטים</th></tr></thead><tbody>' + rows.map((r) => `<tr><td>${new Date(r.at).toLocaleString('he-IL')}</td><td dir="ltr" style="text-align:right">${esc(r.actor_email || '')}</td><td>${esc(ACTIONS[r.action] || r.action)}</td><td style="font-size:13px;color:var(--mutD)">${esc(Object.entries(r.detail || {}).filter(([k]) => !['user', 'order', 'access'].includes(k)).map(([k, v]) => k + ': ' + (typeof v === 'object' ? JSON.stringify(v) : v)).join(' · '))}</td></tr>`).join('') + '</tbody></table></div>';
}

/* ---------- students ---------- */
async function students() {
  [users] = await Promise.all([rpc('too_admin_users'), loadPlanNames()]);
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">תלמידים</h2><p class="muted" style="margin:0">${users.length} נרשמים. לחיצה על "ניהול" פותחת גישות, תשלומים, חסימה והרשאות.</p></div>
    <div class="f" style="margin:0;min-width:240px"><input id="q" placeholder="חיפוש לפי שם, מייל או טלפון"></div></div>
    <div class="row" style="margin-bottom:12px" id="flt">${[['all', 'כולם'], ['course', 'בעלי הקורס'], ['sub', 'מנויים פעילים'], ['none', 'בלי גישה'], ['blocked', 'חסומים']].map(([k, t], i) => `<button class="btn ${i ? 'btn-w' : 'btn-k'} sm" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="ut"></div>`;
  let f = 'all';
  const draw = () => {
    const q = $('q').value.trim().toLowerCase();
    const rows = users.filter((u) => (!q || [u.email, u.full_name, u.phone].join(' ').toLowerCase().includes(q))
      && (f === 'all' || (f === 'course' && u.course) || (f === 'sub' && u.sub_ends) || (f === 'none' && !u.course && !u.sub_ends && !(u.modules || []).length) || (f === 'blocked' && u.blocked)));
    $('ut').innerHTML = rows.length ? '<div class="tbl2"><table><thead><tr><th>שם</th><th>מייל</th><th>טלפון</th><th>גישה</th><th>שילם</th><th>שיעורים</th><th>הצטרף</th><th>ביקר לאחרונה</th><th></th></tr></thead><tbody>' + rows.map((u) => `<tr>
      <td><b>${esc(u.full_name || '')}</b> ${u.role === 'admin' ? pill('מנהל', 'k') : ''} ${u.blocked ? pill('חסום', 'no') : ''}</td><td dir="ltr" style="text-align:right">${esc(u.email)}</td><td dir="ltr" style="text-align:right">${esc(u.phone || '')}</td>
      <td>${u.course ? pill('קורס', 'ok') : ''} ${u.sub_ends ? pill('מנוי עד ' + fmtDate(u.sub_ends), u.sub_renew ? 'k' : '') : ''} ${(u.modules || []).map((mid) => pill('קורס בודד: ' + (MODNAME[mid] || mid), 'ok')).join(' ')} ${!u.course && !u.sub_ends && !(u.modules || []).length ? pill('אין', 'no') : ''}</td>
      <td>${ils(u.paid)}</td><td>${u.done}</td><td>${fmtDate(u.created_at)}</td><td>${fmtDate(u.last_seen)}</td><td><button class="btn btn-k sm" data-u="${u.id}">ניהול</button></td></tr>`).join('') + '</tbody></table></div>' : '<div class="empty">אין תלמידים שמתאימים לחיפוש.</div>';
  };
  $('q').oninput = draw;
  $('flt').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; $('flt').querySelectorAll('button').forEach((x) => (x.className = 'btn sm ' + (x === b ? 'btn-k' : 'btn-w'))); draw(); };
  $('ut').onclick = (e) => { const b = e.target.closest('[data-u]'); if (b) userModal(b.dataset.u); };
  draw();
}
async function userModal(id) {
  const u = users.find((x) => x.id === id); if (!u) return;
  const [{ data: ords }, mplans] = await Promise.all([sb.from('too_orders').select('*').eq('user_id', id).order('created_at', { ascending: false }), loadPlanNames()]);
  modal(`<div class="spread"><h2 style="margin:0">${esc(u.full_name || u.email)}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <p class="muted" dir="ltr" style="text-align:right;margin:4px 0 16px">${esc(u.email)} ${u.phone ? ' · ' + esc(u.phone) : ''}</p>
    <div class="grid2">
      <div class="card"><h3>גישות</h3>${u.access.length ? '<div style="display:grid;gap:8px">' + u.access.map((a) => `<div class="spread" style="background:var(--paper);border-radius:12px;padding:9px 12px;font-size:14px"><span>${a.kind === 'course' ? 'קורס' : a.kind === 'module' ? 'קורס בודד: ' + esc(MODNAME[a.module_id] || a.module_id) : 'מנוי'} · ${fmtDate(a.starts_at)} ${a.ends_at ? 'עד ' + fmtDate(a.ends_at) : 'לתמיד'} ${a.revoked ? pill('בוטל', 'no') : ''}<br><span class="muted" style="font-size:12.5px">${esc(a.note || '')}</span></span>${a.revoked ? '' : `<button class="btn btn-r sm" data-rv="${a.id}">ביטול</button>`}</div>`).join('') + '</div>' : '<p class="muted">אין גישות.</p>'}
        <div class="row" style="margin-top:14px"><button class="btn btn-k sm" id="gc">מתן גישה לקורס</button><select id="gm" style="font:inherit;padding:8px;border-radius:10px"><option value="1">חודש</option><option value="3">3 חודשים</option><option value="6">6 חודשים</option><option value="12">שנה</option></select><button class="btn btn-w sm" id="gs">מתן מנוי</button></div></div>
      <div class="card"><h3>רישום תשלום ידני</h3><p class="muted" style="font-size:13.5px;margin:0 0 10px">למשל אם הלקוח שילם בהעברה או בביט. נרשם כתשלום אמיתי ופותח גישה.</p>
        <div class="f"><label for="pp">מסלול</label><select id="pp"><option value="course">הקורס המלא</option><option value="monthly">מנוי חודשי</option>${mplans.map((p) => `<option value="${esc(p.code)}">קורס בודד: ${esc(p.name)}</option>`).join('')}</select></div>
        <div class="f"><label for="pa">סכום בשקלים</label><input id="pa" type="number" min="0" placeholder="ברירת מחדל: מחיר המסלול"></div>
        <div class="f"><label for="pn">הערה</label><input id="pn" placeholder="לדוגמה: שולם בביט"></div>
        <button class="btn btn-k sm" id="rp">רישום התשלום</button></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>הזמנות</h3>${(ords || []).length ? '<div style="display:grid;gap:6px">' + ords.map((o) => `<div class="spread" style="font-size:14px"><span>${fmtDate(o.created_at)} · ${PLAN[o.plan_code] || o.plan_code} · ${ils(o.amount_ils)} ${pill((STATUS[o.status] || [o.status])[0], (STATUS[o.status] || [])[1])}</span>${['paid', 'test'].includes(o.status) ? `<button class="btn btn-r sm" data-rf="${o.id}">החזר וביטול גישה</button>` : ''}</div>`).join('') + '</div>' : '<p class="muted">אין הזמנות.</p>'}</div>
    <div class="row" style="margin-top:14px"><button class="btn ${u.blocked ? 'btn-k' : 'btn-r'} sm" id="bl">${u.blocked ? 'ביטול חסימה' : 'חסימת התלמיד'}</button><button class="btn btn-w sm" id="ro">${u.role === 'admin' ? 'הסרת הרשאת מנהל' : 'הפיכה למנהל'}</button></div>`);
  const reload = async () => { closeModal(); await students(); userModal(id); };
  $('mx').onclick = closeModal;
  $('gc').onclick = async () => { await rpc('too_admin_grant', { p_user: id, p_kind: 'course', p_months: null, p_note: null }); toast('ניתנה גישה לקורס.'); reload(); };
  $('gs').onclick = async () => { await rpc('too_admin_grant', { p_user: id, p_kind: 'subscription', p_months: Number($('gm').value), p_note: null }); toast('ניתן מנוי.'); reload(); };
  $('rp').onclick = async () => { await rpc('too_admin_record_payment', { p_user: id, p_plan: $('pp').value, p_amount: $('pa').value ? Number($('pa').value) : null, p_note: $('pn').value || null }); toast('התשלום נרשם והגישה נפתחה.'); reload(); };
  $('mbox').querySelectorAll('[data-rv]').forEach((b) => twice(b, async () => { await rpc('too_admin_revoke', { p_access: Number(b.dataset.rv) }); toast('הגישה בוטלה.'); reload(); }));
  $('mbox').querySelectorAll('[data-rf]').forEach((b) => twice(b, async () => { await rpc('too_admin_refund', { p_order: b.dataset.rf }); toast('ההזמנה סומנה כהוחזרה, והגישה בוטלה. את ההחזר עצמו מבצעים בחברת הסליקה.'); reload(); }));
  twice($('bl'), async () => { await rpc('too_admin_block', { p_user: id, p_blocked: !u.blocked }); toast(u.blocked ? 'החסימה בוטלה.' : 'התלמיד נחסם.'); reload(); });
  twice($('ro'), async () => { await rpc('too_admin_set_role', { p_user: id, p_role: u.role === 'admin' ? 'student' : 'admin' }); toast('ההרשאה עודכנה.'); reload(); });
}

/* ---------- orders ---------- */
async function orders() {
  const [list] = await Promise.all([rpc('too_admin_orders'), loadPlanNames()]);
  pane().innerHTML = `<div class="spread" style="margin-bottom:16px"><div><h2 class="t">הזמנות</h2><p class="muted" style="margin:0">כל ההזמנות, כולל רכישות בדיקה. החזר כספי בפועל מבצעים בחברת הסליקה, וכאן מסמנים אותו.</p></div><button class="btn btn-w sm" id="csv">הורדה לאקסל</button></div>
    <div class="row" style="margin-bottom:12px" id="of">${[['all', 'הכל'], ['paid', 'שולם'], ['test', 'בדיקה'], ['refunded', 'הוחזר']].map(([k, t], i) => `<button class="btn ${i ? 'btn-w' : 'btn-k'} sm" data-f="${k}">${t}</button>`).join('')}</div><div id="ot"></div>`;
  let f = 'all';
  const draw = () => {
    const rows = list.filter((o) => f === 'all' || o.status === f);
    const sum = rows.filter((o) => o.status === 'paid').reduce((a, o) => a + o.amount, 0);
    $('ot').innerHTML = rows.length ? `<p style="margin:0 0 10px">${rows.length} הזמנות · סך תשלומים אמיתיים: <b>${ils(sum)}</b></p><div class="tbl2"><table><thead><tr><th>תאריך</th><th>לקוח</th><th>מסלול</th><th>סכום</th><th>מצב</th><th>אמצעי</th><th>הערה</th><th></th></tr></thead><tbody>` + rows.map((o) => `<tr><td>${new Date(o.created_at).toLocaleString('he-IL')}</td><td>${esc(o.name || '')}<br><span class="muted" dir="ltr" style="font-size:13px">${esc(o.email)}</span></td><td>${PLAN[o.plan] || esc(o.plan)}</td><td>${ils(o.amount)}</td><td>${pill(STATUS[o.status][0], STATUS[o.status][1])}</td><td>${o.provider === 'test' ? 'בדיקה' : o.provider === 'manual' ? 'רישום ידני' : esc(o.provider)}</td><td style="font-size:13px">${esc(o.note || '')}</td><td>${['paid', 'test'].includes(o.status) ? `<button class="btn btn-r sm" data-rf="${o.id}">החזר</button>` : ''}</td></tr>`).join('') + '</tbody></table></div>' : '<div class="empty">אין הזמנות.</div>';
    $('ot').querySelectorAll('[data-rf]').forEach((b) => twice(b, async () => { await rpc('too_admin_refund', { p_order: b.dataset.rf }); toast('סומן כהוחזר, והגישה בוטלה.'); orders(); }));
  };
  $('of').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; $('of').querySelectorAll('button').forEach((x) => (x.className = 'btn sm ' + (x === b ? 'btn-k' : 'btn-w'))); draw(); };
  $('csv').onclick = () => {
    const rows = [['תאריך', 'שם', 'מייל', 'מסלול', 'סכום', 'מצב', 'אמצעי', 'הערה'], ...list.map((o) => [new Date(o.created_at).toLocaleString('he-IL'), o.name || '', o.email, PLAN[o.plan] || o.plan, o.amount, STATUS[o.status][0], o.provider, o.note || ''])];
    const csv = '﻿' + rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'orders.csv'; a.click();
  };
  draw();
}

/* ---------- articles ---------- */
async function articles() {
  const { data } = await sb.from('too_articles').select('id,slug,title,category,status,published_at,updated_at,body_md').order('updated_at', { ascending: false });
  pane().innerHTML = `<div class="spread" style="margin-bottom:16px"><div><h2 class="t">מאמרים</h2><p class="muted" style="margin:0">מאמר שמתפרסם מופיע מיד באתר, ונכנס למפת האתר לגוגל בבנייה הבאה של האתר (פעמיים ביום).</p></div><button class="btn btn-k" id="na">מאמר חדש</button></div>
    ${(data || []).length ? '<div class="tbl2"><table><thead><tr><th>כותרת</th><th>קטגוריה</th><th>מצב</th><th>מילים</th><th>עודכן</th><th></th></tr></thead><tbody>' + data.map((a) => `<tr><td><b>${esc(a.title)}</b><br><span class="muted" dir="ltr" style="font-size:12.5px">/${esc(a.slug)}/</span></td><td>${esc(a.category)}</td><td>${a.status === 'published' ? pill('פורסם ' + fmtDate(a.published_at), 'ok') : pill('טיוטה', 'warn')}</td><td>${words(a.body_md)}</td><td>${fmtDate(a.updated_at)}</td><td class="row"><button class="btn btn-k sm" data-e="${a.id}">עריכה</button>${a.status === 'published' ? `<a class="btn btn-w sm" href="${BASE}maamar/?s=${encodeURIComponent(a.slug)}" target="_blank">צפייה</a>` : ''}</td></tr>`).join('') + '</tbody></table></div>' : '<div class="empty">עדיין אין מאמרים. לחצו על "מאמר חדש".</div>'}`;
  $('na').onclick = () => editArticle(null);
  pane().querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => editArticle(Number(b.dataset.e))));
}
async function editArticle(id) {
  let a = { title: '', slug: '', seo_title: '', description: '', category: 'מדריכים', cover_url: '', body_md: '', faq: [], status: 'draft' };
  if (id) { const { data } = await sb.from('too_articles').select('*').eq('id', id).single(); a = data; }
  const faqTxt = (a.faq || []).map((x) => 'ש: ' + x.q + '\nת: ' + x.a).join('\n\n');
  modal(`<div class="spread"><h2 style="margin:0">${id ? 'עריכת מאמר' : 'מאמר חדש'}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <div class="grid2" style="margin-top:14px">
      <div class="f"><label for="at">כותרת</label><input id="at" value="${esc(a.title)}"></div>
      <div class="f"><label for="as">כתובת המאמר (באנגלית, עם מקפים)</label><input id="as" dir="ltr" value="${esc(a.slug)}" placeholder="ai-tools-for-small-business"></div>
      <div class="f"><label for="ac">קטגוריה</label><select id="ac">${CATS.map((c) => `<option ${c === a.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="f"><label for="ast">כותרת לגוגל <small>(עד 60 תווים, לא חובה)</small></label><input id="ast" value="${esc(a.seo_title || '')}"></div>
    </div>
    <div class="f"><label for="ad">תיאור קצר לגוגל <small id="adc"></small></label><textarea id="ad" style="min-height:70px">${esc(a.description || '')}</textarea></div>
    <div class="f"><label for="acv">תמונה ראשית (קישור)</label><input id="acv" dir="ltr" value="${esc(a.cover_url || '')}" placeholder="קישור לתמונה, או השאירו ריק"></div>
    <div class="edgrid"><div class="f"><label for="ab">תוכן המאמר</label>
      <div class="toolbar"><button data-w="## ">כותרת</button><button data-w="### ">כותרת משנה</button><button data-b="**">מודגש</button><button data-w="- ">רשימה</button><button data-w="1. ">רשימה ממוספרת</button><button data-l="1">קישור</button><button data-w="> ">ציטוט</button><button data-t="1">טבלה</button></div>
      <textarea id="ab" style="min-height:420px">${esc(a.body_md || '')}</textarea><small id="aw"></small></div>
      <div class="f"><label>תצוגה מקדימה</label><div class="preview prose" id="apv"></div></div></div>
    <div class="f"><label for="af">שאלות ותשובות <small>(שורה שמתחילה ב"ש:" ואחריה שורה שמתחילה ב"ת:")</small></label><textarea id="af">${esc(faqTxt)}</textarea></div>
    <div class="err" id="aerr"></div>
    <div class="row"><button class="btn btn-w" id="sd">שמירה כטיוטה</button><button class="btn btn-k" id="sp">${a.status === 'published' ? 'שמירה ועדכון באתר' : 'פרסום באתר'}</button>${a.status === 'published' ? '<button class="btn btn-w" id="su">החזרה לטיוטה</button>' : ''}${id ? '<button class="btn btn-r" id="sx">מחיקה</button>' : ''}</div>`);
  $('mx').onclick = closeModal;
  const ab = $('ab');
  const upd = () => { $('apv').innerHTML = md(ab.value); $('aw').textContent = words(ab.value) + ' מילים. מומלץ 1,000 לפחות.'; const n = $('ad').value.length; $('adc').textContent = `(${n} תווים, מומלץ 140 עד 160)`; };
  ab.oninput = upd; $('ad').oninput = upd; upd();
  $('at').addEventListener('blur', () => { if (!$('as').value) $('as').value = 'maamar-' + Date.now().toString(36); });
  $('mbox').querySelector('.toolbar').onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return; e.preventDefault();
    const s = ab.selectionStart, en = ab.selectionEnd, sel = ab.value.slice(s, en);
    let ins = sel;
    if (b.dataset.w) { const ls = ab.value.lastIndexOf('\n', s - 1) + 1; ab.setRangeText(b.dataset.w, ls, ls, 'end'); upd(); return; }
    if (b.dataset.b) ins = '**' + (sel || 'טקסט מודגש') + '**';
    if (b.dataset.l) ins = '[' + (sel || 'טקסט הקישור') + '](https://)';
    if (b.dataset.t) ins = '\n| עמודה | עמודה |\n|---|---|\n| תא | תא |\n';
    ab.setRangeText(ins, s, en, 'end'); ab.focus(); upd();
  };
  const collect = (status) => {
    const faq = []; let q = null;
    $('af').value.split('\n').forEach((l) => { const t = l.trim(); if (/^ש[:׃]/.test(t)) q = t.replace(/^ש[:׃]\s*/, ''); else if (/^ת[:׃]/.test(t) && q) { faq.push({ q, a: t.replace(/^ת[:׃]\s*/, '') }); q = null; } });
    const slug = $('as').value.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
    return { title: $('at').value.trim(), slug, seo_title: $('ast').value.trim() || null, description: $('ad').value.trim(), category: $('ac').value, cover_url: $('acv').value.trim() || null, body_md: ab.value, faq, status, updated_at: new Date().toISOString(), ...(status === 'published' && a.status !== 'published' ? { published_at: new Date().toISOString() } : {}) };
  };
  const save = async (status) => {
    const row = collect(status); $('aerr').textContent = '';
    if (!row.title || !row.slug) { $('aerr').textContent = 'חסרים כותרת וכתובת למאמר.'; return; }
    if (status === 'published' && !row.description) { $('aerr').textContent = 'לפני פרסום צריך תיאור קצר לגוגל.'; return; }
    const r = id ? await sb.from('too_articles').update(row).eq('id', id) : await sb.from('too_articles').insert(row);
    if (r.error) { $('aerr').textContent = /duplicate|unique/.test(r.error.message) ? 'כבר יש מאמר עם הכתובת הזאת.' : errText(r.error); return; }
    toast(status === 'published' ? 'המאמר באוויר.' : 'נשמר כטיוטה.'); closeModal(); articles();
  };
  $('sd').onclick = () => save('draft'); $('sp').onclick = () => save('published');
  if ($('su')) $('su').onclick = () => save('draft');
  if ($('sx')) twice($('sx'), async () => { const { error } = await sb.from('too_articles').delete().eq('id', id); if (error) return toast(errText(error), true); toast('המאמר נמחק.'); closeModal(); articles(); }, 'לחצו שוב למחיקה סופית');
}

/* ---------- course content ---------- */
async function content() {
  const [{ data: mods }, { data: les }, { data: cont }] = await Promise.all([sb.from('too_modules').select('*').order('n'), sb.from('too_lessons').select('*').order('n'), sb.from('too_lesson_content').select('lesson_id,video_url,body_md')]);
  const C = Object.fromEntries((cont || []).map((c) => [c.lesson_id, c]));
  const row = (l) => `<tr><td>${l.n}</td><td><b>${esc(l.title)}</b><br><span class="muted" style="font-size:13px">${esc(l.summary || '')}</span></td><td>${C[l.id]?.video_url ? pill('יש סרטון', 'ok') : pill('אין סרטון', 'warn')}</td><td>${C[l.id]?.body_md ? pill(words(C[l.id].body_md) + ' מילים') : pill('אין טקסט')}</td><td>${l.free_preview ? pill('פתוח לכולם', 'l') : ''} ${l.published ? '' : pill('מוסתר', 'no')}</td><td><button class="btn btn-k sm" data-l="${l.id}">עריכה</button></td></tr>`;
  pane().innerHTML = `<div class="spread" style="margin-bottom:16px"><div><h2 class="t">תוכן הקורס</h2><p class="muted" style="margin:0">לכל שיעור: קישור לסרטון, טקסט וקבצים. "הרצאה במנוי" מופיעה למנויים באזור "חדש במנוי".</p></div><button class="btn btn-k" id="nu">הרצאה חדשה במנוי</button></div>
    ${(mods || []).map((m) => `<div class="card" style="margin-bottom:12px"><div class="spread"><h3>פרק ${m.n}: ${esc(m.title)}</h3><div class="row"><button class="btn btn-w sm" data-m="${m.id}">עריכת הפרק</button><button class="btn btn-w sm" data-nl="${m.id}">שיעור חדש</button></div></div><div class="tbl2" style="margin-top:10px"><table><thead><tr><th>#</th><th>שיעור</th><th>סרטון</th><th>טקסט</th><th>מצב</th><th></th></tr></thead><tbody>${(les || []).filter((l) => l.module_id === m.id).map(row).join('')}</tbody></table></div></div>`).join('')}
    <div class="card"><h3>הרצאות במנוי</h3>${(les || []).filter((l) => l.kind === 'update').length ? `<div class="tbl2" style="margin-top:10px"><table><thead><tr><th>#</th><th>הרצאה</th><th>סרטון</th><th>טקסט</th><th>מצב</th><th></th></tr></thead><tbody>${(les || []).filter((l) => l.kind === 'update').map(row).join('')}</tbody></table></div>` : '<div class="empty">עוד אין הרצאות במנוי.</div>'}</div>`;
  pane().querySelectorAll('[data-l]').forEach((b) => (b.onclick = () => editLesson(Number(b.dataset.l), null, null)));
  pane().querySelectorAll('[data-nl]').forEach((b) => (b.onclick = () => editLesson(null, Number(b.dataset.nl), 'lesson')));
  $('nu').onclick = () => editLesson(null, null, 'update');
  pane().querySelectorAll('[data-m]').forEach((b) => (b.onclick = () => editModule((mods || []).find((m) => m.id === Number(b.dataset.m)))));
}
function editModule(m) {
  modal(`<div class="spread"><h2 style="margin:0">פרק ${m.n}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <div class="f" style="margin-top:14px"><label for="mt">שם הפרק</label><input id="mt" value="${esc(m.title)}"></div>
    <div class="f"><label for="ms">תת כותרת</label><input id="ms" value="${esc(m.sub || '')}"></div>
    <div class="f"><label for="mo">מה עובד אצלכם בסוף הפרק</label><input id="mo" value="${esc(m.outcome || '')}"></div>
    <label class="chk"><input type="checkbox" id="mp" ${m.published ? 'checked' : ''}><span>מוצג לתלמידים</span></label>
    <button class="btn btn-k" id="sv">שמירה</button>`);
  $('mx').onclick = closeModal;
  $('sv').onclick = async () => { const { error } = await sb.from('too_modules').update({ title: $('mt').value.trim(), sub: $('ms').value.trim(), outcome: $('mo').value.trim(), published: $('mp').checked }).eq('id', m.id); if (error) return toast(errText(error), true); toast('נשמר.'); closeModal(); content(); };
}
async function editLesson(id, moduleId, kind) {
  let l = { title: '', summary: '', n: 1, duration_min: null, free_preview: false, published: true, kind: kind || 'lesson', module_id: moduleId }, c = { body_md: '', video_url: '', attachments: [] };
  if (id) { const [{ data: a }, { data: b }] = await Promise.all([sb.from('too_lessons').select('*').eq('id', id).single(), sb.from('too_lesson_content').select('*').eq('lesson_id', id).maybeSingle()]); l = a; if (b) c = b; }
  else if (moduleId) { const { count } = await sb.from('too_lessons').select('id', { count: 'exact', head: true }).eq('module_id', moduleId); l.n = (count || 0) + 1; }
  modal(`<div class="spread"><h2 style="margin:0">${id ? 'עריכת שיעור' : l.kind === 'update' ? 'הרצאה חדשה במנוי' : 'שיעור חדש'}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <div class="grid2" style="margin-top:14px"><div class="f"><label for="lt">שם השיעור</label><input id="lt" value="${esc(l.title)}"></div><div class="f"><label for="ln">מספר בפרק</label><input id="ln" type="number" min="1" value="${l.n}"></div></div>
    <div class="f"><label for="ls">תיאור קצר</label><input id="ls" value="${esc(l.summary || '')}"></div>
    <div class="f"><label for="lv">קישור לסרטון</label><input id="lv" dir="ltr" value="${esc(c.video_url || '')}" placeholder="יוטיוב (לא רשום), וימאו או קובץ סרטון"><small>מומלץ להעלות ליוטיוב כ"לא רשום" או לשירות סרטונים מוגן, ולהדביק כאן את הקישור.</small></div>
    <div class="f"><label for="lb">טקסט השיעור</label><textarea id="lb" style="min-height:260px">${esc(c.body_md || '')}</textarea></div>
    <div class="row"><label class="chk"><input type="checkbox" id="lf" ${l.free_preview ? 'checked' : ''}><span>פתוח לצפייה לכל מי שנרשם (שיעור לדוגמה)</span></label><label class="chk"><input type="checkbox" id="lp" ${l.published ? 'checked' : ''}><span>מוצג לתלמידים</span></label></div>
    <div class="row"><button class="btn btn-k" id="sv">שמירה</button>${id ? '<button class="btn btn-r" id="dl">מחיקת השיעור</button>' : ''}</div>`);
  $('mx').onclick = closeModal;
  $('sv').onclick = async () => {
    const row = { title: $('lt').value.trim(), summary: $('ls').value.trim(), n: Number($('ln').value) || 1, free_preview: $('lf').checked, published: $('lp').checked, kind: l.kind, module_id: l.module_id };
    if (!row.title) return toast('חסר שם לשיעור.', true);
    let lid = id;
    if (id) { const { error } = await sb.from('too_lessons').update(row).eq('id', id); if (error) return toast(errText(error), true); }
    else { const { data, error } = await sb.from('too_lessons').insert(row).select('id').single(); if (error) return toast(errText(error), true); lid = data.id; }
    const { error: e2 } = await sb.from('too_lesson_content').upsert({ lesson_id: lid, video_url: $('lv').value.trim() || null, body_md: $('lb').value, attachments: c.attachments || [], updated_at: new Date().toISOString() });
    if (e2) return toast(errText(e2), true);
    toast('נשמר.'); closeModal(); content();
  };
  if ($('dl')) twice($('dl'), async () => { const { error } = await sb.from('too_lessons').delete().eq('id', id); if (error) return toast(errText(error), true); toast('השיעור נמחק.'); closeModal(); content(); }, 'לחצו שוב למחיקה סופית');
}

/* ---------- skills and templates ---------- */
async function assets() {
  const { data } = await sb.from('too_assets').select('*').order('sort');
  pane().innerHTML = `<div class="spread" style="margin-bottom:16px"><div><h2 class="t">סקילים ותבניות</h2><p class="muted" style="margin:0">הקבצים נשמרים במקום מוגן, ורק מי שיש לו גישה יכול להוריד.</p></div><button class="btn btn-k" id="nw">קובץ חדש</button></div>
    ${(data || []).length ? '<div class="tbl2"><table><thead><tr><th>שם</th><th>סוג</th><th>קובץ</th><th>מצב</th><th></th></tr></thead><tbody>' + data.map((a) => `<tr><td><b>${esc(a.title)}</b><br><span class="muted" style="font-size:13px">${esc(a.description || '')}</span></td><td>${a.kind === 'skill' ? 'סקיל' : 'תבנית'}</td><td>${a.path ? pill('הועלה', 'ok') : pill('עוד לא הועלה', 'warn')}</td><td>${a.published ? '' : pill('מוסתר', 'no')}</td><td><button class="btn btn-k sm" data-a="${a.id}">עריכה</button></td></tr>`).join('') + '</tbody></table></div>' : '<div class="empty">אין קבצים.</div>'}`;
  $('nw').onclick = () => editAsset(null);
  pane().querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => editAsset((data || []).find((x) => x.id === Number(b.dataset.a)))));
}
function editAsset(a) {
  a = a || { title: '', kind: 'skill', description: '', path: null, published: true, sort: 100 };
  modal(`<div class="spread"><h2 style="margin:0">${a.id ? 'עריכת קובץ' : 'קובץ חדש'}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <div class="grid2" style="margin-top:14px"><div class="f"><label for="xt">שם</label><input id="xt" value="${esc(a.title)}"></div><div class="f"><label for="xk">סוג</label><select id="xk"><option value="skill" ${a.kind === 'skill' ? 'selected' : ''}>סקיל</option><option value="template" ${a.kind === 'template' ? 'selected' : ''}>תבנית</option></select></div></div>
    <div class="f"><label for="xd">תיאור</label><input id="xd" value="${esc(a.description || '')}"></div>
    <div class="f"><label for="xf">קובץ ${a.path ? '<small>(קיים: ' + esc(a.path) + ')</small>' : ''}</label><input id="xf" type="file"></div>
    <label class="chk"><input type="checkbox" id="xp" ${a.published ? 'checked' : ''}><span>מוצג לתלמידים</span></label>
    <div class="row"><button class="btn btn-k" id="sv">שמירה</button>${a.id ? '<button class="btn btn-r" id="dl">מחיקה</button>' : ''}</div>`);
  $('mx').onclick = closeModal;
  $('sv').onclick = async () => {
    let path = a.path; const f = $('xf').files[0];
    if (f) { path = 'assets/' + Date.now().toString(36) + '-' + f.name.replace(/[^\w.-]+/g, '_'); const { error } = await sb.storage.from('too').upload(path, f, { upsert: false }); if (error) return toast(errText(error), true); }
    const row = { title: $('xt').value.trim(), kind: $('xk').value, description: $('xd').value.trim(), path, published: $('xp').checked };
    const r = a.id ? await sb.from('too_assets').update(row).eq('id', a.id) : await sb.from('too_assets').insert(row);
    if (r.error) return toast(errText(r.error), true); toast('נשמר.'); closeModal(); assets();
  };
  if ($('dl')) twice($('dl'), async () => { if (a.path) await sb.storage.from('too').remove([a.path]); const { error } = await sb.from('too_assets').delete().eq('id', a.id); if (error) return toast(errText(error), true); toast('נמחק.'); closeModal(); assets(); }, 'לחצו שוב למחיקה');
}

/* ---------- plans ---------- */
async function plans() {
  const { data } = await sb.from('too_plans').select('*').order('sort');
  pane().innerHTML = `<h2 class="t">מסלולים ומחירים</h2><p class="muted">שינוי מחיר כאן משפיע על הרכישות החדשות. המחיר בדף המכירה מתעדכן בבנייה הבאה של האתר.</p>
    <div class="grid2">${(data || []).map((p) => `<div class="card"><div class="spread"><h3>${esc(p.name)}</h3>${p.active ? pill('פעיל', 'ok') : pill('כבוי', 'no')}</div>
      <div class="f"><label>שם</label><input data-k="name" data-p="${p.code}" value="${esc(p.name)}"></div>
      <div class="f"><label>מחיר בשקלים ${p.kind === 'monthly' ? '(לחודש)' : p.kind === 'module' ? '(קורס בודד, תשלום אחד. ריק = עוד לא נמכר)' : '(תשלום אחד)'}</label><input type="number" min="0" data-k="price_ils" data-p="${p.code}" value="${p.price_ils === null || p.price_ils === undefined ? '' : p.price_ils}"></div>
      ${p.kind === 'one_time' ? `<div class="f"><label>חודשי מנוי במתנה</label><input type="number" min="0" data-k="bonus_sub_months" data-p="${p.code}" value="${p.bonus_sub_months}"></div>` : ''}
      <div class="f"><label>מה כלול (שורה לכל סעיף)</label><textarea data-k="perks" data-p="${p.code}">${esc((p.perks || []).join('\n'))}</textarea></div>
      <label class="chk"><input type="checkbox" data-k="active" data-p="${p.code}" ${p.active ? 'checked' : ''}><span>פתוח לרכישה</span></label>
      <button class="btn btn-k sm" data-s="${p.code}">שמירה</button></div>`).join('')}</div>`;
  pane().querySelectorAll('[data-s]').forEach((b) => (b.onclick = async () => {
    const code = b.dataset.s, row = { updated_at: new Date().toISOString() };
    pane().querySelectorAll(`[data-p="${code}"]`).forEach((el) => { const k = el.dataset.k; row[k] = k === 'active' ? el.checked : k === 'perks' ? el.value.split('\n').map((s) => s.trim()).filter(Boolean) : k === 'price_ils' ? (el.value.trim() === '' ? null : Number(el.value)) : k === 'bonus_sub_months' ? Number(el.value) : el.value.trim(); });
    // an empty price is saved as empty (a single course is then not sold); the full course and the monthly plan need a price
    const pl = (data || []).find((x) => x.code === code);
    if (row.price_ils === null && pl && pl.kind !== 'module') return toast('למסלול הזה צריך מחיר.', true);
    const { error } = await sb.from('too_plans').update(row).eq('code', code); toast(error ? errText(error) : 'המסלול עודכן.', !!error);
  }));
}

/* ---------- settings ---------- */
async function settings() {
  const { data } = await sb.from('too_settings').select('*');
  const S = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  pane().innerHTML = `<h2 class="t">הגדרות</h2>
    <div class="vstack" style="max-width:720px">
      <div class="card"><h3>מצב בדיקה</h3><p class="muted" style="margin:0 0 12px">כשמצב בדיקה פעיל, "רכישה" פותחת גישה בלי חיוב, ובראש האתר מופיעה הודעה שהאתר בבדיקה. מכבים אותו רק אחרי שחברת הסליקה מחוברת.</p>
        <label class="chk"><input type="checkbox" id="tm" ${S.test_mode === true ? 'checked' : ''}><span>האתר במצב בדיקה</span></label><button class="btn btn-k sm" id="stm">שמירה</button></div>
      <div class="card"><h3>קבוצת הוואטסאפ</h3><p class="muted" style="margin:0 0 12px">הקישור מוצג רק לתלמידים עם גישה, באזור האישי.</p>
        <div class="f"><input id="wa" dir="ltr" value="${esc(S.whatsapp_link || '')}" placeholder="https://chat.whatsapp.com/..."></div><button class="btn btn-k sm" id="swa">שמירה</button></div>
      <div class="card dk"><h3 style="color:var(--lime)">מה עוד חסר לפני פתיחה</h3><ul style="margin:8px 0 0;padding-inline-start:1.2em;line-height:1.9"><li>כתובת לאתר (דומיין) ושרת</li><li>חברת סליקה לתשלום ולמנוי החודשי</li><li>שליחת מיילים מהאתר (אישור הרשמה ואיפוס סיסמה)</li><li>הקלטת הסרטונים של השיעורים</li><li>בדיקה של תנאי השימוש, מדיניות הפרטיות והצהרת הנגישות</li></ul></div>
    </div>`;
  const put = async (key, value) => { const { error } = await sb.from('too_settings').upsert({ key, value, public: key === 'test_mode', updated_at: new Date().toISOString() }); toast(error ? errText(error) : 'נשמר.', !!error); };
  $('stm').onclick = () => put('test_mode', $('tm').checked);
  $('swa').onclick = () => { const v = $('wa').value.trim(); if (v && !/^https:\/\/(chat\.whatsapp\.com|wa\.me)\//.test(v)) return toast('הקישור צריך להיות קישור הזמנה לוואטסאפ.', true); put('whatsapp_link', v); };
}

/* ---------- log ---------- */
async function log() {
  const { data } = await sb.from('too_audit').select('*').order('at', { ascending: false }).limit(300);
  pane().innerHTML = `<h2 class="t">יומן פעולות</h2><p class="muted">כל הרשמה, רכישה ופעולת ניהול נרשמות כאן.</p>${logRows(data || [])}`;
}

/* ---------- live sessions ---------- */
const room = () => 'https://meet.jit.si/TeamOfOne-' + Array.from(crypto.getRandomValues(new Uint8Array(9)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14);
const localInput = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
async function lives() {
  const evs = await rpc('too_admin_events');
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">שידורים חיים</h2><p class="muted" style="margin:0">יוצרים שידור, והקישור נפתח לחברים רבע שעה לפני ההתחלה. אחרי השידור מדביקים קישור להקלטה, וההקלטה נכנסת אוטומטית לספריית החברים.</p></div><button class="btn btn-k sm" id="evnew">שידור חדש</button></div>
    <div class="tbl2"><table><thead><tr><th>מתי</th><th>נושא</th><th>למי</th><th>הקלטה</th><th></th></tr></thead><tbody>
    ${evs.length ? evs.map((e) => `<tr><td>${esc(new Date(e.starts_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' }))}</td><td>${esc(e.title)}${e.published ? '' : ' ' + pill('טיוטה', 'warn')}</td><td>${e.audience === 'public' ? pill('פתוח לכולם', 'l') : pill('חברים', 'k')}</td><td>${e.recording_url ? pill('יש', 'ok') : '-'}</td><td><button class="btn btn-w sm" data-ed="${e.id}">עריכה</button></td></tr>`).join('') : '<tr><td colspan="5" class="muted">עדיין אין שידורים.</td></tr>'}
    </tbody></table></div>`;
  $('evnew').onclick = () => evForm({ title: '', description: '', starts_at: new Date(Date.now() + 7 * 864e5).setHours(20, 0, 0, 0), duration_min: 60, audience: 'members', room: room(), recording_url: '', published: true });
  pane().querySelectorAll('[data-ed]').forEach((b) => b.onclick = () => evForm(evs.find((e) => e.id === Number(b.dataset.ed))));
}
function evForm(e) {
  modal(`<h2 style="margin-top:0">${e.id ? 'עריכת שידור' : 'שידור חדש'}</h2>
    <div class="f"><label for="et">נושא</label><input id="et" maxlength="160" value="${esc(e.title)}"></div>
    <div class="f"><label for="ed">תיאור קצר</label><textarea id="ed" maxlength="3000">${esc(e.description || '')}</textarea></div>
    <div class="row"><div class="f"><label for="es">מתי (שעון ישראל)</label><input id="es" type="datetime-local" value="${localInput(e.starts_at)}"></div><div class="f"><label for="eu">משך בדקות</label><input id="eu" type="number" min="10" max="300" value="${e.duration_min}"></div></div>
    <div class="f"><label for="ea">למי</label><select id="ea"><option value="members" ${e.audience === 'members' ? 'selected' : ''}>חברי הקורס והמנוי</option><option value="public" ${e.audience === 'public' ? 'selected' : ''}>פתוח לכל מי שנרשם (שידור חינמי)</option></select></div>
    <div class="f"><label for="er">קישור לחדר השידור</label><input id="er" dir="ltr" value="${esc(e.room || '')}"><span class="muted" style="font-size:13px">נוצר חדר חינמי אוטומטית. אפשר להדביק במקומו קישור של זום או של שידור ביוטיוב.</span></div>
    <div class="f"><label for="ev">קישור להקלטה (אחרי השידור)</label><input id="ev" dir="ltr" value="${esc(e.recording_url || '')}"></div>
    <label class="row" style="gap:8px"><input type="checkbox" id="ep" ${e.published ? 'checked' : ''}> מפורסם באתר</label>
    <div class="spread" style="margin-top:14px">${e.id ? '<button class="btn btn-r sm" id="edel">מחיקה</button>' : '<span></span>'}<button class="btn btn-k" id="esave">שמירה</button></div>`);
  $('esave').onclick = async () => {
    const row = { title: $('et').value.trim(), description: $('ed').value.trim() || null, starts_at: new Date($('es').value).toISOString(), duration_min: Number($('eu').value) || 60, audience: $('ea').value, room: $('er').value.trim() || null, recording_url: $('ev').value.trim() || null, published: $('ep').checked };
    if (!row.title) return toast('חסר נושא.', true);
    const { error } = e.id ? await sb.from('too_events').update(row).eq('id', e.id) : await sb.from('too_events').insert(row);
    if (error) return toast(errText(error), true);
    closeModal(); toast('נשמר.'); lives();
  };
  if (e.id) twice($('edel'), async () => { const { error } = await sb.from('too_events').delete().eq('id', e.id); if (error) return toast(errText(error), true); closeModal(); lives(); });
}

/* ---------- community moderation ---------- */
// Community moderation: posts and comments, newest first. Hide/unhide, pin and delete (a delete asks for a second tap).
// Deleting a post removes its comments and likes too (the database does it). RLS lets only admins do this to others.
let commTab = 'posts';
async function community() {
  const [{ data: posts, error }, { data: cms, error: e2 }] = await Promise.all([
    sb.from('too_posts').select('id,user_id,author_name,kind,title,body,pinned,hidden,created_at').order('created_at', { ascending: false }).limit(150),
    sb.from('too_comments').select('id,post_id,author_name,body,hidden,created_at').order('created_at', { ascending: false }).limit(200)]);
  if (error || e2) throw error || e2;
  const KIND = { post: 'שיתוף', question: 'שאלה', win: 'הצלחה', announce: 'הודעה מהצוות' };
  const byPost = {}; (cms || []).forEach((c) => { byPost[c.post_id] = (byPost[c.post_id] || 0) + 1; });
  const pt = (id) => { const p = posts.find((x) => x.id === id); return p ? (p.title || String(p.body).slice(0, 50)) : 'פוסט #' + id; };
  const cut = (t, n) => { t = String(t || ''); return t.length > n ? t.slice(0, n) + '...' : t; };
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">קהילה</h2><p class="muted" style="margin:0">ניהול הפוסטים והתגובות: הסתרה, החזרה, נעיצה ומחיקה. מחיקה של פוסט מוחקת גם את התגובות והלייקים שלו.</p></div><a class="btn btn-k sm" href="${BASE}ezor-ishi/kehila/">לדף הקהילה</a></div>
    <div class="grid4" style="margin-bottom:14px">
      <div class="kp"><b>${posts.length}</b><span>פוסטים</span></div><div class="kp"><b>${(cms || []).length}</b><span>תגובות</span></div>
      <div class="kp"><b>${posts.filter((p) => p.hidden).length + (cms || []).filter((c) => c.hidden).length}</b><span>מוסתרים</span></div><div class="kp"><b>${posts.filter((p) => p.pinned).length}</b><span>נעוצים</span></div>
    </div>
    <div class="card" style="margin-bottom:14px" id="spotc"></div>
    <div class="tabs2" role="tablist" aria-label="פוסטים או תגובות" style="margin-bottom:12px"><button role="tab" data-ct="posts" aria-selected="${commTab === 'posts'}">פוסטים (${posts.length})</button><button role="tab" data-ct="comments" aria-selected="${commTab === 'comments'}">תגובות (${(cms || []).length})</button></div>
    ${commTab === 'posts' ? `<div class="tbl2"><table><thead><tr><th>מתי</th><th>מי</th><th>סוג</th><th>פוסט</th><th>תגובות</th><th>פעולות</th></tr></thead><tbody>
      ${posts.length ? posts.map((p) => `<tr><td>${fmtDate(p.created_at)}</td><td>${esc(p.author_name || '')}</td><td>${pill(KIND[p.kind] || p.kind)}</td><td style="min-width:220px">${p.pinned ? '📌 ' : ''}${p.hidden ? pill('מוסתר', 'no') + ' ' : ''}<b>${esc(p.title || '')}</b> ${esc(cut(p.body, 140))}</td><td>${byPost[p.id] || 0}</td>
        <td><div class="row" style="flex-wrap:nowrap;gap:6px"><button class="btn btn-w sm" data-h="${p.id}">${p.hidden ? 'החזרה' : 'הסתרה'}</button><button class="btn btn-w sm" data-p="${p.id}">${p.pinned ? 'ביטול נעיצה' : 'נעיצה'}</button>${p.user_id ? `<button class="btn btn-k sm" data-sp="${p.id}">לזרקור</button>` : ''}<button class="btn btn-r sm" data-d="${p.id}">מחיקה</button></div></td></tr>`).join('') : '<tr><td colspan="6" class="muted">עדיין אין פוסטים.</td></tr>'}
      </tbody></table></div>`
    : `<div class="tbl2"><table><thead><tr><th>מתי</th><th>מי</th><th>תגובה</th><th>על הפוסט</th><th>פעולות</th></tr></thead><tbody>
      ${(cms || []).length ? cms.map((c) => `<tr><td>${fmtDate(c.created_at)}</td><td>${esc(c.author_name || '')}</td><td style="min-width:200px">${c.hidden ? pill('מוסתר', 'no') + ' ' : ''}${esc(cut(c.body, 160))}</td><td class="muted">${esc(cut(pt(c.post_id), 60))}</td>
        <td><div class="row" style="flex-wrap:nowrap;gap:6px"><button class="btn btn-w sm" data-ch="${c.id}">${c.hidden ? 'החזרה' : 'הסתרה'}</button><button class="btn btn-r sm" data-cd="${c.id}">מחיקה</button></div></td></tr>`).join('') : '<tr><td colspan="5" class="muted">עדיין אין תגובות.</td></tr>'}
      </tbody></table></div>`}`;
  const q = (sel) => pane().querySelectorAll(sel);
  q('[data-ct]').forEach((b) => b.onclick = () => { commTab = b.dataset.ct; community(); });
  const act = async (pr, ok) => { const { data, error } = await pr; if (error || (Array.isArray(data) && !data.length)) return toast(error ? errText(error) : 'הפעולה לא בוצעה. רעננו ונסו שוב.', true); if (ok) toast(ok); community(); };
  q('[data-h]').forEach((b) => b.onclick = () => { const p = posts.find((x) => x.id === Number(b.dataset.h)); act(sb.from('too_posts').update({ hidden: !p.hidden }).eq('id', p.id).select('id'), p.hidden ? 'הפוסט חזר לפיד.' : 'הפוסט הוסתר.'); });
  q('[data-p]').forEach((b) => b.onclick = () => { const p = posts.find((x) => x.id === Number(b.dataset.p)); act(sb.from('too_posts').update({ pinned: !p.pinned }).eq('id', p.id).select('id')); });
  q('[data-d]').forEach((b) => twice(b, () => act(sb.from('too_posts').delete().eq('id', Number(b.dataset.d)).select('id'), 'הפוסט נמחק.'), 'בטוח? לחצו שוב'));
  q('[data-ch]').forEach((b) => b.onclick = () => { const c = cms.find((x) => x.id === Number(b.dataset.ch)); act(sb.from('too_comments').update({ hidden: !c.hidden }).eq('id', c.id).select('id'), c.hidden ? 'התגובה חזרה.' : 'התגובה הוסתרה.'); });
  q('[data-cd]').forEach((b) => twice(b, () => act(sb.from('too_comments').delete().eq('id', Number(b.dataset.cd)).select('id'), 'התגובה נמחקה.'), 'בטוח? לחצו שוב'));
  q('[data-sp]').forEach((b) => b.onclick = () => { const p = posts.find((x) => x.id === Number(b.dataset.sp)); spotForm({ name: p.author_name || '', body: (p.title ? p.title + '. ' : '') + String(p.body).slice(0, 600), post_id: p.id }); });
  spotlights();
}

/* ---------- member spotlight (community) ---------- */
async function spotlights() {
  const el = $('spotc'); if (!el) return;
  const { data } = await sb.from('too_spotlight').select('*').order('week_start', { ascending: false }).order('id', { ascending: false }).limit(6);
  el.innerHTML = `<div class="spread"><div><h3>חבר בזרקור</h3><p class="muted" style="margin:0;font-size:14px">החבר האחרון שמסומן כאן מופיע לכל החברים בעמוד "השבוע בצוות". לחצו "לזרקור" ליד פוסט הצלחה, או כתבו בעצמכם.</p></div><button class="btn btn-k sm" id="spnew">כתיבה חדשה</button></div>
    ${(data || []).length ? '<div class="tbl2" style="margin-top:10px"><table><thead><tr><th>שבוע</th><th>שם</th><th>טקסט</th><th></th></tr></thead><tbody>' + data.map((s) => `<tr><td>${fmtDate(s.week_start)}</td><td>${esc(s.name)} ${s.published ? '' : pill('מוסתר', 'no')}</td><td style="font-size:14px">${esc(String(s.body).slice(0, 160))}</td><td class="row"><button class="btn btn-w sm" data-sph="${s.id}">${s.published ? 'הסתרה' : 'החזרה'}</button><button class="btn btn-r sm" data-spd="${s.id}">מחיקה</button></td></tr>`).join('') + '</tbody></table></div>' : '<p class="muted" style="margin:10px 0 0">עוד אין.</p>'}`;
  $('spnew').onclick = () => spotForm({ name: '', body: '' });
  el.querySelectorAll('[data-sph]').forEach((b) => b.onclick = async () => { const s = data.find((x) => x.id === Number(b.dataset.sph)); const { error } = await sb.from('too_spotlight').update({ published: !s.published }).eq('id', s.id); if (error) return toast(errText(error), true); spotlights(); });
  el.querySelectorAll('[data-spd]').forEach((b) => twice(b, async () => { const { error } = await sb.from('too_spotlight').delete().eq('id', Number(b.dataset.spd)); if (error) return toast(errText(error), true); spotlights(); }));
}
function spotForm(s) {
  modal(`<h2 style="margin-top:0">חבר בזרקור</h2><p class="muted" style="margin:0 0 12px;font-size:14px">כדאי לבקש מהחבר אישור לפני שמבליטים אותו. בלי פרטים של לקוחות.</p>
    <div class="f"><label for="spn">שם שיוצג</label><input id="spn" maxlength="80" value="${esc(s.name)}"></div>
    <div class="f"><label for="spb">מה הוא בנה או השיג</label><textarea id="spb" maxlength="1200">${esc(s.body)}</textarea></div>
    <div class="row"><button class="btn btn-k" id="sps">פרסום בזרקור</button><button class="btn btn-w" id="spx">ביטול</button></div>`);
  $('spx').onclick = closeModal;
  $('sps').onclick = async () => {
    const row = { name: $('spn').value.trim(), body: $('spb').value.trim(), post_id: s.post_id || null, published: true };
    if (!row.name || row.body.length < 2) return toast('חסרים שם וטקסט.', true);
    const { error } = await sb.from('too_spotlight').insert(row);
    if (error) return toast(errText(error), true);
    closeModal(); toast('פורסם בזרקור.'); spotlights();
  };
}

/* ---------- retention dashboard ---------- */
const RACT = { cancel: 'ביטול', pause: 'עצירה לחודש', resume: 'חזרה' };
const MAILK = { inactive7: 'שבוע בלי כניסה', recap25: 'סיכום החודש', renew_value: 'לפני חידוש', weekly_digest: 'מה חדש השבוע', pause_resume: 'סוף העצירה' };
const MAILS = { logged: ['נרשם, לא נשלח', 'warn'], queued: ['ממתין לשליחה', 'k'], sent: ['נשלח', 'ok'], failed: ['נכשל', 'no'], skipped: ['דולג', ''] };
async function retention() {
  const r = await rpc('too_ret_admin');
  const days = (d) => d ? Math.floor((Date.now() - new Date(d)) / 864e5) : null;
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">שימור מנויים</h2><p class="muted" style="margin:0">מי פעיל, מי בסיכון לעזוב, ולמה אנשים מבטלים. "בסיכון": יש גישה, ולא עשו כלום 7 ימים או יותר.</p></div><button class="btn btn-w sm" id="rrun">הרצת הבדיקה היומית עכשיו</button></div>
    <div class="grid4" style="margin-bottom:14px">
      <div class="kp dk"><b>${r.active}</b><span>חברים עם גישה</span></div>
      <div class="kp"><b>${r.active7}</b><span>פעילים ב־7 הימים האחרונים</span></div>
      <div class="kp"><b>${r.at_risk}</b><span>בסיכון (7 ימים בלי פעילות)</span></div>
      <div class="kp"><b>${r.renewing}</b><span>מנויים שמתחדשים</span></div>
      <div class="kp"><b>${r.ending}</b><span>מנויים שלא יתחדשו (ביטלו או בהפסקה)</span></div>
      <div class="kp"><b>${r.churned30}</b><span>עזבו ב־30 הימים האחרונים (${r.churn_rate}%)</span></div>
      <div class="kp"><b>${r.paused}</b><span>בהפסקה של חודש</span></div>
      <div class="kp"><b>${r.onboarded}</b><span>מילאו את שאלון 30 הימים · ${r.hours_total} שעות נחסכו בסך הכל</span></div>
    </div>
    <div class="grid2" style="margin-bottom:14px">
      <div class="card"><h3>למה מבטלים ועוצרים (90 יום)</h3>${r.reasons.length ? '<div style="display:grid;gap:6px;margin-top:8px">' + r.reasons.map((x) => `<div class="spread" style="font-size:14.5px"><span>${RACT[x.action] || x.action} · ${esc(REASONS[x.reason] || (x.reason === 'none' ? 'בלי סיבה' : x.reason))}</span><b>${x.n}</b></div>`).join('') + '</div>' : '<p class="muted" style="margin:0">עוד אין ביטולים.</p>'}</div>
      <div class="card"><h3>מה כתבו בביטול</h3>${r.notes.length ? '<div style="display:grid;gap:8px;margin-top:8px;max-height:260px;overflow:auto">' + r.notes.map((n) => `<div style="background:var(--paper);border-radius:10px;padding:8px 10px;font-size:14px"><span class="muted">${fmtDate(n.at)} · ${RACT[n.action] || ''}${n.reason ? ' · ' + esc(REASONS[n.reason] || n.reason) : ''}</span><br>${esc(n.note)}</div>`).join('') + '</div>' : '<p class="muted" style="margin:0">עוד אין הערות.</p>'}</div>
    </div>
    <div class="card" style="margin-bottom:14px"><div class="spread"><h3>מיילים אוטומטיים ב־30 הימים האחרונים</h3>${r.mail_ready ? pill('השליחה פעילה', 'ok') : pill('השליחה כבויה: רק נרשם מה היה נשלח', 'warn')}</div>
      ${r.mail.length ? '<div class="row" style="margin-top:8px">' + r.mail.map((m) => pill(`${MAILK[m.kind] || m.kind}: ${m.n} (${(MAILS[m.status] || [m.status])[0]})`, (MAILS[m.status] || [])[1])).join(' ') + '</div>' : '<p class="muted" style="margin:6px 0 0">עוד לא נרשם אף מייל.</p>'}</div>
    <div class="row" style="margin-bottom:12px" id="rf">${[['risk', 'בסיכון'], ['all', 'כולם'], ['paused', 'בהפסקה'], ['ending', 'לא יתחדשו'], ['new', 'לא מילאו שאלון']].map(([k, t], i) => `<button class="btn ${i ? 'btn-w' : 'btn-k'} sm" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="rt"></div>`;
  let f = 'risk';
  const draw = () => {
    const rows = r.members.filter((m) => f === 'all' || (f === 'risk' && m.access && (days(m.last_act) === null || days(m.last_act) >= 7)) || (f === 'paused' && m.paused) || (f === 'ending' && m.sub_ends && !m.sub_renew) || (f === 'new' && m.access && !m.onboarded));
    $('rt').innerHTML = rows.length ? '<div class="tbl2" tabindex="0" role="region" aria-label="רשימת החברים"><table><thead><tr><th>שם</th><th>מייל</th><th>פעילות אחרונה</th><th>מנוי</th><th>שיעורים</th><th>מסלול</th><th>שעות שנחסכו</th><th>רצף</th><th>תגים</th></tr></thead><tbody>' + rows.map((m) => `<tr>
      <td><b>${esc(m.name || '')}</b></td><td dir="ltr" style="text-align:right">${esc(m.email || '')}</td>
      <td>${m.last_act ? fmtDate(m.last_act) + ' ' + (days(m.last_act) >= 7 ? pill('לפני ' + days(m.last_act) + ' ימים', 'no') : '') : pill('אף פעם', 'no')}</td>
      <td>${m.course ? pill('קורס', 'ok') + ' ' : ''}${m.paused ? pill('בהפסקה', 'warn') : m.sub_ends ? pill((m.sub_renew ? 'מתחדש ' : 'נגמר ') + fmtDate(m.sub_ends), m.sub_renew ? 'k' : 'warn') : ''}${!m.access && !m.paused ? pill('אין גישה', 'no') : ''}</td>
      <td>${m.lessons}</td><td>${m.onboarded ? m.path + '/30' : '-'}</td><td>${Math.round(m.minutes / 6) / 10}</td><td>${m.streak}</td><td>${m.badges}</td></tr>`).join('') + '</tbody></table></div>' : '<div class="empty">אין חברים ברשימה הזאת.</div>';
  };
  $('rf').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; $('rf').querySelectorAll('button').forEach((x) => (x.className = 'btn sm ' + (x === b ? 'btn-k' : 'btn-w'))); draw(); };
  $('rrun').onclick = async () => { const x = await rpc('too_ret_admin_run'); toast(`הבדיקה רצה: ${x.mails} מיילים נרשמו, ${x.threads} שרשורי אתגר נפתחו.`); retention(); };
  draw();
}

/* ---------- weekly drops ("השבוע בצוות") ---------- */
async function drops() {
  const { data, error } = await sb.from('too_drops').select('*').order('publish_at', { ascending: false });
  if (error) throw error;
  const now = Date.now();
  const ahead = (data || []).filter((d) => d.published && new Date(d.publish_at) > now);
  const in30 = ahead.filter((d) => new Date(d.publish_at) <= now + 30 * 864e5).length;
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">השבוע בצוות</h2><p class="muted" style="margin:0">פריט חדש לחברים כל שבוע. פריט עם תאריך עתידי מופיע לחברים רק בתאריך הזה, ועד אז הם רואים רק את הכותרת והתקציר ברשימת "בחודש הבא". פריט עם אתגר פותח לבד שרשור נעוץ בקהילה.</p></div><button class="btn btn-k" id="dnew">פריט חדש</button></div>
    ${in30 < 4 ? `<div class="card" style="margin-bottom:14px;border-color:#F2B8B5" role="status"><b>שימו לב:</b> מתוזמנים רק ${in30} פריטים ל־30 הימים הקרובים. כדי שתמיד יהיה מה לחכות לו, כדאי שיהיו לפחות 4.</div>` : ''}
    <div class="tbl2"><table><thead><tr><th>עולה ב</th><th>סוג</th><th>כותרת</th><th>מצב</th><th></th></tr></thead><tbody>
    ${(data || []).map((d) => { const fut = new Date(d.publish_at) > now; return `<tr><td>${new Date(d.publish_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'short', day: 'numeric', month: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' })}</td><td>${esc(DKIND[d.kind] || d.kind)}</td><td><b>${esc(d.title)}</b><br><span class="muted" style="font-size:13px">${esc(d.teaser)}</span></td><td>${!d.published ? pill('טיוטה', 'warn') : fut ? pill('מתוזמן', 'k') : pill('באוויר', 'ok')} ${d.thread_id ? pill('שרשור בקהילה', 'l') : ''}</td><td><button class="btn btn-k sm" data-e="${d.id}">עריכה</button></td></tr>`; }).join('') || '<tr><td colspan="5" class="muted">עוד אין פריטים.</td></tr>'}
    </tbody></table></div>`;
  const last = (data || [])[0];
  $('dnew').onclick = () => { const d = new Date(last ? new Date(last.publish_at).getTime() + 7 * 864e5 : Date.now()); if (!last) { d.setDate(d.getDate() + ((7 - d.getDay()) % 7)); d.setHours(7, 0, 0, 0); } editDrop({ publish_at: d.toISOString(), kind: 'guide', title: '', teaser: '', body_md: '', challenge: '', minutes: 15, published: true }); };
  pane().querySelectorAll('[data-e]').forEach((b) => (b.onclick = () => editDrop(data.find((x) => x.id === Number(b.dataset.e)))));
}
function editDrop(d) {
  modal(`<div class="spread"><h2 style="margin:0">${d.id ? 'עריכת פריט' : 'פריט חדש'}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <div class="grid2" style="margin-top:14px">
      <div class="f"><label for="dp">מתי עולה (שעון ישראל)</label><input id="dp" type="datetime-local" value="${localInput(d.publish_at)}"></div>
      <div class="f"><label for="dk">סוג</label><select id="dk">${Object.entries(DKIND).map(([k, t]) => `<option value="${k}" ${k === d.kind ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
    </div>
    <div class="f"><label for="dt">כותרת</label><input id="dt" maxlength="140" value="${esc(d.title)}"></div>
    <div class="f"><label for="ds">תקציר קצר <small>(מופיע גם ברשימת "בחודש הבא" ובמייל השבועי)</small></label><textarea id="ds" maxlength="300" style="min-height:70px">${esc(d.teaser)}</textarea></div>
    <div class="edgrid"><div class="f"><label for="db">התוכן <small>(## כותרת, - רשימה, **מודגש**, > שורה להעתקה)</small></label><textarea id="db" style="min-height:360px">${esc(d.body_md)}</textarea></div>
      <div class="f"><label>תצוגה מקדימה</label><div class="preview prose" id="dpv"></div></div></div>
    <div class="f"><label for="dc">האתגר של השבוע <small>(לא חובה. אם יש, נפתח לבד שרשור נעוץ בקהילה ביום שהפריט עולה)</small></label><textarea id="dc" maxlength="1500" style="min-height:70px">${esc(d.challenge || '')}</textarea></div>
    <div class="row"><div class="f" style="margin:0"><label for="dm">דקות עבודה</label><input id="dm" type="number" min="1" max="240" value="${d.minutes || ''}" style="width:120px"></div>
      <label class="row" style="gap:8px"><input type="checkbox" id="dpub" ${d.published ? 'checked' : ''}> מוכן לפרסום (בלי סימון זה נשאר טיוטה)</label></div>
    <div class="err" id="derr"></div>
    <div class="spread" style="margin-top:14px">${d.id ? '<button class="btn btn-r sm" id="ddel">מחיקה</button>' : '<span></span>'}<button class="btn btn-k" id="dsave">שמירה</button></div>`);
  $('mx').onclick = closeModal;
  const upd = () => { $('dpv').innerHTML = md($('db').value); }; $('db').oninput = upd; upd();
  $('dsave').onclick = async () => {
    const row = { publish_at: new Date($('dp').value).toISOString(), kind: $('dk').value, title: $('dt').value.trim(), teaser: $('ds').value.trim(), body_md: $('db').value, challenge: $('dc').value.trim() || null, minutes: Number($('dm').value) || null, published: $('dpub').checked, updated_at: new Date().toISOString() };
    if (row.title.length < 2 || row.teaser.length < 2) { $('derr').textContent = 'חסרים כותרת ותקציר.'; return; }
    if (/[\u2013\u2014]/.test(row.title + row.teaser + row.body_md + (row.challenge || ''))) { $('derr').textContent = 'יש בטקסט קו מפריד ארוך. החליפו אותו במקף רגיל או בפסיק.'; return; }
    const { error } = d.id ? await sb.from('too_drops').update(row).eq('id', d.id) : await sb.from('too_drops').insert(row);
    if (error) { $('derr').textContent = errText(error); return; }
    closeModal(); toast('נשמר.'); drops();
  };
  if (d.id) twice($('ddel'), async () => { const { error } = await sb.from('too_drops').delete().eq('id', d.id); if (error) return toast(errText(error), true); closeModal(); drops(); }, 'לחצו שוב למחיקה סופית');
}

/* ---------- automatic emails ---------- */
async function mails() {
  const [{ data: tpls, error }, log, { data: mr }] = await Promise.all([sb.from('too_mail_templates').select('*').order('kind'), rpc('too_ret_admin_mail_log'), sb.from('too_settings').select('value').eq('key', 'mail_ready').maybeSingle()]);
  if (error) throw error;
  const ready = mr?.value === true;
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:12px"><div><h2 class="t">מיילים אוטומטיים</h2><p class="muted" style="margin:0">כל בוקר בודקים מי צריך מייל: שבוע בלי כניסה, סיכום החודש (יום 25), לפני חידוש, מה חדש השבוע (ימי ראשון), וסוף עצירה. כל מייל נשלח פעם אחת לכל אחד.</p></div></div>
    <div class="card ${ready ? '' : 'dk'}" style="margin-bottom:14px" role="status">${ready ? '<b>השליחה פעילה.</b> מיילים חדשים נשלחים בכל שעה.' : '<b style="color:var(--lime)">השליחה כבויה עד ההשקה.</b> <span style="color:#CFCCC4">שום מייל לא נשלח. ברשימה למטה רואים מה היה נשלח. השליחה תתחיל כשההגדרה "מיילים מוכנים" (mail_ready) תופעל ויוגדרו כתובת השולח ומפתח השליחה. מיילים שנרשמו לפני ההפעלה לא יישלחו בדיעבד.</span>'}</div>
    <div class="card" style="margin-bottom:14px"><h3>התבניות</h3><p class="muted" style="font-size:14px;margin:0 0 10px">אפשר לערוך את הנוסח. מילים בסוגריים כפולים, כמו {{first}}, מתמלאות לבד. שורה שהערך שלה ריק לא מופיעה במייל.</p>
      <div class="tbl2"><table><thead><tr><th>מייל</th><th>נושא</th><th>מצב</th><th></th></tr></thead><tbody>${(tpls || []).map((t) => `<tr><td><b>${esc(t.label)}</b></td><td>${esc(t.subject)}</td><td>${t.active ? pill('פעיל', 'ok') : pill('כבוי', 'no')}</td><td class="row"><button class="btn btn-w sm" data-pv="${t.kind}">תצוגה</button><button class="btn btn-k sm" data-et="${t.kind}">עריכה</button></td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h3>מה נרשם (150 אחרונים)</h3>${log.length ? `<div class="tbl2" style="margin-top:8px"><table><thead><tr><th>מתי</th><th>למי</th><th>מייל</th><th>מצב</th><th></th></tr></thead><tbody>${log.map((l) => `<tr><td>${new Date(l.at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</td><td>${esc(l.name || '')}<br><span class="muted" dir="ltr" style="font-size:12.5px">${esc(l.email || '')}</span></td><td>${esc(MAILK[l.kind] || l.kind)}</td><td>${pill((MAILS[l.status] || [l.status])[0], (MAILS[l.status] || [])[1])}</td><td><button class="btn btn-w sm" data-lv="${l.id}">איך זה נראה</button></td></tr>`).join('')}</tbody></table></div>` : '<div class="empty" style="margin-top:8px">עוד לא נרשם אף מייל.</div>'}</div>`;
  const T = Object.fromEntries((tpls || []).map((t) => [t.kind, t]));
  const site = location.origin + BASE;
  const show = (t, vars) => { const m = renderMail(t, vars, site); modal(`<div class="spread"><h2 style="margin:0">נושא: ${esc(m.subject)}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div><iframe title="תצוגה מקדימה של המייל" sandbox="" style="width:100%;height:520px;border:1px solid var(--lineD);border-radius:12px;margin-top:12px;background:#fff" srcdoc="${esc(m.html)}"></iframe>`); $('mx').onclick = closeModal; };
  pane().querySelectorAll('[data-pv]').forEach((b) => (b.onclick = () => show(T[b.dataset.pv], SAMPLE)));
  pane().querySelectorAll('[data-lv]').forEach((b) => (b.onclick = () => { const l = log.find((x) => x.id === Number(b.dataset.lv)); if (T[l.kind]) show(T[l.kind], l.vars || {}); }));
  pane().querySelectorAll('[data-et]').forEach((b) => (b.onclick = () => editTpl(T[b.dataset.et])));
}
function editTpl(t) {
  modal(`<div class="spread"><h2 style="margin:0">עריכת מייל: ${esc(t.label)}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <div class="f" style="margin-top:14px"><label for="ts">נושא</label><input id="ts" maxlength="160" value="${esc(t.subject)}"></div>
    <div class="f"><label for="tb">הטקסט <small>(שורה שמתחילה ב"- " היא רשימה, **מודגש**)</small></label><textarea id="tb" style="min-height:300px">${esc(t.body_md)}</textarea></div>
    <div class="grid2"><div class="f"><label for="tc">טקסט הכפתור</label><input id="tc" value="${esc(t.cta_text || '')}"></div><div class="f"><label for="tp">לאן הכפתור מוביל (כתובת בתוך האתר)</label><input id="tp" dir="ltr" value="${esc(t.cta_path || '')}"></div></div>
    <label class="row" style="gap:8px"><input type="checkbox" id="ta" ${t.active ? 'checked' : ''}> המייל הזה פעיל</label>
    <div class="err" id="terr"></div>
    <div class="row" style="margin-top:14px"><button class="btn btn-k" id="tsave">שמירה</button></div>`);
  $('mx').onclick = closeModal;
  $('tsave').onclick = async () => {
    const row = { subject: $('ts').value.trim(), body_md: $('tb').value, cta_text: $('tc').value.trim() || null, cta_path: $('tp').value.trim().replace(/^\/+/, '') || null, active: $('ta').checked, updated_at: new Date().toISOString() };
    if (/[\u2013\u2014]/.test(row.subject + row.body_md)) { $('terr').textContent = 'יש בטקסט קו מפריד ארוך. החליפו אותו במקף רגיל או בפסיק.'; return; }
    if (row.cta_path && !/^[a-z0-9/_?=&.-]*$/.test(row.cta_path)) { $('terr').textContent = 'הכתובת יכולה לכלול רק אותיות באנגלית, מספרים ו־/ ? = & . -'; return; }
    const { error } = await sb.from('too_mail_templates').update(row).eq('kind', t.kind);
    if (error) { $('terr').textContent = errText(error); return; }
    closeModal(); toast('נשמר.'); mails();
  };
}
