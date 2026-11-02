// Build-time data for the lawyer portal (orchei-din/). Reads the directory engine export once per build
// ({a:'export', p:{site:'blihovot'}}). If the engine is not reachable (local sandbox), it falls back to the shared public
// seed list kept with the other front end, filtered here the same way the engine filters it. If that is missing too: empty.
// This list never shows the law office: entries that point to it are dropped (see BLOCK).
import fs from 'node:fs';
import path from 'node:path';
import citiesRaw from '../data/cities.json';
import { DIR, REGIONS, TOPICS, type TopicSlug } from '../data/portal';

export type City = { slug: string; he: string; region: string; regionSlug: string };
export type Review = { stars: number; text: string; name: string; area?: string; created?: string };
export type ScoreParts = { reviews: number; years: number; profile: number; response: number; recognition: number };
export type Lawyer = {
  id: string; name: string; firm?: string; title: string;
  cities: string[]; regions: string[]; areas: string[]; topics: TopicSlug[];
  phone?: string; whatsapp?: string; email?: string; site?: string; address?: string; about?: string;
  licenseYear?: number; languages: string[]; photo?: string;
  source: 'public' | 'self' | 'claimed'; sourceUrl?: string; verified: boolean;
  plan: 'free' | 'pro' | 'premium'; planUntil?: string; featured: { areas: string[]; cities: string[] };
  score: number; parts: ScoreParts; reviewCount: number; avg: number; reviews: Review[];
  responseRate?: number; recognitions: string[]; paid: boolean; updated?: string;
};

const regionSlug = (he: string) => REGIONS.find((r) => r.he === he)?.slug || 'merkaz';
export const CITIES: City[] = (citiesRaw as { slug: string; he: string; region: string }[]).map((c) => ({ ...c, regionSlug: regionSlug(c.region) }));
export const cityBySlug = (s: string) => CITIES.find((c) => c.slug === s);
export const topicBySlug = (s: string) => TOPICS.find((t) => t.slug === s);
export const regionBySlug = (s: string) => REGIONS.find((r) => r.slug === s);
const citySet = new Set(CITIES.map((c) => c.slug));
const AREAS = new Set(['insolvency', 'enforcement']);
export const AREA_HE: Record<string, string> = { insolvency: 'חדלות פירעון והסדרי חובות', enforcement: 'הוצאה לפועל' };
const topicsOf = (areas: string[]) => TOPICS.filter((t) => areas.includes(t.area)).map((t) => t.slug) as TopicSlug[];

// The law office is never listed here (site rule): drop anything that points to it.
const BLOCK = /dabul|דבול|דעבול/i;
const NOW = new Date();
const THIS_YEAR = NOW.getFullYear();
const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
// Site text rules apply to data too: no en/em dashes; "expert" wording becomes "specializes"; superlatives drop the text.
const clean = (s: string) => s.replace(/[–—]/g, '-').replace(/מומחיות/g, 'התמחות').replace(/מומחית/g, 'מתמחה').replace(/מומחים/g, 'מתמחים').replace(/מומחה/g, 'מתמחה');
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? clean(v.trim()) : undefined);
const SUPER = /folivus|פוליבוס|(^|[^֐-׿])הכי(?=[^֐-׿]|$)|הטוב ביותר|הטובים ביותר|מובטח/i;
const safeText = (v: unknown) => { const s = str(v); return s && !SUPER.test(s) ? s : undefined; };

/** The public score method (explained on orchei-din/shita/). Paid plans never change it. */
export function computeParts(l: { reviewCount: number; avg: number; licenseYear?: number; responseRate?: number; recognitions: string[] } & Record<string, any>): ScoreParts {
  const reviews = l.reviewCount > 0 ? (l.avg / 5) * 35 + (Math.min(l.reviewCount, 10) / 10) * 15 : 0;
  const yrs = l.licenseYear ? Math.max(0, THIS_YEAR - l.licenseYear) : 0;
  const years = Math.min(yrs, 15);
  const fields = ['phone', 'email', 'site', 'address', 'about', 'licenseYear', 'photo'];
  const filled = fields.filter((f) => !!l[f]).length + (l.languages?.length ? 1 : 0) + (l.areas?.length ? 1 : 0) + (l.cities?.length ? 1 : 0);
  const profile = (filled / (fields.length + 3)) * 15;
  const response = typeof l.responseRate === 'number' ? Math.max(0, Math.min(1, l.responseRate)) * 10 : 0;
  const recognition = Math.min(10, (l.recognitions?.length || 0) * 5);
  const r = (n: number) => Math.round(n * 10) / 10;
  return { reviews: r(reviews), years: r(years), profile: r(profile), response: r(response), recognition: r(recognition) };
}

