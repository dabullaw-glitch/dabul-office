// sitemap.xml: the public pages and every published article (read at build time; the site rebuilds twice a day).
// Before launch it is an empty list, so nothing points search engines at the site.
import type { APIRoute } from 'astro';
import { getArticles } from '../lib/articles.js';
const PUBLIC = ['', 'maamarim/', 'kelim/', 'kelim/sifriyat-horaot/', 'kelim/machshevon-zman/', 'kelim/bdikat-uvdot/', 'etgar/', 'tnaim/', 'pratiut/', 'negishut/'];
export const GET: APIRoute = async ({ site }) => {
  const live = process.env.PREVIEW === '0';
  const base = import.meta.env.BASE_URL;
  const u = (p: string) => new URL(base + p, site).href;
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let rows: string[] = [];
  if (live) {
    const arts = await getArticles();
    rows = [
      ...PUBLIC.map((p) => `<url><loc>${esc(u(p))}</loc></url>`),
      ...arts.map((a: any) => `<url><loc>${esc(u('maamarim/' + a.slug + '/'))}</loc>${a.updated_at || a.published_at ? `<lastmod>${new Date(a.updated_at || a.published_at).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`),
    ];
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
