// hns-feed (28.10.2026): public read endpoint of the HNS news engine for the nws.co.il site build.
// GET -> published stories only, newest first, with just the fields the site needs. No secrets, no internal notes.
// ?limit=N (default 300, max 1000). No long or medium dashes in any text.
// 28.10.2026 (Yakir): an independent news site. Only official sources (municipality, police, MDA, IMS...) are shown as the source
// of a story; media outlets are never exposed as the source (a needed credit is one line at the end of the body, written by hns-write).
// 28.10.2026 (home redesign): also the card fields (kicker, kind, author, video, closure) and the AI illustration (image_url + alt,
// shown on the site with the label "תמונה להמחשה"), and the active event (table hns_event) as "event" (null when none is active).
// A kicker that names a media outlet (table hns_outlets) is dropped here as well.
// 28.10.2026 (flashes and calendar): also "flashes", short lines from OFFICIAL sources only (Home Front Command, MDA, IMS
//   warnings, police) about Netanya and the nearby Sharon, as they arrived, newest first. A flash ages out: Home Front Command after
//   6 hours, the others after 12 hours. Sensitive items (death, minors...) are never shown as a flash; they go through Yakir.
//   And "calendar": the coming events from official listings (table hns_cal, e.g. the Netanya Culture Hall), up to 45 days ahead.
//   ?only=flashes returns just the flashes (small and cached 30 seconds), for the live ticker in the browser.
// 28.10.2026 (IndexNow): "updatedAt" is set only for a story updated with new facts (pub_note "עודכן..."), so the site shows the
//   update time and the sitemap lastmod changes; a wording fix ("תוקן") does not count as an update.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60' };
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const arr = (a: unknown) => (Array.isArray(a) ? a : []).map(clean).filter(Boolean);
const faq = (a: unknown) => (Array.isArray(a) ? a : []).map((x: Any) => Array.isArray(x) ? [clean(x[0]), clean(x[1])] : [clean(x?.q ?? x?.question), clean(x?.a ?? x?.answer)]).filter((x) => x[0] && x[1]);

