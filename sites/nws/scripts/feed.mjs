// Before every build: fetch the stories the news engine published (Supabase function hns-feed) into src/data/feed.json.
// If the feed cannot be reached, the build still goes on: the last saved file is kept (or an empty list is written).
import fs from 'node:fs';
const URL_ = process.env.HNS_FEED_URL || 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/hns-feed?limit=500';
const OUT = 'src/data/feed.json';
try {
  const r = await fetch(URL_, { signal: AbortSignal.timeout(30000) });
  const j = await r.json();
  if (!r.ok || !j.ok || !Array.isArray(j.stories)) throw new Error(`feed answered ${r.status}`);
  fs.writeFileSync(OUT, JSON.stringify(j));
  console.log(`feed: ${j.stories.length} published stories`);
} catch (e) {
  console.warn(`feed: not updated (${e.message}); building with ${fs.existsSync(OUT) ? 'the last saved feed' : 'no engine stories'}`);
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, JSON.stringify({ ok: false, stories: [] }));
}
