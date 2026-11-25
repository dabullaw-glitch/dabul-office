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
