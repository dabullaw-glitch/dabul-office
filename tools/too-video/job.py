#!/usr/bin/env python3
"""Helper for .github/workflows/too-video.yml. Prints nothing from the job (the lesson is paid material, the log is public).
  job.py <dir>          -> reads <dir>/job.json (from fn toovid ?gh=job), writes deck.json + narration.txt, downloads narration.mp3
  job.py <dir> upload   -> PUTs <dir>/lesson.mp4 to the signed upload link (private bucket), writes <dir>/done.json
"""
import json, os, pathlib, sys, urllib.request

d = pathlib.Path(sys.argv[1]); job = json.loads((d / 'job.json').read_text())
if len(sys.argv) < 3:
    (d / 'deck.json').write_text(json.dumps(job['deck'], ensure_ascii=False))
    (d / 'narration.txt').write_text(job['narration'])
    with urllib.request.urlopen(job['audio'], timeout=120) as r: (d / 'narration.mp3').write_bytes(r.read())
    print('job ready', os.path.getsize(d / 'narration.mp3'), 'bytes of audio')
else:
    body = (d / 'lesson.mp4').read_bytes()
    req = urllib.request.Request(job['upload'], data=body, method='PUT', headers={'content-type': 'video/mp4', 'x-upsert': 'true'})
    with urllib.request.urlopen(req, timeout=300) as r: st = r.status
    t = json.loads((d / 'lesson.mp4.times.json').read_text())
    (d / 'done.json').write_text(json.dumps({'id': os.environ.get('JOB', ''), 'sec': round(t['total'], 1), 'bytes': len(body), 'bounds': [round(x, 2) for x in t['bounds']]}))
    print('uploaded', st, len(body), 'bytes')
