// Build-time course catalog: plans (prices), courses and lessons from the database (public read, row level security).
// Used by the home page "קורסים" section, /kursim/ and /kursim/<slug>/. Prices come from too_plans on every build, so a
// price change in the database shows on the site after the next build (the site rebuilds on every push and twice a day).
// If the database cannot be reached (a local build without network), a snapshot in src/data/catalog-fallback.json is used.
import { SB_URL, SB_KEY } from './const.js';
import FALLBACK from '../data/catalog-fallback.json';

// Page address and a few hand-written lines per course. A new single course (a too_plans row of kind 'module') still
// appears without an entry here, with the address kurs-<id> and its subtitle from the database.
const MAIN = {
  slug: 'hakurs-hamale',
  forWho: 'לעצמאים ולבעלי עסקים קטנים שעושים הכל לבד, ורוצים שהפניות, התוכן והשיווק יתקדמו גם כשהם עסוקים בעבודה עצמה. לא צריך ניסיון טכני.',
  desc: 'בכל פרק בונים חבר צוות אחד: מזכירה שעונה לפניות, כותב מאמרים, איש קידום, מנהל רשתות, עורך וידאו ועוד. כל פרק נגמר בתהליך שעובד אצלכם, ואתם מאשרים כל דבר לפני שהוא יוצא.',
};
const SINGLE = {
  11: { slug: 'pniyot-mgoogle', forWho: 'למי שיש לו אתר, או שבונה אחד, ורוצה שאנשים שמחפשים בגוגל את השירות שלו יגיעו אליו.',
    desc: 'מחקר של מה שהלקוחות שלכם מחפשים, עמודי שירות ועמוד לכל עיר, ומאמר בשבוע מהשאלה עד הפרסום.' },
  12: { slug: 'sratonim', forWho: 'למי שרוצה סרטונים קבועים לרשתות, אבל אין לו זמן או חשק לעמוד מול מצלמה כל שבוע.',
    desc: 'דמות דיגיטלית וקול, תסריט עם פתיחה, תוכן וסיום, ועריכה עם כתוביות ותמונת שער.' },
  13: { slug: 'otomatziot', forWho: 'למי שעושה את אותן משימות שוב ושוב כל שבוע, ורוצה שהן ירוצו לבד, עם אישור שלו.',
    desc: 'מפה של המשימות שחוזרות כל שבוע, פנייה מהאתר שמגיעה לטבלה ולטלפון, טיוטה שמחכה לאישור ודוח שבועי.' },
  14: { slug: 'shivuk-shutafim', forWho: 'למי שרוצה לבנות אתר תוכן קטן בתחום שהוא מכיר, ולהמליץ בו על מוצרים דרך קישורי שותפים.',
    desc: 'בחירת נושא ומוצרים שאתם מכירים באמת, אתר תוכן קטן, סקירות והשוואות בלי להמציא ניסיון, ומדידה של כל עסקה.' },
};

async function get(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
  if (!r.ok) throw new Error(path + ' ' + r.status);
  return r.json();
}

let cache = null;
export function getCatalog() {
  if (!cache) cache = load();
  return cache;
}

async function load() {
  let raw;
  try {
    const [plans, modules, lessons, intro] = await Promise.all([
      get('too_plans?active=eq.true&select=code,name,kind,price_ils,bonus_sub_months,perks,module_id,sort&order=sort'),
      get('too_modules?published=eq.true&select=id,n,title,sub,outcome&order=n'),
      get('too_lessons?published=eq.true&kind=eq.lesson&select=module_id,n,title,duration_min,kind&order=module_id,n'),
      get('too_settings?key=eq.intro_offer&select=value'),
    ]);
    if (!plans.length || !modules.length) throw new Error('empty');
    raw = { plans, modules, lessons, intro: intro[0] ? intro[0].value : null, source: 'db' };
  } catch (e) {
    console.warn('[catalog] database not reachable, using the snapshot in src/data/catalog-fallback.json:', e.message);
    raw = { ...FALLBACK, source: 'snapshot' };
  }
  return build(raw);
}

export const ils = (n) => (Number(n) || 0).toLocaleString('he-IL') + ' ₪';
export function fmtTime(min) {
  const h = Math.floor(min / 60), m = min % 60;
  const hh = h === 1 ? 'שעה' : h === 2 ? 'שעתיים' : `${h} שעות`;
  if (!h) return `${m} דקות`;
  return m ? `${hh} ו-${m} דקות` : hh;
}
const cleanTitle = (t) => String(t || '').replace(/^קורס:\s*/, '');

