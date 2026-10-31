// hns-img/real.ts (31.10.2026): REAL photos for nws.co.il stories, from legal sources only, always credited, and only when the photo
// truly shows the story's subject (Yakir compared nws with c14.co.il: "שיראה כמו אתר חדשות"; and his rule after the wrong stadiums:
// a photo of a specific place, team, building or person appears only in a story about exactly that).
//
// SOURCES (in this order, per story):
//  1. The official release the story was built from: a photo that the issuing body itself published with its release (MDA and
//     police Telegram channels, the Laniado hospital site, local councils' sites, the Netanya municipality's YouTube channel, ...).
//     Credit "צילום: <the body>" (e.g. "צילום: דוברות מד״א"). Never a photo from a news outlet's article.
//  2. A free-license portrait of the public figure the story is about (minister, MK, the mayor, a coach...): Wikidata P18 of the
//     person (a human with a Hebrew Wikipedia article), the file on Wikimedia Commons with a free license (CC BY / BY-SA / CC0 /
//     public domain / the Government Press Office attribution licence). Credit "<author>, ויקישיתוף, <license>". The person is the
//     story's main subject (an AI reading of the title and summary); never for a story that only mentions the person, never for
//     suspects, victims or minors, never on a sensitive story.
//  The Government Press Office (לע"מ) archive itself has no reachable public feed or search from our servers (31.10.2026), so its
//  photos come only through Commons (category Photographs by the GPO), with their own credit.
//
// EVERY candidate passes a vision check (Haiku 5.5) before it is used: a real photograph (not a logo, poster, flyer, map or text
// screenshot), fits the story, no injured people or blood, no identifiable minors, no suspects' faces, nothing foreign. The photo is
// copied into the public Storage bucket nws-img (real/...) and set as the story's own image (image_url, image_model empty), with
// extras.image_credit (the caption "צילום: ...") and extras.image_src {type, page, license, person}. The site shows it as a real
// photo; the regular vision check (vet.ts) re-checks the live picture like any other.
// A real photo replaces an AI illustration or a library/stock/card picture; a hand-set image (extras.image_credit given in the panel)
// is never replaced.
//
// BUDGET: every AI call is priced into ai_cost (fn 'nws-realimg'); when the month reaches the brake nothing new is tried (no photo
// without its check).
// POST hns-img (x-cron-secret): {action:'real_tick', days?:3, max?:6} cron every 15 minutes;
//   {action:'real_one', id, dry?} one story now (dry: what would be used, nothing written); {action:'real_status'}.
// State: docs coll 'nwsrealimg' id 'n<story id>' {status: used|none|failed|rejected, type, url, credit, why, at}.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const SB_URL = Deno.env.get('SUPABASE_URL')!;
const sb = createClient(SB_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const MODEL = 'claude-haiku-5-5';
const UA = { 'User-Agent': 'nws.co.il news photos (office@dabullaw.co.il)' };
const BUCKET = 'nws-img';
let S: Record<string, string> = {};
let BRAKE = false;
async function setup() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['ANTHROPIC_API_KEY', 'ANTHROPIC_WORKSPACE_ID']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
  const { data: x } = await sb.from('hns_config').select('v').eq('k', 'ai_extra').maybeSingle();
  const cfg: Any = x?.v || {};
  const { data: m } = await sb.rpc('ai_cost_month');
  BRAKE = Number(m || 0) + Number(cfg.untracked_usd || 0) >= Number(cfg.extra_stop_usd || 65);
}
const merge = (coll: string, id: string, patch: Any) => sb.rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const getDoc = async (coll: string, id: string) => (await sb.from('docs').select('data').eq('coll', coll).eq('id', id).maybeSingle()).data?.data || null;
const strip = (s: string) => String(s || '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const clean = (s: string) => strip(s).replace(/\s*[—–]\s*/g, ' - ');

// ---------- official release photos ----------
// the bodies whose own release photos may be used, with the caption credit; other official sources (weather, Home Front alerts,
// event listings, a club site) are not releases with photos for media use
const CREDIT: Record<string, string> = {
  mda_tg: 'דוברות מד״א', police_tg: 'דוברות המשטרה', laniado: 'דוברות המרכז הרפואי לניאדו', kadima_zoran: 'מועצת קדימה צורן',
  netanya_muni_news: 'עיריית נתניה', netanya_yt: 'עיריית נתניה', hof_hasharon: 'מועצה אזורית חוף השרון',
};
const BAD_IMG = /logo|icon|emoji|favicon|avatar|placeholder|banner|sprite|Group-\d|\/flags?\/|default[-_]image|share[-_]image/i;
async function fetchText(url: string) {
  const r = await fetch(url, { headers: { ...UA, 'Accept-Language': 'he' }, signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`page ${r.status}`);
  return await r.text();
}
function abs(u: string, base: string) { try { return new URL(u.replace(/&amp;/g, '&'), base).toString(); } catch { return ''; } }
async function releasePhoto(item: Any): Promise<string> {
  const url = String(item.url || '');
  const tg = url.match(/^https:\/\/t\.me\/(?:s\/)?([A-Za-z0-9_]+)\/(\d+)/);
  if (tg) {
    const h = await fetchText(`https://t.me/${tg[1]}/${tg[2]}?embed=1&mode=tme`);
    const m = h.match(/tgme_widget_message_photo_wrap[^>]*?background-image:url\('([^']+)'\)/);
    return m ? m[1] : '';
  }
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (yt) return `https://i.ytimg.com/vi/${yt[1]}/maxresdefault.jpg`;
  if (!/^https:\/\//.test(url)) return '';
  const h = await fetchText(url);
  const og = (h.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i) || h.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']og:image["']/i) || [])[1];
  if (og && !BAD_IMG.test(og)) return abs(og, url);
  // the article's own picture: the first upload image inside the article body (WordPress), at full size
  const body = h.split(/<article|class=["'][^"']*(?:entry-content|post-content|article-body)/i).slice(1).join(' ') || '';
  for (const m of body.matchAll(/<img[^>]+(?:data-src|src)=["']([^"']+\.(?:jpe?g|webp|png))["']/gi)) {
    const u = m[1];
    if (BAD_IMG.test(u) || !/uploads|images|media/i.test(u)) continue;
    return abs(u.replace(/-\d{2,4}x\d{2,4}(\.\w+)$/, '$1'), url);
  }
  return '';
}

// ---------- the public figure's portrait (Wikidata P18 -> Commons) ----------
const FREE_LIC = /^(cc[ -]?by|cc0|public domain|pd\b|pd-|attribution|gpo|no restrictions)/i;
const licHe = (l: string) => (/public domain|^pd/i.test(l) ? 'נחלת הכלל' : /cc0/i.test(l) ? 'CC0' : l);
const norm = (s: string) => String(s || '').replace(/["'״׳`]/g, '').replace(/\s+/g, ' ').trim();
async function wd(params: Record<string, string>) {
  const u = new URL('https://www.wikidata.org/w/api.php'); Object.entries({ format: 'json', ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) }); if (!r.ok) throw new Error(`wikidata ${r.status}`); return await r.json();
}
async function portraitOf(personHe: string) {
  const s = await wd({ action: 'wbsearchentities', search: personHe, language: 'he', uselang: 'he', type: 'item', limit: '5' });
  const ids = (s.search || []).map((x: Any) => x.id).slice(0, 5);
  if (!ids.length) return null;
  const e = await wd({ action: 'wbgetentities', ids: ids.join('|'), props: 'claims|sitelinks|labels|aliases', languages: 'he', sitefilter: 'hewiki' });
  for (const id of ids) {
    const it = e.entities?.[id]; if (!it) continue;
    const human = (it.claims?.P31 || []).some((c: Any) => c.mainsnak?.datavalue?.value?.id === 'Q5');
    const names = [it.labels?.he?.value, ...((it.aliases?.he || []).map((a: Any) => a.value))].map(norm);
    if (!human || !it.sitelinks?.hewiki || !names.includes(norm(personHe))) continue;
    const p18 = (it.claims?.P18 || []).sort((a: Any, b: Any) => (b.rank === 'preferred' ? 1 : 0) - (a.rank === 'preferred' ? 1 : 0))[0];
    const file = p18?.mainsnak?.datavalue?.value; if (!file) return null;
    const u = new URL('https://commons.wikimedia.org/w/api.php');
    Object.entries({ action: 'query', format: 'json', titles: `File:${file}`, prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1600' }).forEach(([k, v]) => u.searchParams.set(k, v));
    const c = await (await fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) })).json();
    const ii: Any = (Object.values(c.query?.pages || {})[0] as Any)?.imageinfo?.[0]; if (!ii) return null;
    const md = ii.extmetadata || {};
    const lic = strip(md.LicenseShortName?.value || '');
    if (!FREE_LIC.test(lic) || /fair use|non-free/i.test(lic)) return { reject: `license ${lic}` };
    if (!/jpe?g|png|webp/.test(String(ii.mime || ''))) return { reject: `mime ${ii.mime}` };
    if ((ii.width || 0) < 500) return { reject: 'too small' };
    const artist = strip(md.Artist?.value || md.Credit?.value || '').replace(/^(Photo|Photographer|Author)[:\s]+/i, '').slice(0, 40) || 'לא ידוע';
    return { url: ii.thumburl || ii.url, page: ii.descriptionurl, license: lic, credit: `${artist}, ויקישיתוף, ${licHe(lic)}`, entity: id, file };
  }
  return null;
}

// ---------- AI ----------
async function claude(system: string, content: Any[], maxTok = 700) {
  const h: Record<string, string> = { 'x-api-key': S.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' };
  if (S.ANTHROPIC_WORKSPACE_ID) h['anthropic-workspace-id'] = S.ANTHROPIC_WORKSPACE_ID;
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: h, body: JSON.stringify({ model: MODEL, max_tokens: maxTok, system, messages: [{ role: 'user', content }] }), signal: AbortSignal.timeout(60000) });
  const j = await r.json();
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${JSON.stringify(j).slice(0, 160)}`);
  const u = j.usage || {};
  await sb.rpc('ai_cost_add', { p_fn: 'nws-realimg', p_model: MODEL, p_in: Number(u.input_tokens || 0) + Number(u.cache_read_input_tokens || 0) + Number(u.cache_creation_input_tokens || 0), p_out: Number(u.output_tokens || 0) }).then(() => null, () => null);
  const text = (j.content || []).filter((c: Any) => c.type === 'text').map((c: Any) => c.text).join('');
  const m = text.replace(/```(?:json)?/g, '').match(/\{[\s\S]*\}/);
  if (!m) throw new Error(`no json${j.stop_reason === 'max_tokens' ? ' (cut)' : ''}: ${text.slice(0, 60)}`);
  return JSON.parse(m[0]);
}
const PERSON_SYS = `You read a Hebrew local news story (Netanya, Israel) and decide whether its MAIN subject is one specific public figure (a minister, member of Knesset, party leader, the prime minister, a mayor or council head, a senior official, a judge, a coach, a known athlete or artist), so that a portrait of that person would be the natural photo of the story.
Answer "about": false when the person is only mentioned, when several people share the story equally, when the story is about a crime suspect, a victim, an injured or dead person, a minor, or a private individual, or when the main subject is an event, place or organisation.
Answer JSON only: {"about": true|false, "person_he": "<the person's full name in Hebrew, as on Hebrew Wikipedia, or empty>"}`;
const CHECK_SYS = `You check a candidate photo for a Hebrew local news story (Netanya, Israel) before it is published as the story's own photo with a credit line.
The photo PASSES only if all are true:
- it is a real photograph (not a logo, poster, flyer, invitation, map, chart, screenshot of text, or a graphic with large text);
- it fits the story: for an official release photo it shows the event, place, vehicles, staff or activity the story reports (or the body's scene of it); for a portrait it is a clear photo of one person (the person the story is about; you cannot verify identity, just that it is a single-person portrait that could be them and not a group, a crowd or someone obviously different, e.g. a child for an adult minister);
- no injured people, blood, bodies or victims; no identifiable minors; no faces of crime suspects;
- nothing from another country (foreign text, flags, police markings) when the story is about Israel;
- not misleading about what happened.
Answer JSON only: {"ok": true|false, "why": "<short Hebrew reason>", "alt": "<short Hebrew description of what the photo shows, up to 12 words>"}`;

