"""Podcast mix (TASK.md 6b, pipeline.3_mix and 5_youtube_video). Runs in the podcast-mix GitHub Action (the runner can
download the HeyGen audio links; the task's sandbox cannot).
Usage: python3 tools/podcast/mix.py media/podcast/src/<epNN>.json
Job: {"ep": "ep01", "n": 1, "title": "...", "album": "<show name>", "artist": "עו״ד יקיר דבול", "gap": 0.7,
      "parts": [{"h": "<section>", "url": "<wav/mp3 url>"}, ...]}
Output (media/podcast/): <ep>.mp3 (44.1 kHz mono 128 kbps CBR, ID3 tags + the episode cover), <ep>.mp4 (1920x1080: the
episode background <ep>-ytbg.png + a gold sound wave; regular YouTube video), <ep>.json {duration, bytes, lufs, truePeak,
chapters [{h, t}]}. On failure: <ep>.error.txt.
Music: a calm pad made here from sine tones (our own sound, no license needed), about 6 s alone at the start, then under
the voice at about -18 dB and fading out; a short bed again at the end. Yakir hears it in the first edit and can change it.
"""
import json, math, subprocess, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'media/podcast'
SR = 44100
INTRO = 5.0       # music alone before the first word
OUTRO = 7.0       # music after the last word


def sh(*a):
    subprocess.run(list(a), check=True)


def dur(p):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)]).decode())


