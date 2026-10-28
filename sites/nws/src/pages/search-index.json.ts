import { ARTICLES, articleUrl } from '../lib/content';
import { CATEGORIES } from '../data/directory';
import { SECTIONS } from '../data/sections';
export function GET() {
  const idx = [
    ...ARTICLES.map((a) => ({ u: articleUrl(a), t: a.title, d: a.dek, k: [...a.tags, ...a.neighborhoods].join(' ') })),
    ...CATEGORIES.map((c) => ({ u: `/directory/${c.slug}/`, t: `${c.plural} בנתניה`, d: c.tips[0], k: c.he })),
    ...SECTIONS.map((s) => ({ u: `/${s.slug}/`, t: s.name.he, d: s.desc, k: '' })),
    { u: '/now/shabbat/', t: 'זמני שבת בנתניה', d: 'הדלקת נרות וצאת שבת', k: 'שבת נרות הבדלה' },
    { u: '/now/beaches/', t: 'החופים של נתניה', d: 'חופים מוכרזים ושעות הצלה', k: 'ים חוף רחצה' },
    { u: '/now/pharmacy/', t: 'בית מרקחת תורן בנתניה', d: 'מי תורן היום', k: 'תרופות לילה' },
    { u: '/now/phones/', t: 'טלפונים חיוניים בנתניה', d: 'מוקד עירוני ומספרי חירום', k: '106 משטרה מדא' },
  ];
  return new Response(JSON.stringify(idx), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
