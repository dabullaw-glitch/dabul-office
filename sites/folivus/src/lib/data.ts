// Build-time data. Content (guides, articles, courts, tools) comes from the content/ folder, which
// scripts/sync-content.mjs fills from the writers' folder. Firms come from Supabase (fol_firms) when FOL_DB=1 and the
// tables exist; otherwise from the sample file. Everything is read once per build and cached.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { DB, BRAND, PREVIEW } from '../config/brand';
import intros from '../data/area-intros.json';
import citiesRaw from '../data/cities.json';
import firmsSample from '../data/firms.sample.json';
import plansRaw from '../data/plans.json';
import authorsRaw from '../data/authors.json';
import { catName, CAT_ORDER } from './ui';

const ROOT = path.resolve('content');
// writers use the working name; swap it for the configured brand so a rename needs no content edits
const read = (p: string) => fs.readFileSync(p, 'utf8').replace(/פוליבוס/g, BRAND.name).replace(/Folivus/g, BRAND.nameLatin);
const exists = (p: string) => fs.existsSync(p);
const list = (dir: string, ext: string) =>
  exists(path.join(ROOT, dir)) ? fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(ext) && !f.startsWith('_')).sort() : [];

export type Src = { title: string; url: string };
export type Faq = { q: string; a: string };

function parseMd(file: string): { fm: any; body: string } | null {
  try {
    const t = read(file).replace(/^﻿/, '');
    const m = t.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!m) return { fm: {}, body: t };
    return { fm: YAML.parse(m[1]) || {}, body: m[2] };
  } catch (e) {
    console.warn('[data] skipped (bad frontmatter):', file, String(e).slice(0, 120));
    return null;
  }
}
const arr = <T = any>(x: any): T[] => (Array.isArray(x) ? x : x ? [x] : []);
const srcs = (x: any): Src[] => arr(x).filter((s: any) => s && s.url).map((s: any) => ({ title: String(s.title || s.url), url: String(s.url) }));
const faqs = (x: any): Faq[] => arr(x).filter((f: any) => f && f.q && f.a).map((f: any) => ({ q: String(f.q), a: String(f.a) }));
const day = (x: any) => (x ? new Date(x instanceof Date ? x : String(x)) : null);
const validDay = (d: Date | null) => (d && !isNaN(+d) ? d : null);
/** publish gate: draft: true, or a non-empty todo_verify list = not ready. Hidden in production, badged in the preview. */
const isDraft = (fm: any) => fm?.draft === true || fm?.status === 'draft' || (Array.isArray(fm?.todo_verify) ? fm.todo_verify.length > 0 : !!fm?.todo_verify);

// ---------- areas ----------
export type Area = {
  slug: string; he: string; name: string; group: string; title: string; intro: string; description: string;
  guide?: { body: string; faq: Faq[]; sources: Src[]; updated: Date | null; reviewedBy: string; seoTitle: string; draft: boolean };
};
let _areas: Area[] | null = null;
export function areas(): Area[] {
  if (_areas) return _areas;
  const file = exists(path.join(ROOT, 'AREAS.json')) ? path.join(ROOT, 'AREAS.json') : path.resolve('src/data/AREAS.json');
  const raw: any[] = JSON.parse(read(file));
  _areas = raw.map((a) => {
    const g = exists(path.join(ROOT, 'areas', a.slug + '.md')) ? parseMd(path.join(ROOT, 'areas', a.slug + '.md')) : null;
    const name = String(a.name);
    const title = a.he_slug === 'נוטריון' ? 'נוטריון' : 'עורך דין ' + name;
    const intro = (intros as Record<string, string>)[a.slug] || '';
    return {
      slug: a.slug, he: g?.fm?.he_slug && g.fm.he_slug === a.he_slug ? g.fm.he_slug : a.he_slug, name, group: a.group, title,
      intro, description: String(g?.fm?.description || intro),
      guide: g && g.body.trim().length > 200 && (PREVIEW || !isDraft(g.fm)) ? {
        body: g.body, faq: faqs(g.fm.faq), sources: srcs(g.fm.sources), updated: validDay(day(g.fm.updated)),
        reviewedBy: String(g.fm.reviewed_by || ''), seoTitle: String(g.fm.title || ''), draft: isDraft(g.fm),
      } : undefined,
    };
  });
  return _areas;
}
export const areaBySlug = (s: string) => areas().find((a) => a.slug === s);
export const areaGroups = () => {
  const m = new Map<string, Area[]>();
  for (const a of areas()) m.set(a.group, [...(m.get(a.group) || []), a]);
  return [...m.entries()].map(([group, items]) => ({ group, items }));
};

