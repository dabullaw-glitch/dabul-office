// hns-auto (28.10.2026): automatic stories of the HNS (חדשות נתניה והשרון, nws.co.il) news engine that need NO AI call.
// Yakir (28.10.2026): the site must fill itself all day, 100% automatic. The Claude drafting budget stays at 25 calls a day, so every
// story that can be written from structured official data is written here from a fixed Hebrew template, at no cost:
//   weather   every morning from 05:00 Israel time: the IMS forecast for Netanya (location 7: min and max, rain chance, waves, UV)
//             plus the IMS national forecast text, quoted and attributed. Section tourism (sea and beaches).
//   shabbat   every Thursday from 12:00: candle lighting and the end of Shabbat in Netanya, computed exactly like the site's
//             /now/shabbat/ page (20 minutes before sunset; sun 8.5 degrees below the horizon), the weekly portion from Hebcal.
//   events    every Thursday from 08:00 (and Sunday from 08:00): the shows of the next 7 days at the Netanya Culture Hall, from its
//             official listing (table hns_cal, filled by hns-collect). Only names, dates, times and halls; no copied text.
//   roundup   every evening from 21:00: the stories published today (when there are at least 3), with their summaries.
// Every story is inserted as a 'draft' with an official source (or the desk) and goes through hns-publish and all its guards
// (local, fresh, no media outlet names, no dashes). A story is made once: its key is kept in notes ("auto:<kind>:<date>").
// POST (x-cron-secret): {action:'tick', dry?, only?}  cron every 20 minutes. dry=true returns the texts and writes nothing.
// No long or medium dash in any text.
import { createClient } from 'npm:@supabase/supabase-js@2';
import SunCalc from 'npm:suncalc@1.9.0';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
let S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET']);
  S = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
}
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const TZ = 'Asia/Jerusalem';
const ilParts = (d: Date) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hourCycle: 'h23' }).formatToParts(d).map((p) => [p.type, p.value]));
const ilDay = (d: Date) => { const p = ilParts(d); return `${p.year}-${p.month}-${p.day}`; };
const hm = (d: Date) => new Intl.DateTimeFormat('he-IL', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'שבת'];
const dowOf = (ymd: string) => new Date(ymd + 'T12:00:00Z').getUTCDay();
const dm = (ymd: string) => `${+ymd.slice(8, 10)}.${+ymd.slice(5, 7)}`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const getJson = (u: string) => fetch(u, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(20000) }).then((r) => { if (!r.ok) throw new Error(`${u} ${r.status}`); return r.json(); });

async function done(key: string) {
  const { data } = await sb.from('hns_stories').select('id').eq('notes', key).limit(1);
  return !!data?.length;
}
async function insert(st: Any, key: string, dry: boolean) {
  const row = { ...st, title: clean(st.title), dek: clean(st.dek), kicker: st.kicker ? clean(st.kicker) : null, body: st.body.map(clean).filter(Boolean),
    key_points: (st.key_points || []).map(clean).filter(Boolean), state: 'draft', sensitivity: 'normal', basis: 'official', notes: key, item_ids: [], places: st.places || ['נתניה'] };
  if (dry) return { key, dry: true, row };
  const { data, error } = await sb.from('hns_stories').insert(row).select('id').single();
  if (error) throw new Error(error.message);
  return { key, id: data.id, title: row.title };
}

