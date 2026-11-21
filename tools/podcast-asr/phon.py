# Second pass: what sounds were actually said in each word. Runs a language-neutral phoneme recognizer
# (wav2vec2 xlsr espeak) on every word span found by asr.py and adds the sounds (IPA letters) to each word.
# Usage: python3 phon.py out/<name>.json   (rewrites the file with words [word, start, end, prob, sounds])
import json, sys, subprocess, urllib.request
import numpy as np, torch
from transformers import AutoProcessor, AutoModelForCTC
M = 'facebook/wav2vec2-xlsr-53-espeak-cv-ft'
proc = AutoProcessor.from_pretrained(M); model = AutoModelForCTC.from_pretrained(M).eval()
d = json.load(open(sys.argv[1]))
def load(url):
    urllib.request.urlretrieve(url, '/tmp/x.wav')
    pcm = subprocess.run(['ffmpeg', '-v', 'error', '-i', '/tmp/x.wav', '-ar', '16000', '-ac', '1', '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(pcm, dtype=np.float32)
for part in d['parts']:
    a = load(part['url'])
    for w in part['words']:
        s, e = max(0, int((w[1] - 0.04) * 16000)), int((w[2] + 0.04) * 16000)
        seg = a[s:e]
        if len(seg) < 1600: seg = np.pad(seg, (0, 1600 - len(seg)))
        with torch.no_grad():
            x = proc(seg, sampling_rate=16000, return_tensors='pt').input_values
            ids = torch.argmax(model(x).logits, dim=-1)
        w.append(proc.batch_decode(ids)[0])
    print(part['h'], 'done', flush=True)
d['phon'] = M
json.dump(d, open(sys.argv[1], 'w'), ensure_ascii=False)
