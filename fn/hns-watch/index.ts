// hns-watch (28.10.2026): health monitor of the HNS news engine (nws.co.il, חדשות נתניה והשרון). Cron every 15 minutes.
// Sends Yakir a short plain Hebrew Telegram message (the office bot, TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID in app_secrets, same
// pattern as hns-collect and hns-publish) when something is wrong. At most one message per issue per 6 hours (table
// hns_watch_alerts). Between 23:00 and 07:00 Israel time nothing is sent; an issue that is still there at 07:00 is sent then.
// Checks:
//   1. source_silent:<id>  an active source (enabled, or kind 'html' polled by hns-official) that normally brings items
//                          (at least 8 in 14 days) has brought none for 6x its usual gap, and at least 8 hours.
//   2. source_failing:<id> the source fails again and again (fails >= 5): blocked, moved or changed.
//   3. no_publish          no story published for 3 hours between 08:00 and 23:00.
//   4. site_stale          a story published more than 15 minutes ago is not on the site yet (https://nws.co.il/latest.json), or the
//                          site cannot be read.
//   5. collect_stopped     hns-collect has not polled any source for 10 minutes.
//      write_stuck         local items waited more than 40 minutes without being grouped by hns-write.
//      publish_stuck       routine drafts wait more than 20 minutes with no decision by hns-publish.
//      http_errors         3 or more failed calls of our own functions (JSON answers) in 30 minutes, one of them in the last 10.
// POST (x-cron-secret): {action:'tick'} check and send.  {action:'check'} check only, return the issues, send nothing.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
}
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const QUIET_H = 6;
const ilHour = (d = new Date()) => +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hourCycle: 'h23' }).format(d);
const ilHM = (iso: string) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const mins = (iso: string | null) => (iso ? Math.round((Date.now() - Date.parse(iso)) / 60e3) : Infinity);
const ago = (m: number) => (m === Infinity ? 'אף פעם' : m < 120 ? `${m} דקות` : m < 2880 ? `${Math.round(m / 60)} שעות` : `${Math.round(m / 1440)} ימים`);

interface Issue { key: string; text: string }

