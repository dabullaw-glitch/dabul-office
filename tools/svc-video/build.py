# Driver for the workflow svc-video (25.11.2026): builds the service explainer videos again with Yakir's own voice.
# Input tools/svc-video/job.json {items:[{sid, out, audio, n, mode?, old?, live?, fps?, posterScene?, posterSec?}]}:
#   audio = path in the PUBLIC storage bucket pv without "-sN.mp3" (the new narration, one file per scene, made by fn voice)
#   mode 'render' (default): the scene pages from gen.py, drawn again (render.mjs) to the new narration's timing
#   mode 'retime' (precheck): the live video's own pictures, held / shortened to the new narration (retime.py)
# Output (main, GitHub Pages), NEW files only, the live media/video/<sid>-video.mp4 is never touched here:
#   media/hgv/<out>.mp4, <out>.jpg (poster), <out>.json, check stills media/hgv/check/<out>-<k>.jpg; on failure <out>.error.txt
import json, os, subprocess, sys, urllib.request, traceback

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PV = 'https://mgjmnvpnovkewvqevjmz.supabase.co/storage/v1/object/public/pv/'
FONTS = sys.argv[1]; WORK = '/tmp/svcw'
PHOTO = os.path.join(ROOT, 'media/preview/online5/yakir-about.webp')
HG = os.path.join(ROOT, 'media/hgv'); CHK = os.path.join(HG, 'check')
os.makedirs(CHK, exist_ok=True); os.makedirs(WORK + '/a', exist_ok=True)
job = json.load(open(os.path.join(HERE, 'job.json'), encoding='utf8'))


def get(path):
    f = os.path.join(WORK, 'a', path.replace('/', '_'))
    if not os.path.exists(f):
        urllib.request.urlretrieve(PV + path, f)
    return f


done = []
for it in job['items']:
    sid, out = it['sid'], it['out']
    base = os.path.join(HG, out)
    if os.path.exists(base + '.mp4'):
        print('exists', out); continue
    try:
        new = [get('%s-s%d.mp3' % (it['audio'], k)) for k in it.get('files', range(1, it['n'] + 1))]
        tmp = os.path.join(WORK, out)
        if it.get('mode') == 'retime':
            old = [get(p + '.mp3') for p in it['old']]
            subprocess.run(['python3', os.path.join(HERE, 'retime.py'), os.path.join(ROOT, it['live']), ','.join(old), ','.join(new), tmp,
                            str(it.get('fps', 30)), str(it.get('posterScene', 1)), str(it.get('posterSec', 4.6))], check=True)
        else:
            subprocess.run(['python3', os.path.join(HERE, 'gen.py'), WORK + '/g', FONTS, PHOTO, sid], check=True)
            hub = sid in ('hub', 'hub2')
            subprocess.run(['node', os.path.join(HERE, 'render.mjs'), '%s/g/scenes/%s.html' % (WORK, sid), ','.join(new), tmp,
                            '30' if hub else '25', '20' if hub else '21', '92' if hub else '90', '3.2' if hub else '4.6'], check=True)
        os.replace(tmp + '.mp4', base + '.mp4'); os.replace(tmp + '-poster.jpg', base + '.jpg'); os.replace(tmp + '.json', base + '.json')
        meta = json.load(open(base + '.json'))
        st = 0.0
        for k, d in enumerate(meta['scenes']):
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-ss', '%.2f' % (st + min(6, d - 0.6)), '-i', base + '.mp4', '-frames:v', '1', '-vf', 'scale=640:-1', '-q:v', '4',
                            os.path.join(CHK, '%s-%d.jpg' % (out, k + 1))], check=True)
            st += d
        if os.path.exists(base + '.error.txt'): os.remove(base + '.error.txt')
        done.append(out); print('done', out, meta['secs'])
    except Exception:
        open(os.path.join(CHK, out + '.error.txt'), 'w').write(traceback.format_exc()[-3000:])
        print('FAILED', out); traceback.print_exc()
print('built:', ' '.join(done) or 'none')
