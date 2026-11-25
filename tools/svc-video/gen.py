# Service explainer videos, rebuilt 25.11.2026 (Yakir approved re-voicing them in his own voice, chat 25.11.2026 14:31).
# The original generator (media/video/svc-gen.py, 11.10.2026) needed helper modules that lived in /tmp and are gone.
# Everything it took from them is now in tools/svc-video/data.json (taken from the published page bodies in
# media/online-pub/<slug>.txt and from media/widgets/svc-config.json), so the scenes come out the same as the live videos.
#
#   python3 gen.py <out_dir> <fonts_dir> <photo>      -> <out_dir>/scenes/<sid>.html, <out_dir>/narration.json
#
# fonts_dir = a node_modules folder with @fontsource/karantina and @fontsource/ibm-plex-sans-hebrew.
# The narration text is the live narration word for word (svc-gen.py); scene 5 is the price line in words.
import json, os, sys, html

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
E = html.escape
D = json.load(open(os.path.join(HERE, 'data.json'), encoding='utf8'))
CFG = json.load(open(os.path.join(ROOT, 'media/widgets/svc-config.json'), encoding='utf8'))
SV = {s['id']: s for s in CFG['services']}
VAT = 0.18  # the VAT the live videos were made with (11.10.2026)
CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'


def price_line(sid, digits=False):
    d = D['svc'][sid]; fp = d['price']
    w = '{:,}'.format(fp) if digits else D['words'][str(fp)]
    if d['from']:
        t = ('המחיר מתחיל מ־%s ₪, ועוד מע״מ.' if digits else 'המחיר מתחיל מ%s שקלים, ועוד מע״מ.') % w
    else:
        t = ('מחיר קבוע של %s ₪, ועוד מע״מ.' if digits else 'מחיר קבוע של %s שקלים, ועוד מע״מ.') % w
    if d['gov']: t += ' האגרות למדינה משולמות בנפרד.'
    return t + ' המחיר הסופי מוצג לפני התשלום.'


def narration(sid):
    n = list(D['svc'][sid]['n']); n[4] = price_line(sid)
    return n


def scene(sid, tpl):
    d = D['svc'][sid]; s = SV[sid]
    fp = d['price']; vat = round(fp * VAT, 2)
    narr = narration(sid)
    caps = list(d['n']); caps[4] = price_line(sid, True)
    who = ''.join('<div class="who" id="w%d"><i>%s</i><span>%s</span></div>' % (k + 1, CHECK, E(x)) for k, x in enumerate(d['who'][:3]))
    incl = d['incl'][:4]
    inc = ''.join('<div class="inc" id="n%d"><b>%d</b><span>%s</span></div>' % (k + 1, k + 1, E(x)) for k, x in enumerate(incl))
    steps = ''.join('<div class="st" id="l%d"><span class="n" id="sn%d">%d</span><div><b>%s</b><span>%s</span></div></div>' % (k + 1, k + 1, k + 1, E(a), E(b)) for k, (a, b) in enumerate(d['steps']))
    form = ''.join('<div class="fld">%s</div><div class="inp" id="i%d" data-v="%s"></div>' % (E(q), k + 1, E(v)) for k, (q, v) in enumerate(d['form']))
    rep = {
        '{{TITLE1}}': E(d['t1'][0]), '{{TITLE2}}': E(d['t1'][1]), '{{TITLE3}}': E(d.get('t3', 'אונליין.')), '{{SVC}}': E(d['title']),
        '{{DOM}}': E(d['dom']), '{{DC}}': d['dc'], '{{DT}}': d['dt'], '{{DICON}}': d['dsvg'],
        '{{FORM}}': form, '{{UP}}': E(d['up']), '{{WHO}}': who, '{{INC}}': inc, '{{NINC}}': str(len(incl)), '{{STEPS}}': steps,
        '{{PRICE}}': '{:,}'.format(fp), '{{VAT}}': '{:,.2f}'.format(vat), '{{TOTAL}}': '{:,.2f}'.format(fp + vat),
        '{{FROM}}': 'החל מ־' if d['from'] else 'מחיר קבוע',
        '{{GOV}}': 'אגרות למדינה בנפרד' if d['gov'] else 'בלי תוספות בהמשך', '{{SLA}}': E(d['sla']), '{{SLUG}}': s['slug'],
        '{{CAPS}}': json.dumps(caps, ensure_ascii=False),
    }
    h = tpl
    for k, v in rep.items(): h = h.replace(k, v)
    assert '{{' not in h, sid
    for bad in ('—', '–', 'מומחה', 'חינם', 'הטוב ביותר'):
        assert bad not in h and all(bad not in x for x in narr), (sid, bad)
    return h, narr


