import { ARTICLES, IMG_PICK, articleUrl } from '../lib/content';
// 30.10.2026: what the photo pick decided for the stories of the last 3 days (topic, where, photo, why), for the daily self check
// (scripts/imgcheck.mjs) and for a quick look by hand. Not linked from any page.
export function GET() {
  const since = Date.now() - 72 * 3600e3;
  const rows = ARTICLES.filter((a) => (Date.parse(a.published) || 0) >= since).map((a) => {
    const p = IMG_PICK.get(a.slug);
    return { u: articleUrl(a), t: a.title, s: a.section, p: a.published, topic: p?.topic ?? '', conf: p?.conf ?? '', where: p?.where ?? '',
      img: a.ai ? 'own' : a.kind === 'sponsored' ? 'sponsored' : p?.lib ? p.lib.id : p?.stock ? `stock:${p.stock}` : '', set: p?.lib?.set || (p?.lib ? 'place' : ''), why: p?.why ?? '' };
  });
  return new Response(JSON.stringify({ at: new Date().toISOString(), rows }), { headers: { 'content-type': 'application/json; charset=utf-8' } });
}
