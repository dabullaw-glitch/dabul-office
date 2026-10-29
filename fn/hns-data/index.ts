// hns-data (28.10.2026): data stories for nws.co.il (חדשות נתניה והשרון) that no local competitor does, built only from official
// public data, with real numbers and our own fixed wording (no AI call, no cost). Each story is inserted into hns_stories as a normal
// 'draft' (sensitivity normal, kind news, official source, places with נתניה), so the regular hns-publish tick publishes it through
// the usual guards. hns_data_runs (kind + key, unique) records what was already produced, so nothing is written twice.
//
// Stories:
//   nadlan    "מחירי הדירות בנתניה": average sale prices by room count, by quarter, for Netanya, its neighborhoods and nearby Sharon
//             towns, from the static public pages of the government real estate site (data.nadlan.gov.il/api/pages, the same files the
//             site shows; they are built from the Tax Authority deal reports). One story per dataset version (field "version").
//             Deal-by-deal data (street level) sits behind reCAPTCHA on nadlan.gov.il and govmap, so it is NOT used.
//   mot       "תאונות הדרכים בנתניה ובשרון": the Ministry of Transport open dataset accidents_municipal on data.gov.il (5-year totals
//             per municipality: accidents with injuries, killed, seriously and lightly injured, pedestrians, e-bikes and scooters).
//             One story per dataset period (field YEARMONTH).
//   prices    (29.10.2026, live page, not a story) the data behind /now/prices/ on nws.co.il: the latest quarter of the same nadlan pages,
//             average price by room count for Netanya with the change from a year earlier and the national figure, a 3/4/5-room table
//             for every neighborhood with enough deals, the nearby Sharon towns and the last 8 quarters of the 4-room average. Written to
//             docs coll 'nwslive' id 'prices' (docs_merge), which hns-feed passes to the site as live.prices. Rewritten only when the
//             dataset version changes.
//   roadsafety monthly roundup of the road accidents we published during the previous month (counts from our own published
//             stories only). Needs at least MIN_ROUNDUP stories, otherwise it is skipped for that month.
//
// POST (x-cron-secret):
//   {action:'tick'}                         cron daily 07:40 Israel time: nadlan and mot when the data changed, roadsafety on days 1-3.
//   {action:'nadlan'|'mot', dry?, force?}   build now (dry: return the story, write nothing; force: even if this version was done).
//   {action:'roadsafety', month?:'YYYY-MM', dry?, force?}
//   {action:'prices', dry?, force?}         rebuild docs nwslive 'prices' (also run by tick).
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MIN_ROUNDUP = 3;

const ilParts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]));
function ilToMs(y: number, mo: number, d: number, h: number, mi: number) {
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3;
}
const MONTHS = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const QUARTER: Record<number, string> = { 3: 'הראשון', 6: 'השני', 9: 'השלישי', 12: 'הרביעי' };
const qName = (y: number, m: number) => `הרבעון ${QUARTER[m] || ''} של ${y}`.replace('  ', ' ');
const qIn = (y: number, m: number) => `ברבעון ${QUARTER[m] || ''} של ${y}`.replace('  ', ' ');
// the government pages cut long neighborhood names at 20 characters ("נאות גנים - שיכון ות"): keep the part before " - "
const hoodName = (t: string) => String(t || '').split(' - ')[0].replace(/"/g, '״').trim();
const deadTxt = (d: number) => (d === 1 ? 'הרוג אחד' : `${d} הרוגים`);
const fmtInt = (n: number) => Math.round(n).toLocaleString('en-US');
// 2,676,100 -> "2.68 מיליון ש״ח"; 950,000 -> "950 אלף ש״ח"
const money = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2).replace(/0$/, '').replace(/\.0$/, '')} מיליון ש״ח` : `${Math.round(n / 1e3)} אלף ש״ח`);
const pct = (a: number, b: number) => ((a - b) / b) * 100;
const pctTxt = (p: number) => `${Math.abs(p).toFixed(1).replace(/\.0$/, '')}%`;
const clean = (s: string) => s.replace(/\s*[—–]\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();

async function getJson(url: string) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, 'Accept': 'application/json' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return await r.json();
}
async function done(kind: string, key: string) {
  const { data } = await sb.from('hns_data_runs').select('id,story_id').eq('kind', kind).eq('key', key).maybeSingle();
  return data;
}
// insert the story as a normal draft (hns-publish publishes it), then record the run
async function save(kind: string, key: string, story: Any, detail: Any, force: boolean) {
  if (!force && await done(kind, key)) return { skipped: 'already done', kind, key };
  const row = { ...story, title: clean(story.title), dek: clean(story.dek), body: story.body.map(clean), key_points: story.key_points.map(clean),
    sensitivity: 'normal', state: 'draft', kind: 'news', basis: 'official', item_ids: [], notes: `hns-data ${kind} ${key}` };
  const { data, error } = await sb.from('hns_stories').insert(row).select('id').single();
  if (error) throw new Error('db: ' + error.message);
  const ins = await sb.from('hns_data_runs').insert({ kind, key: force ? `${key}#${data.id}` : key, story_id: data.id, detail });
  if (ins.error) throw new Error('db runs: ' + ins.error.message);
  return { ok: true, kind, key, story_id: data.id, title: row.title };
}

