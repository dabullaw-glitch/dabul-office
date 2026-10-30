// Events calendar pages and schema.org Event data (30.10.2026, item 5 Yakir approved): every event of the official calendar
// (feed.json "calendar", today only the Netanya culture hall on smarticket) gets its own indexable page on our site,
// /events/e/<id>/, with the official ticket link, so Google can show it as an event. The Event JSON-LD follows Google's
// event rich result rules: name, startDate with the Israel offset, location as a Place with an address, plus url,
// eventStatus, organizer and an offer only with the official link. No image: we have no photo of the event itself.
import { CALENDAR, calTime, calVenue, type CalItem } from './content';
import { SITE_URL } from '../data/site';

const TZ = 'Asia/Jerusalem';
export const eventUrl = (c: Pick<CalItem, 'id'>) => `/events/e/${c.id}/`;
export const eventById = (id: number | string) => CALENDAR.find((c) => String(c.id) === String(id));

// The Israel wall clock time with its offset ("2026-10-31T21:00:00+02:00"); an event without an hour (00:00) is a date only.
export function ilIso(iso: string): string {
  const d = new Date(iso);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(d).map((x) => [x.type, x.value]));
  const date = `${p.year}-${p.month}-${p.day}`;
  if (!calTime(iso)) return date;
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  const off = Math.round((wall - d.getTime()) / 60000); const a = Math.abs(off);
  return `${date}T${p.hour}:${p.minute}:${p.second}${off < 0 ? '-' : '+'}${String(Math.floor(a / 60)).padStart(2, '0')}:${String(a % 60).padStart(2, '0')}`;
}

// The hall the event is in: the calendar's venue name without the culture hall prefix; a venue that is not a name ("אולם לא
// מסומן") falls back to the organizer. A venue that is a street address ("סולומון 4 נתניה") is also its street address.
export function eventPlace(c: CalItem) {
  const v = calVenue(c).trim();
  const bad = !v || /לא מסומן/.test(v);
  const name = bad ? c.source : (c.venue.startsWith('היכל התרבות') ? c.venue : v);
  const street = /^[֐-׿"׳' ]+ \d+[א-ת]?( נתניה)?$/.test(v) ? v.replace(/ נתניה$/, '') : undefined;
  return { name, street };
}

export function eventLd(c: CalItem) {
  const pl = eventPlace(c);
  const url = SITE_URL + eventUrl(c);
  return {
    '@context': 'https://schema.org', '@type': 'Event', '@id': url + '#event', name: c.title, url, startDate: ilIso(c.start),
    eventStatus: 'https://schema.org/EventScheduled', eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode', inLanguage: 'he',
    description: `${c.title}, ${pl.name}, נתניה. מתוך לוח האירועים הרשמי של ${c.source}.`,
    location: { '@type': 'Place', name: pl.name, address: { '@type': 'PostalAddress', ...(pl.street ? { streetAddress: pl.street } : {}), addressLocality: 'נתניה', addressCountry: 'IL' } },
    organizer: { '@type': 'Organization', name: c.source, ...(c.url ? { url: new URL(c.url).origin } : {}) },
    ...(c.url ? { offers: { '@type': 'Offer', url: c.url } } : {}),
  };
}
