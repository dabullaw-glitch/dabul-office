// Short vertical explainer videos (1080x1920, silent, with on-screen text and captions) made from a JSON script.
// Usage: node scripts/video.mjs videos/<id>.json
//   -> public/video/<id>.mp4, public/video/<id>.jpg (poster), public/video/<id>.vtt (captions), and an entry in src/data/videos.json
// Script format: { id, title, description, guide?, lesson?, scenes: [ {type:'title'|'points'|'number'|'steps'|'end', dur (seconds), ...} ] }
//   title:  { h, sub }        points: { h, items: [..up to 3] }      number: { n, label, note }
//   steps:  { h, items: [..up to 5], active (index) }               end: { h, sub }
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const FPS = 30, W = 540, H = 960, SCALE = 2;
const OUTDIR = 'public/video'; fs.mkdirSync(OUTDIR, { recursive: true });
const tmp = fs.mkdtempSync('/tmp/vid-');
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync('public/fonts/' + f).toString('base64');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');

let t = 0; const cues = [];
const scenes = spec.scenes.map((s, i) => {
  const start = t, dur = s.dur || 5; t += dur;
  const cueText = [s.h, s.sub, s.n && `${s.n} ${s.label || ''}`, ...(s.items || [])].filter(Boolean).join(' · ');
  cues.push({ start, end: t, text: cueText });
  const D = (ms) => `animation-delay:${Math.round(start * 1000 + ms)}ms`;
  const life = `style="animation:scene ${dur * 1000}ms linear both;${D(0)}"`;
  let inner = '';
  if (s.type === 'title') inner = `<div class="tag up" style="${D(150)}">בלי חובות</div><h1 class="up" style="${D(350)}">${esc(s.h)}</h1>${s.sub ? `<p class="sub up" style="${D(900)}">${esc(s.sub)}</p>` : ''}`;
  if (s.type === 'points') inner = `<h2 class="up" style="${D(150)}">${esc(s.h)}</h2><ul>${(s.items || []).map((x, k) => `<li class="up" style="${D(700 + k * 900)}"><span>${k + 1}</span>${esc(x)}</li>`).join('')}</ul>`;
  if (s.type === 'number') inner = `<p class="lab up" style="${D(150)}">${esc(s.label)}</p><div class="num pop" style="${D(500)}">${esc(s.n)}</div>${s.note ? `<p class="sub up" style="${D(1300)}">${esc(s.note)}</p>` : ''}`;
  if (s.type === 'steps') inner = `<h2 class="up" style="${D(150)}">${esc(s.h)}</h2><ol class="steps">${(s.items || []).map((x, k) => `<li class="up${k === s.active ? ' on' : ''}${k === (s.items.length - 1) ? ' end' : ''}" style="${D(500 + k * 600)}"><i>${k === s.items.length - 1 ? '✓' : k + 1}</i><b>${esc(x)}</b></li>`).join('')}</ol>`;
  if (s.type === 'end') inner = `<div class="logo pop" style="${D(150)}"><svg viewBox="0 0 40 40"><rect width="40" height="40" rx="11" fill="#0d6b63"/><path d="M11 25a9 9 0 0 1 18 0" fill="#f2a93b"/><path d="M7 27.5h26" stroke="#fbf8f3" stroke-width="2.6" stroke-linecap="round"/><path d="M20 9.5v3.2M10.6 13.4l2.2 2.2M29.4 13.4l-2.2 2.2" stroke="#f2a93b" stroke-width="2.2" stroke-linecap="round"/></svg></div><h2 class="up" style="${D(500)}">${esc(s.h || 'המדריך המלא באתר')}</h2><p class="sub up" style="${D(900)}">${esc(s.sub || 'בלי חובות · המדריך הישראלי ליציאה מחובות')}</p><p class="note up" style="${D(1400)}">מידע כללי, לא ייעוץ משפטי</p>`;
  return `<section class="sc ${s.type}" ${life}>${inner}</section>`;
});
const total = t;

