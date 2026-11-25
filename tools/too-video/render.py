#!/usr/bin/env python3
"""Team of One lesson video (pilot 25.11.2026): slides in the site's brand + Yakir's own voice (edge function `voice`).

Usage: python3 render.py <deck.json> <narration.txt> <narration.mp3> <out.mp4>
- deck.json: {"lesson","title","slides":[{type, kicker, ..., "cues":[words from the narration paragraph]}]}
  one slide per narration paragraph (blank line between paragraphs). Each cue is a phrase from that paragraph; the
  slide reveals its next item when the narration reaches it (time = position of the phrase in the paragraph).
- Slide boundaries: the pause in the audio (ffmpeg silencedetect) nearest to where the text says the paragraph ends.
- Output 1920x1080, 25 fps, H.264 + AAC, short cross-fades. Paid content: the deck, the audio and the mp4 stay out
  of this public repo; the mp4 goes to private storage only.
"""
import json, os, pathlib, re, subprocess, sys, tempfile

HERE = pathlib.Path(__file__).resolve().parent
FPS, XF, LEAD = 25, 0.3, 0.25


def sh(cmd, **kw):
    return subprocess.run([str(c) for c in cmd], check=True, capture_output=True, text=True, **kw)


def duration(f):
    return float(sh(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', f]).stdout)


def silences(f, d=0.28):
    err = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(f), '-af', f'silencedetect=noise=-38dB:d={d}', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', err)]
    en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', err)]
    return [((a + b) / 2, b - a) for a, b in zip(st, en)]


def main(deck_f, txt_f, mp3, out):
    deck = json.loads(pathlib.Path(deck_f).read_text())
    paras = [p.strip() for p in re.split(r'\n\s*\n', pathlib.Path(txt_f).read_text()) if p.strip()]
    if len(paras) != len(deck['slides']): raise SystemExit(f'{len(paras)} paragraphs, {len(deck["slides"])} slides')
    # decode the narration once to WAV: a narration joined from several MP3 parts can carry a header that makes ffprobe
    # under-report its length (lesson 2: 173.2 s reported, 181 s real), which cut the end of the video. WAV length is exact.
    tmp = pathlib.Path(tempfile.mkdtemp())
    wav = tmp / 'narration.wav'
    sh(['ffmpeg', '-y', '-hide_banner', '-i', mp3, '-c:a', 'pcm_s16le', wav])
    mp3 = wav
    total = duration(mp3)
    sil = silences(mp3)
    # boundaries: deck["bounds"] when given (seconds, one per paragraph start after the first), otherwise the pause
    # nearest to where the remaining text says the paragraph ends, longer pauses preferred
    L = [len(p) for p in paras]; bounds = [0.0]
    print(json.dumps({'pauses': [[round(t, 2), round(d, 2)] for t, d in sil if d >= 0.3]}))
    if deck.get('bounds'):
        fine = silences(mp3, 0.15)   # snap each given time to the longest short pause within 1.2 s
        for x in [float(x) for x in deck['bounds']][:len(paras) - 1]:
            near = [s for s in fine if abs(s[0] - x) <= 1.2]
            bounds.append(max(near, key=lambda s: s[1])[0] if near else x)
        print(json.dumps({'bounds': [round(x, 2) for x in bounds]}))
    else:
        for i in range(len(paras) - 1):
            exp = bounds[-1] + (total - bounds[-1]) * L[i] / sum(L[i:])
            near = [s for s in sil if abs(s[0] - exp) < 5 and s[0] > bounds[-1] + 2]
            pick = max(near, key=lambda s: s[1] - abs(s[0] - exp) / 8)[0] if near else exp
            bounds.append(pick)
    bounds.append(total)
    # reveal times inside each slide
    shots = []  # (slide, step, start)
    for i, (d, p) in enumerate(zip(deck['slides'], paras)):
        a, b = bounds[i], bounds[i + 1]
        shots.append((i, 0, a))
        for k, cue in enumerate(d['cues'], 1):
            pos = p.find(cue)
            if pos < 0: raise SystemExit(f'cue {k} not found in paragraph {i + 1}')
            t = a + LEAD + (b - a - LEAD) * pos / len(p)
            ends = [m + d / 2 for m, d in sil if a < m and m + d / 2 < b and -1.5 <= m + d / 2 - t <= 0.8]
            if ends: t = min(ends, key=lambda e: abs(e - t)) - 0.1   # the item appears as the sentence starts
            shots.append((i, k, max(t, shots[-1][2] + 0.6)))
    from playwright.sync_api import sync_playwright
    with sync_playwright() as pw:
        chrome = os.environ.get('CHROME') or ('/usr/bin/google-chrome' if os.path.exists('/usr/bin/google-chrome') else None)
        br = pw.chromium.launch(executable_path=chrome, args=['--no-sandbox'])
        pg = br.new_page(viewport={'width': 1280, 'height': 720}, device_scale_factor=1.5)
        pg.goto((HERE / 'slides.html').as_uri()); pg.wait_for_timeout(300)
        for j, (i, k, _) in enumerate(shots):
            pg.evaluate('([d,i,k]) => show(d,i,k)', [deck, i, k]); pg.wait_for_timeout(120)
            pg.screenshot(path=str(tmp / f'{j:03d}.png'))
        br.close()
    # clips: each still from its start to the next start (+XF overlap for the cross-fade)
    starts = [s[2] for s in shots] + [total]
    durs = [starts[j + 1] - starts[j] for j in range(len(shots))]
    inputs, filt = [], []
    for j, dur in enumerate(durs):
        inputs += ['-loop', '1', '-t', f'{dur + (XF if j < len(durs) - 1 else 0):.3f}', '-framerate', str(FPS), '-i', tmp / f'{j:03d}.png']
    prev, off = '[0:v]', 0.0
    for j in range(1, len(durs)):
        off += durs[j - 1]
        lab = f'[v{j}]'
        filt.append(f'{prev}[{j}:v]xfade=transition=fade:duration={XF}:offset={off:.3f}{lab}')
        prev = lab
    filt.append(f'{prev}format=yuv420p[vout]')
    (tmp / 'f.txt').write_text(';'.join(filt))
    sh(['ffmpeg', '-y', '-hide_banner', *inputs, '-i', mp3, '-filter_complex_script', tmp / 'f.txt', '-map', '[vout]', '-map', f'{len(durs)}:a',
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', str(FPS), '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out])
    json.dump({'total': total, 'bounds': bounds, 'shots': [[i, k, round(t, 2)] for i, k, t in shots]}, open(str(out) + '.times.json', 'w'))
    # check stills for review
    for i in range(len(deck['slides'])):
        last = max(j for j, s in enumerate(shots) if s[0] == i)
        sh(['cp', tmp / f'{last:03d}.png', str(out).replace('.mp4', f'-s{i + 1:02d}.png')])
    print(json.dumps({'ok': True, 'sec': round(total, 1), 'slides': len(deck['slides']), 'shots': len(shots)}))


if __name__ == '__main__':
    main(*sys.argv[1:5])
