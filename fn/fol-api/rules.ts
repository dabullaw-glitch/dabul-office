// Pure rules (no database): content checks, review moderation, prices, package limits. Tested by the self test.
import { Any } from './common.ts';

// ---- advertising text rules (firm profiles, replies, provider ads, sponsored drafts) ----
// Israel Bar advertising rules + the site's own style: no superlatives, no "expert", no promises or guarantees.
const HE = '\\u0590-\\u05FF';
const AD_RULES: [RegExp, string][] = [
  [new RegExp(`(^|[^${HE}])[ושכלבמה]{0,2}הכי(?=[^${HE}]|$)`), 'אין להשתמש במילה "הכי".'],
  [/ביותר/, 'אין להשתמש בלשון הפלגה (למשל "הטוב ביותר").'],
  [/מומח/, 'אין להשתמש במילה "מומחה" או בנטיות שלה. אפשר לכתוב "מתמחה ב".'],
  [/מבטיח|מבטיחה|מבטיחים|מובטח|הבטחה|הבטחת|ערובה|בטוח שת|בוודאות|100%|מאה אחוז/, 'אין להבטיח תוצאות או הצלחה.'],
  [/מספר\s?1|מס'\s?1|#1|הראשון בישראל|המוביל|המובילים|המובילה/, 'אין להציג את המשרד כמוביל או כמספר אחד.'],
];
export function adIssues(text: string): string[] {
  const t = String(text || '');
  const out: string[] = [];
  for (const [re, msg] of AD_RULES) if (re.test(t) && !out.includes(msg)) out.push(msg);
  return out;
}
// dashes become a plain hyphen (site style); control characters removed
export const normText = (s: unknown, n: number) => String(s ?? '').replace(/[–—]/g, '-').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, ' ').trim().slice(0, n);

// ---- review moderation ----
const SWEAR = /(^|[^֐-׿])(זונה|בן זונה|מניאק|חרא|מטומטם|מטומטמת|אידיוט|אידיוטית|נוכל|נוכלת|גנב|גנבת|רמאי|רמאית|כוס)(?=[^֐-׿]|$)/;
export function reviewIssues(title: string, body: string): string[] {
  const t = `${title} ${body}`; const out: string[] = [];
  if (/https?:\/\/|www\.|\.co\.il|\.com\b/i.test(t)) out.push('link');
  if (/[^\s@]+@[^\s@]+\.[a-z]{2,}/i.test(t)) out.push('email');
  if (/(\+?972|0)[\s-]?[2-9](?:[\s-]?\d){7,8}/.test(t)) out.push('phone');
  if (/\d{3,6}-\d{2}-\d{2}/.test(t)) out.push('case_number');
  if (SWEAR.test(t)) out.push('language');
  return out;
}
// words the site never prints (the build guard would stop): the writer is asked to rephrase before sending
export function reviewBlocked(title: string, body: string): boolean {
  const t = `${title} ${body}`;
  return new RegExp(`(^|[^${HE}])[ושכלבמה]{0,2}הכי(?=[^${HE}]|$)`).test(t) || /מומח/.test(t) || /הטוב ביותר|הטובים ביותר/.test(t);
}
export const displayName = (name: string) => {
  const p = normText(name, 40).split(/\s+/).filter(Boolean);
  return p.length > 1 ? `${p[0]} ${p[p.length - 1].slice(0, 1)}.` : (p[0] || 'לקוח');
};

// ---- prices (always computed on the server; before VAT in fol_plans) ----
export function price(plan: Any, months: number, vatRate: number) {
  const unit = Number(plan.unit_price);
  if (!(unit > 0)) return null;
  const units = plan.unit === 'month' ? months : 1;
  const net = Math.round(unit * units * 100) / 100;
  const vat = Math.round(net * vatRate * 100) / 100;
  return { net, vat, total: Math.round((net + vat) * 100) / 100, units };
}

