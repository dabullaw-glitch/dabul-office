// hns-img/vet.ts (31.10.2026): the photo rules of nws.co.il (חדשות נתניה והשרון), after Yakir saw a Maccabi Netanya story with a photo of
// Turner Stadium in Be'er Sheva ("שמים תמונה של אצטדיון אחר לגמרי שלא קשור לכלום ... זה לא יכול להיות רציני ככה") and an election
// story with a Finnish ballot stamped "VAALI".
//
// THE RULES (the site build, sites/nws/src/lib/content.ts, applies them; this function supplies the facts):
//  1. A real photo may show a SPECIFIC identifiable thing (a named stadium, a hospital or court building, a city's landmark, a team,
//     a known event) only in a story about exactly that thing. Turner Stadium never illustrates Maccabi Netanya; the Netanya Stadium
//     only a story that names it.
//  2. Anything specific to another country is never used: foreign text or signs, foreign ballots or stamps, foreign flags, foreign
//     police cars or license plates, foreign landmarks.
//  3. No identifiable faces, no readable brand names or logos.
//  4. Otherwise only a GENERIC illustration that does not pretend to show a particular place (a ball on grass, a police light, a
//     gavel, an ambulance), labelled "צילום אילוסטרציה", or the designed card of the section (no photo at all).
//  5. AI illustrations: never a photorealistic depiction of the real event, of real people or of a real identifiable place.
//  6. Before a story stays live with its picture, a vision check compares the picture with the story; a misleading picture is
//     replaced by the safe fallback within minutes.
//
// LABELS: every photo of the library (Commons, branch nws-photolib) and every stock photo (public/img/stock) is looked at once by a
//   vision model: what it shows, whether it is specific (and which entity, with the Hebrew words a story must contain), foreign,
//   faces, readable text. Stored in docs coll 'nwsimglab' (id = photo id or 'stock:<name>') and, compact, in docs nwslive
//   'imglabels' {labels: {<id>: 'g' | 'x' | 's:<regex>'}} that hns-feed passes to the build as live.imglabels.
//   g = generic (usable for its topic), x = never, s:<regex> = only when the story title or summary matches the regex.
// VET: every published story (newest first; the first run goes 14 days back) is checked once per picture: the picture the live
//   page shows (og:image) + the story title, summary and section + the label -> {ok, why} (Haiku 5.5). Stored in docs coll
//   'nwsimgvet' (id 'n<story id>'). A failing picture goes to docs nwslive 'imgfix' {fixes: {n<id>: {img, why, at, noai?}}}: the
//   build then gives that story the safe fallback (and drops a failing AI image). The next run checks the new picture too.
// BUDGET: every call is priced into ai_cost (fn 'nws-imgvet'). When this month's cost + hns_config ai_extra.untracked_usd reaches
//   extra_stop_usd, the vet is skipped and nwslive imgfix.brake = true, so the build uses only generic pictures (no 's:' photos).
//
// POST hns-img (x-cron-secret):
//   {action:'vet_label', ids?:[...], stock?:[...], force?, max?}  label library photos (default: all unlabelled, at most 40 per call) and stock
//   {action:'vet_tick', days?:2, max?:30}                     cron every 10 minutes: vet new stories / changed pictures
//   {action:'vet_vet', ids:[story ids], force?}              vet these stories now
//   {action:'vet_live'}                                      rebuild nwslive imglabels from nwsimglab
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const SITE = 'https://nws.co.il';
const LIBRAW = 'https://raw.githubusercontent.com/dabullaw-glitch/dabul-office/nws-photolib';
const LABEL_MODEL = 'claude-sonnet-5-5';
const VET_MODEL = 'claude-haiku-5-5';
const UA = { 'User-Agent': 'nws.co.il image check (office@dabullaw.co.il)' };
let S: Record<string, string> = {};
let BRAKE = false;
async function setup() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
  const { data: x } = await sb.from('hns_config').select('v').eq('k', 'ai_extra').maybeSingle();
  const cfg: Any = x?.v || {};
  const { data: m } = await sb.rpc('ai_cost_month');
  BRAKE = Number(m || 0) + Number(cfg.untracked_usd || 0) >= Number(cfg.extra_stop_usd || 65);
}
const merge = (coll: string, id: string, patch: Any) => sb.rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const getDoc = async (coll: string, id: string) => (await sb.from('docs').select('data').eq('coll', coll).eq('id', id).maybeSingle()).data?.data || null;

function b64(buf: ArrayBuffer) {
  const u = new Uint8Array(buf); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}
