#!/usr/bin/env bash
# One HeyGen job -> finished reel. Run from the repo root: bash tools/heygen-edit/edit.sh <id> <editor dir (tools/reel-lab copy)>
# Used by .github/workflows/heygen-edit.yml. Writes media/hgv/<id>.mp4 + .jpg + .result.json + .words.json + .plan.json + check stills.
set -euo pipefail
id=$1; ED=$2
J=media/hgv/$id.job.json; W=/tmp/w/$id; mkdir -p $W /tmp/p media/hgv/check
HF="npx -y hyperframes@0.8.226"
url=$(jq -r '.video // empty' $J); [ -n "$url" ] || { echo "no video url in the job"; exit 1; }
jq -r '.script' $J > $W/script.txt; jq '.plan' $J > $W/plan.in.json
curl -fsSL --retry 3 "$url" -o $W/raw.mp4
ffprobe -v error -show_entries stream=codec_type,width,height,r_frame_rate:format=duration -of json $W/raw.mp4 > $W/info.json
dur=$(jq -r '.format.duration' $W/info.json); echo "raw: $(jq -c '[.streams[]|{codec_type,width,height}]' $W/info.json) ${dur}s"
# working copy: portrait 1080x1920 30 fps (HeyGen reels are made 9:16 already; this only normalizes)
ffmpeg -y -v error -i $W/raw.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" -c:v libx264 -crf 18 -preset medium -pix_fmt yuv420p -c:a aac -b:a 192k $W/take.mp4
ffmpeg -y -v error -i $W/raw.mp4 -vn -ac 1 -ar 16000 $W/a16.wav
ffmpeg -v info -i $W/a16.wav -af silencedetect=n=-35dB:d=0.35 -f null - 2> $W/sil.txt || true
# word timings: Whisper (Hebrew), then every word of the approved script gets a time (captions = the exact script)
mkdir -p $W/wh; wj=-
if timeout 1500 python3 $ED/transcribe.py $W/wh $W/a16.wav > $W/wh.log 2>&1; then wj=$W/wh/words.json; else echo "whisper failed, spreading by length"; tail -5 $W/wh.log; fi
python3 tools/heygen-edit/prep.py align $W/script.txt $wj "$dur" $W/sil.txt $W/words.json | tee $W/align.json
F=$W/faces.json; python3 $ED/facetrack.py $W/take.mp4 $F 0.2 || F=-
python3 tools/heygen-edit/prep.py resolve $W/plan.in.json $W/words.json $W/plan.json 2> $W/resolve.err | tee $W/resolve.json
cat $W/resolve.err || true
# project: HyperFrames scaffold, then the reel editor writes index.html and the assets
P=/tmp/p/$id; rm -rf "$P"; (cd /tmp/p && $HF init $id --non-interactive --resolution portrait > $W/init.log 2>&1) || { cat $W/init.log; mkdir -p $P; }
mkdir -p $P/assets; cp $W/take.mp4 $P/assets/take.mp4
python3 $ED/build.py $W/plan.json $W/words.json $F $P --history="$(jq -r '.history // ""' $J)" --avoid="$(jq -r '.avoid // ""' $J)" > $W/build.json 2> $W/build.err || { cat $W/build.err; exit 1; }
cat $W/build.json
(cd $P && $HF lint) || true
(cd $P && $HF render --quality delivery --output $W/out.mp4)
ffmpeg -y -v error -i $W/out.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k -movflags +faststart media/hgv/$id.mp4
if [ "$(stat -c %s media/hgv/$id.mp4)" -gt 95000000 ]; then
  ffmpeg -y -v error -i $W/out.mp4 -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 160k -movflags +faststart media/hgv/$id.mp4
fi
d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 media/hgv/$id.mp4)
ffmpeg -y -v error -ss 1.2 -i media/hgv/$id.mp4 -frames:v 1 -q:v 3 media/hgv/$id.jpg
n=0; for p in 0.04 0.18 0.36 0.55 0.75 0.985; do
  n=$((n+1)); ts=$(awk -v d="$d" -v p="$p" 'BEGIN{printf "%.2f", d*p}')
  ffmpeg -y -v error -ss "$ts" -i media/hgv/$id.mp4 -frames:v 1 -vf scale=540:-2 -q:v 4 media/hgv/check/$id-$n.jpg
done
cp $W/words.json media/hgv/$id.words.json; cp $W/plan.json media/hgv/$id.plan.json
jq -n --argjson b "$(tail -1 $W/build.json)" --argjson al "$(cat $W/align.json)" --argjson rs "$(cat $W/resolve.json)" \
  --arg dur "$d" --arg bytes "$(stat -c %s media/hgv/$id.mp4)" --arg warn "$(cat $W/resolve.err)" --arg wh "$(tail -c 1500 $W/wh.log 2>/dev/null)" \
  '{ok:true, duration:($dur|tonumber), bytes:($bytes|tonumber), style:$b.style, theme:$b.theme, build:$b, align:$al, resolve:$rs, warnings:$warn, whisper:$wh, at:(now|todate)}' > media/hgv/$id.result.json
cat media/hgv/$id.result.json