// ---------- nadlan: quarterly average prices ----------
const NADLAN = 'https://data.nadlan.gov.il/api/pages';
// CBS settlement codes (the same codes as the government site): nearby Sharon towns
const SHARON_TOWNS: [string, number][] = [['כפר יונה', 168], ['אבן יהודה', 182], ['קדימה צורן', 195], ['תל מונד', 154], ['פרדסיה', 171]];
type Pt = { y: number; m: number; v: number; c: number | null };
function series(page: Any, rooms: number): Pt[] {
  const r = (page?.trends?.rooms || []).find((x: Any) => Number(x.numRooms) === rooms);
  return (r?.graphData || []).filter((g: Any) => g.settlementPrice != null || g.neighborhoodPrice != null)
    .map((g: Any) => ({ y: +g.year, m: +g.month, v: Number(g.neighborhoodPrice ?? g.settlementPrice), c: g.countryPrice != null ? Number(g.countryPrice) : null }))
    .sort((a: Pt, b: Pt) => b.y - a.y || b.m - a.m);
}
const at = (s: Pt[], y: number, m: number) => s.find((p) => p.y === y && p.m === m);

async function nadlanStory() {
  const city = await getJson(`${NADLAN}/settlement/buy/7400.json`);
  const version = String(city.version || '');
  if (!version) throw new Error('no version in the nadlan page');
  const s4 = series(city, 4);
  if (!s4.length) throw new Error('no 4-room data for Netanya');
  const last = s4[0];
  // Netanya rooms
  const roomsLines: string[] = [];
  for (const n of [3, 5, 6]) {
    const s = series(city, n);
    if (!s.length) continue;
    const p = s[0];
    roomsLines.push(`דירת ${n} חדרים ${money(p.v)}${p.y !== last.y || p.m !== last.m ? ` (${qName(p.y, p.m)})` : ''}`);
  }
  const yAgo = at(s4, last.y - 1, last.m);
  const yoy = yAgo ? pct(last.v, yAgo.v) : null;
  const vsCountry = last.c ? pct(last.v, last.c) : null;
  // neighborhoods, same quarter as the city figure
  const hoods: { name: string; v: number }[] = [];
  const list = (city.otherNeighborhoods || []).filter((h: Any) => h?.id && !/אזור תעשיה|בתכנון/.test(h.title || ''));
  for (let i = 0; i < list.length; i += 6) {
    const pages = await Promise.all(list.slice(i, i + 6).map((h: Any) => getJson(`${NADLAN}/neighborhood/buy/${h.id}.json`).catch(() => null)));
    pages.forEach((pg, k) => { const p = pg && at(series(pg, 4), last.y, last.m); if (p) hoods.push({ name: hoodName(list[i + k].title), v: p.v }); });
  }
  hoods.sort((a, b) => b.v - a.v);
  // nearby towns, same quarter
  const towns: { name: string; v: number }[] = [];
  for (const [name, code] of SHARON_TOWNS) {
    const pg = await getJson(`${NADLAN}/settlement/buy/${code}.json`).catch(() => null);
    const p = pg && at(series(pg, 4), last.y, last.m);
    if (p) towns.push({ name, v: p.v });
  }
  const q = qName(last.y, last.m), qi = qIn(last.y, last.m);
  const title = `דירת 4 חדרים בנתניה נמכרה בממוצע ב-${money(last.v)} ${qi}`;
  const yoyTxt = yoy == null ? '' : Math.abs(yoy) < 0.5 ? 'כמעט ללא שינוי לעומת הרבעון המקביל אשתקד' : `${yoy > 0 ? 'עלייה' : 'ירידה'} של ${pctTxt(yoy)} לעומת הרבעון המקביל אשתקד`;
  const dek = `נתוני העסקאות של רשות המסים: ${yoyTxt ? `${yoyTxt}, ` : ''}${vsCountry != null ? `והמחיר בעיר ${vsCountry >= 0 ? 'גבוה' : 'נמוך'} ב-${pctTxt(vsCountry)} מהממוצע הארצי` : 'ופילוח לפי שכונות'}.`;
  const body: string[] = [];
  body.push(`המחיר הממוצע של דירת 4 חדרים שנמכרה בנתניה ${qi} עמד על ${money(last.v)}, כך עולה מנתוני העסקאות שמפרסם אתר הנדל"ן הממשלתי של רשות המסים.`
    + (yoy != null && yAgo ? ` ברבעון המקביל אשתקד הממוצע היה ${money(yAgo.v)}, כלומר ${yoyTxt}.` : '')
    + (last.c && vsCountry != null ? ` הממוצע הארצי לדירת 4 חדרים באותו רבעון היה ${money(last.c)}, ובנתניה המחיר ${vsCountry >= 0 ? 'גבוה' : 'נמוך'} ממנו ב-${pctTxt(vsCountry)}.` : ''));
  if (roomsLines.length) body.push(`בגדלים אחרים, המחיר הממוצע בעיר: ${roomsLines.join(', ')}.`);
  if (hoods.length >= 6) {
    const top = hoods.slice(0, 3).map((h) => `${h.name} (${money(h.v)})`).join(', ');
    const low = hoods.slice(-3).reverse().map((h) => `${h.name} (${money(h.v)})`).join(', ');
    body.push(`בפילוח לפי שכונות, באותו רבעון נמכרו דירות 4 חדרים במחיר הממוצע הגבוה ביותר בשכונות ${top}. המחירים הממוצעים הנמוכים ביותר לדירה כזו נרשמו בשכונות ${low}. מחירים נמסרו ל-${hoods.length} שכונות שבהן היו מספיק עסקאות.`);
  } else if (hoods.length) {
    body.push(`בשכונות שבהן היו מספיק עסקאות באותו רבעון: ${hoods.map((h) => `${h.name} ${money(h.v)}`).join(', ')}.`);
  }
  if (towns.length) body.push(`ביישובי השרון הסמוכים, המחיר הממוצע של דירת 4 חדרים באותו רבעון: ${towns.map((t) => `${t.name} ${money(t.v)}`).join(', ')}.`);
  body.push(`איך לקרוא את המספרים: אלה ממוצעים רבעוניים של עסקאות מכירה שדווחו לרשות המסים, כפי שהם מוצגים באתר הנדל"ן הממשלתי. ממוצע מושפע מסוג הדירות שנמכרו באותו רבעון, ולכן שינוי ברבעון אחד לא תמיד מעיד על מגמה. שכונה או יישוב עם מעט עסקאות לא מוצגים. הנתונים עודכנו באתר הממשלתי ב-${version.replace(/-/g, '.')}.`);
  const key_points = [
    `דירת 4 חדרים בנתניה: ${money(last.v)} בממוצע ${qi}`,
    yoy != null ? `${yoy >= 0 ? 'עלייה' : 'ירידה'} של ${pctTxt(yoy)} לעומת הרבעון המקביל אשתקד` : `מקור: נתוני העסקאות של רשות המסים`,
    hoods.length >= 6 ? `השכונה היקרה ביותר לדירה כזו: ${hoods[0].name}` : (vsCountry != null ? `${vsCountry >= 0 ? 'גבוה' : 'נמוך'} ב-${pctTxt(vsCountry)} מהממוצע הארצי` : `נתונים לפי גודל דירה ושכונה`),
  ];
  const story = { section: 'realestate', kicker: 'נתוני נדל"ן', title, dek, body, key_points,
    places: ['נתניה', ...hoods.slice(0, 3).map((h) => h.name), ...towns.map((t) => t.name)].slice(0, 12),
    sources: [{ id: 'nadlan_gov', name: 'אתר הנדל״ן הממשלתי (רשות המסים)', url: 'https://www.nadlan.gov.il/?view=settlement&id=7400&page=deals', trust: 'official' }] };
  return { key: `${version}|${last.y}-${last.m}`, story, detail: { version, quarter: `${last.y}-${last.m}`, city4: last, yoy, vsCountry, hoods: hoods.length, towns } };
}

