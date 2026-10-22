// Runs every working morning (scheduled in the database): applies the self-running
// automations and sends the owner a Telegram summary.
// 19.10.2026 (approved by Yakir):
//  - Israel time: the morning run acts only at 08:00 Israel time and the evening run only at 17:00, so the two cron jobs
//    of each pair (summer UTC+3 / winter UTC+2) never both work. The hourly lead run works only Sun-Thu 08:00-20:59,
//    Fri 08:00-13:59, never on Saturday. ?force=1 skips the hour check (manual run).
//  - A message that failed to send is not lost: every failure is kept in docs coll 'outfail' (attempts, last error, first
//    and last attempt). It is retried on every run while it is still relevant (the rules only produce messages that are
//    still relevant). After two failures, or when the next run would be too late, Yakir gets ONE Telegram message with the
//    ready text and a WhatsApp button; "✓ נשלח" there counts as sent (handled by the inbound function).
//  - ?mode=preview: a dry run. Nothing is sent and nothing is written; it returns what the next run would do.
// 19.10.2026 (lead workflow, approved by Yakir): "לחזור אליו ב..." on a lead (lead.callbackAt). Every run of this function
//    (the 5-minute 'office-callbacks' job with ?mode=callbacks, and also the morning, evening and hourly lead runs, at any
//    hour, night and Saturday included, since Yakir chose the time) looks for callbacks whose time has come (1 minute
//    tolerance) and sends Yakir ONE Telegram reminder per callback time: name, topic, last note, the phone number, a dial button
//    (an https page that opens the phone dialer; Telegram buttons cannot be tel: links) and a button that opens the lead.
//    Marked on the lead (callbackNotified = the callbackAt it was sent for). ?mode=callbacks runs only this check.
//    Nothing is ever sent to the lead here.
// 22.10.2026 (Yakir approved): before an opening message (welcome) the hourly lead run checks that the number has WhatsApp.
//    No WhatsApp: nothing is sent, the opening is marked cancelled ('dismissed', via 'no-whatsapp') and Telegram says
//    "⚠️ למספר הזה אין וואטסאפ. צריך להתקשר אליו."
import { loadSecrets, env, json, cors, loadEngine, loadData, telegram, sanitize } from '../_shared/common.ts';
import { provider, send, offerOnTelegram, intl, hasWhatsapp } from '../_shared/send.ts';
import { uid, admin } from '../_shared/common.ts';

