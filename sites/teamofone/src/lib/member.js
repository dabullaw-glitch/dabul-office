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
    sb.from('too_lessons').select('id,module_id,n,title,summary,duration_min,kind,free_preview,published_at').order('n')]);
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
