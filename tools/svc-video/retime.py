# The apartment check video (precheck) has no scene page left (it was made on 10.10.2026 in a folder that is gone), so its
# new narration is laid over the LIVE video itself: every scene keeps its pictures and its caption, and only the quiet end
# of the scene (after its animations) is held longer or made shorter so the scene fits the new narration, by the same
# timing rule as the other videos (narration + 0.3s lead + 0.45s, the last scene + 1.4s).
#   python3 retime.py <live.mp4> <old1.mp3,...> <new1.mp3,...> <out/name> <fps> <posterScene> <posterSec>
import os, subprocess, sys, json, shutil

live, old, new, out, fps, pscene, psec = sys.argv[1], sys.argv[2].split(','), sys.argv[3].split(','), sys.argv[4], int(sys.argv[5]), int(sys.argv[6]), float(sys.argv[7])
LEAD, CALM = 0.3, 0.5          # hold point: CALM seconds before the scene's end (after the animations, before the fade)
ANIM_END = 6.1                 # the live scenes have no motion after ~6s (checked frame by frame on 25.11.2026)
dur = lambda f: float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]))
assert len(old) == len(new)
N = len(old)
D0 = [round(dur(f) + LEAD + (1.4 if i == N - 1 else 0.45), 3) for i, f in enumerate(old)]
D1 = [round(dur(f) + LEAD + (1.4 if i == N - 1 else 0.45), 3) for i, f in enumerate(new)]
total0 = dur(live)
assert abs(sum(D0) - total0) < 0.5, ('old timing does not match the live video', sum(D0), total0)
S0 = [sum(D0[:i]) for i in range(N)]
S1 = [sum(D1[:i]) for i in range(N)]
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
fr = out + '-frames'; shutil.rmtree(fr, ignore_errors=True); os.makedirs(fr)
subprocess.run(['ffmpeg', '-v', 'error', '-i', live, '-vf', 'fps=%d' % fps, '-q:v', '2', fr + '/o%05d.jpg'], check=True)
nold = len([x for x in os.listdir(fr) if x.startswith('o')])
warn = []
seq = []
for i in range(N):
    h = D0[i] - CALM; delta = D1[i] - D0[i]
    if delta < 0 and h + delta < ANIM_END:
        warn.append('scene %d: %.2fs shorter, the cut reaches its animations' % (i + 1, -delta))
    nf = round((S1[i] + D1[i]) * fps) - round(S1[i] * fps)
    for k in range(nf):
        lt = k / fps
        if delta >= 0: lo = lt if lt < h else (h if lt < h + delta else lt - delta)
        else: lo = lt if lt < h + delta else lt - delta
        seq.append(min(nold, max(1, round((S0[i] + lo) * fps) + 1)))
for k, n in enumerate(seq):
    os.link('%s/o%05d.jpg' % (fr, n), '%s/n%05d.jpg' % (fr, k))
starts = S1
ins = sum([['-i', f] for f in new], [])
delays = ';'.join('[%d:a]adelay=%d|%d[a%d]' % (i + 1, round((s + LEAD) * 1000), round((s + LEAD) * 1000), i) for i, s in enumerate(starts))
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(fps), '-i', fr + '/n%05d.jpg', *ins, '-filter_complex',
                delays + ';' + ''.join('[a%d]' % i for i in range(N)) + 'amix=inputs=%d:normalize=0,apad[a]' % N, '-map', '0:v', '-map', '[a]', '-shortest',
                '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '128k', out + '.mp4'], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '%.2f' % (S1[pscene - 1] + psec), '-i', out + '.mp4', '-frames:v', '1', '-q:v', '3', out + '-poster.jpg'], check=True)
json.dump({'secs': round(sum(D1)), 'scenes': D1, 'oldScenes': D0, 'warn': warn}, open(out + '.json', 'w'))
shutil.rmtree(fr)
print(os.path.basename(out), 'total %.1f' % sum(D1), 'warn', warn)