export function digest(O: any) {
  const t = O.today(), add = O.addDays;
  const tasks = O.allTasks();
  const over = tasks.filter((x: any) => O.taskBucket(x) === 'overdue').sort((a: any, b: any) => O.prioRank(a.priority) - O.prioRank(b.priority));
  const tod = tasks.filter((x: any) => O.taskBucket(x) === 'today');
  const ob = O.outboxCandidates();
  const ev = O.events(t, add(t, 7)).filter((e: any) => ['sign', 'hand', 'court', 'pay', 'inst'].includes(e.type));
  const leads = O.all('leads').filter((l: any) => l.status === 'חדש');
  const auto = O.all('notes').filter((n: any) => n.kind === 'auto' && (n.date || '').slice(0, 10) === t);
  const addr = (x: any) => { const d = x.dealId && O.get('deals', x.dealId); return d && !String(x.title).includes(d.address) ? ` (${d.address})` : ''; };
  const lines: string[] = [];
  lines.push(`☀️ בוקר טוב! סיכום המשרד ל${O.fmtDateLong(t)}`);
  lines.push('');
  if (over.length + tod.length) {
    lines.push(`📌 לטיפול היום: ${over.length + tod.length}${over.length ? ` (${over.length} באיחור)` : ''}`);
    over.concat(tod).slice(0, 12).forEach((x: any) => lines.push(`• ${x.title}${addr(x)}${O.taskBucket(x) === 'overdue' ? ' ⚠️' : ''}`));
    if (over.length + tod.length > 12) lines.push(`• ועוד ${over.length + tod.length - 12}...`);
  } else lines.push('✅ אין משימות פתוחות להיום');
  lines.push('');
  if (ob.length) {
    lines.push(`💬 ${ob.length} הודעות ללקוחות מוכנות ומחכות לאישור שלך`);
    ob.slice(0, 6).forEach((x: any) => lines.push(`• ${x.label}: ${x.name}`));
    lines.push('');
  }
  const notReg = tasks.filter((x: any) => x.nag && O.taskBucket(x) === 'overdue');
  if (notReg.length) { lines.push(`⏳ עדיין לא נרשם בטאבו (${notReg.length}):`); notReg.slice(0, 10).forEach((x: any) => { const d = O.get('deals', x.dealId); lines.push(`• ${d ? d.address : x.title}, באיחור של ${-O.diffDays(x.due)} ימים`); }); lines.push(''); }
  if (leads.length) { lines.push(`🆕 לידים שעוד לא טופלו: ${leads.length}`); leads.slice(0, 5).forEach((l: any) => lines.push(`• ${l.name}${l.area ? ' - ' + l.area : ''}`)); lines.push(''); }
  if (ev.length) { lines.push('🗓 השבוע:'); ev.slice(0, 8).forEach((e: any) => lines.push(`• ${O.fmtDate(e.date)} ${e.title}`)); lines.push(''); }
  if (auto.length) { lines.push(`🤖 המערכת עשתה לבד הבוקר: ${auto.length} פעולות`); auto.slice(0, 5).forEach((n: any) => lines.push(`• ${n.text}`)); lines.push(''); }
  const app = env('APP_URL');
  if (app) lines.push(`👉 לסבב הבוקר: ${app}`);
  return lines.join('\n');
}

// ---------- Israel time ----------
const IL_FMT = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', weekday: 'short', hour: 'numeric', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit' });
const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
export function ilNow(ms = Date.now()) {
  const p: Record<string, string> = {};
  IL_FMT.formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
  return { dow: DOW[p.weekday] ?? -1, hour: +p.hour % 24, date: `${p.year}-${p.month}-${p.day}` };
}
// the client-message runs: mornings Sun-Fri 08:00, evenings Sun-Thu 17:00 (Israel time)
export const isMorning = (t = ilNow()) => t.dow >= 0 && t.dow <= 5 && t.hour === 8;
export const isEvening = (t = ilNow()) => t.dow >= 0 && t.dow <= 4 && t.hour === 17;
// lead messages: Sun-Thu 08:00-20:59, Fri 08:00-13:59, never Saturday
export const isLeadHours = (t = ilNow()) => (t.dow >= 0 && t.dow <= 4 && t.hour >= 8 && t.hour < 21) || (t.dow === 5 && t.hour >= 8 && t.hour < 14);
// the next time (ms) a run of this kind will happen, a few minutes into that hour
export function nextRunAt(kind: 'daily' | 'leads', from = Date.now()) {
  const H = 3600e3, start = Math.floor(from / H) * H;
  for (let i = 1; i <= 24 * 8; i++) {
    const at = start + i * H, t = ilNow(at);
    if (kind === 'leads' ? isLeadHours(t) : (isMorning(t) || isEvening(t))) return at + 10 * 60e3;
  }
  return from + 2 * 86400e3;
}

// the keys the rules would still produce at a future moment (used to know if a failed message gets another chance)
export function keysAt(O: any, at: number, list: () => any[]) {
  const Real = Date, off = at - Real.now();
  class Shifted extends Real {
    // deno-lint-ignore no-explicit-any
    constructor(...a: any[]) {
      // @ts-ignore: forwarding any Date arguments
      if (a.length) super(...a); else super(Real.now() + off);
    }
    static now() { return Real.now() + off; }
  }
  // deno-lint-ignore no-explicit-any
  (globalThis as any).Date = Shifted;
  try { O.bump(); return new Set(list().map((x: any) => x.key)); }
  catch (e) { console.error('keysAt', e); return null; }
  finally {
    // deno-lint-ignore no-explicit-any
    (globalThis as any).Date = Real; O.bump();
  }
}

