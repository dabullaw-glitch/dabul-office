#!/usr/bin/env python3
"""Hold a final-approved podcast episode OFF the public GitHub Pages site until its release, then put it back.

Why (25.11.2026, Yakir approved 21:32 "כן"): the mix Action commits media/podcast/<ep>.mp3 and <ep>.mp4 to main, so GitHub
Pages served ep04 a week before its release (2.12.2026 19:00). Now the finished files leave the public tree after the final
approval and come back only shortly before the release:

  hold    --ep ep04 --release 2026-12-02T19:00:00+02:00 [--lead 90]
          writes media/podcast/release/<ep>.json (git blob id, sha256 and size of each file, release time, restoreFrom =
          release minus --lead minutes) and runs `git rm` on media/podcast/<ep>.mp3 and <ep>.mp4. The caller commits and
          pushes (fast-forward only). Run it in a clone of dabul-office at the commit that has the approved files.
  restore [--ep ep04] [--now]
          for every manifest whose restoreFrom has passed (or only --ep, and with --now regardless of the time): takes each
          file back from git (`git cat-file blob <id>`; the blobs stay in the repo history, nothing is downloaded from
          anywhere else), checks the sha256, writes it to its path and marks the manifest "released". Prints the episodes
          restored. Used by .github/workflows/podcast-release.yml (twice a day) and by TASK.md 6b as the fallback.

The manifest holds no links and nothing secret. A held episode is skipped by podcast-mix.yml (never mixed again by
accident). A private copy of the mp3 is also in storage (bucket files, podcast/<ep>/<ep>.mp3); the mp4 is over the 50 MB
upload limit of the free plan, so its only copy is the git blob (which this script uses for both files anyway).
"""
import argparse, datetime as dt, hashlib, json, pathlib, subprocess, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
REL = ROOT / 'media' / 'podcast' / 'release'


def git(*a, binary=False):
    r = subprocess.run(['git', '-C', str(ROOT), *a], capture_output=True, check=True)
    return r.stdout if binary else r.stdout.decode().strip()


def hold(ep, release, lead):
    t = dt.datetime.fromisoformat(release)
    if t.tzinfo is None:
        sys.exit('--release needs a time zone offset, e.g. 2026-12-02T19:00:00+02:00')
    files = []
    for ext in ('mp3', 'mp4'):
        path = f'media/podcast/{ep}.{ext}'
        line = git('ls-tree', 'HEAD', path)
        if not line:
            sys.exit(f'{path} is not in HEAD')
        blob = line.split()[2]
        data = git('cat-file', 'blob', blob, binary=True)
        files.append({'path': path, 'blob': blob, 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                      'commit': git('log', '-1', '--format=%H', '--', path)})
    REL.mkdir(parents=True, exist_ok=True)
    m = {'ep': ep, 'release': t.isoformat(), 'restoreFrom': (t - dt.timedelta(minutes=lead)).isoformat(),
         'heldAt': dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds'), 'files': files,
         'note': 'held off GitHub Pages until release (tools/podcast/release.py); restored by .github/workflows/podcast-release.yml'}
    (REL / f'{ep}.json').write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n')
    git('rm', '-q', '--', *[f['path'] for f in files])
    print(json.dumps({'ok': True, 'held': ep, 'restoreFrom': m['restoreFrom']}))


def restore(only, now_flag):
    now = dt.datetime.now(dt.timezone.utc)
    done = []
    for f in sorted(REL.glob('ep*.json')):
        m = json.loads(f.read_text())
        if (only and m['ep'] != only) or m.get('released'):
            continue
        if not now_flag and now < dt.datetime.fromisoformat(m['restoreFrom']):
            print(m['ep'], 'not due before', m['restoreFrom'], file=sys.stderr)
            continue
        for x in m['files']:
            data = git('cat-file', 'blob', x['blob'], binary=True)
            if hashlib.sha256(data).hexdigest() != x['sha256'] or len(data) != x['bytes']:
                sys.exit(f"{x['path']}: the git blob does not match the manifest")
            p = ROOT / x['path']
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
        m['released'] = now.isoformat(timespec='seconds')
        f.write_text(json.dumps(m, ensure_ascii=False, indent=1) + '\n')
        done.append(m['ep'])
    print(' '.join(done))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    h = sub.add_parser('hold'); h.add_argument('--ep', required=True); h.add_argument('--release', required=True)
    h.add_argument('--lead', type=int, default=90)
    r = sub.add_parser('restore'); r.add_argument('--ep'); r.add_argument('--now', action='store_true')
    a = ap.parse_args()
    if a.cmd == 'hold':
        if not a.ep.startswith('ep') or not a.ep[2:].isdigit():
            sys.exit('bad --ep')
        hold(a.ep, a.release, a.lead)
    else:
        restore(a.ep, a.now)