const FLASH_SRC: Record<string, { name: string; hours: number }> = {
  oref_tg: { name: 'פיקוד העורף', hours: 6 }, mda_tg: { name: 'מד״א', hours: 12 }, ims_warn: { name: 'השירות המטאורולוגי', hours: 12 }, police_tg: { name: 'משטרת ישראל', hours: 12 },
};
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : s);
async function flashes() {
  const since = new Date(Date.now() - 12 * 3600e3).toISOString();
  const { data } = await sb.from('hns_items').select('id,source_id,title,url,published_at,fetched_at,sensitivity')
    .in('source_id', Object.keys(FLASH_SRC)).eq('is_local', true).eq('backfill', false).gte('fetched_at', since).order('id', { ascending: false }).limit(40);
  const now = Date.now(); const seen = new Set<string>();
  return (data || []).filter((x: Any) => x.sensitivity !== 'sensitive').map((x: Any) => {
    const at = x.published_at || x.fetched_at; const src = FLASH_SRC[x.source_id];
    return { id: x.id, at, text: clip(clean(String(x.title || '').replace(/^[^\p{L}\p{N}]+/u, '')), 150), source: src.name, url: String(x.url || ''), kind: x.source_id.replace(/_.*/, ''), ttl: src.hours };
  }).filter((f: Any) => f.text && now - Date.parse(f.at) < f.ttl * 3600e3 && !seen.has(f.text) && seen.add(f.text)).slice(0, 15);
}
async function calendar() {
  const { data } = await sb.from('hns_cal').select('id,source_id,title,starts_at,venue,url').gte('starts_at', new Date().toISOString())
    .lte('starts_at', new Date(Date.now() + 45 * 864e5).toISOString()).order('starts_at').limit(120);
  const { data: srcs } = await sb.from('hns_sources').select('id,name_he').in('id', [...new Set((data || []).map((r: Any) => r.source_id))]);
  const nm = Object.fromEntries((srcs || []).map((r: Any) => [r.id, r.name_he]));
  return (data || []).map((r: Any) => ({ id: r.id, title: clean(r.title), start: r.starts_at, venue: clean(r.venue || ''), url: String(r.url || ''), source: nm[r.source_id] || '' }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  const url = new URL(req.url);
  if (url.searchParams.get('only') === 'flashes') return new Response(JSON.stringify({ ok: true, generated: new Date().toISOString(), flashes: await flashes() }), { headers: { ...H, 'cache-control': 'public, max-age=30' } });
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit')) || 300));
  const { data, error } = await sb.from('hns_stories')
    .select('id,created_at,published_at,updated_at,section,title,dek,body,key_points,faq,places,sources,image_url,image_alt,image_model,kicker,kind,author,author_role,video_url,closure,pub_note')
    .eq('state', 'published').not('published_at', 'is', null)
    .order('published_at', { ascending: false }).limit(limit);
  if (error) return new Response(JSON.stringify({ ok: false, error: 'db' }), { status: 500, headers: H });
  const { data: outl } = await sb.from('hns_outlets').select('name');
  const outNames = (outl || []).map((r: Any) => String(r.name || '').trim().toLowerCase()).filter((n: string) => n.length >= 2);
  const kick = (k: unknown) => { const t = clean(k); if (!t) return ''; const low = t.toLowerCase(); return outNames.some((n: string) => low.includes(n)) ? '' : t.split(/\s+/).slice(0, 6).join(' '); };
  const nowMs = Date.now();
  const { data: evs } = await sb.from('hns_event').select('id,kind,title,tag,stat1,stat1_label,stat2,stat2_label,cta_text,cta_url,story_ids,block,starts_at,ends_at')
    .eq('active', true).order('starts_at', { ascending: false });
  const ev = (evs || []).find((e: Any) => Date.parse(e.starts_at) <= nowMs && (!e.ends_at || Date.parse(e.ends_at) > nowMs)) || null;
  const event = ev ? { id: ev.id, kind: ev.kind, title: clean(ev.title), tag: clean(ev.tag), stat1: clean(ev.stat1), stat1Label: clean(ev.stat1_label), stat2: clean(ev.stat2), stat2Label: clean(ev.stat2_label),
    ctaText: clean(ev.cta_text), ctaUrl: String(ev.cta_url || ''), storyIds: (ev.story_ids || []).map(Number), block: JSON.parse(JSON.stringify(ev.block || {}).replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ' - ')), startsAt: ev.starts_at, endsAt: ev.ends_at } : null;
  const stories = (data || []).map((s: Any) => {
    const src = (Array.isArray(s.sources) ? s.sources : []).filter((x: Any) => x.trust === 'official').map((x: Any) => ({ name: clean(x.name).replace(/\s*-\s*ערוץ טלגרם( רשמי)?$/, ''), url: String(x.url || '') }));
    return {
      id: s.id, section: s.section || null, title: clean(s.title), dek: clean(s.dek), body: arr(s.body), keyPoints: arr(s.key_points), faq: faq(s.faq),
      places: arr(s.places), date: s.created_at, publishedAt: s.published_at, updatedAt: /^עודכן/.test(String(s.pub_note || '')) ? s.updated_at : null,
      sourceName: src[0]?.name || '', sourceUrl: src[0]?.url || '', sources: src,
      kicker: kick(s.kicker), kind: s.kind === 'opinion' ? 'opinion' : 'news', author: clean(s.author), authorRole: clean(s.author_role), video: s.video_url || '',
      closure: s.closure && typeof s.closure === 'object' ? { place: clean(s.closure.place), what: clean(s.closure.what), until: String(s.closure.until || ''), approx: !!s.closure.approx } : null,
      image: s.image_url ? { url: s.image_url, alt: clean(s.image_alt), model: s.image_model || '', ai: true } : null,
    };
  });
  const [fl, cal] = await Promise.all([flashes(), calendar()]);
  return new Response(JSON.stringify({ ok: true, generated: new Date().toISOString(), count: stories.length, stories, event, flashes: fl, calendar: cal }), { headers: H });
});
