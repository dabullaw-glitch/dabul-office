// leadstats: monthly lead report from Google Analytics (GA4), read only, via the office service account.
// The site sends events (snippet "lead tracking"): phone_click, whatsapp_click, email_click, lead_form_submit.
// step=month [&month=YYYY-MM] (cron, 1st of the month): last month's counts per event and the pages that brought them
//                              -> docs ga/leads-YYYY-MM + one Telegram message to Yakir.
// step=check [&days=7]:        the same numbers for the last days, no message (to see that events arrive).
import { createClient } from 'jsr:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const EVENTS = ['phone_click', 'whatsapp_click', 'email_click', 'lead_form_submit'];
const LABEL: Record<string, string> = { phone_click: 'לחיצות טלפון', whatsapp_click: 'לחיצות וואטסאפ', email_click: 'לחיצות מייל', lead_form_submit: 'טפסים שנשלחו' };
const b64url = (b: ArrayBuffer | Uint8Array | string) => {
  const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer);
  let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
async function secrets() { const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'GOOGLE_SA_JSON', 'GA4_PROPERTY', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']); return Object.fromEntries((data || []).map((r: Any) => [r.k, r.v])); }
async function token(S: Any): Promise<string> {
  const sa = JSON.parse(S.GOOGLE_SA_JSON); const now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/analytics.readonly', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); if (!j.access_token) throw new Error('google token: ' + JSON.stringify(j).slice(0, 200)); return j.access_token;
}
async function report(S: Any, start: string, end: string) {
  const t = await token(S);
  const r = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${S.GA4_PROPERTY}:runReport`, { method: 'POST', headers: { authorization: `Bearer ${t}`, 'content-type': 'application/json' },
    body: JSON.stringify({ dateRanges: [{ startDate: start, endDate: end }], dimensions: [{ name: 'eventName' }, { name: 'pagePath' }], metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: EVENTS } } }, limit: 2000 }) });
  const j: Any = await r.json(); if (!r.ok) throw new Error('GA ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
  const totals: Record<string, number> = Object.fromEntries(EVENTS.map((e) => [e, 0])); const pages: Record<string, number> = {};
  for (const row of j.rows || []) { const ev = row.dimensionValues[0].value, path = row.dimensionValues[1].value, n = Number(row.metricValues[0].value || 0); totals[ev] = (totals[ev] || 0) + n; pages[path] = (pages[path] || 0) + n; }
  const top = Object.entries(pages).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([p, n]) => ({ path: p, name: decodeURIComponent(p).replace(/^\/|\/$/g, '').replace(/-/g, ' ') || 'דף הבית', n }));
  return { start, end, totals, top };
}
const ymd = (d: Date) => d.toISOString().slice(0, 10);
Deno.serve(async (req) => {
  const S = await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return new Response('unauthorized', { status: 401 });
  const q = new URL(req.url).searchParams; const step = q.get('step');
  try {
    if (step === 'check') { const days = Number(q.get('days') || 7); return Response.json(await report(S, ymd(new Date(Date.now() - days * 864e5)), 'today')); }
    if (step === 'month') {
      const m = q.get('month') || ymd(new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15)).slice(0, 7);
      const [y, mo] = m.split('-').map(Number); const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
      const rep = await report(S, `${m}-01`, `${m}-${String(last).padStart(2, '0')}`);
      await sb.rpc('docs_merge', { p_coll: 'ga', p_id: 'leads-' + m, p_patch: { ...rep, at: new Date().toISOString() } });
      const t = rep.totals, sum = EVENTS.reduce((a, e) => a + (t[e] || 0), 0);
      const lines = [`📊 פניות מהאתר, ${m.split('-').reverse().join('/')}`, '', ...EVENTS.map((e) => `${LABEL[e]}: ${t[e] || 0}`), `סה״כ: ${sum}`];
      if (rep.top.length) lines.push('', 'העמודים שהביאו הכי הרבה פניות:', ...rep.top.slice(0, 5).map((p, i) => `${i + 1}. ${p.name} (${p.n})`));
      if (!sum) lines.push('', 'לא נרשמו פניות החודש. אם זה נראה לא סביר, אבדוק שהמדידה עובדת.');
      if (S.TELEGRAM_BOT_TOKEN && S.TELEGRAM_CHAT_ID) await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: lines.join('\n'), disable_web_page_preview: true }) });
      return Response.json({ ok: true, ...rep });
    }
    return Response.json({ error: 'step?' }, { status: 400 });
  } catch (e) { return Response.json({ ok: false, error: String((e as Error).message || e) }, { status: 500 }); }
});
