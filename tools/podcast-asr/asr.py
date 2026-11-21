# Transcribes podcast voice parts with a Hebrew speech recognizer, word by word, with how sure it is of each word.
# Used to find words the HeyGen voice pronounced wrong: compare the transcript with the script (tools/podcast-asr/compare.py).
# Input: job.json {name, parts:[{h, url}]}. Output: out/<name>.json {parts:[{h, words:[[word, start, end, prob]]}]}.
import json, os, sys, urllib.request, time
from faster_whisper import WhisperModel
job = json.load(open(sys.argv[1]))
os.makedirs('out', exist_ok=True)
res = {'name': job['name'], 'model': None, 'parts': []}
model = None
for name in job.get('models', ['ivrit-ai/whisper-large-v3-turbo-ct2', 'large-v3-turbo']):
    try:
        model = WhisperModel(name, device='cpu', compute_type='int8'); res['model'] = name; break
    except Exception as e:
        print('model failed', name, e)
t0 = time.time()
for i, p in enumerate(job['parts']):
    f = f'/tmp/p{i}.wav'
    urllib.request.urlretrieve(p['url'], f)
    segs, info = model.transcribe(f, language='he', word_timestamps=True, beam_size=5, condition_on_previous_text=False, vad_filter=False)
    words = []
    for s in segs:
        for w in (s.words or []):
            words.append([w.word.strip(), round(w.start, 2), round(w.end, 2), round(w.probability, 3)])
    res['parts'].append({'h': p.get('h'), 'url': p['url'], 'words': words})
    print(i, p.get('h'), len(words), round(time.time() - t0))
json.dump(res, open(f"out/{job['name']}.json", 'w'), ensure_ascii=False)
