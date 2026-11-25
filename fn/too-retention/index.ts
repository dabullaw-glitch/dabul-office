// too-retention: sends the Team of One re-engagement emails (25.11.2026).
// The database job public.too_retention_run() (pg_cron, daily) decides WHO gets WHICH mail and writes it to too_mail_log:
//   status 'logged' while too_settings.mail_ready is not true (nothing is sent, the admin panel shows what would be sent),
//   status 'queued' once mail_ready is true. This function only sends 'queued' rows.
//
//  POST ?step=send  (x-cron-secret) -> sends up to 60 queued mails. Does nothing unless mail_ready is true AND the 'mail'
//        setting has a valid from address AND the Resend key exists. Blocked members and members without access are skipped.
//  POST ?step=status (x-cron-secret) -> true/false readiness only (no secret values).
import { loadSecrets, env, admin, settings, siteBase, corsFor, sameText, sendMail, mailReady } from './common.ts';
import { render } from './render.ts';

// deno-lint-ignore no-explicit-any
type Any = any;

async function send(S: Any): Promise<Any[]> {
  if (S.mail_ready !== true) return [200, { skipped: 'mail_ready_off' }];
  if (!mailReady(S.mail) || !env('RESEND_API_KEY')) return [200, { skipped: 'mail_not_configured' }];
  const { data: rows } = await admin().from('too_mail_log').select('id,user_id,kind,vars').eq('status', 'queued').order('created_at').limit(60);
  const { data: tpls } = await admin().from('too_mail_templates').select('*');
  const T: Record<string, Any> = {}; (tpls || []).forEach((t: Any) => { T[t.kind] = t; });
  const site = siteBase(S.launch);
  let sent = 0, skipped = 0, failed = 0;
  for (const r of rows || []) {
    const t = T[r.kind];
    const { data: p } = await admin().from('too_profiles').select('email,blocked').eq('id', r.user_id).maybeSingle();
    const { data: acc } = await admin().rpc('too_has_access', { uid: r.user_id });
    const pauseMail = r.kind === 'pause_resume';
    if (!t || !t.active || !p || !p.email || p.blocked || (!acc && !pauseMail)) {
      await admin().from('too_mail_log').update({ status: 'skipped' }).eq('id', r.id); skipped++; continue;
    }
    const m = render(t, r.vars || {}, site);
    const ok = await sendMail(S.mail, p.email, m.subject, m.html);
    await admin().from('too_mail_log').update({ status: ok ? 'sent' : 'failed', sent_at: ok ? new Date().toISOString() : null }).eq('id', r.id);
    if (ok) sent++; else failed++;
  }
  return [200, { ok: true, sent, skipped, failed }];
}

Deno.serve(async (req) => {
  let S: Any = {};
  try { S = await settings(['mail_ready', 'mail', 'launch']); } catch { /* defaults */ }
  const cors = corsFor(req, S.launch);
  const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return out(405, { error: 'method' });
  try {
    await loadSecrets();
    const sec = req.headers.get('x-cron-secret') || '';
    if (!env('CRON_SECRET') || !sameText(sec, env('CRON_SECRET'))) return out(401, { error: 'auth' });
    const step = new URL(req.url).searchParams.get('step') || '';
    if (step === 'send') { const [s, b] = await send(S); return out(s, b); }
    if (step === 'status') return out(200, { mail_ready: S.mail_ready === true, mail_from_set: mailReady(S.mail), resend_key: !!env('RESEND_API_KEY') });
    return out(404, { error: 'step' });
  } catch (e) { console.error(e); return out(500, { error: 'server' }); }
});
