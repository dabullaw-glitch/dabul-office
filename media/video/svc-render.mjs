// node render.mjs <sid>   (mp3 in vo/<sid>-s1..6.mp3, scene in scenes/<sid>.html) -> out/<sid>-video.mp4 + poster + json
import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
import { execSync } from 'child_process'; import fs from 'fs';
const sid = process.argv[2], FPS = 25, LEAD = 0.3, NS = 6;
const dur = [...Array(NS)].map((_, i) => +execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 vo/${sid}-s${i + 1}.mp3`).toString());
const D = dur.map((d, i) => +(d + LEAD + (i === NS - 1 ? 1.4 : 0.45)).toFixed(3));
const fr = `frames-${sid}`; fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr); fs.mkdirSync('out', { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell' });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.addInitScript(d => { window.DUR = d; }, D);
await p.goto('file://' + process.cwd() + `/scenes/${sid}.html`); await p.evaluate(() => document.fonts.ready);
const total = D.reduce((a, b) => a + b, 0), N = Math.ceil(total * FPS);
for (let f = 0; f < N; f++) { await p.evaluate(t => render(t), f / FPS); await p.screenshot({ path: `${fr}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 90 }); }
await b.close();
const starts = D.reduce((a, d, i) => (a.push(i ? a[i - 1] + D[i - 1] : 0), a), []);
const ins = [...Array(NS)].map((_, i) => `-i vo/${sid}-s${i + 1}.mp3`).join(' ');
const delays = starts.map((s, i) => `[${i + 1}:a]adelay=${Math.round((s + LEAD) * 1000)}|${Math.round((s + LEAD) * 1000)}[a${i}]`).join(';');
execSync(`ffmpeg -y -v error -framerate ${FPS} -i ${fr}/%05d.jpg ${ins} -filter_complex "${delays};${D.map((_, i) => `[a${i}]`).join('')}amix=inputs=${NS}:normalize=0,apad[a]" -map 0:v -map "[a]" -shortest -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k out/${sid}-video.mp4`);
execSync(`ffmpeg -y -v error -ss ${(starts[0] + 4.6).toFixed(2)} -i out/${sid}-video.mp4 -frames:v 1 -q:v 3 out/${sid}-video-poster.jpg`);
fs.writeFileSync(`out/${sid}-video.json`, JSON.stringify({ secs: Math.round(total) }));
fs.rmSync(fr, { recursive: true, force: true });
console.log(sid, 'frames', N, 'total', total.toFixed(1));
