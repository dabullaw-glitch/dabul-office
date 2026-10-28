// elsale (28.10.2026): one-off tool for the "מכירת דירה" page (3916). Yakir approved (28.10.2026) putting the page in the same
// page design as "התחדשות עירונית" (35), with its own text, its own FAQ in the accordion, and sale articles in the sidebar,
// without changing the text. POST (x-cron-secret) {mode:'outline'|'dry'|'apply'}:
//   outline: the element tree of page 35 (ids, widget types, dynamic fields) and the sale categories
//   dry:     builds the new Elementor data and checks it with elput dry=1 (nothing is written)
//   apply:   writes it with elput live=1 (the old page meta is kept in _dabul_textbak; undo: /elput-undo {post:3916})
import { createClient } from 'npm:@supabase/supabase-js@2';
// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const SITE = 'https://dabullaw.co.il';
const FROM = 35, TO = 3916;
let AUTH = '';
async function wp(path: string, init: RequestInit = {}) {
  const r = await fetch(SITE + path, { ...init, headers: { authorization: AUTH, 'user-agent': 'Mozilla/5.0', 'content-type': 'application/json', ...(init.headers || {}) } });
  const t = await r.text();
  let j: Any = null; try { j = JSON.parse(t); } catch { /* not json */ }
  if (!r.ok) throw new Error(`${path} ${r.status}: ${t.slice(0, 300)}`);
  return j ?? t;
}
const rid = () => crypto.randomUUID().replace(/-/g, '').slice(0, 7);
function walk(els: Any[], fn: (e: Any, depth: number) => void, depth = 0) { for (const e of els || []) { fn(e, depth); if (e.elements) walk(e.elements, fn, depth + 1); } }
function find(els: Any[], id: string): Any { let hit: Any = null; walk(els, (e) => { if (e.id === id) hit = e; }); return hit; }

