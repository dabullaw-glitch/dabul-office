// Inquiries from the public forms of nws.co.il (table hns_requests). Payments are NOT connected: a purchase request is saved,
// Yakir gets it in Telegram and follows up by himself.
// Public: POST {action:'request', type, ...}. Checks: hidden field company_fax, minimum fill time (t >= 3000 ms), Turnstile when
// NWS_TURNSTILE_SECRET exists, field validation, privacy consent, rate limits (per sender 5 an hour and 12 a day, per phone 4 a day,
// overall 60 an hour) and a repeat of the same text within 10 minutes (answered "thanks" without saving again).
// Telegram: one message per request with buttons "✓ טופל" (hns:biz:rq:<id>) and "🗑 ספאם" (hns:biz:sp:<id>), plus a WhatsApp
// button when the phone is a mobile number. A tip photo is saved in the private bucket hns-tips and sent under the message.
import { Any, sb, S, clean, phoneOf, urlOk, emailOk, sha, ipOf, tg, tgPhoto, waLink, mail } from './lib.ts';

export const OFFERS: Record<string, string> = {
  featured: 'קידום במדריך (עסק מומלץ)', leader: 'מוביל בקטגוריה במדריך', sponsored: 'כתבת תוכן שיווקי', tgpost: 'פוסט ממומן בטלגרם',
  banner: 'באנר באתר', event: 'אירוע מקודם', newsletter: 'חסות לניוזלטר', other: 'משהו אחר',
};
const TYPE_OF_OFFER: Record<string, string> = { featured: 'promote', leader: 'promote', sponsored: 'sponsored', banner: 'banner' };
export const TYPE_HE: Record<string, string> = {
  contact: 'פנייה כללית', advertise: 'בקשת פרסום', sponsored: 'בקשה לכתבת תוכן שיווקי', promote: 'בקשה לקידום במדריך', banner: 'בקשה לבאנר',
  tip: 'ידיעה מקורא', correction: 'בקשת תיקון או הסרה', newsletter: 'הרשמה לניוזלטר',
};
const ICON: Record<string, string> = { contact: '✉️', advertise: '💼', sponsored: '📰', promote: '⭐', banner: '🖼', tip: '📣', correction: '🛠', newsletter: '📬' };
const STATUS_HE: Record<string, string> = { new: 'חדשה', handled: 'טופלה', spam: 'ספאם' };
const LANGS = ['he', 'ru', 'fr', 'en'];

const MSG: Record<string, Record<string, string>> = {
  he: { ok: 'תודה! קיבלנו את הפנייה ונחזור אליכם בהקדם.', tip: 'תודה! הידיעה הגיעה למערכת. נבדוק אותה לפני כל פרסום.', newsletter: 'תודה! נעדכן אתכם במייל כשהניוזלטר יתחיל.',
    fix: 'יש שדות שצריך לתקן', many: 'נשלחו יותר מדי פניות. נסו שוב מאוחר יותר.', fail: 'השליחה נכשלה, נסו שוב בעוד דקה.', sec: 'בדיקת האבטחה לא עברה. רעננו את הדף ונסו שוב.',
    phone: 'מספר טלפון לא תקין', email: 'כתובת מייל לא תקינה', reach: 'השאירו טלפון או מייל כדי שנוכל לחזור אליכם', msg: 'כתבו כמה מילים על הפנייה',
    story: 'ספרו מה קרה, איפה ומתי (לפחות 10 תווים)', name: 'כתבו שם', url: 'הדביקו את הקישור לידיעה', consent: 'צריך לאשר את מדיניות הפרטיות', offer: 'בחרו במה אתם מתעניינים', photo: 'אפשר לצרף תמונה אחת עד 6MB (JPG, PNG או WEBP)' },
  en: { ok: 'Thank you! We received your message and will get back to you soon.', tip: 'Thank you! Your tip reached the newsroom. We check every tip before publishing.', newsletter: 'Thank you!',
    fix: 'Please fix the marked fields', many: 'Too many messages. Please try again later.', fail: 'Sending failed, please try again in a minute.', sec: 'Security check failed. Reload the page and try again.',
    phone: 'Invalid phone number', email: 'Invalid email', reach: 'Leave a phone or email so we can reply', msg: 'Write a few words', story: 'Tell us what happened, where and when',
    name: 'Write your name', url: 'Paste the link', consent: 'Please accept the privacy policy', offer: 'Choose an option', photo: 'One image up to 6MB (JPG, PNG or WEBP)' },
  ru: { ok: 'Спасибо! Мы получили ваше сообщение и скоро ответим.', tip: 'Спасибо! Новость получена. Мы проверяем каждое сообщение перед публикацией.', newsletter: 'Спасибо!',
    fix: 'Исправьте отмеченные поля', many: 'Слишком много сообщений. Попробуйте позже.', fail: 'Не удалось отправить, попробуйте через минуту.', sec: 'Проверка безопасности не пройдена. Обновите страницу.',
    phone: 'Неверный номер телефона', email: 'Неверный email', reach: 'Оставьте телефон или email', msg: 'Напишите несколько слов', story: 'Расскажите, что, где и когда произошло',
    name: 'Укажите имя', url: 'Вставьте ссылку', consent: 'Подтвердите политику конфиденциальности', offer: 'Выберите вариант', photo: 'Одно фото до 6 МБ (JPG, PNG или WEBP)' },
  fr: { ok: 'Merci ! Nous avons bien reçu votre message et vous répondrons bientôt.', tip: 'Merci ! Votre info est arrivée à la rédaction. Chaque info est vérifiée avant publication.', newsletter: 'Merci !',
    fix: 'Corrigez les champs indiqués', many: 'Trop de messages. Réessayez plus tard.', fail: 'Envoi impossible, réessayez dans une minute.', sec: 'Vérification de sécurité échouée. Rechargez la page.',
    phone: 'Numéro de téléphone invalide', email: 'Email invalide', reach: 'Laissez un téléphone ou un email', msg: 'Écrivez quelques mots', story: 'Dites-nous quoi, où et quand',
    name: 'Indiquez votre nom', url: 'Collez le lien', consent: 'Acceptez la politique de confidentialité', offer: 'Choisissez une option', photo: 'Une image jusqu’à 6 Mo (JPG, PNG ou WEBP)' },
};

