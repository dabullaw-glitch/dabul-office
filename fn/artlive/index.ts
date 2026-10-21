// artlive (21.10.2026, Yakir approved "item 2: make sure it does not happen again in new articles").
// New articles are scheduled on the site for 06:05 the next morning. On 21.10 the demolition-order article was
// served from the site's page cache with a temporary address (?p=...) as its canonical and og:url, so Google could
// skip it. This runs every hour: for each article that went live in the last 3 days and was not checked yet, it
// 1) touches the post (an empty update, which makes WP Rocket drop that page's cached copy, only that page),
// 2) opens the live page like a visitor and checks that canonical and og:url are the article's real address,
// 3) if not: purges the whole cache once and checks again; still wrong -> Telegram to Yakir.
// POST ?step=run (x-cron-secret). Changes nothing in the article itself. No AI calls.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const SITE = 'https://dabullaw.co.il';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const basic = (u: string, p: string) => 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode(`${u}:${p.replace(/\s+/g, '')}`)));
async function tg(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true }) }).catch(() => null);
}
const norm = (u: string) => { try { return decodeURIComponent(new URL(u, SITE).pathname).replace(/\/+$/, '').toLowerCase(); } catch { return ''; } };
// the article's page as a visitor gets it: canonical and og:url
async function live(link: string) {
  const r = await fetch(link, { headers: { 'user-agent': UA }, redirect: 'follow' }).catch(() => null);
  const h = r ? await r.text().catch(() => '') : '';
  const canon = (h.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)/i) || [])[1] || '';
  const og = (h.match(/<meta[^>]+property=["']og:url["'][^>]*content=["']([^"']+)/i) || [])[1] || '';
  const ok = !!r && r.ok && !!canon && norm(canon) === norm(link) && !/[?&]p=\d/.test(canon) && (!og || (norm(og) === norm(link) && !/[?&]p=\d/.test(og)));
  return { ok, status: r ? r.status : 0, canon, og };
}
async function run() {
  const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'artjob').eq('data->>status', 'scheduled').is('data->>liveCheckedAt', null).limit(20);
  const out: Any[] = [];
  for (const row of data || []) {
    const j = row.data; if (!j.wpId) continue;
    const p = await fetch(`${SITE}/wp-json/wp/v2/posts/${j.wpId}?context=edit&_fields=id,status,link,date`, { headers: { authorization: auth } }).then((r) => r.json()).catch(() => null);
    if (!p || !p.id) { out.push({ id: row.id, skip: 'post not readable' }); continue; }
    if (p.status !== 'publish') { out.push({ id: row.id, skip: p.status }); continue; } // not live yet (or stopped)
    if (Date.now() - Date.parse(p.date + '+03:00') > 3 * 864e5) { await merge('artjob', row.id, { liveCheckedAt: new Date().toISOString(), liveOk: null, liveNote: 'older than 3 days, not checked' }); continue; }
    // 1) an empty update: WordPress clears the post's caches and WP Rocket drops this page's cached copy
    await fetch(`${SITE}/wp-json/wp/v2/posts/${j.wpId}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: '{}' }).catch(() => null);
    let c = await live(p.link); let purged = false;
    if (!c.ok) {
      // 3) once: the whole page cache
      await fetch(`${SITE}/wp-json/dabul/v1/copyfix`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json', 'user-agent': UA }, body: '{"items":[]}' }).catch(() => null);
      purged = true; c = await live(p.link);
    }
    await merge('artjob', row.id, { liveCheckedAt: new Date().toISOString(), liveOk: c.ok, liveCanon: c.canon, liveOg: c.og, livePurgedAll: purged, wpLink: p.link });
    if (!c.ok) await tg(`⚠️ המאמר "${j.meta?.title || ''}" עלה לאתר, אבל הכתובת שגוגל רואה בו עדיין לא נכונה (${c.canon || 'חסרה'}). ניקיתי את העותקים השמורים של האתר ועדיין לא תקין. אני אבדוק את זה.\n${p.link}`);
    out.push({ id: row.id, post: j.wpId, ok: c.ok, purged, canon: c.canon });
  }
  return { checked: out.length, out };
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const step = new URL(req.url).searchParams.get('step');
  try {
    if (step === 'run') return json({ ok: true, ...(await run()) });
    return json({ error: 'step?' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
