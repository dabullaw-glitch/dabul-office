"""HeyGen avatar videos -> the reel editor (tools/reel-lab, branch wip/video-friday until merged).

Two jobs, both with the Python standard library only:

  python3 prep.py align <script.txt> <whisper words.json | -> <duration seconds> <silences.txt | -> <out words.json>
      The captions must show the exact Hebrew script Yakir approved, not what Whisper heard (HeyGen gets a version
      with the pronunciation list applied, e.g. "Dabul" in Latin letters). So every script word gets a time:
      words Whisper matched take its timing; the words between two matches share the time between them by length.
      Without a transcript the whole script is spread over the speech found by ffmpeg silencedetect.
      Output has the reel-lab words.json shape: {"segments":[{"words":[{"w","s","e"}]}]}.

  python3 prep.py resolve <plan.json> <words.json> <out plan.json>
      The plan is written before the video exists, so its beats point at PHRASES of the script, not seconds:
        "say": phrase where the beat starts      -> "at"
        "until": phrase where it ends            -> "to" (end of that phrase)
        items[].say                              -> items[].at
        splitSay / stampSay / summarySay / subSay -> split / stampAt / summaryAt / subAt
      "keep" defaults to the whole speech. Anything already in seconds is left as it is.
"""
import sys, json, re, difflib

NIQQUD = re.compile(r'[֑-ׇ]')
PUNCT = re.compile(r'[^\w֐-׿%]+')


def norm(w):
    w = NIQQUD.sub('', str(w)).replace('״', '"').replace('׳', "'")
    w = PUNCT.sub('', w)
    return w.lower()


def script_tokens(text):
    out = []
    for line in str(text).replace('\r', '').split('\n'):
        for t in line.split():
            if norm(t): out.append(t)
            elif out: out[-1] += t   # a lone punctuation mark sticks to the word before it
        if out and out[-1][-1:] not in '.,?!:': out[-1] += ','   # a line break is a pause: let captions break there
    return out


def weight(t):
    return len(norm(t)) + (5 if t[-1:] in '.?!:' else 2 if t[-1:] == ',' else 0) + 1


def spread(tokens, a, b):
    tot = sum(weight(t) for t in tokens) or 1
    out, cur = [], a
    for t in tokens:
        d = (b - a) * weight(t) / tot
        out.append({'w': t, 's': round(cur, 3), 'e': round(cur + d * 0.92, 3)}); cur += d
    return out


def speech_span(silences_file, duration):
    """first and last moment of speech from ffmpeg silencedetect output (silence_start / silence_end lines)."""
    a, b = 0.0, duration
    if silences_file and silences_file != '-':
        txt = open(silences_file, encoding='utf-8', errors='ignore').read()
        st = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', txt)]
        en = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', txt)]
        if st and en and st[0] < 0.05 and en: a = en[0]
        if st and st[-1] > a + 1 and (len(en) < len(st) or en[-1] >= duration - 0.1): b = st[-1]
    return max(0.0, a), max(a + 1.0, b)