function build({ plans, modules, lessons, intro }) {
  const byMod = (id) => lessons.filter((l) => l.module_id === id && (l.kind || 'lesson') === 'lesson').map((l) => ({ n: l.n, title: l.title, min: Number(l.duration_min) || 0 }));
  const sum = (ls) => ls.reduce((a, l) => a + l.min, 0);
  const plan = (code) => plans.find((p) => p.code === code);
  const course = plan('course'), monthly = plan('monthly');
  const introOn = intro && intro.active && intro.plan === 'monthly' && intro.price !== undefined && intro.price !== null;

  const singlePlans = plans.filter((p) => p.kind === 'module' && Number(p.price_ils) > 0 && modules.some((m) => m.id === p.module_id));
  const singleIds = new Set(singlePlans.map((p) => p.module_id));
  const chapters = modules.filter((m) => !singleIds.has(m.id)).map((m) => {
    const ls = byMod(m.id);
    return { n: m.n, title: m.title, sub: m.sub, outcome: m.outcome, lessons: ls, min: sum(ls) };
  });

  const monthlyOffer = (single) => monthly && {
    code: 'monthly', title: single ? 'כלול במנוי החודשי' : 'מנוי חודשי',
    price: introOn ? ils(intro.price) : ils(monthly.price_ils), unit: introOn ? 'לחודש הראשון' : 'לחודש',
    note: (introOn ? `אחר כך ${ils(monthly.price_ils)} לחודש. ` : '') + 'כולל את כל הקורסים באתר, וכל מה שחדש. מבטלים בכל חודש.',
    btn: introOn ? `מצטרפים ב-${ils(intro.price)}` : 'להצטרפות למנוי',
    aria: `מנוי חודשי${introOn ? `, החודש הראשון ב-${ils(intro.price)}` : ''}, ואחר כך ${ils(monthly.price_ils)} לחודש. להצטרפות`,
    perks: monthly.perks || [],
  };

  const courses = [];
  if (course) {
    const all = chapters.flatMap((c) => c.lessons);
    courses.push({
      slug: MAIN.slug, kind: 'main', moduleId: null,
      title: `הקורס המלא: צוות שלם, ${chapters.length} פרקים`, short: 'הקורס המלא', sub: 'בונים צוות שלם של בינה מלאכותית לעסק, פרק אחרי פרק',
      forWho: MAIN.forWho, desc: MAIN.desc,
      outcomes: chapters.map((c) => c.outcome), chapters, lessons: all, lessonCount: all.length, min: sum(all),
      perks: course.perks || [],
      offers: [
        { code: 'course', title: 'הקורס המלא', price: ils(course.price_ils), unit: 'תשלום אחד',
          note: 'גישה לכל החיים' + (course.bonus_sub_months ? `, כולל ${course.bonus_sub_months} חודשי מנוי במתנה.` : '.'),
          btn: 'לרכישת הקורס המלא', aria: `הקורס המלא, ${ils(course.price_ils)} בתשלום אחד. לרכישה`, primary: true },
        monthlyOffer(false),
      ].filter(Boolean),
    });
  }
  for (const p of singlePlans) {
    const m = modules.find((x) => x.id === p.module_id), extra = SINGLE[m.id] || {};
    const ls = byMod(m.id);
    const title = cleanTitle(m.title) || p.name;
    courses.push({
      slug: extra.slug || `kurs-${m.id}`, kind: 'single', moduleId: m.id,
      title, short: title, sub: m.sub, forWho: extra.forWho || '', desc: extra.desc || m.sub,
      outcomes: [m.outcome].filter(Boolean), lessons: ls, lessonCount: ls.length, min: sum(ls),
      perks: p.perks || [],
      offers: [
        { code: p.code, title: 'קורס בודד', price: ils(p.price_ils), unit: 'תשלום אחד', note: 'גישה לכל החיים לקורס הזה.',
          btn: `קורס בודד: ${p.price_ils} ש"ח, גישה לכל החיים`, aria: `קורס בודד: ${p.price_ils} ש"ח, גישה לכל החיים. רכישת הקורס ${title}`, primary: true },
        monthlyOffer(true),
      ].filter(Boolean),
    });
  }
  courses.forEach((c, i) => { c.idx = i + 1; c.time = fmtTime(c.min); c.from = c.offers[0] ? c.offers[0].price : ''; });
  const totalLessons = courses.reduce((a, c) => a + c.lessonCount, 0), totalMin = courses.reduce((a, c) => a + c.min, 0);
  return {
    courses, totalLessons, totalMin, totalHours: Math.floor(totalMin / 60),
    course: course && { price: ils(course.price_ils), raw: Number(course.price_ils), bonus: course.bonus_sub_months || 0 },
    monthly: monthly && { price: ils(monthly.price_ils), intro: introOn ? ils(intro.price) : null },
    single: singlePlans.length ? { price: ils(Math.min(...singlePlans.map((p) => p.price_ils))), same: new Set(singlePlans.map((p) => p.price_ils)).size === 1 } : null,
  };
}

// One course teaser card (home page section and "more courses" on a course page). Plain HTML, so the home page can use it.
const escH = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function teaserHtml(c, base, extraClass = 'reveal') {
  const n = String(c.idx).padStart(2, '0');
  return `<a class="kt${c.kind === 'main' ? ' main' : ''} ${extraClass}" href="${base}kursim/${c.slug}/">
    <span class="kt-top"><span class="kt-n" aria-hidden="true">${n}</span><em>${c.kind === 'main' ? 'הקורס המלא' : 'קורס ממוקד'}</em></span>
    <h3>${escH(c.title)}</h3>
    <span class="kt-sub">${escH(c.sub)}</span>
    <span class="kt-meta">${c.lessonCount} שיעורים · ${escH(c.time)}</span>
    <span class="kt-foot"><span class="kt-pr"><b>${escH(c.from)}</b> או במנוי</span><span class="kt-go">לפרטים <span aria-hidden="true">←</span></span></span>
  </a>`;
}
