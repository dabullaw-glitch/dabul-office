// What can be bought, by slug (read by the server function fol-api to check every order, and by the checkout page).
// Areas, cities, courts and tools come from the built site, so an order can only name a page that exists.
import { areas, cities, courts, tools } from '../lib/data';
import { P, u } from '../config/routes';
export async function GET() {
  const body = {
    areas: areas().map((a) => ({ slug: a.slug, name: a.name, group: a.group })),
    cities: cities().map((c) => ({ slug: c.slug, name: c.name, region: c.region })),
    courts: courts().map((c) => ({ slug: c.slug, name: c.name, href: u(P.court(c.he)) })),
    tools: tools().map((t) => ({ slug: t.slug, name: t.name, href: u(P.tool(t.he)) })),
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
