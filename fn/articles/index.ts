// Automatic SEO articles for dabullaw.co.il, written in the office's article template.
// The writing itself is done by the office's scheduled writer (on the Claude subscription, not the paid API).
// It stores each article as artjob status 'written'. This function only checks and publishes, with no AI calls:
// step=collect (every hour): checks written articles (bar rules, structure, every link), schedules them on the site
//                            for the next morning, and sends a Telegram notice with a stop button. Problems -> 'held'.
// step=cover-test:           renders a sample cover and stores it in files/covers/_test.png (to check the cover engine).
// step=recover {postId}:     a new cover (current layout) for an article this engine already published.
// ?cancel=<token>:           stops a scheduled article (turns it back into a draft on the site), or rejects an upgrade.
// ?approve=<token>:          approves an upgrade of an existing post (mode 'upgrade', targetId): the post gets the new content.
// 11.11.2026: copied into the repo from the deployed version 12 (unchanged); the fix is in cover.ts.
import { loadSecrets, json, cors, admin, env } from '../_shared/common.ts';
import { init as coverInit, render as coverRender, pick as coverPick } from './cover.ts';

const SITE = 'https://dabullaw.co.il';
// neutral sources that may contain 'law' in the name
const NEUTRAL = /(^|\.)(nevo\.co\.il|kolzchut\.org\.il|wikisource\.org|wikipedia\.org|knesset\.gov\.il|court\.gov\.il|takdin\.co\.il|psakdin\.co\.il)$/;
// words the bar's advertising rules (or the office's own rules) do not allow
const BANNED: [RegExp, string][] = [
  [/הטוב(?:ים|ה|ות)? ביותר/g, 'לשון הפלגה "הטוב ביותר"'],
  [/הכי טוב/g, 'לשון הפלגה "הכי טוב"'],
  [/(?:ה)?מוביל(?:ים|ה|ות)? (?:בתחום|בישראל|בשרון|בנתניה)/g, 'לשון הפלגה "מוביל"'],
  [/מקסימלי(?:ת|ים)?/g, 'לשון הפלגה "מקסימלי"'],
  [/(?:עורכ?י? דין|עו"ד|עו״ד|משרד(?:נו)?)\s+מומח/g, 'תואר "מומחה" לעורך דין'],
  [/מומחי(?:ם|ות)? (?:ב|ל)/g, 'תואר "מומחים"'],
  [/(?:ייעוץ|פגישה|שיחה|בדיקה)(?: ראשונ(?:י|ית))? (?:חינם|ללא עלות|ללא תשלום)/g, 'ייעוץ חינם'],
  [/(?:אחוזי|שיעור) הצלחה/g, 'שיעורי הצלחה'],
  [/מבטיח(?:ים)? (?:לכם|לך) /g, 'הבטחה לתוצאה'],
];

// deno-lint-ignore no-explicit-any
const doc = async (coll: string, id: string): Promise<any> => { const { data } = await admin().from('docs').select('data').match({ coll, id }).maybeSingle(); return data ? data.data : null; };
// deno-lint-ignore no-explicit-any
const merge = (coll: string, id: string, patch: any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });

// deno-lint-ignore no-explicit-any
async function tg(text: string, buttons?: any[]) {
  const token = env('TELEGRAM_BOT_TOKEN'), chat = env('TELEGRAM_CHAT_ID'); if (!token || !chat) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: buttons ? { inline_keyboard: buttons } : undefined }) }).catch(() => null);
}

