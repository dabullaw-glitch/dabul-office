// One place for the brand, the menus and every number the site quotes.
// When a number changes (for example the yearly update of the insolvency threshold), change it here only.

export const SITE = {
  name: 'בלי חובות',
  nameLatin: 'BliHovot',
  tagline: 'המדריך הישראלי ליציאה מחובות',
  description: 'מדריכים, מחשבונים, קורס חינמי וסרטונים על חדלות פירעון, הוצאה לפועל והסדרי חוב. בשפה פשוטה, לפי החוק ומקורות רשמיים, ועם אפשרות לקבל פנייה מעורך דין.',
  preview: process.env.PREVIEW !== '0',
  leadEndpoint: 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/hub-lead',
  forumEndpoint: 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/forum',
  // display ads: off until an ad account is approved (the reserved space only appears when this is on)
  ads: { enabled: false, client: '' },
  email: '',
};

// Numbers quoted on the site, each with its source and the date it was checked
export const FACTS = {
  threshold: { value: 176923.12, label: '176,923 ₪', asOf: '2026', src: 'https://www.kolzchut.org.il/he/צו_לפתיחת_הליכי_חדלות_פירעון_ושיקום_כלכלי_(פשיטת_רגל)', checked: '2026-10-08' },
  interimMonths: { value: 12, label: 'כשנה', src: 'https://www.kolzchut.org.il/he/תקופת_הביניים_בהליכי_חדלות_פירעון_ושיקום_כלכלי_(פשיטת_רגל)', checked: '2026-10-08' },
  rehabYears: { value: 3, label: 'כ-3 שנים', src: 'https://www.kolzchut.org.il/he/צו_לשיקום_כלכלי_(תוכנית_לפירעון_חובות)_בהליכי_חדלות_פירעון_ושיקום_כלכלי_(פשיטת_רגל)', checked: '2026-10-08' },
  trainingHours: { min: 12, max: 20, src: 'https://www.kolzchut.org.il/he/צו_לשיקום_כלכלי_(תוכנית_לפירעון_חובות)_בהליכי_חדלות_פירעון_ושיקום_כלכלי_(פשיטת_רגל)', checked: '2026-10-08' },
  consolidation: { tiers: [{ upTo: 20000, years: 2 }, { upTo: 100000, years: 3 }, { upTo: Infinity, years: 4 }], extraYears: 3, src: 'https://www.kolzchut.org.il/he/בקשה_לאיחוד_תיקים_של_חייב_בהוצאה_לפועל', checked: '2026-10-08' },
  reformDate: '15.09.2019',
  phones: { receiver: '*5067', enforcement: '*35592' },
};

export const HUBS = [
  { id: 'hadlut-piraon', title: 'חדלות פירעון', short: 'חדלות פירעון', icon: 'path', blurb: 'ההליך שמחליף את "פשיטת הרגל": מצו פתיחת הליכים ועד הפטר מהחובות.' },
  { id: 'hotzaa-lapoal', title: 'הוצאה לפועל', short: 'הוצאה לפועל', icon: 'file', blurb: 'תיקים, עיקולים, איחוד תיקים וצו תשלומים: מה אפשר לעשות כשנפתח נגדכם תיק.' },
  { id: 'hesder-hov', title: 'הסדרי חוב ומשא ומתן', short: 'הסדרי חוב', icon: 'hands', blurb: 'איך מגיעים להסדר עם בנק, חברת אשראי או נושה אחר, עוד לפני הליך משפטי.' },
  { id: 'atzmaim', title: 'עצמאים ועסקים', short: 'עצמאים ועסקים', icon: 'briefcase', blurb: 'חובות של עוסק, חובות למס ולביטוח לאומי, וערבות אישית לחובות של חברה.' },
  { id: 'kalkala', title: 'לחיות נכון כלכלית', short: 'כלכלה נכונה', icon: 'leaf', blurb: 'תקציב, חיסכון, אשראי חכם וקרן חירום: ההרגלים שמונעים את החוב הבא.' },
  { id: 'achrei', title: 'החיים אחרי החובות', short: 'אחרי החובות', icon: 'sun', blurb: 'דירוג אשראי, תקציב, משכנתא וחיסכון: איך בונים מחדש ולא חוזרים לשם.' },
] as const;

export type HubId = (typeof HUBS)[number]['id'];

export const NAV = [
  { href: 'nose/hadlut-piraon/', label: 'חדלות פירעון' },
  { href: 'nose/hotzaa-lapoal/', label: 'הוצאה לפועל' },
  { href: 'kli/', label: 'מחשבונים' },
  { href: 'kurs/', label: 'קורסים' },
  { href: 'video/', label: 'סרטונים' },
  { href: 'forum/', label: 'פורום' },
];

export const CITIES = ['ירושלים', 'תל אביב', 'חיפה', 'ראשון לציון', 'פתח תקווה', 'אשדוד', 'נתניה', 'באר שבע', 'חולון', 'בני ברק', 'רמת גן', 'אשקלון', 'רחובות', 'בת ים', 'הרצליה', 'כפר סבא', 'חדרה', 'מודיעין', 'נצרת', 'רעננה', 'אחר'];
