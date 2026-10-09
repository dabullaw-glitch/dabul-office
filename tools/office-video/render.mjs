// Office answer videos for YouTube (1080x1920, narrated, burned-in captions), in the law office brand.
// Usage (from the repo root): node tools/office-video/render.mjs <script.json>
//   script.json is what https://<project>.supabase.co/functions/v1/ytvideo?a=next returns:
//   { id, title, link, scenes: [{ type, ..., say, audio }] }
//   scene types: title {h, sub}  points {h, items[]}  number {label, n, note}  steps {h, items[]}  end {h, sub}
// Output: media/yt/<id>.mp4 and media/yt/<id>.jpg (poster), served by GitHub Pages.
// A scene without an audio file gets a silent track sized to its text (used for local design checks only).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const spec = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!spec.id || !/^[a-z0-9-]+$/.test(spec.id)) throw new Error('bad id');
const FPS = 30, W = 540, H = 960, SCALE = 2, LEAD = 0.35, TAIL = 0.55;
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUTDIR = path.join(ROOT, 'media/yt'); fs.mkdirSync(OUTDIR, { recursive: true });
const tmp = fs.mkdtempSync('/tmp/ovid-');
const FONTS = path.join(ROOT, 'sites/blihovot/public/fonts');
const font = (f) => 'data:font/woff2;base64,' + fs.readFileSync(path.join(FONTS, f)).toString('base64');
const yakir = 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'media/yakir-cutout-20261008.webp')).toString('base64');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;');
const ff = (args) => execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...args]);
const probe = (f) => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());

