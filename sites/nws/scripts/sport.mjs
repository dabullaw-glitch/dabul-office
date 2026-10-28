// Before every build (28.10.2026 redesign): Maccabi Netanya data for the home page, sports pages and sports stories.
// Source: the Ligat HaAl page of ערוץ הספורט (sport5.co.il), parsed from plain HTML:
//   - the full league table (position, played, won, drawn, lost, goals, goal difference, points, and the league's notes)
//   - the games of the current round (date and time), from which the next Maccabi Netanya game is taken
//   - the last Maccabi Netanya result, from the previous round (same site, the round box of the league page), when available
// The last good copy stays in src/data/sport.json. The site is fetched at most every 30 minutes (the build loop builds often),
// and when anything is missing the site hides that part of the widget instead of showing a placeholder. Never fails the build.
import fs from 'node:fs';

const OUT = 'src/data/sport.json';
const BASE = 'https://www.sport5.co.il';
const LIGA = `${BASE}/liga.aspx?FolderID=44`;
const ME = '193'; // Maccabi Netanya on sport5
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36', 'Accept-Language': 'he-IL,he;q=0.9' };
const old = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return null; } })();
if (old?.fetchedAt && old.v >= 2 && Date.now() - Date.parse(old.fetchedAt) < 30 * 60e3 && !process.env.SPORT_FORCE) { console.log('sport: fresh copy kept'); process.exit(0); }

