// The city guide "שימושון עירוני" (29.10.2026, Yakir: "something like this for every place in Netanya").
// Each list category has a file src/data/city/<slug>.json: { checked, note?, items: Entry[] }. Every item keeps its source
// (an official page, data.gov.il or OpenStreetMap) and only facts that source states. A category without items is not
// shown in the menu and gets no page. Categories with href point to an existing live page of the site.
export type Entry = { name: string; kind?: string; area?: string; address?: string; phone?: string; hours?: string; website?: string; notes?: string; source?: string; srcName?: string };
export type Cat = { slug: string; name: string; h1?: string; icon: string; intro: string; href?: string; color: string; img?: string; filter?: boolean };
export const CATS: Cat[] = [
  { slug: 'service-centers', name: 'תשלומים ומוקדי שירות', icon: 'calc', color: '#6D3FC0', intro: 'איפה משלמים ארנונה ומים, ואיפה מקבלים שירות מהעירייה ומתאגיד המים.' },
  { slug: 'post', name: 'סניפי דואר בנתניה', icon: 'mail', color: '#C8102E', intro: 'כל סניפי הדואר בעיר, עם כתובת ושעות פתיחה לפי דואר ישראל.', filter: true },
  { slug: 'phones', name: 'רשימת טלפונים חיוניים', icon: 'phone', color: '#7A5600', intro: '', href: '/now/phones/' },
  { slug: 'gov', name: 'משרדי ממשלה בנתניה', icon: 'scale', color: '#3B4656', intro: 'ביטוח לאומי, משרד הפנים, שירות התעסוקה, בתי משפט ועוד: מה יש בנתניה ואיפה.' },
  { slug: 'banks', name: 'בנקים בנתניה', icon: 'bank', color: '#0B5FCC', intro: 'סניפי הבנקים בנתניה, לפי הרשימה הרשמית של בנק ישראל.', filter: true },
  { slug: 'shabbat', name: 'זמני כניסת שבת', icon: 'candle', color: '#7A5600', intro: '', href: '/now/shabbat/' },
  { slug: 'pharmacy', name: 'בית מרקחת תורן בנתניה', icon: 'plus', color: '#17803F', intro: '', href: '/now/pharmacy/' },
  { slug: 'kupot', name: 'קופות חולים בנתניה', icon: 'heart', color: '#C2410C', intro: 'מרפאות ומרכזים רפואיים של כללית, מכבי, מאוחדת ולאומית בנתניה, ומוקדי רפואה דחופה.', filter: true },
  { slug: 'hospitals', name: 'בתי חולים באזור נתניה', icon: 'plus', color: '#9B1C1C', intro: 'בית החולים בנתניה ובתי החולים הקרובים, עם כתובת וטלפון.' },
  { slug: 'transport', name: 'תחבורה ציבורית בנתניה', icon: 'road', color: '#0F6E8C', intro: 'תחנות רכבת, התחנה המרכזית, מפעילי האוטובוסים ומידע לתכנון נסיעה.' },
  { slug: 'ngo', name: 'עמותות וארגונים בנתניה', icon: 'heart', color: '#B4286B', intro: 'ארגוני התנדבות, הצלה וסיוע שפועלים בנתניה.' },
  { slug: 'synagogues', name: 'בתי כנסת בנתניה', icon: 'candle', color: '#7A5600', intro: 'בתי כנסת בנתניה לפי שכונה.', filter: true },
  { slug: 'schools', name: 'בתי ספר בנתניה', icon: 'school', color: '#1F5FBF', intro: 'בתי הספר בנתניה לפי הנתונים של משרד החינוך.', filter: true },
  { slug: 'matnasim', name: 'מתנ״סים בנתניה', icon: 'home', color: '#17803F', intro: 'המרכזים הקהילתיים בשכונות נתניה.', filter: true },
  { slug: 'libraries', name: 'ספריות בנתניה', icon: 'book', color: '#5B3FA8', intro: 'הספריות העירוניות וסניפיהן.' },
  { slug: 'beaches', name: 'חופי נתניה', icon: 'wave', color: '#0B6FA4', intro: '', href: '/now/beaches/' },
  { slug: 'map', name: 'מפת העיר נתניה', icon: 'compass', color: '#0F7C7C', intro: 'מפות רשמיות ופתוחות של נתניה.' },
  { slug: 'neighborhoods', name: 'שכונות בנתניה', icon: 'pin', color: '#0F7C7C', intro: 'השכונות של נתניה.', filter: true },
];
const files = import.meta.glob('./*.json', { eager: true }) as Record<string, any>;
export const DATA: Record<string, { checked?: string; note?: string; items: Entry[] }> = Object.fromEntries(
  Object.entries(files).map(([p, m]) => [p.replace(/^\.\/|\.json$/g, ''), (m as any).default ?? m]));
export const guideHref = (c: Cat) => c.href || `/guide/${c.slug}/`;
export const liveCats = () => CATS.filter((c) => c.href || (DATA[c.slug]?.items?.length ?? 0) > 0);
