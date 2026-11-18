// Organic social posting for Facebook and Instagram (Google Business, LinkedIn and X are already handled by Grok Bot).
// step=plan    (Sunday morning): writes 2 posts for the week (Tue + Thu evening) from the site's articles and the checklist,
//                                checks them against the bar rules and schedules them. Fully automatic, no previews.
// step=publish (hourly):         publishes due posts to the Facebook page and Instagram when the page is connected
//                                (FB_PAGE_ID + FB_PAGE_TOKEN, optional IG_USER_ID in app_secrets).
//              also the office WhatsApp group ("נדל"ן חכם - פורום משקיעים משפטי", WA_GROUP_ID): ONE message a week
//              (Yakir: more than that makes people leave), Sunday 20:00, rotating tip -> real case -> poll.
//              18.11.2026: a group row with "image" (once a month, the comic רוני הרוכש) goes out as ONE image message
//              with the text as its caption (sendFileByUrl), still one message that week. Polls never carry an image.
// ?stop=<token>:                 cancels one scheduled post.
// Source kept in the repo from 18.11.2026 (fn/social/index.ts); deployed version 6.
import { loadSecrets, json, cors, admin, env, aiHeaders } from '../_shared/common.ts';

const SITE = 'https://dabullaw.co.il';
const GRAPH = 'https://graph.facebook.com/v21.0';
const BANNED = /הטוב(?:ים|ה|ות)? ביותר|הכי טוב|מקסימלי|מומחה|מומחים|חינם|ללא עלות|ללא תשלום|הנחה של|הנחות|מבצע מיוחד|מבצעים|אחוזי הצלחה|מבטיח|מובטח|מוביל(?:ים|ה)? בתחום|מספר 1|שכר טרחה|שכ[״"]ט|ייעוץ ראשוני|שקוע(?:ים)? בחובות/;
// deno-lint-ignore no-explicit-any
type Any = any;
const db = () => admin().from('docs');
const getDoc = async (coll: string, id: string): Promise<Any> => { const { data } = await db().select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
const merge = (coll: string, id: string, patch: Any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const tok = () => crypto.randomUUID().replace(/-/g, '');
const ilParts = (d = new Date()) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false, weekday: 'short' }).formatToParts(d).map(p => [p.type, p.value]));
const ilDay = (offsetDays: number) => { const p = ilParts(new Date(Date.now() + offsetDays * 864e5)); return `${p.year}-${p.month}-${p.day}`; };
// a wall-clock time in Israel -> ISO (handles summer/winter time)
const ilToIso = (day: string, hour: number) => { for (const off of [3, 2]) { const d = new Date(`${day}T${String(hour - off).padStart(2, '0')}:00:00Z`); if (Number(ilParts(d).hour) === hour) return d.toISOString(); } return new Date(`${day}T${hour - 3}:00:00Z`).toISOString(); };
const clean = (s: unknown) => String(s ?? '').replace(/\s*[—–]\s*/g, (m) => (/\s/.test(m) ? ' - ' : '-')).trim();
const strip = (h: string) => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&#8211;/g, '-').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();

async function tg(text: string, buttons?: Any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}
async function claude(prompt: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: aiHeaders(), body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] }) });
  const j: Any = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('AI ' + r.status + ' ' + JSON.stringify(j).slice(0, 200));
  return (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
}
async function ogImage(url: string) {
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; DabulOffice/1.0)' } }).catch(() => null);
  const h = r && r.ok ? await r.text() : '';
  return (h.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)/i) || [])[1] || '';
}