async function checks(): Promise<Issue[]> {
  const out: Issue[] = [];
  const now = Date.now();
  const hour = ilHour();

  // 1-2 sources
  const { data: srcs, error } = await sb.rpc('hns_watch_sources');
  if (error) out.push({ key: 'watch_error', text: `בדיקת המקורות נכשלה: ${error.message}` });
  const active = (srcs || []).filter((s: Any) => s.role !== 'competitor' && (s.enabled || (s.kind === 'html' && !/\bpaused\b/.test(s.notes || ''))));
  for (const s of active) {
    // 29.10.2026: Google News searches (kind 'gnews') are a bonus source that Google blocks from our servers most of the time
    // (HTTP 503); their failures are expected and are not reported.
    if ((s.fails || 0) >= 5 && s.kind !== 'gnews') {
      out.push({ key: `source_failing:${s.id}`, text: `המקור "${s.name_he}" נכשל ${s.fails} פעמים ברצף${/403|denied|moment/i.test(String(s.last_error || '')) ? ' (האתר חוסם אותנו)' : /404|410/.test(String(s.last_error || '')) ? ' (הכתובת כבר לא קיימת)' : ''}. הצלחה אחרונה: לפני ${ago(mins(s.last_ok))}.` });
      continue;
    }
    if (Number(s.n14) >= 8 && s.last_item) {
      const gapMin = (14 * 1440) / Number(s.n14);
      const limit = Math.max(6 * gapMin, 8 * 60);
      const silent = mins(s.last_item);
      if (silent > limit) out.push({ key: `source_silent:${s.id}`, text: `מהמקור "${s.name_he}" לא הגיעה אף ידיעה ${ago(silent)}, בדרך כלל מגיעה ידיעה כל ${ago(Math.round(gapMin))}. כדאי לבדוק שהערוץ או האתר עדיין פעילים.` });
    }
  }

  // 3 nothing published for 3 hours in daytime
  const { data: lastPub } = await sb.from('hns_stories').select('id,title,published_at').eq('state', 'published').not('published_at', 'is', null)
    .order('published_at', { ascending: false }).limit(1).maybeSingle();
  if (hour >= 8 && hour < 23 && lastPub && mins(lastPub.published_at) > 180) {
    const { count: waiting } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).in('state', ['draft', 'needs_check']).gte('created_at', new Date(now - 6 * 3600e3).toISOString());
    out.push({ key: 'no_publish', text: `לא פורסמה ידיעה באתר כבר ${ago(mins(lastPub.published_at))} (האחרונה ב-${ilHM(lastPub.published_at)}). ממתינות כרגע ${waiting || 0} טיוטות מ-6 השעות האחרונות.` });
  }

  // 4 the site shows the published stories
  try {
    const r = await fetch(`https://nws.co.il/latest.json?w=${now}`, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(15000) });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const siteNewest = Math.max(0, ...(j.items || []).map((x: Any) => Date.parse(x.at) || 0));
    const { data: pubs } = await sb.from('hns_stories').select('id,title,published_at').eq('state', 'published').not('published_at', 'is', null)
      .lte('published_at', new Date(now - 15 * 60e3).toISOString()).order('published_at', { ascending: false }).limit(1);
    const p = pubs?.[0];
    // 28.10.2026: check by the story's address, not by time (the site's "at" can be a little earlier than published_at,
    // which raised a false alert for story 96). Only stories newer than the site's own newest entry are checked.
    const onSite = (j.items || []).some((x: Any) => String(x.u || '').includes(`/n${p?.id}/`));
    if (p && !onSite && Date.parse(p.published_at) > siteNewest + 5 * 60e3) {
      out.push({ key: 'site_stale', text: `האתר לא מתעדכן: הידיעה "${String(p.title).slice(0, 80)}" פורסמה לפני ${ago(mins(p.published_at))} ועדיין לא מופיעה באתר. בנייה אחרונה של האתר: לפני ${ago(mins(j.at))}.` });
    }
  } catch (e) {
    const m = String((e as Error).message || e);
    out.push({ key: 'site_down', text: `לא הצלחתי לקרוא את האתר (${/timeout|abort/i.test(m) ? 'האתר לא ענה בזמן' : /HTTP (\d+)/.test(m) ? `קוד שגיאה ${m.match(/HTTP (\d+)/)![1]}` : 'שגיאת חיבור'}).` });
  }

  // 5 the pipeline functions
  const lastRun = Math.max(0, ...(srcs || []).filter((s: Any) => s.enabled).map((s: Any) => Date.parse(s.last_run) || 0));
  if (lastRun && now - lastRun > 10 * 60e3) out.push({ key: 'collect_stopped', text: `איסוף הידיעות לא רץ כבר ${ago(Math.round((now - lastRun) / 60e3))}.` });
  const { count: stuckItems } = await sb.from('hns_items').select('id', { count: 'exact', head: true }).eq('is_local', true).eq('backfill', false).is('cluster_id', null)
    .gte('fetched_at', new Date(now - 6 * 3600e3).toISOString()).lte('fetched_at', new Date(now - 40 * 60e3).toISOString());
  if ((stuckItems || 0) >= 3) out.push({ key: 'write_stuck', text: `${stuckItems} פריטים מקומיים מחכים יותר מ-40 דקות ולא נכתבו לידיעות. ייתכן שהכתיבה נתקעה או שהתקציב היומי נגמר.` });
  const { count: stuckDrafts } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).eq('state', 'draft').eq('sensitivity', 'normal').is('pub_note', null)
    .gte('created_at', new Date(now - 24 * 3600e3).toISOString()).lte('created_at', new Date(now - 20 * 60e3).toISOString()).not('title', 'is', null)
    // a draft the writer held for lack of details, or one the copy editor turned down ("עורך: נפסל"), is not waiting for a decision (29.10.2026)
    .or('notes.is.null,and(notes.not.like.ממתין לפרטים*,notes.not.like.עורך: נפסל*)');
  if ((stuckDrafts || 0) >= 2) out.push({ key: 'publish_stuck', text: `${stuckDrafts} טיוטות רגילות מחכות יותר מ-20 דקות בלי החלטה של שלב הפרסום.` });
  const { data: http } = await sb.rpc('hns_watch_http', { since: new Date(now - 30 * 60e3).toISOString() });
  // 28.10.2026: only our own functions count. They always answer in JSON; an HTML or XML error page (a news site that blocks
  // us or has no feed) or a timeout of an outside site is a source problem, covered by checks 1-2. A short burst while a
  // function is being updated is normal, so the alert needs 3 failures in 30 minutes AND one in the last 10 minutes.
  const fails = (http || []).filter((x: Any) => /^\s*\{/.test(x.content || '') && !/"ok"\s*:\s*true/.test(x.content || ''));
  const recent = fails.filter((x: Any) => Date.parse(x.created) > now - 10 * 60e3);
  if (fails.length >= 3 && recent.length) {
    const why = (x: Any) => /BOOT_ERROR/.test(x.content) ? 'פונקציה לא הצליחה לעלות' : /WORKER_LIMIT|resource/i.test(x.content) ? 'פונקציה חרגה ממגבלת זיכרון או זמן' : 'שגיאת שרת';
    const sample = [...new Set(fails.map(why))].slice(0, 3);
    out.push({ key: 'http_errors', text: `${fails.length} פעולות אוטומטיות של המערכת נכשלו בחצי השעה האחרונה (${sample.join(', ')}). אני בודק ומטפל.` });
  }
  return out;
}

async function send(text: string) {
  if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return false;
  const r = await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: text.slice(0, 3900), disable_web_page_preview: true }),
  }).then((x) => x.json()).catch(() => null);
  return !!r?.ok;
}

async function tick(dry: boolean) {
  const issues = await checks();
  const hour = ilHour();
  if (dry) return { issues, quiet: hour >= 23 || hour < 7 };
  if (hour >= 23 || hour < 7) return { issues: issues.map((i) => i.key), held: 'night' };
  const since = new Date(Date.now() - QUIET_H * 3600e3).toISOString();
  const { data: recent } = await sb.from('hns_watch_alerts').select('issue').eq('sent', true).gte('at', since);
  const seen = new Set((recent || []).map((r: Any) => r.issue));
  const fresh = issues.filter((i) => !seen.has(i.key));
  if (!fresh.length) return { issues: issues.map((i) => i.key), sent: 0 };
  const text = `⚠️ חדשות נתניה והשרון, בדיקת מערכת\n\n${fresh.map((i) => `• ${i.text}`).join('\n\n')}`;
  const ok = await send(text);
  await sb.from('hns_watch_alerts').insert(fresh.map((i) => ({ issue: i.key, text: i.text, sent: ok })));
  return { issues: issues.map((i) => i.key), sent: ok ? fresh.length : 0, keys: fresh.map((i) => i.key) };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick(false)) });
    if (b.action === 'check') return J({ ok: true, ...(await tick(true)) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
