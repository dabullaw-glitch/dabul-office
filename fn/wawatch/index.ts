// wawatch (25.10.2026, Yakir approved: "צריך לבדוק שזה באמת שולח הודעות וואטסאפ, ואם למישהו אין וואטסאפ שיכתוב לי במערכת",
// and "אם מישהו כתב משהו, שאני אדע בדיוק מה הוא כתב ושזה יהיה מולי"). Cron every 10 minutes, cron secret only.
// 1. Delivery: every message the office sent automatically in the last 3 days is looked up in the WhatsApp journal
//    (Green API). Its state is kept on the outbox row (deliv: sent / delivered / read / failed / noAccount).
//    A message that did not arrive (no WhatsApp on the number, or failed) is written on the lead, the lead is marked
//    "אין וואטסאפ" when that is the reason, and Yakir gets one Telegram line.
// 2. Replies: a WhatsApp message from the phone of a lead is written on that lead (the exact text, shown in the lead window
//    under "מה הליד כתב"), the follow-ups stop, and Yakir gets the text on Telegram. Messages from anyone else are ignored
//    and not stored.
import { loadSecrets, json, admin, env, telegram } from '../_shared/common.ts';
import { provider, intl, hasWhatsapp, hideSecrets } from '../_shared/send.ts';

// deno-lint-ignore no-explicit-any
type Any = any;
const LABEL: Record<string, string> = { welcome: 'הודעת פתיחה', followup_1: 'מעקב יום 1', followup_2: 'מעקב יום 3', followup_3: 'מעקב יום 7', contacted_followup_1: 'מעקב לקביעת פגישה (יום 2)', contacted_followup_2: 'מעקב לקביעת פגישה (יום 5)', meeting_reminder_day: 'תזכורת יום לפני שיחה', meeting_reminder_hour: 'תזכורת שעה לפני', meeting_thanks: 'תודה אחרי השיחה', no_show: 'לא הגיע לשיחה', proposal_reminder: 'תזכורת להצעת מחיר', proposal_followup_2: 'מעקב הצעה (יום 7)', proposal_final: 'מעקב הצעה אחרון (יום 14)' };
const labelOf = (key: string) => { const p = String(key || '').split('~'); return p[0] === 'sales' ? (LABEL[p[2]] || (p[2] || '').startsWith('call_missed') && 'הודעה אחרי שיחה ללא מענה' || 'הודעה') : 'הודעה'; };
const BAD: Record<string, string> = { noAccount: 'למספר אין וואטסאפ', failed: 'השליחה נכשלה בוואטסאפ', notInGroup: 'השליחה נכשלה' };
const FINAL = ['read', 'failed', 'noAccount', 'notInGroup'];
const base = () => `${(env('GREEN_API_URL') || 'https://api.green-api.com').replace(/\/$/, '')}/waInstance${env('GREEN_API_INSTANCE')}`;
async function journal(kind: 'lastOutgoingMessages' | 'lastIncomingMessages', minutes: number): Promise<Any[]> {
  const r = await fetch(`${base()}/${kind}/${env('GREEN_API_TOKEN')}?minutes=${minutes}`, { signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(hideSecrets(`green ${kind} ${r.status}`));
  const j = await r.json().catch(() => []);
  return Array.isArray(j) ? j : [];
}
const digits = (chat: string) => String(chat || '').replace(/@.*/, '').replace(/\D/g, '');
const textOf = (m: Any) => String(m.textMessage || m.extendedTextMessage?.text || m.caption || m.fileMessageData?.caption || '').trim()
  || ({ imageMessage: '[תמונה]', videoMessage: '[סרטון]', documentMessage: '[מסמך]', audioMessage: '[הודעה קולית]', locationMessage: '[מיקום]', contactMessage: '[איש קשר]', stickerMessage: '[מדבקה]' } as Record<string, string>)[m.typeMessage] || '[הודעה]';
const now = () => new Date().toISOString();
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const ilTime = (ms: number) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(ms));

// a message that did not arrive: written on the lead (and the lead marked "אין וואטסאפ" when that is why), one Telegram line
async function markBad(key: string, d: Any, lead: Any, phone: string, st: string, at: number, alerts: string[]) {
  const why = BAD[st], label = labelOf(key);
  if (lead) {
    const cur = (await admin().from('docs').select('data').match({ coll: 'leads', id: lead.id }).maybeSingle()).data?.data || lead;
    const lp: Any = { log: (cur.log || []).concat([{ at: now(), kind: 'system', text: `ההודעה "${label}" מ־${ilTime(at)} לא הגיעה אליו: ${why}. צריך להתקשר.` }]).slice(-80) };
    if (st === 'noAccount') Object.assign(lp, { noWhatsapp: true, wa: false, waCheckedAt: now() });
    await merge('leads', lead.id, lp);
    alerts.push(`⚠️ ${lead.name} (${phone}): ההודעה "${label}" לא הגיעה. ${why}. צריך להתקשר אליו.`);
  } else alerts.push(`⚠️ ${d.name || phone}: הודעה מ־${ilTime(at)} לא הגיעה. ${why}.`);
}
const RANK: Record<string, number> = { pending: 0, sent: 1, delivered: 2, read: 3, failed: 9, noAccount: 9, notInGroup: 9 };

// a WhatsApp message from the phone of a lead (from the journal or from a live notification)
async function takeIncoming(leads: Any[], m: { chatId: string; idMessage: string; timestamp: number; text: string }) {
  const sb = admin();
  const chat = String(m.chatId || ''); if (!chat.endsWith('@c.us')) return false;
  const ph = digits(chat);
  const lead = leads.filter(l => l.phone && intl(l.phone) === ph).sort((a, b) => String(b.created || '').localeCompare(String(a.created || '')))[0];
  if (!lead) return false; // not a lead: nothing is stored
  const id = 'wi-' + String(m.idMessage || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80); if (id === 'wi-') return false;
  const at = new Date((m.timestamp || 0) * 1000 || Date.now()).toISOString(), text = m.text || '[הודעה]';
  const ins = await sb.from('docs').upsert({ coll: 'wain', id, data: { leadId: lead.id, at, text } }, { onConflict: 'coll,id', ignoreDuplicates: true }).select('id');
  if (!ins.data || !ins.data.length) return false; // already recorded
  const cur = (await sb.from('docs').select('data').match({ coll: 'leads', id: lead.id }).maybeSingle()).data?.data || lead;
  const p: Any = { waIn: (cur.waIn || []).concat([{ at, text: text.slice(0, 3000), id: m.idMessage }]).slice(-40), lastInAt: at,
    log: (cur.log || []).concat([{ at, kind: 'reply', text: `הליד כתב בוואטסאפ: "${text.slice(0, 500)}"` }]).slice(-80) };
  const st = cur.stage || 'new';
  if (!cur.repliedAt || st === 'lost' && cur.lostAuto) p.repliedAt = at;
  if (st === 'new' && !cur.repliedAt) Object.assign(p, { stage: 'contacted', status: 'בטיפול', stageAt: now() });
  if (st === 'lost' && cur.lostAuto) { Object.assign(p, { stage: 'contacted', status: 'בטיפול', stageAt: now(), lostAuto: false }); p.log.push({ at: now(), kind: 'stage', text: 'לא רלוונטי ← נוצר קשר (הליד כתב)' }); }
  await merge('leads', lead.id, p);
  const app = env('APP_URL');
  await telegram(`💬 ${lead.name} כתב בוואטסאפ:\n"${text.slice(0, 1500)}"${st === 'lost' && cur.lostAuto ? '\n\nהליד חזר מ"לא רלוונטי" ל"נוצר קשר".' : !cur.repliedAt && st === 'new' ? '\n\nהודעות המעקב נעצרו, והליד עבר ל"נוצר קשר".' : ''}${app ? `\n\n👉 ${app}#leads/${lead.id}` : ''}`).catch(() => false);
  return true;
}

async function run() {
  if (provider() !== 'green') return { ok: true, skipped: 'no green sender' };
  const sb = admin(), out: Any = { checked: 0, updated: 0, bad: 0, replies: 0 }, alerts: string[] = [];
  const { data: leadRows } = await sb.from('docs').select('id,data').eq('coll', 'leads');
  const leads: Any[] = (leadRows || []).map((r: Any) => Object.assign({ id: r.id }, r.data));
  const leadById = new Map(leads.map(l => [l.id, l]));

  // ---------- 1. delivery of what the office sent ----------
  const since = new Date(Date.now() - 72 * 36e5).toISOString();
  const { data: obRows } = await sb.from('docs').select('id,data').eq('coll', 'outbox').eq('data->>status', 'sent').gte('data->>at', since);
  const rows = (obRows || []).filter((r: Any) => ['auto', 'approved'].includes(r.data.via) && !FINAL.includes(r.data.deliv || ''));
  if (rows.length) {
    const sent = await journal('lastOutgoingMessages', 4320);
    const byId = new Map(sent.map(m => [m.idMessage, m]));
    const { data: cl } = await sb.from('docs').select('id,data->>phone').eq('coll', 'clients');
    const clientPhone = new Map((cl || []).map((c: Any) => [c.id, c.phone]));
    for (const r of rows) {
      const d = r.data, key = String(d.key || ''), leadId = d.leadId || (key.startsWith('sales~') ? key.split('~')[1] : '');
      const lead = leadId ? leadById.get(leadId) : null;
      const phone = d.phone || (lead && lead.phone) || (d.clientId && clientPhone.get(d.clientId)) || '';
      if (!phone) continue;
      out.checked++;
      const to = intl(phone), at = Date.parse(d.at) || 0, head = String(d.text || '').replace(/\s+/g, ' ').slice(0, 40);
      let m = d.msgId ? byId.get(d.msgId) : null;
      if (!m) m = sent.find(x => digits(x.chatId) === to && Math.abs(x.timestamp * 1000 - at) < 15 * 60e3 && (!head || textOf(x).replace(/\s+/g, ' ').startsWith(head.slice(0, 25))));
      let st = m ? String(m.statusMessage || 'sent') : '';
      if (!m && Date.now() - at > 10 * 60e3 && (await hasWhatsapp(phone)) === false) st = 'noAccount';
      if (!st || st === d.deliv || (RANK[st] ?? 0) <= (RANK[d.deliv] ?? -1)) { if (m && m.idMessage && !d.msgId) await merge('outbox', r.id, { msgId: m.idMessage }); continue; }
      const patch: Any = { deliv: st, delivAt: now() };
      if (m && m.idMessage && !d.msgId) patch.msgId = m.idMessage;
      await merge('outbox', r.id, patch); out.updated++;
      if (BAD[st]) { out.bad++; await markBad(key, d, lead, phone, st, at, alerts); }
    }
  }

  // ---------- 2. what leads wrote back ----------
  const inc = await journal('lastIncomingMessages', 40).catch(() => [] as Any[]);
  for (const m of inc) if (await takeIncoming(leads, { chatId: m.chatId, idMessage: m.idMessage, timestamp: m.timestamp, text: textOf(m) })) out.replies++;
  // ---------- 3. three messages and no answer: the lead moves to "לא רלוונטי" (reason "לא ענה") ----------
  // Yakir 25.10.2026: "אחרי פעם שלישית זהו, להעביר ללא ענה". Counted since the last sign of contact (a reply, a call that was
  // answered). If the lead writes back later, step 2 brings him back to "נוצר קשר".
  const STAGE_HE: Record<string, string> = { new: 'ליד חדש', contacted: 'נוצר קשר', no_show: 'לא הגיע' };
  const lost: string[] = [];
  for (const l0 of leads) {
    const stg = l0.stage || 'new'; if (!STAGE_HE[stg]) continue;
    const l = (await sb.from('docs').select('data').match({ coll: 'leads', id: l0.id }).maybeSingle()).data?.data; if (!l || (l.stage || 'new') !== stg) continue;
    const touch = Math.max(Date.parse(l.repliedAt || '') || 0, Date.parse(l.lastInAt || '') || 0, ...(l.calls || []).filter((c: Any) => c.ok).map((c: Any) => Date.parse(c.at) || 0),
      ...(l.log || []).filter((e: Any) => e && ['reply', 'talk'].includes(e.kind)).map((e: Any) => Date.parse(e.at) || 0));
    const sentCount = (l.log || []).filter((e: Any) => e && e.kind === 'message' && (Date.parse(e.at) || 0) > touch).length;
    if (sentCount < 3) continue;
    const at = now(), note = 'נשלחו 3 הודעות בלי מענה. הועבר לבד ל"לא רלוונטי".';
    await merge('leads', l0.id, { stage: 'lost', status: 'לא רלוונטי', stageAt: at, lostReason: 'לא ענה', lostNote: note, lostAt: at, lostAuto: true,
      log: (l.log || []).concat([{ at, kind: 'stage', text: `${STAGE_HE[stg]} ← לא רלוונטי` }, { at, kind: 'stage', text: `לא רלוונטי · לא ענה: ${note}` }]).slice(-80) });
    lost.push(`• ${l.name}${l.phone ? ` (${l.phone})` : ''}`);
  }
  if (lost.length) alerts.push(`📕 עברו ל"לא רלוונטי" (לא ענה אחרי 3 הודעות):\n${lost.join('\n')}\nאם מישהו מהם יכתוב, הוא יחזור לבד ל"נוצר קשר".`);
  out.movedLost = lost.length;
  if (alerts.length) await telegram(alerts.join('\n\n')).catch(() => false);
  return { ok: true, ...out };
}

// live notifications from the WhatsApp sender (turned on 25.10.2026, Yakir approved): message states and incoming messages
async function hook(b: Any) {
  const sb = admin();
  if (b.typeWebhook === 'outgoingMessageStatus') {
    const id = String(b.idMessage || ''), st = String(b.status || ''); if (!id || !st) return { ok: true };
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'outbox').eq('data->>msgId', id).limit(1);
    const r = data && data[0]; if (!r) return { ok: true, skip: 'not ours' };
    if ((RANK[st] ?? 0) <= (RANK[r.data.deliv] ?? 0)) return { ok: true, skip: 'older state' };
    await merge('outbox', r.id, { deliv: st, delivAt: now() });
    if (BAD[st]) {
      const d = r.data, key = String(d.key || ''), leadId = d.leadId || (key.startsWith('sales~') ? key.split('~')[1] : '');
      const lead = leadId ? (await sb.from('docs').select('id,data').match({ coll: 'leads', id: leadId }).maybeSingle()).data : null;
      const alerts: string[] = [];
      await markBad(key, d, lead ? Object.assign({ id: lead.id }, lead.data) : null, d.phone || (lead && lead.data.phone) || '', st, Date.parse(d.at) || Date.now(), alerts);
      if (alerts.length) await telegram(alerts.join('\n\n')).catch(() => false);
    }
    return { ok: true };
  }
  if (b.typeWebhook === 'incomingMessageReceived') {
    const md = b.messageData || {}, t = md.typeMessage;
    if (t === 'reactionMessage') return { ok: true };
    const text = String(md.textMessageData?.textMessage || md.extendedTextMessageData?.text || md.fileMessageData?.caption || '').trim()
      || ({ imageMessage: '[תמונה]', videoMessage: '[סרטון]', documentMessage: '[מסמך]', audioMessage: '[הודעה קולית]', locationMessage: '[מיקום]', contactMessage: '[איש קשר]', stickerMessage: '[מדבקה]' } as Record<string, string>)[t] || '[הודעה]';
    const { data: leadRows } = await sb.from('docs').select('id,data').eq('coll', 'leads');
    const leads: Any[] = (leadRows || []).map((r: Any) => Object.assign({ id: r.id }, r.data));
    await takeIncoming(leads, { chatId: b.senderData?.chatId || '', idMessage: b.idMessage || '', timestamp: b.timestamp || 0, text });
    return { ok: true };
  }
  return { ok: true, skip: b.typeWebhook || '' };
}

Deno.serve(async (req) => {
  await loadSecrets().catch(() => {});
  const hk = env('WAWATCH_HOOK'), given = new URL(req.url).searchParams.get('k') || '', auth = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (hk && (given === hk || auth === hk)) {
    const b = await req.json().catch(() => ({}));
    try { return json(await hook(b)); } catch (e) { console.error(e); return json({ ok: false }); }
  }
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  try { return json(await run()); } catch (e) { console.error(e); return json({ ok: false, error: hideSecrets(String((e as Error).message || e)) }, 500); }
});