function normalize(raw: any, rankedIds: Set<string>): Lawyer | null {
  const id = typeof raw?.id === 'string' ? raw.id.trim() : '';
  // some public entries have only the office name: then the office name is shown, without the "עו"ד" title
  const personName = str(raw?.name);
  const name = personName || str(raw?.firm);
  if (!id || !name || !/^[a-z0-9-]+$/.test(id)) return null;
  if (raw.status && raw.status !== 'live') return null;
  const sites = arr(raw.sites);
  if (sites.length && !sites.includes(DIR.site)) return null;
  if (BLOCK.test([id, raw.name, raw.firm, raw.site, raw.sourceUrl, raw.email, raw.about].join(' '))) return null;
  // the engine already keeps only these two areas for this site; the seed list has more, so filter the same way
  const areas = arr(raw.areas).filter((a) => AREAS.has(a));
  if (!areas.length) return null;
  const cities = arr(raw.cities).filter((c) => citySet.has(c));
  const regions = [...new Set(cities.map((c) => cityBySlug(c)!.regionSlug))];
  const reviews: Review[] = Array.isArray(raw.reviews)
    ? raw.reviews.filter((r: any) => r && (!r.status || r.status === 'live') && r.stars >= 1 && r.stars <= 5)
        .map((r: any) => ({ stars: Number(r.stars), text: clean(String(r.text || '')), name: clean(String(r.name || '')), area: str(r.area), created: str(r.created) }))
    : [];
  const reviewCount = Number(raw.reviewCount ?? reviews.length) || 0;
  const avg = Number(raw.avg ?? (reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0)) || 0;
  const plan = (['pro', 'premium'].includes(raw.plan) ? raw.plan : 'free') as Lawyer['plan'];
  const planUntil = str(raw.planUntil);
  const paid = plan !== 'free' && (!planUntil || new Date(planUntil) >= NOW);
  // recognitions are shown in neutral words on this site
  const recognitions = [...arr(raw.recognitions).filter((x) => !/folivus|פוליבוס/i.test(x)).map(clean), ...(rankedIds.has(id) ? ['דירוג שנתי בתחום'] : [])];
  const licenseYear = Number(raw.licenseYear) > 1940 && Number(raw.licenseYear) <= THIS_YEAR ? Number(raw.licenseYear) : undefined;
  const site = str(raw.site);
  const base = {
    id, name, firm: personName ? str(raw.firm) : undefined, title: personName ? str(raw.title) || 'עו"ד' : '', cities, regions, areas, topics: topicsOf(areas),
    phone: str(raw.phone), whatsapp: str(raw.whatsapp), email: str(raw.email), site: site && /^https?:\/\//.test(site) ? site : undefined,
    address: str(raw.address), about: safeText(raw.about), licenseYear, languages: arr(raw.languages), photo: str(raw.photo),
    source: (['self', 'claimed'].includes(raw.source) ? raw.source : 'public') as Lawyer['source'], sourceUrl: str(raw.sourceUrl),
    verified: !!raw.verified, plan, planUntil, featured: { areas: arr(raw.featured?.areas), cities: arr(raw.featured?.cities) },
    reviewCount, avg, reviews, responseRate: typeof raw.responseRate === 'number' ? raw.responseRate : undefined, recognitions, paid,
    updated: str(raw.updated),
  };
  const computed = computeParts(base);
  const fromEngine = raw.scoreParts && typeof raw.score === 'number';
  const parts: ScoreParts = fromEngine ? raw.scoreParts : computed;
  const score = fromEngine ? Math.round(raw.score) : Math.round(Object.values(computed).reduce((s, n) => s + n, 0));
  return { ...base, parts, score };
}

type Data = { lawyers: Lawyer[]; origin: 'engine' | 'seed' | 'empty'; at: string };
let cache: Promise<Data> | null = null;

async function fromEngine(): Promise<any | null> {
  if (process.env.DIR_OFFLINE === '1') return null;
  try {
    const r = await fetch(DIR.url, { method: 'POST', headers: { apikey: DIR.key, 'content-type': 'application/json' }, body: JSON.stringify({ a: 'export', p: { site: DIR.site } }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j?.lawyers) && j.lawyers.length ? j : null;
  } catch {
    return null;
  }
}
function fromSeed(): any | null {
  try {
    const p = path.resolve(process.cwd(), '../folivus/src/data/lawyers.seed.json');
    if (!fs.existsSync(p)) return null;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    const list = Array.isArray(j) ? j : Array.isArray(j?.lawyers) ? j.lawyers : null;
    // the same filter the engine applies for this site: listed for this site, and has insolvency or enforcement
    return list ? { lawyers: list.filter((x: any) => Array.isArray(x?.sites) && x.sites.includes(DIR.site) && arr(x.areas).some((a) => AREAS.has(a))) } : null;
  } catch {
    return null;
  }
}

export function loadData(): Promise<Data> {
  if (!cache) {
    cache = (async () => {
      const eng = await fromEngine();
      const src = eng || fromSeed();
      const origin: Data['origin'] = eng ? 'engine' : src ? 'seed' : 'empty';
      const ranks = Array.isArray(src?.ranks) ? src.ranks.filter((r: any) => r && Array.isArray(r.list)) : [];
      const rankedIds = new Set<string>(ranks.flatMap((r: any) => r.list.map((x: any) => x?.lawyerId)).filter(Boolean));
      const seen = new Set<string>();
      const lawyers = ((src?.lawyers || []) as any[]).map((x) => normalize(x, rankedIds)).filter((l): l is Lawyer => !!l && !seen.has(l.id) && !!seen.add(l.id));
      lawyers.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'he'));
      console.log(`[orchei-din] lawyers: ${lawyers.length} (from ${origin})`);
      return { lawyers, origin, at: src?.at || NOW.toISOString() };
    })();
  }
  return cache;
}