async function imgPart(url: string) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`image ${r.status} ${url}`);
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 4.5e6) throw new Error('image too big');
  const ct = (r.headers.get('content-type') || '').split(';')[0];
  const mt = /png/.test(ct) || /\.png(\?|$)/i.test(url) ? 'image/png' : /webp/.test(ct) || /\.webp(\?|$)/i.test(url) ? 'image/webp' : 'image/jpeg';
  return { type: 'image', source: { type: 'base64', media_type: mt, data: b64(buf) } };
}
async function claude(model: string, system: string, content: Any[], maxTok = 1500) {
  const h: Record<string, string> = { 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (S.ANTHROPIC_WORKSPACE_ID) h['anthropic-workspace-id'] = S.ANTHROPIC_WORKSPACE_ID;
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: h, body: JSON.stringify({ model, max_tokens: maxTok, system, messages: [{ role: 'user', content }] }), signal: AbortSignal.timeout(90000) });
  const j = await r.json();
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 160)}`);
  const u = j.usage || {};
  await sb.rpc('ai_cost_add', { p_fn: 'nws-imgvet', p_model: model, p_in: Number(u.input_tokens || 0) + Number(u.cache_read_input_tokens || 0) + Number(u.cache_creation_input_tokens || 0), p_out: Number(u.output_tokens || 0) }).then(() => null, () => null);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no json${j.stop_reason === 'max_tokens' ? ' (cut)' : ''}`);
  return JSON.parse(m[0]);
}

// ---------- labels ----------
const LABEL_SYS = `You label photos for a Hebrew local news site in Netanya, Israel. The site uses a photo to illustrate a story only when the photo does not mislead readers. Look carefully at the photo (and the file name and category, which often name the place).
Answer JSON only:
{"shows":"<short Hebrew description of what is really in the photo>",
 "specific":true|false,   // true if it shows an identifiable particular place, venue, building, landmark, team, vehicle fleet of a named body, or event that a reader could recognise as THAT one (a named stadium, a known hospital or court building, a city hall, a famous square, a team in its kit, a specific match). A ball on grass, a gavel, a generic road, a generic ambulance, an anonymous building facade are NOT specific.
 "entity":"<Hebrew name of that particular place/venue/team/event with its city, or empty>",
 "match":"<when specific: Hebrew words, separated by |, that a story must contain for this photo to fit, e.g. טרנר|הפועל באר שבע ; empty otherwise>",
 "foreign":true|false,    // true if anything shows it is NOT Israel: foreign-language text or signs (not Hebrew/Arabic/English-on-Israeli-items), foreign ballots or stamps, foreign flags, foreign police markings or license plates, foreign landmarks or architecture typical of another country, foreign currency
 "faces":true|false,      // identifiable faces of people in focus
 "brands":true|false,     // readable brand names, logos, shop names, team names or other readable text that would distract
 "israel":true|false|null // the photo is clearly from Israel (Hebrew signs, Israeli plates, Israeli police/MDA markings), null if you cannot tell
}`;
function statusOf(o: Any, isPlace: boolean) {
  if (o.foreign || o.faces) return 'x';
  if (o.brands && !o.specific) return 'x';
  if (o.specific) {
    const rx = String(o.match || '').split('|').map((w: string) => w.trim().replace(/[.*+?^${}()[\]\\]/g, '')).filter((w: string) => w.length >= 2).join('|');
    if (isPlace) return 'p'; // a Netanya or Sharon place photo: the place rules of the build decide (only for stories about that place)
    return rx ? `s:${rx}` : 'x';
  }
  return isPlace ? 'p' : 'g';
}
async function labelOne(id: string, url: string, meta: string, isPlace: boolean, force: boolean) {
  if (!force && await getDoc('nwsimglab', id)) return { id, skipped: true };
  const o = await claude(LABEL_MODEL, LABEL_SYS, [await imgPart(url), { type: 'text', text: `${meta}\nJSON only.` }], 1200);
  const st = statusOf(o, isPlace);
  await merge('nwsimglab', id, { ...o, status: st, model: LABEL_MODEL, at: new Date().toISOString(), url });
  return { id, status: st, shows: o.shows };
}
async function library() {
  const r = await fetch(`${LIBRAW}/index.json`, { headers: UA, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`photolib index ${r.status}`);
  return ((await r.json()).photos || []) as Any[];
}
const STOCK = ['beach-rocks-sail', 'beach-sunset', 'beach-umbrellas', 'city-buildings', 'concert', 'concert-hands', 'council-chamber', 'crane-building', 'cranes-sunset',
  'econ-calc', 'econ-chart', 'econ-coins', 'econ-towers', 'police-lights', 'police-street', 'road-aerial', 'scaffold', 'stadium-aerial', 'stadium-crowd', 'stadium-day', 'stadium-night',
  'traffic-fog', 'traffic-night', 'wave'];
async function label(b: Any) {
  const out: Any[] = [];
  const todo: { id: string; url: string; meta: string; place: boolean }[] = [];
  const want = new Set<string>((b.ids || []).map(String));
  const wantStock = new Set<string>((b.stock || []).map(String));
  const lib = await library();
  for (const p of lib) {
    if (want.size && !want.has(p.id)) continue;
    todo.push({ id: p.id, url: `${LIBRAW}/img/${p.id}-800.webp`, meta: `File: ${p.file}\nCommons category: ${p.root}\nPlaces tagged: ${(p.places || []).join(', ') || 'none'}\nSet: ${p.set || 'place photo'}`, place: !p.set });
  }
  for (const n of STOCK) if ((!want.size && !wantStock.size) || wantStock.has(n)) todo.push({ id: `stock:${n}`, url: `${SITE}/img/stock/${n}-800.webp`, meta: `Generic stock photo named "${n}" (Unsplash)`, place: false });
  const max = Math.min(Number(b.max) || 40, 60);
  let n = 0;
  const pend: typeof todo = [];
  for (const t of todo) {
    if (!b.force && await getDoc('nwsimglab', t.id)) continue;
    pend.push(t); if (pend.length >= max) break;
  }
  for (let i = 0; i < pend.length; i += 6) {
    const res = await Promise.all(pend.slice(i, i + 6).map((t) => labelOne(t.id, t.url, t.meta, t.place, true).catch((e) => ({ id: t.id, error: String((e as Error).message || e) }))));
    out.push(...res); n += res.length;
  }
  await live();
  const left = todo.length - n;
  return { labelled: n, out: out.slice(0, 80), left };
}
async function live() {
  const all: Record<string, string> = {};
  for (let from = 0; ; from += 1000) {
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'nwsimglab').range(from, from + 999);
    for (const r of data || []) if (r.data?.status) all[r.id] = r.data.status;
    if (!data || data.length < 1000) break;
  }
  await merge('nwslive', 'imglabels', { labels: all, at: new Date().toISOString() });
  return { labels: Object.keys(all).length };
}

