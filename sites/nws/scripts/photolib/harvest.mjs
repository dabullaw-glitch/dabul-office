// The photo library of nws.co.il (30.10.2026, Yakir approved: real photos of Netanya and the Sharon instead of the ~20 fixed stock
// photos, for stories that have no image of their own). Runs in GitHub Actions (.github/workflows/photolib.yml), never in the build.
//
// 1. Walks a hand picked list of Wikimedia Commons categories (beaches, the promenade, aerial views, streets, parks, neighbourhoods,
//    nearby Sharon localities), through the Commons API, slowly and with a contact address in the User-Agent.
// 2. Keeps only free licenses that allow any use with credit (public domain, CC0, CC BY, CC BY-SA; never NC or ND or an unknown
//    license), landscape photos at least 1600 pixels wide, and drops sensitive subjects (memorials, war, police, accidents, protests,
//    ceremonies), photos of identifiable people (personality rights notice, portraits, events, sports matches), logos and signs,
//    and old archive photos.
// 3. Downloads each kept photo once (from upload.wikimedia.org), and writes our own copies: 1600x1067 and 800x533 WebP (3:2 crop),
//    a 1200x675 JPEG (16:9, the social card and the structured data) and a 1080x1080 JPEG (1:1). sharp drops all EXIF data.
// 4. Writes index.json (source page, author, license, license URL, tags, places, Hebrew alt and credit for every photo), contact
//    sheets for a visual review (review/), and report.txt.
// Usage: node scripts/photolib/harvest.mjs <out dir>   (the out dir holds the previous run, so photos are downloaded only once)
// reject.txt (next to this script): Commons page ids (one per line, # comments) removed after the visual review.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const OUT = path.resolve(process.argv[2] || 'photolib-out');
const HERE = path.dirname(new URL(import.meta.url).pathname);
const UA = 'nws.co.il photo library (https://nws.co.il/; office@dabullaw.co.il) node/22';
const API = 'https://commons.wikimedia.org/w/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = [];
const say = (s) => { console.log(s); log.push(s); };

