export const TOOLS = [
  { id: 'kabalot', title: 'תיק קבלות לדוח הדו-חודשי', blurb: 'מצלמים קבלות ותלושים לאורך החודשיים, ובסוף מקבלים קובץ PDF אחד מסודר לצירוף לדוח בהליך חדלות פירעון.', cta: 'לפתיחת התיק' },
  { id: 'eize-halich', title: 'איזה הליך מתאים לי?', blurb: '6 שאלות קצרות, ותשובה: הסדר עם הנושים, איחוד תיקים בהוצאה לפועל או חדלות פירעון.', cta: 'לבדיקה' },
  { id: 'saf', title: 'בית משפט או הוצאה לפועל?', blurb: 'מזינים את סך החובות ורואים לאיזה גוף מגישים בקשה לחדלות פירעון, לפי הסף המעודכן.', cta: 'לחישוב' },
  { id: 'ichud-tikim', title: 'מחשבון איחוד תיקים', blurb: 'בודק אם תשלום חודשי מסוים מספיק כדי לקבל צו איחוד תיקים, לפי תקופות הפירעון שבחוק.', cta: 'לחישוב' },
  { id: 'tashlumim', title: 'מחשבון סגירת חוב', blurb: 'כמה זמן ייקח לסגור חוב בתשלום חודשי קבוע, וכמה ריבית תשלמו בדרך.', cta: 'לחישוב' },
  { id: 'taktziv', title: 'מחשבון תקציב חודשי', blurb: 'הכנסות מול הוצאות: כמה כסף פנוי נשאר בכל חודש, ואיפה אפשר לחסוך.', cta: 'לחישוב' },
];

// Calculators other websites may embed (kli/<id>/?embed=1, code on the hatmaa/ page)
export const EMBEDDABLE = ['eize-halich', 'saf', 'ichud-tikim', 'tashlumim', 'taktziv'] as const;

// Request helpers: step-by-step preparation for official forms (pages: src/pages/kli/[bakasha].astro)
import { BAKASHOT } from './bakashotMeta';
export const FORM_TOOLS = BAKASHOT.map((m) => ({ id: m.id, title: m.card, blurb: m.intro, cta: 'להכנת הבקשה' }));
export const ALL_TOOLS = [...TOOLS, ...FORM_TOOLS];
