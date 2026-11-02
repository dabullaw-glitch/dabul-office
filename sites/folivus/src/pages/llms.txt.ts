import { getCollection } from 'astro:content';
import { SITE, REGIONS } from '../data/site';
import { AREAS, GROUPS, counts } from '../lib/data';
import { AREA_INFO } from '../data/areaInfo';
// llms.txt: a plain map of the site for AI assistants (GEO)
export async function GET(ctx: { site: URL }) {
  const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const u = (p: string) => new URL(B + p, ctx.site).href;
  const c = await counts();
  const arts = (await getCollection('maamarim')).filter((a) => !a.data.draft);
  let t = `# ${SITE.name} (Folivus)\n\n> ${SITE.description}\n\n`;
  t += `מאגר עורכי דין בישראל לפי תחום עיסוק, עיר ואזור. לכל עורך דין יש ציון בין 0 ל-100 שמחושב בשיטה פומבית (חוות דעת מאומתות 50, שנות רישיון 15, שלמות פרופיל 15, מענה לפניות 10, הכרה מקצועית 10). תשלום לא משנה את הציון, ומיקום מקודם מסומן תמיד. חלק מהפרופילים נבנו ממקורות ציבוריים ומסומנים כך. האתר אינו משרד עורכי דין ואינו נותן ייעוץ משפטי.\n\n`;
  t += `- [איך מחושב הציון](${u('shita/')})\n- [נבחרת פוליבוס, דירוג שנתי](${u('nivcheret/')})\n- [כל התחומים](${u('orchei-din/')})\n- [כל הערים](${u('ir/')})\n\n`;
  for (const g of GROUPS) {
    t += `## ${g}\n\n` + AREAS.filter((a) => a.group === g).map((a) => `- [עורכי דין ל${a.he}](${u('orchei-din/' + a.slug + '/')}): ${AREA_INFO[a.slug]?.blurb || ''}${c.area[a.slug] ? ` (${c.area[a.slug]} עורכי דין)` : ''}`).join('\n') + '\n\n';
  }
  t += `## אזורים\n\n` + REGIONS.map((r) => `- [אזור ${r.he}](${u('ezor/' + r.slug + '/')}): ${r.blurb}`).join('\n') + '\n\n';
  t += `## מדריכים\n\n` + arts.map((a) => `- [${a.data.title}](${u('maamarim/' + a.id + '/')}): ${a.data.description}`).join('\n') + '\n';
  return new Response(t, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
