# Compares a podcast script with the speech recognition of its voice parts (asr.py) and lists words that were
# probably said wrong: words the recognizer heard differently, and words it was unsure of.
# Usage: python3 compare.py script.txt asr.json [min_prob]
import json, re, sys, difflib
def norm(w):
    w = re.sub(r'[֑-ׇ]', '', w)
    w = w.replace('״', '').replace('"', '').replace("'", '').replace('׳', '')
    return re.sub(r'[^\w]', '', w)
def sections(text):
    out, cur = [], None
    for line in text.split('\n'):
        m = re.match(r'^\[(.+)\]\s*$', line.strip())
        if m: cur = {'h': m.group(1), 'text': ''}; out.append(cur)
        elif cur is not None: cur['text'] += line + '\n'
    return out
script = open(sys.argv[1], encoding='utf8').read()
asr = json.load(open(sys.argv[2]))
minp = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
secs = sections(script) if '[' in script else [{'h': 'test', 'text': script}]
report = []
for sec, part in zip(secs, asr['parts']):
    sw = [w for w in sec['text'].split()]
    sn = [norm(w) for w in sw]
    aw = part['words']; an = [norm(w[0]) for w in aw]
    sm = difflib.SequenceMatcher(a=sn, b=an, autojunk=False)
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op == 'equal':
            for k in range(i2 - i1):
                p = aw[j1 + k][3]
                if p < minp: report.append((sec['h'], aw[j1 + k][1], 'unsure', sw[i1 + k], an[j1 + k], p))
        else:
            t = aw[j1][1] if j1 < len(aw) else (aw[-1][2] if aw else 0)
            report.append((sec['h'], t, op, ' '.join(sw[i1:i2]), ' '.join(an[j1:j2]), min([w[3] for w in aw[j1:j2]] or [1])))
for r in report:
    print(f'{r[0][:22]:22} {r[1]:7.2f}  {r[2]:8} script: {r[3]:30} heard: {r[4]:30} p={r[5]:.2f}')
print(len(report), 'flags')
