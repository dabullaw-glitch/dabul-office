import { indexable } from '../lib/urls';
export async function GET(ctx: { site: URL }) {
  const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const rows = await indexable();
  const body = rows.map(([p, m]) => `<url><loc>${new URL(B + p, ctx.site).href}</loc><lastmod>${m}</lastmod></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
