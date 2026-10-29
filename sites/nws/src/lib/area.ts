// Neighborhood and locality pages (29.10.2026, the plan Yakir approved): one page per Netanya neighborhood (always) and per
// Sharon locality that has stories or businesses. Everything on a page comes from data that keeps its source: the stories that
// mention the place, the events calendar, the business directory, the city guide lists (synagogues, community centers,
// libraries: each item with its source), the shelters and waste pickup data of the municipality, and the national
// neighborhood dictionary (data.gov.il) for a short sourced description. Nothing is written about a place without a source.
import { PLACES, type Place } from '../data/places';
import { ARTICLES, CALENDAR, placesOf, type Article } from './content';
import { LISTINGS, type Listing } from './biz';
import { DATA } from '../data/city/guide';
import SH from '../data/now/shelters.json';
import SV from '../data/now/services.json';

// the entry of the national neighborhood dictionary (src/data/city/neighborhoods.json) for each of our neighborhoods
const DICT: Record<string, string> = {
  'city-center': 'מרכז העיר', 'ramat-poleg': 'רמת פולג (פולג הישנה)', 'ir-yamim': 'עיר ימים', 'kiryat-hasharon': 'קריית השרון',
  'kiryat-nordau': 'נווה גולדה (קריית נורדאו)', 'neot-shaked': 'נאות שקד', 'neot-herzl': 'נאות הרצל', dora: 'רמת ידין ("שיכון דורה")',
  'ramat-yadin': 'רמת ידין ("שיכון דורה")', 'kiryat-sanz': 'קריית צאנז', vatikim: 'שיכון ותיקים', 'givat-hairusim': 'גבעת האירוסים',
  'ramat-hen': 'רמת חן', 'galei-yam': 'גלי הים', 'neot-ganim': 'נאות גנים', 'neve-itamar': 'נווה איתמר', 'ein-hatchelet': 'עין התכלת',
  'pardes-hagdud': 'פרדס הגדוד', 'ramat-efraim': 'רמת אפרים', 'ofek-hayam': 'אופק הים', 'kiryat-rabin': 'קריית רבין', sela: 'שיכון סלע',
};
// the same place is spelled in several ways in official lists (קרית / קריית, אפרים / אפריים, דורה inside רמת ידין)
const fold = (s: string) => String(s || '').replace(/[״"'׳()\-\s]/g, '').replace(/יי/g, 'י').replace(/וו/g, 'ו');
const ALIAS: Record<string, string[]> = { dora: ['דורה', 'רמת ידין'], 'ramat-yadin': ['רמת ידין', 'דורה'], 'kiryat-rabin': ['קריית רבין', 'עמליה'], 'city-center': ['מרכז העיר', 'מרכז נתניה'] };
const namesOf = (p: Place) => (ALIAS[p.slug] || [p.he]).map(fold);
const inArea = (p: Place, area?: string) => !!area && namesOf(p).some((n) => fold(area).includes(n));

export interface AreaInfo {
  p: Place; items: Article[]; listings: Listing[]; events: typeof CALENDAR;
  guide: { cat: string; name: string; address?: string; source?: string }[];
  shelters: { n: number; where: string }[]; waste: { day: string } | null;
  about: { area?: string; notes: string[]; source: string; srcName: string } | null; index: boolean;
}

export function areaInfo(p: Place): AreaInfo {
  const items = ARTICLES.filter((a) => placesOf(a).some((x) => x.slug === p.slug));
  const listings = LISTINGS.filter((l) => l.area === p.he || (l.areasServed || []).includes(p.he));
  const re = new RegExp(`(?<![א-ת])${p.he}(?![א-ת])`);
  const events = CALENDAR.filter((c) => re.test(`${c.title} ${c.venue || ''}`)).slice(0, 8);
  const guide: AreaInfo['guide'] = [];
  for (const [cat, label] of [['matnasim', 'מתנ״ס'], ['libraries', 'ספרייה'], ['synagogues', 'בית כנסת']] as const) {
    for (const e of DATA[cat]?.items || []) if (p.kind === 'neighborhood' && inArea(p, e.area)) guide.push({ cat: label, name: e.name, address: e.address, source: e.source });
  }
  const shelters = p.kind === 'neighborhood' ? (SH.items as any[]).filter((x) => x.hoodSlug === p.slug || (p.slug === 'dora' && x.hoodSlug === 'ramat-yadin')).map((x) => ({ n: x.n, where: x.where })) : [];
  const wd = p.kind === 'neighborhood' ? SV.waste.days.find((d) => d.slugs.includes(p.slug)) : null;
  const de = DICT[p.slug] ? (DATA.neighborhoods?.items || []).find((e) => e.name === DICT[p.slug]) : null;
  const about = de ? { area: de.area, notes: String(de.notes || '').split(/;\s*/).map((x) => x.trim()).filter(Boolean), source: de.source || '', srcName: de.srcName || '' } : null;
  const index = items.length > 0 || listings.length > 0 || (p.kind === 'neighborhood' && (guide.length + shelters.length > 0 || !!about));
  return { p, items, listings, events, guide, shelters, waste: wd ? { day: wd.day } : null, about, index };
}

// a page for every neighborhood, and for a locality only when it has stories or businesses
export const AREA_PAGES: AreaInfo[] = PLACES.map(areaInfo).filter((x) => x.p.kind === 'neighborhood' || x.items.length > 0 || x.listings.length > 0);
export const AREA_SLUGS = new Set(AREA_PAGES.map((x) => x.p.slug));
