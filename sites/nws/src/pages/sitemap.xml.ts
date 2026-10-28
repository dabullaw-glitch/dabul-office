import { SITE_URL } from '../data/site';
export function GET() {
  const now = new Date().toISOString();
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n<sitemap><loc>${SITE_URL}/sitemap-pages.xml</loc><lastmod>${now}</lastmod></sitemap>\n<sitemap><loc>${SITE_URL}/news-sitemap.xml</loc><lastmod>${now}</lastmod></sitemap>\n</sitemapindex>\n`;
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
