import { abs } from '../../config/routes';
import { sitemapGroups } from '../../lib/urls';
export async function getStaticPaths() {
  const g = await sitemapGroups();
  return Object.keys(g).filter((k) => g[k].length).map((type) => ({ params: { type }, props: { items: g[type] } }));
}
export function GET({ props }: { props: { items: { path: string; lastmod?: string }[] } }) {
  const x = (s: string) => s.replace(/&/g, '&amp;');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    props.items.map((e) => `  <url><loc>${x(abs(e.path))}</loc>${e.lastmod ? `<lastmod>${e.lastmod}</lastmod>` : ''}</url>`).join('\n') + '\n</urlset>\n';
  return new Response(body, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
