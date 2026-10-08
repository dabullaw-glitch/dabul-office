import { getCollection } from 'astro:content';
import { SITE } from '../data/site';
export async function GET(ctx: { site: URL }) {
  const B = import.meta.env.BASE_URL.replace(/\/?$/, '/');
  const all = (await getCollection('guides')).filter((g) => !g.data.draft).sort((a, b) => +b.data.updated - +a.data.updated);
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const items = all.map((g) => { const u = new URL(`${B}madrich/${g.id}/`, ctx.site).href; return `<item><title>${esc(g.data.title)}</title><link>${u}</link><guid>${u}</guid><pubDate>${g.data.published.toUTCString()}</pubDate><description>${esc(g.data.description)}</description></item>`; }).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${esc(SITE.name)}</title><link>${new URL(B, ctx.site).href}</link><description>${esc(SITE.description)}</description><language>he-IL</language>${items}</channel></rss>`, { headers: { 'content-type': 'application/xml; charset=utf-8' } });
}
