// Admin panel (Yakir only): overview and money, students and access, orders, articles, course content, skills, plans, settings, log.
import { sb, BASE, esc, fmtDate, ils, toast, errText } from './sb.js';
import { md, words } from './md.js';
import { CATS } from './articles.js';

const $ = (id) => document.getElementById(id);
const pane = () => $('pane');
const STATUS = { test: ['בדיקה', 'warn'], paid: ['שולם', 'ok'], refunded: ['הוחזר', 'no'], failed: ['נכשל', 'no'], cancelled: ['בוטל', 'no'] };
const PLAN = { course: 'הקורס המלא', monthly: 'מנוי חודשי' };
const ACTIONS = { signup: 'הרשמה', checkout_test: 'רכישת בדיקה', cancel_subscription: 'ביטול חידוש מנוי', admin_grant: 'מתן גישה', admin_revoke: 'ביטול גישה', admin_block: 'חסימה', admin_unblock: 'ביטול חסימה', admin_set_role: 'שינוי הרשאה', admin_refund: 'החזר כספי', admin_record_payment: 'רישום תשלום', article_publish: 'פרסום מאמר', article_save: 'שמירת מאמר', settings: 'שינוי הגדרות' };
let users = [];

function modal(html) { $('mbox').innerHTML = html; $('modal').hidden = false; }
function closeModal() { $('modal').hidden = true; $('mbox').innerHTML = ''; }
function twice(btn, fn, txt = 'לחצו שוב לאישור') { btn.addEventListener('click', () => { if (btn.dataset.sure === '1') return fn(); btn.dataset.sure = '1'; const o = btn.textContent; btn.textContent = txt; setTimeout(() => { btn.dataset.sure = ''; btn.textContent = o; }, 4000); }); }
const pill = (t, c = '') => `<span class="pill ${c}">${esc(t)}</span>`;
async function rpc(name, args) { const { data, error } = await sb.rpc(name, args); if (error) { toast(errText(error), true); throw error; } return data; }