// every post and page on the site, for topics that are not yet covered and for internal links that really exist
async function siteIndex() {
  const out: { title: string; link: string }[] = [];
  for (const kind of ['posts', 'pages']) for (let page = 1; page <= 6; page++) {
    const r = await fetch(`${SITE}/wp-json/wp/v2/${kind}?per_page=100&page=${page}&_fields=title,link`, { headers: { 'user-agent': 'Mozilla/5.0 (compatible; DabulOffice/1.0)' } }).catch(() => null);
    if (!r || !r.ok) break;
    const a = await r.json().catch(() => []);
    // deno-lint-ignore no-explicit-any
    a.forEach((x: any) => out.push({ title: String(x.title?.rendered || '').replace(/&#8211;/g, '-').replace(/&quot;/g, '"').replace(/&#[0-9]+;/g, ''), link: x.link }));
    if (a.length < 100) break;
  }
  return out;
}
const normUrl = (u: string) => { try { const x = new URL(u, SITE); return decodeURIComponent(x.pathname).replace(/\/+$/, '').toLowerCase(); } catch { return ''; } };

// the automatic checks: bar rules, structure, and every link (internal links must exist, external ones must open)
async function check(html: string, index: { link: string }[]) {
  const issues: string[] = [], fixes: string[] = [];
  const text = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  for (const [re, label] of BANNED) { const m = text.match(re); if (m) issues.push(`${label}: "${m[0]}"`); }
  if (!html.includes('lvbl-article')) issues.push('חסר העוטף lvbl-article');
  if (!html.includes('lvbl-faq')) issues.push('חסר פרק שאלות ותשובות');
  if (!html.includes('application/ld+json')) issues.push('חסרה סכמה JSON-LD');
  if (!html.includes('citation-ref')) issues.push('חסרות הפניות למקורות');
  if (!html.includes('tel:09-8613413')) issues.push('חסרה רצועת הטלפון');
  const words = text.split(/\s+/).filter(Boolean).length;
  if (words < 1200) issues.push(`המאמר קצר מדי (${words} מילים), צריך 1,800 לפחות`);
  // links
  const known = new Set(index.map(x => normUrl(x.link)));
  const seen = new Set<string>(); let out = html; const ext: string[] = [];
  const anchors = [...html.matchAll(/<a\s[^>]*href="([^"#][^"]*)"[^>]*>([\s\S]*?)<\/a>/g)];
  const unwrap = (full: string, inner: string) => { out = out.replace(full, inner); };
  for (const a of anchors) {
    const [full, href, inner] = a;
    if (/^tel:|^mailto:/.test(href)) continue;
    if (href.startsWith(SITE) || href.startsWith('/')) {
      const n = normUrl(href);
      if (n === '' || n === '/') continue;
      if (/צור-קשר|contact/.test(n)) continue;
      if (!known.has(n)) { unwrap(full, inner); fixes.push(`קישור פנימי שלא קיים הוסר: ${href}`); continue; }
      if (seen.has(n)) { unwrap(full, inner); fixes.push(`קישור פנימי כפול הוסר: ${href}`); continue; }
      seen.add(n);
    } else if (/^https?:/.test(href)) ext.push(href);
  }
  const bad = new Set<string>();
  await Promise.all([...new Set(ext)].slice(0, 30).map(async u => {
    const ok = async (m: string) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), 9000); try { const r = await fetch(u, { method: m, redirect: 'follow', signal: c.signal, headers: { 'user-agent': 'Mozilla/5.0 (link check)' } }); return r.status < 400 || r.status === 403 || r.status === 429; } catch { return false; } finally { clearTimeout(t); } };
    if (!(await ok('HEAD')) && !(await ok('GET'))) bad.add(u);
  }));
  for (const a of anchors) if (bad.has(a[1])) { unwrap(a[0], a[2]); fixes.push(`מקור שלא נפתח, הקישור הוסר: ${a[1]}`); }
  if (seen.size < 2) issues.push('פחות משני קישורים פנימיים תקינים, צריך 3 עד 5 מתוך הרשימה');
  // exactly 5 questions in the FAQ (Yakir's rule)
  const faq = (html.match(/lvbl-faq-item/g) || []).length;
  if (faq !== 5) issues.push(`בשאלות ותשובות צריך בדיוק 5 שאלות (יש ${faq})`);
  // sources only from neutral sites: never other lawyers' or law firms' websites
  const blocked = new Set<string>(((await doc('artcfg', 'blocked-sources'))?.hosts || []).map((h: string) => h.replace(/^www\./, '')));
  const lawHosts = new Set<string>();
  for (const u of new Set(ext)) {
    let h = ''; try { h = new URL(u).hostname.replace(/^www\./, ''); } catch { continue; }
    if (/(^|\.)gov\.il$/.test(h) || NEUTRAL.test(h)) continue;
    if (blocked.has(h) || /law|lawyer|attorney|advocate|adv-|-adv|orech-din|orechdin/i.test(h)) lawHosts.add(h);
  }
  if (lawHosts.size) issues.push(`מקורות מאתרים של עורכי דין (אסור, להחליף במקור ניטרלי): ${[...lawHosts].join(', ')}`);
  return { html: out, issues, fixes, words };
}

const basic = (u: string, p: string) => 'Basic ' + btoa(String.fromCharCode(...new TextEncoder().encode(`${u}:${p.replace(/\s+/g, '')}`)));
const ilDate = (days: number) => new Date(Date.now() + days * 864e5).toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });

// the article's cover image: made here automatically from the title; it goes into the WordPress media library with
// an alt text, and becomes the post's featured image
// deno-lint-ignore no-explicit-any
async function coverBytes(job: any): Promise<{ bytes: Uint8Array; type: string; ext: string }> {
  // 8.10.2026: always the office cover engine (safe-zone layout), never a separately made image, so every card looks the same
  await coverInit();
  const p = coverPick(`${job.meta.title} ${job.meta.keyword || ''}`);
  return { bytes: coverRender(String(job.meta.coverTitle || job.meta.title).slice(0, 90), job.meta.coverKicker || p.kicker, job.meta.coverIcon || p.icon), type: 'image/png', ext: 'png' };
}
// deno-lint-ignore no-explicit-any
async function uploadCover(auth: string, job: any): Promise<number> {
  const { bytes, type, ext } = await coverBytes(job);
  const name = `${job.meta.slug || 'article'}-cover.${ext}`;
  const r = await fetch(`${SITE}/wp-json/wp/v2/media`, { method: 'POST', headers: { authorization: auth, 'content-type': type, 'content-disposition': `attachment; filename="${name}"` }, body: new Blob([bytes as BlobPart]) });
  // deno-lint-ignore no-explicit-any
  const m: any = await r.json().catch(() => ({}));
  if (!r.ok || !m.id) return 0;
  await fetch(`${SITE}/wp-json/wp/v2/media/${m.id}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify({ alt_text: job.meta.coverAlt || job.meta.keyword || job.meta.title, title: job.meta.title }) }).catch(() => null);
  return m.id;
}

// deno-lint-ignore no-explicit-any
async function publish(id: string, job: any) {
  const user = env('WP_USER'), pass = env('WP_APP_PASSWORD');
  if (!user || !pass) return false;
  const ex = await doc('artcfg', 'exemplar');
  const auth = basic(user, pass);
  const when = `${ilDate(1)}T06:05:00`;
  const media = job.wpMedia || await uploadCover(auth, job).catch((e) => { console.error('cover', e); return 0; });
  if (media && !job.wpMedia) await merge('artjob', id, { wpMedia: media });
  // 19.10.2026 (Yakir): every new article must have a featured image in the office style, with Hebrew alt text.
  // Never publish without one: hold the article as 'ready' and try again on the next hourly run.
  if (!media) {
    await merge('artjob', id, { status: 'ready', publishError: 'no featured image (cover failed)', coverFailAt: job.coverFailAt || new Date().toISOString() });
    if (!job.coverFailAt) await tg(`⚠️ התמונה הראשית של "${job.meta.title}" לא נוצרה, ולכן המאמר לא עולה לאתר. מאמר לא עולה בלי תמונה. אנסה שוב בכל שעה.`);
    return false;
  }
  // SEO title, meta description and focus keyword for Yoast
  const seo = { _yoast_wpseo_title: job.meta.metaTitle || '', _yoast_wpseo_metadesc: job.meta.metaDescription || '', _yoast_wpseo_focuskw: job.meta.keyword || '' };
  // an article that was stopped and fixed goes back into its existing post, never a duplicate
  const r = await fetch(`${SITE}/wp-json/wp/v2/posts${job.wpId ? '/' + job.wpId : ''}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ title: job.meta.title, slug: job.meta.slug || undefined, status: 'future', date: when, excerpt: job.meta.excerpt || job.meta.metaDescription || '',
      content: `${ex ? ex.style : ''}\n${job.html}`, categories: job.categories || [1, 10], featured_media: media || undefined, meta: seo }) });
  // deno-lint-ignore no-explicit-any
  const p: any = await r.json().catch(() => ({}));
  if (!r.ok || !p.id) { await merge('artjob', id, { status: 'ready', publishError: `${r.status} ${String(p.message || '').slice(0, 160)}` }); await tg(`⚠️ המאמר "${job.meta.title}" מוכן, אבל העלאה לאתר נכשלה (${r.status}). אנסה שוב בשעה הבאה.`); return false; }
  const token = crypto.randomUUID().replace(/-/g, '');
  await merge('artjob', id, { status: 'scheduled', wpId: p.id, wpLink: p.link, publishAt: when, cancelToken: token, publishError: '' });
  const stop = `${env('SUPABASE_URL')}/functions/v1/articles?cancel=${token}`;
  await tg(`📰 מאמר חדש יעלה לאתר מחר ב-06:05\n\n${job.meta.title}\n${job.words ? `${job.words} מילים · ` : ''}עבר בדיקת כללי לשכה וקישורים${job.fixes?.length ? ` (${job.fixes.length} תיקונים אוטומטיים)` : ''}.\n\nאם לא מתאים, לחיצה על "עצירה" מחזירה אותו לטיוטה.`,
    [[{ text: '👁 תצוגה מקדימה', url: `${SITE}/?p=${p.id}&preview=true` }], [{ text: '⛔ עצירת הפרסום', url: stop }]]);
  return true;
}

