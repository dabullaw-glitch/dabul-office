// hns-panel (28.10.2026): backend of the management panel of nws.co.il (חדשות נתניה והשרון) at https://nws.co.il/admin/.
// Login without a password: the panel asks for a one-time link, the link goes ONLY to Yakir's Telegram chat (TELEGRAM_CHAT_ID of the
// office bot), is valid for 15 minutes and once. Opening it creates a panel session for 30 days on that device. Only SHA-256 hashes of
// the link and the session are stored (table hns_admin_sessions, RLS on, server only). The token travels in the address fragment (#k=),
// so it never reaches any server log.
// POST JSON:
//   {action:'link'}                       send a login link to Yakir's Telegram (at most 3 in 10 minutes and 12 a day)
//   {action:'login', k}                   exchange a link for a session {s}
//   with {s} (a session):
//   {action:'summary'}                    counts for the tabs
//   {action:'requests', status?}          inquiries from the site forms (hns_requests): 'new' (default) | 'handled' | 'spam' | 'all'
//   {action:'request_set', id, status?, note?}   status 'handled' | 'spam' | 'new' (through hns-biz, which also updates the Telegram message)
//   {action:'listings', status?}          directory listings: 'pending' (default) | 'approved' | 'rejected'
//   {action:'listing_decide', id, act}    act 'ok' | 'no' (through hns-biz, the same path as the Telegram buttons)
//   {action:'listing_edit', id, fields}   edit a listing (through hns-biz, the same checks as the form)
//   {action:'stories'}                    stories waiting for Yakir's approval (sent to him in Telegram and not decided yet)
//   {action:'story_decide', id, act}      act 'ok' | 'no' (through hns-publish, with every publishing guard)
//   {action:'published'}                  the latest published stories
//   {action:'story_withdraw', id, note}   take a published story off the site (through hns-publish 'withdraw')
//   {action:'story_kicker', id, kicker}   the small label above a story title (through hns-admin 'story_meta', up to 5 words)
//   {action:'events'} | {action:'event_set', event} | {action:'event_clear', id?}   the events strip of the home page (through hns-admin)
//   {action:'logout'}
// Data changes go through the functions only. No long or medium dash in any saved text.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const FN = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
const S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  for (const r of data || []) S[(r as Any).k] = String((r as Any).v ?? '').trim();
}
const ORIGINS = /^https:\/\/(nws\.co\.il|[a-z0-9-]+\.nws-site\.pages\.dev|nws-site\.pages\.dev)$|^http:\/\/localhost(:\d+)?$/;
const cors = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return { 'access-control-allow-origin': ORIGINS.test(o) ? o : 'https://nws.co.il', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'origin' };
};
let REQ: Request;
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors(REQ), 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

const b64url = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const newToken = () => b64url(crypto.getRandomValues(new Uint8Array(32)));
async function hash(s: string) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
const tg = (method: string, body: Any) => fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/${method}`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
}).then((r) => r.json()).catch((e) => ({ ok: false, description: String(e) }));
const call = (fn: string, body: Any) => fetch(`${FN}/${fn}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
  body: JSON.stringify(body), signal: AbortSignal.timeout(45000) }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));

async function sendLink() {
  const tenAgo = new Date(Date.now() - 600e3).toISOString(), dayAgo = new Date(Date.now() - 24 * 3600e3).toISOString();
  const { data: recent } = await sb.from('hns_admin_sessions').select('created_at').eq('kind', 'link').gte('created_at', dayAgo);
  if ((recent || []).filter((r: Any) => r.created_at >= tenAgo).length >= 3 || (recent || []).length >= 12)
    return { ok: false, error: 'כבר נשלחו כמה קישורים לאחרונה. חפשו את ההודעה האחרונה בטלגרם, או נסו שוב בעוד כמה דקות.' };
  const k = newToken();
  const { error } = await sb.from('hns_admin_sessions').insert({ token_hash: await hash(k), kind: 'link', expires_at: new Date(Date.now() + 15 * 60e3).toISOString() });
  if (error) return { ok: false, error: 'שגיאה, נסו שוב בעוד דקה' };
  const url = `https://nws.co.il/admin/#k=${k}`;
  const r = await tg('sendMessage', { chat_id: S.TELEGRAM_CHAT_ID, disable_web_page_preview: true,
    text: '🔐 כניסה ללוח הניהול של חדשות נתניה והשרון\n\nלחצו על הכפתור כדי להיכנס. הכפתור עובד פעם אחת, בתוך 15 דקות.\nלא ביקשתם כניסה? אל תלחצו, ואפשר להתעלם מההודעה.',
    reply_markup: { inline_keyboard: [[{ text: 'כניסה ללוח הניהול', url }]] } });
  if (!r?.ok) return { ok: false, error: 'שליחת ההודעה בטלגרם נכשלה. נסו שוב בעוד דקה.' };
  return { ok: true, message: 'שלחנו לכם קישור כניסה בטלגרם (בוט המשרד). פתחו אותו בטלפון הזה.' };
}