// the page text, split into the body and the FAQ (questions are the bold opening of a paragraph ending with "?")
function splitContent(raw: string) {
  const h2 = [...raw.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  const faqH = h2.find((m) => /שאלות ותשובות/.test(m[1]));
  if (!faqH) throw new Error('faq heading not found');
  const start = faqH.index!;
  const next = h2.find((m) => m.index! > start);
  const end = next ? next.index! : raw.length;
  const faqRaw = raw.slice(start + faqH[0].length, end);
  const body = raw.slice(0, start) + raw.slice(end);
  const paras = faqRaw.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter((p) => p && p.replace(/&nbsp;|<[^>]+>|\s/g, ''));
  const qs: { q: string; a: string[] }[] = [];
  for (const p of paras) {
    const m = p.match(/^(?:<(?:b|strong)[^>]*>\s*)+([^<]*\?)\s*(?:<\/(?:b|strong)>\s*)+([\s\S]*)$/);
    if (m) qs.push({ q: m[1].trim(), a: m[2].trim() ? [m[2].trim()] : [] });
    else if (qs.length) qs[qs.length - 1].a.push(p);
  }
  return { body, qs, faqRaw };
}
const toHtml = (s: string) => s.split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean).map((p) => /^<(h\d|p|ul|ol|figure|div|table|blockquote|\[)/i.test(p) || /^\[/.test(p) ? p : `<p>${p.replace(/\r?\n/g, '<br>')}</p>`).join('\n');

async function build() {
  const src = await wp(`/wp-json/dabul/v1/elraw?post=${FROM}`);
  const d: Any[] = JSON.parse(src._elementor_data);
  const page = await wp(`/wp-json/wp/v2/pages/${TO}?context=edit&_fields=id,title,content,featured_media`);
  const raw: string = page.content.raw;
  const { body, qs } = splitContent(raw);
  if (qs.length !== 4) throw new Error('expected 4 questions, got ' + qs.length + ': ' + qs.map((x) => x.q).join(' | '));
  // the short video is added by a content filter on normal pages; in Elementor it must be in the text itself
  const live = await (await fetch(`${SITE}/comprehensive-guide-selling-apartment-israel-legal-tax-stages/`, { headers: { 'user-agent': 'Mozilla/5.0' } })).text();
  const fig = (live.match(/<figure class="dbl-vid[\s\S]*?<\/figure>(?:\s*<p class="dbl-vid-watch[\s\S]*?<\/p>)?/) || [])[0] || '';
  // 28.10.2026 (Yakir: big gaps, black video, add a comparison table). Elementor's text widget turns every line break into
  // a paragraph, so the text is written as one line per block with no empty "&nbsp;" paragraphs.
  const cleanFig = fig.replace(/<img src="data:image\/svg[^"]*"([^>]*?)data-lazy-src="([^"]+)"([^>]*)>/, '<img src="$2" loading="lazy"$1$3>').replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
  const noteBox = (inner: string) => `<div class="dbl-note" style="background:#f7f4ee;border-right:4px solid #c6a03c;border-radius:8px;padding:14px 18px;margin:18px 0;text-align:center">${inner}</div>`;
  const blocks = body.replace(/\r/g, '').split(/\n\s*\n/).map((p) => p.replace(/^(?:&nbsp;\s*)+|(?:\s*&nbsp;)+$/g, '').trim()).filter((p) => p && p !== '&nbsp;')
    .map((p) => {
      if (/^<table/i.test(p) || /^&nbsp;\s*<table/i.test(p)) {
        const ps = [...p.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((m) => `<p style="margin:0 0 6px">${m[1].replace(/<br[^>]*>/g, '<br>').replace(/\s*\n\s*/g, ' ')}</p>`).join('');
        return noteBox(ps);
      }
      const one = p.replace(/\s*\n\s*/g, ' ');
      return /^<(h\d|p|ul|ol|figure|div|blockquote)/i.test(one) || /^\[/.test(one) ? one : `<p>${one}</p>`;
    });
  // comparison table, built only from facts already written on this page
  const table = '<h2>טבלת השוואה: התשלומים והחובות של המוכר</h2>'
    + '<div style="overflow-x:auto;margin:14px 0 18px"><table style="width:100%;border-collapse:collapse;font-size:16px;min-width:560px">'
    + '<thead><tr style="background:#141414;color:#fff"><th style="padding:10px;text-align:right">נושא</th><th style="padding:10px;text-align:right">מה זה</th><th style="padding:10px;text-align:right">מתי מטפלים</th><th style="padding:10px;text-align:right">מה חשוב לבדוק</th></tr></thead><tbody>'
    + [
      ['מס שבח', 'מס על הרווח הריאלי בין מחיר הקנייה למחיר המכירה', 'לפני היציאה לשוק, ודיווח למיסוי מקרקעין לרוב בתוך 30 יום מהחתימה', 'אם יש זכאות לפטור דירה יחידה, שמותנה בין היתר בהחזקה של 18 חודשים לפחות'],
      ['היטל השבחה', 'תשלום לוועדה המקומית כשתוכנית העלתה את ערך הנכס', 'לפני קביעת מחיר המכירה', 'לקבוע במפורש בחוזה מי משלם, ככל שהיטל יחול'],
      ['משכנתא קיימת', 'יתרת ההלוואה שרשומה על הדירה', 'לפני החתימה, עם מכתב כוונות מהבנק', 'סילוק מהתשלומים הראשונים של הקונה או גרירת המשכנתא לנכס חלופי'],
      ['שכר טרחה ותיווך', 'כל צד משלם לעורך הדין ולמתווך מטעמו', 'בזמן קביעת מחיר היעד', 'לכלול את ההוצאות בתחשיב המחיר'],
      ['ארנונה, ועד בית והיטלים', 'חובות שוטפים על הנכס', 'לפני מסירת החזקה', 'שהכל שולם, ושיש אישורי עירייה לרישום הזכויות'],
    ].map((r, i) => `<tr style="background:${i % 2 ? '#f7f4ee' : '#fff'}">${r.map((c, j) => `<td style="padding:10px;border-bottom:1px solid #e2e0da;vertical-align:top">${j === 0 ? `<strong>${c}</strong>` : c}</td>`).join('')}</tr>`).join('')
    + '</tbody></table></div>';
  const capI = blocks.findIndex((b) => /^\[caption/.test(b));
  blocks.splice(capI >= 0 ? capI : blocks.length - 3, 0, table);
  const style = '<style>.elementor-element-ef8aa70 h2{margin:26px 0 10px !important;line-height:1.35}.elementor-element-ef8aa70 p{margin:0 0 12px}.elementor-element-ef8aa70 .dbl-vid{margin:18px auto}</style>';
  let html = style + blocks.join('');
  if (cleanFig) { const h = [...html.matchAll(/<h2/g)]; if (h[1]) html = html.slice(0, h[1].index) + cleanFig + html.slice(h[1].index); }
  // text
  const te = find(d, 'ef8aa70'); if (!te) throw new Error('text widget ef8aa70 missing');
  te.settings.editor = html;
  // FAQ accordion: same look, our 4 questions
  const acc = find(d, '04d6c5a'); if (!acc) throw new Error('accordion 04d6c5a missing');
  const tplItem = acc.elements[0];
  acc.settings.items = qs.map((x) => ({ item_title: x.q, _id: rid() }));
  acc.elements = qs.map((x) => {
    const c = JSON.parse(JSON.stringify(tplItem)); c.id = rid();
    walk([c], (e) => { if (e !== c) e.id = rid(); });
    const w = (c.elements || []).find((e: Any) => e.widgetType === 'text-editor');
    if (!w) throw new Error('accordion item has no text widget');
    c.elements = [w]; w.settings.editor = x.a.map((a) => `<p>${a}</p>`).join('');
    return c;
  });
  // static texts that belong to page 35
  const heading = find(d, '015383b');
  const notes: string[] = [];
  if (heading && !(heading.settings.__dynamic__ && heading.settings.__dynamic__.title)) { heading.settings.title = page.title.raw; notes.push('title set'); }
  const img = find(d, '7cc7cc6');
  if (img && !(img.settings.__dynamic__ && img.settings.__dynamic__.image)) { img.settings.image = { id: page.featured_media, url: `${SITE}/wp-content/uploads/2026/10/selling-og.jpg`, alt: '', source: 'library' }; notes.push('side image set'); }
  // related posts in the sidebar: the sale category
  const cats = await wp(`/wp-json/wp/v2/categories?per_page=100&_fields=id,name,slug,count`);
  const sale = (cats as Any[]).filter((c) => /מוכר|מכיר/.test(c.name));
  const posts: string[] = [];
  walk(d, (e) => {
    if (e.elType === 'widget' && ['posts', 'loop-grid', 'loop-carousel'].includes(e.widgetType)) {
      const s = e.settings; const key = s.posts_include_term_ids ? 'posts' : s.query_include_term_ids ? 'query' : s.post_query_include_term_ids ? 'post_query' : '';
      posts.push(`${e.id}:${e.widgetType}:${key}:${JSON.stringify(s[key + '_include_term_ids'] || '')}`);
      // no sale category exists, so the three sale articles this page already links to are picked by hand
      if (e.widgetType === 'posts') { s.posts_post_type = 'by_id'; s.posts_posts_ids = ['2775', '1626', '2467']; delete s.posts_include; delete s.posts_include_term_ids; }
    }
  });
  return { d, notes, posts, sale, qs: qs.map((x) => x.q), fig: !!fig, bytes: JSON.stringify(d).length, textLen: html.replace(/<[^>]+>/g, '').length };
}

Deno.serve(async (req) => {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'WP_USER', 'WP_APP_PASSWORD']);
  const S: Record<string, string> = Object.fromEntries((data || []).map((r: Any) => [r.k, r.v]));
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  AUTH = 'Basic ' + btoa(`${S.WP_USER}:${S.WP_APP_PASSWORD}`);
  const b: Any = await req.json().catch(() => ({}));
  try {
    if (b.mode === 'outline') {
      const src = await wp(`/wp-json/dabul/v1/elraw?post=${FROM}`);
      const d: Any[] = JSON.parse(src._elementor_data); const out: string[] = [];
      walk(d, (e, depth) => { const s = e.settings || {}; out.push(`${'  '.repeat(depth)}${e.elType} ${e.id} ${e.widgetType || ''}${s.__dynamic__ ? ' DYN:' + Object.keys(s.__dynamic__).join(',') : ''}${s.title ? ' t=' + String(s.title).slice(0, 30) : ''}${s.image?.id ? ' img=' + s.image.id : ''}${s.items ? ' items=' + s.items.length : ''}`); });
      return J({ ok: true, type: src._elementor_template_type, tpl: src._wp_page_template, tree: out });
    }
    const r = await build();
    const dataStr = JSON.stringify(r.d);
    const res = await wp('/wp-json/dabul/v1/elput', { method: 'POST', body: JSON.stringify({ post: TO, from: FROM, data: dataStr, dry: b.mode !== 'apply' ? 1 : 0, live: 1 }) });
    return J({ ok: true, mode: b.mode, notes: r.notes, posts: r.posts, sale: r.sale, qs: r.qs, fig: r.fig, bytes: r.bytes, textLen: r.textLen, res });
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
