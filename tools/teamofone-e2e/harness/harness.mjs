// Local UI harness: serves the built site and fakes the Supabase API, so pages can be checked visually here.
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const DIST = '/home/claude/work/dabul-office/sites/teamofone/dist';
const PFX = '/dabul-office/teamofone/';
export const srv = http.createServer((req, res) => {
  let u = decodeURIComponent(req.url.split('?')[0]);
  if (!u.startsWith(PFX)) { res.writeHead(404); return res.end(); }
  let f = path.join(DIST, u.slice(PFX.length));
  if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end('nf'); }
  const ext = path.extname(f); const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
  res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(4399);
const course = JSON.parse(fs.readFileSync('/home/claude/work/dabul-office/sites/teamofone/src/data/course.json', 'utf8'));
let lid = 0; const modules = [], lessons = [];
course.forEach((m, i) => { modules.push({ id: i + 1, n: m.n, title: m.title, sub: m.sub, outcome: m.outcome, published: true }); m.lessons.forEach((l, j) => lessons.push({ id: ++lid, module_id: i + 1, n: j + 1, title: l[0], summary: l[1], free_preview: l[2], kind: 'lesson', published: true, published_at: '2026-11-20' })); });
const body = fs.readFileSync('/home/claude/work/dabul-office/sites/teamofone/content/l1.md', 'utf8');
export const state = { admin: false, access: true, done: [] };
const user = { id: '00000000-0000-0000-0000-000000000001', email: 'test@example.com', aud: 'authenticated', role: 'authenticated' };
function api(url, method, post) {
  const p = new URL(url).pathname;
  if (p.endsWith('/auth/v1/user')) return user;
  if (p.endsWith('/rpc/too_me')) return { profile: { email: user.email, full_name: 'ישראל ישראלי', phone: '0501234567' }, admin: state.admin, access: state.access, course: state.access, sub_ends: '2027-02-20T00:00:00Z', sub_renew: false, done: state.done, wa: 'https://chat.whatsapp.com/xyz' };
  if (p.endsWith('/rpc/too_admin_stats')) return { revenue_month: 0, revenue_total: 0, refunds_total: 0, test_orders: 1, students: 1, signups_30: 1, course_owners: 1, active_subs: 1, renewing_subs: 0, mrr: 0, by_month: Array.from({ length: 12 }, (_, i) => ({ m: String(i + 1).padStart(2, '0') + '.26', paid: 0, test: i === 10 ? 990 : 0 })), articles: 3, drafts: 0, lessons: 37, with_video: 0 };
  if (p.endsWith('/rpc/too_admin_users')) return [{ id: user.id, email: user.email, full_name: 'ישראל ישראלי', phone: '0501234567', role: 'student', blocked: false, created_at: '2026-11-20', last_seen: '2026-11-20', course: true, sub_ends: '2027-02-20', sub_renew: false, paid: 0, done: 1, access: [{ id: 1, kind: 'course', starts_at: '2026-11-20', ends_at: null, revoked: false, note: 'רכישת הקורס' }] }];
  if (p.endsWith('/rpc/too_admin_orders')) return [{ id: 'o1', email: user.email, name: 'ישראל ישראלי', plan: 'course', amount: 990, status: 'test', provider: 'test', note: 'רכישת בדיקה', created_at: '2026-11-20T09:00:00Z' }];
  if (p.endsWith('/too_modules')) return modules;
  if (p.endsWith('/too_lessons')) return lessons;
  if (p.endsWith('/too_lesson_content')) return url.includes('lesson_id=eq.') ? (url.includes('eq.1') ? { lesson_id: 1, body_md: body, video_url: '', attachments: [] } : null) : [{ lesson_id: 1, video_url: '', body_md: body }];
  if (p.endsWith('/too_assets')) return [{ id: 1, title: 'מאמר לאתר', kind: 'skill', description: 'מחקר וכתיבה', path: null, published: true, sort: 1 }];
  if (p.endsWith('/too_orders')) return [{ id: 'o1', plan_code: 'course', amount_ils: 990, status: 'test', created_at: '2026-11-20' }];
  if (p.endsWith('/too_settings')) return url.includes('key=eq.') ? { value: true } : [{ key: 'test_mode', value: true }, { key: 'whatsapp_link', value: '' }];
  if (p.endsWith('/too_plans')) return url.includes('code=eq.') ? { code: 'course', name: 'הקורס המלא', kind: 'one_time', price_ils: 990, perks: ['10 פרקים', 'סקילים'] } : [{ code: 'course', name: 'הקורס המלא', kind: 'one_time', price_ils: 990, bonus_sub_months: 3, perks: ['א'], active: true }, { code: 'monthly', name: 'מנוי חודשי', kind: 'monthly', price_ils: 149, bonus_sub_months: 0, perks: ['ב'], active: true }];
  if (p.endsWith('/too_articles')) return [];
  if (p.endsWith('/too_audit')) return [];
  if (p.endsWith('/too_progress')) { if (method === 'POST') state.done.push(1); return method === 'DELETE' ? null : []; }
  return [];
}
export async function open({ mobile = false, session = true } = {}) {
  const b = await chromium.launch();
  const c = await b.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { viewport: { width: 1440, height: 900 } });
  await c.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await c.route(/supabase\.co/, async (r) => {
    const req = r.request(); if (req.method() === 'OPTIONS') return r.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    const out = api(req.url(), req.method(), req.postData());
    await r.fulfill({ status: req.method() === 'POST' && !req.url().includes('/rpc/') ? 201 : 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(out) });
  });
  if (session) await c.addInitScript(() => { localStorage.setItem('too-auth', JSON.stringify({ access_token: 'x.eyJzdWIiOiIwMDAwMDAwMC0wMDAwLTAwMDAtMDAwMC0wMDAwMDAwMDAwMDEiLCJleHAiOjQxMDI0NDQ4MDB9.x', token_type: 'bearer', expires_in: 3600, expires_at: 4102444800, refresh_token: 'r', user: { id: '00000000-0000-0000-0000-000000000001', email: 'test@example.com', aud: 'authenticated' } })); });
  const page = await c.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e))); page.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  return { b, page, errs, base: 'http://localhost:4399' + PFX, close: async () => { await b.close(); } };
}
