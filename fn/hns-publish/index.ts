// hns-publish (28.10.2026): publishing stage of the HNS (חדשות נתניה והשרון, nws.co.il) news engine.
// Yakir approved (23.10.2026): routine news publishes automatically, sensitive news waits for his one-tap approval.
// Site launch approved by Yakir on 28.10.2026.
// POST (x-cron-secret):
//   {action:'tick', dry?}   cron every 5 min:
//     1. a story in state 'draft', sensitivity 'normal', with title and body, built on at least one official or media source
//        (never only on tips), about Netanya or the nearby Sharon, and still fresh, is published (state 'published').
//     2. a sensitive story, or a needs_check story that has a body and an official or media source, gets ONE Telegram message
//        to Yakir with the text and two buttons: "לפרסם" (hns:ok:<id>) and "לא לפרסם" (hns:no:<id>).
//        The office bot (edge function inbound) forwards these taps here as {action:'decide'}.
//     Stories built only on tips (note "רמז") are never published and never sent for approval.
//     dry=true: nothing is written or sent, the answer lists what would happen.
//   {action:'decide', data:'hns:ok:<id>'|'hns:no:<id>'|'hns:ping:0', cq?:{id,chat_id,message_id}}  a button tap.
//   {action:'publish_ids', ids:[...], dry?}  publish chosen drafts that pass every rule except freshness (used once for the launch backlog).
//   {action:'status'}  counts by state.
// Published text never contains a long or medium dash (replaced with a comma or a hyphen).
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

const FRESH_H = 36;      // automatic publishing only for stories from the last 36 hours
const WARN_H = 10;       // a weather or sea warning goes stale fast
const APPROVAL_H = 36;   // older stories are not sent to Yakir for approval
const MAX_TG_PER_RUN = 5;

// Netanya, its neighborhoods and the nearby Sharon (same places as the site's area pages, plus regions used in warnings).
// TEXT: names that are safe to look for inside a title or subtitle. PLACES_ONLY: names that are also common words
// (or exist elsewhere), so they count only when the engine tagged them as a place.
const TEXT = ['נתניה', 'לניאדו', 'פולג', 'רמת פולג', 'עיר ימים', 'קריית השרון', 'קרית השרון', 'קריית נורדאו', 'נאות שקד', 'נאות הרצל',
  'קריית צאנז', 'גבעת האירוסים', 'רמת חן', 'נאות גנים', 'נווה איתמר', 'נוף הטיילת', 'עין התכלת', 'פרדס הגדוד', 'רמת אפריים',
  'אופק הים', 'קריית רבין', 'כוכב הצפון', 'משכנות זבולון', 'רמת ידין', 'חפציבה', 'בית ינאי', 'אבן יהודה', 'קדימה צורן', 'קדימה-צורן', 'צורן', 'עמק חפר', 'כפר יונה', 'תל מונד',
  'פרדסיה', 'בית ליד', 'כפר הרא"ה', 'כפר הרא״ה', 'אביחיל', 'בני דרור', 'תנובות', 'כפר נטר', 'גן יאשיה', 'אלישיב', 'כפר ויתקין', 'מכמורת',
  'צפון השרון', 'דרום השרון', 'מישור החוף המרכזי', 'מכבי נתניה', 'כביש 553', 'מחלף נתניה'];
const PLACES_ONLY = new Set([...TEXT, 'מרכז העיר', 'אגמים', 'דורה', 'ותיקים', 'גלי ים', 'סלע', 'חרות', 'אודים', 'השרון', 'קדימה']);

const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const cleanArr = (a: unknown) => (Array.isArray(a) ? a : []).map(clean).filter(Boolean);
const hours = (iso: string) => (Date.now() - Date.parse(iso)) / 3600e3;