// ---- the categories. topics: what the photo shows (matched to story sections and words); place: Hebrew place name;
// depth: how many sub-category levels to walk; cap: at most this many photos from this category; alt: Hebrew description.
const N = 'נתניה';
const ROOTS = [
  { cat: 'Beaches of Netanya', depth: 2, cap: 40, topics: ['beach', 'sea', 'tourism'], place: N, alt: 'חוף הים בנתניה' },
  { cat: 'Netanya Promenade', depth: 1, cap: 18, topics: ['promenade', 'sea', 'tourism'], place: N, alt: 'הטיילת של נתניה' },
  { cat: 'Netanya cliffs', depth: 1, cap: 10, topics: ['sea', 'nature', 'beach'], place: N, alt: 'המצוק מול הים בנתניה' },
  { cat: 'Aerial Views of Netanya', depth: 1, cap: 22, topics: ['aerial', 'city', 'buildings'], place: N, alt: 'נתניה ממבט אווירי' },
  { cat: 'Photos from WikiAir Flight IL-13-02', depth: 0, cap: 10, topics: ['aerial', 'city', 'buildings'], place: N, alt: 'נתניה ממבט אווירי', must: /netanya|נתניה/i },
  { cat: 'Photos from WikiAir Flight IL-13-03', depth: 0, cap: 10, topics: ['aerial', 'city', 'buildings'], place: N, alt: 'נתניה ממבט אווירי', must: /netanya|נתניה/i },
  { cat: 'Sunsets of Netanya', depth: 1, cap: 14, topics: ['sunset', 'sea', 'leisure'], place: N, alt: 'שקיעה בנתניה' },
  { cat: 'Night in Netanya', depth: 1, cap: 12, topics: ['night', 'city', 'street'], place: N, alt: 'נתניה בלילה' },
  { cat: 'Buildings in Netanya', depth: 2, cap: 26, topics: ['buildings', 'city', 'realestate'], place: N, alt: 'בניינים בנתניה' },
  { cat: 'Skyscrapers in Netanya', depth: 1, cap: 10, topics: ['buildings', 'realestate', 'city'], place: N, alt: 'מגדלים בנתניה' },
  { cat: 'Streets in Netanya', depth: 2, cap: 20, topics: ['street', 'city', 'transport'], place: N, alt: 'רחוב בנתניה' },
  { cat: 'Herzl street (Netanya)', depth: 1, cap: 8, topics: ['street', 'commerce', 'city'], place: 'מרכז העיר', alt: 'רחוב הרצל בנתניה' },
  { cat: 'Independence Square (Netanya)', depth: 1, cap: 10, topics: ['square', 'city', 'leisure'], place: 'מרכז העיר', alt: 'כיכר העצמאות בנתניה' },
  { cat: 'Fountain in Independence Square in Netanya', depth: 0, cap: 4, topics: ['square', 'city', 'leisure'], place: 'מרכז העיר', alt: 'המזרקה בכיכר העצמאות בנתניה' },
  { cat: 'Fountains in Netanya', depth: 1, cap: 6, topics: ['square', 'city', 'leisure'], place: N, alt: 'מזרקה בנתניה' },
  { cat: 'Sculptures in Netanya', depth: 1, cap: 8, topics: ['art', 'city', 'culture'], place: N, alt: 'פסל בנתניה' },
  { cat: 'Parks in Netanya', depth: 2, cap: 16, topics: ['park', 'community', 'nature'], place: N, alt: 'פארק בנתניה' },
  { cat: 'Netanya forest', depth: 1, cap: 6, topics: ['park', 'nature'], place: N, alt: 'יער נתניה' },
  { cat: 'Netanya Iris Reserve', depth: 1, cap: 10, topics: ['nature', 'park'], place: N, alt: 'שמורת האירוסים בנתניה' },
  { cat: 'Iris Reserve (Netanya)', depth: 1, cap: 10, topics: ['nature', 'park'], place: N, alt: 'שמורת האירוסים בנתניה' },
  { cat: 'Poleg Nature Reserve', depth: 1, cap: 10, topics: ['nature', 'beach'], place: 'פולג', alt: 'שמורת חוף פולג' },
  { cat: 'Netanya-Tel Aviv sands', depth: 1, cap: 8, topics: ['nature', 'dunes'], place: N, alt: 'חולות נתניה' },
  { cat: 'Netanya Stadium', depth: 1, cap: 8, topics: ['stadium', 'sports'], place: N, alt: 'האצטדיון בנתניה' },
  { cat: 'Wingate Institute', depth: 1, cap: 6, topics: ['sports'], place: N, alt: 'מכון וינגייט' },
  { cat: 'Transport in Netanya', depth: 2, cap: 16, topics: ['transport', 'road', 'street'], place: N, alt: 'תחבורה בנתניה' },
  { cat: 'Netanya railway station', depth: 1, cap: 6, topics: ['train', 'transport'], place: N, alt: 'תחנת הרכבת נתניה' },
  { cat: 'Commerce in Netanya', depth: 2, cap: 12, topics: ['commerce', 'street', 'city'], place: N, alt: 'מסחר בנתניה' },
  { cat: 'Culture in Netanya', depth: 2, cap: 12, topics: ['culture', 'leisure'], place: N, alt: 'תרבות בנתניה' },
  { cat: 'Education in Netanya', depth: 2, cap: 8, topics: ['education', 'community'], place: N, alt: 'מוסד חינוך בנתניה' },
  { cat: 'Netanya City Hall', depth: 1, cap: 6, topics: ['cityhall', 'city'], place: N, alt: 'בניין עיריית נתניה' },
  { cat: 'Laniado Hospital', depth: 1, cap: 6, topics: ['health'], place: 'קריית צאנז', alt: 'בית החולים לניאדו בנתניה' },
  { cat: 'Mitzpe HaYam water tower', depth: 0, cap: 3, topics: ['landmark', 'city'], place: N, alt: 'מגדל המים מצפה הים בנתניה' },
  { cat: 'Netanya Marina', depth: 1, cap: 6, topics: ['sea', 'tourism'], place: N, alt: 'נתניה מול הים' },
  { cat: 'Netanya', depth: 0, cap: 20, topics: ['city'], place: N, alt: 'נתניה' },
  // neighbourhoods
  { cat: 'Neighborhoods of Netanya', depth: 2, cap: 30, topics: ['neighborhood', 'buildings', 'realestate'], place: N, alt: 'שכונה בנתניה' },
  { cat: 'Ramat Poleg', depth: 1, cap: 8, topics: ['neighborhood', 'buildings'], place: 'רמת פולג', alt: 'שכונת רמת פולג בנתניה' },
  { cat: 'Ir Yamim', depth: 1, cap: 8, topics: ['neighborhood', 'buildings'], place: 'עיר ימים', alt: 'שכונת עיר ימים בנתניה' },
  { cat: 'Kiryat HaSharon', depth: 1, cap: 6, topics: ['neighborhood', 'buildings'], place: 'קריית השרון', alt: 'קריית השרון בנתניה' },
  { cat: 'Kiryat Nordau', depth: 1, cap: 6, topics: ['neighborhood', 'buildings'], place: 'קריית נורדאו', alt: 'קריית נורדאו בנתניה' },
  { cat: 'Agamim (Netanya)', depth: 1, cap: 6, topics: ['neighborhood', 'buildings'], place: 'אגמים', alt: 'שכונת אגמים בנתניה' },
  { cat: 'Kiryat Sanz (Netanya)', depth: 1, cap: 6, topics: ['neighborhood'], place: 'קריית צאנז', alt: 'קריית צאנז בנתניה' },
  // the Sharon around Netanya
  { cat: 'Beit Yanai', depth: 1, cap: 8, topics: ['beach', 'sea', 'sharon'], place: 'בית ינאי', alt: 'חוף בית ינאי' },
  { cat: 'Mikhmoret', depth: 1, cap: 8, topics: ['beach', 'sea', 'sharon'], place: 'עמק חפר', alt: 'חוף מכמורת' },
  { cat: 'Alexander River', depth: 1, cap: 8, topics: ['nature', 'river', 'sharon'], place: 'עמק חפר', alt: 'נחל אלכסנדר' },
  { cat: 'Hefer Valley', depth: 1, cap: 8, topics: ['nature', 'sharon', 'agriculture'], place: 'עמק חפר', alt: 'עמק חפר' },
  { cat: 'Emek Hefer Regional Council', depth: 1, cap: 8, topics: ['sharon'], place: 'עמק חפר', alt: 'עמק חפר' },
  { cat: 'Poleg Stream', depth: 1, cap: 6, topics: ['nature', 'river'], place: 'פולג', alt: 'נחל פולג' },
  { cat: 'Kfar Yona', depth: 2, cap: 8, topics: ['sharon'], place: 'כפר יונה', alt: 'כפר יונה' },
  { cat: 'Even Yehuda', depth: 2, cap: 8, topics: ['sharon'], place: 'אבן יהודה', alt: 'אבן יהודה' },
  { cat: 'Kadima-Zoran', depth: 2, cap: 8, topics: ['sharon'], place: 'קדימה צורן', alt: 'קדימה צורן' },
  { cat: 'Tel Mond', depth: 2, cap: 8, topics: ['sharon'], place: 'תל מונד', alt: 'תל מונד' },
  { cat: 'Pardesiya', depth: 2, cap: 6, topics: ['sharon'], place: 'פרדסיה', alt: 'פרדסיה' },
  { cat: 'Kfar Saba', depth: 1, cap: 8, topics: ['sharon', 'city'], place: 'כפר סבא', alt: 'כפר סבא' },
  { cat: "Ra'anana", depth: 1, cap: 8, topics: ['sharon', 'city'], place: 'רעננה', alt: 'רעננה' },
  { cat: 'Hod HaSharon', depth: 1, cap: 6, topics: ['sharon', 'city'], place: 'הוד השרון', alt: 'הוד השרון' },
  { cat: 'Herzliya Marina', depth: 1, cap: 4, topics: ['sea', 'sharon'], place: 'הרצליה', alt: 'מרינה הרצליה' },
  { cat: 'Hadera beach', depth: 1, cap: 4, topics: ['beach', 'sea', 'sharon'], place: 'חדרה', alt: 'חוף חדרה' },
  { cat: 'Sharon plain', depth: 1, cap: 10, topics: ['sharon', 'nature', 'agriculture'], place: 'השרון', alt: 'השרון' },
];
// more specific places found in the sub-category or file name (Hebrew name as on the site)
const PLACE_RX = [
  [/ramat[\s-]?poleg/i, 'רמת פולג'], [/poleg/i, 'פולג'], [/ir[\s-]?yamim/i, 'עיר ימים'], [/kiryat[\s-]?hasharon/i, 'קריית השרון'],
  [/kiryat[\s-]?nordau/i, 'קריית נורדאו'], [/agamim/i, 'אגמים'], [/neot[\s-]?shaked|shaked/i, 'נאות שקד'], [/neot[\s-]?herzl/i, 'נאות הרצל'],
  [/\bdora\b/i, 'דורה'], [/kiryat[\s-]?sanz|sanz/i, 'קריית צאנז'], [/galei[\s-]?yam/i, 'גלי ים'], [/ramat[\s-]?efra/i, 'רמת אפריים'],
  [/ofek[\s-]?hayam/i, 'אופק הים'], [/herzl street|independence square|kikar ha.?atzmaut|sironit|city cent/i, 'מרכז העיר'],
  [/beit[\s-]?yanai/i, 'בית ינאי'], [/even[\s-]?yehuda/i, 'אבן יהודה'], [/kadima|zoran/i, 'קדימה צורן'], [/kfar[\s-]?yona/i, 'כפר יונה'],
  [/tel[\s-]?mond/i, 'תל מונד'], [/pardesiya/i, 'פרדסיה'], [/mikhmoret|michmoret/i, 'עמק חפר'],
];
// sensitive or unsuitable subjects (category, file or sub-category name): memorials, war, police, accidents, protests, ceremonies,
// people and events, archive collections, signs and logos
const BAD = new RegExp([
  'cemeter', 'memorial', 'monument', 'terror', 'attack', 'bomb', '\\bwars?\\b', 'army', 'militar', 'soldier', '\\bIDF\\b', 'defense forces', 'funeral',
  'accident', 'crash', '\\bfires?\\b', 'wreck', 'polic', 'protest', 'demonstrat', '\\brally', 'hamas', 'hezbollah', 'lebanon', 'gaza', 'victim',
  'holocaust', 'shoah', 'portrait', 'people of', '\\bpeople\\b', 'politician', 'rabbi', 'chabad', 'wedding', 'children', '\\bkids\\b', 'pupils',
  'players', ' vs\\.? ', '\\bmatch', 'ceremon', 'visit', 'inaugurat', 'dan hadani', 'government press office', '\\bGPO\\b', 'ulpan', 'absorption',
  'historical', 'history of', '\\b19[0-9]{2}\\b', 'stamps', 'logo', '\\bsigns?\\b', 'flags?\\b', 'advertis', 'billboard', 'graffiti', 'aircraft',
  'airplane', 'aviation', '\\b4X-', 'nude', 'naked', 'selfie', 'videos', 'maps?\\b', 'diagram', 'interior of', 'synagogue', 'church', 'mosque',
  'hospital beds', 'patients', 'concert', 'festival', 'parade', 'purim', 'election', 'campaign', 'tempo beer', 'missile', 'rocket', 'shelter',
].join('|'), 'i');
const FREE = /^(public domain|pd(-[\w.-]+)?|cc0( 1\.0)?|cc by(-sa)? [1-4]\.[05]( [a-z]{2,6})?|attribution)$/i;