if __name__ == '__main__':
    out, fonts, photo = sys.argv[1], sys.argv[2].rstrip('/') + '/', os.path.abspath(sys.argv[3])
    only = sys.argv[4].split(',') if len(sys.argv) > 4 else list(D['svc'])
    tpl = open(os.path.join(ROOT, 'media/video/svc-scene-template.html'), encoding='utf8').read()
    tpl = tpl.replace('file:///tmp/claude-0/node_modules/', 'file://' + os.path.abspath(fonts) + '/').replace("src=\"../yakir.webp\"", 'src="file://%s"' % photo)
    os.makedirs(os.path.join(out, 'scenes'), exist_ok=True)
    nar = {}
    for sid in only:
        if sid in ('hub', 'hub2'):  # the hub video (/online/): its scene page is concrete; the narration is its caption list
            h = open(os.path.join(ROOT, 'media/video/hub-scene.html'), encoding='utf8').read()
            h = h.replace('file:///tmp/claude-0/node_modules/', 'file://' + os.path.abspath(fonts) + '/').replace('src="yakir.webp"', 'src="file://%s"' % photo)
            # the live hub video (re-rendered 11.10.2026) shows the apartment check at 990; the repo page still says 490
            for a, b in (('<span>490 ₪</span>', '<span>990 ₪</span>'), ('<span>88.20 ₪</span>', '<span>178.20 ₪</span>'), ('>578.20 ₪</b>', '>1,168.20 ₪</b>')):
                assert h.count(a) == 1, a; h = h.replace(a, b)
            if sid == 'hub2':
                # Yakir 25.11.2026: the refund scene (6) comes out, words and picture. The page keeps its 7 slots; scene 6
                # gets 0 seconds (the renderer passes 6 durations, a zero is put in place 6), so it is never shown.
                for a, b in (('ואם מבטלים לפני שהטיפול התחיל, מקבלים את הכסף בחזרה.', ''), ('<div class="k" id="reft">החזר מלא</div>', '<div class="k" id="reft"></div>'),
                             ('<p id="refp">אם מבטלים לפני שהטיפול התחיל</p>', '<p id="refp"></p>'),
                             ('const D=window.DUR||', 'if(window.DUR&&window.DUR.length===6){const x=window.DUR.slice();x.splice(5,0,0);window.DUR=x;}\nconst D=window.DUR||')):
                    assert h.count(a) == 1, a; h = h.replace(a, b)
                assert 'מבטלים' not in h and 'החזר' not in h
            n = json.loads(h.split('const CAP=', 1)[1].split(';\n', 1)[0].replace("'", '"'))
            if sid == 'hub2': n = [x for x in n if x]
            open(os.path.join(out, 'scenes', sid + '.html'), 'w', encoding='utf8').write(h)
            nar[sid] = n
            continue
        h, n = scene(sid, tpl)
        open(os.path.join(out, 'scenes', sid + '.html'), 'w', encoding='utf8').write(h)
        nar[sid] = n
    json.dump(nar, open(os.path.join(out, 'narration.json'), 'w', encoding='utf8'), ensure_ascii=False, indent=1)
    for sid, n in nar.items(): print(sid, sum(len(x) for x in n), 'chars')