async function login(k: unknown, ua: string) {
  const key = String(k || '');
  if (key.length < 20) return { ok: false, error: 'קישור לא תקין' };
  const now = new Date().toISOString();
  const { data } = await sb.from('hns_admin_sessions').update({ used_at: now }).eq('token_hash', await hash(key)).eq('kind', 'link').is('used_at', null).gt('expires_at', now).select('token_hash');
  if (!data?.length) return { ok: false, error: 'הקישור כבר נוצל או שפג תוקפו. בקשו קישור חדש.' };
  const s = newToken();
  const exp = new Date(Date.now() + 30 * 24 * 3600e3).toISOString();
  await sb.from('hns_admin_sessions').insert({ token_hash: await hash(s), kind: 'session', expires_at: exp, ua: ua.slice(0, 200), last_seen: now });
  return { ok: true, s, exp };
}

async function session(s: unknown) {
  const key = String(s || '');
  if (key.length < 20) return null;
  const h = await hash(key);
  const { data } = await sb.from('hns_admin_sessions').select('token_hash,last_seen').eq('token_hash', h).eq('kind', 'session').gt('expires_at', new Date().toISOString()).maybeSingle();
  if (!data) return null;
  if (!data.last_seen || Date.now() - Date.parse(data.last_seen) > 3600e3) await sb.from('hns_admin_sessions').update({ last_seen: new Date().toISOString() }).eq('token_hash', h);
  return h;
}

const AWAIT = ['draft', 'needs_check'];
async function summary() {
  const c = async (q: Any) => (await q).count || 0;
  return {
    ok: true,
    requests: await c(sb.from('hns_requests').select('id', { count: 'exact', head: true }).eq('status', 'new').eq('is_test', false)),
    listings: await c(sb.from('hns_biz_listings').select('id', { count: 'exact', head: true }).eq('status', 'pending').eq('is_test', false)),
    stories: await c(sb.from('hns_stories').select('id', { count: 'exact', head: true }).in('state', AWAIT).not('tg_sent_at', 'is', null)),
  };
}

async function requests(status: string) {
  let q = sb.from('hns_requests').select('id,created_at,type,offer,name,phone,email,business,message,url,page,lang,photo_path,photo_ok,status,handled_at,handled_by,note,is_test,mail_sent_at,extra')
    .order('id', { ascending: false }).limit(100);
  if (status !== 'all') q = q.eq('status', ['new', 'handled', 'spam'].includes(status) ? status : 'new');
  const { data, error } = await q;
  if (error) return { ok: false, error: 'db' };
  const rows = data || [];
  for (const r of rows as Any[]) {
    if (r.photo_path) { const { data: u } = await sb.storage.from('hns-tips').createSignedUrl(r.photo_path, 3600); r.photo_url = u?.signedUrl || null; }
  }
  return { ok: true, requests: rows };
}

async function stories() {
  const { data } = await sb.from('hns_stories').select('id,created_at,section,title,dek,body,sources,sensitivity,state,notes,pub_note,basis,tg_sent_at')
    .in('state', AWAIT).not('tg_sent_at', 'is', null).order('id', { ascending: false }).limit(50);
  return { ok: true, stories: (data || []).map((s: Any) => ({ ...s, sources: (Array.isArray(s.sources) ? s.sources : []).map((x: Any) => ({ name: x.name || x.source || x.id || '', url: x.url || '' })) })) };
}