const ent = (s) => String(s || '').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const txt = (s) => ent(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
// sport5 writes the Hebrew gershayim as two apostrophes (בית''ר, ק''ש)
const team = (s) => txt(s).replace(/''/g, '״').replace(/"/g, '״').replace(/\s+/g, ' ').trim();
const get = (u) => fetch(u, { headers: UA, signal: AbortSignal.timeout(15000) }).then((r) => (r.ok ? r.text() : Promise.reject(new Error(`${r.status} ${u}`))));
const rows = (t) => t.split(/<tr[\s>]/i).slice(1).map((r) => r.split(/<\/tr>/i)[0]);
const cells = (r) => [...r.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => m[1]);
const ids = (h) => [...h.matchAll(/FolderID=(\d+)/gi)].map((m) => m[1]);
const ymd = (d) => { const m = /(\d{1,2})\.(\d{1,2})\.(\d{2,4})/.exec(d); if (!m) return ''; const y = m[3].length === 2 ? `20${m[3]}` : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; };
// Israel time of a date and an HH:MM to ISO (the offset of that day: +03:00 in summer time, +02:00 otherwise)
function ilIso(date, time) {
  if (!date) return '';
  const t = /^\d{1,2}:\d{2}$/.test(time || '') ? time.padStart(5, '0') : '12:00';
  for (const off of ['+03:00', '+02:00']) {
    const d = new Date(`${date}T${t}:00${off}`);
    const hh = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    if (hh === t) return d.toISOString();
  }
  return new Date(`${date}T${t}:00+02:00`).toISOString();
}

function parseTable(html) {
  const t = html.split(/<table/i).map((x) => x.split(/<\/table>/i)[0]).find((x) => /נק[’']/.test(x) && x.includes(`FolderID=${ME}`) && /הפרש/.test(x));
  if (!t) return null;
  const table = []; const notes = [];
  for (const r of rows(t)) {
    const c = cells(r);
    if (c.length === 1 && /הערה/.test(r)) { notes.push(txt(c[0]).replace(/^הערה:\s*/, '')); continue; }
    if (c.length < 9) continue;
    const id = ids(c[1])[0] || '';
    const [ga, gf] = txt(c[6]).split('-').map((x) => Number(x)); // sport5 writes "against-for" in RTL order (e.g. 7-11 = 11 for, 7 against)
    table.push({ pos: Number(txt(c[0])), team: team(c[1]), id, played: Number(txt(c[2])), w: Number(txt(c[3])), d: Number(txt(c[4])), l: Number(txt(c[5])),
      gf: Number.isFinite(gf) ? gf : null, ga: Number.isFinite(ga) ? ga : null, diff: Number(txt(c[7])), pts: Number(txt(c[8])), me: id === ME });
  }
  if (table.length < 10 || !table.some((x) => x.me) || table.some((x) => !Number.isFinite(x.pts) || !Number.isFinite(x.pos))) return null;
  return { table, notes };
}

function parseRound(html) {
  const t = html.split(/<table/i).map((x) => x.split(/<\/table>/i)[0]).find((x) => /<th>\s*משחק\s*<\/th>/.test(x) && /FolderID=/.test(x));
  if (!t) return null;
  const games = [];
  for (const r of rows(t)) {
    const c = cells(r); if (c.length < 2) continue;
    const tm = [...c[0].matchAll(/<a[^>]*FolderID=(\d+)[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ id: m[1], name: team(m[2]) }));
    if (tm.length < 2) continue;
    // the score: in the game cell, or (finished rounds: "משחק | תוצאה | תאריך") in its own cell. sport5 writes it in the raw text
    // as away:home (it is shown right to left); checked on 28.10.2026 against the club's reports of rounds 5 (מכבי נתניה - מכבי
    // תל אביב "2:1", Netanya lost 1:2) and 7 (מכבי נתניה - הפועל קרית שמונה "0:1", Netanya won 1:0). score = [home, away].
    // Same parsing as fn/hns-recurring.
    const sc = /(\d+)\s*[-:]\s*(\d+)/.exec(txt(c[0]).replace(tm[0].name, '').replace(tm[1].name, ''))
      || (/^\s*\d+\s*[-:]\s*\d+\s*$/.test(txt(c[1] || '')) ? /(\d+)\s*[-:]\s*(\d+)/.exec(txt(c[1])) : null);
    const date = ymd(txt(c[2] || c[1] || '')); const time = (/(\d{1,2}:\d{2})/.exec(txt(c[3] || '')) || [])[1] || '';
    games.push({ home: tm[0], away: tm[1], date, time, iso: ilIso(date, time), score: sc ? [Number(sc[2]), Number(sc[1])] : null });
  }
  return games;
}

const out = { v: 2, ok: false, fetchedAt: new Date().toISOString(), source: 'ערוץ הספורט', sourceUrl: LIGA, league: 'ליגת העל', round: null, table: [], notes: [], next: null, last: null };
try {
  const html = process.env.SPORT_HTML ? fs.readFileSync(process.env.SPORT_HTML, 'utf8') : await get(LIGA);
  const tb = parseTable(html);
  if (tb) { out.table = tb.table; out.notes = tb.notes; }
  const round = Number((/מחזור\s*(\d+)\s*<\/strong>/.exec(html.replace(/\s+/g, ' ')) || [])[1]) || null;
  out.round = round;
  const games = parseRound(html) || [];
  const mine = games.find((g) => g.home.id === ME || g.away.id === ME);
  if (mine && mine.date) {
    const home = mine.home.id === ME; const opp = home ? mine.away : mine.home;
    out.next = { home, opponent: opp.name, date: mine.date, time: mine.time, iso: mine.iso, round, venue: home ? 'אצטדיון נתניה' : '', score: mine.score };
  }
  // the previous round (the round box of the league page loads it from this address)
  if (round && round > 1 && !process.env.SPORT_HTML) {
    const lsnum = (/getCycle\('[^']+',\s*(\d+),/.exec(html) || [])[1];
    if (lsnum) {
      // the last round with a Maccabi Netanya score (a postponed game leaves a round without one, so look up to 3 rounds back)
      for (let n = round - 1; n >= Math.max(1, round - 3) && !out.last; n--) {
        try {
          const prev = await get(`${BASE}/Ajax/GetCycleGames.aspx?LSnum=${lsnum}&CycleNum=${n}`);
          const g = (parseRound(prev) || []).find((x) => (x.home.id === ME || x.away.id === ME) && x.score);
          if (g) { const home = g.home.id === ME; const [hs, as] = g.score; out.last = { home, opponent: (home ? g.away : g.home).name, date: g.date, my: home ? hs : as, their: home ? as : hs, round: n }; }
        } catch (e) { console.warn(`sport: round ${n} not loaded (${e.message})`); break; }
      }
    }
  }
  out.ok = out.table.length > 0;
} catch (e) { console.warn(`sport: ${e.message}`); }

// keep the parts of the last good copy that this run could not get
if (old) {
  if (!out.table.length && old.table?.length) { out.table = old.table; out.notes = old.notes || []; out.round = out.round ?? old.round; out.tableAt = old.tableAt || old.fetchedAt; }
  if (!out.next && old.next && Date.parse(old.next.iso) > Date.now() - 3 * 3600e3) out.next = old.next;
  if (!out.last && old.last && old.v >= 2) out.last = old.last;
}
if (out.table.length && !out.tableAt) out.tableAt = out.fetchedAt;
out.ok = out.table.length > 0 || !!out.next;
if (out.ok || !old) fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`sport: table ${out.table.length} rows, round ${out.round}, next ${out.next ? `${out.next.date} ${out.next.time} ${out.next.opponent}` : 'none'}, last ${out.last ? `${out.last.my}-${out.last.their} ${out.last.opponent}` : 'none'}`);
