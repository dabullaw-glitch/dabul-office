// citydata-fetch (29.10.2026): raw data for the city guide ("שימושון עירוני") of nws.co.il. Runs in GitHub Actions
// (workflow city-data), because the workspace cannot reach these hosts. It saves the raw answers only; the pages are
// built from cleaned files in src/data/city/ that are checked by hand against official sources.
//  1. OpenStreetMap (Overpass): places inside the Netanya municipal boundary, by tag.
//  2. data.gov.il (CKAN): official government datasets that mention Netanya (schools, bank branches, pharmacies...).
import fs from 'node:fs';
const OUT = process.argv[2] || 'out';
fs.mkdirSync(OUT, { recursive: true });
const save = (name, data) => fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 1));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url, opt = {}) {
  for (let i = 0; i < 3; i++) {
    try { const r = await fetch(url, { ...opt, signal: AbortSignal.timeout(120000) }); if (r.ok) return await r.json(); console.log('HTTP', r.status, url.slice(0, 120)); }
    catch (e) { console.log('ERR', String(e).slice(0, 120), url.slice(0, 120)); }
    await sleep(5000);
  }
  return null;
}
// 1. Overpass
const OSM = {
  post: 'nwr["amenity"="post_office"](area.a);',
  bank: 'nwr["amenity"="bank"](area.a);',
  synagogue: 'nwr["amenity"="place_of_worship"]["religion"="jewish"](area.a);',
  school: 'nwr["amenity"="school"](area.a);',
  kindergarten: 'nwr["amenity"="kindergarten"](area.a);',
  community: 'nwr["amenity"="community_centre"](area.a);',
  library: 'nwr["amenity"="library"](area.a);',
  health: 'nwr["amenity"~"^(clinic|doctors|hospital)$"](area.a);nwr["healthcare"](area.a);',
  pharmacy: 'nwr["amenity"="pharmacy"](area.a);',
  gov: 'nwr["office"="government"](area.a);nwr["amenity"~"^(townhall|courthouse|police|fire_station)$"](area.a);',
  transport: 'nwr["railway"="station"](area.a);nwr["amenity"="bus_station"](area.a);',
  ngo: 'nwr["office"~"^(ngo|association|charity|religion)$"](area.a);nwr["amenity"="social_facility"](area.a);',
  sport: 'nwr["leisure"~"^(sports_centre|stadium|swimming_pool)$"](area.a);',
  culture: 'nwr["amenity"~"^(theatre|arts_centre|cinema)$"](area.a);nwr["tourism"="museum"](area.a);',
  suburb: 'nwr["place"~"^(suburb|neighbourhood|quarter)$"](area.a);',
};
const AREA = 'area["boundary"="administrative"]["name"="נתניה"]->.a;';
const ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];
const osmLog = [];
const ONLY = process.argv[3] || 'all';
for (const [k, q] of Object.entries(ONLY === 'gov' ? {} : OSM)) {
  const body = `[out:json][timeout:110];${AREA}(${q});out center tags;`;
  let j = null;
  for (const ep of ENDPOINTS) {
    try {
      const r = await fetch(ep, { method: 'POST', body: 'data=' + encodeURIComponent(body), headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': 'nws.co.il city guide (news@nws.co.il)' }, signal: AbortSignal.timeout(120000) });
      const t = await r.text();
      if (r.ok && t.trim().startsWith('{')) { j = JSON.parse(t); osmLog.push({ k, ep, n: j.elements?.length }); break; }
      osmLog.push({ k, ep, status: r.status, body: t.slice(0, 300) });
    } catch (e) { osmLog.push({ k, ep, err: String(e).slice(0, 200) }); }
    await sleep(2000);
  }
  console.log('osm', k, j?.elements?.length ?? 'fail');
  if (j) save(`osm-${k}`, j.elements);
  await sleep(2000);
}
save('osm-log', osmLog);
if (ONLY === 'osm') process.exit(0);
// 2. data.gov.il
const CK = 'https://data.gov.il/api/3/action';
const QUERIES = ['מוסדות חינוך', 'סניפי בנקים', 'סניפים', 'בתי מרקחת', 'בתי חולים', 'קופות חולים', 'מרפאות', 'סניפי דואר', 'תחנות רכבת', 'מתנ"סים', 'ספריות', 'עמותות', 'בתי כנסת', 'משרדי ממשלה', 'לשכות'];
const seen = new Set();
const index = [];
for (const q of QUERIES) {
  const r = await get(`${CK}/package_search?q=${encodeURIComponent(q)}&rows=12`);
  for (const p of r?.result?.results || []) {
    for (const res of p.resources || []) {
      if (!res.datastore_active || seen.has(res.id)) continue;
      seen.add(res.id);
      const d = await get(`${CK}/datastore_search?resource_id=${res.id}&q=${encodeURIComponent('נתניה')}&limit=2000`);
      const n = d?.result?.records?.length || 0;
      index.push({ q, package: p.title, org: p.organization?.title, resource: res.name, id: res.id, records: n, total: d?.result?.total });
      if (n) save(`gov-${res.id}`, { package: p.title, org: p.organization?.title, resource: res.name, url: `https://data.gov.il/dataset/${p.name}`, fields: d.result.fields, records: d.result.records });
      await sleep(400);
    }
  }
}
save('gov-index', index);
console.log('gov resources with Netanya rows:', index.filter((x) => x.records).length);
