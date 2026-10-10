// The shared publishing calendar: one page that Grok Bot reads (and anyone with the key can open).
// GET ?k=<settings/pub.key>[&fmt=json][&days=21]  -> what goes out, when, by whom, with the full text and media links.
// Rows live in docs coll "pub" (written by the office system / the weekly content task). Grok only reads.

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CH = { facebook: 'פייסבוק (העמוד העסקי)', youtube: 'יוטיוב', linkedin: 'לינקדאין', x: 'X', gbp: 'גוגל עסקי', instagram: 'אינסטגרם', tiktok: 'טיקטוק', whatsapp: 'קבוצת הוואטסאפ', newsletter: 'ניוזלטר במייל', internal: 'פנימי' };
const OWN = { grok: 'גרוק בוט', system: 'המערכת של המשרד', yakir: 'יקיר' };
const ST = { planned: 'מתוכנן', published: 'פורסם', skipped: 'בוטל', waiting: 'מחכה לחיבור' };
const DAYS = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
const DEFAULT_RULES = 'מפרסמים רק פריטים שמסומנים "גרוק בוט", בתאריך, בשעה ובערוצים שמופיעים, עם הטקסט והקבצים שמופיעים כאן בדיוק. אם חסר קובץ או טקסט, לא מפרסמים ומדווחים ליקיר. אין לפרסם בקבוצות פייסבוק.';
export function start(createClient) { Deno.serve(async (req) => {
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const url = new URL(req.url);
  const cfg = (await sb.from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle()).data?.data || {};
  if (!cfg.key || url.searchParams.get('k') !== cfg.key) return new Response('not found', { status: 404 });
  const SITE = cfg.site || 'https://dabullaw-glitch.github.io/dabul-office/portal.html';
  const MEDIA = cfg.media || 'https://dabullaw-glitch.github.io/dabul-office/media/';
  const fill = (s) => String(s || '').split('{SITE}').join(SITE).split('{MEDIA}').join(MEDIA);
  const days = Math.min(60, Math.max(1, Number(url.searchParams.get('days') || 21)));
  const now = new Date(Date.now() + 3 * 3600e3); // Israel, close enough for a date window
  const from = new Date(now.getTime() - 2 * 864e5).toISOString().slice(0, 10), to = new Date(now.getTime() + days * 864e5).toISOString().slice(0, 10);
  const { data } = await sb.from('docs').select('id,data').eq('coll', 'pub').gte('data->>at', from).lte('data->>at', to + 'T23:59');
  const rows = (data || []).map((r) => ({ id: r.id, ...r.data })).filter((r) => r.status !== 'skipped').sort((a, b) => String(a.at).localeCompare(String(b.at)));
  const out = rows.map((r) => ({ ...r, text: fill(r.text), textEn: fill(r.textEn), textFr: fill(r.textFr), link: fill(r.link), media: (r.media || []).map(fill) }));
  const RULES = String(cfg.grokRules || DEFAULT_RULES);
  if (url.searchParams.get('fmt') === 'json') return Response.json({ updated: new Date().toISOString(), timezone: 'Asia/Jerusalem', grokRules: RULES, rulesVersion: cfg.grokRulesVersion || '', rows: out }, { headers: { 'x-robots-tag': 'noindex' } });
  const day = (at) => { const d = new Date(at.slice(0, 10) + 'T12:00:00Z'); return `יום ${DAYS[d.getUTCDay()]} ${at.slice(8, 10)}/${at.slice(5, 7)}`; };
  let last = '';
  const body = out.map((r) => {
    const d = r.at.slice(0, 10); const h = d !== last ? `<h2>${day(r.at)}</h2>` : ''; last = d;
    return `${h}<article class="${esc(r.owner)}" id="${esc(r.id)}"><div class="top"><b class="t">${esc(r.at.slice(11, 16))}</b><span class="own">${esc(OWN[r.owner] || r.owner)}</span><span>${(r.channels || []).map((c) => esc(CH[c] || c)).join(' · ')}</span><span class="st">${esc(ST[r.status] || r.status)}</span></div>
<h3>${esc(r.title)}</h3>${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
${r.media?.length ? `<p class="media">קבצים: ${r.media.map((m) => `<a href="${esc(m)}">${esc(m.split('/').pop() || m)}</a>`).join(' · ')}</p>` : ''}
${r.file ? `<p class="media">הקובץ בתיקייה "סרטונים גרוק בוט/לפרסום": <b>${esc(r.file)}</b></p>` : ''}
${r.ytTitle ? `<div class="yt"><b>ליוטיוב:</b><br>כותרת: ${esc(r.ytTitle)}<br>תגיות: ${esc(r.ytTags || '')}${r.ytDesc ? `<pre>${esc(fill(r.ytDesc))}</pre>` : '<br>תיאור: הטקסט לפרסום שבפריט הזה.'}</div>` : ''}
${r.text ? `<details open><summary>הטקסט לפרסום (עברית)</summary><pre>${esc(r.text)}</pre></details>` : ''}
${r.textEn ? `<details><summary>English version (LinkedIn / comments)</summary><pre dir="ltr">${esc(r.textEn)}</pre></details>` : ''}
${r.textFr ? `<details><summary>Version française</summary><pre dir="ltr">${esc(r.textFr)}</pre></details>` : ''}
<p class="id">מזהה: ${esc(r.id)}</p></article>`;
  }).join('\n');
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>לוח הפרסום המשותף · משרד עו״ד יקיר דבול</title>
<style>body{margin:0;background:#f4f3ef;color:#1c1b19;font:16px/1.6 Arial,sans-serif}main{max-width:860px;margin:0 auto;padding:20px 16px 60px}h1{font-size:24px;margin:0 0 6px}.rules{background:#fff;border-right:4px solid #a8873f;padding:12px 16px;border-radius:8px;font-size:15px}h2{margin:28px 0 10px;font-size:19px;border-bottom:2px solid #e2dccb;padding-bottom:4px}article{background:#fff;border-radius:10px;padding:14px 16px;margin:0 0 12px;border-right:5px solid #999}article.grok{border-color:#1d6fd6}article.system{border-color:#a8873f}.top{display:flex;flex-wrap:wrap;gap:10px;align-items:center;font-size:14px;color:#555}.t{font-size:18px;color:#111}.own{background:#111;color:#fff;border-radius:999px;padding:1px 10px}.grok .own{background:#1d6fd6}.system .own{background:#a8873f}.st{margin-right:auto;font-weight:bold}h3{margin:8px 0 4px;font-size:17px}.note{color:#6b5a2e;margin:4px 0}pre{white-space:pre-wrap;font:15px/1.6 Arial,sans-serif;background:#faf9f6;padding:10px;border-radius:6px;margin:6px 0}.media a{word-break:break-all}.yt{background:#eef4fd;border-radius:8px;padding:8px 12px;margin:6px 0;font-size:15px}.rules pre{background:none;padding:0}.id{font-size:12px;color:#999;margin:4px 0 0}summary{cursor:pointer;font-weight:bold;font-size:14px}</style></head><body><main>
<h1>לוח הפרסום המשותף</h1><p>מתעדכן אוטומטית. עודכן: ${esc(new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' }))} · כל השעות לפי שעון ישראל.</p>
<div class="rules"><b>הוראה קבועה לגרוק בוט${cfg.grokRulesVersion ? ` (גרסה ${esc(cfg.grokRulesVersion)})` : ''}:</b><pre>${esc(RULES)}</pre></div>
${body || '<p>אין פריטים בטווח הזה.</p>'}</main></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'no-cache' } });
}); }
