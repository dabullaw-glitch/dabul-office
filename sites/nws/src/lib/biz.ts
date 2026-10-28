// Business directory listings (approved only), fetched before every build by scripts/biz.mjs from the Supabase function hns-biz.
// Payments are not connected: "featured" is set by hand in the database until Yakir approves a payment provider.
import fs from 'node:fs';
import path from 'node:path';
import { CAT_BY_SLUG, CATEGORIES } from '../data/directory';
import { PLACE_BY_HE } from '../data/places';

export interface Listing {
  id: number; slug: string; category: string; name: string; area: string; areasServed: string[]; address: string;
  phone: string; whatsapp: string; email: string; website: string; description: string; logo: string; license: string;
  featured: boolean; created: string; updated: string;
}
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').trim();
const read = () => { try { return JSON.parse(fs.readFileSync(path.resolve('src/data/biz.json'), 'utf8')); } catch { return { listings: [] }; } };

export const LISTINGS: Listing[] = ((read().listings || []) as any[])
  .filter((l) => l && l.id && l.name && CAT_BY_SLUG[l.category])
  .map((l) => ({ ...l, name: clean(l.name), description: clean(l.description), address: clean(l.address), areasServed: l.areasServed || [] }))
  .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name, 'he'));

export const listingsIn = (cat: string) => LISTINGS.filter((l) => l.category === cat);
export const listingUrl = (l: Pick<Listing, 'category' | 'slug'>) => `/directory/${l.category}/${l.slug}/`;
export const countBy = Object.fromEntries(CATEGORIES.map((c) => [c.slug, listingsIn(c.slug).length])) as Record<string, number>;
export const placeOf = (he: string) => PLACE_BY_HE[he];
// phone for display (050-123-4567) and for tel: / WhatsApp links
export const phoneShow = (p: string) => (p.length === 10 ? `${p.slice(0, 3)}-${p.slice(3, 6)}-${p.slice(6)}` : p.length === 9 ? `${p.slice(0, 2)}-${p.slice(2, 5)}-${p.slice(5)}` : p);
export const telHref = (p: string) => `tel:${p}`;
export const waHref = (p: string) => `https://wa.me/972${p.replace(/^0/, '')}`;
export const intlPhone = (p: string) => `+972-${p.replace(/^0/, '')}`;