Deno.serve(async (req) => {
  REQ = req;
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors(req) });
  if (req.method !== 'POST') return J({ ok: false }, 405);
  await secrets();
  try {
    const b: Any = await req.json().catch(() => ({}));
    if (b.action === 'link') return J(await sendLink());
    if (b.action === 'login') return J(await login(b.k, req.headers.get('user-agent') || ''));
    const h = await session(b.s);
    if (!h) return J({ ok: false, auth: false, error: 'צריך להתחבר מחדש' }, 401);
    switch (b.action) {
      case 'summary': return J(await summary());
      case 'requests': return J(await requests(String(b.status || 'new')));
      case 'request_set': {
        const id = Number(b.id); if (!id) return J({ ok: false, error: 'id' }, 400);
        if (b.note !== undefined) await sb.from('hns_requests').update({ note: String(b.note || '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').slice(0, 1000) || null, updated_at: new Date().toISOString() }).eq('id', id);
        if (b.status) {
          const act = b.status === 'handled' ? 'rq' : b.status === 'spam' ? 'sp' : b.status === 'new' ? 'rn' : '';
          if (!act) return J({ ok: false, error: 'status' }, 400);
          return J(await call('hns-biz', { action: 'decide', data: `hns:biz:${act}:${id}`, cq: { by: 'panel' } }));
        }
        return J({ ok: true });
      }
      case 'listings': {
        const st = ['pending', 'approved', 'rejected'].includes(b.status) ? b.status : 'pending';
        const { data } = await sb.from('hns_biz_listings').select('id,created_at,updated_at,category,name,area,areas_served,address,phone,whatsapp,email,website,description,logo_url,license_no,contact_name,contact_phone,interest,status,plan,featured_until,is_test,decided_at,notes')
          .eq('status', st).order('id', { ascending: false }).limit(100);
        const { data: cats } = await sb.from('hns_biz_categories').select('slug,plural_he').eq('active', true).order('sort');
        return J({ ok: true, listings: data || [], categories: cats || [] });
      }
      case 'listing_decide': {
        const id = Number(b.id); if (!id || !['ok', 'no'].includes(b.act)) return J({ ok: false, error: 'bad' }, 400);
        return J(await call('hns-biz', { action: 'decide', data: `hns:biz:${b.act}:${id}`, cq: {} }));
      }
      case 'listing_edit': return J(await call('hns-biz', { action: 'listing_edit', id: Number(b.id), fields: b.fields || {} }));
      case 'stories': return J(await stories());
      case 'story_decide': {
        const id = Number(b.id); if (!id || !['ok', 'no'].includes(b.act)) return J({ ok: false, error: 'bad' }, 400);
        const { data: st } = await sb.from('hns_stories').select('tg_message_id').eq('id', id).maybeSingle();
        const cq = st?.tg_message_id ? { chat_id: S.TELEGRAM_CHAT_ID, message_id: st.tg_message_id } : undefined;
        return J(await call('hns-publish', { action: 'decide', data: `hns:${b.act}:${id}`, cq }));
      }
      case 'published': {
        const { data } = await sb.from('hns_stories').select('id,published_at,section,title,dek,kicker,state').eq('state', 'published').order('published_at', { ascending: false }).limit(60);
        return J({ ok: true, stories: data || [] });
      }
      case 'story_withdraw': {
        const id = Number(b.id); if (!id) return J({ ok: false, error: 'id' }, 400);
        const note = String(b.note || '').trim() || 'הורד מהאתר מלוח הניהול';
        return J(await call('hns-publish', { action: 'withdraw', ids: [id], note }));
      }
      case 'story_kicker': return J(await call('hns-admin', { action: 'story_meta', id: Number(b.id), kicker: String(b.kicker ?? '') }));
      case 'events': return J(await call('hns-admin', { action: 'events' }));
      case 'event_set': return J(await call('hns-admin', { action: 'event_set', event: b.event || {} }));
      case 'event_clear': return J(await call('hns-admin', { action: 'event_clear', ...(b.id ? { id: Number(b.id) } : {}) }));
      case 'logout': await sb.from('hns_admin_sessions').update({ expires_at: new Date().toISOString() }).eq('token_hash', h); return J({ ok: true });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
