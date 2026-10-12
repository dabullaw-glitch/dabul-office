# Reel editor v3 (HyperFrames)

Edits a raw talking-head take of Yakir into a finished 9:16 reel: cuts out silences, punch-in zooms on every cut,
word-by-word captions (active word in gold), animated graphics that follow what he says, and an end card.

## Yakir's standing rules (12.10.2026, after the first demo)
1. **Captions and the editing level stay exactly like the demo** ("ירושת דירה עם אחים"). Do not change the caption look.
2. **Graphics never cover his face.** `build.py` reads the face track and places every graphic where there is room:
   above the head (smaller if needed), or the picture slides down / shrinks for a moment to make room, then returns.
   If a video has little room above the head, use fewer or smaller graphics there and more where there is room.
3. **No music at all.** Only light sound effects (whoosh, pop, hit) under the voice.
4. **A different design in every video.** Six themes in `themes.py` (navy-gold, paper, glass, bold, mono, warm).
   Never use a theme that was used in the last 3 reels (`--avoid=a,b,c`). Record the theme used in
   Supabase `docs settings/video.themeHistory` (newest first). New themes are welcome: add them to `themes.py`.
5. Office rules: name "יקיר דבול - משרד עורכי דין", phone 09-8613413, "המידע כללי ואינו ייעוץ משפטי" on the end card.
   No superlatives, no "מומחה", no promises, no "חינם", no prices.

## Steps for one reel
1. Working copy 1080x1920 30fps (`ffmpeg -i raw.mov -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30" -c:v libx264 -crf 20 -c:a aac take.mp4`).
   In the cloud: add `<name> <driveFileId>` to `reel-lab.txt` on branch `tools/reel-lab`; the workflow makes
   `reel-lab/<name>/{proxy.mp4,words.json,faces.json}`.
2. Words: `python3 transcribe.py <outdir> <audio16k.wav>` (faster-whisper, ivrit-ai model) -> `words.json`.
3. Face track: `python3 facetrack.py take.mp4 faces.json 0.2` (needs `opencv-python-headless==4.10.0.84`; OpenCV 5 has no Haar cascades).
4. Plan: copy `plans/inherit-siblings.json` and write the new one from the transcript: `keep` ranges (source seconds,
   only the strongest 30 to 60 seconds, like before), `fix` for transcription mistakes, `goldWords`, and `beats`
   (kinds: hook, name, thirds, stack, boom, title, option, stamp, term, cta). 6 to 10 beats; each beat says on screen
   what he is saying at that moment, short (max about 4 words a line).
5. Build: `python3 build.py plan.json words.json faces.json <project> --avoid=<last 3 themes>` (project needs
   `assets/take.mp4`, plus `hyperframes.json`, `meta.json`, `package.json` from `npx hyperframes init`).
   It prints the theme and, per beat, where it was placed (band / push / split / low).
6. Check: `npx hyperframes lint`, then `npx hyperframes snapshot --at <beat times>` and LOOK at the frames:
   no graphic on the face, nothing cut at the edges, Hebrew right to left. Fix the plan and rebuild if needed.
7. Render: `npx hyperframes render --output out.mp4`, then loudness `ffmpeg -i out.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=11 -c:a aac -b:a 192k final.mp4`.
