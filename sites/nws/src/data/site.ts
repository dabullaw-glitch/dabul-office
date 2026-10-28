// NWS: site-wide constants. PREVIEW builds are noindex (the site is not public until Yakir approves).
export const SITE_URL = 'https://nws.co.il';
export const PREVIEW = process.env.NWS_PREVIEW === '1';
export const BUILD_TIME = new Date();

export type Lang = 'he' | 'ru' | 'fr' | 'en';
export const LANGS: Lang[] = ['he', 'ru', 'fr', 'en'];
export const LANG_PREFIX: Record<Lang, string> = { he: '', ru: '/ru', fr: '/fr', en: '/en' };
export const LANG_LOCALE: Record<Lang, string> = { he: 'he_IL', ru: 'ru_RU', fr: 'fr_FR', en: 'en_US' };
export const LANG_DIR: Record<Lang, 'rtl' | 'ltr'> = { he: 'rtl', ru: 'ltr', fr: 'ltr', en: 'ltr' };

export const BRAND = {
  short: 'NWS',
  he: 'חדשות נתניה והשרון',
  nameHe: 'חדשות נתניה והשרון',
  taglineHe: 'מה שקורה עכשיו, ליד הבית',
  email: 'news@nws.co.il',
  foundingDate: '2026-10',
  area: { name: 'נתניה', lat: 32.3215, lon: 34.8532 },
};

export const IMG: Record<string, { src: string; alt: string }> = {
  beach: { src: '/img/beach.svg', alt: 'איור: חוף הים של נתניה בשקיעה' },
  city: { src: '/img/city.svg', alt: 'איור: בנייני מגורים בעיר' },
  stadium: { src: '/img/stadium.svg', alt: 'איור: מגרש כדורגל באצטדיון' },
  crane: { src: '/img/crane.svg', alt: 'איור: עגורן ובניין בבנייה' },
  council: { src: '/img/council.svg', alt: 'איור: בניין עירייה' },
  concert: { src: '/img/concert.svg', alt: 'איור: במה עם אורות והופעה' },
  road: { src: '/img/road.svg', alt: 'איור: כביש עם קונוסים ועבודות' },
};

export const abs = (path: string) => SITE_URL + path;