async function api(params, tries = 0) {
  const u = new URL(API);
  for (const [k, v] of Object.entries({ format: 'json', formatversion: '2', maxlag: '5', ...params })) u.searchParams.set(k, v);
  const r = await fetch(u, { headers: { 'User-Agent': UA, 'Api-User-Agent': UA } }).catch((e) => ({ ok: false, status: 0, e }));
  if (!r.ok || r.status === 429) {
    if (tries > 6) throw new Error(`api ${r.status} ${params.list || params.prop}`);
    await sleep(3000 * 2 ** tries); return api(params, tries + 1);
  }
  const j = await r.json();
  if (j.error?.code === 'maxlag') { await sleep(5000); return api(params, tries + 1); }
  await sleep(400);
  return j;
}
async function members(cat) {
  const out = [];
  let cont = {};
  do {
    const j = await api({ action: 'query', list: 'categorymembers', cmtitle: `Category:${cat}`, cmtype: 'file|subcat', cmlimit: '500', ...cont });
    out.push(...(j.query?.categorymembers || []));
    cont = j.continue?.cmcontinue ? { cmcontinue: j.continue.cmcontinue } : null;
  } while (cont);
  return out;
}
async function infos(ids) {
  const pages = new Map();
  let cont = {};
  do {
    const j = await api({ action: 'query', pageids: ids.join('|'), prop: 'imageinfo|categories', iiprop: 'url|size|mime|extmetadata', iiurlwidth: '1920',
      iiextmetadatafilter: 'LicenseShortName|LicenseUrl|Artist|DateTimeOriginal|Restrictions|Assessments|ImageDescription|ObjectName', clshow: '!hidden', cllimit: 'max', ...cont });
    for (const p of j.query?.pages || []) {
      const o = pages.get(p.pageid) || { ...p, categories: [] };
      if (p.imageinfo && !o.imageinfo) o.imageinfo = p.imageinfo;
      o.categories.push(...(p.categories || []).map((c) => c.title));
      pages.set(p.pageid, o);
    }
    cont = j.continue && Object.keys(j.continue).some((k) => k !== 'continue') ? Object.fromEntries(Object.entries(j.continue)) : null;
  } while (cont);
  return [...pages.values()];
}
const strip = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;/g, "'").replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').trim();
const em = (m, k) => m?.[k]?.value ?? '';

