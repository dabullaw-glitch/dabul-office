// Before every build: a snapshot of the sea and weather in Netanya from Open-Meteo (free, no key) into src/data/live.json.
// The home page shows this snapshot ("עודכן HH:MM") and the browser refreshes it from Open-Meteo when the page opens.
// If Open-Meteo cannot be reached, the last saved snapshot is kept (or an empty one is written) and the build goes on.
import fs from 'node:fs';
const OUT = 'src/data/live.json';
const LAT = 32.33, LON = 34.85;
const MARINE = `https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&current=wave_height,sea_surface_temperature&timezone=Asia%2FJerusalem`;
const FORECAST = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,wind_speed_10m,weather_code&timezone=Asia%2FJerusalem`;
const get = async (u) => { const r = await fetch(u, { signal: AbortSignal.timeout(20000) }); if (!r.ok) throw new Error(`${r.status}`); return (await r.json()).current || {}; };
try {
  const [m, f] = await Promise.all([get(MARINE), get(FORECAST)]);
  const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
  const out = { ok: true, at: new Date().toISOString(), wave: num(m.wave_height), sst: num(m.sea_surface_temperature), temp: num(f.temperature_2m), wind: num(f.wind_speed_10m), code: num(f.weather_code) };
  if (out.wave === null && out.temp === null) throw new Error('empty answer');
  fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(`live: wave ${out.wave} m, sea ${out.sst}°, air ${out.temp}°, wind ${out.wind} km/h`);
} catch (e) {
  console.warn(`live: not updated (${e.message}); ${fs.existsSync(OUT) ? 'keeping the last snapshot' : 'no snapshot'}`);
  if (!fs.existsSync(OUT)) fs.writeFileSync(OUT, JSON.stringify({ ok: false }));
}
