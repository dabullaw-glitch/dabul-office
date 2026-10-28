// Shabbat times for Netanya, computed from the sun (no outside service):
// candle lighting = 20 minutes before sunset on Friday; end of Shabbat = when the sun is 8.5 degrees below the horizon on Saturday.
import SunCalc from 'suncalc';
SunCalc.addTime(-8.5, 'tzeitDawn', 'tzeit');
const LAT = 32.3215, LON = 34.8532;
const fmt = (d: Date) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
const fmtD = (d: Date) => new Intl.DateTimeFormat('he-IL', { timeZone: 'Asia/Jerusalem', day: 'numeric', month: 'long' }).format(d);
export function shabbatTimes(from = new Date(), weeks = 6) {
  const out: { date: string; candles: string; end: string; sunset: string }[] = [];
  const d = new Date(from); d.setUTCHours(10, 0, 0, 0);
  while (d.getUTCDay() !== 5) d.setUTCDate(d.getUTCDate() + 1);
  for (let i = 0; i < weeks; i++) {
    const fri = new Date(d); fri.setUTCDate(d.getUTCDate() + 7 * i);
    const sat = new Date(fri); sat.setUTCDate(fri.getUTCDate() + 1);
    const tf = SunCalc.getTimes(fri, LAT, LON), ts = SunCalc.getTimes(sat, LAT, LON) as any;
    out.push({ date: fmtD(fri), sunset: fmt(tf.sunset), candles: fmt(new Date(tf.sunset.getTime() - 20 * 60000)), end: fmt(ts.tzeit) });
  }
  return out;
}
export function todaySun(d = new Date()) { const t = SunCalc.getTimes(d, LAT, LON); return { sunrise: fmt(t.sunrise), sunset: fmt(t.sunset) }; }
