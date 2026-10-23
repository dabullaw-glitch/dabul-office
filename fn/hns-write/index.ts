// hns-write (23.10.2026): writer stage of the HNS (חדשות נתניה והשרון) news engine, SHADOW MODE. Nothing is published.
// Yakir approved (23.10.2026) using the Claude API for drafting in trial mode, estimated 20-60 NIS a month; drafts stay internal.
// POST (x-cron-secret) {action:'tick'} -> cron every 10 min:
//   1. groups new local items from hns_items into stories (same event = shared words within 12 hours)
//   2. a story built only on community tips is kept as "needs_check" with no AI call (tips need an official or second source)
//   3. other new stories get one Claude call that writes a short Hebrew item in our own wording, from the facts in the sources only
//   4. sensitive stories (death, minors, missing people, attacks) are always "needs_check": Yakir approves each one
// Cost guard: at most MAX_PER_DAY AI calls a day (Israel time), Sonnet 5.5, short prompts.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
}
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const MAX_PER_DAY = 25;
const MODEL = 'claude-sonnet-5-5';

const norm = (s: string) => s.replace(/[״“”]/g, '"').replace(/[׳‘’]/g, "'").replace(/[ְ-ׇ]/g, '');
const STOP = new Set(['נתניה', 'בנתניה', 'מנתניה', 'לנתניה', 'שנתניה', 'ברחוב', 'רחוב', 'היום', 'אתמול', 'הערב', 'הבוקר', 'לאחר', 'במהלך', 'סמוך', 'בסמוך', 'כבן', 'כבת', 'אשר', 'אשה', 'אישה', 'גבר', 'בעיר', 'העיר', 'עדכון', 'דוברות', 'מד"א', 'התקבל', 'דיווח', 'במוקד', 'מעניקים', 'טיפול', 'רפואי', 'ומפנים', 'חובשים', 'ופראמדיקים', 'ופרמדיקים', 'במצב', 'השרון', 'ראשוני', 'עודכן']);
function toks(s: string) {
  return new Set(norm(s).replace(/[^\p{L}\p{N}"\s]/gu, ' ').split(/\s+/).map((w) => w.replace(/^"|"$/g, ''))
    .map((w) => (w.length > 4 && /^[ובלמהש]/.test(w) ? w.slice(1) : w)).filter((w) => w.length >= 3 && !STOP.has(w)));
}
function same(a: Set<string>, b: Set<string>) { let n = 0; for (const x of a) if (b.has(x)) n++; return n >= 3 && n / Math.max(1, Math.min(a.size, b.size)) >= 0.35; }
const NETANYA_PLACES = new Set(['נתניה', 'לניאדו']);
const ilDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

const SYSTEM = `אתה עורך חדשות מקומי באתר "חדשות נתניה והשרון". אתה כותב ידיעה קצרה בעברית פשוטה וברורה, רק מהעובדות שמופיעות במקורות שקיבלת.
כללים מחייבים:
- אסור להמציא פרט שלא מופיע במקורות: לא שמות, לא גילים, לא שעות, לא מספרים, לא סיבות.
- לא להעתיק משפטים מהמקורות. לכתוב בניסוח שלנו.
- לא לכתוב שמות של נפגעים, הרוגים, חשודים או קטינים, גם אם הם מופיעים במקור.
- לא לכתוב דעה, ספקולציה או שבח. טון ענייני ורגוע.
- לא להשתמש בקו מפריד ארוך או בינוני. רק פסיק, נקודה או מקף רגיל.
- אם מקור הוא רק "רמז" מקבוצה לא רשמית ואין מקור רשמי או כלי תקשורת שמאשר, לסמן needsCheck=true.
- כותרת עד 70 תווים, עם שם המקום. כותרת משנה משפט אחד.
- גוף הידיעה: 2 עד 4 פסקאות קצרות. בסוף הפסקה האחרונה לציין את המקור במילים, למשל "כך לפי הודעת דוברות מד״א".
מדורים אפשריים: flash (מבזקים, חירום, תאונות, משטרה), city (עירייה, תשתיות, חינוך), realestate (תכנון ובנייה, נדל״ן), community (קהילה), sports (ספורט), leisure (תרבות ואירועים), sharon (יישובי השרון שאינם נתניה), tourism (חופים ותיירות).
החזר JSON בלבד, בלי טקסט נוסף, במבנה:
{"section":"","title":"","dek":"","body":["",""],"keyPoints":["",""],"places":[""],"needsCheck":false,"checkReason":""}`;

async function claude(user: string) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: MODEL, max_tokens: 1200, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(90000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 200)}`);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json in answer');
  return { out: JSON.parse(m[0]), usage: j.usage };
}

async function tick() {
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data: srcs } = await sb.from('hns_sources').select('id,name_he,role,trust');
  const src = Object.fromEntries((srcs || []).map((s: Any) => [s.id, s]));
  // new local items, not yet in a story, from our sources (never the competitor), not the first backfill
  const { data: items } = await sb.from('hns_items').select('id,source_id,title,body,url,published_at,fetched_at,places,topic,sensitivity,urgent')
    .eq('is_local', true).eq('backfill', false).is('cluster_id', null).gte('fetched_at', since).order('id').limit(200);
  const fresh = (items || []).filter((x: Any) => src[x.source_id] && src[x.source_id].role !== 'competitor');
  if (!fresh.length) return { fresh: 0 };
  // stories of the last 12 hours, with the words of their items, to attach follow ups to the same story
  const { data: recent } = await sb.from('hns_stories').select('id,item_ids,state,created_at').gte('created_at', since).order('id', { ascending: false }).limit(200);
  const rIds = [...new Set((recent || []).flatMap((s: Any) => s.item_ids || []))];
  const { data: rItems } = rIds.length ? await sb.from('hns_items').select('id,title,body,cluster_id').in('id', rIds) : { data: [] };
  const storyToks = new Map<number, Set<string>>();
  for (const it of rItems || []) { const s = storyToks.get(it.cluster_id) || new Set<string>(); for (const w of toks(`${it.title} ${it.body || ''}`)) s.add(w); storyToks.set(it.cluster_id, s); }
  // group the fresh items: into an existing story, or into new groups
  const groups: { story?: number; items: Any[]; tk: Set<string> }[] = [];
  for (const it of fresh) {
    const tk = toks(`${it.title} ${it.body || ''}`);
    let placed = false;
    for (const [sid, st] of storyToks) if (same(tk, st)) { groups.push({ story: sid, items: [it], tk }); placed = true; break; }
    if (placed) continue;
    const g = groups.find((g) => !g.story && same(tk, g.tk));
    if (g) { g.items.push(it); for (const w of tk) g.tk.add(w); } else groups.push({ items: [it], tk });
  }
  // AI calls used today
  const dayStart = new Date(Date.parse(ilDay(new Date()) + 'T00:00:00+03:00')).toISOString();
  const { count: used } = await sb.from('hns_stories').select('id', { count: 'exact', head: true }).not('model', 'is', null).gte('created_at', dayStart);
  let budget = MAX_PER_DAY - (used || 0);
  const res: Any[] = [];
  for (const g of groups) {
    const ids = g.items.map((x) => x.id);
    if (g.story) {
      // follow up item for a story we already have: attach it, mark the story for a look
      const st = (recent || []).find((s: Any) => s.id === g.story);
      await sb.from('hns_items').update({ cluster_id: g.story }).in('id', ids);
      await sb.from('hns_stories').update({ item_ids: [...new Set([...(st?.item_ids || []), ...ids])], updated_at: new Date().toISOString(), notes: 'נוסף מקור חדש, כדאי לעדכן' }).eq('id', g.story);
      res.push({ story: g.story, attached: ids.length });
      continue;
    }
    const sensitive = g.items.some((x) => x.sensitivity === 'sensitive');
    const official = g.items.some((x) => src[x.source_id].role === 'source');
    const places = [...new Set(g.items.flatMap((x) => x.places || []))];
    const sources = [...new Map(g.items.map((x) => [x.source_id, { id: x.source_id, name: src[x.source_id].name_he, url: x.url, trust: src[x.source_id].trust }])).values()];
    const base = { item_ids: ids, places, sources, sensitivity: sensitive ? 'sensitive' : 'normal', section: g.items[0].topic };
    if (!official) {
      const { data: st } = await sb.from('hns_stories').insert({ ...base, title: g.items[0].title, state: 'needs_check', notes: 'רמז בלבד, צריך מקור רשמי או מקור נוסף' }).select('id').single();
      if (st) await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
      res.push({ story: st?.id, tip: true });
      continue;
    }
    if (budget <= 0) { res.push({ skipped: 'daily budget', ids }); continue; } // left for tomorrow's budget or a manual run
    budget--;
    const user = 'המקורות (מהישן לחדש):\n\n' + g.items.map((x, i) => `מקור ${i + 1}: ${src[x.source_id].name_he} (${src[x.source_id].role === 'tip' ? 'רמז לא רשמי' : 'מקור רשמי או כלי תקשורת'})\nזמן: ${x.published_at || x.fetched_at}\nכותרת: ${x.title}\nתוכן: ${(x.body || '').slice(0, 1200)}`).join('\n\n') + `\n\nמקומות שזוהו: ${places.join(', ') || 'לא זוהה'}`;
    try {
      const { out, usage } = await claude(user);
      const isNetanya = places.some((p) => NETANYA_PLACES.has(p));
      const section = out.section || (isNetanya ? base.section : 'sharon');
      const state = sensitive || out.needsCheck ? 'needs_check' : 'draft';
      const notes = sensitive ? 'ידיעה רגישה, רק באישור של יקיר' : out.needsCheck ? (out.checkReason || 'צריך בדיקה') : null;
      const clean = (s: string) => String(s || '').replace(/[—–]/g, '-');
      const { data: st } = await sb.from('hns_stories').insert({
        ...base, section, title: clean(out.title), dek: clean(out.dek), body: (out.body || []).map(clean), key_points: (out.keyPoints || []).map(clean),
        places: out.places?.length ? out.places : places, state, notes, model: MODEL, usage,
      }).select('id').single();
      if (st) await sb.from('hns_items').update({ cluster_id: st.id }).in('id', ids);
      res.push({ story: st?.id, state });
    } catch (e) { res.push({ error: String((e as Error).message || e), ids }); }
  }
  return { fresh: fresh.length, groups: groups.length, res };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, ...(await tick()) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
