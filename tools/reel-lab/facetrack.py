"""Face track for a talking-head take, so overlays never cover the face.
python3 facetrack.py <video.mp4> <out faces.json> [step_seconds]
Writes {"w":W,"h":H,"step":s,"t":[...],"box":[[x,y,w,h] or null,...]} in video pixels.
The Haar box already reaches the hairline; build.py uses headTop = y - 0.08*h and chin = y + h.
"""
import sys, json, cv2, numpy as np

src, out = sys.argv[1], sys.argv[2]
STEP = float(sys.argv[3]) if len(sys.argv) > 3 else 0.2
import subprocess
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', src]))['streams'][0]
W, H = int(probe['width']), int(probe['height'])
SW = 432; SH = int(round(H * SW / W / 2) * 2); scale = SW / W
casc_dir = getattr(getattr(cv2, 'data', None), 'haarcascades', '')
front = cv2.CascadeClassifier(casc_dir + 'haarcascade_frontalface_default.xml')
alt = cv2.CascadeClassifier(casc_dir + 'haarcascade_frontalface_alt2.xml')
if front.empty(): sys.exit('no haar cascade found in ' + casc_dir)
# decode once, sequentially, small and at 1/STEP fps (fast; seeking per frame is very slow)
proc = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps={1 / STEP},scale={SW}:{SH}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], stdout=subprocess.PIPE)
ts, boxes = [], []; k = 0
while True:
    buf = proc.stdout.read(SW * SH)
    if len(buf) < SW * SH: break
    g = cv2.equalizeHist(np.frombuffer(buf, np.uint8).reshape(SH, SW))
    found = front.detectMultiScale(g, 1.1, 5, minSize=(int(SW * 0.12), int(SW * 0.12)))
    if len(found) == 0: found = alt.detectMultiScale(g, 1.1, 4, minSize=(int(SW * 0.1), int(SW * 0.1)))
    if len(found):
        x, y, w, h = max(found, key=lambda b: b[2] * b[3])
        boxes.append([round(x / scale), round(y / scale), round(w / scale), round(h / scale)])
    else:
        boxes.append(None)
    ts.append(round(k * STEP, 2)); k += 1

# fill gaps with the nearest detection, then smooth (median over 5 samples)
idx = [i for i, b in enumerate(boxes) if b]
if not idx: sys.exit('no face found')
for i, b in enumerate(boxes):
    if b is None:
        j = min(idx, key=lambda k: abs(k - i)); boxes[i] = list(boxes[j])
arr = np.array(boxes, dtype=float)
sm = arr.copy()
for i in range(len(arr)):
    a, b = max(0, i - 2), min(len(arr), i + 3)
    sm[i] = np.median(arr[a:b], axis=0)
json.dump({'w': W, 'h': H, 'step': STEP, 't': ts, 'box': [[int(v) for v in r] for r in sm]}, open(out, 'w'))
fx = sm[:, 0] + sm[:, 2] / 2; top = sm[:, 1] - 0.08 * sm[:, 3]; bot = sm[:, 1] + sm[:, 3]
print(json.dumps({'samples': len(ts), 'detected': len(idx), 'W': W, 'H': H,
                  'face_cx': [int(fx.min()), int(fx.max())], 'head_top': [int(top.min()), int(top.max())], 'chin': [int(bot.min()), int(bot.max())]}))