let ROLE: Record<string, string> = {};
async function roles() {
  const { data } = await sb.from('hns_sources').select('id,role');
  ROLE = Object.fromEntries((data || []).map((r: Any) => [r.id, r.role]));
}
const hasBody = (st: Any) => !!(st.title && String(st.title).trim() && Array.isArray(st.body) && st.body.some((p: Any) => String(p || '').trim()));
const official = (st: Any) => (Array.isArray(st.sources) ? st.sources : []).some((s: Any) => ROLE[s.id] === 'source' || ['official', 'media'].includes(s.trust) && ROLE[s.id] !== 'tip' && ROLE[s.id] !== 'competitor');
const tipOnly = (st: Any) => /רמז/.test(st.notes || '') || !official(st);
function isLocal(st: Any) {
  const places: string[] = Array.isArray(st.places) ? st.places : [];
  if (places.some((p) => PLACES_ONLY.has(String(p).trim()))) return true;
  const text = `${st.title || ''} ${st.dek || ''}`;
  return TEXT.some((p) => text.includes(p));
}
const isWarning = (st: Any) => /אזהרה|אזהרת/.test(st.title || '') || (Array.isArray(st.sources) && st.sources.length > 0 && st.sources.every((s: Any) => s.id === 'ims_warn'));

async function log(action: string, story_id: number | null, detail: Any) { await sb.from('hns_publish_log').insert({ action, story_id, detail }); }

async function publish(st: Any, by: string) {
  const now = new Date().toISOString();
  const patch = { state: 'published', published_at: now, decided_at: now, decided_by: by, pub_note: null,
    title: clean(st.title), dek: clean(st.dek), body: cleanArr(st.body), key_points: st.key_points ? cleanArr(st.key_points) : st.key_points };
  // only a story that is still waiting can be published (two runs or two taps never publish twice)
  const { data, error } = await sb.from('hns_stories').update(patch).eq('id', st.id).in('state', ['draft', 'needs_check', 'approved']).select('id');
  if (error) throw new Error(error.message);
  if (data?.length) await log('publish', st.id, { by, title: patch.title });
  return !!data?.length;
}
async function note(st: Any, text: string) { if (st.pub_note !== text) await sb.from('hns_stories').update({ pub_note: text }).eq('id', st.id); }

const tg = (method: string, body: Any) => fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/${method}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
}).then((r) => r.json()).catch((e) => ({ ok: false, description: String(e) }));

function approvalText(st: Any) {
  const src = (Array.isArray(st.sources) ? st.sources : []).map((s: Any) => `${s.name}${s.url ? `\n${s.url}` : ''}`).join('\n');
  const why = st.sensitivity === 'sensitive' ? 'ידיעה רגישה' : (st.notes || 'צריך בדיקה');
  const body = cleanArr(st.body).join('\n\n');
  return clean(`🗞️ ידיעה לאישור, חדשות נתניה והשרון\n\n${clean(st.title)}\n${clean(st.dek)}\n\n${body}`).slice(0, 3000)
    + `\n\nמקור: ${src}\n\nלמה צריך אישור: ${clean(why)}`.slice(0, 900);
}

async function tick(dry: boolean) {
  await roles();
  const since = new Date(Date.now() - 7 * 24 * 3600e3).toISOString();
  const { data: rows, error } = await sb.from('hns_stories').select('*').in('state', ['draft', 'needs_check', 'approved'])
    .is('published_at', null).gte('created_at', since).order('id').limit(400);
  if (error) throw new Error(error.message);
  const out: Any = { published: [], asked: [], skipped: [] };
  let sent = 0;
  for (const st of rows || []) {
    if (!hasBody(st) || tipOnly(st)) continue; // tips and bodiless stories wait for an official source, never published here
    const age = hours(st.created_at);
    const local = isLocal(st);
    if (st.state === 'draft' && st.sensitivity === 'normal') {
      const why = !local ? 'לא מקומי, לא פורסם אוטומטית' : isWarning(st) && age > WARN_H ? 'אזהרה שפג תוקפה, לא פורסמה' : age > FRESH_H ? 'ישן מדי לפרסום אוטומטי' : '';
      if (why) { out.skipped.push({ id: st.id, why }); if (!dry) await note(st, why); continue; }
      if (dry || await publish(st, 'auto')) out.published.push({ id: st.id, title: st.title });
      continue;
    }
    // sensitive, or needs a check: one message to Yakir, once
    if (st.tg_sent_at) continue;
    const why = !local ? 'לא מקומי, לא נשלח לאישור' : age > APPROVAL_H ? 'ישן, לא נשלח לאישור' : '';
    if (why) { out.skipped.push({ id: st.id, why }); if (!dry) await note(st, why); continue; }
    if (sent >= MAX_TG_PER_RUN) { out.skipped.push({ id: st.id, why: 'next run' }); continue; }
    sent++;
    if (dry) { out.asked.push({ id: st.id, title: st.title, text: approvalText(st) }); continue; }
    const r = await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, text: approvalText(st), disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: '✅ לפרסם', callback_data: `hns:ok:${st.id}` }, { text: '✗ לא לפרסם', callback_data: `hns:no:${st.id}` }]] } });
    if (r?.ok) {
      await sb.from('hns_stories').update({ tg_sent_at: new Date().toISOString(), tg_message_id: r.result?.message_id ?? null, pub_note: 'נשלח ליקיר לאישור' }).eq('id', st.id);
      await log('ask', st.id, { message_id: r.result?.message_id });
      out.asked.push({ id: st.id, title: st.title });
    } else { await log('ask_failed', st.id, { error: r?.description }); out.skipped.push({ id: st.id, why: 'telegram failed' }); }
  }
  return out;
}

