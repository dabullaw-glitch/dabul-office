// The live flashes list (29.10.2026, Yakir: the home box and the side box of the other pages must show the same thing): official
// flashes and the newest urgent stories, by time, without blog guides and sponsored content. Used by Home.astro and list/ListAside.astro.
import { articlesFor, articleUrl, FLASHES } from './content';
import type { Lang } from '../data/site';
export type FeedItem = { at: string; text: string; href: string; src?: string };
// official flash texts often end with their own "עודכן ב-29/10 09:49"; the box already shows the time
export const tidyFlash = (t: string) => t.replace(/\s*[,.]?\s*עודכן\s*ב?-?\s*\d{1,2}[/.]\d{1,2}(?:[/.]\d{2,4})?(?:\s*,?\s*(?:בשעה\s*)?\d{1,2}:\d{2})?\s*\.?\s*$/, '').trim();
export function liveFeed(lang: Lang, n = 20): FeedItem[] {
  const he = lang === 'he';
  // 29.10.2026 (Yakir approved): only urgent, new news enters the flashes (the engine marks it, hns-feed isFlash), and only from
  // the last 24 hours; everything else stays in its section and on the home page as a regular story
  const since = Date.now() - 24 * 3600e3;
  const stories = articlesFor(lang).filter((a) => a.flash === true && a.kind !== 'sponsored' && (a.section as string) !== 'blog' && Date.parse(a.published) >= since);
  return [...(he ? FLASHES.map((f) => ({ at: f.at, text: tidyFlash(f.text), href: `/flash/#f${f.id}`, src: f.source })) : []),
    ...stories.slice(0, 20).map((a) => ({ at: a.published, text: a.title, href: articleUrl(a, lang) }))]
    .sort((x, y) => Date.parse(y.at) - Date.parse(x.at)).filter((x, i, arr) => arr.findIndex((y) => y.text === x.text) === i).slice(0, n);
}
