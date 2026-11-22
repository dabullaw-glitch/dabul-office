// drip (23.11.2026): three short follow-up emails after someone downloads the buyer checklist.
// Yakir approved on 22.11.2026 (after Eliran Shirazi's message): day 2 what to check in the land registry extract,
// day 4 what people miss in the contract, day 7 an invitation to call the office ("פשוט שיחה עם המשרד").
// The monthly newsletter goes on as before. Stops for anyone who already became a client or contacted the office,
// and for anyone who left the list. Only runs while docs settings/drip.active is true.
// POST ?step=run  (x-cron-secret)  -> sends what is due now (daily cron office-drip)
// POST ?step=preview {to, n}       -> sends one email of the sequence as a test to one address (no record kept)
import { createClient } from 'npm:@supabase/supabase-js@2';

const S: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || S[k] || '';
// deno-lint-ignore no-explicit-any
type Any = any;
let _a: Any = null;
const admin = () => _a || (_a = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function secrets() { const { data } = await admin().from('app_secrets').select('k,v'); (data || []).forEach((r: Any) => { S[r.k] = r.v; }); }
const json = (o: unknown, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string) => (await db().select('data').match({ coll, id }).maybeSingle()).data?.data || null;
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Any)[c]);
const DAY = 86400e3;

const C = { accent: '#8c7646', ink: '#141414', fg: '#1f2937', muted: '#6b7280', soft: '#ecedf2', border: '#e2e0da', gold: '#e4d19c' };
const OFFICE = { name: 'יקיר דבול - משרד עורכי דין', lawyer: 'עו״ד יקיר דבול', address: 'רזיאל 1, נתניה', phone: '09-8613413' };
const A4300 = 'https://dabullaw.co.il/preliminary-checks-before-buying-real-estate-guide/';
const A1626 = 'https://dabullaw.co.il/%d7%a1%d7%a2%d7%99%d7%a4%d7%99%d7%9d-%d7%97%d7%a9%d7%95%d7%91%d7%99%d7%9d-%d7%91%d7%94%d7%a1%d7%9b%d7%9d-%d7%9e%d7%9b%d7%a8-%d7%93%d7%99%d7%a8%d7%94-%d7%99%d7%93-%d7%a9%d7%a0%d7%99%d7%99%d7%94/';
const utm = (u: string, n: number) => { const x = new URL(u); x.searchParams.set('utm_source', 'email'); x.searchParams.set('utm_medium', 'drip'); x.searchParams.set('utm_campaign', 'checklist-' + n); return x.toString(); };
const btn = (href: string, label: string) => `<a href="${href}" style="display:inline-block;background:${C.gold};color:${C.ink};text-decoration:none;font-weight:bold;padding:13px 22px;border-radius:10px;font-size:16px">${esc(label)}</a>`;
const p = (s: string) => `<p style="margin:0 0 14px">${s}</p>`;
const ol = (items: string[]) => `<ol style="margin:0 0 16px;padding:0 22px 0 0">${items.map((i) => `<li style="margin:0 0 8px">${i}</li>`).join('')}</ol>`;
const hi = (name: string) => p(`שלום${name ? ' ' + esc(name) : ''},`);
const sign = `<p style="margin:18px 0 0">${OFFICE.lawyer}<br><span style="color:${C.muted};font-size:14px">${OFFICE.name}</span></p>`;

