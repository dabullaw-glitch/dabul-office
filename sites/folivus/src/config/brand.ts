// THE ONE PLACE for the brand. "פוליבוס" / Folivus is a temporary working name: to rename the site, change this file
// (and the domain in launch.json when one is bought). Nothing else in the code spells the name or a domain.
export const BRAND = {
  name: 'פוליבוס',            // shown in the logo, titles, footer, schema
  nameLatin: 'Folivus',       // small latin line under the logo, OG image, llms.txt
  tagline: 'מדריך עורכי הדין והמידע המשפטי בישראל',
  short: 'מדריך עורכי דין לפי תחום ועיר, מדריכים משפטיים בשפה פשוטה וכלים חינמיים.',
  description:
    'מאגר משרדי עורכי דין לפי תחום ועיר, חוות דעת מאומתות של לקוחות, מדריכים משפטיים עם מקורות ותאריך עדכון, מחשבונים ומחוללי מסמכים חינמיים.',
  // contact address shown on legal pages; empty until the owner sets a mailbox on the final domain
  email: '',
  foundingYear: 2026,
  // logo colors live in the CSS; the mark is drawn in components/Logo.astro
};

// Site address comes from the build (SITE_URL + BASE in astro.config.mjs), never from here.
export const PREVIEW = process.env.PREVIEW !== '0';

// Site switches. show_google_ratings: shows the Google rating and review count on firm cards and profiles (with
// "דירוג מגוגל" attribution). OFF by default: no Google API calls or billing until the owner approves the cost.
// Turn on with FOL_SHOW_GOOGLE=1 in the build once the fields are filled.
export const SETTINGS = {
  show_google_ratings: process.env.FOL_SHOW_GOOGLE === '1',
};

// Supabase (shared project). Public key only; tables are protected by row level security and writes go through
// the database function fol_submit. FORMS_LIVE stays false until the fol_ migration is applied and approved.
export const DB = {
  url: 'https://mgjmnvpnovkewvqevjmz.supabase.co',
  key: 'sb_publishable_VlbYeA-oSqVs28QSWXtwJA_VoMt8p6j',
  formsLive: process.env.FOL_FORMS === '1',
};