// ---------- weather (IMS, Netanya = location 7) ----------
const seaWord = (h: number) => (h <= 0.5 ? 'ים שקט' : h <= 1 ? 'ים נוח' : h <= 1.6 ? 'ים גלי' : h <= 2.5 ? 'ים גבוה' : 'ים סוער');
async function weather(today: string, dry: boolean) {
  const key = `auto:weather:${today}`;
  if (await done(key)) return null;
  const j = await getJson('https://ims.gov.il/he/forecast_data/7');
  const days = j?.data || {};
  const d0 = days[today];
  if (!d0?.daily) throw new Error('no IMS forecast for today');
  const tomorrow = ilDay(new Date(Date.parse(today + 'T12:00:00Z') + 864e5));
  const d1 = days[tomorrow];
  const hours = (d: Any) => Object.values(d?.hourly || {}) as Any[];
  const nums = (arr: Any[], k: string) => arr.map((h) => Number(h[k])).filter((x) => Number.isFinite(x));
  const h0 = hours(d0).filter((h) => +h.hour >= 6 && +h.hour <= 20);
  const waves = nums(h0.length ? h0 : hours(d0), 'wave_height');
  const rain = nums(h0.length ? h0 : hours(d0), 'rain_chance');
  const min = Number(d0.daily.minimum_temperature), max = Number(d0.daily.maximum_temperature), uvi = Number(d0.daily.maximum_uvi);
  if (!Number.isFinite(min) || !Number.isFinite(max)) throw new Error('no temperatures');
  const wMin = waves.length ? Math.min(...waves) : null, wMax = waves.length ? Math.max(...waves) : null;
  const rc = rain.length ? Math.max(...rain) : null;
  const national = clean(String(d0.country?.description || '').split('\n')[0].replace(/^היום:\s*/, ''));
  const night = clean((String(d0.country?.description || '').split('\n').find((l: string) => /^הלילה:/.test(l)) || '').replace(/^הלילה:\s*/, ''));
  const dow = DAYS[dowOf(today)];
  const title = `מזג האוויר בנתניה, יום ${dow} ${dm(today)}: בין ${min} ל-${max} מעלות`;
  const kicker = wMax !== null ? `${seaWord(wMax)}, גלים עד ${wMax.toFixed(1)} מ׳` : rc ? `סיכוי לגשם ${rc}%` : 'תחזית לנתניה';
  const body: string[] = [];
  body.push(`לפי תחזית השירות המטאורולוגי לנתניה, הטמפרטורה היום תנוע בין ${min} ל-${max} מעלות. ${rc ? `הסיכוי לגשם בשעות היום יגיע עד ${rc}%.` : 'בשעות היום לא צפוי גשם בעיר.'}${Number.isFinite(uvi) && uvi > 0 ? ` מדד הקרינה העל סגולה יגיע ל-${uvi}.` : ''}`);
  if (national) body.push(`בתחזית הארצית של השירות המטאורולוגי להיום: ${national}${/[.!]$/.test(national) ? '' : '.'}${night ? ` בלילה: ${night}${/[.!]$/.test(night) ? '' : '.'}` : ''}`);
  if (wMax !== null) body.push(`הים מול חופי נתניה: גובה הגלים צפוי לנוע בין ${wMin!.toFixed(1)} ל-${wMax.toFixed(1)} מטר (${seaWord(wMax)}). נכנסים למים רק בחוף מוכרז ובשעות שבהן יש מציל.`);
  if (d1?.daily) {
    const n1 = clean(String(d1.country?.description || '').split('\n')[0]);
    body.push(`מחר, יום ${DAYS[dowOf(tomorrow)]}: בין ${d1.daily.minimum_temperature} ל-${d1.daily.maximum_temperature} מעלות בנתניה.${n1 ? ` ${n1}${/[.!]$/.test(n1) ? '' : '.'}` : ''}`);
  }
  const key_points = [`טמפרטורה היום: ${min} עד ${max} מעלות`, rc ? `סיכוי לגשם: עד ${rc}%` : 'גשם: לא צפוי בשעות היום', ...(wMax !== null ? [`גלים: עד ${wMax.toFixed(1)} מטר`] : [])];
  return insert({ section: 'tourism', title, dek: national || `התחזית לנתניה להיום ולמחר, לפי השירות המטאורולוגי.`, kicker, body, key_points,
    sources: [{ id: 'ims_forecast', name: 'השירות המטאורולוגי', url: 'https://ims.gov.il/he/city_portal/7', trust: 'official' }] }, key, dry);
}

