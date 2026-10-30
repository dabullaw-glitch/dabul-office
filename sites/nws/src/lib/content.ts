import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '../data/site';
import { LANG_PREFIX } from '../data/site';
import { SECTIONS, SECTION_BY_KEY, NAV_ORDER, CORE_SECTIONS, type SectionKey } from '../data/sections';
import { PLACES, PLACE_BY_HE } from '../data/places';
// @ts-ignore a plain JS module, shared with the daily self check (scripts/imgcheck.mjs)
import { topicOf, whereOf, checkPick, setsOf, TOPIC_BY_KEY, SECTION_NEUTRAL, OUTSIDE } from './imgtopics.mjs';

export interface Article {
  slug: string; section: SectionKey; title: string; dek: string; body: string[]; keyPoints: string[]; whatItMeans: string;
  faq: [string, string][]; neighborhoods: string[]; tags: string[]; published: string; updated?: string;
  sourceName: string; sourceUrl: string; imageHint: string; event?: { name: string; startDate: string; location: string } | null;
  expires?: string; og?: string; engineId?: number;
  // card fields (28.10.2026 redesign): colored line above the title, opinion/video badges, road closure details, AI illustration
  kicker?: string; kind?: 'news' | 'opinion' | 'sponsored'; author?: string; authorRole?: string; video?: string;
  closure?: { place: string; what: string; until: string; approx: boolean } | null;
  ai?: AiImg | null;
  // live updates of a developing story (hns-feed v7): oldest first; live while the last update is less than 6 hours old
  updates?: { at: string; text: string }[]; live?: boolean;
  // fields other engine functions add (hns-feed v8 "extras"): background links from our archive and a "מה עושים" service box
  extras?: Extras | null;
  format?: StoryFormat; formatData?: any;
  /** 29.10.2026: true when the engine marked the story as urgent news for the flashes (hns-feed isFlash) */
  flash?: boolean;
  /** 29.10.2026: a fixed recurring piece (Shabbat times, weather, weekend guide, day summary); never the home page lead */
  routine?: boolean;
  // the story's sources as shown in the "מקורות" line (see sourcesOf): official bodies, and media only when the body credits them
  sources?: Source[];
  // 29.10.2026 (management panel): the photo credit given by hand (extras.image_credit), and the links of a sponsored article (extras.links)
  imageCredit?: string; links?: { text: string; url: string }[];
  /** 29.10.2026 (opinion columns): the columnist's public profile (hns-feed extras.writer); the byline links to the writer's page */
  writer?: Writer | null;
}
export interface Writer { id: number; slug: string; name: string; role: string; bio: string; photo: string }
const writerOf = (s: any): Writer | null => {
  const w = s?.kind === 'opinion' ? s?.extras?.writer : null;
  const id = Number(w?.id);
  if (!w || !Number.isInteger(id) || id <= 0 || !clean(w.name)) return null;
  return { id, slug: `w${id}`, name: clean(w.name), role: clean(w.role), bio: clean(w.bio), photo: /^https:\/\/[^\s"<>]+$/.test(String(w.photo || '')) ? String(w.photo) : '' };
};
export interface Source { name: string; url: string; trust: 'official' | 'media' }
/** The "מקורות" line (Yakir, 28.10.2026): official bodies by name; a media outlet only when the story carries its credit line
 *  (a body paragraph "קרדיט: ..." naming it, written by hns-write); never fan, community or tip channels, and never our own desk.
 *  hns-feed sends only official sources today (without a trust field), so a missing trust counts as official. */
function sourcesOf(list: unknown, body: string[]): Source[] {
  const credit = body.filter((p) => /^קרדיט:/.test(p.trim())).join(' ');
  const out = new Map<string, Source>();
  for (const x of Array.isArray(list) ? list : []) {
    const name = clean((x as any)?.name ?? (x as any)?.name_he).replace(/\s*-\s*(ערוץ|עמוד|דף|חשבון)\s+\S+(\s+ה?רשמי)?$/, '');
    const trust = String((x as any)?.trust ?? 'official');
    const url = safeUrl((x as any)?.url);
    if (!name || /^מערכת חדשות נתניה|^NWS$/.test(name) || (x as any)?.id === 'nws_desk') continue;
    if (trust === 'official') { if (!out.has(name)) out.set(name, { name, url: /^https?:/.test(url) ? url : '', trust: 'official' }); }
    else if (trust === 'media' && credit && credit.includes(name)) { if (!out.has(name)) out.set(name, { name, url: /^https?:/.test(url) ? url : '', trust: 'media' }); }
  }
  return [...out.values()].slice(0, 5);
}
export interface Extras {
  related: { title: string; url: string }[];
  service: { title: string; lines: string[]; link: { text: string; url: string } | null; source: string } | null;
  // our earlier stories as background (hns-enrich context_ids, up to 3), resolved to links on the story page
  contextIds: number[];
}
const safeUrl = (u: unknown) => { const x = String(u ?? '').trim(); return /^https?:\/\/[^\s"<>]+$/.test(x) || /^\/[^\s"<>]*$/.test(x) ? x.replace(/^https?:\/\/(www\.)?nws\.co\.il(?=\/)/, '') : ''; };
/** extras of hns-feed v8, checked and trimmed (tolerant of small shape differences); null when there is nothing to show.
 *  Two shapes: s.extras {related, service}, and the separate fields of hns-enrich: contextIds (number[]) and serviceBox
 *  {key, title, lines[], link{text,url}, source} (camelCase or snake_case). The separate fields win when both exist. */
function extrasOf(s: any): Extras | null {
  const e0 = s?.extras && typeof s.extras === 'object' ? s.extras : {};
  const box = s?.serviceBox ?? s?.service_box;
  const e = { ...e0, ...(box && typeof box === 'object' ? { service: box } : {}) };
  const contextIds = [...new Set((s?.contextIds ?? s?.context_ids ?? e0.contextIds ?? []) as any[])].map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 3);
  const related = (Array.isArray(e.related) ? e.related : []).map((r: any) => ({ title: clean(r?.title ?? r?.text), url: safeUrl(r?.url ?? r?.href) }))
    .filter((r: any) => r.title && r.url).slice(0, 6);
  const sv = e.service && typeof e.service === 'object' ? e.service : null;
  let service: Extras['service'] = null;
  if (sv) {
    const lines = (Array.isArray(sv.lines) ? sv.lines : sv.text ? [sv.text] : []).map(clean).filter(Boolean).slice(0, 8);
    const lk = sv.link && typeof sv.link === 'object' ? { text: clean(sv.link.text ?? sv.link.title), url: safeUrl(sv.link.url ?? sv.link.href) }
      : sv.url ? { text: clean(sv.linkText ?? sv.link_text ?? ''), url: safeUrl(sv.url) } : null;
    const link = lk && lk.url ? { text: lk.text || '', url: lk.url } : null;
    if (lines.length || link) service = { title: clean(sv.title) || '', lines, link, source: clean(sv.source ?? sv.source_name) };
  }
  return related.length || service || contextIds.length ? { related, service, contextIds } : null;
}
// recurring formats of hns-recurring (Maccabi Netanya preview and report, the week's roundup, the weekend guide, council and
// planning summaries). formatData is passed on checked: match {opponent, home, kickoff, venue, round, competition, table, previous,
// lastMeeting, stage, score?{netanya, opponent}} (scores of previous and lastMeeting are [home, away]); week {links:[{id, section,
// title, line}]}; weekend {from, to, events:[{title, start, venue, url, source, line}]}.
export type StoryFormat = 'match_preview' | 'match_report' | 'week_roundup' | 'weekend_guide' | 'council_summary' | 'planning_summary';
const FORMATS: StoryFormat[] = ['match_preview', 'match_report', 'week_roundup', 'weekend_guide', 'council_summary', 'planning_summary'];
function formatOf(s: any): { format?: StoryFormat; formatData?: any } {
  const f = String(s?.format ?? '') as StoryFormat;
  if (!FORMATS.includes(f)) return {};
  const d = s?.formatData ?? s?.format_data;
  return { format: f, formatData: d && typeof d === 'object' ? d : null };
}
export interface AiImg { alt: string; files?: { src: string; w: number }[]; remote?: string; w: number; h: number; model: string;
  /** 29.10.2026 (Google News and Discover): 16:9, 4:3 and 1:1 crops, 1200 wide where the original allows (scripts/img.mjs) */
  crops?: { src: string; w: number; h: number }[] }

const DATA = path.resolve('src/data');
const readJson = (f: string, d: any) => { try { return JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf8')); } catch { return d; } };

const normFaq = (f: any): [string, string][] => (Array.isArray(f) ? f : []).map((x: any) => Array.isArray(x) ? [x[0], x[1]] : [x.q ?? x.question, x.a ?? x.answer]).filter((x: any) => x[0] && x[1]);

// Hand-written articles (articles.json) plus the stories the news engine published (feed.json, fetched by scripts/feed.mjs
// before every build from the Supabase function hns-feed). An article whose event already took place, or whose
// "expires" time has passed, is left out. If the feed is missing or empty the site builds from what remains.
const clean = (s: unknown) => String(s ?? '').replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ' - ').trim();
const PLACE_ALIAS: Record<string, string> = { 'קדימה': 'קדימה צורן', 'צורן': 'קדימה צורן', 'קדימה-צורן': 'קדימה צורן', 'קרית השרון': 'קריית השרון' };
const ilToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const live = (a: any) => {
  if (a.expires && Date.parse(a.expires) < Date.now()) return false;
  const d = a.event?.startDate ? String(a.event.startDate).slice(0, 10) : '';
  return !d || d >= ilToday;
};
// AI illustrations made small by scripts/img.mjs (story id -> WebP files), or the original address when that failed
const AIMAP: Record<string, any> = readJson('aiimg.json', {});
function aiOf(s: any): AiImg | null {
  const im = s.image; if (!im?.url) return null;
  const m = AIMAP[s.id];
  const lucid = im.model === 'lucid';
  const alt = clean(im.alt) || (im.model ? 'תמונה להמחשה' : '');
  if (m?.files?.length) return { alt, files: m.files, w: m.w, h: m.h, model: im.model || '', ...(m.crops?.length ? { crops: m.crops } : {}) };
  return { alt, remote: m?.remote || im.url, w: lucid ? 1280 : 1024, h: lucid ? 720 : 1024, model: im.model || '' };
}
function fromFeed(s: any): any {
  const section = SECTION_BY_KEY[s.section as SectionKey] ? s.section : 'flash';
  const places = [...new Set((s.places || []).map((p: string) => PLACE_ALIAS[p] || p).filter((p: string) => PLACE_BY_HE[p]))];
  return {
    slug: `n${s.id}`, engineId: s.id, section, title: clean(s.title), dek: clean(s.dek), body: (s.body || []).map(clean).filter(Boolean),
    keyPoints: (s.keyPoints || []).map(clean).filter(Boolean), whatItMeans: '', faq: s.faq || [], neighborhoods: places, tags: [],
    published: new Date(s.date || s.publishedAt).toISOString(), ...(s.updatedAt ? { updated: s.updatedAt } : {}), sourceName: clean(s.sourceName), sourceUrl: s.sourceUrl || '', imageHint: '', event: null,
    kicker: clean(s.kicker), kind: s.kind === 'opinion' ? 'opinion' : s.kind === 'sponsored' ? 'sponsored' : 'news', author: clean(s.author), authorRole: clean(s.authorRole), video: s.video || '',
    closure: s.closure && s.closure.place ? { place: clean(s.closure.place), what: clean(s.closure.what), until: String(s.closure.until || ''), approx: !!s.closure.approx } : null,
    ai: aiOf(s),
    updates: (Array.isArray(s.updates) ? s.updates : []).filter((x: any) => x && x.at && x.text).map((x: any) => ({ at: new Date(x.at).toISOString(), text: clean(x.text) })),
    extras: extrasOf(s),
    ...formatOf(s),
    flash: s?.flash === true,
    routine: s?.routine === true,
    sources: sourcesOf(s.sources, (s.body || []).map(clean)),
    imageCredit: clean(s.extras?.image_credit).slice(0, 80),
    writer: writerOf(s),
    links: (Array.isArray(s.extras?.links) ? s.extras.links : []).map((l: any) => ({ text: clean(l?.text), url: safeUrl(l?.url) })).filter((l: any) => l.text && l.url).slice(0, 6),
    live: !!s.live && Array.isArray(s.updates) && s.updates.length > 0 && Date.now() - Date.parse(s.updates[s.updates.length - 1].at) < 6 * 3600e3,
  };
}
const FEED_JSON: any = readJson('feed.json', { stories: [] });
// 29.10.2026: live service data the engine keeps (hns-feed 'live': the duty pharmacy and more), for the /now/ pages
export const SERVICES: any = FEED_JSON.live || {};
const FEED: any[] = (FEED_JSON.stories || []).filter((s: any) => s && s.id && s.title && (s.body || []).length).map(fromFeed);
// social card: a hand made card (public/og/a), else the story's own image, else its section photo (1200x630 JPEG)
const ogFor = (a: any) => fs.existsSync(path.resolve('public/og/a', `${a.slug}.png`)) ? `/og/a/${a.slug}.png`
  : a.ai?.crops?.length ? a.ai.crops[0].src : a.ai?.files?.length ? a.ai.files[a.ai.files.length - 1].src : `/img/stock/og/${stockFor(a.section, a.engineId ?? a.slug)}.jpg`;

export const ARTICLES: Article[] = [...(readJson('articles.json', { articles: [] }).articles as any[]), ...FEED]
  .filter((a) => a && a.slug && SECTION_BY_KEY[a.section as SectionKey] && live(a))
  .map((a) => ({ ...a, sources: a.sources ?? (a.sourceName ? [{ name: a.sourceName, url: a.sourceUrl || '', trust: 'official' }] : []), published: new Date(a.published).toISOString(), ...(a.updated ? { updated: new Date(a.updated).toISOString() } : {}), faq: normFaq(a.faq), neighborhoods: a.neighborhoods || [], tags: a.tags || [], keyPoints: a.keyPoints || [], body: a.body || [], og: ogFor(a) }))
  .sort((x, y) => (Date.parse(y.published) || 0) - (Date.parse(x.published) || 0));

/** 29.10.2026: the columnists who have at least one published column, each with their columns (newest first). Page /writers/w<id>/. */
export const WRITERS: (Writer & { columns: Article[] })[] = [...new Map(ARTICLES.filter((a) => a.writer).map((a) => [a.writer!.id, a.writer!])).values()]
  .map((w) => ({ ...w, columns: ARTICLES.filter((a) => a.writer?.id === w.id) }));
export const writerUrl = (w: Pick<Writer, 'slug'>) => `/writers/${w.slug}/`;

export const TR: Record<string, Record<string, Partial<Article>>> = {
  ru: readJson('tr/ru.json', {}), fr: readJson('tr/fr.json', {}), en: readJson('tr/en.json', {}),
};
const F0: any = readJson('facts.json', {});
export const FACTS: any = {
  ...F0,
  hotline: { number: F0?.municipalHotline?.number ?? '106', website: F0?.officialWebsite?.url ?? null },
  officialWebsite: F0?.officialWebsite?.url ?? null,
  beaches: { list: F0?.bathingBeaches?.names ?? [], source: F0?.bathingBeaches?.source ?? null, season: F0?.bathingBeaches?.seasonHours, winter: F0?.bathingBeaches?.winterHours, winter2026: F0?.bathingBeaches?.winter2026, accessible: F0?.bathingBeaches?.accessibleBeach },
  dutyPharmacy: { sourceUrl: F0?.dutyPharmacy?.officialSource ?? null },
};

export function localized(a: Article, lang: Lang): Article | null {
  if (lang === 'he') return a;
  const t = TR[lang]?.[a.slug];
  if (!t || !t.title) return null;
  return { ...a, ...t, faq: normFaq((t as any).faq ?? []) } as Article;
}
export const articlesFor = (lang: Lang) => ARTICLES.map((a) => localized(a, lang)).filter(Boolean) as Article[];

export const sectionUrl = (key: SectionKey, lang: Lang = 'he') => `${LANG_PREFIX[lang]}/${SECTION_BY_KEY[key].slug}/`;
export const articleUrl = (a: Pick<Article, 'section' | 'slug'>, lang: Lang = 'he') => `${LANG_PREFIX[lang]}/${SECTION_BY_KEY[a.section].slug}/${a.slug}/`;
export const placeUrl = (slug: string, lang: Lang = 'he') => `${LANG_PREFIX[lang]}/area/${slug}/`;

const TZ = 'Asia/Jerusalem';
const LOC: Record<Lang, string> = { he: 'he-IL', ru: 'ru-RU', fr: 'fr-FR', en: 'en-GB' };
/** 29.10.2026 (Google News): an ISO time with the Israel offset (2026-10-29T11:53:54+02:00) for the structured data, the article
 *  meta tags, the news sitemap and <time datetime>; the stored times stay in UTC. Anything that is not a date is returned as is. */
export const isoIL = (iso: string) => {
  const d = new Date(iso); if (!iso || isNaN(+d)) return iso;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((x) => [x.type, x.value]));
  const local = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const off = Math.round((local - Math.floor(+d / 1000) * 1000) / 60000); const ab = Math.abs(off);
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}${off < 0 ? '-' : '+'}${String(Math.floor(ab / 60)).padStart(2, '0')}:${String(ab % 60).padStart(2, '0')}`;
};
export const fmtTime = (iso: string) => new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
export const fmtDate = (iso: string, lang: Lang = 'he') => new Intl.DateTimeFormat(LOC[lang], { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
export const fmtShort = (iso: string) => new Intl.DateTimeFormat('he-IL', { timeZone: TZ, day: '2-digit', month: '2-digit' }).format(new Date(iso));

/** places mentioned in an article: its neighborhoods field plus any place name found in its text */
export function placesOf(a: Article) {
  const text = [a.title, a.dek, ...a.body].join(' ');
  const set = new Map<string, (typeof PLACES)[number]>();
  for (const n of a.neighborhoods) { const p = PLACE_BY_HE[n]; if (p) set.set(p.slug, p); }
  for (const p of PLACES) if (text.includes(p.he)) set.set(p.slug, p);
  return [...set.values()];
}

/** escape + automatic internal links: the first mention of up to 3 places links to their hub page */
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function linkify(paras: string[], places: (typeof PLACES)[number][], lang: Lang = 'he'): string[] {
  const used = new Set<string>(); let n = 0;
  return paras.map((p) => {
    let h = esc(p);
    if (lang === 'he') for (const pl of places) {
      if (n >= 3 || used.has(pl.slug)) continue;
      const i = h.indexOf(pl.he);
      if (i >= 0) { h = h.slice(0, i) + `<a href="${placeUrl(pl.slug)}">${pl.he}</a>` + h.slice(i + pl.he.length); used.add(pl.slug); n++; }
    }
    return h;
  });
}

export function related(a: Article, pool: Article[], k = 3) {
  const pl = new Set(placesOf(a).map((p) => p.slug));
  return pool.filter((x) => x.slug !== a.slug)
    .map((x) => ({ x, s: (x.section === a.section ? 2 : 0) + placesOf(x).filter((p) => pl.has(p.slug)).length + x.tags.filter((t) => a.tags.includes(t)).length }))
    .sort((p, q) => q.s - p.s || (q.x.published || '').localeCompare(p.x.published || '')).slice(0, k).map((r) => r.x);
}

// ---------- home page and cards (redesign approved 28.10.2026) ----------
export interface SiteEvent {
  id: number; kind: 'elections' | 'storm' | 'holiday' | 'emergency' | 'other'; title: string; tag: string; stat1: string; stat1Label: string; stat2: string; stat2Label: string;
  ctaText: string; ctaUrl: string; storyIds: number[]; endsAt: string | null;
  block: { kicker?: string; headline?: string; text?: string; bar?: { pct: number; left?: string; right?: string }; source?: string };
}
// the active event (table hns_event through hns-feed), or null. An event that already ended is dropped at build time too.
const ev0: any = FEED_JSON.event;
export const EVENT: SiteEvent | null = ev0 && ev0.title && (!ev0.endsAt || Date.parse(ev0.endsAt) > Date.now()) ? {
  ...ev0, title: clean(ev0.title), tag: clean(ev0.tag), stat1: clean(ev0.stat1), stat1Label: clean(ev0.stat1Label), stat2: clean(ev0.stat2), stat2Label: clean(ev0.stat2Label),
  ctaText: clean(ev0.ctaText), ctaUrl: String(ev0.ctaUrl || ''), storyIds: (ev0.storyIds || []).map(Number), block: ev0.block || {},
} : null;
// 28.10.2026: official flashes (Home Front Command, MDA, IMS warnings, police) and the events calendar, from hns-feed.
// A flash older than its ttl (hours) is dropped at build time; the browser drops it too and refreshes the list every minute.
export interface Flash { id: number | string; at: string; text: string; source: string; url: string; kind: string; ttl: number }
export const FLASHES: Flash[] = (FEED_JSON.flashes || []).map((f: any) => ({ ...f, text: clean(f.text) }))
  .filter((f: Flash) => f.text && Date.now() - Date.parse(f.at) < (Number(f.ttl) || 12) * 3600e3);
export interface CalItem { id: number; title: string; start: string; venue: string; url: string; source: string }
export const CALENDAR: CalItem[] = (FEED_JSON.calendar || []).map((c: any) => ({ ...c, title: clean(c.title), venue: clean(c.venue) }))
  .filter((c: CalItem) => c.title && Date.parse(c.start) > Date.now() - 3 * 3600e3);
/** time of a calendar item, or '' when the listing gave only a date (stored as 00:00) */
export const calTime = (iso: string) => { const t = fmtTime(iso); return t === '00:00' ? '' : t; };
export const calVenue = (c: CalItem) => c.venue.replace(/^היכל התרבות העירוני נתניה\s*-\s*/, '');
// sea and weather snapshot (scripts/live.mjs, Open-Meteo); the browser refreshes it
// weather and sea of the Israel Meteorological Service (scripts/ims.mjs) and Maccabi Netanya data (scripts/sport.mjs), saved before every build
export interface Ims { ok: boolean; fetchedAt?: string; day?: { date: string; min: number | null; max: number | null; code: number | null; desc: string } | null;
  now?: { hour: number; temp: number | null; wave: number | null; code: number | null; desc: string; rain?: number | null } | null; sea?: { waveMin: number; waveMax: number; temp: number | null; from: string; to: string } | null;
  hours?: { hour: number; temp: number | null; rain: number | null; wave: number | null; desc: string }[]; days?: { date: string; min: number | null; max: number | null; code: number | null; desc: string }[];
  seaNext?: { waveMin: number; waveMax: number; temp: number | null; from: string; to: string }[] }
export const IMS: Ims = readJson('ims.json', { ok: false });
export interface SportRow { pos: number; team: string; played: number; w: number; d: number; l: number; gf: number | null; ga: number | null; diff: number; pts: number; me: boolean }
export interface Sport { ok: boolean; fetchedAt?: string; tableAt?: string; source: string; sourceUrl: string; league: string; round: number | null; table: SportRow[]; notes: string[];
  next: { home: boolean; opponent: string; date: string; time: string; iso: string; venue: string; round: number | null } | null;
  last: { home: boolean; opponent: string; date: string; my: number; their: number; round: number } | null }
const SP0: Sport = readJson('sport.json', { ok: false, source: '', sourceUrl: '', league: '', round: null, table: [], notes: [], next: null, last: null });
// a table older than 10 days is not shown; the next game is shown until 3 hours after kickoff
export const SPORT: Sport = { ...SP0, table: SP0.tableAt && Date.now() - Date.parse(SP0.tableAt) < 10 * 864e5 ? SP0.table || [] : [],
  next: SP0.next && Date.parse(SP0.next.iso) > Date.now() - 3 * 3600e3 ? SP0.next : null };
/** the rows of the table around Maccabi Netanya (n rows) */
export function tableAround(n = 3) {
  const t = SPORT.table; const i = t.findIndex((r) => r.me); if (i < 0) return [];
  const s = Math.max(0, Math.min(t.length - n, i - Math.floor(n / 2))); return t.slice(s, s + n);
}
/** sections that have a page and a place in the menu: the core ones always, the new ones from their first story */
export const liveSections = () => SECTIONS.filter((s) => CORE_SECTIONS.includes(s.key) || ARTICLES.some((a) => a.section === s.key));
export const navSections = () => NAV_ORDER.map((k) => SECTION_BY_KEY[k]).filter((s) => CORE_SECTIONS.includes(s.key) || ARTICLES.some((a) => a.section === s.key));

export const LIVE: { ok: boolean; at?: string; wave?: number | null; sst?: number | null; temp?: number | null; wind?: number | null; code?: number | null } = readJson('live.json', { ok: false });

/** the home page lead pinned in the management panel (hns-feed "pin" {id, until}), while its time has not passed */
const PIN: { id: number; until: string | null } | null = FEED_JSON.pin && Number(FEED_JSON.pin.id) && (!FEED_JSON.pin.until || Date.parse(FEED_JSON.pin.until) > Date.now())
  ? { id: Number(FEED_JSON.pin.id), until: FEED_JSON.pin.until || null } : null;
/** the home page lead: newest story of the last 72 hours that is not a flash item, not an opinion and not in the event block.
 *  The same rule is in the Supabase function hns-img (the lead gets the better AI image). */
export function leadOf(all: Article[], ev: SiteEvent | null = EVENT) {
  const evSlugs = new Set((ev?.storyIds || []).map((id) => `n${id}`));
  // 29.10.2026: a story pinned in the management panel leads until its time passes (Yakir's choice, also a national one; never sponsored)
  const pinned = PIN ? all.find((a) => a.slug === `n${PIN.id}` && a.kind !== 'sponsored') : undefined;
  if (pinned) return pinned;
  // 29.10.2026: national stories (section 'national') get their own column and never take the local lead
  // 29.10.2026 (Yakir): fixed recurring pieces (Shabbat times, weather, weekend guide...) never lead either
  const pool = all.filter((a) => !evSlugs.has(a.slug) && a.kind !== 'sponsored' && a.section !== 'national' && !a.routine);
  const fresh = pool.filter((a) => Date.now() - Date.parse(a.published) < 72 * 3600e3);
  return fresh.find((a) => a.section !== 'flash' && a.kind !== 'opinion') ?? pool.find((a) => a.section !== 'flash' && a.kind !== 'opinion') ?? pool[0] ?? all[0];
}
/** reading time in minutes (about 200 words a minute) */
/** paid or marketing content: labelled "תוכן שיווקי", never in the lead, the ticker, the live feed or the Google News sitemap */
export const isSponsored = (a: Pick<Article, 'kind'>) => a.kind === 'sponsored';
export const readMin = (a: Article) => Math.max(1, Math.round([a.title, a.dek, ...a.body].join(' ').split(/\s+/).length / 200));
/** the colored line above the title: the writer's short phrase, or the section name */
export const kickerOf = (a: Article, lang: Lang = 'he') => (lang === 'he' && a.kicker) || SECTION_BY_KEY[a.section].name[lang];
/** short date for a static fallback (the browser replaces it with "לפני X") */
export const fmtDay = (iso: string, lang: Lang = 'he') => new Intl.DateTimeFormat(LOC[lang], { timeZone: TZ, day: 'numeric', month: 'long' }).format(new Date(iso));
/** the picture of a story (28.10.2026 redesign, never a flat drawing): 1. the story's own image: an AI illustration (image_model set)
 *  is labelled "תמונה להמחשה"; a real photo is labelled "צילום" (with the source name when known), and on a sponsored story
 *  "צילום: באדיבות המפרסם"; 2. a photo from the section photo library (public/img/stock, labelled "צילום אילוסטרציה"), picked by
 *  the story id so neighbouring stories get different photos.
 *  ai: true only for an AI generated image; own: the story's own image (AI or real); kind: which label applies (see picLabel). */
export type PicKind = 'ai' | 'photo' | 'sponsor' | 'stock' | 'lib';
export interface Pic { src: string; srcset?: string; small: string; /** a 400px file for small thumbnails, when there is one */ thumb?: string; alt: string; w: number; h: number; ai: boolean; own: boolean; stock: boolean; kind: PicKind; credit: string; label: string; og: string;
  /** the large images for the structured data (16:9, 4:3, 1:1) and the size of the og image when known */
  ld?: { src: string; w: number; h: number }[]; ogW?: number; ogH?: number;
  /** 30.10.2026: a photo of the Commons photo library (kind 'lib'): its author, source page, license and license page, for the credit */
  lib?: { author: string; page: string; license: string; licenseUrl: string } }
/** the license name in a credit: Hebrew for public domain */
export const licName = (l: string, lang: Lang = 'he') => (/public domain|^pd/i.test(l) ? (lang === 'he' ? 'נחלת הכלל' : 'Public domain') : /^attribution$/i.test(l) ? (lang === 'he' ? 'ייחוס' : 'Attribution') : l);
export const COMMONS: Record<Lang, string> = { he: 'ויקישיתוף', ru: 'Викисклад', fr: 'Wikimedia Commons', en: 'Wikimedia Commons' };
/** the picture label in the page language */
export function picLabel(p: Pic, lang: Lang = 'he') {
  const L: Record<Exclude<PicKind, 'lib'>, Record<Lang, string>> = {
    ai: { he: 'תמונה להמחשה', ru: 'Иллюстрация ИИ', fr: 'Illustration IA', en: 'AI illustration' },
    photo: { he: 'צילום', ru: 'Фото', fr: 'Photo', en: 'Photo' },
    sponsor: { he: 'צילום: באדיבות המפרסם', ru: 'Фото предоставлено рекламодателем', fr: 'Photo : avec l’aimable autorisation de l’annonceur', en: 'Photo courtesy of the advertiser' },
    stock: { he: 'צילום אילוסטרציה', ru: 'Иллюстративное фото', fr: 'Photo d’illustration', en: 'Illustrative photo' },
  };
  // a library photo: still "צילום אילוסטרציה", with its author and the source (the full credit with the license is under the photo
  // on the story page, see ArticlePage)
  if (p.kind === 'lib' && p.lib) return `${L.stock[lang]}: ${p.lib.author} / ${COMMONS[lang]}`;
  return (p.kind === 'photo' || p.kind === 'sponsor') && p.credit ? `${L.photo[lang]}: ${p.credit}` : L[p.kind === 'lib' ? 'stock' : p.kind][lang];
}
function hashOf(s: string) { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }
// the 1:1 crop of the library photos is 1200 wide, except two whose original is not tall enough (public/img/stock/x)
const STOCK_SQ: Record<string, number> = { 'police-lights': 980, 'police-street': 1012 };
const stockLd = (name: string) => [{ src: `/img/stock/x/${name}-16x9.jpg`, w: 1200, h: 675 }, { src: `/img/stock/x/${name}-4x3.jpg`, w: 1200, h: 900 },
  { src: `/img/stock/x/${name}-1x1.jpg`, w: STOCK_SQ[name] ?? 1200, h: STOCK_SQ[name] ?? 1200 }];
export function stockPic(name: string, alt = ''): Pic {
  return { ld: stockLd(name), ogW: 1200, ogH: 630, src: `/img/stock/${name}-1600.webp`, srcset: `/img/stock/${name}-800.webp 800w, /img/stock/${name}-1600.webp 1600w`,
    small: `/img/stock/${name}-800.webp`, alt, w: 1600, h: 1067, ai: false, own: false, stock: true, kind: 'stock', credit: '', label: 'צילום אילוסטרציה', og: `/img/stock/og/${name}.jpg` };
}
export function stockFor(key: SectionKey, seed: string | number) {
  const ph = SECTION_BY_KEY[key].photos;
  const n = typeof seed === 'number' ? seed : Number(String(seed).replace(/\D/g, '')) || hashOf(String(seed));
  return ph[n % ph.length];
}
export function picOf(a: Article, _IMGS?: unknown): Pic {
  const ai = a.ai;
  if (ai) {
    const files = ai.files || [];
    const src = files.length ? files[files.length - 1].src : ai.remote!;
    // 29.10.2026: an AI illustration is always labelled as one (also on a sponsored story); a credit given in the panel wins
    const kind: PicKind = ai.model ? 'ai' : a.kind === 'sponsored' ? 'sponsor' : 'photo';
    const credit = kind === 'photo' ? a.imageCredit || a.sourceName || '' : kind === 'sponsor' ? a.imageCredit || '' : '';
    const p: Pic = { src, srcset: files.length > 1 ? files.map((f) => `${f.src} ${f.w}w`).join(', ') : undefined,
      small: files.length ? files[0].src : ai.remote!, alt: ai.alt, w: ai.w, h: ai.h, ai: kind === 'ai', own: true, stock: false, kind, credit, label: '', og: ai.crops?.length ? ai.crops[0].src : src,
      ...(ai.crops?.length ? { ld: ai.crops, ogW: ai.crops[0].w, ogH: ai.crops[0].h } : files.length ? { ogW: ai.w, ogH: ai.h } : {}) };
    p.label = picLabel(p);
    return p;
  }
  const pk = IMG_PICK.get(a.slug);
  return pk?.lib ? libPic(pk.lib) : stockPic(pk?.stock || stockFor(a.section, a.engineId ?? a.slug));
}

// ---------------------------------------------------------------- the photo library (30.10.2026)
// Yakir approved: a story with no image of its own gets a real photo of Netanya or the Sharon from our Commons photo library
// (scripts/photolib/harvest.mjs; the build copies it to public/img/lib and src/data/photolib.json, see scripts/loop.sh) instead of
// one of the ~20 fixed stock photos. An AI image or a photo of the story itself always wins; sponsored stories keep the stock photo.
// The pick: the topic first (see IMG_PICK below); photos of a place only for place topics. Stories are picked oldest first, so a
// new story never changes the photo of an older one. Without the library the stock photos stay.
interface LibPhoto { id: string; page: string; author: string; license: string; licenseUrl: string; alt: string; places: string[]; topics: string[]; sq: number; set?: string }
// photos removed after the visual review never show, even before the library branch is rebuilt without them
const LIB_REJECT = new Set((() => { try { return fs.readFileSync(path.resolve('scripts/photolib/reject.txt'), 'utf8'); } catch { return ''; } })()
  .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map((n) => `c${n}`));
// a topic illustration shows only after it passed the visual review (src/data/photolib-ok.txt, Commons page ids)
// a line "<id> <role>" marks a place photo checked by eye for a role (realestate: it shows housing); the role is added to its
// topics as "pick:<role>" (imgtopics.mjs placeTopics)
const OK_LINES = (() => { try { return fs.readFileSync(path.resolve('src/data/photolib-ok.txt'), 'utf8'); } catch { return ''; } })()
  .split('\n').map((l) => l.replace(/#.*/, '').trim().split(/\s+/)).filter((x) => x[0]);
const TOPIC_OK = new Set(OK_LINES.filter((x) => !x[1]).map((x) => `c${x[0]}`));
const ROLE = new Map<string, string[]>();
for (const [id, role] of OK_LINES) if (role) ROLE.set(`c${id}`, [...(ROLE.get(`c${id}`) || []), `pick:${role}`]);
const LIB: LibPhoto[] = ((readJson('photolib.json', { photos: [] }).photos || []) as LibPhoto[])
  .filter((p) => p && /^c\d+$/.test(p.id) && !LIB_REJECT.has(p.id) && (!p.set || TOPIC_OK.has(p.id)) && p.page && p.author && p.license && fs.existsSync(path.resolve('public/img/lib', `${p.id}-1600.webp`)))
  .map((p) => (ROLE.has(p.id) ? { ...p, topics: [...p.topics, ...ROLE.get(p.id)!] } : p));
function libPic(p: LibPhoto): Pic {
  const b = `/img/lib/${p.id}`;
  // 30.10.2026: the 400px file (phone thumbnails), when the library already has it
  const s4 = fs.existsSync(path.resolve('public/img/lib', `${p.id}-400.webp`));
  // and the 1200px file (the lead photo on phones: a 1600px file is about twice as heavy)
  const s12 = fs.existsSync(path.resolve('public/img/lib', `${p.id}-1200.webp`));
  const pic: Pic = { ld: [{ src: `${b}-16x9.jpg`, w: 1200, h: 675 }, { src: `${b}-1x1.jpg`, w: p.sq || 1080, h: p.sq || 1080 }], ogW: 1200, ogH: 675,
    src: `${b}-1600.webp`, srcset: `${s4 ? `${b}-400.webp 400w, ` : ''}${b}-800.webp 800w, ${s12 ? `${b}-1200.webp 1200w, ` : ''}${b}-1600.webp 1600w`, small: `${b}-800.webp`, thumb: s4 ? `${b}-400.webp` : undefined, alt: p.alt, w: 1600, h: 1067, ai: false, own: false,
    stock: false, kind: 'lib', credit: `${p.author}, ${COMMONS.he}, ${licName(p.license)}`, label: '', og: `${b}-16x9.jpg`,
    lib: { author: p.author, page: p.page, license: p.license, licenseUrl: p.licenseUrl } };
  pic.label = picLabel(pic);
  return pic;
}
// 30.10.2026 (Yakir, after a museum photo on a weapons story and a landscape on a football story): the TOPIC comes first.
// topicOf (src/lib/imgtopics.mjs, shared with the daily self check scripts/imgcheck.mjs) reads the title, summary and first
// paragraphs. Crime, police, security, accidents, fire, health, courts, elections, economy, weather, sports, education, traffic,
// road works and transport stories get a topic illustration (a set of the library: police car, ambulance, ballot box, pitch...),
// never a place photo. A place photo only for a place topic (municipal, real estate, leisure, market, tourism, beach, parks), only
// when the story is really about that place (a named neighbourhood, or Netanya and no other locality), and only a photo that shows
// the topic (no nature photo for a municipal story). A story from another locality never gets a Netanya photo. An unclear topic
// (low confidence) gets the neutral illustration of its section, never a place photo. When a set is still empty: the generic
// stock photo of the topic. src/data/imgfix.json (written by the daily self check) forces the neutral pick for a story.
// No photo twice on the same day, fewer repeats within a week. This runs on every build, so every new story gets it at once.
interface PickInfo { lib?: LibPhoto; stock?: string; topic: string; conf: string; where: string; why: string }
export const IMG_PICK = new Map<string, PickInfo>();
const IMG_FIX: Record<string, any> = readJson('imgfix.json', { fixes: {} }).fixes || {};
export const NETANYA_PLACES = PLACES.filter((p) => p.kind === 'neighborhood').map((p) => p.he);
{
  const dayOf = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(iso));
  const usedDay = new Map<string, Set<string>>(); // day -> photos used that day
  const lastUse = new Map<string, number[]>(); // photo -> times it was used
  const bySet = new Map<string, LibPhoto[]>();
  for (const p of LIB) if (p.set) bySet.set(p.set, [...(bySet.get(p.set) || []), p]);
  const placePhotos = LIB.filter((p) => !p.set);
  const withLib = new Set(LIB.flatMap((p) => p.places));
  // neutral: no place photo at all (the topic illustration, else the section's neutral illustration, else stock)
  const pickFor = (a: Article, t: any, where: string, neutral: boolean, at: number, today: Set<string>) => {
    const T = t && t.conf === 'high' ? TOPIC_BY_KEY[t.key] : null;
    const head = [a.title, a.dek].join(' ');
    const named = new Set([...NETANYA_PLACES, ...OUTSIDE].filter((n) => withLib.has(n) && (head.includes(n) || a.neighborhoods.includes(n))));
    let pool: LibPhoto[] = []; let why = '';
    if (T && !T.hard && !neutral && where !== '') {
      // a place topic: photos of the named place (or of Netanya, for a Netanya story) that show the topic
      const fit = (p: LibPhoto) => p.topics.some((x) => (T.placeTopics || []).includes(x));
      const exact = placePhotos.filter((p) => fit(p) && p.places.some((pl) => pl !== 'נתניה' && named.has(pl)));
      pool = exact.length ? exact : where === 'netanya' ? placePhotos.filter((p) => fit(p) && p.places.includes('נתניה')) : [];
      why = exact.length ? 'place' : pool.length ? 'netanya' : '';
    }
    if (!pool.length && T) { pool = setsOf(T, a).flatMap((s: string) => bySet.get(s) || []); why = pool.length ? 'topic' : ''; }
    if (!pool.length && !T) { pool = (SECTION_NEUTRAL[a.section] || []).flatMap((s: string) => bySet.get(s) || []); why = pool.length ? 'neutral' : ''; }
    if (!pool.length) {
      // no library photo fits: the generic stock photo of the topic, or of the section (never a landmark)
      const n = a.engineId ?? hashOf(a.slug);
      return { stock: T ? T.stock[n % T.stock.length] : stockFor(a.section, n), why: T ? 'topic stock' : 'section stock' };
    }
    let best: LibPhoto | null = null; let bestS = -Infinity;
    for (const p of pool) {
      let s = today.has(p.id) ? -100 : 0;
      for (const pl of p.places) if (named.has(pl)) s += 10;
      s -= 4 * (lastUse.get(p.id) || []).filter((u) => at - u < 7 * 864e5).length;
      s += (hashOf(a.slug + p.id) % 1000) / 1e4; // a stable tie break
      if (s > bestS) { bestS = s; best = p; }
    }
    // every photo that fits was already used today (a small set): the generic stock photo of the topic, not the same photo twice
    if (bestS < -50 && T && T.hard) return { stock: T.stock[(a.engineId ?? hashOf(a.slug)) % T.stock.length], why: 'topic stock (set used up today)' };
    return { lib: best!, why };
  };
  for (const a of [...ARTICLES].reverse()) {
    if (a.ai || a.kind === 'sponsored') continue;
    const t = topicOf(a);
    const where = whereOf(a, NETANYA_PLACES);
    const day = dayOf(a.published); const at = Date.parse(a.published) || 0;
    const today = usedDay.get(day) || new Set<string>();
    const fixed = !!IMG_FIX[a.slug];
    let r: { lib?: LibPhoto; stock?: string; why: string } = pickFor(a, t, where, fixed, at, today);
    if (fixed) r.why += ' (self check fix)';
    // the guard: the same check as the daily self check; a pick that fails it becomes the neutral pick
    const bad = checkPick(a, r.lib ? r.lib : { stock: r.stock }, NETANYA_PLACES);
    if (bad && !fixed) { r = pickFor(a, t, where, true, at, today); r.why += ` (guard: ${bad})`; }
    IMG_PICK.set(a.slug, { ...r, topic: t?.key || '', conf: t?.conf || 'none', where });
    const og = r.lib ? `/img/lib/${r.lib.id}-16x9.jpg` : `/img/stock/og/${r.stock}.jpg`;
    // the social card follows the photo, unless the story has a hand made card or an image of its own
    if (!a.og || a.og.startsWith('/img/stock/og/') || a.og.startsWith('/img/lib/')) a.og = og;
    if (!r.lib) continue;
    today.add(r.lib.id); usedDay.set(day, today);
    lastUse.set(r.lib.id, [...(lastUse.get(r.lib.id) || []), at]);
  }
}
/** Hebrew numerals for the Hebrew date (י״ז, תשפ״ז) */
export function gematria(n: number) {
  const parts: string[] = [];
  let x = n;
  while (x >= 400) { parts.push('ת'); x -= 400; }
  const H = ['', 'ק', 'ר', 'ש']; const T = ['', 'י', 'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ']; const U = ['', 'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט'];
  if (x >= 100) { parts.push(H[Math.floor(x / 100)]); x %= 100; }
  if (x === 15) parts.push('טו'); else if (x === 16) parts.push('טז'); else { if (x >= 10) parts.push(T[Math.floor(x / 10)]); if (x % 10) parts.push(U[x % 10]); }
  const s = parts.join('');
  return s.length === 1 ? s + '׳' : s.slice(0, -1) + '״' + s.slice(-1);
}
export function hebrewDate(d = new Date()) {
  const p = new Intl.DateTimeFormat('he-u-ca-hebrew', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' }).formatToParts(d);
  const day = Number(p.find((x) => x.type === 'day')?.value); const year = Number(p.find((x) => x.type === 'year')?.value);
  const month = p.find((x) => x.type === 'month')?.value || '';
  if (!day || !year || !month) return '';
  return `${gematria(day)} ${month} ${gematria(year % 1000)}`;
}

export const plain = (s: string) => s.replace(/\s+/g, ' ').trim();
export const clip = (s: string, n = 155) => { s = plain(s); return s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…'; };