// ---------- vet ----------
const VET_SYS = `You check whether the picture of a local news story (Hebrew news site of Netanya, Israel) fits the story or misleads readers.
The picture FAILS if any of these is true:
- it shows a specific identifiable place, venue, building, landmark, team or event that is NOT the subject of the story (for example a stadium of another city on a story about a Netanya team, a hospital building of another city, another city's town hall);
- it shows things from another country (foreign-language text or signs, foreign ballots or stamps, foreign flags, foreign police markings or plates, foreign currency, foreign landmarks) while the story is about Israel;
- it is about a different topic (basketball on a football story, a beach on a crime story) or contradicts the story;
- it is an AI image that looks like a real photo of the actual event, of real named people or of a real identifiable place (a generic AI scene is fine);
- it shows identifiable faces of people, or injured people, or readable brands/logos that are not part of the story.
A generic illustration that fits the topic (a football on a pitch for a football story, a police light for a police story, a gavel for a court story, a coin for an economy story) PASSES, even though it is not the real event.
Answer JSON only: {"ok":true|false,"why":"<short Hebrew reason>"}`;
const SEC_HE: Record<string, string> = { flash: 'מבזקים', national: 'חדשות ארציות', city: 'העירייה', police: 'משטרה', realestate: 'נדל"ן', sports: 'ספורט', transport: 'תחבורה', community: 'קהילה וחינוך', health: 'בריאות', leisure: 'תרבות ובילוי', sharon: 'השרון', tourism: 'תיירות', law: 'משפט', blog: 'בלוג', economy: 'כלכלה' };
const SLUG: Record<string, string> = { flash: 'flash', national: 'israel', city: 'city', police: 'police', realestate: 'real-estate', sports: 'sports', transport: 'transport', community: 'community', health: 'health', leisure: 'events', sharon: 'sharon', tourism: 'tourism', law: 'law', blog: 'blog', economy: 'economy' };
const unent = (s: string) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'");
// what the live page shows: og:image (follows the picture of the story) and its caption kind
async function pageImage(st: Any) {
  const url = `${SITE}/${SLUG[st.section] || 'flash'}/n${st.id}/`;
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(20000) });
  if (!r.ok) return { url, status: r.status };
  const h = await r.text();
  const og = unent((h.match(/<meta property="og:image" content="([^"]+)"/) || [])[1] || '');
  return { url, status: 200, og: og.startsWith('http') ? og : og ? SITE + og : '' };
}
function imgKey(og: string) {
  const lib = og.match(/\/img\/lib\/(c\d+)-/); if (lib) return { key: lib[1], kind: 'lib' };
  const st = og.match(/\/img\/stock\/(?:og|x)\/([a-z0-9-]+?)(?:-16x9|-4x3|-1x1)?\.jpg/); if (st) return { key: `stock:${st[1]}`, kind: 'stock' };
  if (/\/img\/card\//.test(og)) return { key: 'card', kind: 'card' };
  if (/\/ai\/n\d+-/.test(og)) return { key: 'ai', kind: 'ai' };
  return { key: og.replace(/^https?:\/\/[^/]+/, '').slice(0, 120), kind: 'own' };
}
async function vetStory(st: Any, force: boolean) {
  const id = `n${st.id}`;
  const pg = await pageImage(st);
  if (pg.status !== 200 || !pg.og) return { id, skipped: `page ${pg.status}` };
  const k = imgKey(pg.og);
  if (k.kind === 'card') return { id, ok: true, card: true };
  const prev = await getDoc('nwsimgvet', id);
  if (!force && prev && prev.img === k.key) return { id, same: true, ok: prev.ok };
  let labelTxt = '';
  if (k.kind === 'lib' || k.kind === 'stock') {
    const lab = await getDoc('nwsimglab', k.key);
    labelTxt = lab ? `Library label: ${lab.shows}${lab.entity ? ` (${lab.entity})` : ''}` : '';
  } else if (k.kind === 'ai') labelTxt = 'This is an AI generated illustration (labelled "תמונה להמחשה" on the site).';
  else labelTxt = 'This is the story\'s own image (from the source).';
  const text = `Section: ${SEC_HE[st.section] || st.section}\nTitle: ${st.title}\nSummary: ${st.dek || ''}\n${labelTxt}\nJSON only.`;
  const o = await claude(VET_MODEL, VET_SYS, [await imgPart(pg.og), { type: 'text', text }], 600);
  const ok = o.ok !== false;
  await merge('nwsimgvet', id, { img: k.key, kind: k.kind, og: pg.og, ok, why: String(o.why || '').slice(0, 200), at: new Date().toISOString(), model: VET_MODEL });
  if (!ok) {
    const fx: Any = (await getDoc('nwslive', 'imgfix')) || {};
    const fixes = { ...(fx.fixes || {}) };
    const prevFix = fixes[id] || {};
    fixes[id] = { img: k.key, bad: [...new Set([...(prevFix.bad || []), k.key])], why: String(o.why || '').slice(0, 160), at: new Date().toISOString(), ...(k.kind === 'ai' || prevFix.noai ? { noai: true } : {}) };
    await merge('nwslive', 'imgfix', { fixes, brake: BRAKE, at: new Date().toISOString() });
  }
  return { id, img: k.key, ok, why: o.why };
}
async function tick(b: Any) {
  if (BRAKE) { await merge('nwslive', 'imgfix', { brake: true, at: new Date().toISOString() }); return { brake: true }; }
  const fx: Any = await getDoc('nwslive', 'imgfix');
  if (fx?.brake) await merge('nwslive', 'imgfix', { brake: false });
  const days = Math.min(Number(b.days) || 2, 30);
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const q = sb.from('hns_stories').select('id,title,dek,section,published_at,kind').eq('state', 'published').gte('published_at', since).order('published_at', { ascending: false }).limit(400);
  const { data } = await (b.ids ? sb.from('hns_stories').select('id,title,dek,section,published_at,kind').in('id', b.ids.map(Number)) : q);
  const rows = (data || []).filter((s: Any) => s.kind !== 'sponsored');
  const max = Math.min(Number(b.max) || 30, 60);
  const out: Any[] = []; let calls = 0;
  for (let i = 0; i < rows.length && calls < max; i += 5) {
    const res = await Promise.all(rows.slice(i, i + 5).map((s: Any) => vetStory(s, !!b.force).catch((e) => ({ id: `n${s.id}`, error: String((e as Error).message || e).slice(0, 120) }))));
    for (const r of res) { out.push(r); if ('ok' in r && !(r as Any).same && !(r as Any).card) calls++; }
  }
  return { checked: out.length, calls, failed: out.filter((r: Any) => r.ok === false), errors: out.filter((r: Any) => r.error).slice(0, 5) };
}

// Lives inside hns-img (the project reached its limit of edge functions): hns-img routes every action that starts with 'vet_' here.
export async function vetRoute(b: Any) {
  await setup();
  try {
    if (b.action === 'vet_label') return { ok: true, ...(await label(b)) };
    if (b.action === 'vet_live') return { ok: true, ...(await live()) };
    if (b.action === 'vet_tick') return { ok: true, ...(await tick(b)) };
    if (b.action === 'vet_vet') return { ok: true, ...(await tick({ ...b, max: 60 })) };
    return { ok: false, error: 'unknown action' };
  } catch (e) { return { ok: false, error: String((e as Error).message || e) }; }
}