// ---------- prices: the live page /now/prices/ ----------
async function pricesLive(b: Any) {
  const city = await getJson(`${NADLAN}/settlement/buy/7400.json`);
  const version = String(city.version || '');
  const s4 = series(city, 4);
  if (!version || !s4.length) throw new Error('no version or 4-room data for Netanya');
  const last = s4[0];
  if (!b.force && !b.dry) {
    const { data: cur } = await sb.from('docs').select('data').eq('coll', 'nwslive').eq('id', 'prices').maybeSingle();
    if ((cur?.data as Any)?.version === version) return { skipped: 'same version', version };
  }
  const row = (s: Pt[]) => { const p = at(s, last.y, last.m); if (!p) return null; const a = at(s, last.y - 1, last.m); return { v: Math.round(p.v), yoy: a ? +pct(p.v, a.v).toFixed(1) : null, country: p.c != null ? Math.round(p.c) : null }; };
  const rooms = [3, 4, 5, 6].map((n) => ({ rooms: n, ...(row(series(city, n)) || {}) })).filter((r: Any) => r.v);
  const history = s4.slice(0, 8).map((p) => ({ y: p.y, m: p.m, label: qName(p.y, p.m), v: Math.round(p.v), country: p.c != null ? Math.round(p.c) : null }));
  const list = (city.otherNeighborhoods || []).filter((h: Any) => h?.id && !/אזור תעשיה|בתכנון/.test(h.title || ''));
  const hoods: Any[] = [];
  for (let i = 0; i < list.length; i += 6) {
    const pages = await Promise.all(list.slice(i, i + 6).map((h: Any) => getJson(`${NADLAN}/neighborhood/buy/${h.id}.json`).catch(() => null)));
    pages.forEach((pg, k) => {
      if (!pg) return;
      const r3 = row(series(pg, 3)), r4 = row(series(pg, 4)), r5 = row(series(pg, 5));
      if (r3 || r4 || r5) hoods.push({ id: list[i + k].id, name: hoodName(list[i + k].title), r3: r3?.v ?? null, r4: r4?.v ?? null, r5: r5?.v ?? null, yoy4: r4?.yoy ?? null });
    });
  }
  hoods.sort((a, b) => (b.r4 ?? 0) - (a.r4 ?? 0) || a.name.localeCompare(b.name, 'he'));
  const towns: Any[] = [];
  for (const [name, code] of SHARON_TOWNS) {
    const pg = await getJson(`${NADLAN}/settlement/buy/${code}.json`).catch(() => null);
    const r4 = pg && row(series(pg, 4));
    if (r4) towns.push({ name, code, v: r4.v, yoy: r4.yoy });
  }
  const data = { version, quarter: { y: last.y, m: last.m, label: qName(last.y, last.m), in: qIn(last.y, last.m) }, rooms, history, hoods, towns,
    source: 'אתר הנדל״ן הממשלתי (רשות המסים)', sourceUrl: 'https://www.nadlan.gov.il/?view=settlement&id=7400&page=deals', updatedAt: new Date().toISOString() };
  if (b.dry) return { dry: true, data };
  const { error } = await sb.rpc('docs_merge', { p_coll: 'nwslive', p_id: 'prices', p_patch: data });
  if (error) throw new Error('db: ' + error.message);
  return { ok: true, version, quarter: data.quarter.label, hoods: hoods.length, towns: towns.length };
}

