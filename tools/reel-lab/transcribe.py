# Word-level Hebrew transcript for the reel editor v2: python3 transcribe.py <out_dir> <audio.wav>
import sys, json
from faster_whisper import WhisperModel
out, wav = sys.argv[1], sys.argv[2]
m = WhisperModel("ivrit-ai/whisper-large-v3-turbo-ct2", device="cpu", compute_type="int8")
segs, info = m.transcribe(wav, language="he", word_timestamps=True, vad_filter=False, beam_size=5)
res = {"language": info.language, "duration": info.duration, "segments": []}
for s in segs:
    res["segments"].append({"start": round(s.start, 3), "end": round(s.end, 3), "text": s.text.strip(),
        "words": [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)} for w in (s.words or [])]})
json.dump(res, open(out + "/words.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(res["segments"]), "segments")
