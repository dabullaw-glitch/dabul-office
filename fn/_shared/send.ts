// Sends a client message by WhatsApp or SMS, through whichever sender is connected:
//  1. Green API  - your existing WhatsApp number (GREEN_API_INSTANCE, GREEN_API_TOKEN)
//  2. Twilio WhatsApp - official WhatsApp Business API (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM, TWILIO_TEMPLATE_SID)
//  3. Twilio SMS  (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM)
//  0. Meta WhatsApp Cloud API directly, no middleman (META_WA_TOKEN, META_WA_PHONE_ID, META_WA_TEMPLATE)
//  4. No sender at all: each message goes to your Telegram with a button that opens your own WhatsApp ready to send
import { env } from './common.ts';

export type Provider = '' | 'meta' | 'green' | 'twilio-whatsapp' | 'sms' | 'telegram';
export function provider(): Provider {
  if (env('META_WA_TOKEN') && env('META_WA_PHONE_ID')) return 'meta';
  if (env('GREEN_API_INSTANCE') && env('GREEN_API_TOKEN')) return 'green';
  if (env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_WHATSAPP_FROM') && env('TWILIO_TEMPLATE_SID')) return 'twilio-whatsapp';
  if (env('TWILIO_ACCOUNT_SID') && env('TWILIO_AUTH_TOKEN') && env('TWILIO_SMS_FROM')) return 'sms';
  if (env('TELEGRAM_BOT_TOKEN') && env('TELEGRAM_CHAT_ID')) return 'telegram';
  return '';
}
export const intl = (p: string) => {
  const s = String(p || '').trim();
  // a number from abroad (+33..., 0033...) keeps its own country code
  if (/^(\+|00)/.test(s)) { const d = s.replace(/\D/g, '').replace(/^00/, ''); if (d && !d.startsWith('972')) return d; }
  let x = s.replace(/\D/g, ''); if (x.startsWith('972')) x = x.slice(3); if (x.startsWith('0')) x = x.slice(1); return x ? '972' + x : '';
};
const greenBase = () => (env('GREEN_API_URL') || 'https://api.green-api.com').replace(/\/$/, '');

// the core of a prepared message, without the greeting line and signature (templates add their own)
export function core(text: string, signature: string) {
  let t = String(text || '');
  if (signature) t = t.split('\n\n' + signature).join('');
  t = t.replace(/^שלום [^\n,]*,\s*\n/, '');
  return t.trim();
}

export async function send(phone: string, text: string, opts: { name?: string; signature?: string } = {}) {
  const p = provider(), to = intl(phone);
  if (!p) return { ok: false, error: 'no_provider' };
  if (!to) return { ok: false, error: 'bad_phone' };
  try {
    if (p === 'meta') {
      const r = await fetch(`https://graph.facebook.com/v21.0/${env('META_WA_PHONE_ID')}/messages`, {
        method: 'POST', headers: { authorization: `Bearer ${env('META_WA_TOKEN')}`, 'content-type': 'application/json' },
        body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'template', template: { name: env('META_WA_TEMPLATE') || 'office_reminder_he', language: { code: 'he' },
          components: [{ type: 'body', parameters: [{ type: 'text', text: (opts.name || '').split(/[ ,(]/)[0] || 'שלום' }, { type: 'text', text: core(text, opts.signature || '').replace(/\s*\n+\s*/g, ' · ').slice(0, 900) }] }] } }) });
      const j = await r.json().catch(() => ({}));
      return r.ok ? { ok: true, id: j.messages?.[0]?.id } : { ok: false, error: `meta ${r.status} ${j.error?.message || ''}`.slice(0, 160) };
    }
    if (p === 'green') {
      const r = await fetch(`${greenBase()}/waInstance${env('GREEN_API_INSTANCE')}/sendMessage/${env('GREEN_API_TOKEN')}`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chatId: `${to}@c.us`, message: text }) });
      const j = await r.json().catch(() => ({}));
      return r.ok && j.idMessage ? { ok: true, id: j.idMessage } : { ok: false, error: `green ${r.status} ${JSON.stringify(j).slice(0, 120)}` };
    }
    const sid = env('TWILIO_ACCOUNT_SID');
    const body = new URLSearchParams();
    if (p === 'twilio-whatsapp') {
      const from = env('TWILIO_WHATSAPP_FROM').replace(/^whatsapp:/, '');
      body.set('From', `whatsapp:${from}`); body.set('To', `whatsapp:+${to}`);
      body.set('ContentSid', env('TWILIO_TEMPLATE_SID'));
      // WhatsApp template values cannot contain line breaks
      body.set('ContentVariables', JSON.stringify({ '1': (opts.name || '').split(/[ ,(]/)[0] || 'שלום', '2': core(text, opts.signature || '').replace(/\s*\n+\s*/g, ' · ').slice(0, 900) }));
    } else {
      body.set('From', env('TWILIO_SMS_FROM')); body.set('To', `+${to}`); body.set('Body', text.slice(0, 1400));
    }
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST', headers: { authorization: 'Basic ' + btoa(`${sid}:${env('TWILIO_AUTH_TOKEN')}`), 'content-type': 'application/x-www-form-urlencoded' }, body });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, id: j.sid } : { ok: false, error: `twilio ${r.status} ${j.message || ''}`.slice(0, 160) };
  } catch (e) { return { ok: false, error: String((e as Error).message || e).slice(0, 160) }; }
}

