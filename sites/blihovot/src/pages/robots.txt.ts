import { SITE } from '../data/site';
export function GET(ctx: { site: URL }) {
  const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  // preview copies are hidden from search engines; the real domain is open to everyone, including AI assistants
  const body = SITE.preview ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\nDisallow: ${B}chipus/\n\nSitemap: ${new URL(B + 'sitemap.xml', ctx.site).href}\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
