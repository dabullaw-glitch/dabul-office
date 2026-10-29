// IndexNow for nws.co.il (28.10.2026): tells Bing, Yandex, Seznam, Naver and the other IndexNow engines about new and changed
// pages right after a deploy, so new stories are crawled within minutes. (Google does not use IndexNow; it reads the sitemaps.)
// Run from sites/nws by scripts/loop.sh:
//   node scripts/indexnow.mjs plan <old-manifest-file>   (after the build, before publishing)
//     reads dist/sitemap-pages.xml, writes dist/.indexnow.tsv (url \t lastmod of every story, listing and evergreen page) and
//     .indexnow-urls (the list to send): pages that are new or whose lastmod changed since the last published manifest.
//     Pages whose lastmod is the build time itself (the "now" pages) are left out. When there is something new, the home page and
//     the Hebrew section pages are added. With no old manifest (first run) every page is sent once.
//   node scripts/indexnow.mjs send                       (after a successful publish)
//     posts .indexnow-urls to https://api.indexnow.org/indexnow (at most 10,000 URLs a call), then deletes the list.
// The key is public by design: the key file public/<key>.txt holds the same value, and IndexNow checks it there.
import fs from 'node:fs';

const KEY = '19d5b4b0c4c6f12dc0c0bf92a3ee4cb7'; // 29.10.2026: new key (Bing kept answering 403 for the first one)
const HOST = 'nws.co.il';
const SITE = `https://${HOST}`;
const LIST = '.indexnow-urls';
const [mode, oldFile] = process.argv.slice(2);

function manifest() {
  const xml = fs.readFileSync('dist/sitemap-pages.xml', 'utf8');
  const out = new Map();
  for (const m of xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]+)<\/lastmod>)?/g)) out.set(m[1], m[2] || '');
  return out;
}

if (mode === 'plan') {
  const now = manifest();
  // the build time: the lastmod most pages share when they have no date of their own
  const counts = new Map(); for (const v of now.values()) counts.set(v, (counts.get(v) || 0) + 1);
  const buildTime = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  const keep = [...now.entries()].filter(([, v]) => v && v !== buildTime);
  fs.writeFileSync('dist/.indexnow.tsv', keep.map(([u, v]) => `${u}\t${v}`).join('\n') + '\n');
  let old = null;
  try { old = new Map(fs.readFileSync(oldFile, 'utf8').split('\n').filter(Boolean).map((l) => l.split('\t'))); } catch { old = null; }
  let urls = old ? keep.filter(([u, v]) => old.get(u) !== v).map(([u]) => u) : [...now.keys()];
  if (urls.length && old) {
    const hub = keep.map(([u]) => u).filter((u) => u === `${SITE}/` || /^https:\/\/nws\.co\.il\/[a-z-]+\/$/.test(u));
    urls = [...new Set([...urls, ...hub])];
  }
  fs.writeFileSync(LIST, urls.slice(0, 10000).join('\n'));
  console.log(`indexnow plan: ${urls.length} url(s)${old ? '' : ' (first run, all pages)'}`);
} else if (mode === 'send') {
  let urls = [];
  try { urls = fs.readFileSync(LIST, 'utf8').split('\n').filter(Boolean); } catch { /* nothing planned */ }
  if (!urls.length) process.exit(0);
  try {
    const r = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
      body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList: urls }),
      signal: AbortSignal.timeout(20000),
    });
    console.log(`indexnow: sent ${urls.length} url(s), answer ${r.status}`);
  } catch (e) {
    console.log(`indexnow: not sent (${e.message})`);
  }
  fs.rmSync(LIST, { force: true });
}
