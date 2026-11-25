import { BRAND } from '../config/brand';
import { abs, P } from '../config/routes';
import { articles } from '../lib/data';
export function GET() {
  const x = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = articles().slice(0, 30).map((a) => `    <item>
      <title>${x(a.title)}</title>
      <link>${abs(P.article(a.he))}</link>
      <guid isPermaLink="true">${abs(P.article(a.he))}</guid>
      <description>${x(a.description)}</description>
      ${a.published ? `<pubDate>${a.published.toUTCString()}</pubDate>` : ''}
    </item>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${x(BRAND.name)}: מדריכים ומאמרים</title>
    <link>${abs('')}</link>
    <description>${x(BRAND.description)}</description>
    <language>he-IL</language>
    <atom:link href="${abs('rss.xml')}" rel="self" type="application/rss+xml" />
${items}
  </channel>
</rss>
`;
  return new Response(body, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
