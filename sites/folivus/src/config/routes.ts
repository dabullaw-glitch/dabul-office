// URL map. Hebrew slugs (like the search queries people type). All page paths are built here, so a section can be
// renamed in one line. Paths are relative to the site base and always end with "/".
export const SEG = {
  areas: 'תחומים',              // /תחומים/  all practice areas
  cityLawyers: 'עורכי-דין',     // /עורכי-דין/<city>/  all lawyers in a city
  cities: 'ערים',               // /ערים/  all cities
  firm: 'משרד',                 // /משרד/<slug>/
  search: 'חיפוש',
  articles: 'מאמרים',
  authors: 'כותבים',
  tools: 'כלים',
  courts: 'בתי-משפט',
  join: 'הצטרפות-משרדים',
  claim: 'ניהול-פרופיל',
  removal: 'בקשת-הסרה',
  editorial: 'מדיניות-עריכה',
  method: 'שיטת-הדירוג',
  terms: 'תנאי-שימוש',
  privacy: 'מדיניות-פרטיות',
  a11y: 'הצהרת-נגישות',
  cookies: 'מדיניות-עוגיות',
  contact: 'צור-קשר',
  about: 'אודות',
  // commerce and operations (noindex; the server function fol-api builds links to these same paths)
  order: 'הזמנה',               // checkout: package, places, firm details, payment
  portal: 'אזור-משרדים',        // firm sign-in, profile editing, renewals, reviews
  review: 'כתיבת-חוות-דעת',     // verified review form
  admin: 'ניהול-האתר',          // admin dashboard (admin role only)
  sponsored: 'תוכן-ממומן',      // sponsored articles (always labelled)
} as const;

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : import.meta.env.BASE_URL + '/';
const j = (...p: string[]) => p.filter(Boolean).join('/') + '/';

/** path without base, e.g. "עורך-דין-מקרקעין/תל-אביב-יפו/" ("" for home) */
export const P = {
  home: () => '',
  page: (k: keyof typeof SEG) => j(SEG[k]),
  area: (heSlug: string) => j(heSlug),
  areaCity: (heSlug: string, citySlug: string) => j(heSlug, citySlug),
  city: (citySlug: string) => j(SEG.cityLawyers, citySlug),
  firm: (slug: string) => j(SEG.firm, slug),
  article: (slug: string) => j(SEG.articles, slug),
  author: (slug: string) => j(SEG.authors, slug),
  tool: (slug: string) => j(SEG.tools, slug),
  court: (slug: string) => j(SEG.courts, slug),
};

/** link for href attributes (base + path, Hebrew kept readable; browsers encode it) */
export const u = (path: string) => BASE + path;
/** absolute, percent-encoded URL for canonical, sitemaps, JSON-LD, RSS */
export const abs = (path: string) => new URL(encodeURI(BASE + path), import.meta.env.SITE).href;
