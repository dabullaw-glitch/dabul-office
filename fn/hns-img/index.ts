// hns-img (28.10.2026): an illustrative AI image for every published story of the HNS news engine (nws.co.il).
// Runs on its own cron (every 10 minutes), after hns-publish has published; hns-publish itself is not touched.
// POST (x-cron-secret):
//   {action:'tick'}                 up to 3 published stories (last 7 days) that have no image yet
//   {action:'one', id, model?}      one story now (model 'schnell' | 'lucid'), same rules
//   {action:'status'}               today's attempts and what is waiting
// How an image is made:
//   1. a prompt for a GENERIC editorial scene that fits the topic (street, sea, municipal building, school, ambulance at a distance,
//      police lights at night, cranes, beach, park), written by Claude from the story, or by a fixed template when Claude fails.
//      Every prompt gets the same hard rules appended (no identifiable people, no public figures, not the real event, no injured
//      people or blood, no text, signs, tape, logos or license plates). Words for objects that usually carry text are removed.
//   2. the edge function nws-img calls the Cloudflare worker nws-img (Workers AI, FREE daily allowance only, never a paid plan)
//      and stores the file in the public Storage bucket nws-img.
// Daily budget (the free allowance resets at 00:00 UTC):
//   'lucid' (1280x720, expensive) only for the home page lead story, at most LUCID_MAX a day; everything else 'schnell' (cheap).
//   When the worker answers with the quota error (4006 / daily free allocation): lucid falls back to schnell; when schnell also hits
//   the quota, nothing more is tried that day; the story gets image_note and the next try is after 00:10 UTC.
// The site shows every AI image with the label "תמונה להמחשה"; the alt text (Hebrew) describes the scene.
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

const LUCID_MAX = 2;       // lucid a day (each one uses about a quarter of the free daily allowance; 2 leave room for ~40 schnell)
const MAX_PER_RUN = 3;
const RUN_MS = 100_000;    // stop starting new images after this much time in one run
const WINDOW_D = 7;        // only stories published in the last 7 days
const MODEL = 'claude-sonnet-5-5';
const QUOTA_RE = /4006|daily free allocation|neurons/i;

const dayStartUTC = () => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d.toISOString(); };
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();

// ---------- the home page lead (same rule as the site, sites/nws/src/lib/content.ts leadOf) ----------
// newest published story of the last 72 hours that is not a flash item, not an opinion and not part of the active event block
async function leadId(): Promise<number | null> {
  const { data: ev } = await sb.from('hns_event').select('story_ids,starts_at,ends_at').eq('active', true);
  const now = Date.now();
  const evIds = new Set((ev || []).filter((e: Any) => Date.parse(e.starts_at) <= now && (!e.ends_at || Date.parse(e.ends_at) > now)).flatMap((e: Any) => e.story_ids || []).map(Number));
  const since = new Date(now - 72 * 3600e3).toISOString();
  const { data } = await sb.from('hns_stories').select('id,section,kind,published_at').eq('state', 'published').gte('published_at', since).order('published_at', { ascending: false }).limit(50);
  const pool = (data || []).filter((s: Any) => !evIds.has(Number(s.id)));
  const l = pool.find((s: Any) => s.section !== 'flash' && s.kind !== 'opinion');
  return l ? Number(l.id) : null;
}

// ---------- prompt ----------
const HARD = 'Realistic editorial documentary photograph, natural light, Mediterranean coastal city in Israel. '
  + 'No text, no letters, no numbers, no signs, no banners, no posters, no logos, no flags, no tape, no license plates, no screens. '
  + 'No identifiable people and no faces: any people are tiny, far away and seen from behind. '
  + 'No public figures, no injured people, no blood, no weapons, no violence. A generic scene, not a photo of a real event.';
// objects that make the model draw gibberish letters, and things the rules forbid
const BANNED = /\b(?:police tape|crime scene tape|caution tape|tape|signs?|signage|signboards?|road signs?|street signs?|banners?|posters?|billboards?|logos?|storefronts?|shop ?fronts?|shop signs?|license plates?|number plates?|newspapers?|headlines?|text|letters?|words?|writing|captions?|labels?|screens?|flags?|graffiti|faces?|portraits?|close-?ups?|crowds?|blood|injured|wounded|victims?|weapons?|guns?|knives?|politicians?|ministers?)\b/gi;
const sanitize = (p: string) => p.replace(BANNED, '').replace(/\s+,/g, ',').replace(/,\s*,+/g, ',').replace(/\s{2,}/g, ' ').trim().slice(0, 900);

