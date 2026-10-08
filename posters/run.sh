#!/bin/bash
# sharp preview pictures for the site videos: one full quality frame from each video
mkdir -p posters-out work; : > posters-out/log.txt
while read id; do
  [ -z "$id" ] && continue
  rm -f work/*
  yt-dlp -q --no-warnings -f "bv*[height<=1920][ext=mp4]/bv*" --download-sections "*0-5" -o "work/v.%(ext)s" "https://www.youtube.com/shorts/$id" >> posters-out/log.txt 2>&1
  f=$(ls work/v.* 2>/dev/null | head -1)
  if [ -z "$f" ]; then echo "$id FAIL" >> posters-out/log.txt; continue; fi
  wh=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$f")
  for t in 0.6 1.8 3.2; do
    ffmpeg -loglevel error -y -ss $t -i "$f" -frames:v 1 -vf "scale=1080:-2:flags=lanczos" -q:v 2 "work/f$t.png"
  done
  # keep the sharpest of the three (largest png = most detail)
  best=$(ls -S work/f*.png | head -1)
  ffmpeg -loglevel error -y -i "$best" -c:v libwebp -quality 84 "posters-out/$id.webp"
  echo "$id OK $wh $(basename $best)" >> posters-out/log.txt
done < posters/ids.txt
