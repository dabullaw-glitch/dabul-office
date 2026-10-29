# citydata-merge (29.10.2026): adds the researched official lists (scratch files from the research runs: services.json,
# health.json, community.json, each item with its official source and a verified flag) to the guide files in
# src/data/city/. Only verified items go in. Research remarks (conflicts, translation notes, "not confirmed") never reach the page.
import json, sys, os, re
SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'city')
META = re.compile(r'סתירה|אומת|מתורגמ|מקור|באתר|האתר|בדף|דף |עמוד|מופיע|₪|לא נטען|כפי ש|לפי אתר|מסמך|לא צוינ|לא מפורט|http|מעמד משפטי|לוגו')
def clean_notes(n):
    parts = [p.strip() for p in re.split(r'(?<=[.!])\s+', n or '') if p.strip()]
    return ' '.join(p for p in parts if not META.search(p))
def norm(x):
    e = {k: (x.get(k) or '').strip() for k in ('name', 'kind', 'area', 'address', 'phone', 'hours', 'website', 'source')}
    e['notes'] = clean_notes(x.get('notes'))
    e['name'] = re.sub(r'\s*[–—]\s*', ', ', e['name'])
    for k in e: e[k] = re.sub(r'\s*[–—]\s*', ' - ', e[k]) if k != 'name' else e[k]
    return {k: v for k, v in e.items() if v}
def put(slug, items, note=None):
    d = {'checked': '2026-10-29', 'items': items}
    if note: d['note'] = note
    json.dump(d, open(os.path.join(OUT, f'{slug}.json'), 'w'), ensure_ascii=False, indent=1)
    print(slug, len(items))
L = lambda f: json.load(open(os.path.join(SRC, f)))['categories']
s, h, c = L('services.json'), L('health.json'), L('community.json')
v = lambda arr: [norm(x) for x in arr if x.get('verified')]
put('service-centers', v(s['payments']))
put('post', v(s['post']), 'הטלפון של דואר ישראל לכל הסניפים הוא 171. נקודות המסירה בחנויות פועלות לפי שעות החנות.')
put('gov', v(s['gov']), 'בחגים ובפגרות שעות הקבלה משתנות. כדאי לבדוק לפני ההגעה ולקבוע תור כשאפשר.')
put('kupot', v(c_ := h['kupot']), 'במצב מסכן חיים: מד״א 101 או חדר מיון.')
put('hospitals', v(h['hospitals']))
put('matnasim', v(c['matnas']))
put('ngo', v(c['ngo']))