// ---------- cities ----------
export type City = { slug: string; he: string; name: string; region: string };
export const cities = (): City[] => (citiesRaw as any[]).map((c) => ({ slug: c.slug, he: c.he_slug, name: c.he, region: c.region }));
export const cityBySlug = (s: string) => cities().find((c) => c.slug === s);
export const REGIONS = ['מרכז', 'שרון', 'ירושלים', 'צפון', 'דרום'];

// ---------- plans ----------
export type Plan = { id: string; name: string; tier: number; price_year: number | null; price_note: string; is_final: boolean; pitch: string; features: string[]; highlight?: boolean };
export const plans = (): Plan[] => plansRaw.plans as Plan[];
export const addons = () => plansRaw.addons as { id: string; name: string; text: string; price_note: string }[];

// ---------- firms ----------
export type Firm = {
  id: string; slug: string; name: string; city: string; address: string; phone: string; website: string; areas: string[];
  hours: Record<string, string> | null; plan: string; claimed: boolean; isSample: boolean; source: string; sourceUrl: string;
  collectedAt: string; featuredAreas: string[]; featuredCities: string[]; extended: any;
  // from the commerce layer (fol_firms): exact paid slots, card upgrade, verified-review score (never affected by payment)
  featuredSlots?: { area: string; city: string | null; home?: boolean }[] | null; extendedEnabled?: boolean;
  reviewAvg?: number | null; reviewCount?: number; rankScore?: number | null; hideOthers?: boolean;
  google: { rating: number | null; count: number | null; placeId: string; checkedAt: string }; // shown only if SETTINGS.show_google_ratings
  reviews: Review[];
};
export type Review = { rating: number; title: string; body: string; author: string; area: string; method: string; date: string; reply: string; isSample: boolean };

const SAMPLE_REVIEWS: Record<string, Review[]> = {
  'dugma-aleph-mekarkein': [
    { rating: 5, title: 'ליווי מסודר בקניית דירה', body: 'זו חוות דעת לדוגמה. כך תיראה חוות דעת מאומתת: לקוח שקיבל שירות מהמשרד מספר בכמה משפטים איך היה התהליך.', author: 'מיכל ש.', area: 'real-estate', method: 'phone_otp', date: '2026-10-02', reply: 'תודה רבה. (תגובת משרד לדוגמה)', isSample: true },
    { rating: 4, title: 'זמינות טובה, היה עיכוב קטן', body: 'גם חוות דעת לדוגמה. באתר מוצגות גם חוות דעת שאינן מושלמות, כדי שהתמונה תהיה אמינה.', author: 'יוסי ק.', area: 'urban-renewal', method: 'invite', date: '2026-09-14', reply: '', isSample: true },
  ],
  'dugma-bet-mishpacha': [
    { rating: 5, title: 'יחס אישי', body: 'חוות דעת לדוגמה לצורך הצגת העיצוב בלבד.', author: 'רונית א.', area: 'family-law', method: 'phone_otp', date: '2026-08-21', reply: '', isSample: true },
  ],
};

