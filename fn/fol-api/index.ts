// fol-api: the commerce and operations server of the lawyers directory (working name, temporary brand). 25.11.2026.
// One edge function, verify_jwt off (it checks sign-in itself). TEST MODE (fol_settings.test_mode) until launch:
// real checkout refuses, the no-charge test purchase works, mail goes only to fol_settings.mail.test_to (else outbox).
//
//  POST {action, ...}                       site actions (see the switch below). Sign-in = "Authorization: Bearer <session>".
//  POST ?step=paid&o=<order>&k=<key>        Morning's server callback (key hashed in the order, constant-time compare).
//  POST ?step=daily      (x-cron-secret)    expiry, renewal reminders 30/7/1/0, removal SLA, website checks, monthly stats.
//  POST ?step=status     (x-cron-secret)    launch readiness (true/false only, never a secret value).
//  POST ?step=sponsored_ready (x-cron-secret) {id,title,body_md}  the content pipeline hands in a sponsored draft.
//  POST ?step=selftest   (x-cron-secret)    test mode only: every flow end to end with throwaway data, then removed.
// CSRF: no cookies are used; every change needs a bearer session, a one-time code, a hashed link token or the cron secret.
import { Any, loadSecrets, env, settings, corsFor, sameText, mailReady } from './common.ts';
import * as F from './flows.ts';
import { selftest } from './selftest.ts';

Deno.serve(async (req) => {
  let S: Any = { test_mode: true };
  try { S = await settings(); } catch { /* defaults: test mode */ }
  const cors = corsFor(req, S.launch);
  const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return out(405, { error: 'method' });
  try {
    await loadSecrets();
    const url = new URL(req.url); const step = url.searchParams.get('step') || '';
    if (step === 'paid') { const [s, b] = await F.paid(url, req, S); return out(s, b); }
    if (step) {
      const sec = req.headers.get('x-cron-secret') || '';
      if (!env('CRON_SECRET') || !sameText(sec, env('CRON_SECRET'))) return out(401, { error: 'auth' });
      if (step === 'daily') { const [s, b] = await F.daily(S); return out(s, b); }
      if (step === 'selftest') { const [s, b] = await selftest(req, S); return out(s, b); }
      if (step === 'sponsored_ready') { const b: Any = await req.json().catch(() => ({})); const [s, r] = await F.sponsoredReady(S, String(b.id || ''), String(b.title || ''), String(b.body_md || '')); return out(s, r); }
      if (step === 'status') return out(200, {
        test_mode: S.test_mode, launch_domain: !!(S.launch && S.launch.domain), mail_from_set: mailReady(S.mail), test_addresses: Array.isArray(S.mail?.test_to) ? S.mail.test_to.length : 0,
        admin_addresses: Array.isArray(S.mail?.admin_to) ? S.mail.admin_to.length : 0, resend_key: !!env('FOL_RESEND_API_KEY'),
        morning_keys: !!(env('FOL_MORNING_API_ID') && env('FOL_MORNING_API_SECRET')), morning_token: !!(await F.morningToken()), link_secret: !!env('FOL_LINK_SECRET'),
        targets: !!(await F.targets(S)),
      });
      return out(404, { error: 'step' });
    }
    const b: Any = await req.json().catch(() => ({}));
    const A: Record<string, () => Promise<F.R>> = {
      quote: () => F.quote(req, b, S),
      checkout: () => F.checkout(req, b, S),
      checkout_test: () => F.checkoutTest(req, b, S),
      order_status: () => F.orderStatus(b),
      renew_info: () => F.renewInfo(b, S),
      login: () => F.login(req, b, S),
      login_verify: () => F.loginVerify(req, b),
      claim_start: () => F.claimStart(req, b, S),
      claim_verify: () => F.claimVerify(req, b, S),
      me: () => F.me(req, S),
      profile_save: () => F.profileSave(req, b, false, S),
      profile_submit: () => F.profileSave(req, b, true, S),
      upload: () => F.upload(req, b, S),
      auto_renew_cancel: () => F.autoRenewCancel(req, b),
      invite_create: () => F.inviteCreate(req, b, S),
      review_start: () => F.reviewStart(req, b, S),
      review_verify: () => F.reviewVerify(req, b, S),
      reply: () => F.reply(req, b),
      removal: () => F.removal(req, b, S),
      removal_verify: () => F.removalVerify(req, b, S),
      sponsored_view: () => F.sponsoredView(b),
      sponsored_decide: () => F.sponsoredDecide(b, S),
      admin: () => F.adminOp(req, b, S),
    };
    const fn = A[String(b.action || '')]; if (!fn) return out(400, { error: 'action' });
    const [s, r] = await fn(); return out(s, r);
  } catch (e) { console.error(e); return out(500, { error: 'server' }); }
});