def main(job_path):
    job = json.loads(Path(job_path).read_text())
    ep, gap = job['ep'], float(job.get('gap', 0.7))
    w = Path('/tmp/pod') / ep; w.mkdir(parents=True, exist_ok=True)
    # 1. voice: parts (high-pass 80 Hz, gentle compression) joined with gaps, framed by the intro / outro silence
    files, chapters, t = [], [], INTRO
    sh('ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', str(gap), '-c:a', 'pcm_s16le', str(w / 'gap.wav'))
    sh('ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', str(INTRO), '-c:a', 'pcm_s16le', str(w / 'intro.wav'))
    sh('ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', f'anullsrc=r={SR}:cl=mono', '-t', str(OUTRO), '-c:a', 'pcm_s16le', str(w / 'outro.wav'))
    files.append('intro.wav')
    for i, p in enumerate(job['parts']):
        raw = w / f'p{i:02d}.src'
        for k in range(3):
            try:
                urllib.request.urlretrieve(p['url'], raw); break
            except Exception:
                if k == 2: raise
        out = w / f'p{i:02d}.wav'
        sh('ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-ac', '1', '-ar', str(SR),
           '-af', 'highpass=f=80,acompressor=threshold=-20dB:ratio=2.5:attack=15:release=200:makeup=2', '-c:a', 'pcm_s16le', str(out))
        chapters.append({'h': p['h'], 't': round(t, 1)})
        t += dur(out)
        files.append(out.name)
        if i < len(job['parts']) - 1:
            files.append('gap.wav'); t += gap
    voice_end = t
    files.append('outro.wav')
    (w / 'list.txt').write_text(''.join(f"file '{f}'\n" for f in files))
    sh('ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(w / 'list.txt'), '-c:a', 'pcm_s16le', str(w / 'voice.wav'))
    total = dur(w / 'voice.wav')
    # 2. music bed: soft pad (A minor add9 voicing), slow tremolo, low-pass; level envelope by time
    tones = [110.0, 164.81, 220.0, 261.63, 329.63, 493.88]
    src = '+'.join(f'{0.16 / (1 + j * 0.35):.3f}*sin(2*PI*{f}*t)*(0.75+0.25*sin(2*PI*{0.07 + 0.03 * j:.2f}*t))' for j, f in enumerate(tones))
    lvl_lo = 10 ** (-18 / 20)
    a, b = INTRO - 0.6, INTRO + 0.4                 # duck under the first words
    fo = INTRO + 9                                  # intro bed gone after this
    o1, o2 = voice_end - 3, voice_end + 0.5         # outro: rises after the last word
    env = (f"if(lt(t,{a}),1,if(lt(t,{b}),1-(1-{lvl_lo})*(t-{a})/{b - a},if(lt(t,{fo}),{lvl_lo}*({fo}-t)/{fo - b},"
           f"if(lt(t,{o1}),0,if(lt(t,{o2}),{lvl_lo}*(t-{o1})/{o2 - o1},if(lt(t,{total - 3}),{lvl_lo}+(0.8-{lvl_lo})*min(1,(t-{o2})/1.5),0.8*({total}-t)/3))))))")
    sh('ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', f"aevalsrc='{src}':s={SR}:d={total}",
       '-af', f"lowpass=f=1800,afade=t=in:d=1.5,volume='{env}':eval=frame,volume=0.35", '-ac', '1', '-c:a', 'pcm_s16le', str(w / 'music.wav'))
    sh('ffmpeg', '-y', '-v', 'error', '-i', str(w / 'voice.wav'), '-i', str(w / 'music.wav'),
       '-filter_complex', 'amix=inputs=2:normalize=0:duration=first', '-c:a', 'pcm_s16le', str(w / 'mix.wav'))
    # 3. two-pass loudness: -16 LUFS, TP -1.5, LRA 11
    m = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(w / 'mix.wav'), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                       capture_output=True, text=True).stderr
    st = json.loads(m[m.rindex('{'):m.rindex('}') + 1])
    ln = (f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={st['input_i']}:measured_TP={st['input_tp']}:measured_LRA={st['input_lra']}"
          f":measured_thresh={st['input_thresh']}:offset={st['target_offset']}:linear=true")
    sh('ffmpeg', '-y', '-v', 'error', '-i', str(w / 'mix.wav'), '-af', ln, '-ar', str(SR), '-ac', '1', '-c:a', 'pcm_s16le', str(w / 'final.wav'))
    # 4. mp3 with tags and the episode cover
    OUT.mkdir(parents=True, exist_ok=True)
    sh('ffmpeg', '-y', '-v', 'error', '-i', str(OUT / f'{ep}.jpg'), '-vf', 'scale=1400:1400', '-q:v', '3', str(w / 'art.jpg'))
    mp3 = OUT / f'{ep}.mp3'
    sh('ffmpeg', '-y', '-v', 'error', '-i', str(w / 'final.wav'), '-i', str(w / 'art.jpg'), '-map', '0:a', '-map', '1:v',
       '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', str(SR), '-ac', '1', '-c:v', 'mjpeg', '-disposition:v', 'attached_pic',
       '-id3v2_version', '3', '-metadata', f"title={job['title']}", '-metadata', f"artist={job.get('artist', 'עו״ד יקיר דבול')}",
       '-metadata', f"album={job['album']}", '-metadata', f"track={job.get('n', '')}", '-metadata', 'genre=Podcast',
       '-metadata:s:v', 'title=Album cover', '-metadata:s:v', 'comment=Cover (front)', str(mp3))
    # 5. YouTube video: background + gold wave in the lower band (right side, off the photo)
    mp4 = OUT / f'{ep}.mp4'
    sh('ffmpeg', '-y', '-v', 'error', '-loop', '1', '-framerate', '15', '-i', str(OUT / f'{ep}-ytbg.png'), '-i', str(mp3),
       '-filter_complex', '[1:a]showwaves=s=1000x170:mode=cline:rate=15:colors=0xE4D19C:scale=sqrt:draw=full[wv];'
                          '[0:v][wv]overlay=x=830:y=860:shortest=1:format=auto,format=yuv420p[v]',
       '-map', '[v]', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '30', '-tune', 'stillimage',
       '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', str(mp4))
    # 6. check
    chk = subprocess.run(['ffmpeg', '-v', 'info', '-i', str(mp3), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    c = json.loads(chk[chk.rindex('{'):chk.rindex('}') + 1])
    for k in (1, 2, 3):
        sh('ffmpeg', '-y', '-v', 'error', '-ss', str(round(dur(mp4) * k / 4)), '-i', str(mp4), '-frames:v', '1', '-q:v', '3', str(OUT / f'{ep}-check-{k}.jpg'))
    res = {'ep': ep, 'duration': round(dur(mp3), 1), 'bytes': mp3.stat().st_size, 'lufs': float(c['input_i']),
           'truePeak': float(c['input_tp']), 'lra': float(c['input_lra']), 'mp4Bytes': mp4.stat().st_size,
           'mp4Duration': round(dur(mp4), 1), 'chapters': chapters, 'music': 'synth pad (own, no license needed)'}
    (OUT / f'{ep}.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
    print(json.dumps(res, ensure_ascii=False))


if __name__ == '__main__':
    main(sys.argv[1])
