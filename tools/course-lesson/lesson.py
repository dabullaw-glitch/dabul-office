#!/usr/bin/env python3
"""Course lesson assembly (5.11.2026, Yakir approved option A for the course "קונים דירה ראשונה, בלי הפתעות"):
   lesson video = Yakir's avatar opening (HeyGen) + the lesson slides with his voice + his avatar closing, 16:9 1920x1080,
   for the academy player. Run by .github/workflows/course-lesson.yml for every job file media/course/jobs/<file>.job.json
   pushed by the scheduled task "סרטוני הייגן" (tools/heygen-edit/TASK.md, section 8, and settings/heygen.courseRules).

Job: {
  "id": "<vidreq id>", "file": "<output file id, ^[a-z0-9-]+$>", "course": "first-home", "n": 1,
  "deckUrl": "https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/reels?a=deck&t=<ctok>",   (or "deck": {...} inline)
  "open": "<HeyGen mp4 url of the opening>", "close": "<HeyGen mp4 url of the closing>",
  "narration": {"mode": "pieces", "pieces": [{"audio": "<HeyGen speech url>", "from": 0, "to": 9}, ...]}
             | {"mode": "google"}    (the existing Google narration files of the slides, deck scene.audio)
  "splitTest": false                 (test only: cut the Google files into pieces and split them again, report the error)
}
Narration pieces: one HeyGen speech call per piece (consecutive slides from..to, 0-based, inclusive), the slides' texts joined
with <break time="1.2s"/>. The piece is cut back into slides at its longest pauses (checked against the text lengths).
Output (GitHub Pages, never Supabase storage): media/course/<course>/<file>.mp4, <file>.jpg (poster), <file>.result.json,
check stills media/course/check/<file>-1..6.jpg. On failure the workflow writes media/course/jobs/<file>.error.txt.
"""
import json, math, os, pathlib, re, subprocess, sys, time, urllib.request

ROOT = pathlib.Path(__file__).resolve().parents[2]
W, H, FPS = 1920, 1080, 25
LEAD, TAIL = 0.35, 0.55          # silence before / after each slide's narration
T_SCENE, T_STEP = 0.5, 0.3       # crossfade between slides / between reveal steps of one slide
AVATAR_W = 608                   # a 9:16 avatar at full height (the panel leaves this strip on the left)


def log(*a):
    print(*a, flush=True)


def run(cmd, **kw):
    log('$', ' '.join(str(c) for c in cmd)[:400])
    return subprocess.run([str(c) for c in cmd], check=True, **kw)


def dur(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(f)],
                         capture_output=True, text=True, check=True).stdout.strip()
    return float(out)


def vsize(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', str(f)],
                         capture_output=True, text=True, check=True).stdout.strip()
    w, h = out.split(',')[:2]
    return int(w), int(h)


def fetch(url, out, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'dabul-course-lesson/1.0'})
            with urllib.request.urlopen(req, timeout=120) as r, open(out, 'wb') as f:
                f.write(r.read())
            if os.path.getsize(out) > 0:
                return out
        except Exception as e:  # noqa: BLE001
            log('fetch failed', i + 1, url[:120], e)
            time.sleep(3 * (i + 1))
    raise SystemExit(f'cannot download {url[:160]}')


def to_wav(src, out):
    run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', src, '-ac', '1', '-ar', '48000', out])
    return out


def trim_wav(src, out):
    """cut the silence at both ends (keeps the speech exactly)"""
    sr = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05'
    run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', src, '-af', f'{sr},areverse,{sr},areverse', '-ac', '1', '-ar', '48000', out])
    if dur(out) < 0.3:   # nothing left: keep the original
        run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', src, '-ac', '1', '-ar', '48000', out])
    return out


def silences(wav, noise='-35dB', d=0.3):
    p = subprocess.run(['ffmpeg', '-nostdin', '-v', 'info', '-i', str(wav), '-af', f'silencedetect=noise={noise}:d={d}', '-f', 'null', '-'],
                       capture_output=True, text=True)
    out, s = [], None
    for line in p.stderr.splitlines():
        m = re.search(r'silence_start: ([\d.]+)', line)
        if m:
            s = float(m.group(1))
        m = re.search(r'silence_end: ([\d.]+)', line)
        if m and s is not None:
            out.append((s, float(m.group(1))))
            s = None
    return out


