"""Face track for a talking-head take, so overlays never cover the face.
python3 facetrack.py <video.mp4> <out faces.json> [step_seconds]
Writes {"w":W,"h":H,"step":s,"t":[...],"box":[[x,y,w,h] or null,...]} in video pixels.
The Haar box already reaches the hairline; build.py uses headTop = y - 0.08*h and chin = y + h.
12.10.2026 (Yakir: straighten the angle and fix the position when needed, not only edit as is): it also measures
"fix": {roll: how many degrees the room's straight lines (door frames, walls, shelves) lean clockwise, n: how many
lines were measured, cx/top/fh: the face centre x, head top and face height (median, video pixels), luma: face
brightness 0-255}. build.py uses it to level the picture, centre him and correct a dark face.
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
leans, lw, lumas = [], [], []  # straight-line lean (degrees, + = clockwise) and its weight; face brightness
while True:
    buf = proc.stdout.read(SW * SH)
    if len(buf) < SW * SH: break
    g0 = np.frombuffer(buf, np.uint8).reshape(SH, SW)
    g = cv2.equalizeHist(g0)
    # once a second: the straight lines of the room, to see whether the camera was held crooked
    if k % max(1, int(round(1 / STEP))) == 0:
        ed = cv2.Canny(cv2.GaussianBlur(g0, (3, 3), 0), 60, 160)
        segs = cv2.HoughLinesP(ed, 1, np.pi / 720, 40, minLineLength=int(SH * 0.12), maxLineGap=6)
        for x1, y1, x2, y2 in (segs[:, 0] if segs is not None else []):
            dx, dy = float(x2 - x1), float(y2 - y1); L = (dx * dx + dy * dy) ** .5
            if abs(dx) < abs(dy):          # near vertical: orient downwards; top leaning right = clockwise
                if dy < 0: dx, dy = -dx, -dy
                a = np.degrees(np.arctan2(-dx, dy))
            else:                          # near horizontal: orient rightwards; right end lower = clockwise
                if dx < 0: dx, dy = -dx, -dy
                a = np.degrees(np.arctan2(dy, dx))
            if abs(a) <= 6: leans.append(a); lw.append(L)
    found = front.detectMultiScale(g, 1.1, 5, minSize=(int(SW * 0.12), int(SW * 0.12)))
    if len(found) == 0: found = alt.detectMultiScale(g, 1.1, 4, minSize=(int(SW * 0.1), int(SW * 0.1)))
    if len(found):
        x, y, w, h = max(found, key=lambda b: b[2] * b[3])
        boxes.append([round(x / scale), round(y / scale), round(w / scale), round(h / scale)])
        lumas.append(float(g0[y + h // 4:y + 3 * h // 4, x + w // 4:x + 3 * w // 4].mean()))
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
def wmedian(v, w):
    if not v: return 0.0
    o = np.argsort(v); v = np.array(v)[o]; w = np.array(w)[o]; c = np.cumsum(w)
    return float(v[np.searchsorted(c, c[-1] / 2)])
# the lines that agree with each other (within 1.5 degrees of the weighted median) decide the lean
roll = wmedian(leans, lw); keep = [i for i, a in enumerate(leans) if abs(a - roll) <= 1.5]
roll = wmedian([leans[i] for i in keep], [lw[i] for i in keep]) if keep else 0.0
fix = {'roll': round(roll, 2), 'n': len(keep), 'cx': int(np.median(sm[:, 0] + sm[:, 2] / 2)), 'top': int(np.median(sm[:, 1] - 0.08 * sm[:, 3])),
       'fh': int(np.median(sm[:, 3])), 'luma': int(np.median(lumas)) if lumas else 128}
json.dump({'w': W, 'h': H, 'step': STEP, 't': ts, 'box': [[int(v) for v in r] for r in sm], 'fix': fix}, open(out, 'w'))
fx = sm[:, 0] + sm[:, 2] / 2; top = sm[:, 1] - 0.08 * sm[:, 3]; bot = sm[:, 1] + sm[:, 3]
print(json.dumps({'fix': fix, 'samples': len(ts), 'detected': len(idx), 'W': W, 'H': H,
                  'face_cx': [int(fx.min()), int(fx.max())], 'head_top': [int(top.min()), int(top.max())], 'chin': [int(bot.min()), int(bot.max())]}))
