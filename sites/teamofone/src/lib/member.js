// Shared loading for the member area and the lesson page.
import { sb, BASE } from './sb.js';
export async function requireLogin() {
  const { data } = await sb.auth.getSession();
  if (!data.session) { location.replace(BASE + 'knisa/?m=login&next=' + encodeURIComponent(location.pathname + location.search)); return null; }
  return data.session;
}
export async function loadCourse() {
  const [{ data: mods }, { data: les }] = await Promise.all([
    sb.from('too_modules').select('*').order('n'),
    sb.from('too_lessons').select('id,module_id,n,title,summary,duration_min,kind,free_preview,published_at,topic').order('n')]);
  const modules = (mods || []).map((m) => ({ ...m, lessons: (les || []).filter((l) => l.module_id === m.id && l.kind === 'lesson') }));
  const updates = (les || []).filter((l) => l.kind === 'update').sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)));
  const flat = modules.flatMap((m) => m.lessons.map((l) => ({ ...l, m })));
  return { modules, updates, flat };
}
export function logoutBtn(nav) {
  const b = document.createElement('button'); b.textContent = 'יציאה';
  b.onclick = async () => { await sb.auth.signOut(); location.replace(BASE); };
  nav.appendChild(b);
}
// Single courses (too_plans kind 'module'): a buyer owns one course (module) for life; members (course or monthly) have all.
// me = too_me(). Library items (no module) stay members only. The database rules decide; this only shapes the page.
export const ownsModule = (me, moduleId) => !!me && (me.access || (moduleId != null && (me.modules || []).includes(moduleId)));
export const canOpen = (me, l) => !!l && (l.free_preview || (l.module_id == null ? !!(me && me.access) : ownsModule(me, l.module_id)));
// The single-course plans (only active ones are readable), keyed by module id.
export async function modulePlans() {
  const { data } = await sb.from('too_plans').select('code,name,kind,price_ils,module_id,perks').eq('kind', 'module');
  const by = {}; (data || []).forEach((p) => { by[p.module_id] = p; }); return by;
}
export const planLabel = (code, plans) => code === 'course' ? 'הקורס המלא' : code === 'monthly' ? 'מנוי חודשי'
  : /^module-/.test(code || '') ? 'קורס בודד: ' + ((Object.values(plans || {}).find((p) => p.code === code) || {}).name || code.replace('module-', 'מספר ')) : code;

// The member's data (too_me). An account that has no profile row yet (for example an office admin who never went
// through the login page) gets one here, once per browser session, so progress, posts and the details card work
// from the first visit. too_ensure_profile only creates the caller's own row (role student) and changes nothing else.
export async function loadMe() {
  let r = await sb.rpc('too_me');
  if (!r.error && r.data && !r.data.profile) {
    let tried = false; try { tried = sessionStorage.getItem('too-ep') === '1'; sessionStorage.setItem('too-ep', '1'); } catch (e) { /* private mode */ }
    if (!tried) { const e = await sb.rpc('too_ensure_profile'); if (!e.error) r = await sb.rpc('too_me'); }
  }
  return r;
}
// Make sure the profile row exists right before a write that needs it (a retry after a missing-profile error).
export async function ensureProfile() { const { error } = await sb.rpc('too_ensure_profile'); return !error; }

// The five courses as the student sees them: "הקורס המלא" (its chapters are the modules that are not sold alone)
// and each single course (a module that has a single-course plan, or whose title starts with "קורס:").
export const courseName = (t) => String(t || '').replace(/^קורס:\s*/, '');
export const isSingle = (m, plans) => !!(plans && plans[m.id]) || /^קורס:/.test(String(m.title || ''));
export function courseGroups(course, plans) {
  const singles = course.modules.filter((m) => isSingle(m, plans));
  const chapters = course.modules.filter((m) => !isSingle(m, plans));
  const full = { key: 'full', single: false, title: 'הקורס המלא', sub: 'כל הצוות הדיגיטלי, פרק אחרי פרק: מהבסיס ועד מערכת שעובדת כל יום.',
    chapters, lessons: chapters.flatMap((m) => m.lessons), buy: 'kniya/?plan=course', page: null };
  return [full, ...singles.map((m) => ({ key: 'm' + m.id, single: true, module: m, title: courseName(m.title), sub: m.sub || '',
    chapters: [m], lessons: m.lessons, buy: 'kniya/?plan=' + encodeURIComponent((plans && plans[m.id] && plans[m.id].code) || 'module-' + m.id), page: 'ezor-ishi/perek/?id=' + m.id }))];
}
// Which course a lesson belongs to (null for library items).
export const groupOf = (groups, moduleId) => moduleId == null ? null : groups.find((g) => g.chapters.some((m) => m.id === moduleId)) || null;
// Does the student own the whole group? Full course: members. Single course: members or its buyers.
export const ownsGroup = (me, g) => !!me && (g.single ? ownsModule(me, g.module.id) : !!me.access);