function requestText(r: Any) {
  const L = [
    `${ICON[r.type] || '📩'} ${TYPE_HE[r.type] || r.type}, חדשות נתניה והשרון (פנייה #${r.id})`, '',
    r.offer ? `במה מתעניינים: ${OFFERS[r.offer] || r.offer}` : '',
    r.business ? `עסק: ${r.business}` : '', r.name ? `שם: ${r.name}` : '', r.phone ? `טלפון: ${r.phone}` : '', r.email ? `מייל: ${r.email}` : '',
    r.url ? `קישור: ${r.url}` : '', '',
    r.message ? (r.type === 'tip' ? 'הידיעה:' : 'ההודעה:') : '', r.message || '', '',
    r.type === 'tip' ? (r.photo_path ? `צורפה תמונה (${r.photo_ok ? 'מאשרים לפרסם אותה' : 'בלי אישור לפרסם אותה'})` : '') : '',
    ['advertise', 'sponsored', 'promote', 'banner'].includes(r.type) ? 'התשלום לא מחובר לאתר: צריך לחזור אליהם ידנית.' : '',
    r.lang && r.lang !== 'he' ? `שפת הטופס: ${r.lang}` : '',
    r.page ? `נשלח מהדף: ${r.page}` : '', r.is_test ? '\n🧪 פנייה לבדיקת המערכת, אין צורך לטפל' : '',
  ];
  return L.filter((x, i, a) => x !== '' || (a[i - 1] !== '' && i > 0)).join('\n').trim().slice(0, 4000);
}
export const requestButtons = (r: Any) => {
  const row: Any[] = [{ text: '✓ טופל', callback_data: `hns:biz:rq:${r.id}` }, { text: '🗑 ספאם', callback_data: `hns:biz:sp:${r.id}` }];
  const wa = waLink(r.phone || '');
  return { inline_keyboard: wa ? [row, [{ text: 'וואטסאפ אליהם', url: wa }]] : [row] };
};

function photoOf(s: unknown): { bytes: Uint8Array; mime: string } | null | 'bad' {
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(s || ''));
  if (!s) return null;
  if (!m) return 'bad';
  const bin = atob(m[2]);
  if (bin.length > 6 * 1024 * 1024 || bin.length < 200) return 'bad';
  const bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { bytes, mime: m[1] };
}