// ---------- mot: 5-year road accident totals per municipality ----------
const MOT_RES = 'b17b1634-c001-4d37-96c6-a661b2ecd98c';
const MOT_TOWNS = ['נתניה', 'כפר יונה', 'אבן יהודה', 'קדימה - צורן', 'קדימה-צורן', 'תל מונד', 'פרדסיה', 'פרדסייה', 'עמק חפר', 'לב השרון', 'חוף השרון'];
async function motStory() {
  const url = `https://data.gov.il/api/3/action/datastore_search?resource_id=${MOT_RES}&limit=300&filters=${encodeURIComponent(JSON.stringify({ MUNICIPAL: MOT_TOWNS }))}`;
  const j = await getJson(url);
  const recs: Any[] = j?.result?.records || [];
  const n = recs.find((r) => r.MUNICIPAL === 'נתניה');
  if (!n) throw new Error('no Netanya row in accidents_municipal');
  const ym = String(n.YEARMONTH || '');
  const endY = +ym.slice(0, 4), endM = +ym.slice(4, 6);
  const period = `בחמש השנים שהסתיימו ב${MONTHS[endM - 1]} ${endY}`;
  const num = (v: unknown) => Number(v) || 0;
  const title = `${fmtInt(num(n.SUMACCIDEN))} תאונות דרכים עם נפגעים בנתניה בחמש שנים, ${deadTxt(num(n.DEAD))}`;
  const dek = `נתוני משרד התחבורה ${period}: ${fmtInt(num(n.SEVER_INJ))} פצועים קשה, ${fmtInt(num(n.PEDESTRINJ))} הולכי רגל נפגעו.`;
  const body: string[] = [];
  body.push(`${period} נרשמו בתחום העיר נתניה ${fmtInt(num(n.SUMACCIDEN))} תאונות דרכים עם נפגעים, כך עולה מנתוני משרד התחבורה שמפורסמים במאגר המידע הממשלתי. בתאונות נהרגו ${num(n.DEAD)} בני אדם, ${fmtInt(num(n.SEVER_INJ))} נפצעו קשה ו-${fmtInt(num(n.SLIGH_INJ))} נפצעו קל.`);
  body.push(`בין הנפגעים: ${fmtInt(num(n.PEDESTRINJ))} הולכי רגל ו-${fmtInt(num(n.ELECTRIC_INJ))} רוכבי אופניים חשמליים וקורקינטים. לפי גיל, ${fmtInt(num(n.INJ0_19))} מהנפגעים היו עד גיל 19 ו-${fmtInt(num(n.INJ65_))} בני 65 ומעלה. בתאונות היו מעורבים ${fmtInt(num(n.MOTORCYCLE))} אופנועים, ${fmtInt(num(n.BICYCLE))} אופניים ו-${fmtInt(num(n.SCOOTERS))} קטנועים.`);
  // regional councils come as one row per locality: sum them per municipality
  const agg = new Map<string, { name: string; acc: number; dead: number }>();
  for (const r of recs) {
    if (r.MUNICIPAL === 'נתניה') continue;
    const a = agg.get(r.MUNICIPAL) || { name: String(r.MUNICIPAL).replace(/\s*-\s*/g, ' '), acc: 0, dead: 0 };
    a.acc += num(r.SUMACCIDEN); a.dead += num(r.DEAD); agg.set(r.MUNICIPAL, a);
  }
  const others = [...agg.values()].filter((a) => a.acc > 0).sort((a, b) => b.acc - a.acc);
  if (others.length) body.push(`ברשויות השרון הסמוכות, באותה תקופה: ${others.map((a) => `${a.name} ${fmtInt(a.acc)} תאונות${a.dead === 1 ? ' והרוג אחד' : a.dead ? ` ו-${a.dead} הרוגים` : ''}`).join(', ')}.`);
  body.push(`הנתונים כוללים תאונות דרכים עם נפגעים שנחקרו על ידי המשטרה ונאספו על ידי הלשכה המרכזית לסטטיסטיקה, ומשרד התחבורה מסכם אותם לפי שטח הרשות המקומית. תאונה ללא נפגעים לא נכללת.`);
  const key_points = [`${fmtInt(num(n.SUMACCIDEN))} תאונות עם נפגעים בנתניה ${period}`, `${num(n.DEAD)} הרוגים ו-${fmtInt(num(n.SEVER_INJ))} פצועים קשה`, `${fmtInt(num(n.PEDESTRINJ))} הולכי רגל נפגעו`];
  const story = { section: 'transport', kicker: 'בטיחות בדרכים', title, dek, body, key_points,
    places: ['נתניה', ...others.map((a) => a.name)].slice(0, 12),
    sources: [{ id: 'mot_data', name: 'משרד התחבורה - מאגר תאונות הדרכים', url: 'https://data.gov.il/dataset/accidents_municipal', trust: 'official' }] };
  return { key: ym, story, detail: { yearmonth: ym, netanya: n, others: others.length } };
}

