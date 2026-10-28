import { SITE_URL, PREVIEW } from '../data/site';
export function GET() {
  const body = PREVIEW ? 'User-agent: *\nDisallow: /\n' :
`User-agent: *
Allow: /
Disallow: /search/

User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
User-agent: Google-Extended
Allow: /
Disallow: /search/

Sitemap: ${SITE_URL}/sitemap.xml
Sitemap: ${SITE_URL}/news-sitemap.xml
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
