// video-src (5.11.2026): where a calendar row (docs coll "pub") takes its video from.
// The free Supabase plan has 1 GB of storage and the reels filled it (Yakir 5.11.2026: published reels are deleted,
// scheduled reels must still go out, no paid plan). So a reel is published from a PUBLIC https link (the compressed copy on
// the office GitHub Pages site, media/reels-pub/<name>.mp4) kept in "videoUrl" on the pub row and on the reel row.
// Storage (reelPath 'reels/<name>.mp4', a signed link) is only the fallback for old rows that have no link.
// Used by fn/postoria-index.ts, fn/bufauth-index.ts and fn/socialpub-core.js (plain JS so every runtime can import it).

const HTTPS = /^https:\/\/[^\s"'<>]+$/i;

// a public https link, or '' (storage paths, empty values and anything else)
export function publicVideo(x) {
  const s = String(x == null ? '' : x).trim();
  return HTTPS.test(s) ? s : '';
}

// row: the pub row; from: the row named in row.reelFrom (or null).
// Returns { url } for a public link, { path } for a storage path (fallback), or {} when the row has no video of its own.
// Order: the row's own link, then the link of the row it takes its reel from, then storage (the row's, then that row's).
export function pickVideo(row, from) {
  const r = row || {}, f = from || {};
  const url = publicVideo(r.videoUrl) || publicVideo(r.reelPath) || publicVideo(f.videoUrl) || publicVideo(f.reelPath);
  if (url) return { url };
  const path = String(r.reelPath || f.reelPath || '').trim();
  return path ? { path } : {};
}

// true when the row still needs to read its reelFrom row to know its video
export function needsFrom(row) {
  const r = row || {};
  return !!r.reelFrom && !publicVideo(r.videoUrl) && !publicVideo(r.reelPath);
}
