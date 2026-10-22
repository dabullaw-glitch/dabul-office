// Lead intake: website contact forms (any form builder), the FR / EN landing pages, and Facebook Lead Ads
// (through Zapier / Make, with the x-api-key header). Creates the lead in the office system and alerts the
// owner on Telegram with a one-tap WhatsApp welcome message.
// 18.10.2026 (Yakir approved): a repeat from the same phone within 10 minutes of the last entry (double click,
// pressing send again) is still logged on the lead, but does not send another Telegram alert.
// 19.10.2026 (Yakir approved): when the automatic opening message fails inside working hours, the alert says plainly that
// the send failed (short reason) and that the system retries; a separate message with the ready text, a WhatsApp button and
// "✓ נשלח" is sent, and the failure is kept in docs coll 'outfail' so the hourly lead run retries without offering it again.
// The "it will go out at the start of working hours" wording stays only for the real after-hours case.
// 22.10.2026 (Yakir approved): before the opening message the number is checked for WhatsApp. A number without WhatsApp gets
// no message (in or out of working hours), the opening is marked cancelled ('dismissed', via 'no-whatsapp') so the hourly run
// does not send it later, and the Telegram alert says: "⚠️ למספר הזה אין וואטסאפ. צריך להתקשר אליו."
import { loadSecrets, json, cors, admin, uid, telegram, env } from '../_shared/common.ts';
import { provider, send, offerOnTelegram, hasWhatsapp } from '../_shared/send.ts';

// Israeli numbers are stored as 05X..., numbers from abroad (+ or 00 prefix) as +<country><number>
const normIL = (p: string) => { let x = String(p || '').replace(/\D/g, ''); if (x.startsWith('972')) x = '0' + x.slice(3); return x.length >= 9 && x.length <= 10 ? x : ''; };
const normPhone = (p: string) => {
  const s = String(p || '').trim();
  if (/^(\+|00)/.test(s)) { const x = s.replace(/\D/g, '').replace(/^00/, ''); if (!x.startsWith('972')) return x.length >= 8 && x.length <= 15 ? '+' + x : ''; }
  return normIL(s);
};
const waNum = (phone: string) => phone.startsWith('+') ? phone.slice(1) : '972' + phone.slice(1);
const QUIET_MS = 10 * 60e3;
// a short, readable reason for a failed WhatsApp send
const whyFail = (err: string) => {
  const e = String(err || ''), m = e.match(/^green (\d+)/);
  if (e === 'bad_phone') return 'מספר הטלפון לא תקין';
  if (m) return m[1] === '466' ? 'נגמרה מכסת ההודעות בוואטסאפ' : m[1] === '401' || m[1] === '403' ? 'החיבור לוואטסאפ נותק' : `שרת הוואטסאפ החזיר שגיאה ${m[1]}`;
  if (/timed out|timeout|network|fetch|connect/i.test(e)) return 'תקלת תקשורת';
  return 'תקלה בשליחה';
};