// ---------- roadsafety: monthly roundup of our own published accident stories ----------
const ACC_RE = /תאונ|התנגש|פגיעת רכב|נפגע מרכב|נפגעה מרכב|הולך רגל|הולכת רגל|התהפך|התהפכה|רוכב אופנוע|רוכבת אופנוע|רוכב אופניים|קורקינט/;
async function roadsafetyStory(month: string) {
  const [y, m] = month.split('-').map(Number);
  const from = new Date(ilToMs(y, m, 1, 0, 0)).toISOString();
  const to = new Date(ilToMs(m === 12 ? y + 1 : y, m === 12 ? 1 : m + 1, 1, 0, 0)).toISOString();
  const { data } = await sb.from('hns_stories').select('id,title,dek,body,places,published_at,sources,kind').eq('state', 'published')
    .gte('published_at', from).lt('published_at', to).order('published_at');
  const acc = (data || []).filter((s: Any) => s.kind !== 'sponsored' && s.kind !== 'opinion' && ACC_RE.test(`${s.title} ${s.dek || ''}`));
  if (acc.length < MIN_ROUNDUP) return { key: month, skip: `only ${acc.length} accident stories in ${month}`, ids: acc.map((s: Any) => s.id) };
  const text = (s: Any) => `${s.title} ${s.dek || ''} ${(Array.isArray(s.body) ? s.body : []).join(' ')}`;
  const sev = { dead: 0, serious: 0, moderate: 0 };
  for (const s of acc) {
    const t = text(s);
    if (/נהרג|נהרגה|נקבע מות|מותו|מותה/.test(t)) sev.dead++;
    else if (/קשה|אנוש/.test(t)) sev.serious++;
    else if (/בינוני/.test(t)) sev.moderate++;
  }
  const byPlace = new Map<string, number>();
  for (const s of acc) { const p = (s.places || []).find((x: string) => !/^כביש|בית החולים|מחלף|צומת/.test(x)) || 'נתניה'; byPlace.set(p, (byPlace.get(p) || 0) + 1); }
  const mName = `${MONTHS[m - 1]} ${y}`;
  const title = `סיכום ${mName} בכבישי נתניה והשרון: ${acc.length} ידיעות על תאונות דרכים`;
  const dek = `${sev.dead ? `${sev.dead} תאונות קטלניות, ` : ''}${sev.serious} עם פצועים קשה${sev.moderate ? ` ו-${sev.moderate} עם פצועים במצב בינוני` : ''}, על פי הידיעות שפרסמנו במהלך החודש.`;
  const dd = (iso: string) => { const p = ilParts(new Date(iso)); return `${+p.day}.${+p.month}`; };
  const body = [
    `במהלך ${mName} פרסמנו ${acc.length} ידיעות על תאונות דרכים בנתניה ובשרון או על תושבי האזור שנפגעו בהן. ${sev.dead ? `ב-${sev.dead} מהן היו הרוגים, ` : ''}ב-${sev.serious} היו פצועים קשה${sev.moderate ? ` וב-${sev.moderate} פצועים במצב בינוני` : ''}. הספירה מבוססת על הידיעות שפורסמו באתר, שנכתבו על פי הודעות מד"א, המשטרה וגופי ההצלה.`,
    `לפי מקום: ${[...byPlace.entries()].sort((a, b) => b[1] - a[1]).map(([p, c]) => `${p} ${c}`).join(', ')}.`,
    `הידיעות שפורסמו: ${acc.map((s: Any) => `${dd(s.published_at)} ${s.title}`).join('; ')}.`,
    `נתוני התאונות הרשמיים של הלשכה המרכזית לסטטיסטיקה מתפרסמים באיחור של כמה חודשים, ולכן הסיכום הזה מבוסס על הדיווחים השוטפים בלבד.`,
  ];
  const key_points = [`${acc.length} ידיעות על תאונות דרכים ב${mName}`, `${sev.dead} קטלניות, ${sev.serious} עם פצועים קשה`, `מספר הידיעות הגבוה ביותר: ${[...byPlace.entries()].sort((a, b) => b[1] - a[1])[0][0]}`];
  const srcMap = new Map<string, Any>();
  for (const s of acc) for (const x of (s.sources || [])) if (x.trust === 'official' && !srcMap.has(x.id)) srcMap.set(x.id, x);
  const sources = srcMap.size ? [...srcMap.values()] : [{ id: 'mda_tg', name: 'מד״א', url: 'https://t.me/s/mdaisrael', trust: 'official' }];
  const story = { section: 'transport', kicker: 'סיכום חודשי', title, dek, body, key_points, places: ['נתניה', ...[...byPlace.keys()].filter((p) => p !== 'נתניה')].slice(0, 12), sources };
  return { key: month, story, detail: { month, ids: acc.map((s: Any) => s.id), sev } };
}