// ---------- Shabbat (same rule as the site: candles 20 minutes before sunset, end when the sun is 8.5 degrees below) ----------
SunCalc.addTime(-8.5, 'tzeitDawn', 'tzeit');
const LAT = 32.3215, LON = 34.8532;
async function shabbat(today: string, dry: boolean) {
  const dow = dowOf(today);
  const fri = ilDay(new Date(Date.parse(today + 'T12:00:00Z') + ((5 - dow + 7) % 7) * 864e5));
  const key = `auto:shabbat:${fri}`;
  if (await done(key)) return null;
  const f = new Date(fri + 'T10:00:00Z'), s = new Date(Date.parse(fri + 'T10:00:00Z') + 864e5);
  const tf = SunCalc.getTimes(f, LAT, LON) as Any, ts = SunCalc.getTimes(s, LAT, LON) as Any;
  const candles = hm(new Date(tf.sunset.getTime() - 20 * 60000)), end = hm(ts.tzeit), sunset = hm(tf.sunset);
  let parasha = '';
  try {
    const h = await getJson(`https://www.hebcal.com/shabbat?cfg=json&geonameid=294071&M=on&gy=${fri.slice(0, 4)}&gm=${+fri.slice(5, 7)}&gd=${+fri.slice(8, 10)}`);
    parasha = clean((h.items || []).find((x: Any) => x.category === 'parashat')?.hebrew || '');
  } catch { /* the times do not depend on it */ }
  const title = `זמני השבת בנתניה${parasha ? `, ${parasha}` : ''}: הדלקת נרות ב-${candles}`;
  const body = [
    `כניסת השבת בנתניה ביום שישי, ${dm(fri)}: הדלקת נרות בשעה ${candles}. השקיעה בעיר בשעה ${sunset}.`,
    `צאת השבת במוצאי שבת, ${dm(ilDay(s))}, בשעה ${end}.`,
    `הזמנים מחושבים לפי מיקום העיר: הדלקת הנרות 20 דקות לפני השקיעה, וצאת השבת כשהשמש 8.5 מעלות מתחת לאופק. יש קהילות שנוהגות לפי זמנים אחרים, ולכן כדאי לבדוק גם את לוח בית הכנסת. הזמנים של השבועות הבאים נמצאים בעמוד זמני השבת באתר.`,
  ];
  return insert({ section: 'community', title, dek: `הדלקת נרות ב-${candles}, צאת השבת ב-${end}${parasha ? `. ${parasha}` : ''}.`, kicker: `צאת השבת ${end}`, body,
    key_points: [`הדלקת נרות: ${candles}`, `צאת השבת: ${end}`, ...(parasha ? [parasha] : [])],
    sources: [{ id: 'nws_desk', name: 'מערכת חדשות נתניה והשרון', url: 'https://nws.co.il/now/shabbat/', trust: 'media' }] }, key, dry);
}

