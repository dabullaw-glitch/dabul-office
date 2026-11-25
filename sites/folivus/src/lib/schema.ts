// JSON-LD builders. Only real fields: nothing is filled with guesses (no fake ratings, no prices that are not final).
import { BRAND } from '../config/brand';
import { abs, P, SEG } from '../config/routes';
import type { Firm, Article, Faq, Area, City, Tool, Court, Author } from './data';
import { DAYS, isoDate } from './data';

export const orgId = () => abs('') + '#org';
export const siteId = () => abs('') + '#site';

export const organization = () => ({
  '@type': 'Organization', '@id': orgId(), name: BRAND.name, alternateName: BRAND.nameLatin, url: abs(''),
  logo: abs('icon-512.png'), description: BRAND.description, foundingDate: String(BRAND.foundingYear),
  ...(BRAND.email ? { email: BRAND.email } : {}),
});

export const website = () => ({
  '@type': 'WebSite', '@id': siteId(), url: abs(''), name: BRAND.name, inLanguage: 'he-IL', publisher: { '@id': orgId() },
  potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: abs(P.page('search')) + '?q={search_term_string}' }, 'query-input': 'required name=search_term_string' },
});

export const breadcrumbs = (items: { name: string; path: string }[]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});

export const faqPage = (faq: Faq[]) => faq.length ? ({
  '@type': 'FAQPage', mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
}) : null;

export const itemList = (name: string, items: { name: string; path: string }[]) => ({
  '@type': 'ItemList', name, numberOfItems: items.length,
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, url: abs(it.path) })),
});

const person = (a: Author) => a.type === 'Person'
  ? { '@type': 'Person', name: a.name, jobTitle: a.role, url: abs(P.author(a.slug)), ...(a.sameAs.length ? { sameAs: a.sameAs } : {}) }
  : { '@id': orgId() };

export const article = (a: Article, path: string) => ({
  '@type': 'Article', headline: a.title, description: a.description, inLanguage: 'he-IL', mainEntityOfPage: abs(path),
  datePublished: isoDate(a.published), dateModified: isoDate(a.updated || a.published), author: person(a.author),
  ...(a.reviewer ? { reviewedBy: person(a.reviewer) } : {}), publisher: { '@id': orgId() }, wordCount: a.words,
  ...(a.sources.length ? { citation: a.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url })) } : {}),
  image: abs('og/default.png'),
});

export const guide = (area: Area, path: string) => area.guide ? ({
  '@type': 'Article', headline: area.guide.seoTitle || area.title, description: area.description, inLanguage: 'he-IL',
  mainEntityOfPage: abs(path), dateModified: isoDate(area.guide.updated), author: { '@id': orgId() }, publisher: { '@id': orgId() },
  about: { '@type': 'Thing', name: area.name },
  ...(area.guide.sources.length ? { citation: area.guide.sources.map((s) => ({ '@type': 'CreativeWork', name: s.title, url: s.url })) } : {}),
}) : null;

const dayMap: Record<string, string> = { sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday' };
export const firm = (f: Firm, path: string, cityName: string, areaNames: string[]) => {
  const hours = f.hours ? Object.entries(f.hours).filter(([, v]) => /^\d\d:\d\d-\d\d:\d\d$/.test(v)).map(([d, v]) => ({
    '@type': 'OpeningHoursSpecification', dayOfWeek: dayMap[d], opens: v.split('-')[0], closes: v.split('-')[1] })) : [];
  return {
    '@type': 'LegalService', '@id': abs(path) + '#firm', name: f.name, url: abs(path),
    ...(f.website ? { sameAs: [f.website] } : {}),
    ...(f.phone ? { telephone: f.phone } : {}),
    address: { '@type': 'PostalAddress', ...(f.address ? { streetAddress: f.address } : {}), addressLocality: cityName, addressCountry: 'IL' },
    areaServed: { '@type': 'City', name: cityName },
    knowsAbout: areaNames,
    ...(hours.length ? { openingHoursSpecification: hours } : {}),
    ...(f.extended?.description ? { description: f.extended.description } : {}),
    ...(f.extended?.languages?.length ? { knowsLanguage: f.extended.languages } : {}),
    // aggregateRating only from verified reviews on this site, and only when there are any
    ...(f.reviews.length ? {
      aggregateRating: { '@type': 'AggregateRating', ratingValue: (f.reviews.reduce((s, r) => s + r.rating, 0) / f.reviews.length).toFixed(1), reviewCount: f.reviews.length, bestRating: 5, worstRating: 1 },
      review: f.reviews.slice(0, 5).map((r) => ({ '@type': 'Review', reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5 }, author: { '@type': 'Person', name: r.author }, datePublished: r.date, reviewBody: r.body })),
    } : {}),
  };
};

export const howTo = (t: Tool, path: string) => ({
  '@type': 'HowTo', name: 'איך משתמשים ב' + t.name, description: t.description, inLanguage: 'he-IL', url: abs(path),
  step: [
    ...t.inputs.slice(0, 6).map((i, n) => ({ '@type': 'HowToStep', position: n + 1, name: i.label, text: i.help || 'ממלאים את השדה: ' + i.label })),
    { '@type': 'HowToStep', position: Math.min(t.inputs.length, 6) + 1, name: t.type === 'generator' ? 'הפקת המסמך' : 'קבלת התוצאה', text: t.type === 'generator' ? 'לוחצים על הפקת המסמך, בודקים את הנוסח ומעתיקים או מדפיסים.' : 'לוחצים על חישוב ומקבלים פירוט לפי מדרגות.' },
  ],
});

export const webApp = (t: Tool, path: string) => ({
  '@type': 'WebApplication', name: t.name, url: abs(path), applicationCategory: 'FinanceApplication', operatingSystem: 'Any',
  inLanguage: 'he-IL', offers: { '@type': 'Offer', price: '0', priceCurrency: 'ILS' }, isAccessibleForFree: true,
  ...(t.updated ? { dateModified: isoDate(t.updated) } : {}),
});

export const courthouse = (c: Court, path: string) => ({
  '@type': 'Courthouse', name: c.name, url: abs(path),
  ...(c.address ? { address: { '@type': 'PostalAddress', streetAddress: c.address, addressLocality: c.city, addressCountry: 'IL' } } : {}),
  ...(c.phone ? { telephone: c.phone } : {}),
  ...(c.lat && c.lng ? { geo: { '@type': 'GeoCoordinates', latitude: c.lat, longitude: c.lng } } : {}),
});

export const collection = (name: string, path: string, description: string) => ({
  '@type': 'CollectionPage', name, url: abs(path), description, inLanguage: 'he-IL', isPartOf: { '@id': siteId() },
});

export const graph = (...nodes: any[]) => ({ '@context': 'https://schema.org', '@graph': nodes.filter(Boolean) });
export { SEG };
