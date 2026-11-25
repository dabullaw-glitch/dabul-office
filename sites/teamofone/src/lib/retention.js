// Retention features for members (25.11.2026): the 30-day path, the weekly drop ("השבוע בצוות"), streaks, badges,
// hours saved, the monthly recap and certificates. The database decides what each member may see (RLS and the
// too_* functions); this file only shapes the pages. Texts: simple Hebrew, no em or en dashes, no "הכי", no promises.
import { sb, BASE, esc, fmtDate } from './sb.js';
import { md } from './md.js';

export const GOALS = {
  leads: { t: 'יותר פניות ולקוחות', s: 'מענה מהיר לכל פנייה, תוכן שמביא חיפושים, ונוכחות בגוגל.', mods: [2, 5, 6, 4, 9] },
  time: { t: 'לחסוך זמן בעבודה השוטפת', s: 'פחות מסמכים מאפס, פחות מעקב ידני, ושגרה שרצה לבד.', mods: [2, 3, 10, 7] },
  content: { t: 'תוכן ושיווק קבועים', s: 'פוסט, מאמר וסרטון בקצב קבוע, בסגנון שלכם.', mods: [5, 7, 8, 6] },
  sales: { t: 'למכור יותר', s: 'הצעות מחיר מהירות, מעקב אחרי לקוחות, ודף נחיתה עם קמפיין קטן.', mods: [2, 3, 4, 9] },
};
export const BIZ = {
  service: 'נותני שירות (שיפוצים, הובלות, ייעוץ, ניקיון)', shop: 'חנות או מכירת מוצרים', freelance: 'פרילנסרים (עיצוב, כתיבה, פיתוח, צילום)',
  clinic: 'קליניקה או טיפולים', creator: 'מאמנים, מרצים ויוצרי תוכן', other: 'משהו אחר',
};
// One concrete first task per business type, shown in the personal plan.
export const BIZ_EXAMPLE = {
  service: 'טיוטת תשובה לפנייה של לקוח שמבקש הצעת מחיר לעבודה.',
  shop: 'תשובה קבועה לשאלות על משלוחים, החזרות ומידות.',
  freelance: 'הצעת מחיר מסודרת לפרויקט מתוך שיחת היכרות.',
  clinic: 'הודעת תזכורת לפני טיפול, עם מה להביא ואיך מבטלים.',
  creator: 'פוסט שבועי מתוך שאלה שקיבלתם מהקהל.',
  other: 'טיוטת תשובה לפנייה חדשה, שאתם רק בודקים ושולחים.',
};
export const HOURS = [[2, 'עד שעתיים'], [4, '3 עד 5 שעות'], [8, '6 עד 10 שעות'], [12, 'יותר מ־10 שעות']];
export const KIND = { skill: 'סקיל מוכן', template: 'תבנית', guide: 'מדריך', news: 'כלים וחדשות', challenge: 'אתגר' };
export const BADGES = [
  { code: 'start', i: '🧭', t: 'התוכנית מוכנה', d: 'מילאתם את שאלון הפתיחה וקיבלתם תוכנית אישית.' },
  { code: 'first_lesson', i: '🎬', t: 'השיעור הראשון', d: 'סיימתם שיעור ראשון בקורס.' },
  { code: 'first_employee', i: '🤖', t: 'העובד הראשון', d: 'העובד הדיגיטלי הראשון שלכם עשה עבודה אמיתית (יום 7 במסלול, או פרק עובד שלם).' },
  { code: 'path_week', i: '🔥', t: 'שבוע במסלול', d: 'סיימתם 7 משימות במסלול 30 הימים.' },
  { code: 'chapter', i: '📘', t: 'פרק שלם', d: 'סיימתם את כל השיעורים בפרק אחד.' },
  { code: 'community', i: '💬', t: 'חלק מהקהילה', d: 'פרסמתם פוסט או תגובה בקהילה.' },
  { code: 'streak4', i: '📅', t: '4 שבועות ברצף', d: 'עשיתם משהו בצוות ארבעה שבועות רצופים.' },
  { code: 'hours10', i: '⏱️', t: '10 שעות שנחסכו', d: 'דיווחתם על 10 שעות עבודה שהעובדים שלכם חסכו.' },
  { code: 'path', i: '🏁', t: '30 הימים הושלמו', d: 'סיימתם את כל המשימות במסלול 30 הימים.' },
  { code: 'extra_course', i: '🎓', t: 'קורס נוסף', d: 'סיימתם אחד מהקורסים הנוספים.' },
  { code: 'course', i: '🏆', t: 'הקורס המלא', d: 'סיימתם את כל עשרת הפרקים של הקורס.' },
];
export const REASONS = {
  no_time: 'אין לי זמן כרגע', temporary: 'הפסקה זמנית (חופש, עומס, מילואים)', price: 'המחיר', not_needed: 'קיבלתי מה שהייתי צריך',
  hard: 'קשה לי ליישם', content: 'התוכן לא מתאים לעסק שלי', tech: 'בעיה טכנית באתר', other: 'סיבה אחרת',
};
const ERR = {
  day_locked: 'היום הזה עוד לא נפתח.', no_access: 'האזור הזה פתוח לחברי הקורס והמנוי.', rate: 'יותר מדי דיווחים השבוע. נסו שוב מחר.',
  bad_input: 'משהו בפרטים לא תקין. בדקו ונסו שוב.', already_paused: 'המנוי כבר בהפסקה.', no_renewing_sub: 'אין מנוי חודשי שמתחדש, אז אין מה לעצור.',
  no_pause: 'המנוי לא בהפסקה.', no_onboarding: 'קודם ממלאים את שאלון הפתיחה.', not_found: 'הפריט לא נמצא.', no_sub: 'אין מנוי פעיל.',
  not_logged_in: 'צריך להיכנס לחשבון קודם.', no_profile: 'לא מצאנו את הפרופיל שלכם. נסו לצאת ולהיכנס שוב.',
};
export const rErr = (e) => ERR[String(e?.message || e || '').replace(/^.*?: /, '')] || 'משהו השתבש. נסו שוב.';

