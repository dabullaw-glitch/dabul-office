import { ARTICLES, articleUrl, liveSections, picOf, kickerOf } from '../lib/content';
import { CATEGORIES } from '../data/directory';
import { SECTION_BY_KEY } from '../data/sections';
// The search index of /search/: u address, t title, d summary, k extra words; for stories also s (the colored line above the
// title), c (section color), p (published) and i (small picture), so the results look like the cards of the site.
export function GET() {
  const idx = [
    ...ARTICLES.map((a) => ({ u: articleUrl(a), t: a.title, d: a.dek, k: [...a.tags, ...a.neighborhoods, SECTION_BY_KEY[a.section].name.he, a.kicker || ''].join(' '),
      s: kickerOf(a), c: SECTION_BY_KEY[a.section].color, p: a.published, i: picOf(a).small })),
    ...CATEGORIES.map((c) => ({ u: `/directory/${c.slug}/`, t: `${c.plural} בנתניה`, d: c.tips[0], k: c.he, s: 'בעלי מקצוע', c: c.color })),
    ...liveSections().map((s) => ({ u: `/${s.slug}/`, t: s.name.he, d: s.desc, k: s.title, s: 'מדור', c: s.color })),
    { u: '/now/shabbat/', t: 'זמני שבת בנתניה', d: 'הדלקת נרות וצאת שבת', k: 'שבת נרות הבדלה', s: 'נתניה עכשיו', c: '#0D1321' },
    { u: '/now/beaches/', t: 'החופים של נתניה', d: 'חופים מוכרזים ושעות הצלה', k: 'ים חוף רחצה', s: 'נתניה עכשיו', c: '#0D1321' },
    { u: '/now/pharmacy/', t: 'בית מרקחת תורן בנתניה', d: 'מי תורן היום', k: 'תרופות לילה', s: 'נתניה עכשיו', c: '#0D1321' },
    { u: '/now/phones/', t: 'טלפונים חיוניים בנתניה', d: 'מוקד עירוני ומספרי חירום', k: '106 משטרה מדא', s: 'נתניה עכשיו', c: '#0D1321' },
    { u: '/now/roads/', t: 'חסימות ועבודות כביש בנתניה', d: 'מה סגור עכשיו בעיר ועד מתי', k: 'כבישים חסימה עבודות תנועה', s: 'נתניה עכשיו', c: '#0D1321' },
    { u: '/netanya/', t: 'נתניה: מדריך העיר', d: 'החופים, האירועים, השכונות והטלפונים החשובים', k: 'שכונות חופים מדריך', s: 'מדריך', c: '#0D1321' },
  ];
  return new Response(JSON.stringify(idx), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