async function download(url: string) {
  const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`image ${r.status}`);
  const ct = (r.headers.get('content-type') || '').split(';')[0];
  if (!/^image\/(jpeg|png|webp)$/.test(ct)) throw new Error(`type ${ct}`);
  const buf = new Uint8Array(await r.arrayBuffer());
  if (buf.byteLength < 15000) throw new Error('image too small');
  if (buf.byteLength > 4.5e6) throw new Error('image too big');
  return { buf, ct };
}
function b64(u: Uint8Array) { let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); }
async function sha8(u: Uint8Array) { const d = new Uint8Array(await crypto.subtle.digest('SHA-1', u as unknown as ArrayBuffer)); return [...d.slice(0, 4)].map((x) => x.toString(16).padStart(2, '0')).join(''); }

const SEC_HE: Record<string, string> = { flash: 'מבזקים', national: 'חדשות ארציות', city: 'העירייה', police: 'משטרה', realestate: 'נדל"ן', sports: 'ספורט', transport: 'תחבורה', community: 'קהילה וחינוך', health: 'בריאות', leisure: 'תרבות ובילוי', sharon: 'השרון', tourism: 'תיירות', law: 'משפט', economy: 'כלכלה' };
// sections where a portrait may be the story's photo (never police or flash: suspects, victims, incidents)
const PORTRAIT_SECTIONS = new Set(['national', 'city', 'sports', 'economy', 'sharon', 'community', 'health', 'law', 'realestate', 'transport', 'leisure', 'tourism']);

