// Shared helpers (a slim copy of the office functions' common.ts: only what "services" uses).
import { createClient } from 'npm:@supabase/supabase-js@2';
const SECRETS: Record<string, string> = {};
export const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
let secretsAt = 0;
export async function loadSecrets() {
  if (Date.now() - secretsAt < 60_000) return;
  const { data } = await admin().from('app_secrets').select('k,v');
  (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; });
  secretsAt = Date.now();
}
// deno-lint-ignore no-explicit-any
let _admin: any = null;
export const admin = () => _admin || (_admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
export const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
export async function telegram(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  return r.ok;
}