export const key = (a: string, c: string) => `${a}|${c}`;
export async function counts() {
  const { lawyers } = await loadData();
  const topic: Record<string, number> = {}, city: Record<string, number> = {}, region: Record<string, number> = {}, topicCity: Record<string, number> = {}, topicRegion: Record<string, number> = {};
  for (const l of lawyers) {
    for (const t of l.topics) topic[t] = (topic[t] || 0) + 1;
    for (const c of l.cities) city[c] = (city[c] || 0) + 1;
    for (const r of l.regions) region[r] = (region[r] || 0) + 1;
    for (const t of l.topics) for (const c of l.cities) topicCity[key(t, c)] = (topicCity[key(t, c)] || 0) + 1;
    for (const t of l.topics) for (const r of l.regions) topicRegion[key(t, r)] = (topicRegion[key(t, r)] || 0) + 1;
  }
  return { topic, city, region, topicCity, topicRegion, total: lawyers.length };
}

/** Promoted on the page of `topic` (and optionally `city`)? Always shown with a "מקודם" label. */
export function promotedOn(l: Lawyer, topic?: TopicSlug, city?: string) {
  if (!l.paid) return false;
  const area = topic ? topicBySlug(topic)!.area : undefined;
  if (area && !l.featured.areas.includes(area)) return false;
  if (!area && !l.featured.areas.length) return false;
  return !city || !l.featured.cities.length || l.featured.cities.includes(city);
}
/** Up to 3 promoted (labelled) first, then everyone else by score. */
export function orderFor(list: Lawyer[], topic?: TopicSlug, city?: string) {
  const p = list.filter((l) => promotedOn(l, topic, city)).slice(0, 3);
  const ids = new Set(p.map((l) => l.id));
  return { promoted: p, rest: list.filter((l) => !ids.has(l.id)) };
}

export const yearsOf = (l: Lawyer) => (l.licenseYear ? THIS_YEAR - l.licenseYear : undefined);
export const telHref = (p?: string) => (p ? 'tel:' + p.replace(/[^\d+]/g, '') : undefined);
export const waHref = (p?: string) => {
  if (!p) return undefined;
  let d = p.replace(/\D/g, '');
  if (d.startsWith('0')) d = '972' + d.slice(1);
  return `https://wa.me/${d}`;
};
export const bareName = (l: Lawyer) => l.name.replace(/^(עו"ד|עו״ד)\s*/, '').trim();
export const fullName = (l: Lawyer) => (l.title ? `${l.title} ${bareName(l)}` : bareName(l));
export const profilePath = (id: string) => `orchei-din/profil/${id}/`;

/** Every indexable portal URL (for sitemap.xml and llms.txt). */
export async function portalUrls() {
  const { lawyers, at } = await loadData();
  const c = await counts();
  const d = new Date(at).toISOString().slice(0, 10);
  const rows: [string, string][] = [
    ['orchei-din/', d], ['orchei-din/shita/', d], ['orchei-din/hitztarfut/', d], ['orchei-din/hasara/', d], ['orchei-din/ir/', d],
    ...TOPICS.map((t) => [`orchei-din/${t.slug}/`, d] as [string, string]),
    ...TOPICS.flatMap((t) => CITIES.filter((x) => c.topicCity[key(t.slug, x.slug)]).map((x) => [`orchei-din/${t.slug}/${x.slug}/`, d] as [string, string])),
    ...REGIONS.filter((r) => c.region[r.slug]).map((r) => [`orchei-din/ezor/${r.slug}/`, d] as [string, string]),
    ...CITIES.filter((x) => c.city[x.slug]).map((x) => [`orchei-din/ir/${x.slug}/`, d] as [string, string]),
    ...lawyers.map((l) => [profilePath(l.id), l.updated ? new Date(l.updated).toISOString().slice(0, 10) : d] as [string, string]),
  ];
  return rows;
}