// ---------------------------------------------------------------- 1. walk the categories
const reject = new Set((fs.existsSync(path.join(HERE, 'reject.txt')) ? fs.readFileSync(path.join(HERE, 'reject.txt'), 'utf8') : '')
  .split('\n').map((l) => l.replace(/#.*/, '').trim()).filter(Boolean).map(Number));
const found = new Map(); // pageid -> { root, via }
const seenCats = new Set();
for (const root of ROOTS) {
  let n = 0;
  const walk = async (cat, depth, via) => {
    if (seenCats.has(`${root.cat}>${cat}`)) return;
    seenCats.add(`${root.cat}>${cat}`);
    let list = [];
    try { list = await members(cat); } catch (e) { say(`! ${cat}: ${e.message}`); return; }
    for (const m of list) {
      if (m.ns === 6) {
        if (!found.has(m.pageid)) { found.set(m.pageid, { root, via, title: m.title }); n++; }
      } else if (m.ns === 14 && depth > 0) {
        const sub = m.title.replace(/^Category:/, '');
        if (BAD.test(sub) || /videos|panoram|by year|in 19|in 20[01]\d/i.test(sub)) continue;
        await walk(sub, depth - 1, `${via} > ${sub}`);
      }
    }
  };
  await walk(root.cat, root.depth, root.cat);
  say(`${root.cat}: ${n} files`);
}
say(`files found: ${found.size}`);

// ---------------------------------------------------------------- 2. details and filters
const ids = [...found.keys()].filter((id) => !reject.has(id));
const cand = [];
const why = {};
const drop = (k) => { why[k] = (why[k] || 0) + 1; };
for (let i = 0; i < ids.length; i += 50) {
  let pages = [];
  try { pages = await infos(ids.slice(i, i + 50)); } catch (e) { say(`! info batch ${i}: ${e.message}`); continue; }
  for (const p of pages) {
    const f = found.get(p.pageid); const ii = p.imageinfo?.[0]; const m = ii?.extmetadata;
    if (!ii || !m) { drop('no info'); continue; }
    if (!/^image\/(jpeg|png|webp|tiff)$/.test(ii.mime)) { drop('not a photo'); continue; }
    if (ii.width < 1600 || ii.width < ii.height * 1.25 || ii.width > ii.height * 2.4) { drop('size or shape'); continue; }
    const lic = strip(em(m, 'LicenseShortName'));
    if (!FREE.test(lic) || /\b(nc|nd)\b/i.test(lic)) { drop(`license ${lic}`.slice(0, 40)); continue; }
    if (/personality|trademark|insignia|consent/i.test(strip(em(m, 'Restrictions')))) { drop('restrictions'); continue; }
    const text = [p.title, f.via, ...p.categories].join(' | ');
    if (BAD.test(text)) { drop('subject'); continue; }
    if (f.root.must && !f.root.must.test(text + ' ' + strip(em(m, 'ImageDescription')))) { drop('not netanya'); continue; }
    const year = Number((strip(em(m, 'DateTimeOriginal')).match(/\b(19|20)\d\d\b/) || [])[0]) || 0;
    if (year && year < 2005) { drop('old'); continue; }
    let author = strip(em(m, 'Artist')).replace(/^(own work|self)[ ,.]*/i, '').replace(/\s*\(talk\)$/i, '');
    if (!author || /unknown|anonymous/i.test(author)) { drop('no author'); continue; }
    if (author.length > 60) author = author.slice(0, author.lastIndexOf(' ', 58) > 20 ? author.lastIndexOf(' ', 58) : 58);
    const places = new Set([f.root.place]);
    for (const [rx, he] of PLACE_RX) if (rx.test(text)) places.add(he);
    const topics = new Set(f.root.topics);
    if (/sunset|שקיעה/i.test(text)) topics.add('sunset');
    if (/\bnight|לילה/i.test(text)) topics.add('night');
    if (/beach|חוף/i.test(text)) topics.add('beach');
    if (/promenade|tayelet|טיילת/i.test(text)) topics.add('promenade');
    if (/aerial|from the air|wikiair/i.test(text)) topics.add('aerial');
    if (/road|highway|interchange|junction|כביש/i.test(text)) topics.add('road');
    if (/station|train|railway/i.test(text)) topics.add('train');
    if (/park|garden|גן /i.test(text)) topics.add('park');
    if (/construction|crane|building site/i.test(text)) topics.add('construction');
    if (/tower|skyscraper|high-rise/i.test(text)) topics.add('buildings');
    const assess = strip(em(m, 'Assessments'));
    const score = (assess ? 4 : 0) + (year >= 2016 ? 2 : year >= 2010 ? 1 : 0) + Math.min(2, ii.width / 3000);
    const licUrl = strip(em(m, 'LicenseUrl'));
    if (/^cc /i.test(lic) && !/^https?:/.test(licUrl)) { drop('no license url'); continue; }
    cand.push({ pageid: p.pageid, title: p.title, root: f.root.cat, cap: f.root.cap, alt: f.root.alt, author, license: lic, licenseUrl: licUrl,
      page: ii.descriptionurl, thumb: ii.thumburl || ii.url, ow: ii.width, oh: ii.height, year, score, places: [...places], topics: [...topics] });
  }
}
say(`dropped: ${JSON.stringify(why)}`);

// per category cap, at most 3 photos of one author in a category, best first
const keep = [];
const byRoot = new Map();
for (const c of cand.sort((a, b) => b.score - a.score || a.pageid - b.pageid)) {
  const k = byRoot.get(c.root) || { n: 0, au: {} };
  if (k.n >= c.cap || (k.au[c.author] || 0) >= 3) continue;
  k.n++; k.au[c.author] = (k.au[c.author] || 0) + 1; byRoot.set(c.root, k); keep.push(c);
}
say(`candidates: ${cand.length}, kept after caps: ${keep.length}`);

// ---------------------------------------------------------------- 3. download and convert (once per photo)
const IMG = path.join(OUT, 'img');
fs.mkdirSync(IMG, { recursive: true });
const want = new Set();
const done = [];
for (const c of keep) {
  const id = `c${c.pageid}`;
  const names = [`${id}-1600.webp`, `${id}-800.webp`, `${id}-16x9.jpg`, `${id}-1x1.jpg`];
  names.forEach((n) => want.add(n));
  if (!names.every((n) => fs.existsSync(path.join(IMG, n)))) {
    let buf = null;
    for (let t = 0; t < 4 && !buf; t++) {
      const r = await fetch(c.thumb, { headers: { 'User-Agent': UA } }).catch(() => null);
      if (r?.ok) buf = Buffer.from(await r.arrayBuffer()); else await sleep(4000 * 2 ** t);
    }
    await sleep(700);
    if (!buf) { say(`! download failed ${c.title}`); continue; }
    try {
      const base = () => sharp(buf, { failOn: 'none' }).rotate();
      const att = { fit: 'cover', position: sharp.strategy.attention };
      await base().resize({ width: 1600, height: 1067, ...att }).webp({ quality: 72 }).toFile(path.join(IMG, names[0]));
      await base().resize({ width: 800, height: 533, ...att }).webp({ quality: 70 }).toFile(path.join(IMG, names[1]));
      await base().resize({ width: 1200, height: 675, ...att }).jpeg({ quality: 78, mozjpeg: true, progressive: true }).toFile(path.join(IMG, names[2]));
      const sq = Math.min(1080, c.oh);
      await base().resize({ width: sq, height: sq, ...att }).jpeg({ quality: 78, mozjpeg: true, progressive: true }).toFile(path.join(IMG, names[3]));
    } catch (e) { say(`! convert failed ${c.title}: ${e.message}`); names.forEach((n) => fs.rmSync(path.join(IMG, n), { force: true })); continue; }
  }
  done.push({ ...c, id, sq: Math.min(1080, c.oh) });
}
for (const f of fs.readdirSync(IMG)) if (!want.has(f)) fs.rmSync(path.join(IMG, f)); // photos no longer in the library

// ---------------------------------------------------------------- 4. index, contact sheets, report
const LIC_HE = (l) => (/public domain|^pd/i.test(l) ? 'נחלת הכלל' : /^attribution$/i.test(l) ? 'ייחוס' : l.toUpperCase().replace(/^CC0.*/, 'CC0'));
const photos = done.map((c) => ({ id: c.id, pageid: c.pageid, file: c.title.replace(/^File:/, ''), page: c.page, author: c.author, license: c.license,
  licenseUrl: c.licenseUrl, credit: `צילום: ${c.author}, ויקישיתוף, ${LIC_HE(c.license)}`, alt: c.places.length > 1 && !c.alt.includes(c.places[1]) ? `${c.alt}, ${c.places[1]}` : c.alt,
  places: c.places, topics: c.topics, root: c.root, year: c.year || null, sq: c.sq }));
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ at: new Date().toISOString(), source: 'Wikimedia Commons', photos }, null, 1));

