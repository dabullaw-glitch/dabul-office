// The newest stories, polled by the browser every 60 seconds to show the "N ידיעות חדשות" pill without a full reload.
import { ARTICLES, articleUrl } from '../lib/content';
export function GET() {
  const items = ARTICLES.slice(0, 30).map((a) => ({ u: articleUrl(a), t: a.title, at: a.published, s: a.section }));
  return new Response(JSON.stringify({ at: new Date().toISOString(), items }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
