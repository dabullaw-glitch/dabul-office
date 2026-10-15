// hubagent: support for the "בלי חובות" content agent that runs in GitHub Actions on the office's Anthropic credit
// (Yakir, 15.10.2026: "את בלי חובות תעביר לקרדיטים של אנטרופיק כמשהו קבוע שהוא יעשה את זה ולא אתה").
// Auth without any stored secret: every call carries a GitHub Actions OIDC token (header x-gh-oidc, audience 'hubagent'),
// and only the workflow .github/workflows/blihovot-agent.yml on main of dabullaw-glitch/dabul-office is accepted.
//   ?a=start     {task}                  -> month budget check (ok:false when the monthly cap is reached); marks the agent active.
//                                          The API key itself is a GitHub secret of the repo and never passes through here.
//   ?a=done      {task, usd, turns, ok, run, note} -> records the run cost (docs coll 'hubcost'); warns Yakir at 80% / 100%
//   ?a=hubreport {kind, ...}             -> INSERT into docs coll 'hubreport' (what the old scheduled task wrote)
//   ?a=stats     {}                      -> last 7 days: hublead counts by type (no personal details) + hubreport items
//   ?a=telegram  {text}                  -> one message to Yakir
// Settings: docs settings/hubagent {capUsd, model, warnedAt}. Never touches the law office data.
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'npm:jose@5.9.6';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const J = (o: unknown, s = 200) => Response.json(o, { status: s });
const JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));
const WF = 'dabullaw-glitch/dabul-office/.github/workflows/blihovot-agent.yml@refs/heads/main';
async function authed(req: Request) {
  const t = req.headers.get('x-gh-oidc') || '';
  if (!t) return false;
  try {
    const { payload } = await jwtVerify(t, JWKS, { issuer: 'https://token.actions.githubusercontent.com', audience: 'hubagent' });
    return payload.repository === 'dabullaw-glitch/dabul-office' && payload.ref === 'refs/heads/main' && (payload.job_workflow_ref === WF || payload.workflow_ref === WF);
  } catch { return false; }
}
async function sec(keys: string[]) { const { data } = await sb.from('app_secrets').select('k,v').in('k', keys); return Object.fromEntries((data || []).map((r: Any) => [r.k, r.v])) as Record<string, string>; }
async function tg(text: string) {
  const S = await sec(['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
  if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return false;
  const r = await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: String(text).slice(0, 4000), disable_web_page_preview: true }) }).catch(() => null);
  return !!r?.ok;
}
const month = () => { const d = new Date(Date.now() + 3 * 3600e3); return d.toISOString().slice(0, 7); }; // Israel month, close enough
async function settings() { const { data } = await sb.from('docs').select('data').eq('coll', 'settings').eq('id', 'hubagent').maybeSingle(); return (data?.data || {}) as Any; }
async function spent(m: string) {
  const { data } = await sb.from('docs').select('data').eq('coll', 'hubcost').like('id', `${m}%`);
  return (data || []).reduce((a: number, r: Any) => a + (Number(r.data?.usd) || 0), 0);
}
async function merge(coll: string, id: string, patch: Any) { await sb.rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch }); }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return J({ ok: false }, 405);
  try {
    if (!(await authed(req))) return J({ ok: false, error: 'auth' }, 401);
    const a = new URL(req.url).searchParams.get('a') || '';
    const b: Any = await req.json().catch(() => ({}));
    const st = await settings();
    const cap = Number(st.capUsd) || 27;
    const m = month();
    if (a === 'start') {
      const s = await spent(m);
      if (s >= cap) {
        if (st.stoppedFor !== m) { await merge('settings', 'hubagent', { stoppedFor: m }); await tg(`בלי חובות: הגענו לתקרה החודשית של הקרדיט (${s.toFixed(2)}$ מתוך ${cap}$). הכתיבה האוטומטית עוצרת עד תחילת החודש הבא. אם תרצה להעלות את התקרה, כתוב לי.`); }
        return J({ ok: false, over: true, spent: s, cap });
      }
      if (!st.active) await merge('settings', 'hubagent', { active: true, activeSince: new Date().toISOString() });
      return J({ ok: true, model: st.model || 'claude-sonnet-5-5', spent: Math.round(s * 100) / 100, cap });
    }
    if (a === 'done') {
      const now = new Date().toISOString();
      const usd = Math.max(0, Number(b.usd) || 0);
      const id = `${m}-${now.replace(/[-:.TZ]/g, '').slice(4, 14)}-${String(b.task || 'x').slice(0, 20)}`;
      await sb.from('docs').insert({ coll: 'hubcost', id, data: { task: String(b.task || ''), usd, turns: Number(b.turns) || 0, ok: !!b.ok, run: String(b.run || ''), note: String(b.note || '').slice(0, 500), at: now }, updated_at: now });
      const s = await spent(m);
      if (s >= cap * 0.8 && st.warnedFor !== m) { await merge('settings', 'hubagent', { warnedFor: m }); await tg(`בלי חובות: השתמשנו החודש ב-${s.toFixed(2)}$ מתוך התקרה של ${cap}$ בקרדיט. כשנגיע לתקרה הכתיבה תעצור עד החודש הבא.`); }
      if (!b.ok) await tg(`בלי חובות: הריצה האוטומטית "${String(b.task || '')}" לא הסתיימה כמו שצריך. ${String(b.note || '').slice(0, 300)}`);
      return J({ ok: true, spent: Math.round(s * 100) / 100, cap });
    }
    if (a === 'hubreport') {
      const now = new Date().toISOString();
      const id = `${String(b.kind || 'item').replace(/[^a-z-]/g, '').slice(0, 12) || 'item'}-${now.replace(/[-:.TZ]/g, '').slice(0, 14)}-${crypto.randomUUID().slice(0, 4)}`;
      const data = { ...b, by: 'hubagent', at: now };
      const { error } = await sb.from('docs').insert({ coll: 'hubreport', id, data, updated_at: now });
      return J({ ok: !error, id, error: error?.message });
    }
    if (a === 'stats') {
      const since = new Date(Date.now() - 7 * 864e5).toISOString();
      const { data: leads } = await sb.from('docs').select('data').eq('coll', 'hublead').gte('updated_at', since);
      const byType: Record<string, number> = {};
      for (const r of (leads || []) as Any[]) { const t = r.data?.type || 'lead'; byType[t] = (byType[t] || 0) + 1; }
      const { data: rep } = await sb.from('docs').select('id,data').eq('coll', 'hubreport').gte('updated_at', since).order('updated_at');
      return J({ ok: true, leadsByType: byType, items: (rep || []).map((r: Any) => ({ id: r.id, kind: r.data?.kind, slug: r.data?.slug, title: r.data?.title, video: r.data?.video, guide: r.data?.guide, problem: r.data?.problem })), costThisMonth: Math.round((await spent(m)) * 100) / 100, cap });
    }
    if (a === 'telegram') return J({ ok: await tg(String(b.text || '')) });
    return J({ ok: false, error: 'action' }, 400);
  } catch (e) { console.error(e); return J({ ok: false }, 500); }
});
