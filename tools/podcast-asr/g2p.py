# Hebrew text -> vowels (niqqud) and IPA per word, with phonikud (open Hebrew G2P model), to build exact
# pronunciations for the HeyGen voice. Input: g2p.txt (plain Hebrew, sections in [brackets] allowed).
# Output: out/g2p.json [{line, vocalized, words:[[word, vocalized_word, ipa]]}]
import json, re, os
from phonikud_onnx import Phonikud
from phonikud import phonemize
os.makedirs('out', exist_ok=True)
m = Phonikud('phonikud.onnx')
res = []
for line in open('g2p.txt', encoding='utf8').read().split('\n'):
    line = line.strip()
    if not line or re.match(r'^\[.*\]$', line):
        res.append({'line': line}); continue
    v = m.add_diacritics(line)
    ws, vs = line.split(), v.split()
    words = []
    for i, w in enumerate(ws):
        vw = vs[i] if i < len(vs) else ''
        try: ipa = phonemize(vw)
        except Exception as e: ipa = 'ERR ' + str(e)[:40]
        words.append([w, vw, ipa])
    res.append({'line': line, 'vocalized': v, 'whole': phonemize(v), 'words': words})
json.dump(res, open('out/g2p.json', 'w'), ensure_ascii=False, indent=0)
print('lines', len(res))
