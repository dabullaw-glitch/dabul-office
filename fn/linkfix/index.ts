// linkfix: Yakir's approval flow for "links only" work on an existing page (20.10.2026).
// The weekly existing-pages task prepares docs linkfix/<id> = {targetId, type:'posts'|'pages', title, link, modified,
//   html (the FULL new raw content: same text, internal links fixed by the link map, optionally a FAQ added), note,
//   added[], removed[]}. Nothing changes on the site until Yakir approves.
//   POST ?step=ask {id}   (x-cron-secret) -> checks, makes a hidden draft for preview, Telegram with approve / reject
//   GET  ?approve=<tok>                    -> backs up the live content (docs sitebak), saves the new content, clears cache
//   GET  ?reject=<tok>                     -> deletes the preview draft, nothing changes
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';

const SITE = 'https://dabullaw.co.il';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const BANNED: [RegExp, string][] = [
  [/הטוב(?:ים|ה|ות)? ביותר/g, 'לשון הפלגה "הטוב ביותר"'],
  [/הכי טוב/g, 'לשון הפלגה "הכי טוב"'],
  [/(?:עורכ?י? דין|עו"ד|עו״ד|משרד(?:נו)?)\s+מומח/g, 'תואר "מומחה" לעורך דין'],
  [/מומחי(?:ם|ות)? (?:ב|ל)/g, 'תואר "מומחים"'],
  [/(?:ייעוץ|פגישה|שיחה|בדיקה)(?: ראשונ(?:י|ית))? (?:חינם|ללא עלות|ללא תשלום)/g, 'ייעוץ חינם'],
  [/(?:אחוזי|שיעור) הצלחה/g, 'שיעורי הצלחה'],
];
// deno-lint-ignore no-explicit-any
const doc = async (coll: string, id: string): Promise<any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const basic = () => 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode(`${env('WP_USER')}:${env('WP_APP_PASSWORD').replace(/\s+/g, '')}`)));
const page = (msg: string) => new Response(msg, { headers: { ...cors, 'content-type': 'text/plain; charset=utf-8' } });
// deno-lint-ignore no-explicit-any
async function tg(text: string, buttons?: any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}
const normUrl = (u: string) => { try { const x = new URL(u, SITE); return decodeURIComponent(x.pathname).replace(/\/+$/, '').toLowerCase(); } catch { return ''; } };
async function siteIndex() {
  const out = new Set<string>();
  for (const kind of ['posts', 'pages']) for (let p = 1; p <= 8; p++) {
    const r = await fetch(`${SITE}/wp-json/wp/v2/${kind}?per_page=100&page=${p}&_fields=link`, { headers: { 'user-agent': UA } }).catch(() => null);
    if (!r || !r.ok) break;
    const a = await r.json().catch(() => []);
    // deno-lint-ignore no-explicit-any
    a.forEach((x: any) => out.add(normUrl(x.link)));
    if (a.length < 100) break;
  }
  return out;
}
// deno-lint-ignore no-explicit-any
async function live(job: any) {
  const r = await fetch(`${SITE}/wp-json/wp/v2/${job.type || 'posts'}/${job.targetId}?context=edit&_fields=id,link,modified,content`, { headers: { authorization: basic(), 'user-agent': UA } });
  // deno-lint-ignore no-explicit-any
  const o: any = await r.json().catch(() => ({}));
  return r.ok && o.id ? o : null;
}

