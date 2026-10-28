#!/usr/bin/env python3
"""SEO checks over dist/: one H1, title and description length, canonical, valid JSON-LD, no broken internal links, no dashes."""
import os, re, json, html, sys
root='dist'; pages={}; bad=[]
for dp,_,fs in os.walk(root):
    for f in fs:
        if f.endswith('.html'): pages['/'+os.path.relpath(os.path.join(dp,f),root).replace('index.html','')]=open(os.path.join(dp,f),encoding='utf-8').read()
files=set('/'+os.path.relpath(os.path.join(dp,f),root) for dp,_,fs in os.walk(root) for f in fs)
def exists(u):
    u=u.split('#')[0].split('?')[0]
    if u in pages or u in files: return True
    return (u.rstrip('/')+'/') in pages
for u,s in pages.items():
    if u.startswith('/404'): continue
    h1=len(re.findall(r'<h1[\s>]',s)); t=re.search(r'<title>(.*?)</title>',s,re.S); d=re.search(r'<meta name="description" content="([^"]*)"',s)
    tl=len(html.unescape(t.group(1))) if t else 0; dl=len(html.unescape(d.group(1))) if d else 0
    if h1!=1: bad.append((u,'h1',h1))
    if not (20<=tl<=95): bad.append((u,'title',tl))
    if not (50<=dl<=170): bad.append((u,'desc',dl))
    if '<link rel="canonical"' not in s: bad.append((u,'canonical'))
    for j in re.findall(r'<script type="application/ld\+json">(.*?)</script>',s,re.S):
        try: json.loads(j)
        except Exception as e: bad.append((u,'jsonld',str(e)[:60]))
    for l in re.findall(r'href="(/[^"]*)"',s):
        if l.startswith('//'): continue
        if not exists(l): bad.append((u,'broken',l))
    txt=re.sub(r'<[^>]+>',' ',re.sub(r'<(script|style)[^>]*>.*?</\1>','',s,flags=re.S))
    if re.search('[–—]',txt): bad.append((u,'dash'))
print(len(pages),'pages')
from collections import Counter
print(Counter(b[1] for b in bad))
for b in bad[:40]: print(b)