const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:H;font-weight:400;src:url(${font('heebo-hebrew-400-normal.woff2')})}@font-face{font-family:H;font-weight:700;src:url(${font('heebo-hebrew-700-normal.woff2')})}@font-face{font-family:F;font-weight:700;src:url(${font('frank-ruhl-libre-hebrew-700-normal.woff2')})}
*{margin:0;padding:0;box-sizing:border-box}body{width:${W}px;height:${H}px;overflow:hidden;font-family:H;color:#14233a;background:#fbf8f3}
.bg{position:absolute;inset:0;background:radial-gradient(420px 300px at 90% 0%,rgba(242,169,59,.35),transparent 65%),linear-gradient(180deg,#f3ece1,#fbf8f3 60%)}
.bar{position:absolute;top:0;right:0;height:6px;background:#0d6b63;animation:bar ${total * 1000}ms linear both}
.sc{position:absolute;inset:0;padding:96px 44px 80px;display:flex;flex-direction:column;justify-content:center;opacity:0}
@keyframes scene{0%{opacity:0}4%{opacity:1}94%{opacity:1}100%{opacity:0}}
@keyframes up{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:scale(.85)}to{opacity:1;transform:none}}
@keyframes bar{from{width:0}to{width:100%}}
.up{animation:up 600ms cubic-bezier(.2,.8,.2,1) both}.pop{animation:pop 700ms cubic-bezier(.2,.8,.2,1) both}
.tag{align-self:flex-start;background:#0d6b63;color:#fff;font-weight:700;font-size:22px;padding:8px 18px;border-radius:999px;margin-bottom:30px}
h1{font-family:F;font-size:58px;line-height:1.15}h2{font-family:F;font-size:44px;line-height:1.2;margin-bottom:34px}
.sub{font-size:26px;line-height:1.5;color:#2c3a50;margin-top:24px}
ul{list-style:none;display:grid;gap:22px}li{display:flex;gap:16px;align-items:flex-start;font-size:30px;line-height:1.4;font-weight:700;background:#fff;border:2px solid #e4dacb;border-radius:20px;padding:20px 22px}
li span{flex:none;width:44px;height:44px;border-radius:50%;background:#e3f1ee;color:#0a524c;display:grid;place-items:center;font-size:24px}
.lab{font-size:30px;font-weight:700;color:#0d6b63}.num{font-family:F;font-size:104px;line-height:1.1;margin-top:16px;color:#14233a}
.steps{list-style:none;display:grid;gap:14px;position:relative}.steps li{background:none;border:0;padding:6px 0;font-size:30px;align-items:center}
.steps i{flex:none;width:54px;height:54px;border-radius:50%;border:4px solid #0d6b63;display:grid;place-items:center;font-style:normal;font-size:24px;color:#0d6b63;background:#fbf8f3}
.steps li.on i{background:#0d6b63;color:#fff}.steps li.end i{background:#f2a93b;border-color:#f2a93b;color:#1b1405}
.end{align-items:center;text-align:center}.logo svg{width:150px;height:150px;margin-bottom:34px}.note{font-size:20px;color:#5a6475;margin-top:40px}
</style></head><body><div class="bg"></div>${scenes.join('')}<div class="bar"></div></body></html>`;

const b = await chromium.launch(process.env.CHROME ? { executablePath: process.env.CHROME, args: ['--headless=new'] } : {});
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
const frames = Math.ceil(total * FPS);
for (let f = 0; f < frames; f++) {
  const ms = (f / FPS) * 1000;
  await p.evaluate((x) => document.getAnimations().forEach((a) => { a.currentTime = x; }), ms);
  await p.screenshot({ path: path.join(tmp, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
}
// poster: the middle of the first scene
await p.evaluate((x) => document.getAnimations().forEach((a) => { a.currentTime = x; }), Math.min(2500, (spec.scenes[0].dur || 5) * 600));
await p.screenshot({ path: path.join(OUTDIR, `${spec.id}.jpg`), type: 'jpeg', quality: 82 });
await b.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'slow', '-crf', '26', '-movflags', '+faststart', path.join(OUTDIR, `${spec.id}.mp4`)]);
fs.rmSync(tmp, { recursive: true, force: true });
const ts = (x) => { const m = Math.floor(x / 60), s = (x % 60).toFixed(3).padStart(6, '0'); return `00:${String(m).padStart(2, '0')}:${s}`; };
fs.writeFileSync(path.join(OUTDIR, `${spec.id}.vtt`), 'WEBVTT\n\n' + cues.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n'));
const list = JSON.parse(fs.readFileSync('src/data/videos.json', 'utf8')).filter((v) => v.id !== spec.id);
list.push({ id: spec.id, title: spec.title, description: spec.description, src: `video/${spec.id}.mp4`, poster: `video/${spec.id}.jpg`, captions: `video/${spec.id}.vtt`, w: W * SCALE, h: H * SCALE, duration: `PT${Math.round(total)}S`, date: new Date().toISOString().slice(0, 10), guide: spec.guide || '', lesson: spec.lesson || '' });
fs.writeFileSync('src/data/videos.json', JSON.stringify(list, null, 1));
console.log(`video ${spec.id}: ${Math.round(total)}s, ${frames} frames, ${(fs.statSync(path.join(OUTDIR, spec.id + '.mp4')).size / 1e6).toFixed(2)} MB`);
