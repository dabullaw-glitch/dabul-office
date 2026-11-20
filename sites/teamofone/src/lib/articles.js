// Build-time: published articles from the database (public read, protected by row level security).
import { SB_URL, SB_KEY } from './const.js';
export async function getArticles() {
  try {
    const r = await fetch(`${SB_URL}/rest/v1/too_articles?status=eq.published&select=id,slug,title,seo_title,description,category,cover_url,body_md,faq,published_at,updated_at,author&order=published_at.desc`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } });
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}
export const CATS = ['חדשות', 'מדריכים', 'השוואות כלים', 'מהשטח', 'קידום בגוגל'];
