// linkq: internal links with Yakir's approval.
// The daily scheduled task writes proposals to docs linkq/<id> {items:[{source,sourceTitle,target,targetTitle,targetLink,anchor,context}]}
//   POST ?step=ask&id=<id>          (x-cron-secret) -> sends Yakir a Telegram message with a link to the review page
//   GET  ?a=data&t=<tok>            -> the proposals (the review page links.html shows them with checkboxes)
//   POST ?a=apply&t=<tok> {idx}     -> adds the chosen links on the site (WordPress REST, inside plain paragraph text only)
//   POST ?a=undo&t=<tok> {i}        -> removes one added link again
// Every change is logged in seo/linklog (WordPress also keeps a revision of each post).
export function start(createClient) {
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const SITE = 'https://dabullaw.co.il';
  const FN = 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/linkq';
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const merge = (coll, id, patch) => sb.rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
  const getDoc = async (coll, id) => (await sb.from('docs').select('data').match({ coll, id }).maybeSingle()).data?.data || null;
  async function secrets() {
    const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'WP_USER', 'WP_APP_PASSWORD', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
    return Object.fromEntries((data || []).map((r) => [r.k, r.v]));
  }
  async function tg(S, text, buttons) {
    if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return;
    const body = { chat_id: S.TELEGRAM_CHAT_ID, text: text.slice(0, 4000), disable_web_page_preview: true };
    if (buttons) body.reply_markup = { inline_keyboard: buttons };
    await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).catch(() => null);
  }
  const auth = (S) => 'Basic ' + btoa(unescape(encodeURIComponent(`${S.WP_USER}:${S.WP_APP_PASSWORD}`)));
  async function wpGet(S, id) {
    const r = await fetch(`${SITE}/wp-json/wp/v2/posts/${id}?context=edit&_fields=id,link,title,content`, { headers: { 'user-agent': UA, authorization: auth(S) } });
    if (!r.ok) throw new Error('read ' + r.status);
    const p = await r.json(); return { id: p.id, link: p.link, html: String(p.content?.raw ?? '') };
  }
  async function wpSave(S, id, html) {
    const r = await fetch(`${SITE}/wp-json/wp/v2/posts/${id}`, { method: 'POST', headers: { 'user-agent': UA, authorization: auth(S), 'content-type': 'application/json' }, body: JSON.stringify({ content: html }) });
    if (!r.ok) throw new Error('save ' + r.status);
  }
  const pathOf = (u) => { try { return decodeURIComponent(new URL(u, SITE).pathname).replace(/\/+$/, '/').toLowerCase(); } catch { return String(u).toLowerCase(); } };
  // wrap the first plain-text occurrence of anchor inside a <p> (never inside a tag, a heading or an existing link)
  function addLink(html, anchor, href) {
    if (/data-elementor-type|elementor-widget/.test(html)) return { err: 'elementor' };
    if ([...html.matchAll(/href="([^"]+)"/g)].some((m) => pathOf(m[1]) === pathOf(href))) return { err: 'already linked' };
    const re = /<p\b[^>]*>[\s\S]*?<\/p>/gi; let m;
    while ((m = re.exec(html))) {
      const block = m[0]; let done = false;
      const out = block.split(/(<a\b[\s\S]*?<\/a>|<[^>]+>)/i).map((seg) => {
        if (done || seg.startsWith('<')) return seg;
        const i = seg.indexOf(anchor); if (i < 0) return seg;
        done = true; return seg.slice(0, i) + `<a href="${href}">${anchor}</a>` + seg.slice(i + anchor.length);
      }).join('');
      if (done) return { html: html.slice(0, m.index) + out + html.slice(m.index + block.length) };
    }
    // classic editor without <p>: plain text lines
    if (!/<p\b/i.test(html)) {
      const parts = html.split(/(<a\b[\s\S]*?<\/a>|<h\d[\s\S]*?<\/h\d>|<[^>]+>)/i); let done = false;
      const out = parts.map((seg) => { if (done || seg.startsWith('<')) return seg; const i = seg.indexOf(anchor); if (i < 0) return seg; done = true; return seg.slice(0, i) + `<a href="${href}">${anchor}</a>` + seg.slice(i + anchor.length); }).join('');
      if (done) return { html: out };
    }
    return { err: 'anchor not found' };
  }
  const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'content-type', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
  const J = (d, st = 200) => new Response(JSON.stringify(d), { status: st, headers: { ...CORS, 'content-type': 'application/json; charset=utf-8' } });
  const page_unused = (title, body) => new Response(`<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(title)}</title>
<style>body{margin:0;background:#f4f3ef;font:16px/1.6 Arial,sans-serif;color:#1c1b19}main{max-width:760px;margin:0 auto;padding:18px 14px 90px}h1{font-size:21px}
.it{background:#fff;border-radius:10px;padding:12px 14px;margin:0 0 10px;display:flex;gap:12px;align-items:flex-start;border-right:4px solid #a8873f}.it input{width:22px;height:22px;margin-top:4px;flex:0 0 22px}
.it small{color:#777;display:block}.it mark{background:#f3e5b8;padding:0 2px}.bar{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid #ddd;padding:12px;text-align:center}
button,.b{background:#1c1b19;color:#e4d19c;border:0;border-radius:8px;padding:12px 22px;font:700 16px Arial;text-decoration:none;display:inline-block}.ok{color:#1e7b45}.bad{color:#b4442f}</style></head><body><main>${body}</main></body></html>`, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
  async function byTok(tok) {
    if (!/^[a-f0-9]{24,}$/.test(tok || '')) return null;
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'linkq').eq('data->>tok', tok).limit(1);
    return data && data[0] ? { id: data[0].id, ...data[0].data } : null;
  }
  Deno.serve(async (req) => {
    const S = await secrets(); const url = new URL(req.url); const a = url.searchParams.get('a'); const t = url.searchParams.get('t') || '';
    try {
      if (url.searchParams.get('step') === 'ask') {
        if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return new Response('unauthorized', { status: 401 });
        const id = String(url.searchParams.get('id') || ''); const q = await getDoc('linkq', id);
        if (!q?.items?.length) return Response.json({ ok: false, error: 'no items' });
        const tok = q.tok || [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('');
        await merge('linkq', id, { tok, status: 'awaiting', askedAt: new Date().toISOString() });
        const posts = new Set(q.items.map((x) => x.source)).size;
        await tg(S, `🔗 קישורים פנימיים להיום: ${q.items.length} קישורים ב-${posts} מאמרים.\nכל קישור נוסף בתוך משפט שכבר קיים במאמר, למאמר קשור באתר. אפשר לאשר את כולם או להוריד סימון מקישור שלא מתאים.`, [[{ text: '👁 לצפייה ואישור', url: `https://dabullaw-glitch.github.io/dabul-office/links.html#t=${tok}` }]]);
        return Response.json({ ok: true, tok });
      }
      if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
      if (a === 'data') {
        const q = await byTok(t); if (!q) return J({ ok: false }, 404);
        return J({ ok: true, items: q.items.map((x) => ({ sourceTitle: x.sourceTitle, targetTitle: x.targetTitle, anchor: x.anchor, context: x.context || '', status: x.status || '' })) });
      }
      if (a === 'apply' && req.method === 'POST') {
        const q = await byTok(t); if (!q) return J({ ok: false }, 404);
        const b = await req.json().catch(() => ({})); const pick = new Set((b.idx || []).map((x) => Number(x)));
        const log = (await getDoc('seo', 'linklog')) || { items: [] }; let added = 0;
        for (let i = 0; i < q.items.length; i++) {
          const x = q.items[i]; if (x.status) continue;
          if (!pick.has(i)) { x.status = 'skipped'; continue; }
          try {
            const p = await wpGet(S, x.source); const r = addLink(p.html, x.anchor, x.targetLink);
            if (r.err) { x.status = r.err; continue; }
            await wpSave(S, x.source, r.html); x.status = 'added'; x.at = new Date().toISOString(); added++;
            log.items.push({ source: x.source, sourceTitle: x.sourceTitle, target: x.target, targetTitle: x.targetTitle, anchor: x.anchor, href: x.targetLink, at: x.at, via: q.id });
          } catch (e) { x.status = 'error: ' + String(e.message || e).slice(0, 60); }
        }
        log.items = log.items.slice(-3000);
        await merge('seo', 'linklog', { items: log.items });
        await merge('linkq', q.id, { items: q.items, status: 'done', doneAt: new Date().toISOString(), added });
        await tg(S, `✅ נוספו ${added} קישורים פנימיים באתר.`);
        return J({ ok: true, added });
      }
      if (a === 'undo' && req.method === 'POST') {
        const q = await byTok(t); const b = await req.json().catch(() => ({})); const i = Number(b.i); const x = q?.items?.[i];
        if (!x || x.status !== 'added') return J({ ok: false });
        const p = await wpGet(S, x.source); const tag = `<a href="${x.targetLink}">${x.anchor}</a>`;
        if (p.html.includes(tag)) await wpSave(S, x.source, p.html.replace(tag, x.anchor));
        x.status = 'undone'; await merge('linkq', q.id, { items: q.items });
        return J({ ok: true });
      }
      return new Response('not found', { status: 404 });
    } catch (e) {
      return J({ ok: false, error: String(e.message || e) }, 500);
    }
  });
}