// ---- upgrades of existing posts: never go live without Yakir's approval ----
// the checked article goes into a hidden draft for preview; the Telegram message has approve / reject buttons.
// on approval the original post (same address) gets the new content; its old content is kept in docs artbak/<id>.
// deno-lint-ignore no-explicit-any
async function previewUpgrade(id: string, job: any) {
  const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
  const ex = await doc('artcfg', 'exemplar');
  const r = await fetch(`${SITE}/wp-json/wp/v2/posts${job.draftId ? '/' + job.draftId : ''}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ title: `[שדרוג לאישור] ${job.meta.title}`, status: 'draft', content: `${ex ? ex.style : ''}\n${job.html}`, categories: job.categories || [1, 10] }) });
  // deno-lint-ignore no-explicit-any
  const p: any = await r.json().catch(() => ({}));
  if (!r.ok || !p.id) { await merge('artjob', id, { status: 'ready', publishError: `draft ${r.status} ${String(p.message || '').slice(0, 120)}` }); return false; }
  const ok = crypto.randomUUID().replace(/-/g, ''), no = crypto.randomUUID().replace(/-/g, '');
  await merge('artjob', id, { status: 'awaiting', draftId: p.id, approveToken: ok, cancelToken: no, previewAt: new Date().toISOString(), publishError: '' });
  const base = `${env('SUPABASE_URL')}/functions/v1/articles`;
  await tg(`🛠 שדרוג מאמר קיים מוכן לאישורך\n\n${job.meta.title}\n${job.words ? `${job.words} מילים · ` : ''}${job.upgradeNote || ''}\n\nשום דבר לא השתנה באתר עד שתאשר. באישור, המאמר הקיים (אותה כתובת) יקבל את התוכן החדש.`,
    [[{ text: '👁 תצוגה מקדימה', url: `${SITE}/?p=${p.id}&preview=true` }], [{ text: '✅ אישור והעלאה', url: `${base}?approve=${ok}` }], [{ text: '⛔ לא לשנות', url: `${base}?cancel=${no}` }]]);
  return true;
}
async function approveUpgrade(token: string) {
  const page = (msg: string) => new Response(msg, { headers: { ...cors, 'content-type': 'text/plain; charset=utf-8' } });
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'artjob').eq('data->>approveToken', token).limit(1);
  const row = data && data[0];
  if (!row) return page('הקישור לא תקף, או שהשדרוג כבר טופל.');
  const job = row.data;
  if (job.status === 'upgraded') return page('השדרוג כבר עלה לאתר.');
  if (job.status !== 'awaiting') return page('השדרוג הזה כבר לא ממתין לאישור.');
  const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
  const old = await fetch(`${SITE}/wp-json/wp/v2/posts/${job.targetId}?context=edit&_fields=id,title,content,excerpt,featured_media,meta,link`, { headers: { authorization: auth } });
  // deno-lint-ignore no-explicit-any
  const o: any = await old.json().catch(() => ({}));
  if (!old.ok || !o.id) return page('לא הצלחתי לקרוא את המאמר הקיים. נסה שוב בעוד דקה.');
  await merge('artbak', String(job.targetId), { at: new Date().toISOString(), title: o.title?.raw, content: o.content?.raw, excerpt: o.excerpt?.raw, featured: o.featured_media, meta: o.meta, jobId: row.id });
  let media = o.featured_media || 0;
  if (!media) media = await uploadCover(auth, job).catch(() => 0);
  // 19.10.2026 (Yakir): no article on the site without a featured image
  if (!media) return page('התמונה הראשית לא נוצרה, ולכן השדרוג לא עלה. שום דבר לא השתנה. נסה שוב בעוד כמה דקות.');
  const ex = await doc('artcfg', 'exemplar');
  const seo = { _yoast_wpseo_title: job.meta.metaTitle || '', _yoast_wpseo_metadesc: job.meta.metaDescription || '', _yoast_wpseo_focuskw: job.meta.keyword || '' };
  const r = await fetch(`${SITE}/wp-json/wp/v2/posts/${job.targetId}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' },
    body: JSON.stringify({ title: job.meta.title, content: `${ex ? ex.style : ''}\n${job.html}`, excerpt: job.meta.excerpt || job.meta.metaDescription || '', featured_media: media || undefined, meta: seo }) });
  if (!r.ok) return page('העדכון נכשל. שום דבר לא השתנה. נסה שוב בעוד דקה.');
  if (job.draftId) await fetch(`${SITE}/wp-json/wp/v2/posts/${job.draftId}?force=true`, { method: 'DELETE', headers: { authorization: auth } }).catch(() => null);
  await merge('artjob', row.id, { status: 'upgraded', upgradedAt: new Date().toISOString(), wpId: job.targetId, wpLink: o.link, wpMedia: media || null });
  await tg(`✅ השדרוג עלה לאתר: ${job.meta.title}\n${o.link}`);
  return page('✓ השדרוג עלה לאתר. אפשר לסגור את הדף.');
}