async function oneStory(st: Any, dry: boolean) {
  const id = `n${st.id}`;
  const ex: Any = st.extras || {};
  if (ex.image_credit && !(ex.image_src && ex.image_src.auto)) return { id, skip: 'hand-set image' };
  const story = `Section: ${SEC_HE[st.section] || st.section}\nTitle: ${st.title}\nSummary: ${st.dek || ''}`;
  const tried: Any[] = [];
  // 1. official release photo
  const { data: items } = await sb.from('hns_items').select('id,source_id,url').in('id', (st.item_ids || []).slice(0, 12));
  for (const it of (items || []).filter((x: Any) => CREDIT[x.source_id])) {
    let url = '';
    try { url = await releasePhoto(it); } catch (e) { tried.push({ src: it.source_id, error: String((e as Error).message || e).slice(0, 60) }); continue; }
    if (!url) { tried.push({ src: it.source_id, none: true }); continue; }
    const c = await useIf(st, story, { type: 'release', url, credit: CREDIT[it.source_id], page: it.url, desc: `An official release photo published by ${CREDIT[it.source_id]} with the release this story is based on.` }, dry);
    tried.push(c); if (c.used || c.wouldUse) return { id, ...c, tried };
  }
  // 2. the public figure's portrait
  if (PORTRAIT_SECTIONS.has(st.section) && st.sensitivity !== 'sensitive') {
    const p = await claude(PERSON_SYS, [{ type: 'text', text: `${story}\nJSON only.` }], 1000).catch(() => null);
    if (p?.about && p.person_he) {
      const pr: Any = await portraitOf(String(p.person_he)).catch((e) => ({ reject: String((e as Error).message || e).slice(0, 60) }));
      if (pr?.url) {
        const c = await useIf(st, story, { type: 'commons', url: pr.url, credit: pr.credit, page: pr.page, license: pr.license, person: p.person_he, desc: `A free-license portrait of ${p.person_he} (Wikimedia Commons, via Wikidata).` }, dry);
        tried.push(c); if (c.used || c.wouldUse) return { id, ...c, tried };
      } else tried.push({ person: p.person_he, portrait: pr?.reject || 'none' });
    } else tried.push({ person: p?.person_he || '', about: !!p?.about });
  }
  if (!dry) await merge('nwsrealimg', id, { status: 'none', tried: tried.slice(0, 6), at: new Date().toISOString() });
  return { id, none: true, tried };
}