// 22.10.2026 (Yakir approved): before an opening message, check that the number has WhatsApp at all.
// Green API accepts a message to a number without WhatsApp and returns an id, so it looked "sent" when it was not.
// Returns false only when the check clearly says there is no WhatsApp; true / null (unknown, check failed) keep the normal send.
export async function hasWhatsapp(phone: string): Promise<boolean | null> {
  if (provider() !== 'green') return null;
  const to = intl(phone); if (!to) return null;
  try {
    const r = await fetch(`${greenBase()}/waInstance${env('GREEN_API_INSTANCE')}/checkWhatsapp/${env('GREEN_API_TOKEN')}`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phoneNumber: Number(to) }), signal: AbortSignal.timeout(10000) });
    if (!r.ok) return null;
    const j = await r.json().catch(() => ({}));
    return j.existsWhatsapp === false ? false : j.existsWhatsapp === true ? true : null;
  } catch { return null; }
}

// a short free-text reply inside an open conversation (the client just wrote to us)
export async function reply(phone: string, text: string) {
  const p = provider(), to = intl(phone);
  if (!to) return false;
  if (p === 'green') return (await send(phone, text)).ok;
  if (p === 'twilio-whatsapp') {
    const sid = env('TWILIO_ACCOUNT_SID'), from = env('TWILIO_WHATSAPP_FROM').replace(/^whatsapp:/, '');
    const body = new URLSearchParams({ From: `whatsapp:${from}`, To: `whatsapp:+${to}`, Body: text });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, { method: 'POST', headers: { authorization: 'Basic ' + btoa(`${sid}:${env('TWILIO_AUTH_TOKEN')}`), 'content-type': 'application/x-www-form-urlencoded' }, body });
    return r.ok;
  }
  return false;
}

// no WhatsApp sender connected: offer the message on Telegram, one tap opens your own WhatsApp with the text ready
export async function offerOnTelegram(id: string, x: { label: string; name: string; phone: string; text: string }) {
  const to = intl(x.phone); if (!to) return { ok: false, error: 'bad_phone' };
  const wa = `https://wa.me/${to}?text=${encodeURIComponent(x.text)}`;
  const r = await fetch(`https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/sendMessage`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: env('TELEGRAM_CHAT_ID'), text: `📲 ${x.label}: ${x.name}\n\n${x.text}`.slice(0, 4000), disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [[{ text: '📲 פתיחה בוואטסאפ ושליחה', url: wa }], [{ text: '✓ נשלח', callback_data: `s:${id}` }, { text: '✗ לא לשלוח', callback_data: `x:${id}` }]] } }) });
  return r.ok ? { ok: true } : { ok: false, error: `telegram ${r.status}` };
}
