// Render one explainer video (same timing rules as media/video/svc-render.mjs and hub-render.mjs of 11.10.2026):
// every scene lasts its narration + 0.3s lead + 0.45s (the last scene + 1.4s); the scene page draws frame t with render(t).
//   node render.mjs <scene.html> <a1.mp3,a2.mp3,...> <out/name> [fps=25] [crf=21] [jpegQ=90] [posterSec=4.6]
//   -> out/name.mp4, out/name-poster.jpg, out/name.json {secs, scenes:[...]}
//   STILLS=1 ... writes one still per scene (at 6s into it, or its end) instead of the video, for checking.
import { createRequire } from 'module'; import { execFileSync } from 'child_process'; import fs from 'fs'; import path from 'path';
const req = createRequire(import.meta.url);
let pw; try { pw = req('playwright'); } catch { pw = req('/opt/node22/lib/node_modules/playwright'); }
const [scene, audioList, outBase, fpsA, crfA, qA, posterA] = process.argv.slice(2);
const FPS = +(fpsA || 25), CRF = +(crfA || 21), Q = +(qA || 90), POSTER = +(posterA || 4.6), LEAD = 0.3;
const A = audioList.split(',');
const NS = A.length;
const dur = A.map(f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
const D = dur.map((d, i) => +(d + LEAD + (i === NS - 1 ? 1.4 : 0.45)).toFixed(3));
const starts = D.reduce((a, d, i) => (a.push(i ? a[i - 1] + D[i - 1] : 0), a), []);
const total = D.reduce((a, b) => a + b, 0), N = Math.ceil(total * FPS);
fs.mkdirSync(path.dirname(outBase), { recursive: true });
const fr = outBase + '-frames'; fs.rmSync(fr, { recursive: true, force: true }); fs.mkdirSync(fr, { recursive: true });
const opts = process.env.CHROME ? { executablePath: process.env.CHROME } : {};
const b = await pw.chromium.launch(opts);
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
await p.addInitScript(d => { window.DUR = d; }, D);
await p.goto('file://' + path.resolve(scene)); await p.evaluate(() => document.fonts.ready);
if (process.env.STILLS) {
  for (let i = 0; i < NS; i++) { await p.evaluate(t => render(t), starts[i] + Math.min(6, D[i] - 0.5)); await p.screenshot({ path: `${outBase}-still${i + 1}.jpg`, type: 'jpeg', quality: 90 }); }
  await b.close(); fs.rmSync(fr, { recursive: true, force: true }); console.log('stills', NS, 'D', D.join(',')); process.exit(0);
}
for (let f = 0; f < N; f++) { await p.evaluate(t => render(t), f / FPS); await p.screenshot({ path: `${fr}/${String(f).padStart(5, '0')}.jpg`, type: 'jpeg', quality: Q }); }
await b.close();
const ins = A.flatMap(f => ['-i', f]);
const delays = starts.map((s, i) => `[${i + 1}:a]adelay=${Math.round((s + LEAD) * 1000)}|${Math.round((s + LEAD) * 1000)}[a${i}]`).join(';');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-framerate', String(FPS), '-i', `${fr}/%05d.jpg`, ...ins, '-filter_complex',
  `${delays};${D.map((_, i) => `[a${i}]`).join('')}amix=inputs=${NS}:normalize=0,apad[a]`, '-map', '0:v', '-map', '[a]', '-shortest',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', String(CRF), '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', outBase + '.mp4']);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', (starts[0] + POSTER).toFixed(2), '-i', outBase + '.mp4', '-frames:v', '1', '-q:v', '3', outBase + '-poster.jpg']);
fs.writeFileSync(outBase + '.json', JSON.stringify({ secs: Math.round(total), scenes: D }));
fs.rmSync(fr, { recursive: true, force: true });
console.log(path.basename(outBase), 'frames', N, 'total', total.toFixed(1));