async function useIf(st: Any, story: string, c: Any, dry: boolean) {
  let img;
  try { img = await download(c.url); } catch (e) { return { type: c.type, url: c.url, error: String((e as Error).message || e).slice(0, 60) }; }
  const mt = img.ct as string;
  const v = await claude(CHECK_SYS, [{ type: 'image', source: { type: 'base64', media_type: mt, data: b64(img.buf) } }, { type: 'text', text: `${story}\nCandidate: ${c.desc}\nCredit: ${c.credit}\nJSON only.` }], 1500).catch((e) => ({ ok: false, why: String((e as Error).message || e).slice(0, 80) }));
  if (v.ok !== true) {
    if (!dry) await merge('nwsrealimg', `n${st.id}`, { status: 'rejected', type: c.type, url: c.url, why: String(v.why || '').slice(0, 160), at: new Date().toISOString() });
    return { type: c.type, url: c.url, rejected: String(v.why || '').slice(0, 120) };
  }
  const alt = clean(v.alt || '').slice(0, 120) || (c.person ? c.person : '');
  if (dry) return { wouldUse: true, type: c.type, url: c.url, credit: c.credit, alt };
  const ext = mt === 'image/png' ? 'png' : mt === 'image/webp' ? 'webp' : 'jpg';
  const path = `real/n${st.id}-${await sha8(img.buf)}.${ext}`;
  const up = await sb.storage.from(BUCKET).upload(path, img.buf, { contentType: mt, upsert: true });
  if (up.error) return { type: c.type, error: `upload: ${up.error.message}` };
  const pub = `${SB_URL}/storage/v1/object/public/${BUCKET}/${path}`;
  // the story's own picture: a real photo (no model), with its credit; the previous AI image (if any) is kept in image_note
  const { data: cur } = await sb.from('hns_stories').select('extras,image_url,image_model').eq('id', st.id).maybeSingle();
  const extras = { ...((cur?.extras as Any) || {}), image_credit: c.credit.slice(0, 80), image_src: { type: c.type, page: c.page || '', license: c.license || '', person: c.person || '', auto: true, at: new Date().toISOString() } };
  const { error } = await sb.from('hns_stories').update({ image_url: pub, image_model: null, image_alt: alt, image_at: new Date().toISOString(), extras,
    image_note: cur?.image_url && cur.image_url !== pub ? `תמונה קודמת: ${cur.image_model || 'צילום'} ${cur.image_url}`.slice(0, 400) : null }).eq('id', st.id);
  if (error) return { type: c.type, error: `db: ${error.message}` };
  // a fix of the vision check for the old picture must not drop the new real photo
  const fx: Any = await getDoc('nwslive', 'imgfix');
  if (fx?.fixes?.[`n${st.id}`]) { const fixes = { ...fx.fixes }; delete fixes[`n${st.id}`]; await merge('nwslive', 'imgfix', { fixes, at: new Date().toISOString() }); }
  await merge('nwsrealimg', `n${st.id}`, { status: 'used', type: c.type, url: pub, from: c.url, page: c.page || '', credit: c.credit, license: c.license || '', person: c.person || '', alt, at: new Date().toISOString() });
  return { used: true, type: c.type, url: pub, credit: c.credit };
}

