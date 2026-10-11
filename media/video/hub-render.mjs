import { chromium } from '/tmp/claude-0/node_modules/playwright/index.mjs';
import { execSync } from 'child_process'; import fs from 'fs';
const FPS=30, LEAD=0.3;
const dur=[1,2,3,4,5,6,7].map(i=>+execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 hub-s${i}.mp3`).toString());
const D=dur.map((d,i)=>+(d+LEAD+(i===6?1.4:0.45)).toFixed(3));
fs.rmSync('frames',{recursive:true,force:true}); fs.mkdirSync('frames');
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome',headless:false,args:['--headless=new','--no-sandbox']});
const p = await b.newPage({viewport:{width:1280,height:720}});
await p.addInitScript(d=>{window.DUR=d;}, D);
await p.goto('file://'+process.cwd()+'/scene.html'); await p.evaluate(()=>document.fonts.ready);
const total=D.reduce((a,b)=>a+b,0), N=Math.ceil(total*FPS);
for(let f=0; f<N; f++){ await p.evaluate(t=>render(t), f/FPS); await p.screenshot({path:`frames/${String(f).padStart(5,'0')}.jpg`,type:'jpeg',quality:92}); }
await b.close();
const starts=D.reduce((a,d,i)=>(a.push(i?a[i-1]+D[i-1]:0),a),[]);
const ins=[1,2,3,4,5,6,7].map(i=>`-i hub-s${i}.mp3`).join(' ');
const delays=starts.map((s,i)=>`[${i+1}:a]adelay=${Math.round((s+LEAD)*1000)}|${Math.round((s+LEAD)*1000)}[a${i}]`).join(';');
execSync(`ffmpeg -y -v error -framerate ${FPS} -i frames/%05d.jpg ${ins} -filter_complex "${delays};${D.map((_,i)=>`[a${i}]`).join('')}amix=inputs=7:normalize=0,apad[a]" -map 0:v -map "[a]" -shortest -c:v libx264 -preset slow -crf 20 -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 128k hub-video.mp4`);
execSync(`ffmpeg -y -v error -ss 3.2 -i hub-video.mp4 -frames:v 1 -q:v 3 hub-video-poster.jpg`);
console.log('frames',N,'total',total.toFixed(1),'D',D.join(','));
