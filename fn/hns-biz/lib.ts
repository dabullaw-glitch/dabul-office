// Shared helpers of hns-biz (business flows of nws.co.il, חדשות נתניה והשרון). No long or medium dash in any saved text.
// 29.10.2026: gate() (per sender limits, table nws_form_hits) and turnstile() (Cloudflare Turnstile siteverify) for every public form.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
export type Any = any;
export const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
// secrets from the private table app_secrets. NWS_MAIL_FROM (e.g. "חדשות נתניה והשרון <news@nws.co.il>") switches on confirmation
// emails to people who leave an email; it must be a sender on the nws.co.il domain, never the law office domain.
export const S: Record<string, string> = {};
export async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'NWS_TURNSTILE_SECRET', 'RESEND_API_KEY', 'NWS_MAIL_FROM']);
  for (const r of data || []) S[(r as Any).k] = String((r as Any).v ?? '').trim();
}
export const CORS = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET, POST, OPTIONS' };
export const J = (d: unknown, s = 200, extra: Record<string, string> = {}) => new Response(JSON.stringify(d), { status: s, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8', ...extra } });

export const clean = (s: unknown, max = 2000) => String(s ?? '').replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ')
  .replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max);
export const phoneOf = (s: unknown) => {
  let d = String(s ?? '').replace(/[^\d+]/g, '');
  if (d.startsWith('+972')) d = '0' + d.slice(4); else if (d.startsWith('972')) d = '0' + d.slice(3);
  return /^0(?:5\d|7\d|[2-489])\d{7}$/.test(d) ? d : '';
};
export const urlOk = (s: string) => { try { const u = new URL(s); return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : ''; } catch { return ''; } };
export const emailOk = (s: string) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(s) ? s.toLowerCase() : '';
export async function sha(s: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('').slice(0, 32); }
export const ipOf = (req: Request) => req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'none';
export const waLink = (p: string) => /^05\d{8}$/.test(p) ? `https://wa.me/972${p.slice(1)}` : '';

// 29.10.2026 (security hardening, approved by Yakir): per sender and form type, at most 5 submissions an hour (counted when a
// form is really saved) and at most 20 attempts an hour (any request that passed the hidden field, so bots that fail the checks
// are stopped too). Log table nws_form_hits (RLS on, service role only); rows older than 2 days are cleaned up here now and then.
export async function gate(ipHash: string, kind: string): Promise<{ blocked: boolean; id: number | null }> {
  const hourAgo = new Date(Date.now() - 3600e3).toISOString();
  const { data } = await sb.from('nws_form_hits').select('ok').eq('ip_hash', ipHash).eq('kind', kind).gte('at', hourAgo).limit(200);
  const rows = data || [];
  if (rows.filter((r: Any) => r.ok).length >= 5 || rows.length >= 20) return { blocked: true, id: null };
  const { data: ins } = await sb.from('nws_form_hits').insert({ ip_hash: ipHash, kind }).select('id').single();
  if (Math.random() < 0.03) await sb.from('nws_form_hits').delete().lt('at', new Date(Date.now() - 2 * 24 * 3600e3).toISOString());
  return { blocked: false, id: (ins as Any)?.id ?? null };
}
export const gateOk = async (id: number | null) => { if (id) await sb.from('nws_form_hits').update({ ok: true }).eq('id', id); };

// Cloudflare Turnstile (widget "nws.co.il forms", managed mode). Checked only when NWS_TURNSTILE_SECRET is in app_secrets.
// 'ok' | 'missing' (no token: the check in the page did not finish yet) | 'bad'. Each token works once, so the page resets the
// widget after every answer that is not a success.
export async function turnstile(token: unknown, ip: string): Promise<'ok' | 'missing' | 'bad'> {
  if (!S.NWS_TURNSTILE_SECRET) return 'ok';
  const t = String(token || '');
  if (!t) return 'missing';
  const fd = new FormData(); fd.set('secret', S.NWS_TURNSTILE_SECRET); fd.set('response', t.slice(0, 2048)); if (ip !== 'none') fd.set('remoteip', ip);
  const v: Any = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd, signal: AbortSignal.timeout(10000) })
    .then((r) => r.json()).catch(() => ({ success: false }));
  if (!v?.success) return 'bad';
  if (v.hostname && !/(^|\.)nws\.co\.il$/.test(String(v.hostname))) return 'bad';
  return 'ok';
}

export const tg = (method: string, body: Any) => fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/${method}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
}).then((r) => r.json()).catch((e) => ({ ok: false, description: String(e) }));

export async function tgPhoto(bytes: Uint8Array, mime: string, caption: string, replyTo?: number) {
  const fd = new FormData();
  fd.set('chat_id', S.TELEGRAM_CHAT_ID); fd.set('caption', caption.slice(0, 1000));
  if (replyTo) fd.set('reply_to_message_id', String(replyTo));
  fd.set('photo', new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }), 'photo.' + (mime.split('/')[1] || 'jpg'));
  return fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendPhoto`, { method: 'POST', body: fd, signal: AbortSignal.timeout(30000) })
    .then((r) => r.json()).catch((e) => ({ ok: false, description: String(e) }));
}

// Confirmation email to the person who sent a form. Only when NWS_MAIL_FROM (an nws.co.il sender) and RESEND_API_KEY exist.
export const mailReady = () => !!(S.RESEND_API_KEY && S.NWS_MAIL_FROM && /@nws\.co\.il>?$/i.test(S.NWS_MAIL_FROM));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export async function mail(to: string, subject: string, lines: string[]) {
  if (!mailReady() || !to) return false;
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#0E1726">${lines.map((l) => `<p>${esc(l)}</p>`).join('')}`
    + `<p style="color:#5B6676;font-size:13px">חדשות נתניה והשרון, <a href="https://nws.co.il/">nws.co.il</a>. קיבלתם את המייל הזה כי השארתם את הכתובת בטופס באתר.</p></div>`;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${S.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: S.NWS_MAIL_FROM, to: [to], subject, html, text: lines.join('\n\n') }), signal: AbortSignal.timeout(15000) }).catch(() => null);
  return !!r?.ok;
}