async function tick(b: Any) {
  if (BRAKE) return { brake: true };
  const days = Math.min(Number(b.days) || 3, 21), max = Math.min(Number(b.max) || 6, 20);
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data } = await sb.from('hns_stories').select('id,section,title,dek,kind,sensitivity,format,item_ids,extras,image_model,published_at').eq('state', 'published').gte('published_at', since)
    .or('format.is.null,format.neq.history').order('published_at', { ascending: false }).limit(300);
  const rows = (data || []).filter((s: Any) => s.kind !== 'sponsored' && !s.format);
  const { data: done } = await sb.from('docs').select('id').eq('coll', 'nwsrealimg').in('id', rows.map((s: Any) => `n${s.id}`));
  const seen = new Set((done || []).map((d: Any) => d.id));
  const todo = rows.filter((s: Any) => !seen.has(`n${s.id}`)).slice(0, max);
  const out: Any[] = [];
  const t0 = Date.now();
  for (const st of todo) {
    if (Date.now() - t0 > 110_000) break;
    try { out.push(await oneStory(st, false)); } catch (e) { out.push({ id: `n${st.id}`, error: String((e as Error).message || e).slice(0, 100) }); await merge('nwsrealimg', `n${st.id}`, { status: 'failed', why: String((e as Error).message || e).slice(0, 160), at: new Date().toISOString() }); }
  }
  return { checked: out.length, used: out.filter((r) => r.used).length, out };
}

export async function realRoute(b: Any) {
  await setup();
  try {
    if (b.action === 'real_tick') return { ok: true, ...(await tick(b)) };
    if (b.action === 'real_one') {
      if (BRAKE) return { ok: false, error: 'brake' };
      const { data: st } = await sb.from('hns_stories').select('id,section,title,dek,kind,sensitivity,format,item_ids,extras,image_model,state').eq('id', Number(b.id)).maybeSingle();
      if (!st || st.state !== 'published') return { ok: false, error: 'not a published story' };
      return { ok: true, ...(await oneStory(st, !!b.dry)) };
    }
    if (b.action === 'real_status') {
      const { data } = await sb.from('docs').select('id,data').eq('coll', 'nwsrealimg').order('updated_at', { ascending: false }).limit(200);
      const by: Record<string, number> = {}; (data || []).forEach((r: Any) => { by[r.data.status] = (by[r.data.status] || 0) + 1; });
      return { ok: true, by, used: (data || []).filter((r: Any) => r.data.status === 'used').map((r: Any) => ({ id: r.id, type: r.data.type, credit: r.data.credit })) };
    }
    return { ok: false, error: 'unknown action' };
  } catch (e) { return { ok: false, error: String((e as Error).message || e) }; }
}
