import { SITE_URL } from '../data/site';
import { routes } from '../lib/routes';
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function GET() {
  const urls = routes().map((r) => {
    const alts = r.alts ? Object.entries(r.alts).map(([l, p]) => `<xhtml:link rel="alternate" hreflang="${l}" href="${SITE_URL}${p}"/>`).join('') + (r.alts.he ? `<xhtml:link rel="alternate" hreflang="x-default" href="${SITE_URL}${r.alts.he}"/>` : '') : '';
    const imgs = (r.images || []).map((i) => `<image:image><image:loc>${SITE_URL}${i.loc}</image:loc></image:image>`).join('');
    return `<url><loc>${SITE_URL}${r.loc}</loc>${r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : ''}${r.changefreq ? `<changefreq>${r.changefreq}</changefreq>` : ''}${r.priority ? `<priority>${r.priority}</priority>` : ''}${alts}${imgs}</url>`;
  }).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls}\n</urlset>\n`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
