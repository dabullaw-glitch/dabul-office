// citydata-pages (29.10.2026): second source pass for the city guide ("שימושון עירוני"), run in GitHub Actions (workflow
// city-data, only=pages) because the workspace cannot reach these hosts.
//  1. The national public transport GTFS of the Ministry of Transport: agencies, the stops inside Netanya (train stations
//     included) and the routes whose name mentions Netanya, so operators and stations come from the official file.
//  2. Official pages (municipality, libraries network, Clalit, Laniado), opened in a real browser: visible text and links.
// Saves raw answers only (out/pages-*.json, out/gtfs-*.json). Nothing here goes to the site without a manual check.
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const OUT = process.argv[2] || 'out';
const URLS = (process.argv[3] || '').split('|').filter(Boolean);
fs.mkdirSync(OUT, { recursive: true });
const save = (name, data) => fs.writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 1));

// ---------- 1. GTFS ----------
function csv(text) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n') { row.push(f.replace(/\r$/, '')); rows.push(row); row = []; f = ''; } else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  const [h, ...rest] = rows; return rest.filter((r) => r.length > 1).map((r) => Object.fromEntries(h.map((k, i) => [k.replace(/^﻿/, ''), r[i]])));
}
if (!process.env.SKIP_GTFS) {
  try {
    execSync('curl -sSL --retry 3 -o /tmp/gtfs.zip https://gtfs.mot.gov.il/gtfsfiles/israel-public-transportation.zip', { stdio: 'inherit', timeout: 900000 });
    const rd = (n) => csv(execSync(`unzip -p /tmp/gtfs.zip ${n}`, { maxBuffer: 1 << 30 }).toString('utf8'));
    const agency = rd('agency.txt'); save('gtfs-agency', agency);
    const stops = rd('stops.txt');
    save('gtfs-stops-netanya', stops.filter((s) => /עיר:\s*נתניה/.test(s.stop_desc || '') || /נתניה/.test(s.stop_name || '') && s.location_type === '1'));
    save('gtfs-rail-stations', stops.filter((s) => /^17\d{3}$/.test(s.stop_code || '') || /רכבת/.test(s.stop_name || '') && /נתניה/.test(s.stop_name + (s.stop_desc || ''))));
    const routes = rd('routes.txt');
    const an = Object.fromEntries(agency.map((a) => [a.agency_id, a.agency_name]));
    save('gtfs-routes-netanya', routes.filter((r) => /נתניה/.test(r.route_long_name || '')).map((r) => ({ ...r, agency: an[r.agency_id] })));
    console.log('gtfs ok', agency.length, stops.length, routes.length);
  } catch (e) { console.log('gtfs failed', String(e).slice(0, 300)); save('gtfs-error', { error: String(e).slice(0, 1000) }); }
}

// ---------- 2. pages ----------
if (URLS.length) {
  const { chromium } = await import('playwright');
  const b = await chromium.launch();
  const ctx = await b.newContext({ locale: 'he-IL', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' });
  const res = [];
  for (const url of URLS) {
    const p = await ctx.newPage();
    try {
      const r = await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(async () => p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }));
      await p.waitForTimeout(3000);
      const text = await p.evaluate(() => document.body ? document.body.innerText : '');
      const links = await p.evaluate(() => [...document.querySelectorAll('a[href]')].map((a) => [a.innerText.trim().slice(0, 120), a.href]).filter((x) => x[0] || x[1]));
      res.push({ url, final: p.url(), status: r ? r.status() : 0, title: await p.title(), text: text.slice(0, 120000), links: links.slice(0, 1500) });
      console.log('page', r ? r.status() : 0, url.slice(0, 100), text.length);
    } catch (e) { res.push({ url, error: String(e).slice(0, 300) }); console.log('page fail', url.slice(0, 100)); }
    await p.close();
  }
  await b.close();
  save(`pages-${Date.now()}`, res);
}
