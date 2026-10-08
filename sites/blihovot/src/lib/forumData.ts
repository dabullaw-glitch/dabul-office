// Build time: the approved forum posts, so every question gets a real page that search engines can read.
// If the forum cannot be reached during the build, the site still builds (the live list loads in the browser).
import { SITE } from '../data/site';
export type FQ = { id: string; title: string; body: string; topic: string; nick: string; created: string; answers: number; staff?: boolean };
export type FA = { id: string; qid: string; body: string; nick: string; created: string; staff?: boolean; guide?: string };
let cache: { questions: FQ[]; answers: FA[] } | null = null;
export async function forumData() {
  if (cache) return cache;
  try {
    // local testing without network: FORUM_EXPORT_FILE=/path/to/export.json
    if (process.env.FORUM_EXPORT_FILE) { const fs = await import('node:fs'); const j = JSON.parse(fs.readFileSync(process.env.FORUM_EXPORT_FILE, 'utf8')); return (cache = { questions: j.questions || [], answers: j.answers || [] }); }
    const r = await fetch(SITE.forumEndpoint + '?a=export', { signal: AbortSignal.timeout(15000) });
    const j = await r.json(); cache = { questions: j.questions || [], answers: j.answers || [] };
  } catch { cache = { questions: [], answers: [] }; }
  return cache;
}
