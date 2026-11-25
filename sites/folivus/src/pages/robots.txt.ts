import { PREVIEW } from '../config/brand';
import { abs, SEG } from '../config/routes';
export function GET() {
  const body = PREVIEW
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nDisallow: /search-index.json\nDisallow: /tool-modules/\nDisallow: /commerce-targets.json\n${['order', 'portal', 'review', 'admin'].map((k) => 'Disallow: ' + encodeURI('/' + SEG[k as keyof typeof SEG] + '/')).join('\n')}\n\nSitemap: ${abs('sitemap.xml')}\n`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