export async function request(b: Any, req: Request, admin: boolean) {
  const lang = LANGS.includes(b.lang) ? b.lang : 'he';
  const M = MSG[lang];
  const test = admin && !!b.test;
  if (!test && (clean(b.company_fax) || Number(b.t || 0) < 3000)) return { ok: true, id: null, message: M.ok };
  const ip = ipOf(req);
  const ipHash = await sha(`${ip}|${S.CRON_SECRET}`);
  if (!test && S.NWS_TURNSTILE_SECRET) {
    const fd = new FormData(); fd.set('secret', S.NWS_TURNSTILE_SECRET); fd.set('response', String(b.turnstile || '')); if (ip !== 'none') fd.set('remoteip', ip);
    const v = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd, signal: AbortSignal.timeout(10000) }).then((r) => r.json()).catch(() => ({ success: false }));
    if (!v.success) return { ok: false, status: 400, error: M.sec };
  }
  let type = String(b.type || '');
  const offer = OFFERS[b.offer] ? String(b.offer) : '';
  if (type === 'advertise' && offer) type = TYPE_OF_OFFER[offer] || 'advertise';
  if (!TYPE_HE[type]) return { ok: false, status: 400, error: M.fail };
  const R: Any = {
    type, offer: offer || null, name: clean(b.name, 80) || null, phone: b.phone ? phoneOf(b.phone) : '', email: b.email ? emailOk(clean(b.email, 200)) : '',
    business: clean(b.business, 100) || null, message: clean(b.message, 3000) || null, url: null, page: clean(b.page, 300) || null, lang,
    photo_ok: b.photo_ok === true || b.photo_ok === 'on' || b.photo_ok === '1', consent: b.consent === true || b.consent === 'on' || b.consent === '1',
  };
  // "contact" lets people write a phone or an email in one field (corrections form)
  if (b.reach) { const p = phoneOf(b.reach), e = emailOk(clean(b.reach, 200)); if (p) R.phone = p; else if (e) R.email = e; }
  const errs: Record<string, string> = {};
  if (b.phone && !R.phone) errs.phone = M.phone;
  if (b.email && !R.email) errs.email = M.email;
  if (b.reach && !R.phone && !R.email) errs.reach = M.reach;
  if (type === 'correction') {
    const u = urlOk(clean(b.url, 400)) || (String(b.url || '').startsWith('/') ? 'https://nws.co.il' + clean(b.url, 380) : '');
    if (!u) errs.url = M.url; else R.url = u;
    if (!R.message || R.message.length < 5) errs.message = M.msg;
    if (!R.name) errs.name = M.name;
    if (!R.phone && !R.email && !errs.reach) errs.reach = M.reach;
  } else if (type === 'tip') {
    if (!R.message || R.message.length < 10) errs.message = M.story;
    if (!R.phone && !errs.phone) errs.phone = M.phone;
  } else if (type === 'newsletter') {
    if (!R.email && !errs.email) errs.email = M.email;
  } else if (type === 'contact') {
    if (!R.message || R.message.length < 5) errs.message = M.msg;
    if (!R.phone && !R.email && !errs.phone && !errs.email) errs.phone = M.reach;
  } else { // advertise, sponsored, promote, banner
    if (!R.name) errs.name = M.name;
    if (!R.phone && !errs.phone) errs.phone = M.phone;
    if (!offer) errs.offer = M.offer;
  }
  if (!R.consent) errs.consent = M.consent;
  const photo = type === 'tip' ? photoOf(b.photo) : null;
  if (photo === 'bad') errs.photo = M.photo;
  if (Object.keys(errs).length) return { ok: false, status: 400, error: M.fix, fields: errs };

  if (!test) {
    const hourAgo = new Date(Date.now() - 3600e3).toISOString(), dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString(), tenAgo = new Date(Date.now() - 600e3).toISOString();
    const { data: mine } = await sb.from('hns_requests').select('id,created_at,message,type').eq('ip_hash', ipHash).gte('created_at', dayAgo).order('id', { ascending: false });
    const same = (mine || []).find((r: Any) => r.created_at >= tenAgo && r.type === type && (r.message || '') === (R.message || ''));
    if (same) return { ok: true, id: same.id, duplicate: true, message: type === 'tip' ? M.tip : type === 'newsletter' ? M.newsletter : M.ok };
    const lastHour = (mine || []).filter((r: Any) => r.created_at >= hourAgo).length;
    let phoneDay = 0;
    if (R.phone) { const { count } = await sb.from('hns_requests').select('id', { count: 'exact', head: true }).eq('phone', R.phone).gte('created_at', dayAgo); phoneDay = count || 0; }
    const { count: all } = await sb.from('hns_requests').select('id', { count: 'exact', head: true }).gte('created_at', hourAgo);
    if (lastHour >= 5 || (mine || []).length >= 12 || phoneDay >= 4 || (all || 0) >= 60) return { ok: false, status: 429, error: M.many };
  }
  const now = new Date().toISOString();
  const row = { ...R, phone: R.phone || null, email: R.email || null, consent_at: now, ip_hash: ipHash, is_test: test, extra: b.listing_id ? { listing_id: Number(b.listing_id) || null } : {} };
  const { data: ins, error } = await sb.from('hns_requests').insert(row).select('*').single();
  if (error) return { ok: false, status: 500, error: M.fail };
  if (photo && photo !== 'bad') {
    const path = `${now.slice(0, 7)}/${ins.id}.${photo.mime.split('/')[1].replace('jpeg', 'jpg')}`;
    const up = await sb.storage.from('hns-tips').upload(path, photo.bytes, { contentType: photo.mime, upsert: true });
    if (!up.error) { ins.photo_path = path; await sb.from('hns_requests').update({ photo_path: path }).eq('id', ins.id); }
  }
  let sent = false;
  if (!test || b.tg) {
    const r = await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, text: requestText(ins), disable_web_page_preview: true, reply_markup: requestButtons(ins) });
    if (r?.ok) {
      sent = true;
      await sb.from('hns_requests').update({ tg_sent_at: new Date().toISOString(), tg_message_id: r.result?.message_id ?? null }).eq('id', ins.id);
      if (photo && photo !== 'bad') await tgPhoto(photo.bytes, photo.mime, `התמונה שצורפה לידיעה #${ins.id}`, r.result?.message_id);
    }
  }
  const message = type === 'tip' ? M.tip : type === 'newsletter' ? M.newsletter : M.ok;
  if (R.email && lang === 'he' && type !== 'newsletter') {
    const ok = await mail(R.email, 'קיבלנו את הפנייה שלכם, חדשות נתניה והשרון', [
      `שלום${R.name ? ' ' + R.name : ''},`, `קיבלנו את הפנייה שלכם (${TYPE_HE[type]}).`, type === 'tip' ? 'כל ידיעה מקוראים נבדקת לפני פרסום. אם נצטרך פרטים נוספים, נחזור אליכם.' : 'נחזור אליכם בהקדם.',
      'אם לא אתם שלחתם את הטופס, אפשר להתעלם מהמייל הזה.' ]);
    if (ok) await sb.from('hns_requests').update({ mail_sent_at: new Date().toISOString() }).eq('id', ins.id);
  }
  return { ok: true, id: ins.id, sent, message, ...(test ? { preview: requestText(ins) } : {}) };
}