// ---------- failed sends ----------
// deno-lint-ignore no-explicit-any
type Fail = Record<string, any>;
async function loadFails() {
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'outfail');
  const m: Record<string, Fail> = {};
  // deno-lint-ignore no-explicit-any
  (data || []).forEach((r: any) => { m[r.id] = r.data || {}; });
  return m;
}
const putFail = (id: string, patch: Fail) => admin().rpc('docs_merge', { p_coll: 'outfail', p_id: id, p_patch: patch });
// a short, readable reason for Yakir
export function why(err: string) {
  const e = String(err || '');
  if (e === 'bad_phone') return 'מספר הטלפון לא תקין';
  if (e === 'no_provider') return 'אין חיבור לוואטסאפ';
  const m = e.match(/^green (\d+)/);
  if (m) return m[1] === '466' ? 'נגמרה מכסת ההודעות בוואטסאפ' : m[1] === '401' || m[1] === '403' ? 'החיבור לוואטסאפ נותק' : `שרת הוואטסאפ החזיר שגיאה ${m[1]}`;
  if (/timed out|timeout|network|fetch|connect/i.test(e)) return 'תקלת תקשורת';
  return 'תקלה בשליחה';
}
// one Telegram message per failed item: the ready text, a button that opens Yakir's own WhatsApp, and "✓ נשלח"
// deno-lint-ignore no-explicit-any
async function offerFailed(x: any, err: string, attempts: number) {
  if (!env('TELEGRAM_BOT_TOKEN') || !env('TELEGRAM_CHAT_ID') || !intl(x.phone)) return false;
  const id = uid('q').slice(2, 14);
  const label = `⚠️ לא נשלח אוטומטית (${why(err)}, ${attempts} ${attempts === 1 ? 'ניסיון' : 'ניסיונות'}). המערכת תמשיך לנסות. אפשר לשלוח עכשיו מהוואטסאפ שלך, ואז ללחוץ "✓ נשלח" כדי שלא יישלח שוב · ${x.label}`;
  const r = await offerOnTelegram(id, { label, name: x.name, phone: x.phone, text: x.text }).catch(() => ({ ok: false }));
  if (!r.ok) return false;
  await admin().from('docs').upsert({ coll: 'tgq', id, data: { key: x.key, name: x.name, phone: x.phone, clientId: x.clientId || '', dealId: x.dealId || '', leadId: x.leadId || '', type: x.type, label: x.label, text: x.text } });
  return true;
}
// deno-lint-ignore no-explicit-any
async function noteFailure(fails: Record<string, Fail>, x: any, err: string, lastChance: boolean, mode: string) {
  const id = sanitize(x.key), f = fails[id] || {}, now = new Date().toISOString();
  const attempts = (f.resolved ? 0 : +f.attempts || 0) + 1;
  const patch: Fail = { key: x.key, type: x.type, label: x.label, name: x.name, clientId: x.clientId || '', dealId: x.dealId || '', leadId: x.leadId || '', sendOn: x.sendOn || '',
    attempts, lastError: String(err || '').slice(0, 200), firstAt: f.resolved ? now : f.firstAt || now, lastAt: now, mode, resolved: false };
  if (f.resolved) { patch.offered = false; patch.offeredAt = null; patch.sentAt = null; }
  const offeredBefore = !f.resolved && !!f.offered;
  if (!offeredBefore && (attempts >= 2 || lastChance) && await offerFailed(x, err, attempts)) { patch.offered = true; patch.offeredAt = now; patch.offerWhy = attempts >= 2 ? 'twice' : 'last-chance'; }
  await putFail(id, patch);
  fails[id] = Object.assign({}, f, patch);
  return patch;
}
async function noteSent(fails: Record<string, Fail>, key: string) {
  const id = sanitize(key), f = fails[id];
  if (f && !f.resolved) await putFail(id, { resolved: true, sentAt: new Date().toISOString(), via: 'auto' });
}
// failures that were handled another way (Yakir tapped "✓ נשלח" / "✗ לא לשלוח", or the message stopped being relevant)
// deno-lint-ignore no-explicit-any
async function closeHandled(O: any, fails: Record<string, Fail>, live: Set<string>) {
  for (const [id, f] of Object.entries(fails)) {
    if (f.resolved) continue;
    const ob = O.get('outbox', f.key);
    if (ob && (ob.status === 'sent' || ob.status === 'dismissed')) { await putFail(id, { resolved: true, closedBy: ob.status === 'sent' ? (ob.via || 'sent') : 'dismissed', closedAt: new Date().toISOString() }); f.resolved = true; }
    else if (!live.has(f.key) && f.lastAt && Date.now() - Date.parse(f.lastAt) > 3 * 86400e3) { await putFail(id, { resolved: true, closedBy: 'not-relevant', closedAt: new Date().toISOString() }); f.resolved = true; }
  }
}