const SECTIONS = [
  ['overview', 'סקירה וכספים', overview], ['students', 'תלמידים והרשאות', students], ['orders', 'הזמנות ותשלומים', orders],
  ['articles', 'מאמרים', articles], ['content', 'תוכן הקורס', content], ['assets', 'סקילים ותבניות', assets],
  ['lives', 'שידורים חיים', lives], ['community', 'קהילה', community], ['plans', 'מסלולים ומחירים', plans], ['settings', 'הגדרות', settings], ['log', 'יומן פעולות', log],
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
  users = await rpc('too_admin_users');
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">תלמידים</h2><p class="muted" style="margin:0">${users.length} נרשמים. לחיצה על "ניהול" פותחת גישות, תשלומים, חסימה והרשאות.</p></div>
    <div class="f" style="margin:0;min-width:240px"><input id="q" placeholder="חיפוש לפי שם, מייל או טלפון"></div></div>
    <div class="row" style="margin-bottom:12px" id="flt">${[['all', 'כולם'], ['course', 'בעלי הקורס'], ['sub', 'מנויים פעילים'], ['none', 'בלי גישה'], ['blocked', 'חסומים']].map(([k, t], i) => `<button class="btn ${i ? 'btn-w' : 'btn-k'} sm" data-f="${k}">${t}</button>`).join('')}</div>
    <div id="ut"></div>`;
  let f = 'all';
  const draw = () => {
    const q = $('q').value.trim().toLowerCase();
    const rows = users.filter((u) => (!q || [u.email, u.full_name, u.phone].join(' ').toLowerCase().includes(q))
      && (f === 'all' || (f === 'course' && u.course) || (f === 'sub' && u.sub_ends) || (f === 'none' && !u.course && !u.sub_ends) || (f === 'blocked' && u.blocked)));
    $('ut').innerHTML = rows.length ? '<div class="tbl2"><table><thead><tr><th>שם</th><th>מייל</th><th>טלפון</th><th>גישה</th><th>שילם</th><th>שיעורים</th><th>הצטרף</th><th>ביקר לאחרונה</th><th></th></tr></thead><tbody>' + rows.map((u) => `<tr>
      <td><b>${esc(u.full_name || '')}</b> ${u.role === 'admin' ? pill('מנהל', 'k') : ''} ${u.blocked ? pill('חסום', 'no') : ''}</td><td dir="ltr" style="text-align:right">${esc(u.email)}</td><td dir="ltr" style="text-align:right">${esc(u.phone || '')}</td>
      <td>${u.course ? pill('קורס', 'ok') : ''} ${u.sub_ends ? pill('מנוי עד ' + fmtDate(u.sub_ends), u.sub_renew ? 'k' : '') : ''} ${!u.course && !u.sub_ends ? pill('אין', 'no') : ''}</td>
      <td>${ils(u.paid)}</td><td>${u.done}</td><td>${fmtDate(u.created_at)}</td><td>${fmtDate(u.last_seen)}</td><td><button class="btn btn-k sm" data-u="${u.id}">ניהול</button></td></tr>`).join('') + '</tbody></table></div>' : '<div class="empty">אין תלמידים שמתאימים לחיפוש.</div>';
  };
  $('q').oninput = draw;
  $('flt').onclick = (e) => { const b = e.target.closest('[data-f]'); if (!b) return; f = b.dataset.f; $('flt').querySelectorAll('button').forEach((x) => (x.className = 'btn sm ' + (x === b ? 'btn-k' : 'btn-w'))); draw(); };
  $('ut').onclick = (e) => { const b = e.target.closest('[data-u]'); if (b) userModal(b.dataset.u); };
  draw();
}
async function userModal(id) {
  const u = users.find((x) => x.id === id); if (!u) return;
  const { data: ords } = await sb.from('too_orders').select('*').eq('user_id', id).order('created_at', { ascending: false });
  modal(`<div class="spread"><h2 style="margin:0">${esc(u.full_name || u.email)}</h2><button class="btn btn-w sm" id="mx">סגירה</button></div>
    <p class="muted" dir="ltr" style="text-align:right;margin:4px 0 16px">${esc(u.email)} ${u.phone ? ' · ' + esc(u.phone) : ''}</p>
    <div class="grid2">
      <div class="card"><h3>גישות</h3>${u.access.length ? '<div style="display:grid;gap:8px">' + u.access.map((a) => `<div class="spread" style="background:var(--paper);border-radius:12px;padding:9px 12px;font-size:14px"><span>${a.kind === 'course' ? 'קורס' : 'מנוי'} · ${fmtDate(a.starts_at)} ${a.ends_at ? 'עד ' + fmtDate(a.ends_at) : 'לתמיד'} ${a.revoked ? pill('בוטל', 'no') : ''}<br><span class="muted" style="font-size:12.5px">${esc(a.note || '')}</span></span>${a.revoked ? '' : `<button class="btn btn-r sm" data-rv="${a.id}">ביטול</button>`}</div>`).join('') + '</div>' : '<p class="muted">אין גישות.</p>'}
        <div class="row" style="margin-top:14px"><button class="btn btn-k sm" id="gc">מתן גישה לקורס</button><select id="gm" style="font:inherit;padding:8px;border-radius:10px"><option value="1">חודש</option><option value="3">3 חודשים</option><option value="6">6 חודשים</option><option value="12">שנה</option></select><button class="btn btn-w sm" id="gs">מתן מנוי</button></div></div>
      <div class="card"><h3>רישום תשלום ידני</h3><p class="muted" style="font-size:13.5px;margin:0 0 10px">למשל אם הלקוח שילם בהעברה או בביט. נרשם כתשלום אמיתי ופותח גישה.</p>
        <div class="f"><label for="pp">מסלול</label><select id="pp"><option value="course">הקורס המלא</option><option value="monthly">מנוי חודשי</option></select></div>
        <div class="f"><label for="pa">סכום בשקלים</label><input id="pa" type="number" min="0" placeholder="ברירת מחדל: מחיר המסלול"></div>
        <div class="f"><label for="pn">הערה</label><input id="pn" placeholder="לדוגמה: שולם בביט"></div>
        <button class="btn btn-k sm" id="rp">רישום התשלום</button></div>
    </div>
    <div class="card" style="margin-top:14px"><h3>הזמנות</h3>${(ords || []).length ? '<div style="display:grid;gap:6px">' + ords.map((o) => `<div class="spread" style="font-size:14px"><span>${fmtDate(o.created_at)} · ${PLAN[o.plan_code] || o.plan_code} · ${ils(o.amount_ils)} ${pill(STATUS[o.status][0], STATUS[o.status][1])}</span>${['paid', 'test'].includes(o.status) ? `<button class="btn btn-r sm" data-rf="${o.id}">החזר וביטול גישה</button>` : ''}</div>`).join('') + '</div>' : '<p class="muted">אין הזמנות.</p>'}</div>
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
  const list = await rpc('too_admin_orders');
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
      <div class="f"><label>מחיר בשקלים ${p.kind === 'monthly' ? '(לחודש)' : '(תשלום אחד)'}</label><input type="number" min="0" data-k="price_ils" data-p="${p.code}" value="${p.price_ils}"></div>
      ${p.kind === 'one_time' ? `<div class="f"><label>חודשי מנוי במתנה</label><input type="number" min="0" data-k="bonus_sub_months" data-p="${p.code}" value="${p.bonus_sub_months}"></div>` : ''}
      <div class="f"><label>מה כלול (שורה לכל סעיף)</label><textarea data-k="perks" data-p="${p.code}">${esc((p.perks || []).join('\n'))}</textarea></div>
      <label class="chk"><input type="checkbox" data-k="active" data-p="${p.code}" ${p.active ? 'checked' : ''}><span>פתוח לרכישה</span></label>
      <button class="btn btn-k sm" data-s="${p.code}">שמירה</button></div>`).join('')}</div>`;
  pane().querySelectorAll('[data-s]').forEach((b) => (b.onclick = async () => {
    const code = b.dataset.s, row = { updated_at: new Date().toISOString() };
    pane().querySelectorAll(`[data-p="${code}"]`).forEach((el) => { const k = el.dataset.k; row[k] = k === 'active' ? el.checked : k === 'perks' ? el.value.split('\n').map((s) => s.trim()).filter(Boolean) : ['price_ils', 'bonus_sub_months'].includes(k) ? Number(el.value) : el.value.trim(); });
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
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">שידורים חיים</h2><p class="muted" style="margin:0">יוצרים שידור, והקישור נפתח לחברים רבע שעה לפני ההתחלה. אחרי השידור מדביקים קישור להקלטה.</p></div><button class="btn btn-k sm" id="evnew">שידור חדש</button></div>
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
async function community() {
  const { data: posts, error } = await sb.from('too_posts').select('id,author_name,kind,title,body,pinned,hidden,created_at').order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  pane().innerHTML = `
    <div class="spread" style="margin-bottom:16px"><div><h2 class="t">קהילה</h2><p class="muted" style="margin:0">100 הפוסטים האחרונים. מסתירים פוסט בעייתי, נועצים הודעה חשובה, או כותבים הודעה מהצוות מתוך דף הקהילה.</p></div><a class="btn btn-k sm" href="${BASE}ezor-ishi/kehila/">לדף הקהילה</a></div>
    <div class="tbl2"><table><thead><tr><th>מתי</th><th>מי</th><th>פוסט</th><th></th></tr></thead><tbody>
    ${posts.length ? posts.map((p) => `<tr><td>${fmtDate(p.created_at)}</td><td>${esc(p.author_name || '')}</td><td>${p.pinned ? '📌 ' : ''}${p.hidden ? pill('מוסתר', 'no') + ' ' : ''}<b>${esc(p.title || '')}</b> ${esc(String(p.body).slice(0, 140))}</td><td class="row"><button class="btn btn-w sm" data-h="${p.id}">${p.hidden ? 'החזרה' : 'הסתרה'}</button><button class="btn btn-w sm" data-p="${p.id}">${p.pinned ? 'ביטול נעיצה' : 'נעיצה'}</button></td></tr>`).join('') : '<tr><td colspan="4" class="muted">עדיין אין פוסטים.</td></tr>'}
    </tbody></table></div>`;
  pane().querySelectorAll('[data-h]').forEach((b) => b.onclick = async () => { const p = posts.find((x) => x.id === Number(b.dataset.h)); const { error } = await sb.from('too_posts').update({ hidden: !p.hidden }).eq('id', p.id); if (error) return toast(errText(error), true); community(); });
  pane().querySelectorAll('[data-p]').forEach((b) => b.onclick = async () => { const p = posts.find((x) => x.id === Number(b.dataset.p)); const { error } = await sb.from('too_posts').update({ pinned: !p.pinned }).eq('id', p.id); if (error) return toast(errText(error), true); community(); });
}
