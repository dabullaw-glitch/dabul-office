// fbleads: posts read from the Facebook groups Yakir belongs to are checked here. New posts only (by post id), a quick
// word filter, then Claude on Yakir's own Anthropic key decides:
//   seek     - someone is looking for a lawyer for something in Yakir's fields  -> a ready reply with name, office phone, site
//   question - someone asks a question in his fields                            -> a short helpful answer + link to a matching article
//   none     - nothing to do
// Every hit is saved in the office system (docs coll fbleads, state 'new'; screen "מפייסבוק" under לקוחות, addon-fbleads.js),
// with the direct link to the post. After a scan with new hits, ONE short note goes to the regular office bot.
// Posts already checked are remembered in storage (files/fbleads/seen.json). Yakir posts the reply himself; nothing is
// ever posted to Facebook from here.
//
// Keys: k = CRON_SECRET (everything) or k = FBSCAN_KEY (the scanner on Yakir's computer: plan, scan, status only).
// POST {k, posts:[{id,url,group,author,text,time}]}        old shape (CRON_SECRET only)
// POST {k, op:'scan', posts:[{g,i,a,t}]}                    scanner shape: only approved groups (docs fbleads/groups.on) are kept
// POST {k, op:'plan'}                                        -> {keys:[...]} the groups to visit this run (docs fbscan/rotation)
// POST {k, op:'status', state:'ok'|'logged_out'|'error', note} -> Telegram only when the state changes
// POST {op:'pair', code}                                     one-time code (docs fbscan/pair) -> {key: FBSCAN_KEY}, then the code is spent
// POST {k, op:'groups', groups:[...]} / {k, op:'test', text} (CRON_SECRET only)
import { createClient } from 'jsr:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
let S: Record<string, string> = {};
async function secrets() { const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'FBSCAN_KEY', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'APP_URL']); S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v])); }
const J = (d: Any, s = 200) => Response.json(d, { status: s });
const get = async (coll: string, id: string) => { const { data } = await sb.from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const put = (coll: string, id: string, data: Any) => sb.from('docs').upsert({ coll, id, data, updated_at: new Date().toISOString() }, { onConflict: 'coll,id' });
const clip = (s: unknown, n: number) => String(s ?? '').replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').trim().slice(0, n);
const same = (a: string, b: string) => { if (!a || !b || a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; };

// cheap first filter: only posts that touch one of the office fields go to the model (topic words, not just "lawyer")
const WORDS = /דירה|דירות|נכס|נדל["״]?ן|טאבו|נסח|רישום|חוזה מכר|זיכרון דברים|זכרון דברים|קבלן|יזם|פינוי|בינוי|תמ["״]?א|התחדשות|מס רכישה|מס שבח|היטל השבחה|משכנתא|ירושה|ירושות|צוואה|צוואות|עיזבון|עזבון|ייפוי כוח מתמשך|יפוי כוח מתמשך|אפוטרופ|שכירות|שוכר|משכיר|ועד בית|בית משותף|שכנ|גוש|חלקה|רמ["״]?י|מינהל|חכירה|הערת אזהרה|מכירה|קנייה|קניה|רוכש|מוכר|עיקול|הוצאה לפועל|הוצל["״]?פ|פירוק שיתוף|חניה|מחסן|היתר בנייה|ליקויי|ליקוי|הסכם ממון|חדלות|פשיטת רגל|פש["״]?ר|הסדר חוב|הפטר|נאמן|חובות|רישום חברה|הקמת חברה|בע["״]?מ/; // topic words only: a post that only says "lawyer" is not enough

async function ai(model: string, system: string, user: string, max = 700) {
  const h: Record<string, string> = { 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (S.ANTHROPIC_WORKSPACE_ID) h['anthropic-workspace-id'] = S.ANTHROPIC_WORKSPACE_ID;
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: h, body: JSON.stringify({ model, max_tokens: max, system, messages: [{ role: 'user', content: user }] }) });
  const j: Any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(String(j?.error?.message || r.status));
  return (j.content || []).map((c: Any) => c.text || '').join('');
}
const MODEL = 'claude-haiku-4-5-20251001';
const FIELDS = 'קנייה ומכירה של דירות ונכסים, עסקאות מקבלן, התחדשות עירונית, מיסוי מקרקעין, רישום בטאבו ורמ"י, בתים משותפים, ליקויי בנייה, שכירות, ירושות וצוואות, ייפוי כוח מתמשך, פירוק שיתוף, הסכמי ממון, חדלות פירעון והסדרי חובות, הקמת חברה';
// the only fields that count; the model must name one of these codes, anything else is dropped
const CODES: Record<string, string> = {
  deal: 'קנייה או מכירה של דירה, בית, מגרש או נכס מסחרי: ליווי עסקה, חוזה מכר, זיכרון דברים, משכנתא לרכישה, עסקה בין קרובי משפחה, הערת אזהרה',
  contractor: 'קנייה מקבלן או מיזם: חוזה עם קבלן, איחור במסירה, ערבות חוק מכר, קבלן שקרס',
  renewal: 'התחדשות עירונית: תמ"א 38, פינוי בינוי, הסכם עם יזם, נציגות דיירים, דייר סרבן',
  tax: 'מיסוי מקרקעין: מס שבח, מס רכישה, היטל השבחה, פטורים במכירת דירה',
  registry: 'רישום זכויות: טאבו, נסח, רמ"י, חכירה, חברה משכנת, רישום בית משותף, תיקון צו בית משותף',
  condo: 'בית משותף ושכנים בעניין רכוש או מבנה: רכוש משותף, ועד בית, הצמדות, חניות, מחסנים, גג, נזילות בין דירות, בנייה בלי היתר של שכן',
  defects: 'ליקויי בנייה בדירה, נזקי רכוש למבנה, אחריות קבלן לליקויים',
  rental: 'שכירות דירה או נכס בין שוכר למשכיר: חוזה שכירות, פיקדון וערבויות, פינוי שוכר, ליקויים בדירה שכורה, יציאה מוקדמת',
  estate: 'ירושות וצוואות: צו ירושה, צו קיום צוואה, עריכת צוואה, עיזבון, חלוקת דירה בירושה, התנגדות לצוואה',
  poa: 'ייפוי כוח מתמשך, אפוטרופסות על אדם מבוגר ורכושו',
  partition: 'פירוק שיתוף בנכס, מכירת חלק בדירה משותפת, שותפים שלא מסכימים על נכס',
  prenup: 'הסכם ממון או הסכם רכוש בין בני זוג, דירה של בני זוג',
  insolvency: 'חדלות פירעון, פשיטת רגל, הסדר חובות, הפטר, הוצאה לפועל ועיקולים נגד אדם עם חובות',
  company: 'הקמת חברה בע"מ ורישומה ברשם החברות'
};
async function decide(text: string, group: string) {
  const sys = `אתה מסנן פוסטים מקבוצות פייסבוק עבור משרד עורכי הדין של עו"ד יקיר דבול בנתניה. המשרד מטפל רק בתחומים האלה (קוד: תיאור):
${Object.entries(CODES).map(([k, v]) => `${k}: ${v}`).join('\n')}
קרא את הפוסט והחלט. החזר JSON בלבד:
{"field":"אחד הקודים למעלה או other","type":"seek|question|none","topic":"נושא קצר","area":"עיר או אזור אם מוזכר, אחרת ריק","summary":"משפט אחד בעברית: מה האדם צריך"}
כללים מחייבים:
- field הוא הנושא המרכזי של הפוסט. אם הנושא המרכזי לא נמצא ברשימה, field הוא other ו-type הוא none, גם אם מוזכרים בו דירה, כסף או עורך דין.
- תמיד other: דיני עבודה ופיטורים, פלילי ומשטרה, תעבורה ודוחות, תאונות ונזקי גוף, רשלנות רפואית, צרכנות ושירות לקוחות, גירושין ומשמורת ומזונות, אלימות והטרדות, לשון הרע ופרטיות, מסחר אונליין ותקנונים, החזרי מס ומס הכנסה, ביטוח לאומי, הגירה, בעלי חיים, השקעות ובורסה, חיפוש עורך דין "לכמה נושאים" בלי נושא ברור, ותצהירים או אימות חתימה.
- seek = האדם מחפש עורך דין או המלצה על עורך דין בתחום מהרשימה. question = שואל שאלה בתחום מהרשימה. none = כל השאר, כולל פרסומות, מודעות למכירה או להשכרה בלי שאלה, ועורכי דין שמפרסמים את עצמם.
- אם יש ספק, החזר none.`;
  const out = await ai(MODEL, sys, `קבוצה: ${group}\nפוסט:\n${text}`, 300);
  let d: Any = { type: 'none' };
  try { d = JSON.parse((out.match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch { d = { type: 'none' }; }
  if (!CODES[d.field]) d.type = 'none';
  return d;
}

// the office's main articles (title + address), kept in docs fbleads/articles; the model picks the one that fits
let ARTS: { t: string; u: string }[] | null = null;
async function articles() { if (ARTS) return ARTS; const a = await get('fbleads', 'articles'); ARTS = (a?.list || []).map((x: Any) => ({ t: String(x.t || ''), u: (() => { try { return decodeURI(String(x.u)); } catch { return String(x.u); } })() })); return ARTS!; }
const SMART = 'claude-sonnet-5';
async function aiSmart(system: string, user: string, max: number) { try { return await ai(SMART, system, user, max); } catch { return await ai(MODEL, system, user, max); } }
const SIGN = 'עו״ד יקיר דבול, עורך דין מקרקעין';
const CONTACT = 'עו״ד יקיר דבול, עורך דין מקרקעין, רזיאל 1 נתניה\nטלפון המשרד: 09-8613413\nאתר: dabullaw.co.il';
const RULES = 'כללים מחייבים: עברית פשוטה, טבעית ונכונה, בגוף ראשון של עורך הדין, בלשון זכר (יקיר הוא גבר: "אשמח", לא "שמחה"). בלי המילים "הכי", "מומחה", "חינם", "מוביל" ובלי הבטחות לתוצאה או מחירים (כללי הפרסום של לשכת עורכי הדין). בלי מקפים ארוכים, בלי מקפים בין משפטים, בלי אימוג\'י ובלי האשטאגים. אל תכתוב מועדים, סכומים, אחוזים או סעיפי חוק אלא אם אתה בטוח בהם לגמרי; אם התשובה תלויה בנסיבות, אמור זאת וציין באילו.';

const nodash = (t: string) => t.replace(/\s[-–—]\s/g, ', ').replace(/[–—]/g, ',');
async function draft(d: Any, text: string) {
  if (d.type === 'seek') {
    const sys = `כתוב פתיח לתגובה בפייסבוק לאדם שמחפש עורך דין: משפט אחד או שניים, נעימים וענייניים, שמראים שהבנת מה הוא צריך ושאתה יכול לעזור בזה. בלי פרטי קשר, הם יתווספו אחר כך. ${RULES} החזר רק את הפתיח.`;
    const open = nodash((await aiSmart(sys, `הפוסט:\n${text}`, 250)).trim());
    return { reply: `${open}\n\n${CONTACT}`, article: '' };
  }
  const list = await articles();
  const sys = `אתה עו״ד יקיר דבול, עורך דין מקרקעין מנתניה, ועונה בקבוצת פייסבוק לשאלה של אדם. ${RULES}
כתוב תשובה קצרה ומועילה של 3 עד 5 שורות: התשובה הכללית העיקרית, ומה בודקים או על מה זה תלוי. בלי חתימה, היא תתווסף אחר כך.
בנוסף בחר מהרשימה את המאמר שהכי מתאים לשאלה, או -1 אם אף אחד לא מתאים באמת.
מאמרים:
${list.map((a, n) => `${n}. ${a.t}`).join('\n')}
החזר JSON בלבד: {"answer":"...","article":מספר}`;
  const out = await aiSmart(sys, `השאלה:\n${text}`, 900);
  let o: Any = {}; try { o = JSON.parse((out.match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch { o = { answer: out }; }
  const a = Number.isInteger(o.article) && o.article >= 0 && o.article < list.length ? list[o.article] : null;
  return { reply: `${nodash(String(o.answer || '').trim())}\n\n${SIGN}\n${a ? `הרחבה במאמר באתר שלי: ${a.u}` : 'dabullaw.co.il'}`, article: a?.u || '' };
}

// remembered post ids (id -> first seen, ms); kept to the newest 20000
async function loadSeen(): Promise<Record<string, number>> {
  const { data } = await sb.storage.from('files').download('fbleads/seen.json');
  if (!data) return {};
  try { return JSON.parse(await data.text()) || {}; } catch { return {}; }
}
async function saveSeen(m: Record<string, number>) {
  const keep = Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 20000);
  await sb.storage.from('files').upload('fbleads/seen.json', new Blob([JSON.stringify(Object.fromEntries(keep))], { type: 'application/json' }), { upsert: true, contentType: 'application/json' });
}
async function tg(text: string, button = false) {
  if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return false;
  const app = String(S.APP_URL || '').replace(/\/?$/, '/');
  const r = await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true, ...(button && app.startsWith('http') ? { reply_markup: { inline_keyboard: [[{ text: '📋 למסך מפייסבוק', url: app + '#fbleads' }]] } } : {}) }) }).catch(() => null);
  return !!r && r.ok;
}
// one short note in the regular office bot after a scan that found something new
async function note(seek: number, q: number) {
  if (!seek && !q) return false;
  const parts = [seek ? `🔥 ${seek === 1 ? 'מישהו מחפש' : seek + ' אנשים מחפשים'} עורך דין` : '', q ? `❓ ${q === 1 ? 'שאלה אחת' : q + ' שאלות'} בתחומים שלך` : ''].filter(Boolean).join('\n');
  return await tg(`קבוצות פייסבוק:\n${parts}\n\nהפוסטים והתגובות המוכנות במערכת המשרד, במסך "מפייסבוק".`, true);
}

async function check(posts: Any[], source: string) {
  const res = { seen: 0, new: 0, filtered: 0, checked: 0, hits: 0, seek: 0, question: 0, errors: 0, noted: false };
  const seen = await loadSeen(); let changed = false;
  for (const p of posts.slice(0, 300)) {
    const id = clip(p.id, 80).replace(/[^\w-]/g, ''); if (!id) continue; res.seen++;
    if (seen[id]) continue; res.new++;
    const text = clip(p.text, 3000), group = clip(p.group, 120), url = clip(p.url, 400);
    if (text.length < 15 || !WORDS.test(text)) { seen[id] = Date.now(); changed = true; res.filtered++; continue; }
    try {
      res.checked++;
      const d = await decide(text, group);
      if (d.type === 'seek' || d.type === 'question') {
        res.hits++; if (d.type === 'seek') res.seek++; else res.question++;
        const dr = await draft(d, text);
        await put('fbleads', id, { at: new Date().toISOString(), type: d.type, state: 'new', group, url, author: clip(p.author, 80), time: clip(p.time, 40), field: d.field || '', topic: d.topic || '', area: d.area || '', summary: d.summary || '', text, reply: dr.reply, article: dr.article });
      }
      seen[id] = Date.now(); changed = true;
    } catch (_e) { res.errors++; } // not remembered, so the next scan tries again
  }
  if (changed) await saveSeen(seen).catch(() => null);
  if (res.hits) res.noted = await note(res.seek, res.question);
  await put('fbleads', 'lastrun', { at: new Date().toISOString(), source, ...res });
  return res;
}

// groups to visit this run: the approved groups, the ones not scanned longest first, priority groups count 3x
async function plan() {
  const groups = (await get('fbleads', 'groups')) || {}; const on = groups.on || {};
  const rot = (await get('fbscan', 'rotation')) || {}; const last = rot.last || {}; const pri = new Set(rot.priority || []);
  const n = Math.max(1, Math.min(30, +rot.perRun || 10)); const now = Date.now();
  const keys = Object.keys(on).map(k => ({ k, w: (now - (Date.parse(last[k] || '') || 0)) * (pri.has(k) ? 3 : 1) }))
    .sort((a, b) => b.w - a.w || (a.k < b.k ? -1 : 1)).slice(0, n).map(x => x.k);
  const stamp = new Date().toISOString(); keys.forEach(k => { last[k] = stamp; });
  await put('fbscan', 'rotation', { ...rot, last, at: stamp });
  return keys;
}

Deno.serve(async (req) => {
  await secrets();
  const b: Any = await req.json().catch(() => ({}));
  // one-time pairing: the scanner on Yakir's computer swaps a short code (set by the office, valid 2 hours, single use) for its key
  if (b.op === 'pair') {
    const p = (await get('fbscan', 'pair')) || {};
    const ok = p.code && !p.used && Date.now() < (Date.parse(p.until || '') || 0) && same(String(b.code || '').trim().toUpperCase(), String(p.code).toUpperCase());
    if (!ok || !S.FBSCAN_KEY) return J({ ok: false }, 401);
    await put('fbscan', 'pair', { ...p, used: new Date().toISOString() });
    return J({ ok: true, key: S.FBSCAN_KEY });
  }
  const admin = same(String(b.k || ''), S.CRON_SECRET || '');
  const scanner = !admin && same(String(b.k || ''), S.FBSCAN_KEY || '');
  if (!admin && !scanner) return J({ ok: false }, 401);
  if (b.op === 'plan') return J({ ok: true, keys: await plan() });
  if (b.op === 'status') {
    const state = ['ok', 'logged_out', 'error'].includes(b.state) ? b.state : 'error';
    const prev = (await get('fbscan', 'status')) || {};
    await put('fbscan', 'status', { at: new Date().toISOString(), state, note: clip(b.note, 300), prev: prev.state || '' });
    if (state !== (prev.state || 'ok')) {
      if (state === 'logged_out') await tg('סריקת קבוצות פייסבוק נעצרה: פייסבוק בכרום של הסורק התנתק. צריך להתחבר שוב (קלוד קוד יודע איך).');
      else if (state === 'error') await tg('סריקת קבוצות פייסבוק לא הצליחה הפעם. אם זה חוזר, תגיד לי ואבדוק.');
      else if (prev.state) await tg('סריקת קבוצות פייסבוק חזרה לעבוד.');
    }
    return J({ ok: true });
  }
  if (b.op === 'scan') {
    const on = ((await get('fbleads', 'groups')) || {}).on || {};
    const posts = (b.posts || []).slice(0, 300).map((x: Any) => ({ g: clip(x.g, 80), i: clip(x.i, 40).replace(/\D/g, ''), a: x.a, t: x.t }))
      .filter((x: Any) => x.i && on[x.g])
      .map((x: Any) => ({ id: x.i, url: `https://www.facebook.com/groups/${encodeURIComponent(x.g)}/posts/${x.i}/`, group: on[x.g], author: x.a, text: x.t, time: '' }));
    const res = await check(posts, 'scanner');
    return J({ ok: true, sent: (b.posts || []).length, approved: posts.length, ...res });
  }
  if (!admin) return J({ ok: false }, 403);
  if (b.op === 'groups') {
    const groups = (b.groups || []).map((g: Any) => ({ id: clip(g.id, 40), name: clip(g.name, 120), url: clip(g.url, 300), members: clip(g.members, 40) })).filter((g: Any) => g.id);
    const prev = (await get('fbleads', 'groups')) || {};
    await put('fbleads', 'groups', { at: new Date().toISOString(), list: groups, on: prev.on || {} });
    return J({ ok: true, n: groups.length });
  }
  if (b.op === 'recheck') {
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'fbleads').eq('data->>state', 'new').limit(150);
    const r = { checked: 0, kept: 0, dropped: 0, errors: 0 };
    for (const row of (data || []) as Any[]) {
      if (!row.data || !row.data.text) continue;
      try { r.checked++; const d = await decide(clip(row.data.text, 3000), clip(row.data.group, 120));
        if (d.type === 'seek' || d.type === 'question') { r.kept++; await put('fbleads', row.id, { ...row.data, field: d.field }); }
        else { r.dropped++; await put('fbleads', row.id, { ...row.data, state: 'no', stateAt: new Date().toISOString(), autoNo: 'לא בתחומי המשרד (בדיקה חוזרת)' }); }
      } catch (_e) { r.errors++; }
    }
    return J({ ok: true, ...r });
  }
  if (b.op === 'test') { const d = await decide(clip(b.text, 3000), clip(b.group, 120)); return J({ ok: true, d, out: d.type === 'seek' || d.type === 'question' ? await draft(d, clip(b.text, 3000)) : null }); }
  return J({ ok: true, ...(await check(b.posts || [], 'chrome')) });
});
