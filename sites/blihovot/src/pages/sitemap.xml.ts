import { getCollection } from 'astro:content';
import { HUBS } from '../data/site';
import { ALL_TOOLS as TOOLS } from '../data/tools';
import { forumData } from '../lib/forumData';
export async function GET(ctx: { site: URL }) {
  const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const u = (p: string) => new URL(B + p, ctx.site).href;
  const guides = (await getCollection('guides')).filter((g) => !g.data.draft);
  const lessons = await getCollection('lessons');
  const { questions } = await forumData();
  const latest = guides.reduce((m, g) => (+g.data.updated > m ? +g.data.updated : m), 0);
  const d = (x: number | Date) => new Date(x).toISOString().slice(0, 10);
  const rows: [string, string][] = [
    ['', d(latest)], ['madrich/', d(latest)], ['kli/', d(latest)], ['kurs/', d(latest)], ['video/', d(latest)], ['milon/', d(latest)], ['pniya/', d(latest)], ['odot/', d(latest)], ['pirsum/', d(latest)], ['forum/', d(latest)], ['hamchashot/', d(latest)], ['mischak/', d(latest)], ['forum/klalim/', d(latest)],
    ...HUBS.map((h) => [`nose/${h.id}/`, d(latest)] as [string, string]),
    ...TOOLS.map((t) => [`kli/${t.id}/`, d(latest)] as [string, string]),
    ...guides.map((g) => [`madrich/${g.id}/`, d(g.data.updated)] as [string, string]),
    ...lessons.map((l) => [`kurs/${l.id}/`, d(latest)] as [string, string]),
    ...questions.map((q) => [`forum/q/${q.id}/`, d(new Date(q.created))] as [string, string]),
  ];
  const body = rows.map(([p, m]) => `<url><loc>${u(p)}</loc><lastmod>${m}</lastmod></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
