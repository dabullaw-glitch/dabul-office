// "השבוע בנתניה": the weekly news video of nws.co.il (חדשות נתניה והשרון), 1920x1080, narrated, burned-in captions.
// Same engine as render.mjs (Google TTS narration per scene, HTML page seeked frame by frame in Chromium, ffmpeg), news look.
// Usage (from the repo root): node tools/office-video/news.mjs media/nwsv/<id>.json
//   <id>.json = the docs row coll 'nwsvideo' (see fn/ytvideo-index.ts, ?a=nwsnext), scenes with audio links:
//   { id, week: {from, to, label}, scenes: [
//       { type: 'open',  h, sub, items[], say, audio }
//       { type: 'story', n, of, sec, color, h, img?, stat?: {n, label}, kick?, say, audio }   img = the story's own picture on the site
//       { type: 'end',   h, sub, say, audio } ] }
// Output: media/nwsv/<id>.mp4, <id>.jpg (poster) and <id>.times.json (scene start times, for YouTube chapters).
// A scene without an audio file gets a silent track sized to its text (local design checks only). STILLS=/dir: one picture per scene.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!spec.id || !/^[a-z0-9-]+$/.test(spec.id)) throw new Error('bad id');
const FPS = 30, W = 960, H = 540, SCALE = 2, LEAD = 0.4, TAIL = 0.6;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTDIR = path.join(ROOT, 'media/nwsv'); fs.mkdirSync(OUTDIR, { recursive: true });
const tmp = fs.mkdtempSync('/tmp/nvid-');
const FONTS = path.join(ROOT, 'sites/nws/public/fonts');
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, f)).toString('base64');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
// Latin runs (nws.co.il, numbers with %) stay left to right inside the Hebrew lines
const bidi = (s) => esc(s).replace(/([A-Za-z][A-Za-z0-9.\-/]*\.[a-z]{2,}[A-Za-z0-9.\-/]*)/g, '<bdi dir="ltr">$1</bdi>');