// the approved texts (22.11.2026)
const SEQ = [
  { n: 1, day: 2, subject: '3 דברים שכדאי לבדוק בנסח הטאבו לפני שמתקדמים', pre: 'שלוש בדיקות קצרות, לפני שמתקדמים עם הדירה',
    body: (name: string) => hi(name) + p('הורדת את הצ\'קליסט לפני קניית דירה. הנה שלושה דברים בנסח הטאבו שכדאי לבדוק כבר עכשיו:') +
      ol(['מי רשום כבעלים, והאם זה בדיוק מי שמוכר לכם.', 'האם רשומים על הדירה משכנתא, עיקול או הערת אזהרה לטובת מישהו אחר.', 'האם החניה והמחסן באמת רשומים כחלק מהדירה.']) +
      `<p style="margin:22px 0">${btn(utm(A4300, 1), 'למדריך המלא: בדיקות לפני קניית דירה')}</p>` + sign },
  { n: 2, day: 4, subject: 'מה בדרך כלל מפספסים בחוזה של דירה יד שנייה', pre: 'ארבעה דברים שכדאי לשים לב אליהם בחוזה',
    body: (name: string) => hi(name) + p('החוזה הוא המקום שבו רוב הבעיות נולדות. כמה דברים שכדאי לשים לב אליהם:') +
      ol(['מתי משלמים, ומה מגן על הכסף שלכם עד שהדירה נרשמת על שמכם.', 'מה בדיוק נשאר בדירה, ובאיזה מצב היא נמסרת.', 'מה קורה אם המסירה מתאחרת.', 'איך נסגרת המשכנתא של המוכר.']) +
      `<p style="margin:22px 0">${btn(utm(A1626, 2), 'למדריך המלא: סעיפים חשובים בהסכם מכר')}</p>` + sign },
  { n: 3, day: 7, subject: 'יש לכם דירה על הפרק?', pre: 'אם כבר מצאתם דירה, אשמח לשמוע',
    body: (name: string) => hi(name) + p('אם כבר מצאתם דירה, או שאתם קרובים לזה, אשמח לשמוע במה מדובר ולעבור איתכם על הצעד הבא, לפני שחותמים על משהו.') +
      p(`אפשר להתקשר למשרד: <a href="tel:+97298613413" style="color:${C.accent};font-weight:bold;text-decoration:none">${OFFICE.phone}</a>`) + sign },
];
const BANNED = /הטוב(?:ים|ה|ות)? ביותר|הכי טוב|מומחה|חינם|ללא עלות|מבטיח|מובטח|שכר טרחה|ייעוץ ראשוני|[—–]/;

function shell(inner: string, t: string, pre: string) {
  const base = (env('PUBLIC_PAGE_BASE') || 'https://dabullaw-glitch.github.io/dabul-office/portal.html').replace(/#.*$/, '');
  const unsub = `${base}#g=unsub&t=${t}`;
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${C.soft}"><span style="display:none;max-height:0;overflow:hidden">${esc(pre)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.soft}"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${C.border};border-radius:14px;font-family:Arial,Helvetica,sans-serif;color:${C.fg};direction:rtl;text-align:right">
<tr><td style="padding:22px 28px;background:${C.ink};border-radius:14px 14px 0 0;border-bottom:3px solid ${C.gold}"><div style="font-size:20px;font-weight:bold;color:#ffffff">${esc(OFFICE.name)}</div><div style="font-size:13px;color:${C.gold}">מקרקעין, עסקאות נדל״ן והתחדשות עירונית</div></td></tr>
<tr><td style="padding:26px 28px;font-size:16px;line-height:1.75">${inner}</td></tr>
<tr><td style="padding:18px 28px;background:${C.soft};border-radius:0 0 14px 14px;font-size:12px;line-height:1.7;color:${C.muted}">
קיבלת את המייל הזה כי הורדת את הצ'קליסט ונרשמת לרשימת העדכונים של המשרד באתר dabullaw.co.il. ${esc(OFFICE.name)}, ${esc(OFFICE.address)}, טלפון ${OFFICE.phone}.<br>
להסרה מרשימת התפוצה: <a href="${unsub}" style="color:${C.accent}">לחצו כאן להסרה</a>.<br>
המידע במייל כללי ואינו מהווה ייעוץ משפטי לעניין מסוים.</td></tr></table></td></tr></table></body></html>`;
}

async function quota(n: number) {
  const cfg = await getDoc('settings', 'growth') || {};
  const cap = Number(cfg.newsletter?.dailyCap || 95);
  const day = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })).toISOString().slice(0, 10);
  const q = await getDoc('nlstate', 'quota') || {};
  const used = q.day === day ? Number(q.used || 0) : 0;
  return { day, used, ok: used + n <= cap };
}
async function send(to: string, t: string, item: typeof SEQ[number], name: string) {
  const html = shell(item.body(name), t, item.pre);
  if (BANNED.test(html.replace(/<[^>]+>/g, ' '))) throw new Error('banned word in email ' + item.n);
  const q = await quota(1); if (!q.ok) return false;
  const unsubFn = `${env('SUPABASE_URL')}/functions/v1/growth?a=unsub&t=${t}`;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${env('RESEND_API_KEY')}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: env('NL_FROM'), to: [to], reply_to: env('NL_REPLY_TO') || undefined, subject: item.subject, html, text: item.subject + '\n' + (item.n < 3 ? '' : 'טלפון המשרד: ' + OFFICE.phone),
      headers: { 'List-Unsubscribe': `<${unsubFn}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }) });
  if (!r.ok) { console.error('resend', r.status, (await r.text()).slice(0, 300)); return false; }
  await db().upsert({ coll: 'nlstate', id: 'quota', data: { day: q.day, used: q.used + 1 }, updated_at: new Date().toISOString() });
  return true;
}

