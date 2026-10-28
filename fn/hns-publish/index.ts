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
//     28.10.2026: taps on business directory buttons (hns:biz:ok:<id> / hns:biz:no:<id>) are passed as they are to hns-biz.
//   {action:'publish_ids', ids:[...], dry?}  publish chosen drafts that pass every rule except freshness (used once for the launch backlog).
//   {action:'status'}  counts by state.
//   {action:'withdraw', ids:[...], note}  takes published stories off the site (state 'withdrawn'; hns-feed returns only 'published').
//   {action:'revise', id, title?, dek?, body?, key_points?, note}  corrects the text of a published story (same guards as publishing).
// 28.10.2026 (Yakir): an independent news site, written as our own reporting.
//   Hard guard, every publishing path (automatic, Yakir's tap, launch, revise): a story is NOT published when its title, subtitle or
//   key points name a media outlet (the list is the table hns_outlets), when its body names an outlet anywhere except one closing
//   credit line in the last paragraph ("כפי שפורסם לראשונה ב..."), or when the body leans on "לפי דיווח / לפי פרסום / כפי שדווח".
//   Such a draft is sent back once to hns-write for a rewrite in our own voice (action 'rewrite'); if it still fails it waits, with a note.
//   A story whose only basis is another outlet's exclusive (basis 'media_exclusive', set by hns-write) is never published
//   automatically: it goes to Yakir for approval with the reason "מבוסס רק על פרסום בכלי תקשורת אחר".
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
// media outlet names, from the one list in the table hns_outlets. Latin names match as whole words ("ice" never matches "police"),
// Hebrew names also with a prefix letter (ב, ל, מ, ה, ו, ש, כ), e.g. "במעריב", "ב-ynet".
let OUTLET_RE: RegExp | null = null;
async function outlets() {
  const { data } = await sb.from('hns_outlets').select('name');
  const rx = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = (data || []).map((r: Any) => String(r.name || '').trim()).filter(Boolean).map((n: string) => /^[\x00-\x7F]+$/.test(n)
    ? `(?<![A-Za-z0-9])${rx(n)}(?![A-Za-z0-9])` : `(?<![\u05D0-\u05EA])(?:[ובלמהשכ]{1,2}-?)?${rx(n)}(?![\u05D0-\u05EA])`);
  OUTLET_RE = parts.length ? new RegExp(parts.join('|'), 'i') : null;
}
const outletIn = (s: unknown) => (OUTLET_RE ? (String(s ?? '').match(OUTLET_RE)?.[0] || '') : '');
const LEAN_RE = /לפי (?:דיווח|פרסום|מבזק|הדיווח|הפרסום|המבזק)|כפי שדווח|כך דווח|כך לפי (?:דיווח|מבזק|פרסום)|דיווח שפורסם|מבזק שפורסם/;
const CREDIT_RE = /פורסמ\S* לראשונה|צילום|תמונה|וידאו|סרטון|בראיון ל/;
// '' when the story may be published, otherwise the reason (Hebrew, saved as pub_note)
function voiceProblem(st: Any) {
  const head = [st.title, st.dek, ...(Array.isArray(st.key_points) ? st.key_points : [])].map(clean).join('\n');
  const h = outletIn(head);
  if (h) return `שם של כלי תקשורת (${h}) בכותרת, בכותרת המשנה או בנקודות`;
  if (LEAN_RE.test(head)) return 'הכותרת נשענת על "לפי דיווח" במקום על עובדות';
  const body = cleanArr(st.body);
  for (let i = 0; i < body.length; i++) {
    const last = i === body.length - 1;
    for (const sen of body[i].split(/(?<=[.!?])\s+/)) {
      const m = outletIn(sen);
      if (m && !(last && CREDIT_RE.test(sen))) return `שם של כלי תקשורת (${m}) בגוף הידיעה, לא כשורת קרדיט אחת בסוף`;
      if (LEAN_RE.test(sen) && !(last && m && CREDIT_RE.test(sen))) return 'גוף הידיעה נשען על "לפי דיווח" או "לפי פרסום"';
    }
  }
  return '';
}
const MEDIA_ONLY = 'מבוסס רק על פרסום בכלי תקשורת אחר';
async function askRewrite(st: Any) {
  if (/נכתב מחדש/.test(st.notes || '')) return { ok: false, error: 'already rewritten once' };
  return await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/hns-write`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
    body: JSON.stringify({ action: 'rewrite', ids: [st.id] }), signal: AbortSignal.timeout(120000) }).then((x) => x.json()).catch((e) => ({ ok: false, error: String(e) }));
}
const isWarning = (st: Any) => /אזהרה|אזהרת/.test(st.title || '') || (Array.isArray(st.sources) && st.sources.length > 0 && st.sources.every((s: Any) => s.id === 'ims_warn'));

async function log(action: string, story_id: number | null, detail: Any) { await sb.from('hns_publish_log').insert({ action, story_id, detail }); }

async function publish(st: Any, by: string) {
  if (!OUTLET_RE) await outlets();
  const problem = voiceProblem(st);
  if (problem) { await note(st, `לא פורסם: ${problem}`); await log('blocked', st.id, { by, problem }); return false; }
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
  const why = st.sensitivity === 'sensitive' ? 'ידיעה רגישה' : st.basis === 'media_exclusive' ? MEDIA_ONLY : (st.notes || 'צריך בדיקה');
  const body = cleanArr(st.body).join('\n\n');
  return clean(`🗞️ ידיעה לאישור, חדשות נתניה והשרון\n\n${clean(st.title)}\n${clean(st.dek)}\n\n${body}`).slice(0, 3000)
    + `\n\nמקור: ${src}\n\nלמה צריך אישור: ${clean(why)}`.slice(0, 900);
}

async function tick(dry: boolean) {
  await roles();
  await outlets();
  let rewrites = 0;
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
    // our own voice: a draft that names another outlet (or leans on "לפי דיווח") is sent back once for a rewrite, never published as is
    const problem = voiceProblem(st);
    if (problem) {
      const why = `לא פורסם: ${problem}`;
      if (dry) { out.skipped.push({ id: st.id, why, rewrite: !/נכתב מחדש/.test(st.notes || '') }); continue; }
      if (!/נכתב מחדש/.test(st.notes || '') && rewrites < 1 && local && age <= FRESH_H) { rewrites++; const r = await askRewrite(st); await log('rewrite_asked', st.id, { problem, ok: !!r?.ok }); out.skipped.push({ id: st.id, why, rewrite: true }); continue; }
      out.skipped.push({ id: st.id, why }); await note(st, why); continue;
    }
    if (st.state === 'draft' && st.sensitivity === 'normal' && st.basis !== 'media_exclusive') {
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
  if (String(data || '').startsWith('hns:biz:')) {
    const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/hns-biz`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
      body: JSON.stringify({ action: 'decide', data, cq }), signal: AbortSignal.timeout(30000) }).then((x) => x.json()).catch((e) => ({ ok: false, error: String(e) }));
    if (!r?.ok && cq?.id) await tg('answerCallbackQuery', { callback_query_id: cq.id, text: 'הפעולה נכשלה, אפשר לנסות שוב בעוד דקה' });
    return r;
  }
  const [, act, idStr] = String(data || '').split(':');
  const answer = (text: string) => cq?.id ? tg('answerCallbackQuery', { callback_query_id: cq.id, text }) : null;
  const edit = (text: string) => cq?.chat_id && cq?.message_id ? tg('editMessageText', { chat_id: cq.chat_id, message_id: cq.message_id, text, disable_web_page_preview: true }) : null;
  if (act === 'ping') { await log('ping', null, { cq: !!cq }); return { ok: true, ping: true }; }
  const id = Number(idStr);
  if (!['ok', 'no'].includes(act) || !id) { await answer('פעולה לא מוכרת'); return { ok: false, error: 'bad data' }; }
  await roles();
  const { data: st } = await sb.from('hns_stories').select('*').eq('id', id).maybeSingle();
  if (!st) { await answer('הידיעה לא נמצאה'); return { ok: false, error: 'not found' }; }
  if (['published', 'rejected', 'withdrawn'].includes(st.state)) { await answer(st.state === 'published' ? 'כבר פורסם' : st.state === 'withdrawn' ? 'הידיעה הורדה מהאתר' : 'כבר סומן לא לפרסם'); return { ok: true, already: st.state }; }
  if (act === 'no') {
    const now = new Date().toISOString();
    await sb.from('hns_stories').update({ state: 'rejected', decided_at: now, decided_by: 'yakir', pub_note: 'יקיר בחר לא לפרסם' }).eq('id', id);
    await log('reject', id, { by: 'yakir' });
    await answer('לא יפורסם');
    await edit(`✗ לא פורסם: ${clean(st.title)}`);
    return { ok: true, rejected: id };
  }
  if (!hasBody(st) || tipOnly(st)) { await answer('אי אפשר לפרסם: אין מקור רשמי או אין טקסט'); return { ok: false, error: 'not publishable' }; }
  await outlets();
  const problem = voiceProblem(st);
  if (problem) { await answer('אי אפשר לפרסם כך, הידיעה תיכתב מחדש'); await edit(`⏸ לא פורסם עדיין: ${clean(st.title)}\n${problem}. הידיעה תיכתב מחדש בניסוח שלנו.`); await askRewrite(st); return { ok: false, error: problem }; }
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