// ---- package limits ----
// local = exactly 1 area in 1 city; regional = 1 to 3 different area+city pairs; national = exactly 1 area, nationwide
// (no city) + the home page block.
export function checkSlots(plan: Any, raw: Any, T: { areas: string[]; cities: string[] }): { slots?: { area: string; city: string | null }[]; error?: string } {
  const lim = plan.limits || {};
  const max = Number(lim.slots) || 1;
  if (!Array.isArray(raw) || raw.length < 1) return { error: 'slots' };
  if (raw.length > max) return { error: 'too_many_slots' };
  if ((plan.id === 'local' || plan.id === 'national') && raw.length !== 1) return { error: 'too_many_slots' };
  const nat = lim.scope === 'nationwide';
  const seen = new Set<string>(); const out: { area: string; city: string | null }[] = [];
  for (const s of raw) {
    const area = String(s?.area || ''), city = nat ? null : String(s?.city || '');
    if (!T.areas.includes(area)) return { error: 'area' };
    if (!nat && !T.cities.includes(city as string)) return { error: 'city' };
    const k = area + '|' + (city || '*'); if (seen.has(k)) return { error: 'duplicate_slot' }; seen.add(k);
    out.push({ area, city });
  }
  return { slots: out };
}

// ---- extended profile fields ----
export const LANGS = ['עברית', 'אנגלית', 'ערבית', 'רוסית', 'צרפתית', 'ספרדית', 'אמהרית', 'יידיש', 'גרמנית', 'איטלקית', 'פורטוגזית', 'רומנית', 'אוקראינית', 'הונגרית', 'פרסית', 'טורקית'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
export function cleanProfile(d: Any, imgPrefix: string): { data: Any; issues: string[] } {
  const issues: string[] = [];
  const description = normText(d?.description, 1500);
  const out: Any = { description };
  if (description && description.length < 40) issues.push('התיאור קצר מדי (לפחות 40 תווים).');
  if (/https?:\/\/|www\./i.test(description)) issues.push('אין לשים קישורים בתוך התיאור. יש שדות לאתר ולסרטון.');
  issues.push(...adIssues(description));
  const tagline = normText(d?.tagline, 90); out.tagline = tagline; issues.push(...adIssues(tagline).filter((x) => !issues.includes(x)));
  const okImg = (u: unknown) => typeof u === 'string' && u.startsWith(imgPrefix) && /^[\w\-./:%]+$/.test(u);
  out.logo = okImg(d?.logo) ? d.logo : '';
  if (d?.logo && !out.logo) issues.push('הלוגו חייב להיות קובץ שהועלה דרך האתר.');
  out.photos = (Array.isArray(d?.photos) ? d.photos : []).filter(okImg).slice(0, 6);
  const video = String(d?.video || '').trim();
  out.video = /^https:\/\/(www\.)?(youtube\.com\/watch\?v=[\w-]{6,20}|youtu\.be\/[\w-]{6,20}|vimeo\.com\/\d{5,12})$/.test(video) ? video : '';
  if (video && !out.video) issues.push('קישור הסרטון צריך להיות מיוטיוב או מוימאו.');
  out.languages = (Array.isArray(d?.languages) ? d.languages : []).filter((x: string) => LANGS.includes(x)).slice(0, 8);
  const hours: Any = {};
  for (const k of DAYS) { const v = String(d?.hours?.[k] || '').trim(); if (!v) continue; if (/^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(v)) hours[k] = v; else issues.push('שעות הפעילות צריכות להיות בצורה 09:00-18:00.'); }
  out.hours = hours;
  const wa = String(d?.whatsapp || '').replace(/[^0-9+]/g, '');
  out.whatsapp = /^(\+?972|0)5\d{8}$/.test(wa) ? wa : '';
  if (wa && !out.whatsapp) issues.push('מספר הוואטסאפ צריך להיות מספר נייד ישראלי.');
  const yr = Number(d?.founded); out.founded = yr >= 1948 && yr <= new Date().getFullYear() ? yr : null;
  return { data: out, issues: [...new Set(issues)] };
}

// ---- uploads: real image check by the first bytes ----
export function imageType(b: Uint8Array): string {
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'image/png';
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg';
  if (b.length > 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'image/webp';
  return '';
}
