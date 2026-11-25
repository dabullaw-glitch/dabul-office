// Indexable URLs per type, for the sitemaps and llms.txt. Pages that carry noindex are left out.
import { P } from '../config/routes';
import { areas, cities, firms, articles, tools, courts, isoDate } from './data';
export type Entry = { path: string; lastmod?: string; title?: string };
export async function sitemapGroups(): Promise<Record<string, Entry[]>> {
  const fs = await firms();
  const now = new Date().toISOString().slice(0, 10);
  const ac: Entry[] = [];
  for (const a of areas()) for (const c of cities()) if (fs.some((f) => f.city === c.slug && f.areas.includes(a.slug))) ac.push({ path: P.areaCity(a.he, c.he), title: `${a.title} ב${c.name}` });
  return {
    pages: [
      { path: '', lastmod: now, title: 'דף הבית' },
      ...(['areas', 'cities', 'tools', 'articles', 'courts', 'join', 'claim', 'removal', 'contact', 'about', 'editorial', 'method', 'terms', 'privacy', 'a11y', 'cookies'] as const).map((k) => ({ path: P.page(k) })),
    ],
    areas: areas().map((a) => ({ path: P.area(a.he), lastmod: isoDate(a.guide?.updated || null), title: a.title })),
    'area-cities': ac,
    cities: cities().filter((c) => fs.some((f) => f.city === c.slug)).map((c) => ({ path: P.city(c.he), title: 'עורכי דין ב' + c.name })),
    firms: fs.map((f) => ({ path: P.firm(f.slug), title: f.name })),
    articles: articles().map((a) => ({ path: P.article(a.he), lastmod: isoDate(a.updated), title: a.title })),
    tools: tools().map((t) => ({ path: P.tool(t.he), lastmod: isoDate(t.updated), title: t.name })),
    courts: courts().map((c) => ({ path: P.court(c.he), lastmod: isoDate(c.updated), title: c.name })),
  };
}
