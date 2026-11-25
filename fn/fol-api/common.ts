// Lawyers directory (working name, temporary brand): server helpers for fol-api.
// Independent of any law office: own secrets (FOL_*), own settings (fol_settings), own tables (fol_*).
// Secrets come from the function environment or from app_secrets (service role only). Never printed, never sent to a browser.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

// deno-lint-ignore no-explicit-any
export type Any = any;
const SECRETS: Record<string, string> = {};
export const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
let secretsAt = 0;
export async function loadSecrets() {
  if (Date.now() - secretsAt < 60_000) return;
  const { data } = await admin().from('app_secrets').select('k,v')
    .in('k', ['CRON_SECRET', 'FOL_LINK_SECRET', 'FOL_RESEND_API_KEY', 'FOL_MORNING_API_ID', 'FOL_MORNING_API_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; });
  secretsAt = Date.now();
}
let _admin: Any = null;
export const admin = () => _admin || (_admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } }));
// a fresh public client (for verifying one-time sign-in tokens; never shares a session between requests)
export const pub = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });

// ---- settings (fol_settings) ----
export async function settings(): Promise<Record<string, Any>> {
  const { data } = await admin().from('fol_settings').select('key,value');
  const out: Record<string, Any> = {}; (data || []).forEach((r: Any) => { out[r.key] = r.value; });
  out.test_mode = out.test_mode !== false; // anything but an explicit false is test mode
  return out;
}
export const PREVIEW = 'https://dabullaw-glitch.github.io/dabul-office/folivus/';
export const okDomain = (d: unknown) => typeof d === 'string' && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d);
export function siteBase(launch: Any): string { return launch && okDomain(launch.domain) ? `https://${launch.domain}/` : PREVIEW; }
export const brandName = (S: Any) => (S.brand && typeof S.brand.name === 'string' && S.brand.name) || 'פוליבוס';
// site pages (Hebrew paths, same as sites/folivus/src/config/routes.ts)
export const PAGE = { order: 'הזמנה', portal: 'אזור-משרדים', review: 'כתיבת-חוות-דעת', admin: 'ניהול-האתר', sponsored: 'תוכן-ממומן', firm: 'משרד', court: 'בתי-משפט', tool: 'כלים' };
export const pageUrl = (S: Any, k: keyof typeof PAGE, rest = '') => siteBase(S.launch) + encodeURI(PAGE[k] + '/') + rest;

// ---- CORS: the preview, the launch domain (+www), its Cloudflare Pages project, local development ----
export function corsFor(req: Request, launch: Any) {
  const o = req.headers.get('origin') || '';
  const allow = ['https://dabullaw-glitch.github.io', 'http://localhost:4321', 'http://localhost:4322'];
  if (launch && okDomain(launch.domain)) allow.push(`https://${launch.domain}`, `https://www.${launch.domain}`);
  const pages = launch && typeof launch.pages === 'string' && /^[a-z0-9-]{1,58}$/.test(launch.pages) ? launch.pages : '';
  const okPages = !!pages && new RegExp(`^https://([a-z0-9]+\\.)?${pages}\\.pages\\.dev$`).test(o);
  return {
    'Access-Control-Allow-Origin': allow.includes(o) || okPages ? o : allow[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Vary': 'Origin',
  };
}

// ---- small helpers ----
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const clip = (s: unknown, n = 200) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, n);
export async function sha256(s: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
export function randKey(n = 32) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); }
export function code6() { const a = new Uint32Array(1); crypto.getRandomValues(a); return String(a[0] % 1_000_000).padStart(6, '0'); }
// constant-time compare (for keys, tokens, codes)
export function sameText(a: string, b: string) { if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
export async function hmac(data: string) {
  const secret = env('FOL_LINK_SECRET') || env('CRON_SECRET'); if (!secret) throw new Error('no link secret');
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode('fol-link:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(data)));
  return [...sig].slice(0, 20).map((b) => b.toString(16).padStart(2, '0')).join('');
}
export const ils = (n: number) => (Number(n) || 0).toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₪';
export const heDate = (d: string | Date) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Jerusalem' });
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const okEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e) && e.length <= 120;
export const normPhone = (p: unknown) => String(p ?? '').replace(/[^0-9+]/g, '');
export const okPhone = (p: string) => /^(\+?972|0)[2-9][0-9]{7,8}$/.test(p);
export const emailHash = (e: string) => sha256(e.trim().toLowerCase() + ':fol-email');
export const maskEmail = (e: string) => { const [u, d] = String(e).split('@'); return (u || '').slice(0, 1) + '***@' + (d || ''); };
const FREE_MAIL = /^(gmail\.com|walla\.co\.il|walla\.com|yahoo\.com|hotmail\.com|outlook\.com|live\.com|icloud\.com|me\.com|012\.net\.il|bezeqint\.net|netvision\.net\.il|zahav\.net\.il|aol\.com|proton\.me|protonmail\.com|gmx\.com)$/i;
export function hostOf(url: unknown) { try { return new URL(String(url).startsWith('http') ? String(url) : 'https://' + url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return ''; } }
// the email is on the firm's own website domain (and not a free mailbox)
export function domainMatch(website: unknown, email: string) {
  const h = hostOf(website); const d = String(email).split('@')[1]?.toLowerCase() || '';
  return !!h && !!d && !FREE_MAIL.test(d) && (d === h || d.endsWith('.' + h));
}
export async function ipKey(req: Request) {
  const ip = (req.headers.get('cf-connecting-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0] || 'none').trim();
  return sha256(ip + ':fol:' + new Date().toISOString().slice(0, 10));
}
// rate limit: at most `max` actions of this kind for this key in `win` seconds. Records the attempt.
export async function rate(action: string, key: string, max: number, win = 3600): Promise<boolean> {
  const since = new Date(Date.now() - win * 1000).toISOString();
  const { count } = await admin().from('fol_audit').select('id', { count: 'exact', head: true }).eq('action', 'rl:' + action).eq('key', key).gte('at', since);
  if ((count || 0) >= max) return false;
  await admin().from('fol_audit').insert({ action: 'rl:' + action, key });
  return true;
}
export async function audit(action: string, detail: Any = {}, actor: string | null = null) {
  await admin().from('fol_audit').insert({ action, detail, actor });
}
export async function telegram(S: Any, text: string) {
  if (!(S.notify && S.notify.telegram === true) || S.quiet) return;
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }) }).catch(() => null);
}

