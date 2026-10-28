// Before every build: fetch the approved business directory listings (Supabase function hns-biz, GET) into src/data/biz.json.
// Same pattern as feed.mjs: if the feed cannot be reached, the last saved file is kept (or an empty list is written).
import fs from 'node:fs';
const URL_ = process.env.HNS_BIZ_URL || 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/hns-biz';
const OUT = 'src/data/biz.json';
try {
  const r = await fetch(URL_, { signal: AbortSignal.timeout(30000) });
  const j = await r.json();
  if (!r.ok || !j.ok || !Array.isArray(j.listings)) throw new Error(`biz feed answered ${r.status}`);
  fs.writeFileSync(OUT, JSON.stringify(j));
  console.log(`biz: ${j.listings.length} approved listings`);
} catch (e) {
  console.warn(`biz: not updated (${e.message}); building with ${fs.existsSync(OUT) ? 'the last saved listings' : 'no listings'}`);
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, JSON.stringify({ ok: false, listings: [] }));
}