// send every message whose rule is set to "automatic" and whose day has come
export async function autoSend(O: any) {
  const st = O.settings(), sent: any[] = [], failed: any[] = [];
  const due = O.autoQueue().filter(O.autoEligible).slice(0, 40);
  const viaTelegram = provider() === 'telegram';
  const fails = viaTelegram ? {} : await loadFails().catch(() => ({} as Record<string, Fail>));
  let later: Set<string> | null | undefined;
  const nextKeys = () => later !== undefined ? later : (later = keysAt(O, nextRunAt('daily'), () => O.autoQueue().filter(O.autoEligible)));
  for (const x of due) {
    if (viaTelegram) {
      // park it for a day: it comes back tomorrow if you don't tap "נשלח"
      const id = uid('q').slice(2, 14);
      const r = await offerOnTelegram(id, x);
      if (r.ok) {
        await admin().from('docs').upsert({ coll: 'tgq', id, data: { key: x.key, name: x.name, clientId: x.clientId || '', dealId: x.dealId || '', type: x.type, label: x.label, text: x.text } });
        await O.save('outbox', sanitize(x.key), { status: 'snoozed', until: O.addDays(O.today(), 1), offered: true, at: new Date().toISOString(), key: x.key, name: x.name, clientId: x.clientId || '', dealId: x.dealId || '' });
        sent.push(x);
      } else failed.push(Object.assign({ error: r.error }, x));
      continue;
    }
    const r = await send(x.phone, x.text, { name: x.name, signature: st.signature });
    if (r.ok) {
      await O.save('outbox', sanitize(x.key), { status: 'sent', via: 'auto', at: new Date().toISOString(), key: x.key, name: x.name, clientId: x.clientId || '', dealId: x.dealId || '', type: x.type, text: x.text });
      if (x.dealId) await O.log('deal', x.dealId, `נשלחה אוטומטית ל${x.name}: ${x.label}`, 'system');
      await noteSent(fails, x.key).catch(() => {});
      sent.push(x);
    } else {
      const k = nextKeys();
      const f = await noteFailure(fails, x, String(r.error || ''), !!k && !k.has(x.key), 'daily').catch(e => { console.error('outfail', e); return null; });
      failed.push(Object.assign({ error: r.error, attempts: f ? f.attempts : 1, offered: !!(f && f.offered) }, x));
    }
  }
  if (!viaTelegram) await closeHandled(O, fails, new Set(O.autoQueue().map((x: any) => x.key))).catch(e => console.error('outfail close', e));
  return { sent, failed };
}
// messages that wait for your approval (for example a late fee payment): when a WhatsApp sender is connected they come to
// Telegram with a "send" button, and one tap sends them to the client
// deno-lint-ignore no-explicit-any
export async function offerApprovals(O: any) {
  if (provider() === 'telegram' || !env('TELEGRAM_BOT_TOKEN') || !env('TELEGRAM_CHAT_ID')) return 0;
  const today = O.today();
  // deno-lint-ignore no-explicit-any
  const due = O.outboxCandidates().filter((x: any) => x.phone && String(x.sendOn || x.date || today) <= today && O.diffDays(x.sendOn || x.date || today) >= -2).slice(0, 15);
  let n = 0;
  for (const x of due) {
    const id = uid('q').slice(2, 14);
    const r = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), text: `🟡 מחכה לאישורך · ${x.label}: ${x.name}\n\n${x.text}`.slice(0, 4000), disable_web_page_preview: true,
        reply_markup: { inline_keyboard: [[{ text: '✅ שליחה ללקוח בוואטסאפ', callback_data: `ap:${id}` }], [{ text: '✗ לא לשלוח', callback_data: `x:${id}` }]] } }) }).catch(() => null);
    if (!r || !r.ok) continue;
    await admin().from('docs').upsert({ coll: 'tgq', id, data: { key: x.key, name: x.name, phone: x.phone, clientId: x.clientId || '', dealId: x.dealId || '', leadId: x.leadId || '', type: x.type, label: x.label, text: x.text, approve: true } });
    await O.save('outbox', sanitize(x.key), { status: 'snoozed', until: O.addDays(today, 1), offered: true, at: new Date().toISOString(), key: x.key, name: x.name, clientId: x.clientId || '', dealId: x.dealId || '' });
    n++;
  }
  return n;
}
const sentLines = (r: any) => [
  ...(r.sent.length && provider() === 'telegram' ? [`📲 ${r.sent.length} הודעות ללקוחות נשלחו אליך כאן בנפרד. בכל אחת: "פתיחה בוואטסאפ", שליחה, ואז "✓ נשלח".`] : []),
  ...(r.sent.length && provider() !== 'telegram' ? [`📤 נשלחו אוטומטית ללקוחות: ${r.sent.length}`, ...r.sent.slice(0, 10).map((x: any) => `• ${x.label}: ${x.name}`)] : []),
  ...(r.failed.length ? [`⚠️ לא נשלחו (${r.failed.length}). המערכת תנסה שוב בריצה הבאה${r.failed.some((x: any) => x.offered) ? ', ומה שסומן ב-📲 נשלח אליך בנפרד עם כפתור שליחה' : ''}:`, ...r.failed.slice(0, 6).map((x: any) => `• ${x.offered ? '📲 ' : ''}${x.label}: ${x.name} (${why(x.error)})`)] : []),
].join('\n');