export const hoursOf = (min) => (Math.round((Number(min) || 0) / 6) / 10).toLocaleString('he-IL');
export const ilDate = (d, o = {}) => d ? new Date(d).toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'numeric', ...o }) : '';

export async function retMe() {
  let { data, error } = await sb.rpc('too_ret_me');
  // no profile row yet (first visit): create the caller's own row, then ask again
  if (!error && data && data.profile === false && !(await sb.rpc('too_ensure_profile')).error) ({ data, error } = await sb.rpc('too_ret_me'));
  if (error) throw error;
  return data;
}
// The member's 30 tasks: for each day, the task for their goal if there is one, else the general task. Light pace: core days only.
export function pickTasks(rows, goal, pace) {
  const out = [];
  for (let d = 1; d <= 30; d++) {
    const t = rows.find((r) => r.day === d && r.goal === goal) || rows.find((r) => r.day === d && !r.goal);
    if (t && (pace !== 'light' || t.core)) out.push(t);
  }
  return out;
}
export async function loadTasks() {
  const { data, error } = await sb.from('too_path_tasks').select('*').order('day');
  if (error) throw error;
  return data || [];
}
// Sub navigation shared by the retention pages.
export function subnav(cur) {
  const L = [['30', 'ezor-ishi/30/', '30 הימים הראשונים'], ['week', 'ezor-ishi/hashavua/', 'השבוע בצוות'], ['me', 'ezor-ishi/hitkadmut/', 'ההתקדמות שלי']];
  return `<nav class="rt-tabs" aria-label="אזורי ההתקדמות">${L.map(([k, h, t]) => `<a href="${BASE}${h}"${k === cur ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
}
export const noAccess = () => `<div class="card dk"><h2 style="color:var(--lime)">האזור הזה פתוח לחברי הצוות</h2><p style="margin:0 0 14px;color:#CFCCC4">המסלול של 30 הימים, הפריט השבועי, התגים והסיכום החודשי פתוחים לחברי הקורס והמנוי.</p><a class="btn btn-l sm" href="${BASE}kniya/?plan=monthly">להצטרפות</a></div>`;

// "מה עשיתם החודש": the monthly recap card. big = the full version (progress page); otherwise the short card.
export function recapCard(x, big) {
  const c = x.cycle || {};
  const nb = (c.badges || []).map((code) => BADGES.find((b) => b.code === code)).filter(Boolean);
  const nx = (x.next_drops || []).slice(0, 4);
  const ev = x.next_event;
  return `<section class="card rt-recap" aria-labelledby="rc-h">
    <div class="spread"><h2 id="rc-h">מה עשיתם החודש</h2><span class="pill">${ilDate(c.start)} עד ${ilDate(c.end)}</span></div>
    <div class="rt-nums">
      <div><b>${c.lessons || 0}</b><span>שיעורים</span></div><div><b>${c.path || 0}</b><span>משימות במסלול</span></div>
      <div><b>${hoursOf(c.minutes)}</b><span>שעות שנחסכו</span></div><div><b>${nb.length}</b><span>תגים חדשים</span></div>
    </div>
    ${nb.length ? `<p class="rt-small">התגים של החודש: ${nb.map((b) => `<span class="pill l">${b.i} ${esc(b.t)}</span>`).join(' ')}</p>` : ''}
    ${big || nx.length || ev ? `<h3 style="margin-top:14px">מחכה לכם בחודש הבא</h3>
      ${nx.length ? `<ul class="rt-list">${nx.map((d) => `<li><span class="pill">${esc(KIND[d.kind] || '')}</span> ${esc(d.title)} <span class="muted">· ${ilDate(d.at)}</span></li>`).join('')}</ul>` : '<p class="muted" style="margin:0">פריטים חדשים עולים כל יום ראשון.</p>'}
      ${ev ? `<p style="margin:8px 0 0">המפגש החי הבא: <b>${esc(ev.title)}</b> · ${new Date(ev.starts_at).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem', weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>` : ''}` : ''}
  </section>`;
}

// The strip for the personal area home: today's path task, this week's drop, streak and (on days 20 to 25) the recap.
export async function mountStrip(el) {
  if (!el) return;
  try {
    const x = await retMe();
    if (!x || !x.access) { el.hidden = true; return; }
    const [{ data: drops }, rows] = await Promise.all([sb.from('too_drops').select('id,title,teaser,kind,publish_at').order('publish_at', { ascending: false }).limit(1), x.onboarding ? loadTasks() : Promise.resolve([])]);
    const drop = (drops || [])[0];
    let today = '';
    if (!x.onboarding) today = `<a class="rt-tile dk" href="${BASE}ezor-ishi/30/"><span class="rt-k">30 הימים הראשונים</span><b>שתי דקות של שאלות, ותוכנית אישית לחודש</b><span class="rt-go">מתחילים ←</span></a>`;
    else {
      const tasks = pickTasks(rows, x.onboarding.goal, x.onboarding.pace), done = new Set(x.path_done || []);
      const t = tasks.find((k) => k.day <= x.path_day && !done.has(k.day)) || tasks.find((k) => !done.has(k.day));
      const n = tasks.filter((k) => done.has(k.day)).length;
      today = t ? `<a class="rt-tile dk" href="${BASE}ezor-ishi/30/"><span class="rt-k">${t.day < x.path_day ? 'משימה להשלים · יום ' + t.day : t.day > x.path_day ? 'המשימה הבאה · יום ' + t.day : 'המשימה של היום · יום ' + t.day}</span><b>${esc(t.title)}</b><span class="rt-go">${t.minutes} דקות · ${n} מתוך ${tasks.length} ←</span></a>`
        : `<a class="rt-tile dk" href="${BASE}ezor-ishi/30/"><span class="rt-k">30 הימים הראשונים</span><b>סיימתם את המסלול. כל הכבוד!</b><span class="rt-go">לסיכום ←</span></a>`;
    }
    const week = drop ? `<a class="rt-tile" href="${BASE}ezor-ishi/hashavua/"><span class="rt-k">השבוע בצוות · ${esc(KIND[drop.kind] || '')}</span><b>${esc(drop.title)}</b><span class="rt-go">${(x.drops_done || []).includes(drop.id) ? '✓ השתמשתם' : 'לפריט של השבוע ←'}</span></a>` : '';
    const me = `<a class="rt-tile" href="${BASE}ezor-ishi/hitkadmut/"><span class="rt-k">ההתקדמות שלי</span><b>${x.streak ? `🔥 ${x.streak} ${x.streak === 1 ? 'שבוע' : 'שבועות'} ברצף` : 'הרצף שלכם מתחיל השבוע'}</b><span class="rt-go">${hoursOf(x.minutes_total)} שעות נחסכו · ${(x.badges || []).length} תגים ←</span></a>`;
    const day = x.cycle && x.cycle.day;
    el.innerHTML = `${day >= 20 && day <= 25 ? recapCard(x, false) : ''}<div class="rt-strip">${today}${week}${me}</div>`;
    el.hidden = false;
  } catch { el.hidden = true; }
}
export { md, fmtDate };
