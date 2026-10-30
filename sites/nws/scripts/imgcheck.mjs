// The daily self check of the story photos (30.10.2026, Yakir: the photo must fit the topic; check every day and fix by itself).
// Runs in GitHub Actions (.github/workflows/imgcheck.yml), once a day, against the LIVE site:
// 1. takes the stories of the last day from https://nws.co.il/search-index.json;
// 2. opens each story page, reads its title, summary and first paragraphs, and the photo at the top of the story;
// 3. reads the story's topic and place with the same reader as the build (src/lib/imgtopics.mjs) and checks the photo against the
//    rules (a crime, security, accident, fire, health, court, election, economy, weather, sports, education or traffic story never
//    has a place photo; a sports story has a sports image; a story from another locality never has a Netanya photo; a landscape
//    only for nature, beach and weather stories; an unclear topic never has a place photo);
// 4. every story that fails goes to src/data/imgfix.json, and the next build gives it the neutral pick (the topic illustration,
//    or the neutral illustration of its section). The workflow commits that file. AI images and the story's own photos are not
//    checked here (they were made for the story).
// Usage: node scripts/imgcheck.mjs <photolib index.json> [hours]
import fs from 'node:fs';
import path from 'node:path';
import { topicOf, whereOf, checkPick } from '../src/lib/imgtopics.mjs';

const SITE = 'https://nws.co.il';
const HOURS = Number(process.argv[3] || process.env.HOURS || 26);
const LIB = new Map((JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).photos || []).map((p) => [p.id, p]));
const HERE = path.dirname(new URL(import.meta.url).pathname);
const FIXF = path.resolve(HERE, '../src/data/imgfix.json');
const placesTs = fs.readFileSync(path.resolve(HERE, '../src/data/places.ts'), 'utf8');
const NETANYA_PLACES = [...placesTs.matchAll(/he: '([^']+)', kind: 'neighborhood'/g)].map((m) => m[1]);
const secTs = fs.readFileSync(path.resolve(HERE, '../src/data/sections.ts'), 'utf8');
const SEC = Object.fromEntries([...secTs.matchAll(/key: '([a-z]+)', slug: '([a-z-]+)'/g)].map((m) => [m[2], m[1]]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { 'User-Agent': 'nws.co.il image self check (office@dabullaw.co.il)' };
const txt = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

const idx = await (await fetch(`${SITE}/search-index.json?t=${Date.now()}`, { headers: UA })).json();
const since = Date.now() - HOURS * 3600e3;
const items = idx.filter((x) => x.p && Date.parse(x.p) >= since && /^\/[a-z-]+\/[a-z0-9-]+\/$/.test(x.u));
const fix = (() => { try { return JSON.parse(fs.readFileSync(FIXF, 'utf8')); } catch { return { fixes: {} }; } })();
fix.fixes ||= {};
const rows = []; let bad = 0;
for (const x of items) {
  const r = await fetch(SITE + x.u, { headers: UA }).catch(() => null);
  await sleep(250);
  if (!r?.ok) { rows.push({ u: x.u, t: x.t, err: `HTTP ${r?.status || 0}` }); continue; }
  const h = await r.text();
  const title = txt((h.match(/<h1[^>]*>([\s\S]*?)<\/h1>/) || [])[1]);
  const dek = txt((h.match(/<p class="n-dek"[^>]*>([\s\S]*?)<\/p>/) || [])[1]);
  const bodyHtml = (h.split('class="n-body"')[1] || '');
  const body = [...bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].slice(0, 4).map((m) => txt(m[1]));
  const hero = (h.match(/<figure class="n-hero">[\s\S]*?<img[^>]*src="([^"]+)"/) || [])[1] || '';
  const slugSec = x.u.split('/')[1];
  const a = { title, dek, body, section: SEC[slugSec] || '', neighborhoods: [] };
  const lib = hero.match(/\/img\/lib\/(c\d+)-/); const st = hero.match(/\/img\/stock\/([a-z-]+)-\d+\.webp/);
  const photo = lib ? (LIB.get(lib[1]) || { id: lib[1], places: [], topics: [] }) : st ? { stock: st[1] } : { own: true };
  const t = topicOf(a); const where = whereOf(a, NETANYA_PLACES);
  const why = checkPick(a, photo, NETANYA_PLACES);
  const slug = x.u.split('/')[2];
  rows.push({ u: x.u, t: title || x.t, topic: t ? `${t.key}/${t.conf}` : 'none', where, img: lib ? `${lib[1]}${photo.set ? ` [${photo.set}]` : ' [place]'}` : st ? `stock:${st[1]}` : 'own', why });
  if (why) { bad++; if (!fix.fixes[slug]) fix.fixes[slug] = { at: new Date().toISOString(), why, img: lib ? lib[1] : st ? st[1] : '' }; }
}
// fixes older than 60 days are dropped (those stories are long out of the feed)
for (const [k, v] of Object.entries(fix.fixes)) if (Date.now() - Date.parse(v.at) > 60 * 864e5) delete fix.fixes[k];
fs.writeFileSync(FIXF, JSON.stringify(fix, null, 1) + '\n');
const lines = [`image self check ${new Date().toISOString()}: ${rows.length} stories of the last ${HOURS} hours, ${bad} mismatched (sent to the neutral pick)`, '',
  '| story | topic | where | photo | result |', '|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.t.replace(/\|/g, '/').slice(0, 70)} | ${r.topic || ''} | ${r.where || ''} | ${r.img || r.err || ''} | ${r.why ? `FIX: ${r.why}` : r.err ? 'not checked' : 'ok'} |`)];
console.log(lines.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n') + '\n');
fs.writeFileSync(process.env.REPORT || '/tmp/imgcheck.json', JSON.stringify({ at: new Date().toISOString(), hours: HOURS, checked: rows.length, mismatched: bad, rows }, null, 1));
