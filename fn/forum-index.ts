// forum: anonymous Q&A forum of the "בלי חובות" site (separate from the law office).
// Identity: people verify with a one-time code sent to their email, but the email itself is never stored,
// only a keyed hash of it (so a person can be blocked without the site knowing who they are). Public name = nickname.
// Moderation: every post is screened automatically (spam, personal details, abuse); doubtful posts wait for the admin.
// Admin (Yakir): logs in with a code sent to his Telegram; can approve, hide, delete and block.
// Storage: docs table, collections forum_q (questions), forum_a (answers), forum_u (users by hash), forum_c (login codes).
// Public GET  ?a=list[&topic=]          approved questions (newest first)
//            ?a=q&id=<qid>               one question with its approved answers
//            ?a=export                   everything public, for the nightly static build
// POST ?a=code {email}  ?a=verify {email, code, nick}  ?a=ask {token,title,body,topic}  ?a=answer {token,qid,body}
//      ?a=report {id}   ?a=admincode {}  ?a=adminverify {code}  ?a=admin {token, op, id}
//      admin ops: feed, approve, hide, delete, block {why}, unblock, staffq {title,body,topic}, staffa {qid,body,guide}
import { createClient } from 'jsr:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'content-type' };
const J = (d: Any, s = 200) => Response.json(d, { status: s, headers: cors });
const TOPICS = ['חדלות פירעון', 'הוצאה לפועל', 'הסדרי חוב', 'עצמאים ועסקים', 'כלכלה נכונה', 'אחרי ההפטר', 'אחר'];
const clip = (s: unknown, n: number) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, n);
let S: Record<string, string> = {};
async function secrets() { if (S.FORUM_SECRET) return S; const { data } = await sb.from('app_secrets').select('k,v').in('k', ['FORUM_SECRET', 'RESEND_API_KEY', 'FORUM_FROM', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']); S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v])); return S; }
const enc = new TextEncoder();
async function hmac(msg: string) { const k = await crypto.subtle.importKey('raw', enc.encode(S.FORUM_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); return [...new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(msg)))].map((b) => b.toString(16).padStart(2, '0')).join(''); }
const b64u = (s: string) => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s: string) => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
async function sign(p: Any) { const b = b64u(JSON.stringify(p)); return b + '.' + (await hmac(b)).slice(0, 40); }
async function check(tok: string) { const [b, s] = String(tok || '').split('.'); if (!b || !s || (await hmac(b)).slice(0, 40) !== s) return null; const p = JSON.parse(unb64u(b)); return p.exp > Date.now() ? p : null; }
const get = async (coll: string, id: string) => { const { data } = await sb.from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => sb.rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const insert = (coll: string, id: string, data: Any) => sb.from('docs').insert({ coll, id, data, updated_at: new Date().toISOString() });
const newId = (p: string) => `${p}${Date.now().toString(36)}${crypto.randomUUID().slice(0, 4)}`;
async function tg(text: string) { if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return; await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text: text.slice(0, 3900), disable_web_page_preview: true }) }).catch(() => null); }