let _firms: Firm[] | null = null;
export async function firms(): Promise<Firm[]> {
  if (_firms) return _firms;
  if (process.env.FOL_DB === '1') {
    try {
      const cols = 'id,slug,name,city_slug,address,phone,website,areas,hours,source,source_url,collected_at,is_sample,claimed,plan,featured_areas,featured_cities,extended,google_rating,google_reviews_count,google_place_id,google_checked_at,extended_enabled,featured_slots,review_avg,review_count,rank_score,hide_others';
      const r = await fetch(`${DB.url}/rest/v1/fol_firms?select=${cols}&order=name`, { headers: { apikey: DB.key, Authorization: `Bearer ${DB.key}` } });
      if (r.ok) {
        const rows: any[] = await r.json();
        _firms = rows.map((f) => ({
          id: f.id, slug: f.slug, name: f.name, city: f.city_slug, address: f.address || '', phone: f.phone || '', website: f.website || '',
          areas: f.areas || [], hours: f.hours, plan: f.plan, claimed: f.claimed, isSample: f.is_sample, source: f.source,
          sourceUrl: f.source_url || '', collectedAt: f.collected_at || '', featuredAreas: f.featured_areas || [],
          featuredCities: f.featured_cities || [], extended: f.extended || {}, featuredSlots: f.featured_slots || null, extendedEnabled: !!f.extended_enabled,
          reviewAvg: f.review_avg === null ? null : Number(f.review_avg), reviewCount: f.review_count || 0, rankScore: f.rank_score === null ? null : Number(f.rank_score), hideOthers: !!f.hide_others,
          google: { rating: f.google_rating, count: f.google_reviews_count, placeId: f.google_place_id || '', checkedAt: f.google_checked_at || '' }, reviews: [],
        }));
        return _firms;
      }
      console.warn('[data] fol_firms not readable, using the sample list:', r.status);
    } catch (e) { console.warn('[data] database not reachable, using the sample list'); }
  }
  _firms = (firmsSample as any[]).map((f) => ({
    id: f.slug, slug: f.slug, name: f.name, city: f.city, address: f.address, phone: f.phone, website: f.website, areas: f.areas,
    hours: f.hours, plan: f.plan, claimed: f.claimed, isSample: true, source: 'sample', sourceUrl: '', collectedAt: '2026-11-25',
    featuredAreas: f.featured_areas, featuredCities: f.featured_cities, extended: f.extended || {},
    google: { rating: f.google_rating ?? null, count: f.google_reviews_count ?? null, placeId: '', checkedAt: '' }, reviews: SAMPLE_REVIEWS[f.slug] || [],
  }));
  return _firms;
}
export const isPaid = (f: Firm) => f.plan !== 'free';
export const hasExtended = (f: Firm) => !!f.extendedEnabled || ['local', 'regional', 'national', 'basic', 'pro', 'senior', 'extended'].includes(f.plan) || (f.claimed && !!f.extended?.description);
// fair daily rotation among paid firms in the same slot (same order all day, a new order every day; nobody buys first place)
const rotDay = new Date().toISOString().slice(0, 10);
const rot = (s: string) => { let h = 2166136261; for (const ch of s + rotDay) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
const featuredHere = (f: Firm, area?: string, city?: string) => {
  if (!isPaid(f)) return false;
  if (f.featuredSlots && f.featuredSlots.length) return f.featuredSlots.some((s) => s.area === area && (s.city || undefined) === (city || undefined));
  return !!((area && f.featuredAreas.includes(area)) || (city && f.featuredCities.includes(city)) || f.plan === 'senior');
};
/** paid (labelled) firms for this area/city first, in daily rotation; then the rest by the published review score, then by name.
 *  The score uses verified reviews only (shiitat ha-dirug page); paying never changes it. */
export function rankFor(list: Firm[], area?: string, city?: string) {
  const feat = (f: Firm) => featuredHere(f, area, city);
  return {
    featured: list.filter(feat).sort((a, b) => rot(a.slug) - rot(b.slug)),
    rest: list.filter((f) => !feat(f)).sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0) || a.name.localeCompare(b.name, 'he')),
  };
}
/** the home page block: national packages (plus the legacy sample plan), in daily rotation */
export const homeFeatured = (list: Firm[]) => list.filter((f) => (f.featuredSlots || []).some((s) => s.home) || f.plan === 'national' || f.plan === 'senior').sort((a, b) => rot(a.slug) - rot(b.slug));
export const avg = (r: Review[]) => (r.length ? Math.round((r.reduce((s, x) => s + x.rating, 0) / r.length) * 10) / 10 : 0);

// ---------- authors ----------
export type Author = { slug: string; name: string; type: 'Person' | 'Organization'; role: string; bio: string; isSample: boolean; sameAs: string[] };
export const authors = (): Author[] => authorsRaw as Author[];
export const authorFor = (x: any): Author => {
  const s = String(x || '').trim();
  return authors().find((a) => a.slug === s || a.name === s) || authors().find((a) => a.slug === 'editorial')!;
};

// ---------- articles ----------
export type Article = {
  slug: string; he: string; title: string; description: string; areas: string[]; author: Author; reviewer: Author | null;
  published: Date | null; updated: Date | null; sources: Src[]; faq: Faq[]; body: string; words: number; isSample: boolean;
  scheduled: boolean; // published date is in the future: shown only in the preview, goes live on that day's build
  draft: boolean;
};
let _articles: Article[] | null = null;
export function articles(): Article[] {
  if (_articles) return _articles;
  _articles = list('articles', '.md').map((f) => {
    const d = parseMd(path.join(ROOT, 'articles', f));
    if (!d || !d.fm.title) return null;
    const fm = d.fm;
    const slug = String(fm.slug || f.replace(/\.md$/, ''));
    if (isDraft(fm) && !PREVIEW) return null;
    const pub = validDay(day(fm.published));
    const scheduled = !!pub && +pub > Date.now();
    if (scheduled && !PREVIEW) return null;
    return {
      slug, he: String(fm.he_slug || slug), title: String(fm.title), description: String(fm.description || ''),
      areas: arr<string>(fm.area_slugs || fm.areas), author: authorFor(fm.author), reviewer: fm.reviewed_by ? authorFor(fm.reviewed_by) : null,
      published: validDay(day(fm.published)), updated: validDay(day(fm.updated || fm.published)), sources: srcs(fm.sources),
      faq: faqs(fm.faq), body: d.body, words: d.body.split(/\s+/).filter(Boolean).length, isSample: !!fm.sample, scheduled, draft: isDraft(fm),
    } as Article;
  }).filter(Boolean) as Article[];
  _articles.sort((a, b) => +(b.published || 0) - +(a.published || 0));
  return _articles;
}

