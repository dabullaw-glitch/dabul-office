// Google News sitemap: articles from the last 48 hours (the engine rebuilds the site as news comes in).
import { SITE_URL, PREVIEW } from '../data/site';
import { ARTICLES, articleUrl, localized } from '../lib/content';
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function GET() {
  const cutoff = Date.now() - 48 * 3600e3;
  const recent = ARTICLES.filter((a) => PREVIEW || Date.parse(a.published) >= cutoff);
  const items: string[] = [];
  for (const a of recent) for (const l of ['he', 'ru', 'fr', 'en'] as const) {
    const t = localized(a, l); if (!t) continue;
    items.push(`<url><loc>${SITE_URL}${articleUrl(a, l)}</loc><news:news><news:publication><news:name>חדשות נתניה והשרון</news:name><news:language>${l}</news:language></news:publication><news:publication_date>${a.published}</news:publication_date><news:title>${x(t.title)}</news:title></news:news></url>`);
  }
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items.join('\n')}\n</urlset>\n`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