// automatic screening with a small Claude model; any failure means "wait for the admin"
async function screen(text: string): Promise<{ ok: boolean; reason: string }> {
  if (!S.ANTHROPIC_API_KEY) return { ok: false, reason: 'no screening key' };
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: { 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json', ...(S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}) },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 120, system: 'You moderate a Hebrew anonymous forum about personal debt, insolvency and enforcement in Israel. Reply with JSON only: {"ok":true|false,"reason":"short English reason"}. ok=false if the post: is spam or advertising (including lawyers or companies promoting themselves, links to services, phone numbers for business), contains personal identifying details of anyone (full names with context, ID numbers, phone numbers, addresses, emails, case numbers), insults or threatens a person or group, names and accuses a specific private person or business, is sexual or violent, or is unrelated to money and debt. Normal questions, personal stories without identifying details, and helpful answers are ok=true.', messages: [{ role: 'user', content: text.slice(0, 4000) }] }) });
    const j: Any = await r.json(); const t = (j.content?.[0]?.text || '').replace(/^[^{]*/, '').replace(/[^}]*$/, '');
    const o = JSON.parse(t); return { ok: !!o.ok, reason: String(o.reason || '') };
  } catch { return { ok: false, reason: 'screening failed' }; }
}
async function user(tok: string) {
  const p = await check(tok); if (!p) return null;
  const u = await get('forum_u', p.u); if (!u || u.blocked) return null; return { id: p.u, ...u, role: p.r };
}
async function rate(uid: string, coll: string, max: number) {
  const since = new Date(Date.now() - 3600e3).toISOString();
  const { count } = await sb.from('docs').select('id', { count: 'exact', head: true }).eq('coll', coll).eq('data->>uid', uid).gte('updated_at', since);
  return (count || 0) < max;
}
const pubQ = (id: string, d: Any) => ({ id, title: d.title, body: d.body, topic: d.topic, nick: d.nick, created: d.created, answers: d.answers || 0, staff: !!d.staff });
const pubA = (id: string, d: Any) => ({ id, qid: d.qid, body: d.body, nick: d.nick, created: d.created, staff: !!d.staff, guide: d.staff && typeof d.guide === 'string' ? d.guide : undefined });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await secrets();
  if (!S.FORUM_SECRET) return J({ ok: false, error: 'not configured' }, 503);
  const url = new URL(req.url); const a = url.searchParams.get('a') || '';
  try {
    // ---------- public reads ----------
    if (req.method === 'GET') {
      if (a === 'list' || a === 'export') {
        let q = sb.from('docs').select('id,data').eq('coll', 'forum_q').eq('data->>status', 'live').order('updated_at', { ascending: false }).limit(a === 'export' ? 1000 : 60);
        const topic = url.searchParams.get('topic'); if (topic && a === 'list') q = q.eq('data->>topic', topic);
        const { data } = await q; const qs = (data || []).map((r: Any) => pubQ(r.id, r.data));
        if (a === 'list') return J({ ok: true, items: qs, topics: TOPICS });
        const { data: an } = await sb.from('docs').select('id,data').eq('coll', 'forum_a').eq('data->>status', 'live').limit(5000);
        return J({ ok: true, questions: qs, answers: (an || []).map((r: Any) => pubA(r.id, r.data)) });
      }
      if (a === 'q') {
        const id = clip(url.searchParams.get('id'), 40); const d = await get('forum_q', id); if (!d || d.status !== 'live') return J({ ok: false }, 404);
        const { data } = await sb.from('docs').select('id,data').eq('coll', 'forum_a').eq('data->>qid', id).eq('data->>status', 'live').order('updated_at', { ascending: true });
        return J({ ok: true, q: pubQ(id, d), answers: (data || []).map((r: Any) => pubA(r.id, r.data)) });
      }
      return J({ ok: false, error: 'a?' }, 400);
    }
    const b: Any = await req.json().catch(() => ({}));
    if (b.website) return J({ ok: true });

    // ---------- sign in with an email code ----------
    if (a === 'code') {
      const email = clip(b.email, 120).toLowerCase(); if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return J({ ok: false, error: 'email' }, 400);
      if (!S.RESEND_API_KEY || !S.FORUM_FROM) return J({ ok: false, error: 'email-not-ready' }, 503);
      const eh = (await hmac('e:' + email)).slice(0, 32); const code = String(Math.floor(100000 + Math.random() * 900000));
      const prev = await get('forum_c', eh); if (prev && Date.now() - Date.parse(prev.sent) < 60e3) return J({ ok: false, error: 'wait' }, 429);
      const rec = { ch: await hmac('c:' + eh + code), exp: Date.now() + 15 * 60e3, tries: 0, sent: new Date().toISOString() };
      if (prev) await merge('forum_c', eh, rec); else await insert('forum_c', eh, rec);
      const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${S.RESEND_API_KEY}`, 'content-type': 'application/json' }, body: JSON.stringify({ from: S.FORUM_FROM, to: [email], subject: `קוד הכניסה שלכם לפורום: ${code}`, html: `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px"><p>קוד הכניסה לפורום של בלי חובות:</p><p style="font-size:30px;font-weight:700;letter-spacing:4px">${code}</p><p>הקוד תקף ל-15 דקות. כתובת המייל שלכם לא נשמרת ולא תוצג בפורום.</p></div>` }) });
      if (!r.ok) return J({ ok: false, error: 'send' }, 502);
      return J({ ok: true });
    }
    if (a === 'verify') {
      const email = clip(b.email, 120).toLowerCase(); const code = clip(b.code, 10).replace(/\D/g, '');
      const eh = (await hmac('e:' + email)).slice(0, 32); const c = await get('forum_c', eh);
      if (!c || c.exp < Date.now() || c.tries >= 5) return J({ ok: false, error: 'expired' }, 400);
      if (c.ch !== await hmac('c:' + eh + code)) { await merge('forum_c', eh, { tries: (c.tries || 0) + 1 }); return J({ ok: false, error: 'code' }, 400); }
      await merge('forum_c', eh, { exp: 0 });
      let u = await get('forum_u', eh);
      if (u?.blocked) return J({ ok: false, error: 'blocked' }, 403);
      let nickIn = clip(b.nick, 24).replace(/[<>@]/g, ''); if (/צוות|בלי\s*חובות|מנהל|admin/i.test(nickIn)) nickIn = ''; // only staff posts may look official
      const nick = nickIn || u?.nick || `אנונימי ${parseInt(eh.slice(0, 6), 16) % 9000 + 1000}`;
      if (!u) { u = { nick, created: new Date().toISOString(), blocked: false }; await insert('forum_u', eh, u); } else if (b.nick) await merge('forum_u', eh, { nick });
      return J({ ok: true, token: await sign({ u: eh, r: 'u', exp: Date.now() + 30 * 864e5 }), nick });
    }

    // ---------- posting ----------
    if (a === 'ask' || a === 'answer') {
      const u = await user(b.token); if (!u) return J({ ok: false, error: 'login' }, 401);
      const coll = a === 'ask' ? 'forum_q' : 'forum_a';
      if (!(await rate(u.id, coll, a === 'ask' ? 3 : 10))) return J({ ok: false, error: 'rate' }, 429);
      const body = clip(b.body, 3000); if (body.length < 15) return J({ ok: false, error: 'short' }, 400);
      let rec: Any; let label = '';
      if (a === 'ask') {
        const title = clip(b.title, 140); if (title.length < 8) return J({ ok: false, error: 'title' }, 400);
        const topic = TOPICS.includes(b.topic) ? b.topic : 'אחר';
        rec = { title, body, topic, uid: u.id, nick: u.nick, answers: 0 }; label = `שאלה: ${title}\n\n${body}`;
      } else {
        const qid = clip(b.qid, 40); const q = await get('forum_q', qid); if (!q || q.status !== 'live') return J({ ok: false, error: 'q' }, 404);
        rec = { qid, body, uid: u.id, nick: u.nick }; label = `תשובה לשאלה "${q.title}":\n\n${body}`;
      }
      const s = await screen(label); const id = newId(a === 'ask' ? 'q' : 'a');
      rec = { ...rec, status: s.ok ? 'live' : 'pending', reason: s.reason, created: new Date().toISOString(), reports: 0 };
      await insert(coll, id, rec);
      if (s.ok && a === 'answer') { const q = await get('forum_q', rec.qid); await merge('forum_q', rec.qid, { answers: (q?.answers || 0) + 1 }); }
      if (!s.ok) await tg(`🟡 הודעה בפורום מחכה לאישור שלך (${s.reason})\n\n${label.slice(0, 900)}\n\nלניהול: עמוד הניהול של הפורום`);
      return J({ ok: true, id, status: rec.status });
    }
    if (a === 'report') {
      const id = clip(b.id, 40); const coll = id.startsWith('q') ? 'forum_q' : 'forum_a'; const d = await get(coll, id); if (!d) return J({ ok: false }, 404);
      const n = (d.reports || 0) + 1; await merge(coll, id, n >= 3 ? { reports: n, status: 'pending', reason: 'reported by users' } : { reports: n });
      if (n === 1 || n >= 3) await tg(`🚩 דיווח על הודעה בפורום (${n} דיווחים${n >= 3 ? ', הוסתרה עד שתחליט' : ''}):\n\n${(d.title ? d.title + '\n' : '') + String(d.body).slice(0, 600)}`);
      return J({ ok: true });
    }

    // ---------- admin ----------
    if (a === 'admincode') {
      const prev = await get('forum_c', 'admin'); if (prev && Date.now() - Date.parse(prev.sent) < 60e3) return J({ ok: false, error: 'wait' }, 429);
      const code = String(Math.floor(100000 + Math.random() * 900000)); const rec = { ch: await hmac('admin:' + code), exp: Date.now() + 10 * 60e3, tries: 0, sent: new Date().toISOString() };
      if (prev) await merge('forum_c', 'admin', rec); else await insert('forum_c', 'admin', rec);
      await tg(`🔐 קוד כניסה לניהול הפורום של בלי חובות: ${code}\nתקף ל-10 דקות. אם לא ביקשת, אפשר להתעלם.`);
      return J({ ok: true });
    }
    if (a === 'adminverify') {
      const c = await get('forum_c', 'admin'); const code = clip(b.code, 10).replace(/\D/g, '');
      if (!c || c.exp < Date.now() || c.tries >= 5) return J({ ok: false, error: 'expired' }, 400);
      if (c.ch !== await hmac('admin:' + code)) { await merge('forum_c', 'admin', { tries: (c.tries || 0) + 1 }); return J({ ok: false, error: 'code' }, 400); }
      await merge('forum_c', 'admin', { exp: 0 });
      return J({ ok: true, token: await sign({ u: 'admin', r: 'admin', exp: Date.now() + 7 * 864e5 }) });
    }
    if (a === 'admin') {
      const p = await check(b.token); if (!p || p.r !== 'admin') return J({ ok: false, error: 'login' }, 401);
      const op = String(b.op || ''); const id = clip(b.id, 40); const coll = id.startsWith('q') ? 'forum_q' : 'forum_a';
      if (op === 'feed') {
        const { data } = await sb.from('docs').select('id,coll,data').in('coll', ['forum_q', 'forum_a']).neq('data->>status', 'deleted').order('updated_at', { ascending: false }).limit(150);
        const { data: bl } = await sb.from('docs').select('id,data').eq('coll', 'forum_u').eq('data->>blocked', 'true').limit(200);
        return J({ ok: true, items: (data || []).map((r: Any) => ({ id: r.id, type: r.coll === 'forum_q' ? 'q' : 'a', ...r.data })), blocked: (bl || []).map((r: Any) => ({ id: r.id, nick: r.data.nick, why: r.data.blockReason || '' })) });
      }
      if (op === 'staffq' || op === 'staffa') { // official posts by the site team, always marked as such
        const body = clip(b.body, 6000); if (body.length < 15) return J({ ok: false, error: 'short' }, 400);
        const base = { body, nick: 'צוות בלי חובות', staff: true, status: 'live', reason: 'staff', created: new Date().toISOString(), reports: 0 };
        if (op === 'staffq') { const title = clip(b.title, 140); if (title.length < 8) return J({ ok: false, error: 'title' }, 400); const nid = newId('q'); await insert('forum_q', nid, { ...base, title, topic: TOPICS.includes(b.topic) ? b.topic : 'אחר', answers: 0, uid: 'staff' }); return J({ ok: true, id: nid }); }
        const qid = clip(b.qid, 40); const q = await get('forum_q', qid); if (!q) return J({ ok: false, error: 'q' }, 404);
        const nid = newId('a'); await insert('forum_a', nid, { ...base, qid, uid: 'staff', guide: /^[a-z0-9-]{2,60}$/.test(String(b.guide || '')) ? b.guide : undefined });
        await merge('forum_q', qid, { answers: (q.answers || 0) + 1 }); return J({ ok: true, id: nid });
      }
      const d = await get(coll, id); if (!d && op !== 'unblock') return J({ ok: false, error: 'id' }, 404);
      if (op === 'approve') { await merge(coll, id, { status: 'live', reason: 'approved by admin' }); if (coll === 'forum_a' && d.status !== 'live') { const q = await get('forum_q', d.qid); await merge('forum_q', d.qid, { answers: (q?.answers || 0) + 1 }); } }
      else if (op === 'hide') await merge(coll, id, { status: 'hidden' });
      else if (op === 'delete') { await merge(coll, id, { status: 'deleted', body: '', title: d.title ? '(נמחק)' : undefined }); if (coll === 'forum_a' && d.status === 'live') { const q = await get('forum_q', d.qid); await merge('forum_q', d.qid, { answers: Math.max(0, (q?.answers || 1) - 1) }); } }
      else if (op === 'block') { if (d.staff) return J({ ok: false, error: 'staff' }, 400); await merge('forum_u', d.uid, { blocked: true, blockReason: clip(b.why, 120), blockedAt: new Date().toISOString() }); await merge(coll, id, { status: 'hidden' }); }
      else if (op === 'unblock') await merge('forum_u', id, { blocked: false });
      else return J({ ok: false, error: 'op' }, 400);
      return J({ ok: true });
    }
    return J({ ok: false, error: 'a?' }, 400);
  } catch (e) { console.error(e); return J({ ok: false, error: 'server' }, 500); }
});