const SYSTEM = `You write the prompt for an AI image model. The image illustrates a local news story from Netanya or the nearby Sharon region in Israel.
It must be a GENERIC scene that fits the topic, never a depiction of the real event. Pick one simple scene, for example:
a quiet street of white stone apartment blocks with palm trees; the seafront promenade on the cliffs above the beach; a municipal building exterior;
a school yard seen from outside the fence; an ambulance parked far away on a coastal road at dusk; blue police lights reflected on a wet empty street at night, seen from far;
construction cranes over new residential towers; a sandy beach with lifeguard hut; a green city park; an intersection with orange traffic cones and road works;
an empty classroom with a plain ballot box; a rural road through orchards; a courthouse exterior with columns; an empty football stadium at dusk.
Hard rules:
- No people close up. If there are people at all, they are tiny, far away, seen from behind, unidentifiable.
- Never politicians or public figures. Never injured people, blood, weapons, fights or a crime scene.
- No text anywhere: avoid objects that carry writing (signs, banners, posters, storefronts, police tape, flags, screens, vehicles with readable plates).
- Realistic editorial photograph, natural light, Israeli Mediterranean coastal city cues.
- "prompt" in English, 35 to 70 words, describing only what is seen.
- "alt" in simple Hebrew, one short sentence describing what is seen in the image (not the event), no dashes, no names of people or media outlets.
Answer with JSON only: {"scene":"","prompt":"","alt":""}`;

async function claudePrompt(st: Any) {
  if (!S.ANTHROPIC_API_KEY) throw new Error('no key');
  const user = `מדור: ${st.section}\nכותרת: ${st.title}\nכותרת משנה: ${st.dek || ''}\nתקציר: ${(Array.isArray(st.body) ? st.body : []).join(' ').slice(0, 700)}\nמקומות: ${(st.places || []).join(', ')}`;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: Object.assign({ 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } as Record<string, string>, S.ANTHROPIC_WORKSPACE_ID ? { 'anthropic-workspace-id': S.ANTHROPIC_WORKSPACE_ID } : {}),
    body: JSON.stringify({ model: MODEL, max_tokens: 400, system: SYSTEM, messages: [{ role: 'user', content: user }] }),
    signal: AbortSignal.timeout(40000),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('no json');
  const o = JSON.parse(m[0]);
  if (!o.prompt || !o.alt) throw new Error('empty prompt');
  return { scene: String(o.scene || ''), prompt: String(o.prompt), alt: clean(o.alt), by: 'claude' };
}