def split_points(wav, texts):
    """where to cut a narration piece back into its slides: the k-1 longest pauses when they agree with the text lengths,
    else the longest pause near the place the text lengths expect (else that place itself)."""
    k, total = len(texts), dur(wav)
    if k == 1:
        return [], 'single', []
    w = [max(1, len(t)) for t in texts]
    sil = [(s, e) for s, e in silences(wav) if s > 0.3 and e < total - 0.3]
    warn = []

    def plausible(cuts):
        b = [0.0] + cuts + [total]
        for j in range(k):
            exp = total * w[j] / sum(w)
            got = b[j + 1] - b[j]
            if not (0.5 * exp <= got <= 1.8 * exp):
                return False
        return True

    top = sorted(sil, key=lambda x: x[1] - x[0], reverse=True)[:k - 1]
    top.sort()
    if len(top) == k - 1:
        cuts = [(s + e) / 2 for s, e in top]
        if plausible(cuts):
            return cuts, 'longest-pauses', warn
    cuts, prev = [], 0.0
    for j in range(1, k):
        rest = sum(w[j - 1:])
        exp = prev + (total - prev) * w[j - 1] / rest
        span = (total - prev) * w[j - 1] / rest
        cand = [(s, e) for s, e in sil if abs((s + e) / 2 - exp) < 0.35 * span and (s + e) / 2 > prev + 0.5]
        if cand:
            s, e = max(cand, key=lambda x: (x[1] - x[0]) - 0.05 * abs((x[0] + x[1]) / 2 - exp))
            c = (s + e) / 2
        else:
            c = exp
            warn.append(f'no pause found near {exp:.1f}s (slide {j}), cut by text length')
        cuts.append(c)
        prev = c
    return cuts, 'nearest-pause', warn


def cut(src, a, b, out):
    run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-ss', f'{a:.3f}', '-to', f'{b:.3f}', '-i', src, '-ac', '1', '-ar', '48000', out])
    return out


def strip_md(s):
    return re.sub(r'<[^>]+>', '', re.sub(r'\*\*(.+?)\*\*', r'\1', str(s or ''))).strip()


