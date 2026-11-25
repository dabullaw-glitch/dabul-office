// Small index for the search page (client side). Public business details and page titles only.
import { areas, cities, firms, articles, tools, courts } from '../lib/data';
import { P, u } from '../config/routes';
export async function GET() {
  const fs = await firms();
  const city = (s: string) => cities().find((c) => c.slug === s);
  const body = {
    areas: areas().map((a) => ({ s: a.slug, n: a.name, t: a.title, h: u(P.area(a.he)), he: a.he })),
    cities: cities().map((c) => ({ s: c.slug, n: c.name, he: c.he })),
    firms: fs.map((f) => ({ n: f.name, h: u(P.firm(f.slug)), c: f.city, cn: city(f.city)?.name || '', a: f.areas, p: f.phone, promo: f.plan !== 'free', sample: f.isSample, claimed: f.claimed })),
    pages: [
      ...articles().map((a) => ({ k: 'מדריך', n: a.title, d: a.description, h: u(P.article(a.he)) })),
      ...tools().map((t) => ({ k: 'כלי', n: t.name, d: t.description, h: u(P.tool(t.he)) })),
      ...courts().map((c) => ({ k: 'בית משפט', n: c.name, d: c.address, h: u(P.court(c.he)) })),
    ],
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