async function ask(id: string) {
  const job = await doc('linkfix', id);
  if (!job || !job.html || !job.targetId) return { ok: false, error: 'missing job, html or targetId' };
  const issues: string[] = [], fixes: string[] = [];
  let html = String(job.html).replace(/\s*[—–]\s*/g, (m: string) => (/\s/.test(m) ? ' - ' : '-'));
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
  for (const [re, label] of BANNED) { const m = text.match(re); if (m) issues.push(`${label}: "${m[0]}"`); }
  // internal links: must exist, no duplicates (second link to the same page is unwrapped)
  const known = await siteIndex();
  const seen = new Set<string>(); let body = 0;
  for (const a of [...html.matchAll(/<a\s[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/g)]) {
    const [full, href, inner] = a;
    if (!(href.startsWith(SITE) || href.startsWith('/'))) continue;
    const n = normUrl(href); if (n === '' || n === '/' || /צור-קשר|contact|privacy|פרטיות|נגישות|תודה/.test(n)) continue;
    if (!known.has(n)) { html = html.replace(full, inner); fixes.push(`קישור לעמוד שלא קיים הוסר: ${href}`); continue; }
    if (seen.has(n)) { html = html.replace(full, inner); fixes.push(`קישור כפול הוסר: ${href}`); continue; }
    seen.add(n); body++;
  }
  if (body > 6) issues.push(`יש ${body} קישורים פנימיים בגוף, המקסימום 6`);
  const o = await live(job);
  if (!o) issues.push('לא הצלחתי לקרוא את העמוד הקיים');
  else if (job.modified && o.modified !== job.modified) issues.push('העמוד השתנה באתר מאז שהוכן הסידור, צריך להכין מחדש');
  if (issues.length) { await merge('linkfix', id, { status: 'held', issues, fixes, heldAt: new Date().toISOString() }); return { ok: false, issues }; }
  const r = await fetch(`${SITE}/wp-json/wp/v2/posts${job.draftId ? '/' + job.draftId : ''}`, { method: 'POST', headers: { authorization: basic(), 'content-type': 'application/json', 'user-agent': UA },
    body: JSON.stringify({ title: `[סידור קישורים לאישור] ${job.title || ''}`, status: 'draft', content: html }) });
  // deno-lint-ignore no-explicit-any
  const p: any = await r.json().catch(() => ({}));
  if (!r.ok || !p.id) { await merge('linkfix', id, { status: 'held', issues: [`draft ${r.status}`] }); return { ok: false, error: 'draft ' + r.status }; }
  const ok = crypto.randomUUID().replace(/-/g, ''), no = crypto.randomUUID().replace(/-/g, '');
  await merge('linkfix', id, { status: 'awaiting', html, fixes, links: body, draftId: p.id, approveToken: ok, rejectToken: no, askedAt: new Date().toISOString() });
  const base = `${env('SUPABASE_URL')}/functions/v1/linkfix`;
  const add = (job.added || []).length, rem = (job.removed || []).length;
  await tg(`🔗 סידור קישורים פנימיים לאישורך\n\n${job.title || ''}\n${job.note || ''}\nנוספו ${add}, הוסרו ${rem + fixes.length}. בגוף המאמר יהיו ${body} קישורים.\n\nשום דבר לא השתנה באתר עד שתאשר.`,
    [[{ text: '👁 תצוגה מקדימה', url: `${SITE}/?p=${p.id}&preview=true` }], [{ text: '✅ אישור והעלאה', url: `${base}?approve=${ok}` }], [{ text: '⛔ לא לשנות', url: `${base}?reject=${no}` }]]);
  return { ok: true, draft: p.id, links: body, fixes };
}

async function byTok(field: string, tok: string) {
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'linkfix').eq(`data->>${field}`, tok).limit(1);
  return data && data[0];
}
async function approve(tok: string) {
  const row = await byTok('approveToken', tok);
  if (!row) return page('הקישור לא תקף, או שהסידור כבר טופל.');
  const job = row.data;
  if (job.status === 'done') return page('הסידור כבר עלה לאתר.');
  if (job.status !== 'awaiting') return page('הסידור הזה כבר לא ממתין לאישור.');
  const o = await live(job);
  if (!o) return page('לא הצלחתי לקרוא את העמוד הקיים. נסה שוב בעוד דקה.');
  if (job.modified && o.modified !== job.modified) return page('העמוד השתנה באתר מאז שהוכן הסידור, ולכן לא עדכנתי כלום. אכין אותו מחדש.');
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' }).replace(/-/g, '');
  await merge('sitebak', `linkfix-${job.targetId}-${day}`, { at: new Date().toISOString(), why: 'linkfix ' + row.id, type: job.type || 'posts', modified: o.modified, raw: o.content?.raw });
  const r = await fetch(`${SITE}/wp-json/wp/v2/${job.type || 'posts'}/${job.targetId}`, { method: 'POST', headers: { authorization: basic(), 'content-type': 'application/json', 'user-agent': UA }, body: JSON.stringify({ content: job.html }) });
  if (!r.ok) return page('העדכון נכשל. שום דבר לא השתנה. נסה שוב בעוד דקה.');
  if (job.draftId) await fetch(`${SITE}/wp-json/wp/v2/posts/${job.draftId}?force=true`, { method: 'DELETE', headers: { authorization: basic(), 'user-agent': UA } }).catch(() => null);
  await fetch(`${SITE}/wp-json/dabul/v1/copyfix`, { method: 'POST', headers: { authorization: basic(), 'content-type': 'application/json', 'user-agent': UA }, body: JSON.stringify({ items: [] }) }).catch(() => null);
  await merge('linkfix', row.id, { status: 'done', doneAt: new Date().toISOString(), backup: `linkfix-${job.targetId}-${day}` });
  await tg(`✅ סידור הקישורים עלה לאתר: ${job.title || ''}\n${o.link}`);
  return page('✓ סידור הקישורים עלה לאתר. אפשר לסגור את הדף.');
}
async function reject(tok: string) {
  const row = await byTok('rejectToken', tok);
  if (!row) return page('הקישור לא תקף, או שהסידור כבר טופל.');
  if (row.data.draftId) await fetch(`${SITE}/wp-json/wp/v2/posts/${row.data.draftId}?force=true`, { method: 'DELETE', headers: { authorization: basic(), 'user-agent': UA } }).catch(() => null);
  await merge('linkfix', row.id, { status: 'rejected', rejectedAt: new Date().toISOString() });
  await tg(`⛔ סידור הקישורים של "${row.data.title || ''}" נדחה. העמוד באתר נשאר כמו שהוא.`);
  return page('✓ הסידור נדחה. העמוד באתר לא השתנה.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  const a = url.searchParams.get('approve'); if (a) return await approve(a.replace(/[^a-f0-9]/g, ''));
  const n = url.searchParams.get('reject'); if (n) return await reject(n.replace(/[^a-f0-9]/g, ''));
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  try {
    if (url.searchParams.get('step') === 'ask') { const b = await req.json().catch(() => ({})); return json(await ask(String(b.id || ''))); }
    return json({ error: 'step?' }, 400);
  } catch (e) {
    await tg('⚠️ סידור הקישורים נתקל בשגיאה: ' + String((e as Error).message || e).slice(0, 300));
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
