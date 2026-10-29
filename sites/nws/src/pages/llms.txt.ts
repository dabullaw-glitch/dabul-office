import { liveCats } from '../data/city/guide';
// llms.txt: a plain summary of the site for AI assistants and answer engines (GEO).
import { SITE_URL } from '../data/site';
import { SECTIONS } from '../data/sections';
import { CATEGORIES } from '../data/directory';
import { ARTICLES, articleUrl, liveSections } from '../lib/content';
export function GET() {
  const lines = [
    '# חדשות נתניה והשרון (Netanya & Sharon News)',
    '',
    '> אתר חדשות מקומי לנתניה ולשרון: מבזקים, עירייה, נדל״ן והתחדשות עירונית, ספורט, אירועים, נתונים שימושיים ומדריך בעלי מקצוע. אתר חדשות עצמאי, עם מדיניות עריכה ותיקונים גלויה. Local news for Netanya, Israel, in Hebrew, Russian, French and English.',
    '',
    '## Sections',
    ...liveSections().map((s) => `- [${s.name.he} / ${s.name.en}](${SITE_URL}/${s.slug}/): ${s.desc}`),
    '',
    '## Useful (updated automatically)',
    `- [נתניה עכשיו](${SITE_URL}/now/): live local data hub`,
    `- [זמני שבת בנתניה](${SITE_URL}/now/shabbat/): candle lighting and end of Shabbat, computed for Netanya`,
    `- [החופים של נתניה](${SITE_URL}/now/beaches/)`,
    `- [בית מרקחת תורן](${SITE_URL}/now/pharmacy/)`,
    `- [טלפונים חיוניים](${SITE_URL}/now/phones/)`,
    `- [שימושון עירוני](${SITE_URL}/guide/): city guide with addresses, phones and hours from official sources`,
    ...liveCats().filter((c) => !c.href).map((c) => `- [${c.name}](${SITE_URL}/guide/${c.slug}/)`),
    '',
    '## Business directory',
    ...CATEGORIES.map((c) => `- [${c.plural} בנתניה](${SITE_URL}/directory/${c.slug}/)`),
    '',
    '## Latest stories',
    ...ARTICLES.slice(0, 30).map((a) => `- [${a.title}](${SITE_URL}${articleUrl(a)}): ${a.dek}`),
    '',
    '## Trust',
    `- [About](${SITE_URL}/about/) · [Editorial policy](${SITE_URL}/editorial-policy/) · [Corrections](${SITE_URL}/corrections/)`,
    `- Other languages: [Русский](${SITE_URL}/ru/) · [Français](${SITE_URL}/fr/) · [English](${SITE_URL}/en/)`,
    '',
  ];
  return new Response(lines.join('\n'), { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
