// llms.txt: a short map of the site for AI assistants (GEO). Brand from config.
import { BRAND } from '../config/brand';
import { abs, P } from '../config/routes';
import { areas, articles, tools, courts } from '../lib/data';
export function GET() {
  const L = (t: string, p: string, d = '') => `- [${t}](${abs(p)})${d ? ': ' + d : ''}`;
  const body = `# ${BRAND.name} (${BRAND.nameLatin})

> ${BRAND.description}

האתר הוא מדריך עצמאי. הוא אינו משרד עורכי דין, אינו נותן ייעוץ משפטי, אינו מתווך ואינו מעביר פניות. פרטי המשרדים הם פרטים עסקיים ממקורות ציבוריים ומהמשרדים עצמם ואינם המלצה. משרד ששילם על מיקום בולט מסומן "משרד מקודם"; הדירוג אינו ניתן לרכישה. בכל מדריך יש מקורות רשמיים ותאריך עדכון.

## עמודים מרכזיים
${L('כל תחומי המשפט', P.page('areas'))}
${L('עורכי דין לפי עיר', P.page('cities'))}
${L('מדריכים ומאמרים', P.page('articles'))}
${L('כלים חינמיים', P.page('tools'))}
${L('בתי משפט', P.page('courts'))}
${L('איך בנויות הרשימות והדירוג', P.page('method'))}
${L('מדיניות עריכה', P.page('editorial'))}

## תחומי משפט
${areas().map((a) => L(a.title, P.area(a.he), a.intro)).join('\n')}

## כלים
${tools().map((t) => L(t.name, P.tool(t.he), t.description)).join('\n')}

## מאמרים
${articles().slice(0, 60).map((a) => L(a.title, P.article(a.he), a.description)).join('\n')}

## בתי משפט
${courts().map((c) => L(c.name, P.court(c.he))).join('\n')}
`;
  return new Response(body, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