// 1. audio: each scene = LEAD silence + narration + TAIL silence
const parts = [];
for (let i = 0; i < spec.scenes.length; i++) {
  const s = spec.scenes[i], out = path.join(tmp, `a${i}.wav`);
  let speech;
  if (s.audio) {
    const mp3 = path.join(tmp, `a${i}.mp3`);
    const r = await fetch(s.audio); if (!r.ok) throw new Error(`audio ${i}: ${r.status}`);
    fs.writeFileSync(mp3, Buffer.from(await r.arrayBuffer()));
    speech = probe(mp3);
    const dur = LEAD + speech + TAIL;
    ff(['-i', mp3, '-af', `adelay=${Math.round(LEAD * 1000)}:all=1,apad`, '-t', dur.toFixed(3), '-ar', '48000', '-ac', '2', out]);
  } else {
    speech = Math.max(2.5, String(s.say || '').length / 13);
    ff(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-t', (LEAD + speech + TAIL).toFixed(3), out]);
  }
  parts.push({ file: out, speech, dur: LEAD + speech + TAIL });
}
fs.writeFileSync(path.join(tmp, 'list.txt'), parts.map((p) => `file '${p.file}'`).join('\n'));
const audio = path.join(tmp, 'audio.wav');
ff(['-f', 'concat', '-safe', '0', '-i', path.join(tmp, 'list.txt'), '-c', 'copy', audio]);

// 2. captions: the narration split into short chunks, timed by length inside each scene
const chunks = (t) => {
  const out = [];
  for (const sent of String(t || '').split(/(?<=[.?!:])\s+/).filter(Boolean)) {
    if (sent.length <= 62) { out.push(sent); continue; }
    let cur = '';
    for (const piece of sent.split(/(?<=,)\s+/)) {
      if (cur && (cur + ' ' + piece).length > 62) { out.push(cur); cur = piece; } else cur = cur ? cur + ' ' + piece : piece;
    }
    if (cur) out.push(cur);
  }
  return out;
};

// 3. the picture
let t = 0; const caps = [];
const scenes = spec.scenes.map((s, i) => {
  const start = t, { dur, speech } = parts[i]; t += dur;
  const cs = chunks(s.say); const total = cs.reduce((a, c) => a + c.length, 0) || 1; let ct = start + LEAD;
  cs.forEach((c) => { const d = (c.length / total) * speech; caps.push({ start: ct, end: ct + d + (c === cs[cs.length - 1] ? TAIL * 0.8 : 0), text: c }); ct += d; });
  const D = (sec) => `animation-delay:${Math.round((start + sec) * 1000)}ms`;
  const at = (k, n) => LEAD + 0.15 + (k / Math.max(n, 1)) * speech * 0.82; // item k appears about when the narration reaches it
  const life = `style="animation:scene ${Math.round(dur * 1000)}ms linear both;${D(0)}"`;
  const items = s.items || [];
  let inner = '';
  if (s.type === 'title') inner = `<div class="kick up" style="${D(0.1)}">שאלה ותשובה</div><h1 class="up" style="${D(0.3)}">${esc(s.h)}</h1><div class="rule grow" style="${D(0.8)}"></div>${s.sub ? `<p class="sub up" style="${D(1.1)}">${esc(s.sub)}</p>` : ''}`;
  if (s.type === 'points') inner = `<h2 class="up" style="${D(0.1)}">${esc(s.h)}</h2><ul class="pts">${items.map((x, k) => `<li class="up" style="${D(at(k + 0.4, items.length + 0.4))}"><span>${k + 1}</span><b>${esc(x)}</b></li>`).join('')}</ul>`;
  if (s.type === 'number') inner = `<p class="lab up" style="${D(0.1)}">${esc(s.label)}</p><div class="num pop" style="${D(0.45)}">${esc(s.n)}</div><div class="rule grow" style="${D(0.9)}"></div>${s.note ? `<p class="sub up" style="${D(1.2)}">${esc(s.note)}</p>` : ''}`;
  if (s.type === 'steps') inner = `<h2 class="up" style="${D(0.1)}">${esc(s.h)}</h2><ol class="stp">${items.map((x, k) => `<li class="up" style="${D(at(k + 0.4, items.length + 0.4))}"><i>${k + 1}</i><b>${esc(x)}</b></li>`).join('')}</ol>`;
  if (s.type === 'end') inner = `<img class="me rise" src="${yakir}" style="${D(0.1)}" alt=""><div class="endtx"><h2 class="up" style="${D(0.35)}">${esc(s.h || 'המדריך המלא באתר של עו״ד יקיר דבול')}</h2><p class="url up" style="${D(0.75)}">${esc(s.sub || 'dabullaw.co.il')}</p><p class="disc up" style="${D(1.1)}">המידע בסרטון כללי ואינו ייעוץ משפטי</p></div>`;
  return `<section class="sc ${s.type}" ${life}>${inner}</section>`;
});
const TOTAL = t;
const capHtml = caps.map((c) => `<p class="cap" style="animation:cap ${Math.round((c.end - c.start) * 1000)}ms linear both;animation-delay:${Math.round(c.start * 1000)}ms">${esc(c.text)}</p>`).join('');

const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><style>
@font-face{font-family:H;font-weight:400;src:url(${font('heebo-hebrew-400-normal.woff2')})}@font-face{font-family:H;font-weight:500;src:url(${font('heebo-hebrew-500-normal.woff2')})}@font-face{font-family:H;font-weight:700;src:url(${font('heebo-hebrew-700-normal.woff2')})}
@font-face{font-family:HL;font-weight:400;src:url(${font('heebo-latin-400-normal.woff2')})}@font-face{font-family:HL;font-weight:700;src:url(${font('heebo-latin-700-normal.woff2')})}
@font-face{font-family:F;font-weight:700;src:url(${font('frank-ruhl-libre-hebrew-700-normal.woff2')})}@font-face{font-family:F;font-weight:700;src:url(${font('frank-ruhl-libre-latin-700-normal.woff2')})}
*{margin:0;padding:0;box-sizing:border-box}
html{overflow:clip;width:${W}px;height:${H}px}
body{position:relative;overflow:clip;width:${W}px;height:${H}px;overflow:hidden;font-family:H,HL,sans-serif;color:#f3ead6;background:#0d0c0a}
.bg{position:absolute;inset:0;background:radial-gradient(380px 300px at 85% 4%,rgba(201,169,97,.20),transparent 70%),radial-gradient(420px 360px at 0% 100%,rgba(201,169,97,.10),transparent 70%),#0d0c0a}
.frame{position:absolute;inset:14px;border:1px solid rgba(201,169,97,.28);border-radius:4px}
.brand{position:absolute;top:40px;right:62px;left:36px;display:flex;align-items:center;gap:10px;font-size:15px;letter-spacing:.06em;color:#c9a961;font-weight:500}
.brand b{font-family:F;font-size:19px;letter-spacing:0;color:#e4d19c}.brand i{flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(201,169,97,.5))}
.bar{position:absolute;top:14px;right:14px;height:3px;background:#c9a961;animation:bar ${Math.round(TOTAL * 1000)}ms linear both}
.sc{position:absolute;top:96px;right:62px;left:36px;height:560px;display:flex;flex-direction:column;justify-content:center;opacity:0}
@keyframes scene{0%{opacity:0}3%{opacity:1}96%{opacity:1}100%{opacity:0}}
@keyframes cap{0%{opacity:0}6%{opacity:1}94%{opacity:1}100%{opacity:0}}
@keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes pop{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:none}}
@keyframes grow{from{transform:scaleX(0)}to{transform:none}}
@keyframes rise{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes bar{from{width:0}to{width:calc(100% - 28px)}}
.up{animation:up 650ms cubic-bezier(.2,.8,.2,1) both}.pop{animation:pop 750ms cubic-bezier(.2,.8,.2,1) both}
.grow{animation:grow 700ms cubic-bezier(.2,.8,.2,1) both;transform-origin:right}.rise{animation:rise 900ms cubic-bezier(.2,.8,.2,1) both}
.kick{align-self:flex-start;color:#0d0c0a;background:#c9a961;font-weight:700;font-size:16px;letter-spacing:.04em;padding:6px 14px;border-radius:2px;margin-bottom:26px}
h1{font-family:F;font-weight:700;font-size:46px;line-height:1.2;text-wrap:balance;color:#f6efdf}
h2{font-family:F;font-weight:700;font-size:34px;line-height:1.25;margin-bottom:26px;color:#e4d19c;text-wrap:balance}
.rule{width:120px;height:3px;background:#c9a961;margin-top:26px}
.sub{font-size:22px;line-height:1.55;color:#d9cdb3;margin-top:20px}
.pts{list-style:none;display:grid;grid-template-columns:minmax(0,1fr);gap:14px;width:100%}
.pts li{display:flex;gap:14px;align-items:center;background:#17150f;border:1px solid #3a3226;border-inline-start:3px solid #c9a961;padding:16px 18px;border-radius:3px}
.pts span{flex:none;width:34px;height:34px;border-radius:50%;border:1.5px solid #c9a961;color:#e4d19c;display:grid;place-items:center;font-family:F;font-size:18px}
.pts b{flex:1;min-width:0;font-size:22px;line-height:1.4;font-weight:500;color:#f3ead6}
.lab{font-size:22px;font-weight:700;color:#c9a961;letter-spacing:.02em}
.num{font-family:F;font-weight:700;font-size:96px;line-height:1.05;margin-top:12px;color:#e4d19c}
.stp{list-style:none;display:grid;grid-template-columns:minmax(0,1fr);gap:0;position:relative;width:100%}
.stp:before{content:"";position:absolute;right:19px;top:20px;bottom:20px;width:2px;background:linear-gradient(#c9a961,rgba(201,169,97,.25))}
.stp li{display:flex;gap:16px;align-items:center;padding:11px 0;position:relative}
.stp i{flex:none;width:40px;height:40px;border-radius:50%;background:#0d0c0a;border:2px solid #c9a961;display:grid;place-items:center;font-style:normal;font-family:F;font-size:20px;color:#e4d19c}
.stp b{flex:1;min-width:0;font-size:22px;line-height:1.4;font-weight:500}
.end{justify-content:flex-start}
.me{position:absolute;bottom:-36px;left:-22px;height:470px;filter:drop-shadow(0 0 30px rgba(0,0,0,.6))}
.endtx{position:relative;margin-top:40px;max-width:330px}
.end h2{font-size:34px;color:#f6efdf}
.url{font-family:HL,H;font-size:24px;font-weight:700;color:#c9a961;direction:ltr;text-align:right}
.disc{font-size:15px;color:#a59a82;margin-top:18px}
.caps{position:absolute;top:680px;right:62px;left:36px;height:120px}
.cap{position:absolute;inset:0 0 auto 0;opacity:0;font-size:21px;line-height:1.5;font-weight:700;color:#fff;text-align:center;text-wrap:balance}
.cap{background:rgba(0,0,0,.55);border:1px solid rgba(201,169,97,.25);padding:8px 14px;border-radius:4px}
</style></head><body><div class="bg"></div><div class="frame"></div>
<div class="brand"><b>עו״ד יקיר דבול</b><span>נדל״ן ומקרקעין</span><i></i></div>
${scenes.join('')}<div class="caps">${capHtml}</div><div class="bar"></div></body></html>`;
fs.writeFileSync(path.join(tmp, 'page.html'), html);

const exe = process.env.CHROME ? { executablePath: process.env.CHROME } : {};
const b = await chromium.launch(exe);
const p = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: SCALE });
await p.setContent(html); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
const seek = (ms) => p.evaluate((x) => document.getAnimations().forEach((a) => { a.currentTime = x; }), ms);
if (process.env.STILLS) { // design check: one picture near the end of each scene
  let s0 = 0;
  for (let i = 0; i < parts.length; i++) { s0 += parts[i].dur; await seek((s0 - 0.6) * 1000); await p.screenshot({ path: path.join(process.env.STILLS, `${spec.id}-${i + 1}.png`) }); }
  await b.close(); process.exit(0);
}
const frames = Math.ceil(TOTAL * FPS);
for (let f = 0; f < frames; f++) {
  await seek((f / FPS) * 1000);
  await p.screenshot({ path: path.join(tmp, `f${String(f).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 90 });
}
await seek(Math.min(2600, parts[0].dur * 1000 - 300));
await p.screenshot({ path: path.join(OUTDIR, `${spec.id}.jpg`), type: 'jpeg', quality: 85 });
await b.close();
const out = path.join(OUTDIR, `${spec.id}.mp4`);
ff(['-framerate', String(FPS), '-i', path.join(tmp, 'f%05d.jpg'), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '23',
  '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`video ${spec.id}: ${TOTAL.toFixed(1)}s, ${frames} frames, ${(fs.statSync(out).size / 1e6).toFixed(2)} MB`);
