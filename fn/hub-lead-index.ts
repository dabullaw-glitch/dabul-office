// hub-lead: forms of the "בלי חובות" information site (lead form, lawyer join, advertisers, contact).
// Public POST (no login). Saves to docs coll "hublead" and sends one Telegram message to Yakir.
// Spam: hidden "website" field, simple per-IP limit, length limits. No personal data is logged.
import { createClient } from 'jsr:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const clip = (s: unknown, n: number) => String(s ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const TYPES: Record<string, string> = { lead: '🔔 פנייה חדשה מאתר בלי חובות', 'lawyer-join': '⚖️ עורך דין רוצה להצטרף לרשימה', advertise: '📣 פנייה לפרסום באתר', contact: '✉️ פנייה למערכת האתר' };
async function secrets() { const { data } = await sb.from('app_secrets').select('k,v').in('k', ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']); return Object.fromEntries((data || []).map((r: Any) => [r.k, r.v])); }
async function sha(s: string) { const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join(''); }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return new Response('method', { status: 405, headers: cors });
  try {
    const b: Any = await req.json().catch(() => ({}));
    if (b.website) return Response.json({ ok: true }, { headers: cors }); // bot
    const type = TYPES[b.type] ? String(b.type) : 'lead';
    const d = { type, name: clip(b.name, 80), phone: clip(b.phone, 20).replace(/[^\d+]/g, ''), email: clip(b.email, 120), amount: clip(b.amount, 40), city: clip(b.city, 40), kind: clip(b.kind, 60), msg: clip(b.msg, 2000), page: clip(b.page, 200), source: clip(b.source, 80), utm: clip(b.utm, 200), ref: clip(b.ref, 200), consent: type === 'lead' ? !!b.consent : undefined };
    if (d.name.length < 2) return Response.json({ ok: false, error: 'name' }, { status: 400, headers: cors });
    if (type === 'lead' && (!/^(\+?972|0)\d{8,9}$/.test(d.phone) || !d.consent)) return Response.json({ ok: false, error: 'phone/consent' }, { status: 400, headers: cors });
    if (type !== 'lead' && !d.phone && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email)) return Response.json({ ok: false, error: 'contact' }, { status: 400, headers: cors });
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'x';
    const ipk = await sha(ip + new Date().toISOString().slice(0, 10));
    const since = new Date(Date.now() - 10 * 60e3).toISOString();
    const { count } = await sb.from('docs').select('id', { count: 'exact', head: true }).eq('coll', 'hublead').eq('data->>ipk', ipk).gte('updated_at', since);
    if ((count || 0) >= 5) return Response.json({ ok: false, error: 'rate' }, { status: 429, headers: cors });
    const now = new Date().toISOString();
    const id = `${type}-${now.replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 6)}`;
    await sb.from('docs').insert({ coll: 'hublead', id, data: { ...d, ipk, created: now, status: 'new' }, updated_at: now });
    const S = await secrets();
    if (S.TELEGRAM_BOT_TOKEN && S.TELEGRAM_CHAT_ID) {
      const lines = [TYPES[type], '', `שם: ${d.name}`, d.phone && `טלפון: ${d.phone}`, d.email && `אימייל: ${d.email}`, d.amount && `סכום חובות: ${d.amount}`, d.city && `אזור: ${d.city}`, d.kind && `מצב: ${d.kind}`, d.msg && `הודעה: ${d.msg}`, '', `עמוד: ${d.page}${d.source ? ` (${d.source})` : ''}`, d.utm && d.utm !== '||' && `קמפיין: ${d.utm}`].filter(Boolean).join('\n');
      await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: lines.slice(0, 4000), disable_web_page_preview: true }) }).catch(() => null);
    }
    return Response.json({ ok: true }, { headers: cors });
  } catch (e) { console.error(e); return Response.json({ ok: false }, { status: 500, headers: cors }); }
});
