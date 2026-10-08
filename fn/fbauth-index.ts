// fbauth: "התחבר עם פייסבוק" for the Instagram connection card in the office system.
// Office (functions.invoke, with the signed-in office user's session):
//   {action:'status'}                                  -> {hasApp, appId, redirect, ig}
//   {action:'save-app', appId, appSecret, configId?}   -> stores META_APP_ID / META_APP_SECRET / META_LOGIN_CONFIG_ID (never returned)
//   {action:'start'}                                   -> {url} of the Facebook permission dialog
// Facebook redirects back here (GET ?code=&state=): the code becomes a long-lived user token, then the token of the
// Facebook page linked to Instagram (a page token taken from a long-lived user token does not expire). Both are stored in
// app_secrets (IG_TOKEN, IG_PAGE_TOKEN) and settings/pub.ig is marked connected, the same shape socialpub already uses.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
// deno-lint-ignore no-explicit-any
type Any = any;
const FB = 'https://graph.facebook.com/v21.0';
const SCOPES = 'instagram_basic,instagram_content_publish,pages_show_list,pages_read_engagement,business_management';
const OFFICE = 'https://dabullaw-glitch.github.io/dabul-office/';
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const setSecret = async (k: string, v: string) => { const { error } = await admin().from('app_secrets').upsert({ k, v }, { onConflict: 'k' }); if (error) throw new Error(error.message); };
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const redirect = () => `${env('SUPABASE_URL')}/functions/v1/fbauth`;
const rnd = () => crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '');
function page(title: string, body: string, ok = true, status = 200) {
  return new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#ecedf2;font-family:Assistant,Arial,sans-serif;color:#1f2937;line-height:1.7}main{max-width:560px;margin:40px auto;padding:32px 24px;background:#fff;border:1px solid #e2e0da;border-radius:14px}
.top{color:#fff;background:#141414;margin:-32px -24px 22px;padding:16px 24px;border-radius:14px 14px 0 0;border-bottom:3px solid #e4d19c;font-weight:700}h1{color:${ok ? '#1e7b45' : '#b4442f'};font-size:1.5rem;margin:0 0 12px}
a.b{display:inline-block;background:#e4d19c;color:#141414;border-radius:10px;padding:12px 20px;font-weight:700;text-decoration:none}</style></head>
<body><main><div class="top">יקיר דבול - משרד עורכי דין</div><h1>${esc(title)}</h1>${body}<p><a class="b" href="${OFFICE}">חזרה למערכת המשרד</a></p></main></body></html>`, { status, headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
}
async function tg(text: string) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }) }).catch(() => null);
}
async function graph(path: string, params: Record<string, string>) {
  const u = new URL(FB + path); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u); const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error((j.error && j.error.message) || `Facebook ${r.status}`);
  return j;
}
// only a signed-in office user (same rule as public.is_office_user)
async function officeUser(req: Request): Promise<string | null> {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''); if (!jwt) return null;
  const { data } = await admin().auth.getUser(jwt); const email = (data && data.user && data.user.email || '').toLowerCase(); if (!email) return null;
  const { data: u } = await admin().from('office_users').select('email').ilike('email', email).limit(1);
  return u && u.length ? email : null;
}
async function callback(url: URL) {
  const err = url.searchParams.get('error_description') || url.searchParams.get('error');
  if (err) return page('החיבור בוטל', `<p>פייסבוק החזיר: ${esc(err)}</p><p>אפשר לנסות שוב מהכפתור במערכת.</p>`, false);
  const code = url.searchParams.get('code') || '', state = url.searchParams.get('state') || '';
  const st = (await getDoc('settings', 'fbauth')) || {};
  if (!code || !state || state !== st.state || Date.now() - Date.parse(st.stateAt || 0) > 20 * 60e3) return page('הקישור פג', '<p>צריך ללחוץ שוב על "התחבר עם פייסבוק" במערכת המשרד.</p>', false, 400);
  await merge('settings', 'fbauth', { state: '', usedAt: new Date().toISOString() });
  const id = env('META_APP_ID'), secret = env('META_APP_SECRET');
  try {
    const short = await graph('/oauth/access_token', { client_id: id, client_secret: secret, redirect_uri: redirect(), code });
    const long = await graph('/oauth/access_token', { grant_type: 'fb_exchange_token', client_id: id, client_secret: secret, fb_exchange_token: short.access_token });
    const acc = await graph('/me/accounts', { fields: 'name,access_token,instagram_business_account{id,username}', limit: '50', access_token: long.access_token });
    const pg = (acc.data || []).find((p: Any) => p.instagram_business_account);
    if (!pg) {
      await setSecret('IG_TOKEN', long.access_token);
      return page('חסר עמוד מקושר', '<p>ההתחברות הצליחה, אבל לא נמצא עמוד פייסבוק שמקושר לחשבון אינסטגרם מקצועי.</p><p>בחלון של פייסבוק צריך לסמן גם את עמוד המשרד וגם את חשבון האינסטגרם. אם הם לא מקושרים, מקשרים באינסטגרם: הגדרות > מרכז החשבונות.</p>', false);
    }
    await setSecret('IG_TOKEN', long.access_token);
    await setSecret('IG_PAGE_TOKEN', pg.access_token);
    const ig = { ok: true, mode: 'fb', check: 'done', via: 'fb-login', igId: pg.instagram_business_account.id, username: pg.instagram_business_account.username || '', pageId: pg.id, pageName: pg.name || '', saved: new Date().toISOString() };
    await merge('settings', 'pub', { ig });
    await tg(`✅ אינסטגרם מחובר (@${ig.username}) דרך עמוד הפייסבוק "${ig.pageName}". מעכשיו המערכת מפרסמת באינסטגרם לפי לוח הפרסום.`);
    return page('אינסטגרם מחובר', `<p>החשבון <b dir="ltr">@${esc(ig.username)}</b> מחובר דרך עמוד הפייסבוק "${esc(ig.pageName)}".</p><p>מעכשיו המערכת מפרסמת באינסטגרם לפי לוח הפרסום. אין צורך לעשות שום דבר נוסף.</p>`);
  } catch (e) {
    await merge('settings', 'pub', { ig: { ok: false, check: 'failed', error: String((e as Error).message || e).slice(0, 200), saved: new Date().toISOString() } });
    return page('החיבור לא הושלם', `<p>${esc(String((e as Error).message || e).slice(0, 300))}</p><p>אפשר לנסות שוב מהכפתור במערכת.</p>`, false, 500);
  }
}
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  try {
    if (req.method === 'GET') return await callback(url);
    const who = await officeUser(req); if (!who) return json({ error: 'forbidden' }, 403);
    const b = await req.json().catch(() => ({}));
    if (b.action === 'status') {
      const cfg = (await getDoc('settings', 'pub')) || {};
      return json({ hasApp: !!(env('META_APP_ID') && env('META_APP_SECRET')), appId: env('META_APP_ID'), config: !!env('META_LOGIN_CONFIG_ID'), redirect: redirect(), ig: cfg.ig || {} });
    }
    if (b.action === 'save-app') {
      const appId = String(b.appId || '').trim(), sec = String(b.appSecret || '').trim(), conf = String(b.configId || '').trim();
      if (!/^\d{6,20}$/.test(appId)) return json({ error: 'מזהה האפליקציה (App ID) הוא מספר בלבד' }, 400);
      if (!/^[a-f0-9]{32}$/i.test(sec)) return json({ error: 'הסוד (App Secret) הוא 32 תווים של ספרות ואותיות a עד f' }, 400);
      if (conf && !/^\d{6,20}$/.test(conf)) return json({ error: 'מזהה התצורה (Configuration ID) הוא מספר בלבד' }, 400);
      await graph('/oauth/access_token', { client_id: appId, client_secret: sec, grant_type: 'client_credentials' }).catch(() => { throw new Error('פייסבוק לא אישר את מזהה האפליקציה והסוד. כדאי לבדוק שהועתקו במלואם'); });
      await setSecret('META_APP_ID', appId); await setSecret('META_APP_SECRET', sec); if (conf) await setSecret('META_LOGIN_CONFIG_ID', conf);
      await merge('settings', 'fbauth', { appSavedAt: new Date().toISOString(), appSavedBy: who });
      return json({ ok: true });
    }
    if (b.action === 'start') {
      if (!env('META_APP_ID') || !env('META_APP_SECRET')) return json({ error: 'קודם שומרים את פרטי האפליקציה' }, 400);
      const state = rnd(); await merge('settings', 'fbauth', { state, stateAt: new Date().toISOString(), by: who });
      const u = new URL('https://www.facebook.com/v21.0/dialog/oauth');
      u.searchParams.set('client_id', env('META_APP_ID')); u.searchParams.set('redirect_uri', redirect()); u.searchParams.set('state', state); u.searchParams.set('response_type', 'code');
      if (env('META_LOGIN_CONFIG_ID')) { u.searchParams.set('config_id', env('META_LOGIN_CONFIG_ID')); u.searchParams.set('override_default_response_type', 'true'); }
      else u.searchParams.set('scope', SCOPES);
      return json({ url: u.toString() });
    }
    return json({ error: 'action?' }, 400);
  } catch (e) { console.error(e); return json({ error: String((e as Error).message || e) }, 500); }
});