def main(job_path):
    job = json.loads(pathlib.Path(job_path).read_text())
    fid = job['file']
    assert re.fullmatch(r'[a-z0-9-]+', fid), 'bad file id'
    course = re.sub(r'[^a-z0-9-]', '', job.get('course') or 'first-home')
    work = pathlib.Path('/tmp/cl') / fid
    (work / 'img').mkdir(parents=True, exist_ok=True)
    (work / 'aud').mkdir(parents=True, exist_ok=True)
    res = {'id': job.get('id'), 'file': fid, 'course': course, 'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'warnings': []}

    deck = job.get('deck')
    if not deck:
        fetch(job['deckUrl'], work / 'deck.json')
        deck = json.loads((work / 'deck.json').read_text())
        if not deck.get('ok', True):
            raise SystemExit('deck: ' + str(deck))
    scenes = deck['scenes']
    n, of = deck.get('n') or job.get('n'), deck.get('of') or 10
    res.update(n=n, title=deck.get('title'), scenes=len(scenes))
    log('lesson', n, deck.get('title'), len(scenes), 'slides')

    # ---- narration: one trimmed wav per slide ----
    nar = job.get('narration') or {'mode': 'google'}
    mode = nar.get('mode', 'google')
    res['narration'] = {'mode': mode, 'pieces': []}
    scene_wav = [None] * len(scenes)
    if mode == 'google' or job.get('splitTest'):
        for i, s in enumerate(scenes):
            if not s.get('audio'):
                raise SystemExit(f'slide {i + 1} has no narration file')
            raw = fetch(s['audio'], work / 'aud' / f'g{i:02d}.mp3')
            scene_wav[i] = trim_wav(to_wav(raw, work / 'aud' / f'g{i:02d}.wav'), work / 'aud' / f's{i:02d}.wav')
    if job.get('splitTest'):
        # glue the Google files into pieces like the HeyGen speech calls (1.2 s pause between slides) and cut them again
        truth, errs, pieces, i = [], [], [], 0
        while i < len(scenes):
            j = min(len(scenes) - 1, i + 9)
            pieces.append((i, j))
            i = j + 1
        sil = work / 'aud' / 'sil12.wav'
        run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', '1.2', sil])
        for a, b in pieces:
            lst = work / 'aud' / f'cat{a}.txt'
            parts = []
            for x in range(a, b + 1):
                parts.append(f"file '{scene_wav[x]}'")
                if x < b:
                    parts.append(f"file '{sil}'")
            lst.write_text('\n'.join(parts) + '\n')
            pw = work / 'aud' / f'piece{a}.wav'
            run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', pw])
            t, tc = 0.0, []
            for x in range(a, b):
                t += dur(scene_wav[x]) + 1.2
                tc.append(t - 0.6)
            cuts, how, warn = split_points(pw, [scenes[x].get('say', '') for x in range(a, b + 1)])
            errs += [abs(c - e) for c, e in zip(cuts, tc)]
            res['narration']['pieces'].append({'from': a, 'to': b, 'method': how, 'warnings': warn})
        res['splitTest'] = {'maxError': round(max(errs) if errs else 0, 3), 'cuts': len(errs)}
        log('split test', res['splitTest'])
    if mode == 'pieces':
        for pi, p in enumerate(nar['pieces']):
            a, b = int(p['from']), int(p['to'])
            src = fetch(p['audio'], work / 'aud' / f'p{pi:02d}.src')
            pw = to_wav(src, work / 'aud' / f'p{pi:02d}.wav')
            cuts, how, warn = split_points(pw, [scenes[x].get('say', '') for x in range(a, b + 1)])
            bounds = [0.0] + cuts + [dur(pw)]
            for x in range(a, b + 1):
                seg = cut(pw, bounds[x - a], bounds[x - a + 1], work / 'aud' / f'c{x:02d}.wav')
                scene_wav[x] = trim_wav(seg, work / 'aud' / f's{x:02d}.wav')
            res['narration']['pieces'].append({'from': a, 'to': b, 'method': how, 'seconds': round(bounds[-1], 2), 'warnings': warn})
            res['warnings'] += warn
    if any(x is None for x in scene_wav):
        raise SystemExit('narration missing for slides ' + str([i + 1 for i, x in enumerate(scene_wav) if x is None]))
    a_dur = [dur(x) for x in scene_wav]
    d_scene = [LEAD + a + TAIL for a in a_dur]

    # ---- stills: every reveal step of every slide, and the two avatar panels ----
    from playwright.sync_api import sync_playwright
    page_url = (ROOT / 'tools' / 'course-lesson' / 'render.html').as_uri()
    states = []   # per slide: list of (image, start time within the slide)
    summary = next((s for s in scenes if s.get('kind') == 'summary'), None)
    points = [strip_md(x if isinstance(x, str) else x.get('t')) for x in (summary or {}).get('items', [])][:4]
    with sync_playwright() as pw_:
        br = pw_.chromium.launch(args=['--font-render-hinting=none'], **({'executable_path': os.environ['CHROME']} if os.environ.get('CHROME') else {}))
        pg = br.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)
        pg.goto(page_url)
        pg.wait_for_function('document.fonts && document.fonts.status === "loaded"', timeout=30000)
        pg.wait_for_timeout(800)
        pg.evaluate('s => window.mountDeck(s)', scenes)
        for i in range(len(scenes)):
            m = pg.evaluate(f'window.show({i})')
            pg.wait_for_timeout(150)
            steps = []
            for k in range(1, max(1, m) + 1):
                pg.evaluate(f'window.reveal({k if m else 0})')
                pg.wait_for_timeout(60)
                f = work / 'img' / f's{i:02d}-{k:02d}.png'
                pg.screenshot(path=str(f))
                t = 0.0 if k == 1 else LEAD + ((k - 1) / m) * 0.85 * a_dur[i]
                steps.append((f, t))
            states.append(steps)
        base = {'course': deck.get('courseTitle') or 'קונים דירה ראשונה', 'foot': 'יקיר דבול - משרד עורכי דין · dabullaw.co.il'}
        pg.evaluate('o => window.panel(o)', {**base, 'kicker': f'שיעור {n} מתוך {of}', 'title': deck.get('title', '')})
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(work / 'img' / 'panel-open.png'))
        pg.evaluate('o => window.panel(o)', {**base, 'kicker': f'סיכום שיעור {n}', 'title': deck.get('title', ''), 'points': points,
                                             'next': deck.get('nextTitle') or ''})
        pg.wait_for_timeout(200)
        pg.screenshot(path=str(work / 'img' / 'panel-close.png'))
        br.close()

    enc = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(FPS)]

    # ---- the slides: one clip per slide (its reveal steps crossfade), then the slides crossfade into each other ----
    seg_files = []
    for i, steps in enumerate(states):
        ext = T_SCENE if i < len(states) - 1 else 0.0          # runs into the crossfade with the next slide
        times = [t for _, t in steps] + [d_scene[i]]
        shows = [times[j + 1] - times[j] for j in range(len(steps))]
        out = work / f'seg{i:02d}.mp4'
        if len(steps) == 1:
            run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-loop', '1', '-framerate', FPS, '-t', f'{shows[0] + ext:.3f}', '-i', steps[0][0],
                 '-vf', f'scale={W}:{H}:flags=lanczos,format=yuv420p', *enc, out])
        else:
            ins, fc = [], []
            for j, (img, _) in enumerate(steps):
                L = shows[j] + (T_STEP if j < len(steps) - 1 else ext)
                ins += ['-loop', '1', '-framerate', FPS, '-t', f'{L:.3f}', '-i', img]
                fc.append(f'[{j}:v]scale={W}:{H}:flags=lanczos,format=yuv420p,setsar=1[v{j}]')
            cur, off = 'v0', 0.0
            for j in range(1, len(steps)):
                off += shows[j - 1]
                fc.append(f'[{cur}][v{j}]xfade=transition=fade:duration={T_STEP}:offset={off:.3f}[x{j}]')
                cur = f'x{j}'
            run(['ffmpeg', '-nostdin', '-y', '-v', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', f'[{cur}]', *enc, out])
        seg_files.append(out)
    ins, fc, cur, off = [], [], '0:v', 0.0
    for f in seg_files:
        ins += ['-i', f]
    for i in range(1, len(seg_files)):
        off += d_scene[i - 1]
        fc.append(f'[{cur}][{i}:v]xfade=transition=fade:duration={T_SCENE}:offset={off:.3f}[m{i}]')
        cur = f'm{i}'
    slides = work / 'slides.mp4'
    if fc:
        run(['ffmpeg', '-nostdin', '-y', '-v', 'error', *ins, '-filter_complex', ';'.join(fc), '-map', f'[{cur}]', *enc, slides])
    else:
        slides = seg_files[0]
    # the narration track: each slide's speech after a short pause, in the slide's own time
    lst, parts = work / 'aud' / 'mid.txt', []
    for i, x in enumerate(scene_wav):
        pad = work / 'aud' / f'pad{i:02d}.wav'
        run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', x, '-af', f'adelay={int(LEAD * 1000)},apad=whole_dur={d_scene[i]:.3f}',
             '-t', f'{d_scene[i]:.3f}', '-ac', '1', '-ar', '48000', pad])
        parts.append(f"file '{pad}'")
    lst.write_text('\n'.join(parts) + '\n')
    mid_wav = work / 'aud' / 'mid.wav'
    run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', mid_wav])
    middle = work / 'middle.mp4'
    mid_len = sum(d_scene)
    run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', slides, '-i', mid_wav, '-filter_complex',
         f'[0:v]trim=0:{mid_len:.3f},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.4,fade=t=out:st={mid_len - 0.4:.3f}:d=0.4[v];'
         f'[1:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,afade=t=in:st=0:d=0.2,afade=t=out:st={mid_len - 0.4:.3f}:d=0.4[a]',
         '-map', '[v]', '-map', '[a]', *enc, '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', f'{mid_len:.3f}', middle])

    # ---- opening and closing: Yakir's avatar next to the panel ----
    def avatar_part(url, panel, name, fade_in, fade_out):
        raw = fetch(url, work / f'{name}-raw.mp4')
        L = dur(raw)
        w, h = vsize(raw)
        if w > h:   # a landscape avatar video fills the frame
            v = f'[0:v]scale={W}:{H}:force_original_aspect_ratio=decrease,pad={W}:{H}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps={FPS}[av]'
        else:       # portrait: full height on the left, the panel beside it
            v = (f'[1:v]scale={W}:{H},setsar=1,fps={FPS}[bg];[0:v]scale=-2:{H}:flags=lanczos,crop=min(iw\\,{AVATAR_W}):{H},setsar=1,fps={FPS}[fg];'
                 f'[bg][fg]overlay=x=0:y=0:shortest=1[av]')
        fc = (f'{v};[av]trim=0:{L:.3f},setpts=PTS-STARTPTS,format=yuv420p,fade=t=in:st=0:d={fade_in},fade=t=out:st={L - fade_out:.3f}:d={fade_out}[v];'
              f'[0:a]loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,afade=t=in:st=0:d=0.15,afade=t=out:st={L - fade_out:.3f}:d={fade_out}[a]')
        out = work / f'{name}.mp4'
        run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', raw, '-loop', '1', '-framerate', FPS, '-i', panel, '-filter_complex', fc,
             '-map', '[v]', '-map', '[a]', *enc, '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', f'{L:.3f}', out])
        return out, L

    opening, l_open = avatar_part(job['open'], work / 'img' / 'panel-open.png', 'open', 0.5, 0.4)
    closing, l_close = avatar_part(job['close'], work / 'img' / 'panel-close.png', 'close', 0.4, 0.8)

    # ---- the lesson: opening + slides + closing ----
    outdir = ROOT / 'media' / 'course' / course
    outdir.mkdir(parents=True, exist_ok=True)
    (ROOT / 'media' / 'course' / 'check').mkdir(parents=True, exist_ok=True)
    final = outdir / f'{fid}.mp4'
    tmp = work / 'final.mp4'
    crf = 24
    while True:
        run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-i', opening, '-i', middle, '-i', closing, '-filter_complex',
             '[0:v][0:a][1:v][1:a][2:v][2:a]concat=n=3:v=1:a=1[v][a]', '-map', '[v]', '-map', '[a]',
             '-c:v', 'libx264', '-preset', 'medium', '-crf', str(crf), '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-r', str(FPS),
             '-c:a', 'aac', '-b:a', '128k', '-ar', '48000', '-movflags', '+faststart', tmp])
        size = os.path.getsize(tmp)
        log('final', crf, size)
        if size < 90e6 or crf >= 34:
            break
        crf += 3
    if size >= 95e6:
        raise SystemExit(f'the lesson video is too big for GitHub ({size} bytes)')
    os.replace(tmp, final)
    total = dur(final)
    # poster and check stills (opening, four points in the slides, closing)
    run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-ss', f'{min(2.0, l_open / 2):.2f}', '-i', final, '-frames:v', '1', '-q:v', '3', outdir / f'{fid}.jpg'])
    pts = [l_open / 2] + [l_open + mid_len * q for q in (0.1, 0.35, 0.6, 0.85)] + [l_open + mid_len + l_close / 2]
    for j, t in enumerate(pts, 1):
        run(['ffmpeg', '-nostdin', '-y', '-v', 'error', '-ss', f'{t:.2f}', '-i', final, '-frames:v', '1', '-vf', 'scale=960:-2', '-q:v', '4',
             ROOT / 'media' / 'course' / 'check' / f'{fid}-{j}.jpg'])
    starts, t = [], l_open
    for i in range(len(scenes)):
        starts.append({'slide': i + 1, 'kind': scenes[i].get('kind'), 'start': round(t, 2), 'speech': round(a_dur[i], 2)})
        t += d_scene[i]
    res.update(duration=round(total, 2), parts={'open': round(l_open, 2), 'slides': round(mid_len, 2), 'close': round(l_close, 2)},
               bytes=os.path.getsize(final), crf=crf, slides=starts,
               url=f'https://dabullaw-glitch.github.io/dabul-office/media/course/{course}/{fid}.mp4')
    (outdir / f'{fid}.result.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    log(json.dumps({k: res[k] for k in ('duration', 'parts', 'bytes', 'crf', 'url')}, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
