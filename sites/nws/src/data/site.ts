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

// Page and section header photos (28.10.2026 redesign: free-license photos from public/img/stock, never the old flat drawings).
// src is the 1600px WebP; the same name also exists at 1200, 800 and 400px (scripts/stock-sizes.mjs) and as a 1200x630 JPEG for
// social cards (stock/og/). srcset: all four WebP sizes (30.10.2026, a phone takes the 1200px file instead of the 1600px one).
const ph = (name: string, alt: string) => ({ src: `/img/stock/${name}-1600.webp`, small: `/img/stock/${name}-800.webp`, name, alt,
  srcset: `/img/stock/${name}-400.webp 400w, /img/stock/${name}-800.webp 800w, /img/stock/${name}-1200.webp 1200w, /img/stock/${name}-1600.webp 1600w` });
export const IMG: Record<string, { src: string; small: string; name: string; alt: string; srcset: string }> = {
  beach: ph('beach-umbrellas', 'סוככים על חוף הים'),
  sea: ph('wave', 'גל נשבר על החוף'),
  city: ph('city-buildings', 'מבט על בנייני מגורים בעיר'),
  stadium: ph('stadium-night', 'אצטדיון כדורגל מואר בערב'),
  crane: ph('crane-building', 'עגורן ליד בניין בבנייה'),
  council: ph('council-chamber', 'אולם ישיבות של מועצה'),
  concert: ph('concert', 'קהל מול במה מוארת'),
  road: ph('road-aerial', 'כביש עירוני בלילה, מבט מלמעלה'),
  police: ph('police-lights', 'אורות של ניידת משטרה'),
  traffic: ph('traffic-fog', 'תנועת מכוניות בערב'),
  sunset: ph('beach-sunset', 'שקיעה מעל הים'),
};

export const abs = (path: string) => SITE_URL + path;

// Social channels (28.10.2026). The Telegram channel "חדשות נתניה והשרון" was created on 28.10.2026 and became public on 29.10.2026
// with the address below. While TG_USER is empty the site links to /join/ and says the link is coming.
// Set TG_USER (without @) once the channel is public, and every Telegram button on the site goes straight to it.
export const TG_USER = 'nws_netanya';
export const TG_URL = TG_USER ? `https://t.me/${TG_USER}` : '';
// Profiles that represent the site (used in schema.org sameAs). Facebook page id 61595887595391.
export const SAME_AS = [TG_URL, 'https://www.facebook.com/profile.php?id=61595887595391'].filter(Boolean);

// Supabase functions of the news engine (public endpoints). The business directory form posts to hns-biz.
export const HNS_API = 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1';
// Cloudflare Turnstile on public forms (29.10.2026): the public site key of the free widget "nws.co.il forms" (managed mode). The
// matching secret is NWS_TURNSTILE_SECRET in app_secrets, used only by the Supabase function hns-biz. The site key is not a secret.
export const TURNSTILE_SITE_KEY = process.env.PUBLIC_NWS_TURNSTILE_SITE_KEY || '0x4AAAAAAFq8cXO_8G8zLoLz';

// 29.10.2026 (Yakir: "connect Google ads and put them in the right places"): Google AdSense. Everything is ready and stays off
// until the account exists: put the publisher id (ca-pub-...) in client, and optionally a slot id per place (otherwise the place
// is filled by AdSense's own sizing). With an empty client no ad code, no script and no empty box is rendered anywhere.
// Places: home (after the top stories, between the section blocks), article (inside the text after the 4th paragraph, after the
// text, the sidebar), section lists. Never inside sponsored stories, never on the panel, legal or form pages.
// 29.10.2026: our own "רוצים לפרסם כאן? צרו קשר" banners in the ad places until Google ads run there (components/HouseAd.astro)
export const HOUSE_ADS = process.env.NWS_HOUSE_ADS !== '0'; // approved by Yakir 29.10.2026
export const ADSENSE: { client: string; slots: Record<'home1' | 'home2' | 'inArticle' | 'afterArticle' | 'side' | 'list', string> } = {
  client: 'ca-pub-1818310219775941',
  slots: { home1: '', home2: '', inArticle: '', afterArticle: '', side: '', list: '' },
};
