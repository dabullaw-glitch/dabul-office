import fs from 'node:fs';
import path from 'node:path';
import type { Lang } from '../data/site';
import { LANG_PREFIX } from '../data/site';
import { SECTION_BY_KEY, type SectionKey } from '../data/sections';
import { PLACES, PLACE_BY_HE } from '../data/places';

export interface Article {
  slug: string; section: SectionKey; title: string; dek: string; body: string[]; keyPoints: string[]; whatItMeans: string;
  faq: [string, string][]; neighborhoods: string[]; tags: string[]; published: string; updated?: string;
  sourceName: string; sourceUrl: string; imageHint: string; event?: { name: string; startDate: string; location: string } | null;
  expires?: string; og?: string; engineId?: number;
}

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
function fromFeed(s: any): any {
  const section = SECTION_BY_KEY[s.section as SectionKey] ? s.section : 'flash';
  const places = [...new Set((s.places || []).map((p: string) => PLACE_ALIAS[p] || p).filter((p: string) => PLACE_BY_HE[p]))];
  return {
    slug: `n${s.id}`, engineId: s.id, section, title: clean(s.title), dek: clean(s.dek), body: (s.body || []).map(clean).filter(Boolean),
    keyPoints: (s.keyPoints || []).map(clean).filter(Boolean), whatItMeans: '', faq: s.faq || [], neighborhoods: places, tags: [],
    published: new Date(s.date || s.publishedAt).toISOString(), sourceName: clean(s.sourceName), sourceUrl: s.sourceUrl || '', imageHint: '', event: null,
  };
}
const FEED: any[] = (readJson('feed.json', { stories: [] }).stories || []).filter((s: any) => s && s.id && s.title && (s.body || []).length).map(fromFeed);
const ogFor = (a: any) => fs.existsSync(path.resolve('public/og/a', `${a.slug}.png`)) ? `/og/a/${a.slug}.png` : `/og/s/${a.section}.png`;

export const ARTICLES: Article[] = [...(readJson('articles.json', { articles: [] }).articles as any[]), ...FEED]
  .filter((a) => a && a.slug && SECTION_BY_KEY[a.section as SectionKey] && live(a))
  .map((a) => ({ ...a, published: new Date(a.published).toISOString(), ...(a.updated ? { updated: new Date(a.updated).toISOString() } : {}), faq: normFaq(a.faq), neighborhoods: a.neighborhoods || [], tags: a.tags || [], keyPoints: a.keyPoints || [], body: a.body || [], og: ogFor(a) }))
  .sort((x, y) => (Date.parse(y.published) || 0) - (Date.parse(x.published) || 0));

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

export const plain = (s: string) => s.replace(/\s+/g, ' ').trim();
export const clip = (s: string, n = 155) => { s = plain(s); return s.length <= n ? s : s.slice(0, s.lastIndexOf(' ', n - 1)) + '…'; };
