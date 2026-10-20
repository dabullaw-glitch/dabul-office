"""Preview builder: puts draft content inside a saved copy of a live dabullaw.co.il page (read only snapshot,
fetched 20.10.2026 via pg_net), so the preview shows the real header, sidebar, fonts and lvbl article styles.
Nothing here touches the live site."""
import re, pathlib, html as H

HERE = pathlib.Path(__file__).parent
LVBL_START = '<div class="lvbl-article"'


def load(name):
    return (HERE / f'shell-{name}.html').read_text()


def unlazy(s):
    # WP Rocket lazyload does not run offline: move data-lazy-src into src
    s = re.sub(r'<noscript>.*?</noscript>', '', s, flags=re.S)
    s = re.sub(r'src="data:image/svg\+xml[^"]*"([^>]*?)data-lazy-src="([^"]*)"', r'src="\2"\1', s)
    s = re.sub(r'data-lazy-srcset=', 'srcset=', s)
    return s


def article_bounds(s):
    a = s.index(LVBL_START)
    end_marker = s.index('</script></p>', a)
    b = s.index('</div>', end_marker) + len('</div>')
    return a, b


def toc(h2s):
    items = ''.join(
        f'<li class="elementor-toc__list-item"><div class="elementor-toc__list-item-text-wrapper">'
        f'<a href="#{i}" class="elementor-toc__list-item-text elementor-toc__top-level">{t}</a></div></li>'
        for i, t in h2s)
    return f'<ul class="elementor-toc__list-wrapper">{items}</ul>'


def fill_toc(s, h2s):
    return re.sub(r'<div class="elementor-toc__spinner-container">.*?</div>', toc(h2s), s, flags=re.S)


PREVIEW_CSS = ('<style id="dbl-preview">html,body{overflow-x:hidden!important}'
               '*{animation:none!important;transition:none!important}'
               '.elementor-invisible{visibility:visible!important;opacity:1!important}'
               '@media(min-width:1025px){.elementor-toc__body{display:block!important;max-height:175px;overflow-y:auto}}'
               '@media(max-width:1024px){.elementor-toc__body{display:none!important}}'
               '</style>')


def build(name, *, title, h1, crumbs, article_html, h2s, extra=None, date=None):
    s = load(name)
    a, b = article_bounds(s)
    s = s[:a] + article_html + s[b:]
    s = re.sub(r'<title>.*?</title>', f'<title>{H.escape(title)}</title>', s, count=1, flags=re.S)
    if h1:
        s = re.sub(r'(<h1 class="elementor-heading-title elementor-size-default">).*?(</h1>)', r'\g<1>' + h1 + r'\g<2>', s, count=1, flags=re.S)
    if crumbs:
        s = re.sub(r'<p id="breadcrumbs">.*?</p>', crumbs, s, count=1, flags=re.S)
    s = fill_toc(s, h2s)
    if date:
        s = re.sub(r'<time>[^<]*</time>', f'<time>{date}</time>', s)
    if extra:
        s = extra(s)
    s = unlazy(s)
    s = s.replace('</head>', PREVIEW_CSS + '</head>', 1)
    return s


def crumbs_html(parts):
    out = []
    for i, (t, u) in enumerate(parts):
        if i == len(parts) - 1:
            out.append(f'<span class="breadcrumb_last" aria-current="page"><strong>{t}</strong></span>')
        else:
            out.append(f'<span><a href="{u}">{t}</a></span>')
    return '<p id="breadcrumbs"><span>' + ' / '.join(out) + '</span></p>'
