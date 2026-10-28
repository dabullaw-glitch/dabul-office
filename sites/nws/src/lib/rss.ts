import { SITE_URL, BRAND, type Lang, LANG_PREFIX } from '../data/site';
import { SECTION_BY_KEY } from '../data/sections';
import { articlesFor, articleUrl } from './content';
const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export function rss(lang: Lang) {
  const items = articlesFor(lang).slice(0, 50).map((a) => `<item><title>${x(a.title)}</title><link>${SITE_URL}${articleUrl(a, lang)}</link><guid isPermaLink="true">${SITE_URL}${articleUrl(a, lang)}</guid><pubDate>${new Date(a.published).toUTCString()}</pubDate><category>${x(SECTION_BY_KEY[a.section].name[lang])}</category><description>${x(a.dek)}</description></item>`).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${x(BRAND.he)}</title><link>${SITE_URL}${LANG_PREFIX[lang]}/</link><atom:link href="${SITE_URL}${LANG_PREFIX[lang]}/rss.xml" rel="self" type="application/rss+xml"/><description>${x('חדשות נתניה והשרון')}</description><language>${lang}</language>\n${items}\n</channel></rss>\n`;
  return new Response(body, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
}