async function plan() {
  const week = ilDay(0);
  const group = await planGroup(week).catch(async (e) => { await tg('⚠️ תכנון התוכן לקבוצת הוואטסאפ נכשל: ' + String((e as Error).message).slice(0, 200)); return 0; });
  const cfg = (await getDoc('settings', 'social')) || {};
  if (cfg.enabled === false) return { skipped: 'disabled', group };
  const { data: exists } = await db().select('id').eq('coll', 'social').eq('data->>week', week).limit(1);
  if (exists && exists.length) return { skipped: 'week already planned' };
  const shared: string[] = cfg.shared || [];
  const r = await fetch(`${SITE}/wp-json/wp/v2/posts?per_page=60&orderby=date&_fields=title,link,excerpt,date`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; DabulOffice/1.0)' } }).catch(() => null);
  const posts: Any[] = r && r.ok ? await r.json().catch(() => []) : [];
  const article = posts.find(p => !shared.includes(p.link) && !/checklist/.test(p.link));
  const checklist = (cfg.checklistLive && cfg.checklistUrl) ? { title: "צ'קליסט לפני שקונים דירה יד שנייה", url: cfg.checklistUrl, image: cfg.checklistImage || '' } : null;
  // Tuesday: the newest article not shared yet. Thursday: the checklist (every second week) or another article.
  const second = (checklist && !cfg.lastChecklistWeek) || (checklist && (Date.parse(week) - Date.parse(cfg.lastChecklistWeek)) >= 13 * 864e5) ? null : posts.find(p => p !== article && !shared.includes(p.link) && !/checklist/.test(p.link));
  const slots: Any[] = [];
  if (article) slots.push({ kind: 'article', title: strip(article.title?.rendered), url: article.link, excerpt: strip(article.excerpt?.rendered).slice(0, 500) });
  if (second) slots.push({ kind: 'article', title: strip(second.title?.rendered), url: second.link, excerpt: strip(second.excerpt?.rendered).slice(0, 500) });
  else if (checklist) slots.push({ kind: 'checklist', title: checklist.title, url: checklist.url, excerpt: '7 שלבים ו-31 בדיקות לפני שחותמים על דירה יד שנייה: טאבו, עירייה, משכנתא, מס רכישה וחוזה. עם מקור רשמי לכל סעיף. נשלח במייל אחרי הרשמה.', image: checklist.image });
  if (!slots.length) return { skipped: 'no material' };
  const out = await claude(`אתה כותב פוסטים לעמוד הפייסבוק והאינסטגרם של משרד עו"ד יקיר דבול, דיני מקרקעין, נתניה. קהל: אנשים פרטיים בשרון שקונים, מוכרים או מחזיקים דירה.
כתוב פוסט אחד לכל פריט:
${slots.map((s, i) => `${i + 1}. ${s.kind === 'checklist' ? '[מדריך להורדה]' : '[מאמר]'} ${s.title}\n   ${s.excerpt}`).join('\n')}

מבנה כל פוסט: שורת פתיחה שהיא שאלה לקהל מסוים, ואחריה 2 עד 3 משפטים על הסיכון המעשי ועל מה שאפשר לבדוק או לעשות. אחר כך משפט על המשרד בגוף ראשון רבים ("במשרד שלנו..."), בלי לשון הפלגה. סיום בהזמנה לקרוא את המאמר המלא או להוריד את המדריך. עד 2 אימוג'י בכל פוסט. פנייה בלשון רבים (אתם).
כללים: עברית בלבד, בלי מקף ארוך או בינוני. בלי "מומחה", בלי "הכי" או "הטוב ביותר", בלי הבטחות לתוצאה, בלי מחירים או שכר טרחה, בלי הנחות או מבצעים, בלי "חינם". אל תניח שום דבר אישי על הקורא (מצב כלכלי, חובות). אל תוסיף עובדות, מספרים או חוקים שלא מופיעים בתקציר.
החזר JSON בלבד: [{"text":"גוף הפוסט בלי הקישור","hashtags":"3 עד 5 האשטגים בעברית"}]`);
  let list: Any[] = []; try { list = JSON.parse((out.match(/\[[\s\S]*\]/) || ['[]'])[0]); } catch { list = []; }
  if (list.length < slots.length) throw new Error('social: AI returned ' + list.length + ' posts');
  const days = [ilDay(2), ilDay(4)]; // Sunday run -> Tuesday and Thursday
  for (const [i, s] of slots.entries()) {
    const text = clean(list[i].text), tags = clean(list[i].hashtags);
    const bad = text.match(BANNED);
    const image = s.image || (s.kind === 'article' ? await ogImage(s.url) : '');
    const id = `so-${week}-${i}`, stop = tok();
    await db().upsert({ coll: 'social', id, data: { week, kind: s.kind, title: s.title, url: s.url, text, hashtags: tags, image, publishAt: ilToIso(days[i] || days[0], 19), status: bad ? 'held' : 'scheduled', flag: bad ? bad[0] : '', stopTok: stop, created: new Date().toISOString() }, updated_at: new Date().toISOString() });
  }
  await merge('settings', 'social', { shared: [...shared, ...slots.filter(s => s.kind === 'article').map(s => s.url)].slice(-200), ...(slots.some(s => s.kind === 'checklist') ? { lastChecklistWeek: week } : {}) });
  // fully automatic (Yakir's decision 6.10): no preview message, posts just go out on time
  return { planned: slots.length, group };
}

