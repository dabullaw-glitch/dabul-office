// Build-time data layer. Reads the directory engine export once per build; if it is not reachable,
// falls back to src/data/lawyers.seed.json, and if that is missing too, to an empty list.
import fs from 'node:fs';
import path from 'node:path';
import areasRaw from '../data/areas.json';
import citiesRaw from '../data/cities.json';
import { REGIONS, SITE } from '../data/site';

export type Area = { slug: string; he: string; group: string };
export type City = { slug: string; he: string; region: string; regionSlug: string };
export type Review = { stars: number; text: string; name: string; area?: string; created?: string };
export type ScoreParts = { reviews: number; years: number; profile: number; response: number; recognition: number };
export type Lawyer = {
  id: string; name: string; firm?: string; title: string;
  cities: string[]; regions: string[]; areas: string[];
  phone?: string; whatsapp?: string; email?: string; site?: string; address?: string; about?: string;
  licenseYear?: number; languages: string[]; photo?: string;
  source: 'public' | 'self' | 'claimed'; sourceUrl?: string; verified: boolean;
  plan: 'free' | 'pro' | 'premium'; planUntil?: string; featured: { areas: string[]; cities: string[] };
  score: number; parts: ScoreParts; reviewCount: number; avg: number; reviews: Review[];
  responseRate?: number; recognitions: string[]; paid: boolean;
  updated?: string;
};
export type Rank = { year: number; area: string; list: { lawyerId: string; place?: number; tier?: string }[]; method?: string };

export const AREAS: Area[] = areasRaw as Area[];
const regionSlug = (he: string) => REGIONS.find((r) => r.he === he)?.slug || 'merkaz';
export const CITIES: City[] = (citiesRaw as { slug: string; he: string; region: string }[]).map((c) => ({ ...c, regionSlug: regionSlug(c.region) }));
export const GROUPS: string[] = [...new Set(AREAS.map((a) => a.group))];
export const areaBySlug = (s: string) => AREAS.find((a) => a.slug === s);
export const cityBySlug = (s: string) => CITIES.find((c) => c.slug === s);
const areaSet = new Set(AREAS.map((a) => a.slug));
const citySet = new Set(CITIES.map((c) => c.slug));

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []);
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const NOW = new Date();
const THIS_YEAR = NOW.getFullYear();

/** The public score method (also explained on /shita/). Paid plans never change it. */
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
  const id = str(raw?.id);
  const name = str(raw?.name);
  if (!id || !name || !/^[a-z0-9-]+$/.test(id)) return null;
  if (raw.status && raw.status !== 'live') return null;
  const sites = arr(raw.sites);
  if (sites.length && !sites.includes('folivus')) return null;
  const areas = arr(raw.areas).filter((a) => areaSet.has(a));
  const cities = arr(raw.cities).filter((c) => citySet.has(c));
  const regions = [...new Set(cities.map((c) => cityBySlug(c)!.regionSlug))];
  const reviews: Review[] = Array.isArray(raw.reviews)
    ? raw.reviews.filter((r: any) => r && (!r.status || r.status === 'live') && r.stars >= 1 && r.stars <= 5).map((r: any) => ({ stars: Number(r.stars), text: String(r.text || ''), name: String(r.name || ''), area: str(r.area), created: str(r.created) }))
    : [];
  const reviewCount = Number(raw.reviewCount ?? reviews.length) || 0;
  const avg = Number(raw.avg ?? (reviews.length ? reviews.reduce((s, r) => s + r.stars, 0) / reviews.length : 0)) || 0;
  const plan = (['pro', 'premium'].includes(raw.plan) ? raw.plan : 'free') as Lawyer['plan'];
  const planUntil = str(raw.planUntil);
  const paid = plan !== 'free' && (!planUntil || new Date(planUntil) >= NOW);
  const recognitions = [...arr(raw.recognitions), ...(rankedIds.has(id) ? ['נבחרת פוליבוס'] : [])];
  const licenseYear = Number(raw.licenseYear) > 1940 && Number(raw.licenseYear) <= THIS_YEAR ? Number(raw.licenseYear) : undefined;
  const base = {
    id, name, firm: str(raw.firm), title: str(raw.title) || 'עו"ד', cities, regions, areas,
    phone: str(raw.phone), whatsapp: str(raw.whatsapp), email: str(raw.email), site: str(raw.site), address: str(raw.address),
    about: str(raw.about), licenseYear, languages: arr(raw.languages), photo: str(raw.photo),
    source: (['self', 'claimed'].includes(raw.source) ? raw.source : 'public') as Lawyer['source'], sourceUrl: str(raw.sourceUrl),
    verified: !!raw.verified, plan, planUntil, featured: { areas: arr(raw.featured?.areas), cities: arr(raw.featured?.cities) },
    reviewCount, avg, reviews, responseRate: typeof raw.responseRate === 'number' ? raw.responseRate : undefined, recognitions, paid,
    updated: str(raw.updated),
  };
  const computed = computeParts(base);
  const parts: ScoreParts = raw.scoreParts && typeof raw.score === 'number' ? raw.scoreParts : computed;
  const score = raw.scoreParts && typeof raw.score === 'number' ? Math.round(raw.score) : Math.round(Object.values(computed).reduce((s, n) => s + n, 0));
  return { ...base, parts, score };
}

