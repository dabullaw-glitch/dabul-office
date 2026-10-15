"""Read-only crawl of dabullaw.co.il (15.10.2026): which sitemap addresses redirect or fail, which internal links point at
redirects or broken pages, and which sitemap pages get no internal links. It only reads public pages, slowly, with a
normal browser user agent. Output: tools/site-audit/out/report.json and summary.txt"""
import json, re, sys, time, urllib.parse, urllib.request, http.client, ssl, html
from concurrent.futures import ThreadPoolExecutor

SITE = 'dabullaw.co.il'
UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
CTX = ssl.create_default_context()

def norm(u):
    """canonical form: https, decoded path, no query/fragment, trailing slash kept as is"""
    p = urllib.parse.urlsplit(u)
    path = urllib.parse.unquote(p.path or '/')
    return 'https://' + SITE + path

def enc(u):
    p = urllib.parse.urlsplit(u)
    return urllib.parse.urlunsplit(('https', SITE, urllib.parse.quote(urllib.parse.unquote(p.path or '/'), safe='/%-_.~'), '', ''))

def fetch(u, body=True, tries=3):
    """one request, redirects NOT followed. returns (status, location, text)"""
    for i in range(tries):
        try:
            p = urllib.parse.urlsplit(enc(u))
            c = http.client.HTTPSConnection(SITE, timeout=30, context=CTX)
            c.request('GET', p.path or '/', headers={'User-Agent': UA, 'Accept': 'text/html,application/xml', 'Accept-Language': 'he-IL'})
            r = c.getresponse()
            data = r.read() if body else b''
            loc = r.getheader('Location') or ''
            c.close()
            return r.status, (norm(urllib.parse.urljoin(enc(u), loc)) if loc else ''), data.decode('utf-8', 'replace')
        except Exception as e:
            err = str(e); time.sleep(3 * (i + 1))
    return 0, '', 'ERR ' + err

def final(u, seen=None):
    """follow a redirect chain by hand: returns (chain list, final status)"""
    chain = [u]; st = 0
    for _ in range(8):
        st, loc, _ = fetch(chain[-1], body=False)
        if st in (301, 302, 303, 307, 308) and loc and loc not in chain: chain.append(loc); continue
        break
    return chain, st

# 1. sitemap
st, _, idx = fetch('https://dabullaw.co.il/sitemap_index.xml')
subs = re.findall(r'<loc>([^<]+)</loc>', idx)
sitemap = {}
for s in subs:
    _, _, x = fetch(s)
    for loc in re.findall(r'<loc>([^<]+)</loc>', x):
        if re.search(r'\.(jpe?g|png|webp|gif|svg)$', loc, re.I): continue
        sitemap[norm(html.unescape(loc))] = s.rsplit('/', 1)[-1]
print('sitemap urls', len(sitemap), flush=True)

# 2. fetch every sitemap page (2 at a time, small pause)
pages = {}
def get_page(u):
    time.sleep(0.4)
    s, loc, body = fetch(u)
    return u, s, loc, body
with ThreadPoolExecutor(2) as ex:
    for u, s, loc, body in ex.map(get_page, list(sitemap)):
        links = []
        if s == 200:
            # links inside the main content area only would be ideal; we keep all <a href> but mark menu/footer ones later by frequency
            for h in re.findall(r'<a\s[^>]*href=["\']([^"\'#]+)', body, re.I):
                h = html.unescape(h.strip())
                if h.startswith(('mailto:', 'tel:', 'javascript:', 'whatsapp:', 'sms:')): continue
                a = urllib.parse.urljoin(u, h); p = urllib.parse.urlsplit(a)
                if p.netloc.replace('www.', '') != SITE: continue
                if re.search(r'/(wp-content|wp-json|wp-admin|feed)/|\.(jpe?g|png|webp|gif|svg|pdf|docx?|xlsx?|zip|xml|css|js)$', p.path, re.I): continue
                links.append(norm(a) + ('?' + p.query if p.query and not p.query.startswith(('utm_', 'nc=')) else ''))
        pages[u] = {'status': s, 'location': loc, 'links': links, 'h1': len(re.findall(r'<h1[\s>]', body, re.I)) if s == 200 else None,
                    'metaDesc': len(re.findall(r'<meta[^>]+name=["\']description["\']', body, re.I)) if s == 200 else None,
                    'noindex': bool(re.search(r'<meta[^>]+name=["\']robots["\'][^>]+noindex', body, re.I)) if s == 200 else None}
        print(s, u, flush=True)