function prevMonth() {
  const p = ilParts(new Date());
  const y = +p.year, m = +p.month;
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}

async function run(kind: string, b: Any) {
  const built = kind === 'nadlan' ? await nadlanStory() : kind === 'mot' ? await motStory() : await roadsafetyStory(b.month || prevMonth());
  // deno-lint-ignore no-explicit-any
  const x: any = built;
  if (x.skip) return { kind, skipped: x.skip, ids: x.ids };
  if (b.dry) return { kind, dry: true, key: x.key, already: !!(await done(kind, x.key)), story: x.story, detail: x.detail };
  return await save(kind, x.key, x.story, x.detail, !!b.force);
}

async function tick() {
  const out: Any[] = [];
  for (const k of ['nadlan', 'mot']) { try { out.push(await run(k, {})); } catch (e) { out.push({ kind: k, error: String((e as Error).message || e) }); } }
  try { out.push({ kind: 'prices', ...(await pricesLive({})) }); } catch (e) { out.push({ kind: 'prices', error: String((e as Error).message || e) }); }
  if (+ilParts(new Date()).day <= 3) { try { out.push(await run('roadsafety', {})); } catch (e) { out.push({ kind: 'roadsafety', error: String((e as Error).message || e) }); } }
  return out;
}

Deno.serve(async (req) => {
  const { data } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!data?.v || req.headers.get('x-cron-secret') !== data.v) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, res: await tick() });
    if (b.action === 'prices') return J({ ok: true, res: await pricesLive(b) });
    if (['nadlan', 'mot', 'roadsafety'].includes(b.action)) return J({ ok: true, res: await run(b.action, b) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
