// Team of One: student signup (Yakir 20.11.2026) and, from 25.11.2026, "forgot password" (launch prep).
// Signup creates a student account, a too_profiles row and an audit line. Never creates or touches office users. Rate limited by IP.
//  - While too_settings.mail.verify_signup is off (now): the account is created already confirmed, as before.
//  - When it is on (launch, after the Team of One domain is verified in Resend): the account waits for the student to click
//    the link in a Hebrew email sent from the Team of One address; password sign-in works only after that.
// POST {action:'forgot', email}: sends a Hebrew "choose a new password" email (Resend, Team of One address) to a student.
//   Always the same answer, so nobody can learn who is registered. Off ('mail_off') until the Team of One address is set.
// The office's Supabase auth email settings are not used or changed here (the project is shared with the office system).
import { loadSecrets, admin, settings, siteBase, corsFor, sendMail, mailReady, sha256 } from './common.ts';
import { tpl } from './mail.ts';

// deno-lint-ignore no-explicit-any
type Any = any;
const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 120;

Deno.serve(async (req) => {
  let S: Any = {};
  try { S = await settings(['launch', 'mail']); } catch { /* defaults */ }
  const cors = corsFor(req, S.launch);
  const j = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return j(405, { error: 'method' });
  let b: Record<string, unknown> = {};
  try { b = await req.json(); } catch { return j(400, { error: 'bad_json' }); }
  const sb = admin();
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const since = new Date(Date.now() - 3600_000).toISOString();
  const email = String(b.email || '').trim().toLowerCase();
  const site = siteBase(S.launch);

  if (b.action === 'forgot') {
    if (!mailReady(S.mail)) return j(400, { error: 'mail_off' });
    if (!okEmail(email)) return j(400, { error: 'email' });
    const { count: byIp } = await sb.from('too_audit').select('id', { count: 'exact', head: true }).eq('action', 'forgot').eq('ip', ip).gte('at', since);
    if ((byIp || 0) >= 6) return j(429, { error: 'rate' });
    const eh = await sha256(email);
    await sb.from('too_audit').insert({ action: 'forgot', detail: { e: eh }, ip });
    const { count: byMail } = await sb.from('too_audit').select('id', { count: 'exact', head: true }).eq('action', 'forgot').eq('detail->>e', eh).gte('at', since);
    if ((byMail || 0) > 3) return j(200, { ok: true });
    const { data: office } = await sb.from('office_users').select('email').ilike('email', email).maybeSingle();
    if (office) return j(200, { ok: true });
    const { data: prof } = await sb.from('too_profiles').select('id,full_name,blocked').eq('email', email).maybeSingle();
    if (!prof || prof.blocked) return j(200, { ok: true });
    await loadSecrets();
    const { data: gl, error } = await sb.auth.admin.generateLink({ type: 'recovery', email, options: { redirectTo: site + 'knisa/?reset=1' } });
    const link = gl?.properties?.action_link;
    if (!error && link) { const m = tpl.reset(prof.full_name || '', link, site); await sendMail(S.mail, email, m.subject, m.html); }
    return j(200, { ok: true });
  }

  const password = String(b.password || '');
  const full_name = String(b.full_name || '').trim().slice(0, 80);
  const phone = String(b.phone || '').trim().slice(0, 20);
  if (!okEmail(email)) return j(400, { error: 'email' });
  if (password.length < 8 || password.length > 72) return j(400, { error: 'password' });
  if (full_name.length < 2) return j(400, { error: 'name' });
  if (b.website) return j(200, { ok: true }); // honeypot

  const { count } = await sb.from('too_audit').select('id', { count: 'exact', head: true }).eq('action', 'signup').eq('ip', ip).gte('at', since);
  if ((count || 0) >= 8) return j(429, { error: 'rate' });

  const { data: office } = await sb.from('office_users').select('email').ilike('email', email).maybeSingle();
  if (office) return j(400, { error: 'exists' });

  const verify = !!(S.mail && S.mail.verify_signup) && mailReady(S.mail);
  let uid = '', link = '';
  if (verify) {
    const { data, error } = await sb.auth.admin.generateLink({ type: 'signup', email, password, options: { data: { app: 'teamofone', full_name }, redirectTo: site + 'knisa/?verified=1' } });
    if (error || !data?.user) { const m = String(error?.message || ''); return j(400, { error: /already|registered|exists/i.test(m) ? 'exists' : 'create' }); }
    uid = data.user.id; link = data.properties?.action_link || '';
  } else {
    const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { app: 'teamofone', full_name } });
    if (error || !data?.user) { const m = String(error?.message || ''); return j(400, { error: /already|registered|exists/i.test(m) ? 'exists' : 'create' }); }
    uid = data.user.id;
  }
  const { error: pe } = await sb.from('too_profiles').insert({ id: uid, email, full_name, phone: phone || null });
  if (pe) { await sb.auth.admin.deleteUser(uid); return j(500, { error: 'profile' }); }
  if (verify) {
    await loadSecrets();
    const m = tpl.verify(full_name, link, site);
    if (!link || !(await sendMail(S.mail, email, m.subject, m.html))) {
      await sb.from('too_profiles').delete().eq('id', uid); await sb.auth.admin.deleteUser(uid);
      return j(500, { error: 'mail' });
    }
  }
  await sb.from('too_audit').insert({ actor: uid, actor_email: email, action: 'signup', detail: { full_name, verify }, ip });
  return j(200, { ok: true, verify });
});
