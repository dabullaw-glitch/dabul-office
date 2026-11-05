#!/usr/bin/env python3
"""Add ONE approved episode to the podcast feed (repo dabullaw-glitch/nadlan-podcast).

Adding an item IS publishing: Spotify and Apple read the feed within hours. The script refuses to add an episode
whose number or guid is already in the feed (never publish twice).

usage: feed_add.py --repo /home/claude/nadlan-podcast --office /home/claude/dabul-office --ep ep02 \
                   --meta /tmp/ep02.json [--pubdate "Wed, 18 Nov 2026 19:00:00 +0200"]
meta json (from docs podcast/epNN): {"n":2,"title":"...","description":"...","mix":{"mp3":"media/podcast/ep02.mp3",
"duration":640.2,"covers":{"episode":"media/podcast/ep02.jpg"}}}
Then: cd repo && git add -A && git commit && git push (the caller does it).
"""
import argparse, html, json, os, re, shutil, sys, uuid
from email.utils import format_datetime
from datetime import datetime, timezone, timedelta

BASE = 'https://dabullaw-glitch.github.io/nadlan-podcast/'

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--repo', required=True); ap.add_argument('--office', required=True)
    ap.add_argument('--ep', required=True); ap.add_argument('--meta', required=True); ap.add_argument('--pubdate')
    ap.add_argument('--replace', action='store_true', help='the episode is already in the feed: replace its audio and cover only')
    a = ap.parse_args()
    if a.replace:
        return replace(a)
    if not re.fullmatch(r'ep\d{2,3}', a.ep): sys.exit('bad --ep')
    m = json.load(open(a.meta, encoding='utf-8'))
    n = int(m['n']); mix = m['mix']
    feed_path = os.path.join(a.repo, 'feed.xml'); feed = open(feed_path, encoding='utf-8').read()
    guid = str(uuid.uuid5(uuid.NAMESPACE_URL, BASE + 'episodes/' + a.ep))
    if f'<itunes:episode>{n}</itunes:episode>' in feed or guid in feed or f'episodes/{a.ep}.mp3' in feed:
        sys.exit(f'{a.ep} is already in the feed: not adding it twice')
    desc = str(m['description']).strip()
    if 'המידע כללי ואינו ייעוץ משפטי.' not in desc: sys.exit('description must end with the disclaimer')
    if re.search('[–—]', desc + m['title']): sys.exit('no em or en dashes')
    os.makedirs(os.path.join(a.repo, 'episodes'), exist_ok=True)
    mp3_src = os.path.join(a.office, mix['mp3']); jpg_src = os.path.join(a.office, mix['covers']['episode'])
    mp3 = os.path.join(a.repo, 'episodes', f'{a.ep}.mp3'); jpg = os.path.join(a.repo, 'episodes', f'{a.ep}.jpg')
    shutil.copyfile(mp3_src, mp3); shutil.copyfile(jpg_src, jpg)
    size = os.path.getsize(mp3)
    if size < 2_000_000: sys.exit('mp3 too small')
    pub = a.pubdate or format_datetime(datetime.now(timezone(timedelta(hours=2))))
    body = desc.replace(']]>', ']] >')
    item = f"""<item>
<title>{html.escape(m['title'], quote=False)}</title>
<description><![CDATA[{body}]]></description>
<content:encoded><![CDATA[{body.replace(chr(10), '<br>')}]]></content:encoded>
<enclosure url="{BASE}episodes/{a.ep}.mp3" length="{size}" type="audio/mpeg"/>
<guid isPermaLink="false">{guid}</guid>
<pubDate>{pub}</pubDate>
<itunes:duration>{round(float(mix['duration']))}</itunes:duration>
<itunes:episode>{n}</itunes:episode>
<itunes:episodeType>full</itunes:episodeType>
<itunes:image href="{BASE}episodes/{a.ep}.jpg"/>
<itunes:explicit>false</itunes:explicit>
</item>
"""
    # newest first: right after the channel header (before the first existing item)
    i = feed.find('<item>')
    feed = feed[:i] + item + feed[i:] if i >= 0 else feed.replace('</channel>', item + '</channel>')
    open(feed_path, 'w', encoding='utf-8').write(feed)
    print(json.dumps({'ok': True, 'ep': a.ep, 'guid': guid, 'bytes': size, 'pubDate': pub,
                      'mp3': f'{BASE}episodes/{a.ep}.mp3'}, ensure_ascii=False))

def replace(a):
    """A fixed version of an episode that is already published (Yakir asked for a fix after it went out): same item,
    same guid and pubDate (no second episode for the listeners), new audio file, new length and duration."""
    if not re.fullmatch(r'ep\d{2,3}', a.ep): sys.exit('bad --ep')
    m = json.load(open(a.meta, encoding='utf-8')); mix = m['mix']
    feed_path = os.path.join(a.repo, 'feed.xml'); feed = open(feed_path, encoding='utf-8').read()
    url = f'{BASE}episodes/{a.ep}.mp3'
    i = feed.find(f'<enclosure url="{url}"')
    if i < 0: sys.exit(f'{a.ep} is not in the feed: use the normal mode')
    s = feed.rfind('<item>', 0, i); e = feed.find('</item>', i)
    mp3 = os.path.join(a.repo, 'episodes', f'{a.ep}.mp3')
    shutil.copyfile(os.path.join(a.office, mix['mp3']), mp3)
    shutil.copyfile(os.path.join(a.office, mix['covers']['episode']), os.path.join(a.repo, 'episodes', f'{a.ep}.jpg'))
    size = os.path.getsize(mp3)
    if size < 2_000_000: sys.exit('mp3 too small')
    item = feed[s:e]
    item = re.sub(r'(<enclosure url="[^"]+" length=")\d+(")', rf'\g<1>{size}\g<2>', item)
    item = re.sub(r'<itunes:duration>\d+</itunes:duration>', f'<itunes:duration>{round(float(mix["duration"]))}</itunes:duration>', item)
    open(feed_path, 'w', encoding='utf-8').write(feed[:s] + item + feed[e:])
    print(json.dumps({'ok': True, 'ep': a.ep, 'replaced': True, 'bytes': size}, ensure_ascii=False))

if __name__ == '__main__':
    main()