// 1. audio: each scene = LEAD silence + narration + TAIL silence
const parts = [];
for (let i = 0; i < spec.scenes.length; i++) {
  const s = spec.scenes[i], out = path.join(tmp, `a${i}.wav`);
  let speech;
  if (process.env.STILLS) { // design check: no sound needed
    speech = Math.max(2.5, String(s.say || '').length / 13);
  } else if (s.audio) {
    const mp3 = path.join(tmp, `a${i}.mp3`);
    const r = await fetch(s.audio); if (!r.ok) throw new Error(`audio ${i}: ${r.status}`);
    fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer()));
    speech = probe(mp3);
    ff(['-i', mp3, '-af', `adelay=${Math.round(LEAD * 1000)}:all=1,apad`, '-t', (LEAD + speech + TAIL).toFixed(3), '-ar', '48000', '-ac', '2', out]);
  } else {
    speech = Math.max(2.5, String(s.say || '').length / 13);
    ff(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', (LEAD + speech + TAIL).toFixed(3), out]);
  }
  parts.push({ file: out, speech, dur: LEAD + speech + TAIL });
}
const audio = path.join(tmp, 'audio.wav');
if (!process.env.STILLS) {
  fs.writeFileSync(path.join(tmp, 'list.txt'), parts.map((p) => `file '${p.file}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '48000', audio]);
}

// 2. the story pictures, inlined (a picture that cannot be fetched is left out and the scene uses its text panel)
const imgs = {};
for (const s of spec.scenes) {
  if (!s.img || imgs[s.img] !== undefined) continue;
  try {
    const r = await fetch(s.img, { headers: { 'user-agent': 'Mozilla/5.0 (nws-video)' } }); if (!r.ok) throw new Error(String(r.status));
    imgs[s.img] = `data:${r.headers.get('content-type') || 'image/jpeg'};base64,` + Buffer.from(await r.arrayBuffer()).toString('base64');
  } catch (e) { console.warn(`image left out (${e.message}): ${s.img}`); imgs[s.img] = ''; }
}

// 3. captions: the narration split into short chunks, timed by length inside each scene (as in render.mjs)
const chunks = (t) => {
  const out = [];
  for (const sent of String(t || '').split(/(?<=[.?!:])\s+/).filter(Boolean)) {
    if (sent.length <= 78) { out.push(sent); continue; }
    let cur = '';
    for (const piece of sent.split(/(?<=,)\s+/)) {
      if (cur && (cur + ' ' + piece).length > 78) { out.push(cur); cur = piece; } else cur = cur ? cur + ' ' + piece : piece;
    }
    if (cur) out.push(cur);
  }
  return out;
};

// 4. the picture
let t = 0; const caps = [], times = [];
const scenes = spec.scenes.map((s, i) => {
  const start = t, { dur, speech } = parts[i]; t += dur; times.push({ t: Math.round(start), type: s.type, h: s.h });
  const cs = chunks(s.say); const total = cs.reduce((a, c) => a + c.length, 0) || 1; let ct = start + LEAD;
  cs.forEach((c, k) => { const d = (c.length / total) * speech; caps.push({ start: ct, end: ct + d + (k === cs.length - 1 ? TAIL * 0.8 : 0), text: c }); ct += d; });
  const D = (sec) => `animation-delay:${Math.round((start + sec) * 1000)}ms`;
  const life = `style="animation:scene ${Math.round(dur * 1000)}ms linear both;${D(0)}"`;
  const color = /^#[0-9a-f]{6}$/i.test(s.color || '') ? s.color : '#C8102E';
  let inner = '';
  if (s.type === 'open') {
    inner = `<div class="kick up" style="${D(0.1)}">סיכום שבועי</div><h1 class="up" style="${D(0.3)}">${esc(s.h || 'השבוע בנתניה')}</h1>
      <p class="date up" style="${D(0.6)}">${esc(s.sub || spec.week?.label || '')}</p><div class="rule grow" style="${D(0.9)}"></div>
      <ul class="tops">${(s.items || []).slice(0, 4).map((x, k) => `<li class="up" style="${D(1.3 + k * Math.max(0.6, (speech - 2) / 4))}"><i></i>${bidi(x)}</li>`).join('')}</ul>`;
  }
  if (s.type === 'story') {
    const pic = s.img && imgs[s.img];
    const long = String(s.h || '').length > 52;
    const side = pic
      ? `<figure class="pic up" style="${D(0.15)}"><div class="kb" style="background-image:url('${pic}');animation:kb ${Math.round(dur * 1000)}ms linear both;${D(0)}"></div><figcaption>תמונה להמחשה</figcaption></figure>`
      : s.stat?.n
        ? `<div class="panel up" style="${D(0.15)};--c:${color}"><div class="big pop" style="${D(0.6)}"><bdi>${esc(s.stat.n)}</bdi></div><div class="blab">${esc(s.stat.label)}</div></div>`
        : `<div class="panel up" style="${D(0.15)};--c:${color}"><div class="pnum">${esc(s.n)}</div><div class="blab">${esc(s.kick || '')}</div></div>`;
    inner = `<div class="txt"><div class="meta up" style="${D(0.1)}"><span class="sec" style="background:${color}">${esc(s.sec)}</span><span class="cnt">ידיעה ${esc(s.n)} מתוך ${esc(s.of)}</span></div>
      <h2 class="up${long ? ' long' : ''}" style="${D(0.35)}">${bidi(s.h)}</h2><div class="rule grow" style="${D(0.8)};background:${color}"></div></div>${side}`;
  }
  if (s.type === 'end') {
    inner = `<div class="logo pop" style="${D(0.1)}">NWS<i></i></div><h2 class="up" style="${D(0.4)}">${esc(s.h || 'כל הפרטים באתר חדשות נתניה והשרון')}</h2>
      <p class="url up" style="${D(0.8)}"><bdi dir="ltr">${esc(s.sub || 'nws.co.il')}</bdi></p><p class="bye up" style="${D(1.3)}">${esc(s.note || 'נתראה בשבוע הבא')}</p>`;
  }
  return `<section class="sc ${s.type}" ${life}>${inner}</section>`;
});
const TOTAL = t;
const capHtml = caps.map((c) => `<p class="cap" style="animation:cap ${Math.round((c.end - c.start) * 1000)}ms linear both;animation-delay:${Math.round(c.start * 1000)}ms">${bidi(c.text)}</p>`).join('');

const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:N;font-weight:100 900;src:url(${font('noto-sans-hebrew-hebrew-v5.woff2')});unicode-range:U+0307-0308,U+0590-05FF,U+200C-2010,U+20AA,U+25CC,U+FB1D-FB4F}
@font-face{font-family:N;font-weight:100 900;src:url(${font('noto-sans-hebrew-latin-v5.woff2')});unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
*{margin:0;padding:0;box-sizing:border-box}
html{overflow:clip;width:${W}px;height:${H}px}
body{position:relative;overflow:hidden;width:${W}px;height:${H}px;font-family:N,sans-serif;color:#fff;background:#0A1424}
.bg{position:absolute;inset:0;background:radial-gradient(520px 340px at 100% 0%,rgba(11,95,204,.30),transparent 70%),radial-gradient(480px 320px at 0% 100%,rgba(8,56,111,.55),transparent 70%),linear-gradient(180deg,#0B1830,#0A1424)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:48px 48px}
.top{position:absolute;top:0;right:0;left:0;height:52px;display:flex;align-items:center;gap:12px;padding:0 32px;background:#fff;color:#0E1726}
.top .lg{flex:none;background:#0E1726;color:#fff;font-weight:900;font-size:15px;letter-spacing:.04em;padding:5px 9px 5px 13px;border-radius:7px;position:relative}
.top .lg i{position:absolute;top:-3px;left:-3px;width:9px;height:9px;border-radius:50%;background:#C8102E;border:2px solid #fff}
.top b{font-size:19px;font-weight:800}.top span{flex:1}
.top em{font-style:normal;font-size:14px;font-weight:700;color:#fff;background:#C8102E;padding:4px 11px;border-radius:4px}
.top small{font-size:14px;font-weight:600;color:#3B4656}
.sc{position:absolute;top:72px;right:36px;left:36px;height:352px;display:flex;opacity:0}
@keyframes scene{0%{opacity:0}2.5%{opacity:1}97%{opacity:1}100%{opacity:0}}
@keyframes cap{0%{opacity:0}5%{opacity:1}95%{opacity:1}100%{opacity:0}}
@keyframes up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:scale(.86)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleX(0)}to{transform:none}}
@keyframes kb{from{transform:scale(1.02)}to{transform:scale(1.12)}}
@keyframes bar{from{width:0}to{width:100%}}
.up{animation:up 600ms cubic-bezier(.2,.8,.2,1) both}.pop{animation:pop 700ms cubic-bezier(.2,.8,.2,1) both}
.grow{animation:grow 650ms cubic-bezier(.2,.8,.2,1) both;transform-origin:right}
.rule{width:96px;height:4px;background:#C8102E;margin-top:18px;border-radius:2px}
.open{flex-direction:column;justify-content:center}
.kick{align-self:flex-start;background:#C8102E;color:#fff;font-weight:800;font-size:15px;padding:5px 12px;border-radius:4px;margin-bottom:14px}
h1{font-size:64px;font-weight:900;line-height:1.05;letter-spacing:-.01em}
.date{font-size:22px;font-weight:600;color:#BFD3F2;margin-top:10px}
.tops{list-style:none;margin-top:20px;display:grid;gap:9px;max-width:820px}
.tops li{display:flex;align-items:center;gap:12px;font-size:21px;font-weight:600;line-height:1.3;color:#EAF1FB}
.tops i{flex:none;width:10px;height:10px;border-radius:2px;background:#C8102E}
.story{gap:30px;align-items:center}
.txt{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center}
.meta{display:flex;align-items:center;gap:12px;margin-bottom:16px}
.sec{font-size:15px;font-weight:800;color:#fff;padding:4px 11px;border-radius:4px}
.cnt{font-size:15px;font-weight:600;color:#A9BEDD}
h2{font-size:34px;font-weight:800;line-height:1.28;text-wrap:balance}
h2.long{font-size:29px}
.pic{flex:none;width:480px;height:270px;border-radius:10px;overflow:hidden;position:relative;box-shadow:0 18px 40px rgba(0,0,0,.45);border:2px solid rgba(255,255,255,.9)}
.kb{position:absolute;inset:0;background-size:cover;background-position:center}
.pic figcaption{position:absolute;bottom:8px;right:8px;font-size:12px;font-weight:600;color:#fff;background:rgba(10,20,36,.72);padding:3px 8px;border-radius:3px}
.panel{flex:none;width:480px;height:270px;border-radius:10px;background:#fff;color:#0E1726;display:flex;flex-direction:column;justify-content:center;align-items:center;gap:8px;padding:24px;border-top:8px solid var(--c);box-shadow:0 18px 40px rgba(0,0,0,.45);text-align:center}
.big{font-size:92px;font-weight:900;line-height:1;color:var(--c);direction:ltr}
.pnum{font-size:96px;font-weight:900;line-height:1;color:var(--c)}
.blab{font-size:22px;font-weight:700;line-height:1.35;color:#3B4656;text-wrap:balance;max-width:420px}
.end{flex-direction:column;justify-content:center;align-items:center;text-align:center}
.logo{background:#fff;color:#0E1726;font-weight:900;font-size:40px;letter-spacing:.04em;padding:10px 22px 10px 26px;border-radius:14px;position:relative;margin-bottom:22px}
.logo i{position:absolute;top:-6px;left:-6px;width:20px;height:20px;border-radius:50%;background:#C8102E;border:3px solid #0A1424}
.end h2{font-size:38px}
.url{font-size:44px;font-weight:900;color:#fff;margin-top:12px;background:#C8102E;padding:4px 22px;border-radius:8px}
.bye{font-size:20px;font-weight:600;color:#BFD3F2;margin-top:16px}
.caps{position:absolute;right:36px;left:36px;top:440px;height:72px}
.cap{position:absolute;inset:0 0 auto 0;opacity:0;min-height:56px;display:flex;align-items:center;justify-content:center;text-align:center;text-wrap:balance;font-size:21px;line-height:1.38;font-weight:700;color:#0E1726;background:#fff;border-right:6px solid #C8102E;padding:8px 18px;border-radius:4px;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.bar{position:absolute;bottom:0;right:0;height:5px;background:#C8102E;animation:bar ${Math.round(TOTAL * 1000)}ms linear both}
</style></head><body><div class="bg"></div><div class="grid"></div>
<div class="top"><div class="lg">NWS<i></i></div><b>חדשות נתניה והשרון</b><span></span><small>${esc(spec.week?.label || '')}</small><em>השבוע בנתניה</em></div>
${scenes.join('')}<div class="caps">${capHtml}</div><div class="bar"></div></body></html>`;
fs.writeFileSync(path.join(tmp, 'page.html'), html);

const exe = process.env.CHROME ? { executablePath: process.env.CHROME } : {};
const b = await chromium.launch(exe);
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
const seek = (ms) => p.evaluate((x) => document.getAnimations().forEach((a) => { a.currentTime = x; }), ms);
if (process.env.STILLS) {
  let s0 = 0;
  for (let i = 0; i < parts.length; i++) { s0 += parts[i].dur; await seek((s0 - 0.7) * 1000); await p.screenshot({ path: path.join(process.env.STILLS, `${spec.id}-${i + 1}.jpg`), type: 'jpeg', quality: 80 }); }
  await b.close(); fs.rmSync(tmp, { recursive: true, force: true }); process.exit(0);
}
const frames = Math.ceil(TOTAL * FPS);
for (let f = 0; f < frames; f++) {
  await seek((f / FPS) * 1000);
  await p.screenshot({ path: path.join(tmp, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
}
await seek(Math.min(4500, parts[0].dur * 1000 - 300));
await p.screenshot({ path: path.join(OUTDIR, `${spec.id}.jpg`), type: 'jpeg', quality: 85 });
await b.close();
const out = path.join(OUTDIR, `${spec.id}.mp4`);
ff(['-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg'), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '22',
  '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]);
fs.writeFileSync(path.join(OUTDIR, `${spec.id}.times.json`), JSON.stringify({ total: Math.round(TOTAL), scenes: times }, null, 1));
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`video ${spec.id}: ${TOTAL.toFixed(1)}s, ${frames} frames, ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