const digits = (s: string) => String(s || '').replace(/\D/g, '').slice(-9);
async function contacted(email: string, phone: string) {
  const e = email.toLowerCase(), ph = digits(phone);
  for (const coll of ['clients', 'leads']) {
    const { data } = await db().select('id').eq('coll', coll).ilike('data->>email', e).limit(1);
    if (data && data.length) return coll;
    if (ph.length === 9) { const { data: d2 } = await db().select('id').eq('coll', coll).like('data->>phone', `%${ph.slice(-7)}%`).limit(20);
      if (d2 && d2.length) return coll; }
  }
  return '';
}

async function run() {
  const cfg = await getDoc('settings', 'drip') || {};
  if (!cfg.active) return { skipped: 'not active' };
  const start = Date.parse(cfg.startFrom || new Date().toISOString());
  const { data } = await db().select('id,data').eq('coll', 'subs').eq('data->>status', 'active');
  const out: Any[] = [];
  for (const row of data || []) {
    const s = row.data;
    if (s.test || !s.welcomeAt || !s.tok || !s.email) continue;
    if (!['buyer-checklist', 'updates', undefined, ''].includes(s.magnet)) continue;
    const d = s.drip || {};
    if (d.stopped) continue;
    const sent: Any[] = d.sent || [];
    const next = SEQ.find((x) => !sent.some((y: Any) => y.n === x.n));
    if (!next) continue;
    const base = Math.max(Date.parse(s.welcomeAt), start);
    const prev = sent.length ? Date.parse(sent[sent.length - 1].at) : 0;
    if (Date.now() < base + next.day * DAY - 3 * 3600e3) continue;          // not due yet
    if (prev && Date.now() - prev < 1.5 * DAY) continue;                    // at least a day and a half between emails
    const who = await contacted(s.email, s.phone || '');
    if (who) { await merge('subs', row.id, { drip: { ...d, stopped: who, stoppedAt: new Date().toISOString() } }); out.push({ id: row.id, stopped: who }); continue; }
    const ok = await send(s.email, s.tok, next, s.name || '');
    if (ok) { await merge('subs', row.id, { drip: { ...d, sent: [...sent, { n: next.n, at: new Date().toISOString() }] } }); out.push({ id: row.id, n: next.n }); }
  }
  const res = { at: new Date().toISOString(), sent: out.filter((x) => x.n).length, stopped: out.filter((x) => x.stopped).length, items: out };
  await merge('agents', 'drip-' + new Date().toISOString().slice(0, 10), res);
  return res;
}

Deno.serve(async (req) => {
  await secrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const step = new URL(req.url).searchParams.get('step');
  try {
    if (step === 'run') return json(await run());
    if (step === 'preview') {
      const b: Any = await req.json().catch(() => ({}));
      const item = SEQ.find((x) => x.n === Number(b.n)) || SEQ[0];
      const ok = await send(String(b.to || ''), 'preview' + '0'.repeat(33), item, String(b.name || ''));
      return json({ ok, n: item.n });
    }
    return json({ error: 'step?' }, 400);
  } catch (e) { return json({ error: String((e as Error).message || e) }, 500); }
});
