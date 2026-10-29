// nws-uptime (29.10.2026, security hardening approved by Yakir): checks every 5 minutes (pg_cron job "nws-uptime") that the news
// site https://nws.co.il answers. Free: runs on Supabase, sends Telegram through the office bot (same bot and chat as the rest).
// One check = 3 targets, each tried twice (3 seconds apart) before it counts as failed:
//   1. the home page: status 200 and the HTML contains "חדשות נתניה והשרון"
//   2. one story page: the newest address in https://nws.co.il/latest.json, status 200
//   3. the news engine feed (Supabase function hns-feed?limit=1): status 200 and ok:true
// State in docs (coll 'ops', id 'uptime'): fails in a row, since when it is down, whether an alert went out, last error.
// After 2 failed checks in a row: ONE Telegram message. When it works again: ONE recovery message with the minutes it was down.
// POST only, header x-cron-secret = app_secrets CRON_SECRET (deployed with verify_jwt false).
// Body: {} (a normal check) | {dry:'down'|'up', what?} returns the alert or recovery text without sending and without saving state.
// No long or medium dash in any message.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const SITE = 'https://nws.co.il';
const FEED = `${Deno.env.get('SUPABASE_URL')}/functions/v1/hns-feed?limit=1`;
const BRAND = 'חדשות נתניה והשרון';
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  const S: Record<string, string> = {};
  for (const r of data || []) S[(r as Any).k] = String((r as Any).v ?? '').trim();
  return S;
}

const get = (url: string) => fetch(url, { headers: { 'user-agent': 'nws-uptime/1.0 (+https://nws.co.il)', 'cache-control': 'no-cache' }, redirect: 'follow', signal: AbortSignal.timeout(15000) });

// '' when fine, otherwise a short Hebrew reason
async function once(name: string): Promise<{ err: string; extra?: string }> {
  try {
    if (name === 'home') {
      const r = await get(`${SITE}/`);
      if (r.status !== 200) return { err: `דף הבית ענה ${r.status}` };
      const html = await r.text();
      return { err: html.includes(BRAND) ? '' : 'דף הבית עלה בלי השם של האתר (ייתכן דף שגיאה)' };
    }
    if (name === 'story') {
      const l = await get(`${SITE}/latest.json`);
      if (l.status !== 200) return { err: `רשימת הידיעות האחרונות ענתה ${l.status}` };
      const j: Any = await l.json().catch(() => null);
      const u = j?.items?.[0]?.u;
      if (!u) return { err: 'אין ידיעות ברשימת הידיעות האחרונות' };
      const r = await get(SITE + u);
      return { err: r.status === 200 ? '' : `דף ידיעה ענה ${r.status}`, extra: u };
    }
    const r = await get(FEED);
    if (r.status !== 200) return { err: `מנוע החדשות ענה ${r.status}` };
    const j: Any = await r.json().catch(() => null);
    return { err: j?.ok ? '' : 'מנוע החדשות ענה בלי תוכן תקין' };
  } catch (e) {
    const m = String((e as Error)?.name || e);
    const label = name === 'home' ? 'דף הבית' : name === 'story' ? 'דף ידיעה' : 'מנוע החדשות';
    return { err: /Timeout|Abort/i.test(m) ? `${label} לא ענה תוך 15 שניות` : `${label} לא זמין` };
  }
}
async function target(name: string) {
  let r = await once(name);
  if (r.err) { await new Promise((ok) => setTimeout(ok, 3000)); r = await once(name); }
  return { name, ...r };
}

const downText = (what: string) => `⚠️ האתר nws.co.il לא עונה (2 בדיקות ברצף). ${what}`.trim();
const upText = (min: number) => `✅ האתר חזר לעבוד. היה למטה בערך ${min} דקות.`;

async function tg(S: Record<string, string>, text: string) {
  if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return false;
  const r: Any = await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }),
  }).then((x) => x.json()).catch(() => null);
  return !!r?.ok;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return J({ ok: false }, 405);
  const S = await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  if (b.dry === 'down') return J({ ok: true, dry: true, text: downText(String(b.what || 'דף הבית ענה 503')) });
  if (b.dry === 'up') return J({ ok: true, dry: true, text: upText(Number(b.minutes) || 15) });

  const results = await Promise.all(['home', 'story', 'feed'].map(target));
  const bad = results.filter((r) => r.err);
  const now = new Date();
  const { data: row } = await sb.from('docs').select('data').eq('coll', 'ops').eq('id', 'uptime').maybeSingle();
  const st: Any = { fails: 0, down_since: null, alerted: false, ...(row?.data || {}) };
  let sent = '';
  if (bad.length) {
    st.fails = (Number(st.fails) || 0) + 1;
    st.down_since = st.down_since || now.toISOString();
    st.last_error = bad.map((r) => r.err).join('; ');
    if (st.fails >= 2 && !st.alerted) {
      const text = downText(st.last_error);
      if (await tg(S, text)) { st.alerted = true; st.alerted_at = now.toISOString(); sent = 'down'; }
    }
  } else {
    if (st.alerted) {
      const min = Math.max(1, Math.round((now.getTime() - Date.parse(st.down_since || now.toISOString())) / 60000));
      if (await tg(S, upText(min))) sent = 'up';
      else st.recovery_unsent = true;
    }
    if (!st.alerted || sent === 'up') { st.fails = 0; st.down_since = null; st.alerted = false; st.alerted_at = null; delete st.recovery_unsent; }
    st.last_ok = now.toISOString();
  }
  st.last_check = now.toISOString();
  st.last = results.map((r) => ({ t: r.name, ok: !r.err, ...(r.err ? { err: r.err } : {}), ...(r.extra ? { u: r.extra } : {}) }));
  await sb.from('docs').upsert({ coll: 'ops', id: 'uptime', data: st, updated_at: now.toISOString() }, { onConflict: 'coll,id' });
  return J({ ok: bad.length === 0, fails: st.fails, alerted: st.alerted, sent, results: st.last });
});