// fixed templates when Claude is not available
const T = {
  police: ['Blue police lights reflected on a wet empty city street at night, seen from far away, white stone apartment blocks and palm trees, calm mood', 'רחוב ריק בלילה עם אורות כחולים של ניידת משטרה מרחוק'],
  ambulance: ['An ambulance parked far away on a coastal road at dusk, palm trees, soft evening light, empty road', 'אמבולנס חונה מרחוק בכביש עירוני לפני שקיעה'],
  roads: ['A city intersection with orange traffic cones and fresh paving works, white apartment blocks and palm trees, morning light, no vehicles close', 'צומת בעיר עם קונוסים כתומים ועבודות ריצוף'],
  vote: ['An empty school classroom in the evening with a plain blue ballot box on a wooden table, chairs pushed aside, soft window light', 'כיתה ריקה עם קלפי כחולה על שולחן'],
  cranes: ['Construction cranes over new residential towers near the Mediterranean coast, blue sky, white stone apartment blocks below', 'עגורנים מעל מגדלי מגורים בבנייה ליד הים'],
  city: ['A modern municipal building exterior with palm trees and a wide plaza, Mediterranean light, empty plaza', 'בניין עירוני עם עצי דקל ורחבה'],
  school: ['A school yard seen from outside the fence, trees and a basketball court, morning light, empty yard', 'חצר של בית ספר בבוקר, מבט מבחוץ'],
  sports: ['An empty football stadium at dusk with green pitch and floodlights turning on', 'אצטדיון כדורגל ריק בשעת ערב'],
  leisure: ['An open air amphitheater by the sea at dusk with warm stage lights and empty seats', 'במה פתוחה ליד הים בשעת ערב'],
  beach: ['The Netanya style sandstone cliffs and promenade above a sandy beach, calm turquoise sea, late afternoon light', 'מצוק וטיילת מעל חוף ים רגוע'],
  sharon: ['A rural road through green orchards and fields in the Sharon plain, morning light, empty road', 'כביש כפרי בין פרדסים ושדות'],
  law: ['A courthouse exterior with tall columns and stone steps, clear sky, empty steps', 'בניין בית משפט עם עמודים ומדרגות'],
  street: ['A quiet residential street of white stone apartment blocks with palm trees in a Mediterranean coastal city, natural light', 'רחוב שקט עם בנייני מגורים ועצי דקל'],
} as const;
function templatePrompt(st: Any) {
  const tx = `${st.title} ${st.dek || ''} ${(Array.isArray(st.body) ? st.body : []).join(' ')}`;
  const k: keyof typeof T = /בחירות|הצבע|קלפי/.test(tx) ? 'vote'
    : /ירי|משטר|חשוד|נעצר|עציר|צו איסור/.test(tx) ? 'police'
    : /מד["״]א|נפצע|נפגע|תאונ|פונה/.test(tx) ? 'ambulance'
    : /חסימ|ייחסמ|עבודות|צומת|הסדרי תנועה/.test(tx) ? 'roads'
    : st.section === 'realestate' ? 'cranes' : st.section === 'community' ? 'school' : st.section === 'sports' ? 'sports'
    : st.section === 'leisure' ? 'leisure' : st.section === 'tourism' ? 'beach' : st.section === 'sharon' ? 'sharon'
    : st.section === 'law' ? 'law' : st.section === 'city' ? 'city' : 'street';
  return { scene: k, prompt: T[k][0], alt: T[k][1], by: 'template' };
}

// ---------- generation ----------
async function gen(prompt: string, name: string, model: 'schnell' | 'lucid') {
  const size = model === 'lucid' ? { width: 1280, height: 720 } : { width: 1024, height: 1024 };
  const r = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/nws-img`, {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
    body: JSON.stringify({ prompt, name, model, ...size }), signal: AbortSignal.timeout(110000),
  }).then((x) => x.json()).catch((e) => ({ ok: false, error: String(e) }));
  return { ...r, quota: !r?.ok && QUOTA_RE.test(String(r?.error || '')) };
}
async function log(story_id: number | null, model: string, ok: boolean, quota: boolean, note: string) {
  await sb.from('hns_img_log').insert({ story_id, model, ok, quota, note: note.slice(0, 300) });
}
async function budget() {
  const { data } = await sb.from('hns_img_log').select('story_id,model,ok,quota').gte('at', dayStartUTC());
  const rows = data || [];
  const fails: Record<string, number> = {};
  for (const r of rows) if (!r.ok && !r.quota && r.story_id) fails[r.story_id] = (fails[r.story_id] || 0) + 1;
  return {
    fails,
    schnellBlocked: rows.some((r: Any) => r.quota && r.model === 'schnell'),
    lucidBlocked: rows.some((r: Any) => r.quota && r.model === 'lucid') || rows.filter((r: Any) => r.ok && r.model === 'lucid').length >= LUCID_MAX,
    lucidUsed: rows.filter((r: Any) => r.ok && r.model === 'lucid').length,
    tries: rows.length,
  };
}
const WAIT_NOTE = 'ממתין למכסה החינמית, ניסיון נוסף אחרי 00:10 UTC';

async function makeOne(st: Any, want: 'schnell' | 'lucid', b: Any) {
  // the prompt is written once per story and kept (a retry the next day does not call Claude again)
  let p: Any = st.image_prompt ? { prompt: st.image_prompt, alt: st.image_alt || templatePrompt(st).alt, by: 'saved' } : null;
  if (!p) { try { p = await claudePrompt(st); } catch { p = templatePrompt(st); } }
  const base = sanitize(p.prompt);
  const full = `${base}. ${HARD}`;
  const alt = clean(p.alt).replace(/[–—]/g, '-');
  let model: 'schnell' | 'lucid' = want === 'lucid' && !b.lucidBlocked ? 'lucid' : 'schnell';
  const stamp = Date.now().toString(36);
  let r = await gen(full, `n${st.id}-${model}-${stamp}`, model);
  if (!r.ok && model === 'lucid') {
    await log(st.id, 'lucid', false, r.quota, String(r.error || 'failed'));
    if (r.quota) b.lucidBlocked = true;
    model = 'schnell';
    r = await gen(full, `n${st.id}-${model}-${stamp}`, model);
  }
  if (!r.ok) {
    await log(st.id, model, false, r.quota, String(r.error || 'failed'));
    if (r.quota) b.schnellBlocked = true;
    await sb.from('hns_stories').update({ image_prompt: base, image_alt: alt, image_note: r.quota ? WAIT_NOTE : `נכשל: ${String(r.error || '').slice(0, 120)}` }).eq('id', st.id);
    return { id: st.id, ok: false, quota: r.quota, error: String(r.error || '').slice(0, 160) };
  }
  if (model === 'lucid') b.lucidUsed++;
  if (b.lucidUsed >= LUCID_MAX) b.lucidBlocked = true;
  await log(st.id, model, true, false, p.by);
  await sb.from('hns_stories').update({ image_url: r.url, image_prompt: base, image_alt: alt, image_model: model, image_at: new Date().toISOString(), image_note: null }).eq('id', st.id);
  return { id: st.id, ok: true, model, url: r.url, by: p.by };
}

async function tick() {
  const now = new Date();
  if (now.getUTCHours() === 0 && now.getUTCMinutes() < 10) return { skipped: 'before 00:10 UTC' };
  const b = await budget();
  const since = new Date(Date.now() - WINDOW_D * 864e5).toISOString();
  const { data: rows } = await sb.from('hns_stories').select('id,section,kind,title,dek,body,places,image_prompt,image_alt,image_note,published_at')
    .eq('state', 'published').is('image_url', null).gte('published_at', since).order('published_at', { ascending: false }).limit(30);
  const todo = rows || [];
  if (!todo.length) return { todo: 0 };
  if (b.schnellBlocked) {
    for (const st of todo) if (st.image_note !== WAIT_NOTE) await sb.from('hns_stories').update({ image_note: WAIT_NOTE }).eq('id', st.id);
    return { todo: todo.length, waiting: 'daily free allowance used, next try after 00:10 UTC' };
  }
  const lead = await leadId();
  todo.sort((x: Any, y: Any) => (Number(y.id) === lead ? 1 : 0) - (Number(x.id) === lead ? 1 : 0)); // the lead first
  const t0 = Date.now();
  const res: Any[] = [];
  // a story whose image failed twice today for another reason (not the quota) waits for tomorrow
  for (const st of todo.filter((x: Any) => (b.fails[x.id] || 0) < 2).slice(0, MAX_PER_RUN)) {
    if (Date.now() - t0 > RUN_MS || b.schnellBlocked) break;
    res.push(await makeOne(st, Number(st.id) === lead ? 'lucid' : 'schnell', b));
  }
  return { todo: todo.length, lead, res };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const body: Any = await req.json().catch(() => ({}));
  try {
    if (body.action === 'tick') return J({ ok: true, ...(await tick()) });
    if (body.action === 'one') {
      const { data: st } = await sb.from('hns_stories').select('id,section,kind,title,dek,body,places,image_prompt,image_alt,image_note,state').eq('id', Number(body.id)).maybeSingle();
      if (!st || st.state !== 'published') return J({ ok: false, error: 'not a published story' });
      const b = await budget();
      if (b.schnellBlocked) return J({ ok: false, error: 'daily free allowance used, next try after 00:10 UTC' });
      return J(await makeOne(st, body.model === 'lucid' ? 'lucid' : 'schnell', b));
    }
    if (body.action === 'status') {
      const { data: logs } = await sb.from('hns_img_log').select('at,story_id,model,ok,quota,note').gte('at', dayStartUTC()).order('at');
      const { data: wait } = await sb.from('hns_stories').select('id,image_note').eq('state', 'published').is('image_url', null);
      return J({ ok: true, budget: await budget(), lucidMax: LUCID_MAX, today: logs, waiting: wait, lead: await leadId() });
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
