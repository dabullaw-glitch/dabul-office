# Disfluency-friendly transcript: split the take at short pauses and transcribe every piece on its own,
# so repeated takes and stumbles are not merged away. python3 chunks.py <out_dir> <audio16k.wav>
import sys, json
import numpy as np
from scipy.io import wavfile
from faster_whisper import WhisperModel
out, wav = sys.argv[1], sys.argv[2]
m = None
for name in ("ivrit-ai/whisper-large-v3-turbo-ct2", "large-v3-turbo"):
    try:
        m = WhisperModel(name, device="cpu", compute_type="int8"); print("model", name); break
    except Exception as e:
        print("model failed", name, e)
sr, a = wavfile.read(wav)
x = (a.astype(np.float32) / 32768.0) if a.dtype == np.int16 else a.astype(np.float32)
hop = int(sr * 0.02); rms = np.array([np.sqrt(np.mean(x[i:i + hop] ** 2) + 1e-12) for i in range(0, len(x), hop)])
db = 20 * np.log10(rms); quiet = db < -38
# cut points: middle of quiet runs >= 0.18 s
cuts = [0]; i = 0
while i < len(quiet):
    if quiet[i]:
        j = i
        while j < len(quiet) and quiet[j]: j += 1
        if (j - i) * 0.02 >= 0.18: cuts.append(((i + j) // 2) * 0.02)
        i = j
    else: i += 1
cuts.append(len(x) / sr)
pieces = []
for s, e in zip(cuts, cuts[1:]):
    if e - s < 0.25: continue
    seg = x[int(s * sr):int(e * sr)]
    if np.max(np.abs(seg)) < 0.02: continue
    r, _ = m.transcribe(seg, language="he", word_timestamps=False, vad_filter=False, beam_size=5, condition_on_previous_text=False)
    t = " ".join(z.text.strip() for z in r).strip()
    pieces.append({"s": round(s, 2), "e": round(e, 2), "t": t}); print(f"{s:6.2f}-{e:6.2f} {t}")
json.dump(pieces, open(out + "/chunks.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