async function decide(data: string, cq: Any) {
  const [, act, idStr] = String(data || '').split(':');
  const answer = (text: string) => cq?.id ? tg('answerCallbackQuery', { callback_query_id: cq.id, text }) : null;
  const edit = (text: string) => cq?.chat_id && cq?.message_id ? tg('editMessageText', { chat_id: cq.chat_id, message_id: cq.message_id, text, disable_web_page_preview: true }) : null;
  if (act === 'ping') { await log('ping', null, { cq: !!cq }); return { ok: true, ping: true }; }
  const id = Number(idStr);
  if (!['ok', 'no'].includes(act) || !id) { await answer('פעולה לא מוכרת'); return { ok: false, error: 'bad data' }; }
  await roles();
  const { data: st } = await sb.from('hns_stories').select('*').eq('id', id).maybeSingle();
  if (!st) { await answer('הידיעה לא נמצאה'); return { ok: false, error: 'not found' }; }
  if (st.state === 'published' || st.state === 'rejected') { await answer(st.state === 'published' ? 'כבר פורסם' : 'כבר סומן לא לפרסם'); return { ok: true, already: st.state }; }
  if (act === 'no') {
    const now = new Date().toISOString();
    await sb.from('hns_stories').update({ state: 'rejected', decided_at: now, decided_by: 'yakir', pub_note: 'יקיר בחר לא לפרסם' }).eq('id', id);
    await log('reject', id, { by: 'yakir' });
    await answer('לא יפורסם');
    await edit(`✗ לא פורסם: ${clean(st.title)}`);
    return { ok: true, rejected: id };
  }
  if (!hasBody(st) || tipOnly(st)) { await answer('אי אפשר לפרסם: אין מקור רשמי או אין טקסט'); return { ok: false, error: 'not publishable' }; }
  await publish(st, 'yakir');
  await answer('פורסם ✓ יופיע באתר תוך כרבע שעה');
  await edit(`✅ פורסם: ${clean(st.title)}\nיופיע באתר תוך כרבע שעה.`);
  return { ok: true, published: id };
}

async function publishIds(ids: number[], dry: boolean) {
  await roles();
  const { data: rows } = await sb.from('hns_stories').select('*').in('id', ids);
  const out: Any[] = [];
  for (const st of rows || []) {
    const why = st.state !== 'draft' ? `state ${st.state}` : st.sensitivity !== 'normal' ? 'sensitive' : !hasBody(st) ? 'no body' : tipOnly(st) ? 'tip only' : !isLocal(st) ? 'not local' : '';
    if (why) { out.push({ id: st.id, skipped: why }); continue; }
    out.push({ id: st.id, published: dry ? 'dry' : await publish(st, 'launch') });
  }
  return out;
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, dry: !!b.dry, ...(await tick(!!b.dry)) });
    if (b.action === 'decide') return J(await decide(b.data, b.cq));
    if (b.action === 'publish_ids') return J({ ok: true, res: await publishIds((b.ids || []).map(Number).filter(Boolean), !!b.dry) });
    if (b.action === 'status') {
      const { data } = await sb.from('hns_stories').select('state,sensitivity');
      const c: Record<string, number> = {}; for (const r of data || []) c[`${r.state}/${r.sensitivity}`] = (c[`${r.state}/${r.sensitivity}`] || 0) + 1;
      return J({ ok: true, counts: c });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