// ---------- events of the coming week (Netanya Culture Hall listing) ----------
async function events(today: string, dry: boolean) {
  const key = `auto:events:${today}`;
  if (await done(key)) return null;
  const from = new Date(), to = new Date(Date.now() + 7 * 864e5);
  const { data } = await sb.from('hns_cal').select('title,starts_at,venue,url').gte('starts_at', from.toISOString()).lte('starts_at', to.toISOString()).order('starts_at').limit(40);
  const rows = (data || []).filter((r: Any) => r.title);
  if (rows.length < 2) return null;
  const line = (r: Any) => { const d = new Date(r.starts_at); const ymd = ilDay(d); const t = hm(d); return `יום ${DAYS_SHORT[dowOf(ymd)]} ${dm(ymd)}${t !== '00:00' ? `, ${t}` : ''}: ${clean(r.title)}${r.venue && !/היכל התרבות/.test(r.title) ? ` (${clean(r.venue).replace(/^היכל התרבות העירוני נתניה\s*-\s*/, '')})` : ''}.`; };
  const lines = rows.slice(0, 14).map(line);
  const title = `מה עושים בנתניה השבוע: ${rows.length} מופעים ואירועים בהיכל התרבות`;
  const body = [
    `בשבוע הקרוב, עד ${dm(ilDay(to))}, יתקיימו בהיכל התרבות של נתניה ${rows.length} מופעים ואירועים, לפי לוח האירועים הרשמי של ההיכל.`,
    ...lines,
    `כרטיסים ופרטים מלאים על כל מופע נמצאים באתר הכרטיסים של היכל התרבות. לוח האירועים המלא מופיע גם במדור הבילוי והאירועים באתר.`,
  ];
  return insert({ section: 'leisure', title, dek: `הלוח המלא של השבוע הקרוב בהיכל התרבות, עם תאריכים ושעות.`, kicker: `${rows.length} אירועים השבוע`, body,
    key_points: lines.slice(0, 3), sources: [{ id: 'heichal_smarticket', name: 'היכל התרבות נתניה', url: 'https://netanya.smarticket.co.il/', trust: 'official' }] }, key, dry);
}

// ---------- the day's roundup ----------
async function roundup(today: string, dry: boolean) {
  const key = `auto:roundup:${today}`;
  if (await done(key)) return null;
  const start = new Date(Date.now() - 30 * 3600e3).toISOString();
  const { data } = await sb.from('hns_stories').select('id,title,dek,notes,section,published_at').eq('state', 'published').gte('published_at', start).order('published_at').limit(60);
  const rows = (data || []).filter((r: Any) => ilDay(new Date(r.published_at)) === today && !/^auto:(roundup|weather|shabbat)/.test(r.notes || ''));
  if (rows.length < 3) return null;
  const title = `סיכום היום בנתניה ובשרון, יום ${DAYS[dowOf(today)]} ${dm(today)}: ${rows.length} ידיעות`;
  const body = [`אלה הידיעות שפרסמנו היום על נתניה והשרון, בקצרה. כל ידיעה מופיעה באתר במלואה, עם המקור הרשמי שלה.`,
    ...rows.map((r: Any) => `${clean(r.title)}.${r.dek ? ` ${clean(r.dek)}` : ''}`)];
  return insert({ section: 'community', title, dek: `כל מה שקרה היום בעיר ובסביבה, במקום אחד.`, kicker: 'סיכום יומי', body, key_points: rows.slice(0, 3).map((r: Any) => clean(r.title)),
    sources: [{ id: 'nws_desk', name: 'מערכת חדשות נתניה והשרון', url: 'https://nws.co.il/', trust: 'media' }] }, key, dry);
}

async function tick(dry: boolean, only?: string) {
  const now = new Date(); const p = ilParts(now); const today = ilDay(now); const h = +p.hour; const wd = p.weekday; // Sun..Sat
  const out: Any[] = [];
  const run = async (name: string, due: boolean, f: () => Promise<Any>) => {
    if (only ? only !== name : !due) return;
    try { const r = await f(); if (r) out.push({ [name]: r }); } catch (e) { out.push({ [name]: { error: String((e as Error).message || e) } }); }
  };
  await run('weather', h >= 5 && h < 18, () => weather(today, dry));
  await run('shabbat', (wd === 'Thu' && h >= 12) || (wd === 'Fri' && h < 14), () => shabbat(today, dry));
  await run('events', (wd === 'Thu' || wd === 'Sun') && h >= 8 && h < 20, () => events(today, dry));
  await run('roundup', h >= 21 && h <= 23, () => roundup(today, dry));
  return { israel: `${today} ${p.hour}:${p.minute} ${wd}`, out };
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.action === 'tick') return J({ ok: true, dry: !!b.dry, ...(await tick(!!b.dry, b.only)) });
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