// ---------- lead callbacks: "לחזור אליו ב..." (a reminder to Yakir, never a message to the lead) ----------
const CB_AHEAD = 60e3;
const OPEN_STAGES = ['new', 'contacted', 'meeting_set', 'no_show', 'meeting_done', 'proposal_sent'];
// deno-lint-ignore no-explicit-any
export function callbacksDue(rows: { id: string; data: any }[], now = Date.now()) {
  return rows.filter(r => {
    const l = r.data || {}, at = Date.parse(l.callbackAt || '');
    if (!(at > 0) || l.test) return false;
    if (!OPEN_STAGES.includes(l.stage || 'new')) return false;
    if (l.callbackNotified && l.callbackNotified === l.callbackAt) return false;
    return at <= now + CB_AHEAD;
  }).sort((a, b) => Date.parse(a.data.callbackAt) - Date.parse(b.data.callbackAt));
}
const IL_HM = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const IL_D = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' });
export function whenText(at: number, now = Date.now()) {
  const d = IL_D.format(new Date(at)), t = IL_HM.format(new Date(at));
  const td = IL_D.format(new Date(now)), tm = IL_D.format(new Date(now + 864e5));
  return `${d === td ? 'היום' : d === tm ? 'מחר' : `${d.slice(8, 10)}/${d.slice(5, 7)}`} ${t}`;
}
const fmtLocal = (p: string) => { let x = String(p || '').replace(/\D/g, ''); if (x.startsWith('972')) x = '0' + x.slice(3); return x.length === 10 ? `${x.slice(0, 3)}-${x.slice(3)}` : x.length === 9 ? `${x.slice(0, 2)}-${x.slice(2)}` : String(p || ''); };
// deno-lint-ignore no-explicit-any
export function callbackMessage(id: string, l: any, appUrl: string, now = Date.now()) {
  const at = Date.parse(l.callbackAt), late = at < now - 10 * 60e3;
  const log = (l.log || []) as { kind?: string; text?: string }[];
  const lastNote = l.callbackNote || l.nextStep || ([...log].reverse().find(e => e && ['note', 'talk', 'call'].includes(e.kind || '') && e.text) || {}).text || String(l.notes || '').split('\n').filter(Boolean).pop() || '';
  const phone = String(l.phone || '');
  const text = [`📞 ${late ? 'היה צריך לחזור' : 'לחזור'} ל${l.name || 'ליד'} ${whenText(at, now)}`, l.topic || l.area ? `נושא: ${l.topic || l.area}` : '', lastNote ? `הערה אחרונה: ${String(lastNote).slice(0, 300)}` : '', phone ? `טלפון: ${fmtLocal(phone)}` : ''].filter(Boolean).join('\n');
  const base = String(appUrl || '').replace(/\/?$/, '/');
  const tel = intl(phone);
  const kb: { text: string; url: string }[][] = [];
  if (tel && base.startsWith('https://')) kb.push([{ text: '📞 חיוג', url: `${base}app/call.html?n=${tel}` }]);
  if (base.startsWith('https://')) kb.push([{ text: 'פתיחת הליד במערכת', url: `${base}#lead=${encodeURIComponent(id)}` }]);
  return { text, reply_markup: kb.length ? { inline_keyboard: kb } : undefined };
}
async function runCallbacks(dry: boolean) {
  const { data, error } = await admin().from('docs').select('id,data').eq('coll', 'leads').not('data->>callbackAt', 'is', null);
  if (error) throw error;
  // deno-lint-ignore no-explicit-any
  const due = callbacksDue((data || []) as any[]);
  if (dry) return { due: due.map(r => ({ id: r.id, name: r.data.name, at: r.data.callbackAt })), sent: 0 };
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID');
  if (!token || !chat) return { due: due.length, sent: 0, skipped: 'telegram' };
  let sent = 0;
  for (const r of due.slice(0, 10)) {
    const m = callbackMessage(r.id, r.data, env('APP_URL'));
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: chat, text: m.text.slice(0, 4000), disable_web_page_preview: true, reply_markup: m.reply_markup }) }).catch(() => null);
    if (!res || !res.ok) continue;
    await admin().rpc('docs_merge', { p_coll: 'leads', p_id: r.id, p_patch: { callbackNotified: r.data.callbackAt, callbackNotifiedAt: new Date().toISOString() } });
    sent++;
  }
  return { due: due.length, sent };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const secret = env('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'unauthorized' }, 401);
  try {
    const qs = new URL(req.url).searchParams;
    const mode = qs.get('mode') || '';
    const force = qs.get('force') === '1';
    const evening = mode === 'send';
    const il = ilNow();
    // lead callbacks are checked on every run (they are reminders to Yakir at the time he chose)
    const cb = await runCallbacks(mode === 'preview').catch(e => { console.error('callbacks', e); return { error: String(e && (e as Error).message || e) }; });
    if (mode === 'callbacks') return json({ ok: true, callbacks: cb });
    if (mode === 'preview') {
      // dry run: what the runs would do right now. Nothing is sent and nothing is written.
      const O = await loadEngine();
      O.portalBase = env('APP_URL') ? env('APP_URL') + 'portal.html' : '';
      O.signBase = env('APP_URL') ? env('APP_URL') + 'sign.html' : '';
      await loadData(O);
      const q = O.autoQueue().filter(O.autoEligible);
      const nk = keysAt(O, nextRunAt('daily'), () => O.autoQueue().filter(O.autoEligible));
      const leads = O.salesMessages ? O.salesMessages() : [];
      const lk = keysAt(O, nextRunAt('leads'), () => (O.salesMessages ? O.salesMessages() : []));
      const fails = await loadFails().catch(() => ({}));
      // deno-lint-ignore no-explicit-any
      const row = (x: any, k: Set<string> | null) => ({ key: x.key, type: x.type, label: x.label, name: x.name, sendOn: x.sendOn, lastChance: !!k && !k.has(x.key) });
      return json({ ok: true, preview: true, israel: il, provider: provider(), gates: { morning: isMorning(il), evening: isEvening(il), leads: isLeadHours(il) },
        nextDaily: new Date(nextRunAt('daily')).toISOString(), nextLeads: new Date(nextRunAt('leads')).toISOString(),
        // deno-lint-ignore no-explicit-any
        autoNow: q.map((x: any) => row(x, nk)), leadsNow: leads.map((x: any) => row(x, lk)), approvals: O.outboxCandidates().length,
        // deno-lint-ignore no-explicit-any
        openFailures: Object.values(fails).filter((f: any) => !f.resolved).length, callbacks: cb });
    }
    if (mode === 'leads') {
      if (!force && !isLeadHours(il)) return json({ ok: true, skipped: 'outside lead hours (Israel time)', israel: il, callbacks: cb });
      // every hour in working hours: lead messages whose time has come are sent by WhatsApp when a sender is connected,
      // otherwise they go to Telegram with a one-tap send button
      const O = await loadEngine(); await loadData(O, ['leads', 'outbox', 'settings']);
      const due = (O.salesMessages ? O.salesMessages() : []).slice(0, 15);
      const p = provider();
      if (p && p !== 'telegram') {
        const st = O.settings(), done: string[] = [], bad: string[] = [], nowa: string[] = [];
        const fails = await loadFails().catch(() => ({} as Record<string, Fail>));
        let later: Set<string> | null | undefined;
        const nextKeys = () => later !== undefined ? later : (later = keysAt(O, nextRunAt('leads'), () => (O.salesMessages ? O.salesMessages() : [])));
        for (const x of due) {
          if (/~welcome~/.test(x.key) && (await hasWhatsapp(x.phone)) === false) {
            await O.save('outbox', sanitize(x.key), { status: 'dismissed', via: 'no-whatsapp', at: new Date().toISOString(), key: x.key, name: x.name, type: x.type, text: x.text });
            if (x.leadId) { const l = O.get('leads', x.leadId); if (l) await O.patch('leads', x.leadId, { noWhatsapp: true, log: (l.log || []).concat([{ at: new Date().toISOString(), kind: 'system', text: 'למספר אין וואטסאפ, הודעת הפתיחה לא נשלחה. צריך להתקשר.' }]).slice(-80) }); }
            nowa.push(`• ${x.name} (${x.phone})`); continue;
          }
          const r = await send(x.phone, x.text, { name: x.name, signature: st.signature });
          if (!r.ok) {
            const k = nextKeys();
            const f = await noteFailure(fails, x, String(r.error || ''), !!k && !k.has(x.key), 'leads').catch(e => { console.error('outfail', e); return null; });
            bad.push(`• ${f && f.offered ? '📲 ' : ''}${x.label}: ${x.name} (${why(String(r.error || ''))})`); continue;
          }
          await O.save('outbox', sanitize(x.key), { status: 'sent', via: 'auto', at: new Date().toISOString(), key: x.key, name: x.name, type: x.type, text: x.text });
          await noteSent(fails, x.key).catch(() => {});
          if (x.leadId) { const l = O.get('leads', x.leadId); if (l) await O.patch('leads', x.leadId, { log: (l.log || []).concat([{ at: new Date().toISOString(), kind: 'message', text: `נשלחה אוטומטית: ${x.label}` }]).slice(-80) }); }
          done.push(`• ${x.label}: ${x.name}`);
        }
        await closeHandled(O, fails, new Set((O.salesMessages ? O.salesMessages() : []).map((x: any) => x.key))).catch(e => console.error('outfail close', e));
        if (done.length || bad.length || nowa.length) await telegram([done.length ? `📤 נשלחו אוטומטית ללידים (${done.length}):\n${done.join('\n')}` : '', bad.length ? `⚠️ לא נשלחו ללידים (${bad.length}). המערכת תנסה שוב בשעה הבאה:\n${bad.join('\n')}` : '', nowa.length ? `⚠️ למספר הזה אין וואטסאפ. צריך להתקשר אליו:\n${nowa.join('\n')}` : ''].filter(Boolean).join('\n\n')).catch(() => false);
        return json({ ok: true, sent: done.length, failed: bad.length, noWhatsapp: nowa.length });
      }
      if (!env('TELEGRAM_BOT_TOKEN') || !env('TELEGRAM_CHAT_ID')) return json({ ok: true, skipped: 'telegram' });
      let n = 0;
      for (const x of due) {
        const id = uid('q').slice(2, 14);
        const r = await offerOnTelegram(id, x);
        if (!r.ok) continue;
        await admin().from('docs').upsert({ coll: 'tgq', id, data: { key: x.key, name: x.name, leadId: x.leadId, type: x.type, label: x.label, text: x.text } });
        await O.save('outbox', sanitize(x.key), { status: 'snoozed', until: O.addDays(O.today(), 1), offered: true, at: new Date().toISOString(), key: x.key, name: x.name });
        n++;
      }
      return json({ ok: true, offered: n });
    }
    // the summer and the winter cron job both call this; only the one that lands on 08:00 / 17:00 Israel time works
    if (!force && (evening ? !isEvening(il) : !isMorning(il))) return json({ ok: true, skipped: `not ${evening ? '17:00' : '08:00'} in Israel`, israel: il });
    const O = await loadEngine();
    O.portalBase = env('APP_URL') ? env('APP_URL') + 'portal.html' : '';
    O.signBase = env('APP_URL') ? env('APP_URL') + 'sign.html' : '';
    await loadData(O);
    // tell the app which sender is connected; automatic sending starts from today, never for old items
    const p = provider(), main = O.settings(), patch: Record<string, unknown> = {};
    if ((main.sendProvider || '') !== p) patch.sendProvider = p;
    if (p && !main.autoSinceAll) patch.autoSinceAll = O.today();
    if (Object.keys(patch).length) await O.patch('settings', 'main', patch);
    if (!evening) await O.autopilot();
    await loadData(O); // re-read after the automations wrote their changes
    const r = p ? await autoSend(O) : { sent: [], failed: [] };
    await loadData(O);
    const asked = await offerApprovals(O).catch(() => 0);
    if (evening) { const t = sentLines(r); const tg = t ? await telegram(t) : false; return json({ ok: true, sent: r.sent.length, failed: r.failed.length, asked, telegram: tg }); }
    await loadData(O);
    const text = [sentLines(r), digest(O)].filter(Boolean).join('\n\n');
    const tg = await telegram(text);
    return json({ ok: true, sent: r.sent.length, failed: r.failed.length, telegram: tg, text });
  } catch (e) {
    console.error(e);
    await telegram('⚠️ הריצה היומית של מערכת המשרד נכשלה. בדוק את הלוגים ב-Supabase.').catch(() => {});
    return json({ ok: false, error: String(e && (e as Error).message || e) }, 500);
  }
});