// take published stories off the site (hns-feed returns only 'published'; the next site build drops the pages)
async function withdraw(ids: number[], why: string) {
  const out: Any[] = [];
  for (const id of ids) {
    const now = new Date().toISOString();
    const { data } = await sb.from('hns_stories').update({ state: 'withdrawn', pub_note: clean(why || 'הורד מהאתר'), decided_at: now, decided_by: 'yakir', updated_at: now })
      .eq('id', id).eq('state', 'published').select('id');
    if (data?.length) await log('withdraw', id, { why });
    out.push({ id, withdrawn: !!data?.length });
  }
  return out;
}
// correct the text of a published story; the new text must pass the same guard
async function revise(b: Any) {
  await outlets();
  const { data: st } = await sb.from('hns_stories').select('*').eq('id', Number(b.id)).maybeSingle();
  if (!st || st.state !== 'published') return { ok: false, error: 'not a published story' };
  const patch: Any = {};
  if (b.title) patch.title = clean(b.title);
  if (b.dek) patch.dek = clean(b.dek);
  if (Array.isArray(b.body)) patch.body = cleanArr(b.body);
  if (Array.isArray(b.key_points)) patch.key_points = cleanArr(b.key_points);
  if (b.basis) patch.basis = String(b.basis);
  const next = { ...st, ...patch };
  const problem = voiceProblem(next);
  if (problem) return { ok: false, error: problem };
  if (!hasBody(next)) return { ok: false, error: 'no body' };
  patch.updated_at = new Date().toISOString();
  patch.pub_note = clean(b.note || 'תוקן');
  const { error } = await sb.from('hns_stories').update(patch).eq('id', st.id).eq('state', 'published');
  if (error) return { ok: false, error: error.message };
  await log('revise', st.id, { note: patch.pub_note, before: { title: st.title, dek: st.dek }, after: { title: next.title, dek: next.dek } });
  return { ok: true, id: st.id, title: next.title };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, dry: !!b.dry, ...(await tick(!!b.dry)) });
    if (b.action === 'decide') return J(await decide(b.data, b.cq));
    if (b.action === 'withdraw') return J({ ok: true, res: await withdraw((b.ids || []).map(Number).filter(Boolean), String(b.note || '')) });
    if (b.action === 'revise') return J(await revise(b));
    if (b.action === 'check') { await outlets(); const { data } = await sb.from('hns_stories').select('*').in('id', (b.ids || []).map(Number)); return J({ ok: true, res: (data || []).map((st: Any) => ({ id: st.id, state: st.state, problem: voiceProblem(st) })) }); }
    if (b.action === 'publish_ids') return J({ ok: true, res: await publishIds((b.ids || []).map(Number).filter(Boolean), !!b.dry) });
    if (b.action === 'status') {
      const { data } = await sb.from('hns_stories').select('state,sensitivity');
      const c: Record<string, number> = {}; for (const r of data || []) c[`${r.state}/${r.sensitivity}`] = (c[`${r.state}/${r.sensitivity}`] || 0) + 1;
      return J({ ok: true, counts: c });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
