// The lawyer portal (orchei-din/): topics, regions, packages and the directory engine address.
// The engine is one database function (dir_api) shared with another front end; this site always sends site: 'blihovot'.

export const DIR = {
  url: 'https://mgjmnvpnovkewvqevjmz.supabase.co/rest/v1/rpc/dir_api',
  // the public (publishable) key, safe in the browser
  key: 'sb_publishable_VlbYeA-oSqVs28QSWXtwJA_VoMt8p6j',
  site: 'blihovot',
  barUrl: 'https://www.israelbar.org.il/',
};

// Three topics. The engine knows two areas: insolvency and enforcement. Debt settlements are handled by insolvency lawyers.
export const TOPICS = [
  {
    slug: 'hadlut-piraon', he: 'חדלות פירעון', area: 'insolvency', hub: 'hadlut-piraon',
    blurb: 'ליווי בהליך חדלות פירעון של יחיד: בקשה לצו פתיחת הליכים, תקופת הביניים, תוכנית פירעון והפטר.',
    when: 'כשהחובות גדולים מהיכולת לשלם, וכבר לא נראה שאפשר לסגור אותם בתשלומים.',
  },
  {
    slug: 'hesderei-hovot', he: 'הסדרי חובות', area: 'insolvency', hub: 'hesder-hov',
    blurb: 'משא ומתן עם בנקים, חברות אשראי ונושים אחרים להסדר תשלומים או להפחתת חוב, לפני הליך או במקומו.',
    when: 'כשיש הכנסה קבועה ורוצים לסגור את החובות בהסכם, בלי להיכנס להליך משפטי.',
  },
  {
    slug: 'hotzaa-lapoal', he: 'הוצאה לפועל', area: 'enforcement', hub: 'hotzaa-lapoal',
    blurb: 'תיקים בהוצאה לפועל: עיקולים, איחוד תיקים, צו תשלומים, התנגדות לביצוע ובקשות לרשם.',
    when: 'כשנפתח נגדכם תיק, הגיעה אזהרה, או שיש עיקול על חשבון או משכורת.',
  },
] as const;
export type Topic = (typeof TOPICS)[number];
export type TopicSlug = Topic['slug'];

export const REGIONS = [
  { slug: 'merkaz', he: 'מרכז', blurb: 'תל אביב, גוש דן, השפלה ועד מודיעין.' },
  { slug: 'sharon', he: 'שרון', blurb: 'נתניה, כפר סבא, רעננה, הרצליה, חדרה והיישובים שביניהן.' },
  { slug: 'yerushalayim', he: 'ירושלים', blurb: 'ירושלים, בית שמש ומעלה אדומים.' },
  { slug: 'tzafon', he: 'צפון', blurb: 'חיפה והקריות, הגליל, העמקים ואזור זכרון יעקב.' },
  { slug: 'darom', he: 'דרום', blurb: 'באר שבע, אשדוד, אשקלון, הנגב ואילת.' },
] as const;

// The score method (also explained on orchei-din/shita/). Paid plans never change it.
export const SCORE_PARTS = [
  { k: 'reviews', label: 'חוות דעת מאומתות (ממוצע וכמות)', max: 50 },
  { k: 'years', label: 'שנות רישיון', max: 15 },
  { k: 'profile', label: 'שלמות הפרופיל', max: 15 },
  { k: 'response', label: 'מענה לפניות', max: 10 },
  { k: 'recognition', label: 'הכרה מקצועית', max: 10 },
] as const;

// DRAFT packages for lawyers, shown as launch prices. Payment is not connected yet: the form sends a request only.
export const PACKAGES = [
  {
    id: 'free', name: 'בסיסי', price: 'חינם', yearly: '',
    items: ['כרטיס משרד ברשימה', 'תחום אחד ועיר אחת', 'טלפון ליצירת קשר', 'ציון וחוות דעת מאומתות כמו לכולם'],
  },
  {
    id: 'pro', name: 'מקצועי', price: '149 ₪ לחודש', yearly: 'או 1,490 ₪ לשנה',
    items: ['תמונה ותיאור המשרד במילים שלכם', 'כל 3 התחומים ועד 3 ערים', 'כפתור וואטסאפ', 'פניות מהטופס ישירות למייל שלכם', 'הצגה עם תווית "מקודם" בעמוד תחום אחד'],
  },
  {
    id: 'premium', name: 'פרימיום', price: '349 ₪ לחודש', yearly: 'או 3,490 ₪ לשנה',
    items: ['כל מה שבמקצועי', 'ראש הרשימה (עם תווית "מקודם") ב־3 עמודי תחום או עיר', 'הצגה בעמוד הראשי של עורכי הדין, עם תווית "מקודם"', 'כתבה ממומנת אחת בשנה, מסומנת כתוכן ממומן'],
  },
];

// Guides that show the short "find a lawyer in your area" box (only where it is natural), and which topic it opens.
export const GUIDE_LAWYER_BOX: Record<string, TopicSlug> = {
  'ma-ze-hadlut-piraon': 'hadlut-piraon', 'bakashat-noshe': 'hadlut-piraon', 'mismachim-bakasha-hadlut': 'hadlut-piraon',
  'yom-hadiyun': 'hadlut-piraon', 'saf-hovot': 'hadlut-piraon', 'tzav-ptichat-halichim': 'hadlut-piraon', atzmai: 'hadlut-piraon',
  'hesder-im-noshim': 'hesderei-hovot', 'masa-umatan-bank': 'hesderei-hovot', 'hashvaat-maslulim': 'hesderei-hovot',
  'azhara-hotzaa-lapoal': 'hotzaa-lapoal', hitnagdut: 'hotzaa-lapoal', 'ichud-tikim': 'hotzaa-lapoal', 'ikul-osh': 'hotzaa-lapoal', 'ikul-maskoret': 'hotzaa-lapoal',
};
