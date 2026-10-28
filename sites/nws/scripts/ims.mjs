// Before every build (28.10.2026 redesign): weather and sea for Netanya from the Israel Meteorological Service (השירות המטאורולוגי).
//   - https://ims.gov.il/he/forecast_data/7  (location 7 = נתניה): today's minimum and maximum, the weather of the current hour,
//     and the wave height the IMS forecasts for this hour.
//   - https://ims.gov.il/sites/default/files/ims_data/xml_files/isr_sea.xml: sea forecast for the central coast (waves range, sea temperature).
// Saved to src/data/ims.json, at most every 20 minutes; the last good copy is kept when the IMS cannot be reached. Never fails the build.
import fs from 'node:fs';

const OUT = 'src/data/ims.json';
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; nws.co.il site build)', Accept: 'application/json, text/xml, */*' };
const old = (() => { try { return JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch { return null; } })();
if (old?.fetchedAt && Date.now() - Date.parse(old.fetchedAt) < 20 * 60e3 && !process.env.IMS_FORCE) { console.log('ims: fresh copy kept'); process.exit(0); }

// IMS weather codes (the published list of the service)
const CODE = { 1010: 'סופות חול', 1020: 'סופות רעמים', 1060: 'שלג', 1070: 'שלג קל', 1140: 'גשום', 1160: 'ערפל', 1220: 'מעונן חלקית', 1230: 'מעונן',
  1250: 'בהיר', 1260: 'רוחות חזקות', 1270: 'הביל', 1300: 'כפור', 1310: 'חם', 1320: 'קר', 1510: 'סוער', 1520: 'שלג כבד', 1530: 'מעונן חלקית, אפשרות לגשם',
  1540: 'מעונן, אפשרות לגשם', 1560: 'מעונן, גשם קל', 1570: 'אובך', 1580: 'חם מאוד' };
const il = (d, o) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', ...o }).format(d);
const today = il(new Date(), { year: 'numeric', month: '2-digit', day: '2-digit' });
const hourNow = Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jerusalem', hour: '2-digit', hour12: false }).format(new Date()));
const num = (v) => (v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

const out = { ok: false, fetchedAt: new Date().toISOString(), source: 'השירות המטאורולוגי', sourceUrl: 'https://ims.gov.il/he/city_portal/7', day: null, now: null, sea: null };
try {
  const j = await fetch('https://ims.gov.il/he/forecast_data/7', { headers: UA, signal: AbortSignal.timeout(15000) }).then((r) => r.json());
  const d = j?.data?.[today];
  if (d?.daily) out.day = { date: today, min: num(d.daily.minimum_temperature), max: num(d.daily.maximum_temperature), code: num(d.daily.weather_code), desc: CODE[d.daily.weather_code] || '' };
  const hours = Object.values(d?.hourly || {}).filter((h) => h && h.hour !== undefined).sort((a, b) => Number(a.hour) - Number(b.hour));
  const h = hours.filter((x) => Number(x.hour) <= hourNow).pop() || hours[0];
  if (h) out.now = { hour: Number(h.hour), temp: num(h.precise_temperature) ?? num(h.temperature), wave: num(h.wave_height), code: num(h.weather_code), desc: CODE[h.weather_code] || '', rain: num(h.rain_chance) };
} catch (e) { console.warn(`ims: forecast not loaded (${e.message})`); }
try {
  const buf = await fetch('https://ims.gov.il/sites/default/files/ims_data/xml_files/isr_sea.xml', { headers: UA, signal: AbortSignal.timeout(15000) }).then((r) => r.arrayBuffer());
  const x = new TextDecoder('latin1').decode(buf); // only the numbers are read
  const loc = x.split('<Location>').find((s) => /<LocationId>210<\/LocationId>/.test(s)); // the central coast
  if (loc) {
    const units = loc.split('<TimeUnitData>').slice(1).map((u) => ({
      from: (/<DateTimeFrom>([^<]+)</.exec(u) || [])[1] || '', to: (/<DateTimeTo>([^<]+)</.exec(u) || [])[1] || '',
      waves: (/Sea status and waves height<\/ElementName><ElementValue>[^<]*?\/\s*(\d+)\s*-\s*(\d+)/.exec(u) || []).slice(1).map(Number),
      temp: num((/Sea temperature<\/ElementName><ElementValue>\s*(\d+)/.exec(u) || [])[1]),
    }));
    const nowS = `${today} ${String(hourNow).padStart(2, '0')}:00`;
    const u = units.find((v) => v.from <= nowS && nowS < v.to) || units[0];
    if (u && u.waves.length === 2) out.sea = { from: u.from, to: u.to, waveMin: u.waves[0] / 100, waveMax: u.waves[1] / 100, temp: u.temp };
  }
} catch (e) { console.warn(`ims: sea forecast not loaded (${e.message})`); }

if (old) { if (!out.day && old.day?.date === today) out.day = old.day; if (!out.now && old.now) out.now = old.now; if (!out.sea && old.sea) out.sea = old.sea; }
out.ok = !!(out.day || out.now || out.sea);
if (out.ok || !old) fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`ims: day ${out.day ? `${out.day.min}-${out.day.max} ${out.day.desc}` : 'none'}, now ${out.now ? `${out.now.temp}° wave ${out.now.wave}` : 'none'}, sea ${out.sea ? `${out.sea.waveMin}-${out.sea.waveMax} m, ${out.sea.temp}°` : 'none'}`);