async function collect() {
  const { data: jobs } = await admin().from('docs').select('id,data').eq('coll', 'artjob').in('data->>status', ['ready', 'written']).limit(5);
  const done: string[] = [];
  let index: { title: string; link: string }[] | null = null;
  for (const row of jobs || []) {
    const id = row.id, job = row.data;
    if (job.status === 'ready') { if (await (job.mode === 'upgrade' ? previewUpgrade(id, job) : publish(id, job))) done.push(id); continue; }
    if (!job.html || !job.meta?.title) { await merge('artjob', id, { status: 'held', issues: ['המאמר נשמר בלי תוכן או בלי כותרת'], heldAt: new Date().toISOString() }); continue; }
    const meta = job.meta;
    meta.slug = String(meta.slug || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
    for (const k of Object.keys(meta)) if (typeof meta[k] === 'string') meta[k] = meta[k].replace(/\s*[—–]\s*/g, ' - ');
    const html = String(job.html).replace(/^```html?\s*/i, '').replace(/```\s*$/, '').replace(/\s*[—–]\s*/g, (m: string) => (/\s/.test(m) ? ' - ' : '-'));
    index = index || await siteIndex();
    const c = await check(html, index);
    const fixes = (job.fixes || []).concat(c.fixes);
    // SEO basics the writer must deliver with every article
    const mt = String(meta.metaTitle || ''), md = String(meta.metaDescription || '');
    if (!mt || mt.length > 65) c.issues.push(`כותרת SEO (metaTitle) חסרה או ארוכה מ-60 תווים (${mt.length})`);
    if (md.length < 110 || md.length > 165) c.issues.push(`תיאור מטא (metaDescription) צריך 140 עד 155 תווים (${md.length})`);
    if (!meta.keyword) c.issues.push('חסר ביטוי מפתח (keyword)');
    if (!meta.coverAlt && job.mode !== 'upgrade') c.issues.push('חסר תיאור לתמונה הראשית (coverAlt)');
    // problems go back to the writer, who fixes them on its next pass
    if (c.issues.length) { await merge('artjob', id, { status: 'held', meta, html: c.html, issues: c.issues, fixes, heldAt: new Date().toISOString() }); continue; }
    const ready = { status: 'ready', meta, html: c.html, issues: [], fixes, words: c.words, readyAt: new Date().toISOString() };
    await merge('artjob', id, ready);
    if (await (job.mode === 'upgrade' ? previewUpgrade(id, Object.assign({}, job, ready)) : publish(id, Object.assign({}, job, ready)))) done.push(id);
    else if (!env('WP_USER')) await tg(`📰 מאמר חדש מוכן: ${meta.title}\nהוא יעלה לאתר אוטומטית ברגע שהאתר יחובר למערכת.`);
  }
  return { checked: (jobs || []).length, published: done };
}

async function cancel(token: string) {
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'artjob').eq('data->>cancelToken', token).limit(1);
  const row = data && data[0];
  const page = (msg: string) => new Response(msg, { headers: { ...cors, 'content-type': 'text/plain; charset=utf-8' } });
  if (!row) return page('הקישור לא תקף, או שהמאמר כבר טופל.');
  if (row.data.status === 'cancelled') return page('הפרסום כבר נעצר. המאמר נשמר כטיוטה באתר.');
  const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
  if (row.data.mode === 'upgrade') {
    if (row.data.draftId) await fetch(`${SITE}/wp-json/wp/v2/posts/${row.data.draftId}?force=true`, { method: 'DELETE', headers: { authorization: auth } }).catch(() => null);
    await merge('artjob', row.id, { status: 'rejected', cancelledAt: new Date().toISOString() });
    await tg(`⛔ השדרוג של "${row.data.meta?.title}" נדחה. המאמר באתר נשאר כמו שהוא.`);
    return page('✓ השדרוג נדחה. המאמר באתר לא השתנה.');
  }
  const r = await fetch(`${SITE}/wp-json/wp/v2/posts/${row.data.wpId}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'draft' }) });
  if (!r.ok) return page('לא הצלחתי לעצור את הפרסום. נסה שוב בעוד דקה.');
  await merge('artjob', row.id, { status: 'cancelled', cancelledAt: new Date().toISOString() });
  await tg(`⛔ הפרסום של "${row.data.meta?.title}" נעצר. המאמר נשמר כטיוטה באתר.`);
  return page('✓ הפרסום נעצר. המאמר נשמר כטיוטה באתר, ואפשר לסגור את הדף.');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url);
  const tok = url.searchParams.get('cancel');
  if (tok) return await cancel(tok.replace(/[^a-f0-9]/g, ''));
  const apr = url.searchParams.get('approve');
  if (apr) return await approveUpgrade(apr.replace(/[^a-f0-9]/g, ''));
  const secret = env('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) return json({ error: 'unauthorized' }, 401);
  try {
    const step = url.searchParams.get('step');
    if (step === 'collect') return json(await collect());
    if (step === 'recover') {
      const b = await req.json().catch(() => ({}));
      const pid = Number(b.postId) || 0;
      const { data } = await admin().from('docs').select('id,data').eq('coll', 'artjob').eq('data->>wpId', String(pid)).limit(1);
      const row = data && data[0]; if (!row) return json({ ok: false, error: 'no job for post ' + pid });
      const auth = basic(env('WP_USER'), env('WP_APP_PASSWORD'));
      const media = await uploadCover(auth, row.data);
      if (!media) return json({ ok: false, error: 'upload failed' });
      const r = await fetch(`${SITE}/wp-json/wp/v2/posts/${pid}`, { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify({ featured_media: media }) });
      await merge('artjob', row.id, { wpMedia: media, coverPrev: row.data.wpMedia || null, recoveredAt: new Date().toISOString() });
      return json({ ok: r.ok, media, post: pid });
    }
    if (step === 'cover-test') {
      const b = await req.json().catch(() => ({}));
      const c = await coverBytes({ meta: { title: b.title || 'בדיקת תמונה ראשית למאמר', keyword: b.keyword || '' } });
      const { error } = await admin().storage.from('files').upload('covers/_test.png', c.bytes, { upsert: true, contentType: c.type });
      return json({ ok: !error, error: error?.message, size: c.bytes.length });
    }
    return json({ error: 'step?' }, 400);
  } catch (e) {
    console.error(e);
    await tg('⚠️ מנוע המאמרים האוטומטי נתקל בשגיאה: ' + String((e as Error).message || e).slice(0, 300));
    return json({ ok: false, error: String((e as Error).message || e) }, 500);
  }
});
