#!/usr/bin/env python3
"""media-archive (9.11.2026, Yakir approved): keeps the GitHub Pages site small.

GitHub Pages publishes the whole main branch on every push, so old heavy files (finished videos, raw twin footage,
probe screenshots) made every deploy slow and pushed the site far past the 1 GB Pages limit.
This moves heavy files that are no longer used out of main, into the branch "media-archive" (same paths, nothing is lost:
https://github.com/dabullaw-glitch/dabul-office/tree/media-archive, raw files at
https://raw.githubusercontent.com/dabullaw-glitch/dabul-office/media-archive/<path>).

A file moves only when ALL hold:
  - it is a heavy file (video, audio, image) in one of DIRS;
  - no docs row links to it (refs file: one path per line, from the RPC media_refs()), and no text file in main links to it;
  - for a video, no linked file shares its name (a poster or check still of a linked video stays with it);
  - it was last changed more than --days days ago (a HeyGen original whose small copy in media/reels-pub is linked: any age).
Every moved path is added to media/archived.txt, so heygen-edit, reels-pub and twin-prep do not make it again.

Usage: archive.py --refs refs.txt [--days 14] [--apply]   (run from the repo root; --apply commits both branches, no push)
"""
import argparse, os, re, subprocess, sys, time, tempfile

DIRS = ['media/hgv', 'media/reels-pub', 'media/twin', 'media/reels', 'tools/visual', 'fetched/shots']
HEAVY = re.compile(r'\.(mp4|mov|webm|mp3|wav|m4a|jpg|jpeg|png|webp|gif)$', re.I)
BRANCH = 'media-archive'

def git(*a, env=None, inp=None):
    return subprocess.run(['git', *a], check=True, capture_output=True, text=True, env=env, input=inp).stdout

def stem(p):
    b = os.path.basename(p)
    if '/check/' in p: b = re.sub(r'-\d+\.jpg$', '', b)
    b = re.sub(r'\.[^.]+$', '', b)
    return re.sub(r'^hg-', '', b)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--refs', required=True); ap.add_argument('--days', type=int, default=14)
    ap.add_argument('--apply', action='store_true'); ap.add_argument('--log', help='saved git log --format=@%%ct --name-only output (for a shallow clone)'); o = ap.parse_args()
    refs = {l.strip() for l in open(o.refs) if l.strip()}
    refs |= {m.split(':', 1)[1] if ':' in m else m for m in git('grep', '-hoE', r'(media|tools/visual|fetched/shots)/[A-Za-z0-9_./-]+\.(mp4|mov|webm|jpg|jpeg|png|webp|mp3|wav|gif)', 'HEAD', '--',
             '.', ':!media/hgv/*.json', ':!media/reels-pub/*.json', ':!media/twin/*.json', ':!media/archived.txt').split()}
    if len(refs) < 20: sys.exit(f'only {len(refs)} references found; refusing to move anything')
    keep = {(os.path.dirname(r).replace('/check', ''), stem(r)) for r in refs}
    age, t = {}, None
    for l in (open(o.log).read() if o.log else git('log', '--format=@%ct', '--name-only', 'HEAD', '--', *DIRS)).splitlines():
        if l.startswith('@'): t = int(l[1:])
        elif l and l not in age: age[l] = t
    now = time.time(); move = []; size = 0
    for l in git('ls-tree', '-r', '-l', 'HEAD', '--', *DIRS).splitlines():
        meta, p = l.split('\t', 1); mode, _, blob, sz = meta.split()
        if not HEAVY.search(p) or p in refs: continue
        if (os.path.dirname(p).replace('/check', ''), stem(p)) in keep: continue
        # a HeyGen original whose small publishing copy is already in use was handed over: it may go at any age
        handed = p.startswith('media/hgv/') and ('media/reels-pub', stem(p)) in keep
        if not handed and (p not in age or (now - age[p]) / 86400 < o.days): continue
        move.append((mode, blob, p)); size += int(sz)
    print(f'{len(move)} files, {size >> 20} MB to move')
    for _, _, p in move[:400]: print('  ', p)
    if not move or not o.apply: return
    # 1) the archive branch gets the same blobs at the same paths (no file content is uploaded again)
    try: parent = git('rev-parse', '--verify', '-q', f'refs/remotes/origin/{BRANCH}').strip()
    except subprocess.CalledProcessError: parent = ''
    idx = tempfile.mktemp(); env = dict(os.environ, GIT_INDEX_FILE=idx)
    if parent: git('read-tree', parent, env=env)
    else: git('read-tree', '--empty', env=env)
    git('update-index', '--add', '--index-info', env=env, inp=''.join(f'{m} {b}\t{p}\n' for m, b, p in move))
    tree = git('write-tree', env=env).strip()
    msg = f'archive {len(move)} files ({size >> 20} MB) from main {time.strftime("%Y-%m-%d")}'
    commit = git('commit-tree', tree, *(['-p', parent] if parent else []), '-m', msg).strip()
    git('update-ref', f'refs/heads/{BRANCH}', commit)
    # 2) main: remove them, list them in media/archived.txt
    paths = [p for _, _, p in move]
    for i in range(0, len(paths), 200): git('rm', '-q', '--cached', '--ignore-unmatch', '--', *paths[i:i + 200])
    for p in paths:
        if os.path.exists(p): os.remove(p)
    new = not os.path.exists('media/archived.txt')
    with open('media/archived.txt', 'a') as f:
        if new: f.write('# Files moved out of main into the branch media-archive (tools/media-archive/archive.py). Do not make them again.\n')
        f.write(''.join(p + '\n' for p in paths))
    git('add', 'media/archived.txt')
    git('commit', '-q', '-m', f'media-archive: {msg} (they stay in the branch {BRANCH})')
    print('committed', commit)

if __name__ == '__main__': main()