// ---------- the office WhatsApp group ----------
async function planGroup(week: string) {
  const cfg = (await getDoc('settings', 'community')) || {};
  if (cfg.enabled === false) return 0;
  const { data: exists } = await db().select('id').eq('coll', 'community').eq('data->>week', week).limit(1);
  if (exists && exists.length) return 0;
  const used: string[] = cfg.used || [], usedQ: string[] = cfg.usedQ || [];
  const r = await fetch(`${SITE}/wp-json/wp/v2/posts?per_page=80&orderby=date&_fields=title,link,excerpt`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; DabulOffice/1.0)' } }).catch(() => null);
  const posts: Any[] = (r && r.ok ? await r.json().catch(() => []) : []).filter((p: Any) => !used.includes(p.link));
  const art = posts[0] ? { title: strip(posts[0].title?.rendered), url: posts[0].link, excerpt: strip(posts[0].excerpt?.rendered).slice(0, 600) } : null;
  const { data: faqs } = await db().select('id,data').eq('coll', 'faq');
  const fq = (faqs || []).filter((f: Any) => !usedQ.includes(f.id) && f.data.q && f.data.a);
  const faq = fq[Math.floor(Math.random() * fq.length)];
  const invite = env('WA_GROUP_INVITE');
  const out = await claude(`אתה מנהל התוכן של קבוצת הוואטסאפ "נדל"ן חכם - פורום משקיעים משפטי" של עו"ד יקיר דבול (דיני מקרקעין, נתניה). חברי הקבוצה: משקיעים, קונים ובעלי דירות בשרון שהצטרפו כדי ללמוד. המטרה: תוכן שאנשים מחכים לו, שומרים ומעבירים הלאה, ושבונה אמון ביקיר כאיש המקצוע שלהם.
חומרים:
${art ? `מאמר: ${art.title}\n${art.excerpt}\nקישור: ${art.url}` : '(אין מאמר חדש)'}
${faq ? `שאלה מהמשרד: ${faq.data.q}\nתשובה: ${String(faq.data.a).slice(0, 1400)}` : ''}

כתוב 3 הודעות לשבוע, בסגנון וואטסאפ: שורות קצרות, *הדגשה* בכוכביות, עד 2 אימוג'י בהודעה, גוף ראשון של יקיר, חם ולא שיווקי.
1. "tip" (יום ראשון בערב): טיפ משפטי מעשי אחד מתוך המאמר, 60 עד 110 מילים, עם הקישור למאמר בסוף. ${invite ? 'בסוף שורה: "מכירים מישהו שזה יעזור לו? מוזמנים להעביר 🙏"' : 'בסוף שורה שמזמינה להעביר למי שזה רלוונטי אליו.'}
2. "qa" (יום שלישי בצהריים): "שאלה מהשטח" על בסיס השאלה מהמשרד, בלי פרטים מזהים, עד 120 מילים, ובסוף הזמנה לשלוח שאלות לשבוע הבא.
3. "poll" (יום חמישי בבוקר): סקר שמעורר שיחה בנושא של השבוע. שאלה קצרה ו-3 עד 4 תשובות קצרות (עד 30 תווים כל אחת).
כללים: עברית בלבד, בלי מקף ארוך או בינוני. בלי "מומחה", בלי לשון הפלגה, בלי הבטחות לתוצאה, בלי מחירים או שכר טרחה, בלי מבצעים, בלי "חינם". אל תוסיף עובדות, מספרים או חוקים שלא מופיעים בחומרים.
החזר JSON בלבד: {"tip":"...","qa":"...","poll":{"question":"...","options":["...","..."]}}`);
  let j: Any = null; try { j = JSON.parse((out.match(/\{[\s\S]*\}/) || ['null'])[0]); } catch { j = null; }
  if (!j || !j.tip || !j.qa || !j.poll?.question) throw new Error('community: bad AI output');
  const all = [
    { kind: 'tip', text: clean(j.tip) + (invite ? `\n\n🔗 להצטרפות לקבוצה: ${invite}` : ''), at: ilToIso(ilDay(0), 20) },
    { kind: 'qa', text: clean(j.qa), at: ilToIso(ilDay(0), 20) },
    { kind: 'poll', text: clean(j.poll.question), options: (j.poll.options || []).slice(0, 4).map((o: string) => clean(o).slice(0, 100)), at: ilToIso(ilDay(0), 20) },
  ];
  const turn = Number(cfg.turn || 0) % 3; // one message a week, the format rotates
  const items = [all[turn]];
  for (const it of items) {
    const bad = (it.text + ' ' + (it.options || []).join(' ')).match(BANNED);
    const stop = tok();
    await db().upsert({ coll: 'community', id: `wa-${week}-${it.kind}`, data: { week, ...it, publishAt: it.at, status: bad ? 'held' : 'scheduled', flag: bad ? bad[0] : '', stopTok: stop, created: new Date().toISOString() }, updated_at: new Date().toISOString() });
  }
  const k = items[0].kind;
  await merge('settings', 'community', { turn: turn + 1, used: [...used, ...(art && k === 'tip' ? [art.url] : [])].slice(-200), usedQ: [...usedQ, ...(faq && k === 'qa' ? [faq.id] : [])].slice(-100) });
  return items.length;
}
async function green(method: string, body: Any) {
  const base = (env('GREEN_API_URL') || 'https://api.green-api.com').replace(/\/$/, '');
  const r = await fetch(`${base}/waInstance${env('GREEN_API_INSTANCE')}/${method}/${env('GREEN_API_TOKEN')}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j: Any = await r.json().catch(() => ({}));
  if (!r.ok || !j.idMessage) throw new Error(`green ${method} ${r.status} ${JSON.stringify(j).slice(0, 120)}`);
  return j.idMessage as string;
}
async function publishGroup() {
  const { data } = await db().select('id,data').eq('coll', 'community').eq('data->>status', 'scheduled').lte('data->>publishAt', new Date().toISOString()).limit(3);
  if (!data || !data.length) return 0;
  const group = env('WA_GROUP_ID');
  if (!group || !env('GREEN_API_INSTANCE') || !env('GREEN_API_TOKEN')) return 0; // waits for the connection
  let n = 0;
  for (const row of data) {
    const p = row.data;
    if (Date.now() - Date.parse(p.publishAt) > 864e5) { await merge('community', row.id, { status: 'expired' }); continue; } // never send a stale post in a burst
    try {
      const img = p.kind !== 'poll' && /^https:\/\/[^\s]+\.(jpe?g|png)$/i.test(String(p.image || '')) ? String(p.image) : '';
      const id = p.kind === 'poll'
        ? await green('sendPoll', { chatId: group, message: p.text, options: (p.options || []).map((o: string) => ({ optionName: o })), multipleAnswers: false })
        : img
          ? await green('sendFileByUrl', { chatId: group, urlFile: img, fileName: img.split('/').pop(), caption: p.text })
          : await green('sendMessage', { chatId: group, message: p.text, linkPreview: true });
      await merge('community', row.id, { status: 'published', waId: id, at: new Date().toISOString() }); n++;
    } catch (e) {
      await merge('community', row.id, { status: 'failed', error: String((e as Error).message).slice(0, 200) });
      await tg(`⚠️ ההודעה לקבוצת הוואטסאפ לא נשלחה: ${String((e as Error).message).slice(0, 160)}`);
    }
  }
  return n;
}

async function fb(path: string, body: Record<string, string>) {
  const r = await fetch(`${GRAPH}/${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const j: Any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${path}: ${j.error?.message || r.status}`);
  return j;
}
async function publish() {
  const group = await publishGroup();
  const { data } = await db().select('id,data').eq('coll', 'social').eq('data->>status', 'scheduled').lte('data->>publishAt', new Date().toISOString()).limit(4);
  if (!data || !data.length) return { due: 0, group };
  const page = env('FB_PAGE_ID'), token = env('FB_PAGE_TOKEN'), ig = env('IG_USER_ID');
  if (!page || !token) {
    const cfg = (await getDoc('settings', 'social')) || {};
    if (!cfg.waitNoted) await merge('settings', 'social', { waitNoted: true });
    return { due: data.length, waiting: 'page not connected' };
  }
  const done: string[] = [];
  for (const row of data) {
    if (Date.now() - Date.parse(row.data.publishAt) > 864e5) { await merge('social', row.id, { status: 'expired' }); continue; }
    const p = row.data, msg = `${p.text}\n\n${p.kind === 'checklist' ? '👇 להורדת הצ׳קליסט' : '👇 למאמר המלא'}:\n${p.url}\n\n${p.hashtags || ''}`.trim();
    const res: Any = { at: new Date().toISOString() };
    try { const f = await fb(`${page}/feed`, { message: msg, link: p.url, access_token: token }); res.fbId = f.id; } catch (e) { res.fbError = String((e as Error).message).slice(0, 200); }
    if (ig && p.image) {
      try {
        const c = await fb(`${ig}/media`, { image_url: p.image, caption: `${p.text}\n\n🔗 הקישור בביו\n\n${p.hashtags || ''}`.slice(0, 2100), access_token: token });
        const m = await fb(`${ig}/media_publish`, { creation_id: c.id, access_token: token }); res.igId = m.id;
      } catch (e) { res.igError = String((e as Error).message).slice(0, 200); }
    }
    const ok = res.fbId || res.igId;
    await merge('social', row.id, { status: ok ? 'published' : 'failed', ...res });
    if (!ok || res.fbError || res.igError) await tg(`⚠️ פרסום הפוסט "${p.title}" ${ok ? 'הצליח חלקית' : 'נכשל'}: ${res.fbError || ''} ${res.igError || ''}`);
    if (ok) done.push(row.id);
  }
  return { published: done };
}

async function stop(t: string) {
  const page = (m: string) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><body style="font-family:Arial;direction:rtl;padding:40px;font-size:18px">${m}</body>`, { headers: { ...cors, 'content-type': 'text/html; charset=utf-8' } });
  let coll = 'social';
  let { data } = await db().select('id,data').eq('coll', 'social').eq('data->>stopTok', t).limit(1);
  if (!data || !data.length) { coll = 'community'; ({ data } = await db().select('id,data').eq('coll', 'community').eq('data->>stopTok', t).limit(1)); }
  const row = data && data[0];
  if (!row) return page('הקישור לא תקף.');
  if (row.data.status === 'published') return page('הפוסט כבר פורסם. אפשר למחוק אותו מהעמוד או מהקבוצה עצמם.');
  await merge(coll, row.id, { status: 'stopped', stoppedAt: new Date().toISOString() });
  return page('✓ הפוסט נעצר ולא יפורסם.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  const s = url.searchParams.get('stop');
  if (s) return await stop(s.replace(/[^a-f0-9]/g, ''));
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  try {
    const step = url.searchParams.get('step');
    if (step === 'plan') return json(await plan());
    if (step === 'publish') return json(await publish());
    return json({ error: 'step?' }, 400);
  } catch (e) {
    console.error(e);
    await tg('⚠️ מנוע הפוסטים נתקל בשגיאה: ' + String((e as Error).message || e).slice(0, 300));
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
