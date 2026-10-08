// Case stories for dabullaw.co.il (category "סיפורי מקרה", id 119), about once a month. Only real cases Yakir sends.
// ?form=1 POST {t, ...}:      the phone form (story.html on the office GitHub site, opened from the Telegram button with the
//                            key after #) sends what happened, what we did and the result; saved as docs casestory/<id>.
// step=ask      (monthly):   Telegram message to Yakir with a button to the form.
// step=preview  (writer):    every artjob with mode 'story' and status 'story-written' becomes a hidden draft on the site,
//                            and Yakir gets a Telegram message with preview / approve / reject buttons. Nothing is public.
// ?approve=<token>:          the draft is removed and the job goes to the regular articles engine (status 'written'):
//                            the same checks, cover image and Yoast fields as every article, scheduled for the next morning.
// ?cancel=<token>:           the draft is removed, the story is not published.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _admin: any = null;
const admin = () => _admin || (_admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await admin().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const text = (m: string) => new Response(m, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
const SITE = 'https://dabullaw.co.il';
const FN = () => `${env('SUPABASE_URL')}/functions/v1/story`;
const basic = (u: string, p: string) => 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode(`${u}:${p.replace(/\s+/g, '')}`)));
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
// deno-lint-ignore no-explicit-any
async function tg(msg: string, buttons?: any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: msg.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}
// the same bar rules the articles engine checks
const BANNED: [RegExp, string][] = [
  [/הטוב(?:ים|ה|ות)? ביותר/g, '"הטוב ביותר"'], [/הכי טוב/g, '"הכי טוב"'], [/(?:ה)?מוביל(?:ים|ה|ות)? (?:בתחום|בישראל|בשרון|בנתניה)/g, '"מוביל"'],
  [/מקסימלי(?:ת|ים)?/g, '"מקסימלי"'], [/(?:עורכ?י? דין|עו"ד|עו״ד|משרד(?:נו)?)\s+מומח/g, '"מומחה"'], [/מומחי(?:ם|ות)? (?:ב|ל)/g, '"מומחים"'],
  [/(?:ייעוץ|פגישה|שיחה|בדיקה)(?: ראשונ(?:י|ית))? (?:חינם|ללא עלות|ללא תשלום)/g, 'ייעוץ חינם'], [/(?:אחוזי|שיעור) הצלחה/g, 'שיעורי הצלחה'],
  [/מבטיח(?:ים)? (?:לכם|לך) /g, 'הבטחה לתוצאה'], [/מדהימ/g, 'לשון הפלגה "מדהים"'], [/(?:^|\s)שיא(?=[\s.,!?]|$)/g, 'לשון הפלגה "שיא"'],
];

// the form itself is a static page on the office GitHub site (story.html); it posts JSON here with the key from its link
const FORM_URL = 'https://dabullaw-glitch.github.io/dabul-office/story.html';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' };
const cj = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'content-type': 'application/json; charset=utf-8' } });
async function saveForm(req: Request) {
  // deno-lint-ignore no-explicit-any
  const b: any = await req.json().catch(() => ({}));
  if (!env('STORY_KEY') || b.t !== env('STORY_KEY')) return cj({ ok: false, error: 'key' }, 403);
  const g = (k: string) => String(b[k] || '').trim().slice(0, 6000);
  if (!g('before') || !g('did') || !g('result') || b.real !== true) return cj({ ok: false, error: 'missing' }, 400);
  const id = 'cs-' + Date.now().toString(36), now = new Date().toISOString();
  await admin().from('docs').insert({ coll: 'casestory', id, data: { status: 'new', area: g('area'), before: g('before'), did: g('did'), result: g('result'), lesson: g('lesson'), avoid: g('avoid'), real: true, created: now } });
  await tg(`📖 קיבלתי סיפור מקרה (${g('area')}).\nאכתוב ממנו מאמר בסגנון של האתר, ואשלח לך תצוגה מקדימה עם כפתור אישור. שום דבר לא עולה לאתר בלי האישור שלך.`);
  return cj({ ok: true, id });
}

async function ask() {
  const { data: q } = await admin().from('docs').select('id').eq('coll', 'casestory').eq('data->>status', 'new');
  const waiting = (q || []).length;
  await tg(`📖 סיפור מקרה לאתר, פעם בחודש\n\nיש תיק מהתקופה האחרונה שכדאי לספר? סיפורים אמיתיים בונים אמון, ומראים איך העבודה נראית בפועל.\nכמה משפטים מספיקים: מה היה המצב, מה עשינו, איך זה נגמר. אני כותב מזה מאמר מלא (סיפור, ובסוף לקחים ושאלות ותשובות), ושולח לאישורך לפני שמשהו עולה.${waiting ? `\n\n(יש כבר ${waiting} ${waiting === 1 ? 'סיפור שמחכה' : 'סיפורים שמחכים'} לכתיבה.)` : ''}`,
    [[{ text: '✍️ לכתיבת הסיפור', url: `${FORM_URL}#${env('STORY_KEY')}` }]]);
  return { ok: true, waiting };
}

