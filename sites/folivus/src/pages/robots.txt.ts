import { PREVIEW } from '../config/brand';
import { abs } from '../config/routes';
export function GET() {
  const body = PREVIEW
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /search-index.json\nDisallow: /tool-modules/\n\nSitemap: ${abs('sitemap.xml')}\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