def align(script_file, words_file, duration, silences_file, out_file):
    toks = script_tokens(open(script_file, encoding='utf-8').read())
    tw = []
    if words_file != '-':
        doc = json.load(open(words_file, encoding='utf-8'))
        tw = [w for s in doc.get('segments', []) for w in s.get('words', []) if norm(w.get('w', ''))]
    if len(tw) < max(3, len(toks) * 0.3):
        a, b = speech_span(silences_file, duration)
        words = spread(toks, a, b); mode = 'spread'
    else:
        sm = difflib.SequenceMatcher(None, [norm(t) for t in toks], [norm(w['w']) for w in tw], autojunk=False)
        times = [None] * len(toks)
        for blk in sm.get_matching_blocks():
            for k in range(blk.size):
                w = tw[blk.b + k]; times[blk.a + k] = (w['s'], w['e'], blk.b + k)
        words = [None] * len(toks); i = 0
        while i < len(toks):
            if times[i]:
                words[i] = {'w': toks[i], 's': round(times[i][0], 3), 'e': round(times[i][1], 3)}; i += 1; continue
            j = i
            while j < len(toks) and not times[j]: j += 1
            pb = times[i - 1][2] if i > 0 else -1           # transcript index of the match before the gap
            nb = times[j][2] if j < len(toks) else len(tw)  # ... and after it
            gap = tw[pb + 1:nb]
            if gap: a, b = gap[0]['s'], gap[-1]['e']
            else:
                a = times[i - 1][1] if i > 0 else max(0.0, (times[j][0] if j < len(toks) else duration) - 0.35 * (j - i))
                b = times[j][0] if j < len(toks) else min(duration, a + 0.35 * (j - i))
            words[i:j] = spread(toks[i:j], a, max(a + 0.08 * (j - i), b)); i = j
        mode = 'aligned %d of %d' % (sum(1 for t in times if t), len(toks))
    json.dump({'source': 'script', 'mode': mode, 'duration': duration, 'segments': [{'start': words[0]['s'], 'end': words[-1]['e'], 'text': ' '.join(t for t in toks), 'words': words}]},
              open(out_file, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({'words': len(words), 'mode': mode, 'start': words[0]['s'], 'end': words[-1]['e']}, ensure_ascii=False))


def find(words, phrase, start=0):
    """index range of the phrase in the words (exact on normalized words, else the closest window)."""
    p = [norm(x) for x in str(phrase).split() if norm(x)]
    if not p: return None
    W = [norm(w['w']) for w in words]
    for rng in (range(start, len(W)), range(0, len(W))):
        for i in rng:
            if W[i:i + len(p)] == p: return (i, i + len(p) - 1)
    best, bi = 0.0, None; target = ' '.join(p)
    for i in range(len(W)):
        r = difflib.SequenceMatcher(None, ' '.join(W[i:i + len(p)]), target).ratio() - (0.02 if i < start else 0)
        if r > best: best, bi = r, i
    if bi is None or best < 0.6: return None
    return (bi, min(len(W) - 1, bi + len(p) - 1))


def resolve(plan_file, words_file, out_file):
    plan = json.load(open(plan_file, encoding='utf-8'))
    words = [w for s in json.load(open(words_file, encoding='utf-8'))['segments'] for w in s['words']]
    misses, pos = [], 0
    def at(phrase, end=False, after=0):
        r = find(words, phrase, after)
        if not r: misses.append(phrase); return None, after
        return (words[r[1]]['e'] if end else words[r[0]]['s']), r[0]
    for b in plan.get('beats', []):
        if 'say' in b:
            t, pos = at(b.pop('say'), after=pos)
            if t is not None: b['at'] = round(max(0.0, t - 0.08), 3)
        if 'until' in b:
            t, _ = at(b.pop('until'), end=True, after=pos)
            if t is not None: b['to'] = round(t + 0.25, 3)
        for k, dst in (('splitSay', 'split'), ('stampSay', 'stampAt'), ('summarySay', 'summaryAt'), ('subSay', 'subAt')):
            if k in b:
                t, _ = at(b.pop(k), after=pos)
                if t is not None: b[dst] = round(t, 3)
        for it in b.get('items', []):
            if 'say' in it:
                t, _ = at(it.pop('say'), after=pos)
                if t is not None: it['at'] = round(max(0.0, t - 0.05), 3)
        if 'at' in b and 'to' not in b and 'dur' not in b: b['dur'] = 2.6
        if 'at' not in b and 't' not in b: b['_skip'] = True
    plan['beats'] = [b for b in plan.get('beats', []) if not b.get('_skip')]
    for b in plan['beats']:   # items and inner times must exist for the kinds that need them
        for it in b.get('items', []): it.setdefault('at', b.get('at', 0))
        if b.get('kind') == 'stack' and b.get('summary'): b.setdefault('summaryAt', b.get('to', b.get('at', 0)))
    if not plan.get('keep'):
        plan['keep'] = [[round(max(0.0, words[0]['s'] - 0.3), 3), round(words[-1]['e'] + 0.45, 3)]]
    plan.setdefault('gap', 0.55)   # an avatar has no ums: cut only real pauses, keep his calm pace
    plan.setdefault('pad', 0.12)
    json.dump(plan, open(out_file, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(json.dumps({'beats': len(plan['beats']), 'missed': misses, 'keep': plan['keep']}, ensure_ascii=False))
    if misses: print('WARNING phrases not found: ' + ' | '.join(misses), file=sys.stderr)


if __name__ == '__main__':
    cmd = sys.argv[1]
    if cmd == 'align': align(sys.argv[2], sys.argv[3], float(sys.argv[4]), sys.argv[5], sys.argv[6])
    elif cmd == 'resolve': resolve(sys.argv[2], sys.argv[3], sys.argv[4])
    else: sys.exit(__doc__)
