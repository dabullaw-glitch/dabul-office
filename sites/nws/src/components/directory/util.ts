// Small helpers of the business directory pages (28.10.2026 redesign).
import { PLACES } from '../../data/places';
import type { Listing } from '../../lib/biz';

// Two initials for a listing without a logo: "יקיר דבול" -> "י.ד", one word -> its first two letters.
export const initials = (name: string) => {
  const w = name.replace(/[^\p{L}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  if (!w.length) return '';
  return w.length > 1 ? `${w[0][0]}.${w[1][0]}` : w[0].slice(0, 2);
};

// First paragraph of the business's own text, cut at a word boundary.
export const lineOf = (text: string, max = 170) => {
  const p = (text.split(/\n+/)[0] || '').trim();
  if (p.length <= max) return p;
  const cut = p.lastIndexOf(' ', max - 1);
  return p.slice(0, cut > 40 ? cut : max).replace(/[,.:;]$/, '') + '...';
};

// The area of the business first, then the other areas it serves.
export const servedOf = (l: Listing) => [l.area, ...l.areasServed.filter((a) => a !== l.area)];

// Short form for cards: "נתניה, בית ינאי ועוד 6".
export const servedShort = (l: Listing) => {
  const s = servedOf(l);
  return s.length > 2 ? `${s[0]}, ${s[1]} ועוד ${s.length - 2}` : s.join(', ');
};

// Area filter chips: only places that real listings serve, in the order of the places list (Netanya first).
const ORDER = ['נתניה', ...PLACES.filter((p) => p.kind === 'locality').map((p) => p.he), ...PLACES.filter((p) => p.kind === 'neighborhood').map((p) => p.he)];
export const areaChips = (list: Listing[]) => {
  const set = new Set(list.flatMap((l) => servedOf(l)));
  return [...ORDER.filter((a) => set.has(a)), ...[...set].filter((a) => !ORDER.includes(a))];
};

// The "where" choices of the search form.
export const WHERE = ['נתניה', ...PLACES.filter((p) => p.kind === 'locality').map((p) => p.he)];

export const bizCount = (n: number) => (n === 1 ? 'עסק אחד' : `${n} עסקים`);