async function preview() {
  const { data: jobs } = await admin().from('docs').select('id,data').eq('coll', 'artjob').eq('data->>mode', 'story').eq('data->>status', 'story-written').limit(3);
  const out: string[] = [];
  const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
  const { data: exr } = await admin().from('docs').select('data').match({ coll: 'artcfg', id: 'exemplar' }).maybeSingle();
  const style = exr?.data?.style || '';
  for (const row of jobs || []) {
    const job = row.data;
    const plain = String(job.html || '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
    const issues: string[] = [];
    for (const [re, label] of BANNED) { const m = plain.match(re); if (m) issues.push(`${label}: "${m[0]}"`); }
    if (/[—–]/.test(plain)) issues.push('מקף ארוך');
    if (issues.length) { await merge('artjob', row.id, { status: 'held', issues, heldAt: new Date().toISOString() }); continue; }
    const r = await fetch(`${SITE}/wp-json/wp/v2/posts${job.draftId ? '/' + job.draftId : ''}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' },
      body: JSON.stringify({ title: `[סיפור מקרה לאישור] ${job.meta?.title || ''}`, status: 'draft', content: `${style}\n${job.html}`, categories: [119] }) });
    // deno-lint-ignore no-explicit-any
    const p: any = await r.json().catch(() => ({}));
    if (!r.ok || !p.id) { await merge('artjob', row.id, { previewError: `${r.status} ${String(p.message || '').slice(0, 120)}` }); continue; }
    const ok = crypto.randomUUID().replace(/-/g, ''), no = crypto.randomUUID().replace(/-/g, '');
    await merge('artjob', row.id, { status: 'story-awaiting', draftId: p.id, approveToken: ok, cancelToken: no, previewAt: new Date().toISOString(), previewError: '' });
    await tg(`📖 סיפור מקרה מוכן לאישורך\n\n${job.meta?.title || ''}\n${job.words ? `${job.words} מילים. ` : ''}נכתב מהפרטים ששלחת, בלי שום פרט מזהה.\n\nכדאי לקרוא ולוודא שהעובדות מדויקות. שום דבר לא עולה לאתר עד שתאשר. באישור הוא עובר את הבדיקה הרגילה של המאמרים ועולה למחרת בבוקר.`,
      [[{ text: '👁 תצוגה מקדימה', url: `${SITE}/?p=${p.id}&preview=true` }], [{ text: '✅ מאשר, להעלות', url: `${FN()}?approve=${ok}` }], [{ text: '⛔ לא להעלות', url: `${FN()}?cancel=${no}` }]]);
    out.push(row.id);
  }
  return { previews: out };
}

async function decide(token: string, approve: boolean) {
  const field = approve ? 'approveToken' : 'cancelToken';
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'artjob').eq(`data->>${field}`, token).limit(1);
  const row = data && data[0];
  if (!row) return text('הקישור לא תקף, או שהסיפור כבר טופל.');
  if (row.data.status !== 'story-awaiting') return text('הסיפור הזה כבר טופל.');
  const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
  if (row.data.draftId) await fetch(`${SITE}/wp-json/wp/v2/posts/${row.data.draftId}?force=true`, { method: 'DELETE', headers: { authorization: auth } }).catch(() => null);
  if (approve) {
    await merge('artjob', row.id, { status: 'written', approvedAt: new Date().toISOString(), draftId: null, categories: [119] });
    if (row.data.storyId) await merge('casestory', row.data.storyId, { status: 'approved' });
    await tg(`✅ אישרת את סיפור המקרה: ${row.data.meta?.title || ''}\nהוא עובר עכשיו את הבדיקה הרגילה, ויעלה מחר בבוקר. תקבל הודעה עם כפתור עצירה כרגיל.`);
    return text('✓ אושר. הסיפור יעלה לאתר מחר בבוקר. אפשר לסגור את הדף.');
  }
  await merge('artjob', row.id, { status: 'story-rejected', rejectedAt: new Date().toISOString(), draftId: null });
  if (row.data.storyId) await merge('casestory', row.data.storyId, { status: 'rejected' });
  await tg(`⛔ סיפור המקרה "${row.data.meta?.title || ''}" לא יעלה. אם תרצה שאתקן משהו, שלח לי מה לשנות.`);
  return text('✓ הסיפור לא יעלה לאתר. אפשר לסגור את הדף.');
}

Deno.serve(async (req) => {
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (url.searchParams.get('form') === '1' && req.method === 'POST') return await saveForm(req);
  const ap = url.searchParams.get('approve'); if (ap) return await decide(ap.replace(/[^a-f0-9]/g, ''), true);
  const cn = url.searchParams.get('cancel'); if (cn) return await decide(cn.replace(/[^a-f0-9]/g, ''), false);
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  const step = url.searchParams.get('step');
  try {
    if (step === 'ask') return json(await ask());
    if (step === 'preview') return json(await preview());
    return json({ error: 'step?' }, 400);
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); }
});