type Data = { lawyers: Lawyer[]; ranks: Rank[]; origin: 'engine' | 'seed' | 'empty'; at: string };
let cache: Promise<Data> | null = null;

async function fromEngine(): Promise<any | null> {
  if (process.env.DIR_OFFLINE === '1') return null;
  try {
    const r = await fetch(SITE.dir, { method: 'POST', headers: { apikey: SITE.dirKey, 'content-type': 'application/json' }, body: JSON.stringify({ a: 'export', p: { site: 'folivus' } }), signal: AbortSignal.timeout(30000) });
    if (!r.ok) return null;
    const j = await r.json();
    return Array.isArray(j?.lawyers) && j.lawyers.length ? j : null;
  } catch {
    return null;
  }
}
function fromSeed(): any | null {
  try {
    const p = path.resolve(process.cwd(), 'src/data/lawyers.seed.json');
    if (!fs.existsSync(p)) return null;
    const j = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(j) ? { lawyers: j } : Array.isArray(j?.lawyers) ? j : null;
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
      const ranks: Rank[] = Array.isArray(src?.ranks) ? src.ranks.filter((r: any) => r && r.year && areaSet.has(r.area) && Array.isArray(r.list)) : [];
      const rankedIds = new Set(ranks.flatMap((r) => r.list.map((x) => x.lawyerId)));
      const seen = new Set<string>();
      const lawyers = ((src?.lawyers || []) as any[]).map((x) => normalize(x, rankedIds)).filter((l): l is Lawyer => !!l && !seen.has(l.id) && !!seen.add(l.id));
      lawyers.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name, 'he'));
      console.log(`[folivus] lawyers: ${lawyers.length} (from ${origin}), ranks: ${ranks.length}`);
      return { lawyers, ranks, origin, at: src?.at || NOW.toISOString() };
    })();
  }
  return cache;
}

export const key = (a: string, c: string) => `${a}|${c}`;
export async function counts() {
  const { lawyers } = await loadData();
  const area: Record<string, number> = {}, city: Record<string, number> = {}, region: Record<string, number> = {}, areaCity: Record<string, number> = {}, areaRegion: Record<string, number> = {};
  for (const l of lawyers) {
    for (const a of l.areas) area[a] = (area[a] || 0) + 1;
    for (const c of l.cities) city[c] = (city[c] || 0) + 1;
    for (const r of l.regions) region[r] = (region[r] || 0) + 1;
    for (const a of l.areas) for (const c of l.cities) areaCity[key(a, c)] = (areaCity[key(a, c)] || 0) + 1;
    for (const a of l.areas) for (const r of l.regions) areaRegion[key(a, r)] = (areaRegion[key(a, r)] || 0) + 1;
  }
  return { area, city, region, areaCity, areaRegion, total: lawyers.length };
}
/** An area+city page is built when the city has lawyers in that area, or at least the city's region does
 *  (then it is noindex and shows the nearby lawyers). Other combinations fall to the 404 page, which explains and links. */
export function hasCombo(c: { areaCity: Record<string, number>; areaRegion: Record<string, number> }, area: string, city: string) {
  const reg = cityBySlug(city)?.regionSlug || '';
  return !!(c.areaCity[key(area, city)] || c.areaRegion[key(area, reg)]);
}

/** Is this lawyer promoted on the page of `area` (and optionally `city`)? Always shown with a "מקודם" label. */
export function promotedOn(l: Lawyer, area: string, city?: string) {
  if (!l.paid || !l.featured.areas.includes(area)) return false;
  return !city || !l.featured.cities.length || l.featured.cities.includes(city);
}
/** Promoted first (labelled), then by score. */
export function orderFor(list: Lawyer[], area: string, city?: string) {
  const p = list.filter((l) => promotedOn(l, area, city)).slice(0, 3);
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
export const plural = (n: number, one: string, many: string) => (n === 1 ? one : `${n} ${many}`);