// ---- email (Resend, the directory's own key FOL_RESEND_API_KEY and its own sender) ----
// Test mode: real mail ONLY to addresses in fol_settings.mail.test_to; everything else is kept in the outbox
// (fol_mail_log with the html, readable only in the admin page). The sender is set at launch (mail.from).
export function mailReady(mail: Any) { return !!(mail && typeof mail.from === 'string' && /@[a-z0-9.-]+\.[a-z]{2,}>?$/i.test(mail.from.trim())); }
export async function sendMail(S: Any, to: string, m: { subject: string; html: string; template: string }, ref = '', isTest = false): Promise<string> {
  const mail = S.mail || {};
  const lower = String(to || '').trim().toLowerCase();
  if (!okEmail(lower)) return 'bad';
  const testTo: string[] = Array.isArray(mail.test_to) ? mail.test_to.map((x: string) => String(x).toLowerCase()) : [];
  const allowed = !S.test_mode || testTo.includes(lower);
  let status = 'outbox';
  if (allowed && mailReady(mail) && env('FOL_RESEND_API_KEY') && !S.noMail) {
    const body: Record<string, unknown> = { from: mail.from.trim(), to: [lower], subject: m.subject, html: m.html };
    if (typeof mail.reply_to === 'string' && /@/.test(mail.reply_to)) body.reply_to = mail.reply_to.trim();
    const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env('FOL_RESEND_API_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
    status = r && r.ok ? 'sent' : 'failed';
  }
  await admin().from('fol_mail_log').insert({ template: m.template, to_hash: await emailHash(lower), to_masked: maskEmail(lower), subject: m.subject,
    html: S.test_mode ? m.html : null, status, ref: clip(ref, 80), is_test: isTest || S.test_mode });
  return status;
}
// admin notification: email to mail.admin_to (outbox in test mode) + Telegram only if notify.telegram is on
export async function notifyAdmin(S: Any, m: { subject: string; html: string; template: string }, text: string, ref = '', isTest = false) {
  const to: string[] = Array.isArray(S.mail?.admin_to) ? S.mail.admin_to.filter((x: string) => okEmail(String(x))) : [];
  if (!to.length) await admin().from('fol_mail_log').insert({ template: m.template, to_hash: 'none', to_masked: '(no admin address)', subject: m.subject, html: S.test_mode ? m.html : null, status: 'outbox', ref: clip(ref, 80), is_test: isTest || S.test_mode });
  for (const a of to) await sendMail(S, a, m, ref, isTest);
  if (!isTest) await telegram(S, `${brandName(S)}: ${text}`);
}
