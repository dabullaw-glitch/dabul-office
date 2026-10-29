import { CATS, DATA } from '../data/city/guide';
// Every public URL of the site, for the sitemaps (with language alternates and images).
import { LANGS, type Lang } from '../data/site';
import { SECTIONS } from '../data/sections';
import { CATEGORIES } from '../data/directory';
import { PLACES } from '../data/places';
import { ARTICLES, localized, articleUrl, sectionUrl, placesOf, liveSections } from './content';
import { IMG } from '../data/site';
import { LISTINGS, listingUrl } from './biz';

export interface R { loc: string; lastmod?: string; alts?: Partial<Record<Lang, string>>; images?: { loc: string; title: string }[]; priority?: string; changefreq?: string }
const now = new Date().toISOString();
const all = (f: (l: Lang) => string) => Object.fromEntries(LANGS.map((l) => [l, f(l)])) as Record<Lang, string>;
const latest = ARTICLES[0]?.published ?? now;

export function routes(): R[] {
  const out: R[] = [];
  const home = all((l) => (l === 'he' ? '/' : `/${l}/`));
  for (const l of LANGS) out.push({ loc: home[l], alts: home, lastmod: latest, changefreq: 'hourly', priority: l === 'he' ? '1.0' : '0.8' });
  for (const s of liveSections()) { const a = all((l) => sectionUrl(s.key, l)); for (const l of LANGS) out.push({ loc: a[l], alts: a, lastmod: ARTICLES.find((x) => x.section === s.key)?.published ?? now, changefreq: 'hourly', priority: '0.8' }); }
  for (const art of ARTICLES) {
    const langs = LANGS.filter((l) => localized(art, l));
    const alts = Object.fromEntries(langs.map((l) => [l, articleUrl(art, l)]));
    const img = IMG[art.imageHint] ?? IMG.city;
    // 29.10.2026: lastmod is the story's last change (an edit or the newest live update), as in its dateModified
    const lastmod = [art.updated, art.updates?.[art.updates.length - 1]?.at, art.published].filter((d): d is string => !!d && !isNaN(Date.parse(d))).sort((p, q) => Date.parse(q) - Date.parse(p))[0];
    for (const l of langs) out.push({ loc: alts[l], alts, lastmod, priority: '0.7', images: [{ loc: art.og || `/og/a/${art.slug}.png`, title: (localized(art, l) as any).title }] });
  }
  const nowA = all((l) => (l === 'he' ? '/now/' : `/${l}/now/`));
  for (const l of LANGS) out.push({ loc: nowA[l], alts: nowA, lastmod: now, changefreq: 'hourly', priority: '0.8' });
  for (const p of ['shabbat', 'beaches', 'pharmacy', 'roads', 'alerts', 'phones']) out.push({ loc: `/now/${p}/`, lastmod: now, changefreq: 'daily', priority: '0.7' });
  out.push({ loc: '/netanya/', lastmod: now, changefreq: 'daily', priority: '0.8' });
  // the city guide "שימושון עירוני" (29.10.2026): the hub and every category page that has items
  out.push({ loc: '/guide/', lastmod: now, changefreq: 'weekly', priority: '0.7' });
  for (const c of CATS) if (!c.href && (DATA[c.slug]?.items?.length ?? 0) > 0) out.push({ loc: `/guide/${c.slug}/`, lastmod: DATA[c.slug].checked || now, changefreq: 'monthly', priority: '0.6' });
  const dirA = all((l) => (l === 'he' ? '/directory/' : `/${l}/directory/`));
  for (const l of LANGS) out.push({ loc: dirA[l], alts: dirA, lastmod: now, priority: '0.7' });
  for (const c of CATEGORIES) out.push({ loc: `/directory/${c.slug}/`, lastmod: now, priority: '0.6' });
  for (const l of LISTINGS) out.push({ loc: listingUrl(l), lastmod: l.updated || l.created || now, priority: l.featured ? '0.6' : '0.5' });
  out.push({ loc: '/directory/join/', priority: '0.4' });
  for (const p of PLACES) if (ARTICLES.some((a) => placesOf(a).some((x) => x.slug === p.slug))) out.push({ loc: `/area/${p.slug}/`, lastmod: now, changefreq: 'daily', priority: '0.6' });
  for (const p of ['about', 'send-news', 'join']) { const a = all((l) => (l === 'he' ? `/${p}/` : `/${l}/${p}/`)); for (const l of LANGS) out.push({ loc: a[l], alts: a, priority: '0.4' }); }
  for (const p of ['editorial-policy', 'corrections', 'contact', 'advertise', 'terms', 'privacy', 'accessibility']) out.push({ loc: `/${p}/`, priority: '0.3' });
  return out;
}