// flatten any shape (JSON, nested Elementor "fields[x][value]", Meta field_data, form-encoded) into key -> value
// deno-lint-ignore no-explicit-any
function flatten(o: any, pre = '', out: Record<string, string> = {}) {
  if (o == null) return out;
  if (typeof o !== 'object') { out[pre || 'value'] = String(o); return out; }
  if (Array.isArray(o) && o.every(x => x && typeof x === 'object' && 'name' in x && 'values' in x)) { o.forEach(x => out[String(x.name)] = (x.values || []).join(', ')); return out; }
  if (o.value !== undefined && (o.title || o.id || o.label)) { out[String(o.title || o.label || o.id)] = String(o.value); return out; }
  for (const [k, v] of Object.entries(o)) flatten(v, pre && !/^\d+$/.test(k) ? `${pre}.${k}` : k, out);
  return out;
}
async function readBody(req: Request) {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) return flatten(await req.json().catch(() => ({})));
  if (ct.includes('form')) { const f = await req.formData(); const o: Record<string, string> = {}; f.forEach((v, k) => { if (typeof v === 'string') o[k] = v; }); if (o.field_data) try { Object.assign(o, flatten(JSON.parse(o.field_data))); } catch { /* plain */ } return o; }
  const t = await req.text(); try { return flatten(JSON.parse(t)); } catch { const o: Record<string, string> = {}; new URLSearchParams(t).forEach((v, k) => o[k] = v); return o; }
}
const clean = (f: Record<string, string>) => Object.fromEntries(Object.entries(f).filter(([, v]) => v != null && String(v).trim()).map(([k, v]) => [k.toLowerCase().trim(), String(v).trim()]));
const pick = (f: Record<string, string>, exact: string[], re?: RegExp) => { for (const k of exact) if (f[k]) return f[k]; if (re) for (const [k, v] of Object.entries(f)) if (re.test(k)) return v; return ''; };
const AREAS: [RegExp, string][] = [[/התחדשות|תמ.?א|פינוי/, 'התחדשות עירונית'], [/מיסוי|מס שבח|מס רכישה/, 'מיסוי מקרקעין'], [/חדלות|פשיטת|חובות|הסדר|הוצאה לפועל/, 'חדלות פירעון'], [/ירוש|צוואה/, 'ירושות וצוואות'], [/ייפוי|יפוי/, 'ייפוי כוח מתמשך'], [/דירה|נכס|מקרקעין|קני|מכיר|נדל/, 'מקרקעין']];
const first = (n: string) => String(n || '').trim().split(/[ ,(]/)[0];
const WELCOME = 'שלום {name}, כאן עו"ד יקיר דבול. קיבלתי את הפנייה שלך בנושא {topic}. אשמח לשיחה קצרה ודיסקרטית כדי להבין את התמונה. מתי נוח לך לדבר היום או מחר?';
const WELCOME_FR = 'Bonjour {name}, ici Maître Yakir Dabul. J\'ai bien reçu votre demande concernant votre achat immobilier en Israël. Quand êtes-vous disponible pour un court échange, par téléphone ou par WhatsApp ?';
const WELCOME_EN = 'Hello {name}, this is Adv. Yakir Dabul. I received your request about buying property in Israel. When would suit you for a short call, by phone or WhatsApp?';
// source keys the office system knows; anything else falls back to website / facebook
const SOURCES = ['facebook', 'website', 'referral', 'manual', 'whatsapp', 'broker', 'partner', 'returning', 'gmb', 'social', 'community', 'direct', 'other'];
const SRC_HE: Record<string, string> = { facebook: 'פייסבוק ממומן', website: 'אתר', referral: 'המלצה', manual: 'ידני', whatsapp: 'וואטסאפ', broker: 'מתווך', partner: 'שותף מקצועי',
  returning: 'לקוח חוזר', gmb: 'פרופיל גוגל', social: 'רשתות', community: 'קהילה', direct: 'פנייה ישירה', other: 'אחר' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: { ...cors, 'Access-Control-Allow-Headers': 'content-type, x-api-key' } });
  await loadSecrets().catch(() => {});
  if (req.method !== 'POST') return json({ ok: true, info: 'send a POST with name and phone' });
  const url = new URL(req.url);
  const given = req.headers.get('x-api-key') || url.searchParams.get('key') || '';
  if (given && given !== env('LEAD_KEY')) return json({ ok: false, error: 'unauthorized' }, 401);
  const viaKey = !!given;
  const raw = await readBody(req);
  // spam trap: a hidden field named "website" or "_hp" that people leave empty
  if ((raw.website || raw._hp || '').trim()) return json({ ok: true });
  const f = clean(raw);
  // the phone field may be international; the fallback scan of other fields only trusts Israeli numbers
  const rawPhone = pick(f, ['phone_number', 'phone', 'טלפון', 'mobile', 'tel', 'נייד'], /phone|tel|טלפון|נייד|mobile/i);
  const phone = normPhone(rawPhone) || normIL(Object.values(f).find(v => normIL(v)) || '');
  let name = pick(f, ['full_name', 'fullname', 'full name', 'name', 'שם', 'שם מלא'], /^(?!.*(company|חברה|campaign|ad_|adset|form|page)).*(name|שם)/i);
  if (!name) name = [pick(f, ['first_name', 'שם פרטי']), pick(f, ['last_name', 'שם משפחה'])].filter(Boolean).join(' ');
  const email = pick(f, ['email', 'אימייל', 'מייל'], /mail|דוא/i) || Object.values(f).find(v => /\S+@\S+\.\S+/.test(v)) || '';
  const campaign = pick(f, ['campaign_name', 'campaign']), adName = pick(f, ['ad_name']), metaLeadId = pick(f, ['leadgen_id', 'lead_id', 'meta_lead_id']) || (campaign || viaKey ? pick(f, ['id']) : '');
  const srcIn = (pick(f, ['source']) || url.searchParams.get('source') || '').toLowerCase();
  const source = SOURCES.includes(srcIn) ? srcIn : (campaign || metaLeadId || viaKey ? 'facebook' : 'website');
  const srcHe = SRC_HE[source] || source;
  // a paid lead is never dropped: a phone we could not read is kept in the notes for a manual call
  const notesIn = pick(f, ['notes', 'message', 'הודעה', 'הערות'], /message|msg|notes|הודעה|פירוט|תוכן|comments/i);
  const notes = [rawPhone && !phone ? `טלפון כפי שנשלח: ${rawPhone}` : '', notesIn].filter(Boolean).join('\n');
  const topicIn = pick(f, ['topic', 'נושא', 'service', 'שירות'], /topic|service|תחום|שירות|נושא/i);
  const area = (AREAS.find(([re]) => re.test(`${topicIn} ${notes} ${campaign}`)) || [null, topicIn || (source === 'facebook' ? 'חדלות פירעון' : 'מקרקעין')])[1];
  const topic = topicIn || (area === 'חדלות פירעון' ? 'הסדר חובות' : area);
  const debtRange = pick(f, ['debt_range', 'debt'], /debt|חוב|היקף/i), preferredTime = pick(f, ['preferred_time'], /preferred|נוח|מתי/i);
  const lang = /שפה: צרפתית/.test(notes) || /landing-fr/.test(campaign) ? 'fr' : /שפה: אנגלית/.test(notes) || /landing-en/.test(campaign) ? 'en' : 'he';
  if (!phone && !email && !rawPhone) return json({ ok: false, error: 'missing phone or email' }, 400);
  if (!name) name = source === 'facebook' ? 'ליד מפייסבוק' : 'פונה מהאתר';

  const sb = admin();
  const now = new Date().toISOString();
  // duplicates: the same Facebook lead id, or the same phone within 3 days
  // deno-lint-ignore no-explicit-any
  const { data: recent } = await sb.from('docs').select('id,data').eq('coll', 'leads').gte('data->>created', new Date(Date.now() - 30 * 864e5).toISOString()) as any;
  // deno-lint-ignore no-explicit-any
  const rows = (recent || []) as any[];
  if (metaLeadId && rows.some(r => r.data.metaLeadId === metaLeadId)) return json({ ok: true, duplicate: true });
  const same = phone && rows.find(r => normPhone(r.data.phone) === phone && Date.parse(r.data.created) > Date.now() - 3 * 864e5);
  if (same) {
    // the newest moment we heard from this lead (created or any earlier repeat)
    // deno-lint-ignore no-explicit-any
    const lastAt = Math.max(Date.parse(same.data.created) || 0, ...((same.data.log || []) as any[]).map(e => Date.parse(e && e.at) || 0));
    const quiet = Date.now() - lastAt < QUIET_MS;
    const log = (same.data.log || []).concat([{ at: now, kind: 'system', text: `פנייה נוספת מאותו טלפון (${srcHe}${campaign ? ', ' + campaign : ''})${quiet ? ' · שליחה חוזרת תוך דקות, בלי התראה' : ''}` }]);
    await sb.from('docs').update({ data: Object.assign({}, same.data, { log, notes: [same.data.notes, notes].filter(Boolean).join('\n') }) }).match({ coll: 'leads', id: same.id });
    if (!quiet) await telegram(`🔁 פנייה נוספת מ${same.data.name} (${phone}). נרשמה באותו ליד.`).catch(() => false);
    return json({ ok: true, duplicate: true, id: same.id, quiet });
  }

  const id = uid('l');
  const page = pick(f, ['page', 'url', 'referer', 'עמוד']) || req.headers.get('referer') || '';
  const lead = { name, phone, email, area, topic, debtRange, preferredTime, notes, campaign, adName, metaLeadId, source, lang, stage: 'new', status: 'חדש', stageAt: now, created: now, page, via: source === 'facebook' ? 'facebook-intake' : 'website-form',
    log: [{ at: now, kind: 'created', text: `ליד נכנס ממקור: ${srcHe}${campaign ? ` (${campaign})` : ''}` }] };
  const { error } = await sb.from('docs').insert({ coll: 'leads', id, data: lead });
  if (error) { console.error(error); return json({ ok: false }, 500); }

  const { data: set } = await sb.from('docs').select('data').match({ coll: 'settings', id: 'sales' }).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const tpl = lang === 'fr' ? WELCOME_FR : lang === 'en' ? WELCOME_EN : (((set?.data as any)?.tpl?.welcome) || WELCOME);
  const reply = String(tpl).replace(/\{name\}/g, first(name)).replace(/\{full_name\}/g, name).replace(/\{topic\}/g, topic).replace(/\{debt_range\}/g, debtRange || 'לא צוין').replace(/\{preferred_time\}/g, preferredTime || 'לא צוין');
  const wa = phone ? `https://wa.me/${waNum(phone)}?text=${encodeURIComponent(reply)}` : '';
  const langHe = lang === 'fr' ? '\n🌍 דובר צרפתית' : lang === 'en' ? '\n🌍 דובר אנגלית' : '';
  // a WhatsApp sender is connected: the opening message goes out by itself, right away in working hours
  // (Sun-Thu 08:00-21:00, Fri 08:00-14:00); outside those hours the hourly run sends it when the window opens
  const okey = `sales~${id}~welcome~${now.slice(0, 16)}`, oid = okey.replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');
  const prov = provider(), direct = !!phone && !!prov && prov !== 'telegram';
  let sentNow = false, inHours = false, failErr = '', noWa = false;
  if (direct) {
    const il = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })), d = il.getDay(), h = il.getHours();
    inHours = (d <= 4 && h >= 8 && h < 21) || (d === 5 && h >= 8 && h < 14);
    noWa = (await hasWhatsapp(phone)) === false;
    if (noWa) {
      await sb.from('docs').upsert({ coll: 'outbox', id: oid, data: { status: 'dismissed', via: 'no-whatsapp', at: now, key: okey, name, type: 'lead', text: reply } });
      await sb.rpc('docs_merge', { p_coll: 'leads', p_id: id, p_patch: { noWhatsapp: true, log: lead.log.concat([{ at: new Date().toISOString(), kind: 'system', text: 'למספר אין וואטסאפ, הודעת הפתיחה לא נשלחה. צריך להתקשר.' }]) } });
    }
    if (inHours && !noWa) {
      const r = await send(phone, reply, { name });
      if (!r.ok) failErr = String(r.error || 'unknown');
      if (r.ok) {
        sentNow = true;
        await sb.from('docs').upsert({ coll: 'outbox', id: oid, data: { status: 'sent', via: 'auto', at: now, key: okey, name, type: 'lead', text: reply } });
        await sb.rpc('docs_merge', { p_coll: 'leads', p_id: id, p_patch: { log: lead.log.concat([{ at: new Date().toISOString(), kind: 'message', text: 'נשלחה אוטומטית הודעת פתיחה' }]) } });
      }
    }
  }
  const text = `🆕 ליד חדש · ${srcHe}${langHe}\n👤 ${name}\n📞 ${phone || '-'}${email ? `\n✉️ ${email}` : ''}\n📂 ${topic}${debtRange ? `\n💰 היקף חוב: ${debtRange}` : ''}${preferredTime ? `\n🕐 זמן נוח: ${preferredTime}` : ''}${campaign ? `\n📣 ${campaign}${adName ? ' / ' + adName : ''}` : ''}${notes ? `\n📝 ${notes.slice(0, 400)}` : ''}${noWa ? '\n\n⚠️ למספר הזה אין וואטסאפ. צריך להתקשר אליו.' : sentNow ? '\n\n✅ הודעת פתיחה נשלחה אליו אוטומטית בוואטסאפ.' : direct && inHours ? `\n\n⚠️ השליחה האוטומטית של הודעת הפתיחה נכשלה (${whyFail(failErr)}). המערכת תנסה לשלוח שוב בשעה הקרובה, ואפשר גם לשלוח עכשיו בכפתור "הודעת פתיחה בוואטסאפ".` : direct ? '\n\n🕗 הודעת הפתיחה תצא אוטומטית בתחילת שעות הפעילות.' : ''}\n\nכדאי להתקשר בשעה הקרובה. ליד שמקבל מענה מהיר נסגר הרבה יותר.`;
  if (env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID')) {
    const kb = [[...(phone && !noWa ? [{ text: '💬 הודעת פתיחה בוואטסאפ', url: wa }] : []), ...(env('APP_URL') ? [{ text: '📋 פתיחה במערכת', url: `${env('APP_URL')}#leads/${id}` }] : [])]];
    await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), text, disable_web_page_preview: true, reply_markup: kb[0].length ? { inline_keyboard: kb } : undefined }) }).catch(() => {});
    // without a WhatsApp sender the opening goes out from the Telegram button; it is marked handled so it is never offered again
    if (phone && !direct) await sb.from('docs').upsert({ coll: 'outbox', id: oid, data: { status: 'sent', via: 'telegram-offer', offered: true, at: now, key: okey, name } });
  }
  // the automatic opening failed in working hours: keep the failure (the hourly lead run retries it) and give Yakir one
  // message with the ready text and "✓ נשלח", so a message he sends himself is not sent again
  if (direct && inHours && !sentNow && !noWa) {
    const at = new Date().toISOString(), label = 'הודעת פתיחה';
    let offered = false;
    if (env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID')) {
      const qid = uid('q').slice(2, 14);
      const o = await offerOnTelegram(qid, { label: `⚠️ לא נשלחה אוטומטית (${whyFail(failErr)}). המערכת תנסה שוב בשעה הקרובה. אם שלחת בעצמך, לחץ "✓ נשלח" כדי שלא תישלח שוב · ${label}`, name, phone, text: reply }).catch(() => ({ ok: false }));
      if (o.ok) { offered = true; await sb.from('docs').upsert({ coll: 'tgq', id: qid, data: { key: okey, name, phone, leadId: id, type: 'lead', label, text: reply } }); }
    }
    await sb.rpc('docs_merge', { p_coll: 'outfail', p_id: oid, p_patch: { key: okey, type: 'lead', label, name, leadId: id, attempts: 1, lastError: failErr.slice(0, 200), firstAt: at, lastAt: at, mode: 'lead-intake', resolved: false, offered, offeredAt: offered ? at : null } });
  }

  const back = url.searchParams.get('redirect');
  if (back && /^https:\/\//.test(back)) return new Response(null, { status: 303, headers: { ...cors, location: back } });
  return json({ ok: true, id });
});
