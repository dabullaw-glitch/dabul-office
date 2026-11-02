// One place for the brand, menus, regions and packages.

export const SITE = {
  name: 'פוליבוס',
  tagline: 'מדריך עורכי הדין בישראל',
  description: 'מאגר עורכי דין לפי תחום ועיר, עם ציון שקוף, חוות דעת מאומתות של לקוחות ומדריכים בשפה פשוטה.',
  preview: process.env.PREVIEW !== '0',
  // the directory engine: one database function, POST {a, p} (sql/dir_api.sql). The key is the public (publishable) one.
  dir: 'https://mgjmnvpnovkewvqevjmz.supabase.co/rest/v1/rpc/dir_api',
  dirKey: 'sb_publishable_VlbYeA-oSqVs28QSWXtwJA_VoMt8p6j',
  barUrl: 'https://www.israelbar.org.il/',
};

export const NAV = [
  { href: 'orchei-din/', label: 'תחומים' },
  { href: 'ir/', label: 'ערים' },
  { href: 'nivcheret/', label: 'הנבחרת' },
  { href: 'maamarim/', label: 'מדריכים' },
  { href: 'shita/', label: 'איך מדרגים' },
];

export const REGIONS = [
  { slug: 'merkaz', he: 'מרכז', blurb: 'תל אביב, גוש דן, השפלה ועד מודיעין.' },
  { slug: 'sharon', he: 'שרון', blurb: 'נתניה, כפר סבא, רעננה, הרצליה, חדרה והיישובים שביניהן.' },
  { slug: 'yerushalayim', he: 'ירושלים', blurb: 'ירושלים, בית שמש ומעלה אדומים.' },
  { slug: 'tzafon', he: 'צפון', blurb: 'חיפה והקריות, הגליל, העמקים ואזור זכרון יעקב.' },
  { slug: 'darom', he: 'דרום', blurb: 'באר שבע, אשדוד, אשקלון, הנגב ואילת.' },
] as const;

// DRAFT packages, shown as launch prices. Payment is not connected yet: the form sends a request only.
export const PACKAGES = [
  {
    id: 'free', name: 'בסיסי', price: 'חינם', yearly: '',
    items: ['כרטיס משרד באתר', 'תחום עיסוק אחד', 'עיר אחת', 'טלפון ליצירת קשר'],
  },
  {
    id: 'pro', name: 'מקצועי', price: '149 ₪ לחודש', yearly: 'או 1,490 ₪ לשנה',
    items: ['תמונה ותיאור המשרד במילים שלכם', 'עד 3 תחומים ו־3 ערים', 'כפתור וואטסאפ', 'טופס פנייה שמגיע למייל שלכם', 'הצגה עם תווית "מקודם" בעמוד תחום אחד'],
  },
  {
    id: 'premium', name: 'פרימיום', price: '349 ₪ לחודש', yearly: 'או 3,490 ₪ לשנה',
    items: ['כל מה שבמקצועי', 'ראש הרשימה (עם תווית "מקודם") ב־3 עמודי תחום או עיר', 'הצגה בבלוק המקודמים בעמוד הבית', 'כתבה ממומנת אחת בשנה, מסומנת כמודעה'],
  },
];
export const RANK_FEE = '990 ₪ לתחום לשנה';
