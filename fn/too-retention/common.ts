// Team of One server helpers (shared by too-pay and too-signup; each function is deployed with its own copy of this file).
// Secrets come from the function environment or from app_secrets (read with the service role, never sent to a browser).
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const SECRETS: Record<string, string> = {};
export const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
let secretsAt = 0;
export async function loadSecrets() {
  if (Date.now() - secretsAt < 60_000) return;
  const { data } = await admin().from('app_secrets').select('k,v')
    .in('k', ['CRON_SECRET', 'RESEND_API_KEY', 'MORNING_API_ID', 'MORNING_API_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; });
  secretsAt = Date.now();
}
// deno-lint-ignore no-explicit-any
let _admin: any = null;
export const admin = () => _admin || (_admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } }));

// ---- settings (too_settings) ----
// deno-lint-ignore no-explicit-any
export async function settings(keys: string[]): Promise<Record<string, any>> {
  const { data } = await admin().from('too_settings').select('key,value').in('key', keys);
  // deno-lint-ignore no-explicit-any
  const out: Record<string, any> = {}; (data || []).forEach((r: any) => { out[r.key] = r.value; }); return out;
}
export const PREVIEW = 'https://dabullaw-glitch.github.io/dabul-office/teamofone/';
const okDomain = (d: unknown) => typeof d === 'string' && /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d);
// The site address used in emails and payment return links: the real domain once Yakir set it in settings 'launch', else the preview.
// deno-lint-ignore no-explicit-any
export function siteBase(launch: any): string { return launch && okDomain(launch.domain) ? `https://${launch.domain}/` : PREVIEW; }

// ---- CORS: only the preview, the launch domain (and its www), the Cloudflare Pages project and local development ----
// deno-lint-ignore no-explicit-any
export function corsFor(req: Request, launch: any) {
  const o = req.headers.get('origin') || '';
  const allow = ['https://dabullaw-glitch.github.io', 'http://localhost:4321', 'http://localhost:4322'];
  if (launch && okDomain(launch.domain)) allow.push(`https://${launch.domain}`, `https://www.${launch.domain}`);
  const pages = launch && typeof launch.pages === 'string' && /^[a-z0-9-]{1,58}$/.test(launch.pages) ? launch.pages : 'teamofone';
  const okPages = new RegExp(`^https://([a-z0-9]+\\.)?${pages}\\.pages\\.dev$`).test(o);
  return {
    'Access-Control-Allow-Origin': allow.includes(o) || okPages ? o : allow[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type, apikey, authorization, x-client-info',
    'Vary': 'Origin',
  };
}

// ---- small helpers ----
export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const clip = (s: unknown, n = 200) => String(s ?? '').trim().slice(0, n);
export async function sha256(s: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
export function randKey(n = 32) { const a = new Uint8Array(n); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); }
export function sameText(a: string, b: string) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
export const ils = (n: number) => (Number(n) || 0).toLocaleString('he-IL') + ' ₪';
export const heDate = (d: string | Date) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric', timeZone: 'Asia/Jerusalem' });

export async function telegram(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }) }).catch(() => null);
}

// ---- email (Resend). Off until Yakir verified the Team of One domain in Resend and the 'mail' setting has a from address. ----
// The office's own address is never used as the sender for Team of One.
// deno-lint-ignore no-explicit-any
export function mailReady(mail: any) { return !!(mail && typeof mail.from === 'string' && /@[a-z0-9.-]+\.[a-z]{2,}>?$/i.test(mail.from.trim()) && !/dabullaw/i.test(mail.from)); }
// deno-lint-ignore no-explicit-any
export async function sendMail(mail: any, to: string, subject: string, html: string): Promise<boolean> {
  if (!mailReady(mail) || !env('RESEND_API_KEY')) return false;
  const body: Record<string, unknown> = { from: mail.from.trim(), to: [to], subject, html };
  if (typeof mail.reply_to === 'string' && /@/.test(mail.reply_to)) body.reply_to = mail.reply_to.trim();
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  return !!(r && r.ok);
}
