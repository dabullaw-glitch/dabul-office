// Sitemap index: one child sitemap per page type.
import { abs } from '../config/routes';
import { sitemapGroups } from '../lib/urls';
export async function GET() {
  const g = await sitemapGroups();
  const now = new Date().toISOString().slice(0, 10);
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    Object.keys(g).filter((k) => g[k].length).map((k) => `  <sitemap><loc>${abs('sitemaps/' + k + '.xml')}</loc><lastmod>${now}</lastmod></sitemap>`).join('\n') + '\n</sitemapindex>\n';
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
