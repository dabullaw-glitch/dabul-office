// Build time: the approved forum posts, so every question gets a real page that search engines can read.
// If the forum cannot be reached during the build, the site still builds (the live list loads in the browser).
import { SITE } from '../data/site';
export type FQ = { id: string; title: string; body: string; topic: string; nick: string; created: string; answers: number };
export type FA = { id: string; qid: string; body: string; nick: string; created: string };
let cache: { questions: FQ[]; answers: FA[] } | null = null;
export async function forumData() {
  if (cache) return cache;
  try {
    const r = await fetch(SITE.forumEndpoint + '?a=export', { signal: AbortSignal.timeout(15000) });
    const j = await r.json(); cache = { questions: j.questions || [], answers: j.answers || [] };
  } catch { cache = { questions: [], answers: [] }; }
  return cache;
}
