#!/usr/bin/env python3
"""Makes a private preview copy of the built site (dist/ -> preview/site/) where every link is relative
and points at an explicit index.html, so the whole site can be browsed as a private artifact."""
import os, re, shutil, sys

SRC = 'dist'
DST = 'preview/site'
shutil.rmtree('preview', ignore_errors=True)
shutil.copytree(SRC, DST)

ATTR = re.compile(r'''((?:href|src|action)=)(["'])(/(?!/)[^"'#?]*)([^"']*)\2''')
FETCH = re.compile(r'''fetch\((['"])(/[^'"]*)\1\)''')

def rel(target, depth):
    pre = '../' * depth if depth else './'
    t = target.lstrip('/')
    if t == '' or t.endswith('/'):
        t += 'index.html'
    return pre + t

n = 0
for dp, _, fs in os.walk(DST):
    for f in fs:
        if not f.endswith('.html'):
            continue
        p = os.path.join(dp, f)
        depth = os.path.relpath(dp, DST).count(os.sep) + (0 if os.path.relpath(dp, DST) == '.' else 1)
        s = open(p, encoding='utf-8').read()
        s = ATTR.sub(lambda m: f'{m.group(1)}{m.group(2)}{rel(m.group(3), depth)}{m.group(4)}{m.group(2)}', s)
        s = FETCH.sub(lambda m: f"fetch({m.group(1)}{rel(m.group(2), depth)}{m.group(1)})", s)
        open(p, 'w', encoding='utf-8').write(s)
        n += 1
files = sum(len(fs) for _, _, fs in os.walk(DST))
print(f'rewrote {n} pages, {files} files')
