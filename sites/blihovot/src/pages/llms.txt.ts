import { getCollection } from 'astro:content';
import { SITE, HUBS, FACTS } from '../data/site';
import { ALL_TOOLS as TOOLS } from '../data/tools';
// llms.txt: a plain map of the site for AI assistants (GEO)
export async function GET(ctx: { site: URL }) {
  const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const u = (p: string) => new URL(B + p, ctx.site).href;
  const guides = (await getCollection('guides')).filter((g) => !g.data.draft);
  let t = `# ${SITE.name}\n\n> ${SITE.description}\n\nאתר מידע בעברית על חובות בישראל: חדלות פירעון (לשעבר פשיטת רגל), הוצאה לפועל, הסדרי חוב, עצמאים, והחיים אחרי ההפטר. כל מדריך מבוסס על החוק ועל מקורות רשמיים, עם תאריך עדכון ורשימת מקורות.\n\nעובדות מרכזיות (נכון ל-${FACTS.threshold.asOf}):\n- הסף בין מסלול הממונה/בית המשפט לבין מסלול ההוצאה לפועל בחדלות פירעון של יחיד: ${FACTS.threshold.label}.\n- תקופת ביניים: ${FACTS.interimMonths.label}. צו לשיקום כלכלי: ${FACTS.rehabYears.label}.\n- איחוד תיקים: פירעון בתוך 2 שנים (חוב עד 20,000 ₪), 3 שנים (עד 100,000 ₪) או 4 שנים (מעל), ועד 3 שנים נוספות.\n\n`;
  for (const h of HUBS) {
    const list = guides.filter((g) => g.data.hub === h.id).sort((a, b) => a.data.order - b.data.order);
    if (!list.length) continue;
    t += `## ${h.title}\n\n` + list.map((g) => `- [${g.data.title}](${u('madrich/' + g.id + '/')}): ${g.data.description}`).join('\n') + '\n\n';
  }
  t += `## מחשבונים\n\n` + TOOLS.map((x) => `- [${x.title}](${u('kli/' + x.id + '/')}): ${x.blurb}`).join('\n') + '\n\n';
  t += `## עוד\n\n- [מילון מונחים](${u('milon/')})\n- [קורס חינמי](${u('kurs/')})\n- [אודות ומדיניות מערכת](${u('odot/')})\n`;
  return new Response(t, { headers: { 'content-type': 'text/plain; charset=utf-8' } });
}