// a tap on "✓ טופל" / "🗑 ספאם" (Telegram) or the same action from the panel. cq: {id?, chat_id, message_id}
export async function requestDecide(act: string, id: number, cq: Any, by = 'yakir') {
  const answer = (text: string) => cq?.id ? tg('answerCallbackQuery', { callback_query_id: cq.id, text }) : null;
  const status = act === 'rq' || act === 'handled' ? 'handled' : act === 'sp' || act === 'spam' ? 'spam' : act === 'rn' || act === 'new' ? 'new' : '';
  if (!status || !id) { await answer('פעולה לא מוכרת'); return { ok: false, error: 'bad data' }; }
  const { data: r } = await sb.from('hns_requests').select('*').eq('id', id).maybeSingle();
  if (!r) { await answer('הפנייה לא נמצאה'); return { ok: false, error: 'not found' }; }
  if (r.status === status) { await answer(`כבר מסומנת: ${STATUS_HE[status]}`); return { ok: true, already: status }; }
  const now = new Date().toISOString();
  const patch: Any = { status, updated_at: now, handled_at: status === 'new' ? null : now, handled_by: status === 'new' ? null : by };
  const { data: upd, error } = await sb.from('hns_requests').update(patch).eq('id', id).select('*').single();
  if (error) { await answer('הפעולה נכשלה'); return { ok: false, error: 'db' }; }
  await answer(status === 'handled' ? 'סומן כטופל ✓' : status === 'spam' ? 'סומן כספאם' : 'הוחזר לפניות החדשות');
  const chat = cq?.chat_id || (upd.tg_message_id ? S.TELEGRAM_CHAT_ID : ''), mid = cq?.message_id || upd.tg_message_id;
  if (chat && mid) {
    const head = status === 'handled' ? `✓ טופל (${by === 'panel' ? 'מלוח הניהול' : 'בטלגרם'})` : status === 'spam' ? '🗑 סומן כספאם' : '↩ הוחזר לפניות החדשות';
    await tg('editMessageText', { chat_id: chat, message_id: mid, text: `${head}\n\n${requestText(upd)}`.slice(0, 4000), disable_web_page_preview: true,
      ...(status === 'new' ? { reply_markup: requestButtons(upd) } : {}) });
  }
  return { ok: true, [status]: id };
}
