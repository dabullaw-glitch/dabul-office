// Shared helpers for the office edge functions.
// The office rules (tasks, messages, automations) are the same JS files the app uses;
// loadEngine() reads them from the website's files.
import { createClient } from 'npm:@supabase/supabase-js@2';

// settings you type in the office app (keys, bot tokens) live in a private table only the server can read
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

// headers for Anthropic calls; a key that is not tied to a workspace also needs the workspace id
export const aiHeaders = (key = env('ANTHROPIC_API_KEY')): Record<string, string> => {
  const h: Record<string, string> = { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  const ws = env('ANTHROPIC_WORKSPACE_ID'); if (ws) h['anthropic-workspace-id'] = ws;
  return h;
};
export const sanitize = (k: string) => k.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');
export const uid = (p = 'x') => p + '-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export async function telegram(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return false;
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }),
  });
  return r.ok;
}