# 3. every distinct internal link target
from collections import Counter, defaultdict
cnt = Counter(); by = defaultdict(set)
for u, p in pages.items():
    for l in set(p['links']):
        base = l.split('?')[0]; cnt[base] += 1; by[base].add(u)
nshow = max(1, len(pages))
sitewide = {l for l, c in cnt.items() if c >= 0.6 * nshow}   # menu / footer links on (almost) every page
targets = [l for l in cnt if l not in pages]                    # sitemap pages already have a status
res = {}
def chk(l):
    time.sleep(0.4); return l, final(l)
with ThreadPoolExecutor(2) as ex:
    for l, (chain, s) in ex.map(chk, targets): res[l] = {'chain': chain, 'status': s}
for u, p in pages.items():
    res[u] = {'chain': [u] + ([p['location']] if p['location'] else []), 'status': p['status']}
    if p['location']:
        ch, fs = final(u); res[u] = {'chain': ch, 'status': fs}

redir_links, broken_links = [], []
for l, r in res.items():
    if l not in cnt: continue
    if len(r['chain']) > 1: redir_links.append({'link': l, 'to': r['chain'][-1], 'hops': len(r['chain']) - 1, 'finalStatus': r['status'], 'fromPages': len(by[l]), 'sitewide': l in sitewide, 'examples': sorted(by[l])[:5]})
    elif r['status'] >= 400 or r['status'] == 0: broken_links.append({'link': l, 'status': r['status'], 'fromPages': len(by[l]), 'examples': sorted(by[l])[:8]})

sitemap_bad = [{'url': u, 'sitemap': sitemap[u], 'status': p['status'], 'to': res[u]['chain'][-1] if len(res[u]['chain']) > 1 else ''} for u, p in pages.items() if p['status'] != 200]
# inbound links that are not from menu/footer: count pages (other than itself) linking to each sitemap page
inbound = {u: len([x for x in by.get(u, set()) if x != u]) for u in pages}
orphans = [u for u in pages if pages[u]['status'] == 200 and inbound[u] == 0 and not pages[u]['noindex']]
weak = [u for u in pages if pages[u]['status'] == 200 and inbound[u] == 1 and u not in sitewide and not pages[u]['noindex']]
multi_meta = [u for u, p in pages.items() if (p['metaDesc'] or 0) > 1]
multi_h1 = [u for u, p in pages.items() if (p['h1'] or 0) > 1]
noindex_in_sitemap = [u for u, p in pages.items() if p['noindex']]

import os
os.makedirs('tools/site-audit/out', exist_ok=True)
rep = {'at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'sitemapCount': len(sitemap), 'sitemapBad': sitemap_bad,
       'redirectLinks': sorted(redir_links, key=lambda x: -x['fromPages']), 'brokenLinks': sorted(broken_links, key=lambda x: -x['fromPages']),
       'orphans': orphans, 'weakInbound': weak, 'multiMetaDesc': multi_meta, 'multiH1': multi_h1, 'noindexInSitemap': noindex_in_sitemap}
json.dump(rep, open('tools/site-audit/out/report.json', 'w'), ensure_ascii=False, indent=1)
with open('tools/site-audit/out/summary.txt', 'w') as f:
    f.write(f"sitemap {len(sitemap)} | bad in sitemap {len(sitemap_bad)} | links to redirects {len(redir_links)} (pages affected {len({e for r in redir_links for e in by[r['link']]})}) | broken links {len(broken_links)} | orphans {len(orphans)} | multi meta desc {len(multi_meta)} | multi h1 {len(multi_h1)} | noindex in sitemap {len(noindex_in_sitemap)}\n")
print(open('tools/site-audit/out/summary.txt').read())