const REV = path.join(OUT, 'review');
fs.rmSync(REV, { recursive: true, force: true }); fs.mkdirSync(REV, { recursive: true });
const per = 30; const cols = 6; const tw = 300; const th = 200; const lh = 22;
for (let s = 0; s * per < photos.length; s++) {
  const group = photos.slice(s * per, s * per + per);
  const rows = Math.ceil(group.length / cols);
  const comps = [];
  for (let i = 0; i < group.length; i++) {
    const x = (i % cols) * tw; const y = Math.floor(i / cols) * (th + lh);
    comps.push({ input: await sharp(path.join(IMG, `${group[i].id}-800.webp`)).resize(tw - 4, th - 4).toBuffer(), left: x + 2, top: y + 2 });
    const t = `${group[i].pageid} ${group[i].root}`.slice(0, 40).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    comps.push({ input: Buffer.from(`<svg width="${tw}" height="${lh}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#000"/><text x="4" y="16" font-family="sans-serif" font-size="13" fill="#fff">${t}</text></svg>`), left: x, top: y + th });
  }
  await sharp({ create: { width: cols * tw, height: rows * (th + lh), channels: 3, background: '#333' } }).composite(comps).jpeg({ quality: 70 }).toFile(path.join(REV, `sheet-${String(s + 1).padStart(2, '0')}.jpg`));
}
let bytes = 0; for (const f of fs.readdirSync(IMG)) bytes += fs.statSync(path.join(IMG, f)).size;
say(`photos in the library: ${photos.length}, ${(bytes / 1e6).toFixed(1)} MB in img/`);
const per2 = {}; for (const p of photos) for (const t of [...p.places, ...p.topics]) per2[t] = (per2[t] || 0) + 1;
say(`by place and topic: ${JSON.stringify(per2)}`);
fs.writeFileSync(path.join(OUT, 'report.txt'), log.join('\n') + '\n');