// ---------- tools ----------
export type ToolInput = { id: string; label: string; type: string; options?: any[]; required?: boolean; help?: string; default?: any; min?: number; max?: number; step?: number; placeholder?: string };
export type Tool = {
  slug: string; he: string; name: string; category: string; type: 'calculator' | 'generator'; description: string; inputs: ToolInput[];
  outputs: any[]; sources: Src[]; disclaimer: string; updated: Date | null; area: string; module: string | null; intro: string; faq: Faq[];
  draft: boolean;
};
let _tools: Tool[] | null = null;
export function tools(): Tool[] {
  if (_tools) return _tools;
  _tools = list('tools', '.json').map((f) => {
    try {
      const t = JSON.parse(read(path.join(ROOT, 'tools', f)));
      const slug = String(t.slug || f.replace(/\.json$/, ''));
      if (isDraft(t) && !PREVIEW) return null;
      const js = path.join(ROOT, 'tools', slug + '.js');
      return {
        slug, he: String(t.he_slug || slug), name: String(t.name), category: catName(String(t.category || '')),
        type: t.type === 'generator' ? 'generator' : 'calculator', description: String(t.description || ''),
        inputs: arr(t.inputs), outputs: arr(t.outputs), sources: srcs(t.sources), disclaimer: String(t.disclaimer || ''),
        updated: validDay(day(t.updated)), area: String(t.area_slug || arr(t.area_slugs)[0] || ''), module: exists(js) ? slug : null,
        intro: String(t.intro || t.explanation || ''), faq: faqs(t.faq), draft: isDraft(t),
      } as Tool;
    } catch (e) { console.warn('[data] skipped tool', f, String(e).slice(0, 100)); return null; }
  }).filter(Boolean) as Tool[];
  return _tools;
}
export const toolCategories = () => {
  const m = new Map<string, Tool[]>();
  for (const t of tools()) m.set(t.category, [...(m.get(t.category) || []), t]);
  const rank = (c: string) => (CAT_ORDER.indexOf(c) + 1 || 99);
  return [...m.entries()].sort((a, b) => rank(a[0]) - rank(b[0])).map(([category, items]) => ({ category, items: items.sort((x, y) => x.name.localeCompare(y.name, 'he')) }));
};

// ---------- courts ----------
export type Court = {
  slug: string; he: string; name: string; type: string; city: string; address: string; phone: string; hours: string;
  lat: number | null; lng: number | null; sources: Src[]; updated: Date | null; body: string; faq: Faq[];
  district: string; phoneNote: string; officialPage: string; draft: boolean;
};
let _courts: Court[] | null = null;
export function courts(): Court[] {
  if (_courts) return _courts;
  _courts = list('courts', '.md').map((f) => {
    const d = parseMd(path.join(ROOT, 'courts', f));
    if (!d || !d.fm.name) return null;
    const fm = d.fm;
    if (isDraft(fm) && !PREVIEW) return null;
    const hours = Array.isArray(fm.hours) ? fm.hours.join(' | ') : typeof fm.hours === 'object' && fm.hours ? Object.entries(fm.hours).map(([k, v]) => `${k}: ${v}`).join(' | ') : String(fm.hours || '');
    return {
      slug: String(fm.slug || f.replace(/\.md$/, '')), he: String(fm.he_slug || fm.slug), name: String(fm.name), type: String(fm.type || ''),
      city: String(fm.city || ''), address: String(fm.address || ''), phone: String(fm.phone || ''), hours,
      lat: typeof fm.lat === 'number' ? fm.lat : null, lng: typeof fm.lng === 'number' ? fm.lng : null, sources: srcs(fm.sources),
      updated: validDay(day(fm.updated)), body: d.body, faq: faqs(fm.faq),
      district: String(fm.district || ''), phoneNote: String(fm.phone_note || ''), officialPage: String(fm.official_page || ''), draft: isDraft(fm),
    } as Court;
  }).filter(Boolean) as Court[];
  _courts.sort((a, b) => a.name.localeCompare(b.name, 'he'));
  return _courts;
}

// ---------- helpers ----------
export const fmtDate = (d: Date | null | string) => {
  const x = typeof d === 'string' ? new Date(d) : d;
  return x && !isNaN(+x) ? x.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
};
export const isoDate = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : undefined);
export const DAYS: [string, string][] = [['sun', 'ראשון'], ['mon', 'שני'], ['tue', 'שלישי'], ['wed', 'רביעי'], ['thu', 'חמישי'], ['fri', 'שישי'], ['sat', 'שבת']];
