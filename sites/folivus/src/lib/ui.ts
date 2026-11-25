// Small display helpers shared by the round 4 design components (firm tiles, rating words, group icons, tool categories).
import type { Firm, Review } from './data';

const GENERIC = new Set(['משרד', 'עורכי', 'עורך', 'דין', "ושות'", 'ושות׳', 'ושות', 'עו"ד', 'עו״ד', 'לדוגמה', 'עורכת', 'ושותפים']);
/** typographic mark for a firm tile: up to two meaningful words of the name, or [] for a plain building icon */
export function mono(name: string): string[] {
  const words = String(name || '').replace(/\([^)]*\)/g, ' ').replace(/[,]/g, ' ').split(/\s+/).filter(Boolean).filter((w) => !GENERIC.has(w));
  return words.slice(0, 2).map((w) => w.replace(/['׳]$/, ''));
}
/** a stable tile style per firm (a, b, c, d), so the list does not look like one block */
export function tileStyle(slug: string): string {
  let h = 7;
  for (const ch of String(slug)) h = (h * 31 + ch.charCodeAt(0)) % 9973;
  return 'abcd'[h % 4];
}
export const avgOf = (r: Review[]) => (r.length ? Math.round((r.reduce((s, x) => s + x.rating, 0) / r.length) * 10) / 10 : 0);
/** firm score from verified reviews only (never affected by payment) */
export function scoreOf(f: Firm): { score: number; count: number } {
  if (typeof f.reviewAvg === 'number' && f.reviewCount) return { score: Math.round(f.reviewAvg * 10) / 10, count: f.reviewCount };
  return { score: avgOf(f.reviews), count: f.reviews.length };
}
export const ratingWord = (r: number) => (r >= 4.8 ? 'מצוין' : r >= 4.5 ? 'טוב מאוד' : r >= 4 ? 'טוב' : r >= 3 ? 'סביר' : 'נמוך');
export const fmtScore = (r: number) => r.toFixed(1);

// area groups: icon geometry from the design canvas (48px grid)
const GI: Record<string, string[]> = {
  'משפחה וירושה': ['M13 15a4 4 0 1 0 8 0a4 4 0 1 0 -8 0', 'M9 35c0-5.2 3.6-9 8-9s8 3.8 8 9', 'M28 19a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0', 'M26 35c0-4.4 2.7-8 5.5-8s5.5 3.6 5.5 8', 'M6 40h36'],
  'עבודה וביטוח לאומי': ['M10 16h28a2 2 0 0 1 2 2v18a2 2 0 0 1 -2 2H10a2 2 0 0 1 -2 -2V18a2 2 0 0 1 2 -2z', 'M18 16v-3a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v3', 'M8 26h12M28 26h12', 'M20 23h8v6h-8z'],
  'נזיקין וביטוח': ['M24 6l14 5v10c0 9-6 16-14 19-8-3-14-10-14-19V11z', 'M24 16v12M18 22h12'],
  'פלילי ותעבורה': ['M18 13l6-6 10 10-6 6z', 'M21 20L8.5 32.5a2.1 2.1 0 0 0 3 3L24 23', 'M27 40h15M30 35h9'],
  'אזרחי ומסחרי': ['M24 8v30', 'M12 13h24', 'M7 27l5-14 5 14a5 5 0 0 1 -10 0z', 'M31 27l5-14 5 14a5 5 0 0 1 -10 0z', 'M16 40h16'],
  'נדל"ן ובנייה': ['M7 23L24 9l17 14', 'M11 20v20h26V20', 'M15 25h5v5h-5z', 'M6 40h36', 'M22 40v-10h6v10'],
  'עסקים ומיסים': ['M10 40V11h16v29', 'M26 20h12v20', 'M15 17h6M15 23h6M15 29h6', 'M31 26h2M31 32h2', 'M6 40h36'],
  'מנהלי והגירה': ['M10 24a14 14 0 1 0 28 0a14 14 0 1 0 -28 0', 'M24 10c-4 4-6 9-6 14s2 10 6 14c4-4 6-9 6-14s-2-10-6-14z', 'M12 17h24M12 31h24', 'M10 24h28'],
};
export function groupIcon(group: string, size = 26): string {
  const g = String(group).replace(/״/g, '"');
  const paths = GI[g] || GI['אזרחי ומסחרי'];
  return `<svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths.map((d) => `<path d="${d}"></path>`).join('')}</svg>`;
}

// tool categories: the writers use English keys and Hebrew names; the site shows a short Hebrew list in a fixed order
const CAT: Record<string, string> = {
  labor: 'עבודה ושכר', 'national-insurance': 'ביטוח לאומי', 'family-inheritance': 'משפחה וירושה', courts: 'בתי משפט והליכים',
  consumer: 'צרכנות', 'צרכנות': 'צרכנות', 'legal-services': 'שירותים משפטיים', letters: 'מכתבים ופניות', 'חוזים והסכמים': 'חוזים והסכמים',
  'מיסוי מקרקעין': 'מיסוי ומימון דירה', 'נדל"ן ומימון': 'מיסוי ומימון דירה', 'נדל"ן ובנייה': 'נדל"ן ובנייה', 'תכנון ובנייה': 'נדל"ן ובנייה',
  'שכירות': 'שכירות', 'עסקים ופרטיות': 'עסקים ופרטיות',
};
export const CAT_ORDER = ['עבודה ושכר', 'ביטוח לאומי', 'משפחה וירושה', 'נדל"ן ובנייה', 'מיסוי ומימון דירה', 'שכירות', 'חוזים והסכמים', 'עסקים ופרטיות', 'מכתבים ופניות', 'צרכנות', 'בתי משפט והליכים', 'שירותים משפטיים'];
export const catName = (c: string) => CAT[String(c).replace(/״/g, '"')] || String(c) || 'כללי';
export const catSlug = (c: string) => 'cat-' + (CAT_ORDER.indexOf(c) >= 0 ? CAT_ORDER.indexOf(c) : 99);
