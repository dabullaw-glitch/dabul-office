#!/usr/bin/env python3
"""Ad cuts of the service explainer videos for Meta, without the price scene (Yakir 11.10.2026: no prices in the ads).
1. cut: the scene that shows the price is removed (scene timings rebuilt exactly like the renderer: narration length + 0.3 lead + 0.45, last + 1.4)
2. frame: the 16:9 video sits inside a branded 4:5 (feed) and 9:16 (stories / reels) frame with the hook on top and the button below."""
import json, subprocess, pathlib, sys
H = pathlib.Path(__file__).parent
V = pathlib.Path('/home/claude/dabul-office/media/video')
PV = '/tmp/claude-0/-home-claude-dabul-office/18c4b77b-4875-5419-b847-7a72812c5e0f/scratchpad/video/v4'
SVCVO = '/tmp/claude-0/svcvid/vo'
VIDS = {
  'precheck': dict(src=V / 'precheck-video.mp4', vo=[f'{PV}/pv-s{i}.mp3' for i in range(1, 8)], drop=6, dom='re',
                   hook=['מצאתם דירה?', 'בודקים לפני שמציעים מחיר.'], cta='להזמנת בדיקה'),
  'poa': dict(dom='fam', hook=['ייפוי כוח מתמשך', 'ממלאים אונליין, נפגשים פעם אחת.'], cta='למילוי הטופס'),
  'inherit': dict(dom='fam', hook=['צו ירושה', 'בלי לרוץ בין משרדים.'], cta='להתחלת התהליך'),
  'company': dict(dom='biz', hook=['פותחים חברה?', 'מתחילים מהטלפון.'], cta='להקמת חברה'),
  'registrar': dict(dom='biz', hook=['שינוי בחברה?', 'מזמינים אונליין.'], cta='להזמנה אונליין'),
  'tabu': dict(dom='re', hook=['הערת אזהרה בטאבו', 'הכנה והגשה מקוונת.'], cta='לרישום בטאבו'),
  'zoom': dict(dom='consult', hook=['שאלה משפטית?', 'פגישה בזום עם עורך הדין.'], cta='לקביעת פגישה'),
}
for sid, v in VIDS.items():
    v.setdefault('src', V / f'{sid}-video.mp4'); v.setdefault('vo', [f'{SVCVO}/{sid}-s{i}.mp3' for i in range(1, 7)]); v.setdefault('drop', 5)

dur = lambda f: float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)]).decode())


def cut(sid, v):
    d = [dur(f) for f in v['vo']]; n = len(d)
    D = [x + 0.3 + (1.4 if i == n - 1 else 0.45) for i, x in enumerate(d)]
    st = [sum(D[:i]) for i in range(n)]
    real = dur(v['src'])
    assert abs(real - sum(D)) < 0.6, (sid, real, sum(D))
    a, b = st[v['drop'] - 1], st[v['drop']]
    out = H / f'{sid}-cut.mp4'
    fc = (f'[0:v]trim=0:{a:.3f},setpts=PTS-STARTPTS[v1];[0:v]trim={b:.3f},setpts=PTS-STARTPTS[v2];'
          f'[0:a]atrim=0:{a:.3f},asetpts=PTS-STARTPTS,afade=t=out:st={a - 0.25:.3f}:d=0.25[a1];[0:a]atrim={b:.3f},asetpts=PTS-STARTPTS[a2];'
          f'[v1][a1][v2][a2]concat=n=2:v=1:a=1[v][a]')
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(v['src']), '-filter_complex', fc, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-crf', '20', '-preset', 'medium', '-c:a', 'aac', '-b:a', '128k', str(out)], check=True)
    return out, a, b, real


if __name__ == '__main__':
    only = sys.argv[1:]
    meta = {}
    for sid, v in VIDS.items():
        if only and sid not in only: continue
        out, a, b, real = cut(sid, v)
        meta[sid] = dict(removed=[round(a, 2), round(b, 2)], before=round(real, 1), after=round(dur(out), 1))
        print(sid, meta[sid])
    json.dump({k: {**{kk: vv for kk, vv in v.items() if kk in ('dom', 'hook', 'cta')}, **meta.get(k, {})} for k, v in VIDS.items()}, open(H / 'videos.json', 'w', encoding='utf8'), ensure_ascii=False, indent=1)
