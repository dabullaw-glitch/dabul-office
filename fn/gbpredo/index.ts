// gbpredo (24.10.2026). Yakir approved 46 new personal replies to old Google reviews that were answered only with
// "תודה!" / "תודה רבה!" (all except review 47), to go up gradually ("בהדרגה, 5 עד 8 ביום").
// Each approved review row (docs coll 'gbprev') holds data.redo {n, text, status:'approved'}.
// Cron (x-cron-secret): POST {limit?} once a day -> replaces up to `limit` (default 6, max 10) replies on Google, in order of n,
// keeps the old reply in redo.old, and sends one short Telegram line. A failed one stays 'approved' and is tried the next day.
// Uses the same Google connection as the gbp function (GBP_CLIENT_ID / GBP_CLIENT_SECRET / GBP_REFRESH_TOKEN).
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const db = () => admin().from('docs');
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });

async function access(): Promise<string> {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GBP_CLIENT_ID'), client_secret: env('GBP_CLIENT_SECRET'), refresh_token: env('GBP_REFRESH_TOKEN'), grant_type: 'refresh_token' }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error('google token: ' + r.status + ' ' + String(j.error || ''));
  return j.access_token;
}
async function tg(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }) }).catch(() => null);
}

async function run(b: Any) {
  const { data } = await db().select('id,data').eq('coll', 'gbprev').eq('data->redo->>status', 'approved');
  const rows = (data || []).sort((x: Any, y: Any) => Number(x.data.redo.n || 0) - Number(y.data.redo.n || 0));
  const lim = Math.max(1, Math.min(Number(b.limit || 6), 10));
  const pick = rows.slice(0, lim); const out: Any[] = [];
  if (!pick.length) return { ok: true, done: 0, left: 0, out };
  const at = await access();
  for (const row of pick) {
    const r = row.data; const text = String(r.redo.text || '').trim();
    if (!text || !r.name) { out.push({ n: r.redo.n, ok: false, error: 'no text or name' }); continue; }
    const res = await fetch(`https://mybusiness.googleapis.com/v4/${r.name}/reply`, { method: 'PUT', headers: { authorization: 'Bearer ' + at, 'content-type': 'application/json' }, body: JSON.stringify({ comment: text.slice(0, 4000) }) });
    if (res.ok) {
      const now = new Date().toISOString();
      await merge('gbprev', row.id, { reply: text, status: 'replied', repliedAt: now, redo: { ...r.redo, status: 'done', old: r.reply || '', at: now } });
      out.push({ n: r.redo.n, ok: true });
    } else out.push({ n: r.redo.n, ok: false, error: `google ${res.status}: ${(await res.text()).slice(0, 200)}` });
  }
  const ok = out.filter(x => x.ok).length, bad = out.length - ok, left = rows.length - ok;
  if (b.notify !== false) await tg(`⭐ עודכנו היום ${ok} תשובות לביקורות בגוגל, במקום "תודה!".${left ? ` נשארו ${left}.` : ' זהו, כל התשובות עודכנו.'}${bad ? `\n⚠️ ${bad} לא עלו, ננסה שוב מחר.` : ''}`);
  return { ok: true, done: ok, left, out };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  try { return json(await run(await req.json().catch(() => ({})))); }
  catch (e) { console.error(e); return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
