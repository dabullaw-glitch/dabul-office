// Shared content for the three home-page design directions (/design-a/, /design-b/, /design-c/).
import { P, u } from '../config/routes';
import { areas, areaGroups, cities, firms, tools, articles, cityBySlug, areaBySlug, fmtDate, REGIONS } from './data';

export const SITUATIONS: { text: string; area: string }[] = [
  { text: 'קונים או מוכרים דירה', area: 'real-estate' },
  { text: 'מתגרשים או צריכים הסכם בין בני זוג', area: 'divorce' },
  { text: 'פוטרתם או לא קיבלתם את כל השכר', area: 'labor-law' },
  { text: 'זימנו אתכם לחקירה במשטרה', area: 'criminal' },
  { text: 'נפגעתם בתאונת דרכים', area: 'car-accidents' },
  { text: 'צריכים צוואה או צו ירושה', area: 'inheritance-wills' },
  { text: 'נכנסתם לחובות שקשה לעמוד בהם', area: 'insolvency' },
  { text: 'קיבלתם דירה חדשה עם ליקויים', area: 'construction-defects' },
];

export async function homeData() {
  const fs = await firms();
  const area = (s: string) => areaBySlug(s)!;
  return {
    situations: SITUATIONS.map((s) => ({ ...s, href: u(P.area(area(s.area).he)), title: area(s.area).title })),
    groups: areaGroups().map((g) => ({ group: g.group, items: g.items.map((a) => ({ name: a.name, title: a.title, href: u(P.area(a.he)), count: fs.filter((f) => f.areas.includes(a.slug)).length })) })),
    areaOptions: areas().map((a) => ({ value: a.he, label: a.name })),
    cityOptions: REGIONS.map((r) => ({ region: r, items: cities().filter((c) => c.region === r).map((c) => ({ value: c.he, label: c.name })) })),
    topCities: ['tel-aviv', 'jerusalem', 'haifa', 'rishon-lezion', 'petah-tikva', 'ashdod', 'netanya', 'beer-sheva', 'holon', 'ramat-gan', 'rehovot', 'kfar-saba']
      .map((s) => cityBySlug(s)!).filter(Boolean).map((c) => ({ name: c.name, href: u(P.city(c.he)) })),
    firms: [...fs].sort((a, b) => (b.plan !== 'free' ? 1 : 0) - (a.plan !== 'free' ? 1 : 0)).slice(0, 4).map((f) => ({
      name: f.name, href: u(P.firm(f.slug)), city: cityBySlug(f.city)?.name || '', phone: f.phone, tel: 'tel:' + f.phone.replace(/[^0-9+]/g, ''),
      website: f.website, promo: f.plan !== 'free', claimed: f.claimed, sample: f.isSample,
      areas: f.areas.slice(0, 3).map((s) => areaBySlug(s)?.name).filter(Boolean) as string[], more: Math.max(0, f.areas.length - 3),
      rating: f.reviews.length ? Math.round((f.reviews.reduce((s, r) => s + r.rating, 0) / f.reviews.length) * 10) / 10 : 0, reviews: f.reviews.length,
      initials: f.name.replace(/[("'].*$/, '').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join(''),
    })),
    tools: tools().filter((t) => !t.draft).concat(tools().filter((t) => t.draft)).slice(0, 6).map((t) => ({ name: t.name, text: t.description, href: u(P.tool(t.he)), kind: t.type === 'generator' ? 'מסמך' : 'מחשבון' })),
    toolCount: tools().length,
    articles: articles().slice(0, 4).map((a) => ({ title: a.title, text: a.description, href: u(P.article(a.he)), date: fmtDate(a.updated), area: areaBySlug(a.areas[0])?.name || 'מדריך', minutes: Math.max(1, Math.round(a.words / 200)) })),
    counts: { areas: areas().length, cities: cities().length, tools: tools().length, guides: articles().length + areas().filter((a) => a.guide).length },
    links: {
      areas: u(P.page('areas')), cities: u(P.page('cities')), tools: u(P.page('tools')), articles: u(P.page('articles')),
      courts: u(P.page('courts')), join: u(P.page('join')), claim: u(P.page('claim')), removal: u(P.page('removal')), method: u(P.page('method')),
      search: u(P.page('search')), terms: u(P.page('terms')), privacy: u(P.page('privacy')), a11y: u(P.page('a11y')), contact: u(P.page('contact')),
      about: u(P.page('about')), editorial: u(P.page('editorial')), home: u(''), base: u(''),
    },
  };
}

// Simple line drawings (stroke only, one accent fill). No people, no photos.
export const DRAW = {
  street: (accent: string, ink = 'currentColor') => `<svg viewBox="0 0 420 300" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M10 262h400"/>
  <rect x="38" y="92" width="92" height="170" rx="3"/><path d="M38 92l46-34 46 34"/>
  ${[0, 1, 2, 3].map((r) => [0, 1].map((c) => `<rect x="${54 + c * 34}" y="${112 + r * 34}" width="22" height="20" rx="2"/>`).join('')).join('')}
  <rect x="150" y="40" width="110" height="222" rx="3"/>
  ${[0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((c) => `<rect x="${164 + c * 32}" y="${58 + r * 34}" width="20" height="20" rx="2"/>`).join('')).join('')}
  <path d="M190 262v-36h30v36"/>
  <rect x="280" y="128" width="96" height="134" rx="3"/>
  <path d="M296 150h64M296 172h64M296 194h40"/>
  <circle cx="392" cy="214" r="20"/><path d="M392 234v28"/>
  <rect x="300" y="60" width="86" height="104" rx="6" fill="${accent}" stroke="${ink}"/>
  <path d="M314 84h58M314 102h58M314 120h36"/><path d="M318 140l8 8 16-18" stroke-width="2.6"/>
</svg>`,
  scales: (accent: string, ink = 'currentColor') => `<svg viewBox="0 0 240 200" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M120 30v140M80 176h80M60 56h120"/><circle cx="120" cy="30" r="7" fill="${accent}"/>
  <path d="M60 56l-28 62h56zM180 56l-28 62h56z"/><path d="M32 118a28 12 0 0 0 56 0M152 118a28 12 0 0 0 56 0"/>
</svg>`,
  doc: (accent: string, ink = 'currentColor') => `<svg viewBox="0 0 200 200" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M52 24h70l30 30v122H52z"/><path d="M122 24v30h30"/><path d="M70 82h64M70 102h64M70 122h44"/>
  <path d="M128 150l34-34 12 12-34 34-16 4z" fill="${accent}"/>
</svg>`,
  key: (accent: string, ink = 'currentColor') => `<svg viewBox="0 0 200 200" fill="none" stroke="${ink}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
  <path d="M40 96l60-48 60 48v80H40z"/><path d="M84 176v-44h32v44"/><circle cx="148" cy="60" r="16" fill="${accent}"/><path d="M148 76v40M148 96h10M148 108h8"/>
</svg>`,
};
