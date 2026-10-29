// hns-cols (29.10.2026): the management side of the opinion columns of nws.co.il (approved by Yakir on 29.10.2026).
// SERVER ONLY: every call needs x-cron-secret. It is called by hns-panel (after Yakir's own session check: password + Telegram code)
// and by hns-publish (Yakir's Telegram buttons hns:col:ok:<id> / hns:col:ret:<id>). Writers never reach it: their area uses the
// separate function hns-writer with its own credentials.
// Writers (table hns_writers):
//   {action:'writers'}                                   every writer with counts of columns
//   {action:'writer_save', id?, name, email, role, bio, sections[], photo?:{data,type}}   add (generates the personal code and returns
//       it ONCE as "code"; only a PBKDF2-SHA256 hash with a random salt is kept) or edit a writer. photo: base64 JPEG, PNG or WebP up to
//       3 MB, stored public in nws-img/writers/ (it is shown on the site).
//   {action:'writer_code', id}                           a new code (returned once); the old one stops working and every session ends
//   {action:'writer_block', id, blocked}                 block or unblock; blocking ends every session (published columns stay)
// Columns (table hns_columns):
//   {action:'cols', status?}                             'waiting' (default: waiting and checking) | 'returned' | 'published' | 'draft' | 'all'
//   {action:'col_get', id}                               a column with the writer, the checker's flags and a signed link to the image
//   {action:'col_edit', id, title?, dek?, body?}         Yakir fixes the title or a typo before publishing (only a waiting column)
//   {action:'col_publish', id, by?}                      publish through hns-publish ('create' with kind 'opinion', author, author_role,
//       extras.writer_id/column_id; every guard of hns-publish applies). The image is copied to the public bucket nws-img.
//   {action:'col_return', id, note, by?}                 back to the writer with a note (status 'returned'; the writer can edit again)
//   {action:'decide', data:'hns:col:ok:<id>'|'hns:col:ret:<id>', cq?}   a Telegram button tap (answers the tap, edits the message)
// Never a long or medium dash in saved text.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const FN = `${Deno.env.get('SUPABASE_URL')}/functions/v1`;
const S: Record<string, string> = {};
async function secrets() {
  const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY', 'NWS_MAIL_FROM']);
  for (const r of data || []) S[(r as Any).k] = String((r as Any).v ?? '').trim();
}
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const clean = (s: unknown) => String(s ?? '').replace(/\r/g, '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/[ \t]{2,}/g, ' ').trim();
const strip = (s: string) => s.replace(/<[^>]{0,300}>/g, ' ').replace(/\[([^\]\n]{1,200})\]\([^)\s]{1,500}\)/g, '$1');
const oneLine = (s: unknown, n: number) => clean(strip(String(s ?? '')).replace(/\s*\n\s*/g, ' ')).replace(/\*\*/g, '').slice(0, n);
// the same body rules as hns-writer
function blocksOf(v: unknown): string[] {
  const raw = Array.isArray(v) ? v.map((x) => String(x ?? '')).join('\n\n') : String(v ?? '');
  const out: string[] = [];
  for (const p0 of strip(raw.replace(/\r/g, '')).split(/\n[ \t]*\n/)) {
    let p = clean(p0.split('\n').map((l) => l.trim()).filter(Boolean).join(' '));
    if (!p) continue;
    let kind = '';
    if (/^#{1,6}\s*/.test(p)) { kind = '## '; p = p.replace(/^#{1,6}\s*/, ''); }
    else if (/^>\s*/.test(p)) { kind = '> '; p = p.replace(/^>\s*/, ''); }
    if (kind === '## ' || (p.match(/\*\*/g) || []).length % 2) p = p.replace(/\*\*/g, '');
    p = p.replace(/\*\*\s*\*\*/g, '').trim();
    if (p) out.push(kind + p.slice(0, kind === '## ' ? 140 : 3000));
  }
  return out.slice(0, 80);
}
const SEC_HE: Record<string, string> = { national: 'חדשות ארציות', city: 'העירייה', police: 'משטרה ופלילים', realestate: 'נדל״ן ותכנון', sports: 'ספורט', transport: 'תחבורה',
  community: 'קהילה וחינוך', health: 'בריאות', leisure: 'תרבות ופנאי', sharon: 'השרון', tourism: 'תיירות', law: 'חוק ומשפט' };
const SLUG: Record<string, string> = { national: 'israel', city: 'city', realestate: 'real-estate', community: 'community', sports: 'sports', leisure: 'events', sharon: 'sharon',
  tourism: 'tourism', law: 'law', police: 'police', transport: 'transport', health: 'health', blog: 'blog', flash: 'flash' };
const tg = (method: string, body: Any) => fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body), signal: AbortSignal.timeout(15000) }).then((r) => r.json()).catch((e) => ({ ok: false, description: String(e) }));
const call = (fn: string, body: Any) => fetch(`${FN}/${fn}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': S.CRON_SECRET },
  body: JSON.stringify(body), signal: AbortSignal.timeout(60000) }).then((r) => r.json()).catch((e) => ({ ok: false, error: String(e) }));

// ---------- codes ----------
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const ITER = 210000;
async function pbkdf2(pw: string, salt: Uint8Array, iter: number) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as Uint8Array<ArrayBuffer>, iterations: iter }, key, 256));
}
// 12 characters from 32 letters and digits that are not confused with each other (60 bits), shown as XXXX-XXXX-XXXX
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function newCode() {
  const r = crypto.getRandomValues(new Uint8Array(12));
  const s = [...r].map((x) => ABC[x % 32]).join('');
  return { plain: s, shown: `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}` };
}
async function codeFields(plain: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { code_hash: b64(await pbkdf2(plain, salt, ITER)), code_salt: b64(salt), code_iter: ITER, code_set_at: new Date().toISOString() };
}
const endSessions = (wid: number) => sb.from('hns_writer_sessions').update({ expires_at: new Date().toISOString() }).eq('writer_id', wid).gt('expires_at', new Date().toISOString());

// ---------- writers ----------
function sniff(u: Uint8Array) {
  if (u.length > 3 && u[0] === 0xFF && u[1] === 0xD8 && u[2] === 0xFF) return { type: 'image/jpeg', ext: 'jpg' };
  if (u.length > 8 && u[0] === 0x89 && u[1] === 0x50 && u[2] === 0x4E && u[3] === 0x47) return { type: 'image/png', ext: 'png' };
  if (u.length > 12 && String.fromCharCode(...u.slice(0, 4)) === 'RIFF' && String.fromCharCode(...u.slice(8, 12)) === 'WEBP') return { type: 'image/webp', ext: 'webp' };
  return null;
}
const rnd = () => b64(crypto.getRandomValues(new Uint8Array(6))).replace(/[+/=]/g, 'x');
async function writers() {
  const { data } = await sb.from('hns_writers').select('id,created_at,updated_at,name,email,role,bio,photo_url,sections,status,blocked_at,last_login_at,code_set_at,is_test').order('id');
  const { data: cols } = await sb.from('hns_columns').select('writer_id,status');
  const cnt: Record<number, Record<string, number>> = {};
  for (const c of cols || []) { const o = (cnt[c.writer_id] ||= {}); o[c.status] = (o[c.status] || 0) + 1; }
  return { ok: true, sections: Object.entries(SEC_HE).map(([key, name]) => ({ key, name })), writers: (data || []).map((w: Any) => ({ ...w, counts: cnt[w.id] || {} })) };
}
async function writerSave(b: Any) {
  const name = oneLine(b.name, 80), email = String(b.email ?? '').trim().toLowerCase().slice(0, 200), role = oneLine(b.role, 80), bio = oneLine(b.bio, 600);
  const sections = [...new Set((Array.isArray(b.sections) ? b.sections : []).map(String).filter((k: string) => SEC_HE[k]))];
  if (name.length < 2) return { ok: false, error: 'חסר שם' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: 'המייל לא תקין' };
  if (!sections.length) return { ok: false, error: 'בחרו לפחות מדור אחד שבו הכותב יכול לכתוב' };
  if (/https?:\/\/|www\./i.test(`${role} ${bio}`)) return { ok: false, error: 'בלי קישורים בתפקיד או בתיאור (אין באתר קישור לאתר או לעסק של הכותב)' };
  const { data: dup } = await sb.from('hns_writers').select('id').eq('email', email).maybeSingle();
  if (dup && dup.id !== Number(b.id || 0)) return { ok: false, error: 'כבר יש כותב עם המייל הזה' };
  const patch: Any = { name, email, role: role || null, bio: bio || null, sections, updated_at: new Date().toISOString() };
  if (b.is_test !== undefined) patch.is_test = !!b.is_test;
  let id = Number(b.id || 0), code = '';
  if (id) {
    const { data, error } = await sb.from('hns_writers').update(patch).eq('id', id).select('id').maybeSingle();
    if (error || !data) return { ok: false, error: 'השמירה נכשלה' };
  } else {
    const c = newCode(); code = c.shown;
    const { data, error } = await sb.from('hns_writers').insert({ ...patch, ...(await codeFields(c.plain)), status: 'active' }).select('id').single();
    if (error) return { ok: false, error: 'השמירה נכשלה' };
    id = data.id;
  }
  if (b.photo?.data) {
    const raw = String(b.photo.data).replace(/^data:[^,]{0,60},/, '');
    let bytes: Uint8Array | null = null; try { bytes = unb64(raw); } catch { /* bad file */ }
    const k = bytes && sniff(bytes);
    if (!bytes || !k || bytes.length > 3 * 1024 * 1024) return { ok: true, id, code, warning: 'הכותב נשמר, אבל התמונה לא נשמרה: רק JPG, PNG או WEBP עד 3 מגה.' };
    const path = `writers/w${id}-${rnd()}.${k.ext}`;
    const { error } = await sb.storage.from('nws-img').upload(path, bytes, { contentType: k.type, upsert: false });
    if (error) return { ok: true, id, code, warning: 'הכותב נשמר, אבל העלאת התמונה נכשלה' };
    const { data: pu } = sb.storage.from('nws-img').getPublicUrl(path);
    await sb.from('hns_writers').update({ photo_url: pu.publicUrl }).eq('id', id);
  } else if (b.photo_remove) await sb.from('hns_writers').update({ photo_url: null }).eq('id', id);
  return { ok: true, id, code };
}
async function writerCode(id: number) {
  const c = newCode();
  const { data } = await sb.from('hns_writers').update({ ...(await codeFields(c.plain)), updated_at: new Date().toISOString() }).eq('id', id).select('id').maybeSingle();
  if (!data) return { ok: false, error: 'הכותב לא נמצא' };
  await endSessions(id);
  return { ok: true, id, code: c.shown };
}
async function writerBlock(id: number, blocked: boolean) {
  const now = new Date().toISOString();
  const { data } = await sb.from('hns_writers').update({ status: blocked ? 'blocked' : 'active', blocked_at: blocked ? now : null, updated_at: now }).eq('id', id).select('id').maybeSingle();
  if (!data) return { ok: false, error: 'הכותב לא נמצא' };
  if (blocked) await endSessions(id);
  return { ok: true, id, status: blocked ? 'blocked' : 'active' };
}

// ---------- columns ----------
const hist = (c: Any, what: string, by: string, extra: Any = {}) => [...(Array.isArray(c?.history) ? c.history : []), { at: new Date().toISOString(), what, by, ...extra }].slice(-40);
async function cols(status: string) {
  let q = sb.from('hns_columns').select('id,writer_id,created_at,updated_at,status,section,title,dek,image_path,check_result,submitted_at,returned_at,return_note,story_id,published_at').order('id', { ascending: false }).limit(150);
  if (status === 'waiting' || !status) q = q.in('status', ['waiting', 'checking']);
  else if (['returned', 'published', 'draft'].includes(status)) q = q.eq('status', status);
  const { data } = await q;
  const ids = [...new Set((data || []).map((c: Any) => c.writer_id))];
  const { data: ws } = ids.length ? await sb.from('hns_writers').select('id,name,role,is_test').in('id', ids) : { data: [] };
  const wm = Object.fromEntries((ws || []).map((w: Any) => [w.id, w]));
  return { ok: true, columns: (data || []).map((c: Any) => ({ ...c, image_path: undefined, has_image: !!c.image_path, writer: wm[c.writer_id] || null, section_he: SEC_HE[c.section] || c.section,
    flags: (c.check_result?.flags || []).length, high: (c.check_result?.flags || []).filter((f: Any) => f.level === 'high').length, check_result: undefined,
    url: c.story_id ? `/${SLUG[c.section] || 'city'}/n${c.story_id}/` : '' })) };
}
async function colGet(id: number) {
  const { data: c } = await sb.from('hns_columns').select('*').eq('id', id).maybeSingle();
  if (!c) return { ok: false, error: 'הטור לא נמצא' };
  const { data: w } = await sb.from('hns_writers').select('id,name,email,role,bio,photo_url,status,is_test').eq('id', c.writer_id).maybeSingle();
  let image_url = '';
  if (c.image_path) { const { data: u } = await sb.storage.from('nws-columns').createSignedUrl(c.image_path, 3600); image_url = u?.signedUrl || ''; }
  let story: Any = null;
  if (c.story_id) { const { data: st } = await sb.from('hns_stories').select('id,state,section,published_at').eq('id', c.story_id).maybeSingle(); story = st; }
  return { ok: true, column: { ...c, image_path: undefined, image_url, section_he: SEC_HE[c.section] || c.section }, writer: w, story };
}
async function colEdit(b: Any) {
  const id = Number(b.id);
  const { data: c } = await sb.from('hns_columns').select('*').eq('id', id).maybeSingle();
  if (!c) return { ok: false, error: 'הטור לא נמצא' };
  if (c.status !== 'waiting') return { ok: false, error: 'אפשר לתקן רק טור שממתין לאישור' };
  const patch: Any = {};
  if (b.title !== undefined) { const t = oneLine(b.title, 160); if (t.length < 8) return { ok: false, error: 'הכותרת קצרה מדי' }; patch.title = t; }
  if (b.dek !== undefined) patch.dek = oneLine(b.dek, 300) || null;
  if (b.body !== undefined) { const bl = blocksOf(b.body); if (bl.join(' ').split(/\s+/).length < 50) return { ok: false, error: 'הטקסט קצר מדי' }; patch.body = bl; }
  if (b.image_alt !== undefined) patch.image_alt = oneLine(b.image_alt, 200) || null;
  if (!Object.keys(patch).length) return { ok: true, id, same: true };
  patch.updated_at = new Date().toISOString();
  patch.history = hist(c, 'edit', 'yakir-panel', { fields: Object.keys(patch).filter((k) => !['updated_at'].includes(k)), before: { title: c.title } });
  const { data } = await sb.from('hns_columns').update(patch).eq('id', id).eq('status', 'waiting').select('id').maybeSingle();
  return data ? { ok: true, id } : { ok: false, error: 'הטור השתנה בינתיים. פתחו אותו שוב.' };
}
async function publicImage(c: Any) {
  if (!c.image_path) return '';
  const { data: blob, error } = await sb.storage.from('nws-columns').download(c.image_path);
  if (error || !blob) throw new Error('image download');
  const ext = (c.image_path.match(/\.(jpg|png|webp)$/) || [, 'jpg'])[1];
  const type = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  const path = `columns/c${c.id}-${rnd()}.${ext}`;
  const { error: e2 } = await sb.storage.from('nws-img').upload(path, new Uint8Array(await blob.arrayBuffer()), { contentType: type, upsert: false });
  if (e2) throw new Error('image upload');
  return sb.storage.from('nws-img').getPublicUrl(path).data.publicUrl;
}
async function colPublish(id: number, by: string) {
  const { data: c } = await sb.from('hns_columns').select('*').eq('id', id).maybeSingle();
  if (!c) return { ok: false, error: 'הטור לא נמצא' };
  if (c.status === 'published') return { ok: true, already: 'published', story_id: c.story_id };
  if (c.status !== 'waiting') return { ok: false, error: c.status === 'checking' ? 'הבדיקה האוטומטית עוד רצה. נסו שוב בעוד דקה.' : 'הטור לא ממתין לאישור' };
  const { data: w } = await sb.from('hns_writers').select('id,name,role,email,is_test').eq('id', c.writer_id).maybeSingle();
  if (!w) return { ok: false, error: 'הכותב לא נמצא' };
  // one publish at a time: claim the column (a claim older than 3 minutes is stale)
  const now = new Date().toISOString();
  const { data: claim } = await sb.from('hns_columns').update({ decided_by: 'publishing', updated_at: now }).eq('id', id).eq('status', 'waiting')
    .or(`decided_by.is.null,decided_by.neq.publishing,updated_at.lt."${new Date(Date.now() - 180e3).toISOString()}"`).select('id').maybeSingle();
  if (!claim) return { ok: false, error: 'הטור כבר בפרסום. רעננו בעוד רגע.' };
  const release = (extra: Any = {}) => sb.from('hns_columns').update({ decided_by: null, ...extra }).eq('id', id).eq('status', 'waiting');
  try {
    let image_url = '';
    try { image_url = await publicImage(c); } catch { await release(); return { ok: false, error: 'העתקת התמונה נכשלה. נסו שוב.' }; }
    const fields: Any = { kind: 'opinion', section: c.section, title: c.title, dek: c.dek || '', body: c.body || [], author: w.name, author_role: w.role || '', places: [], sensitivity: 'normal',
      ...(image_url ? { image_url, image_alt: c.image_alt || `תמונה לטור של ${w.name}`, image_credit: 'באדיבות הכותב' } : {}) };
    let r: Any;
    if (c.story_id) {
      // an earlier try saved the story but did not publish it: update it and publish, never a second story
      const e = await call('hns-publish', { action: 'edit', id: c.story_id, fields });
      r = e?.ok ? await call('hns-publish', { action: 'panel_publish', id: c.story_id, by }) : e;
      if (r?.ok) r.id = c.story_id;
    } else r = await call('hns-publish', { action: 'create', fields, publish: true, by, extras: { writer_id: w.id, column_id: c.id } });
    if (!r?.ok) { await release(r?.id ? { story_id: r.id } : {}); return { ok: false, error: String(r?.error || 'הפרסום נכשל') }; }
    const sid = Number(r.id || r.published || c.story_id);
    const at = new Date().toISOString();
    await sb.from('hns_columns').update({ status: 'published', story_id: sid, published_at: at, decided_by: by, updated_at: at, history: hist(c, 'publish', by, { story_id: sid }) }).eq('id', id);
    if (c.tg_message_id && S.TELEGRAM_CHAT_ID) await tg('editMessageText', { chat_id: S.TELEGRAM_CHAT_ID, message_id: c.tg_message_id, disable_web_page_preview: true,
      text: `✅ טור הדעה פורסם${by === 'yakir' ? '' : ' (מלוח הניהול)'}: ${clean(c.title)}\nכותב: ${w.name}\nיופיע באתר תוך דקה בערך.` });
    const path = `/${SLUG[c.section] || 'city'}/n${sid}/`;
    try { await mailWriter(w, clean(c.title), `https://nws.co.il${path}`); } catch { /* the email is a bonus, never blocks publishing */ }
    return { ok: true, id, story_id: sid, url: path };
  } catch (e) { await release(); return { ok: false, error: String((e as Error).message || e) }; }
}
// 29.10.2026 (approved promotion plan): when a column is published, its writer gets an email with the link and ready share links,
// so they bring their own readers. Only to the writer of that column, only when an nws.co.il sender exists (NWS_MAIL_FROM), never to a test writer.
const escH = (x: string) => x.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
async function mailWriter(w: Any, title: string, url: string) {
  if (!S.RESEND_API_KEY || !S.NWS_MAIL_FROM || !/@nws\.co\.il>?$/i.test(S.NWS_MAIL_FROM) || !w?.email || w.is_test) return false;
  const enc = encodeURIComponent;
  const links: [string, string][] = [['בוואטסאפ', `https://wa.me/?text=${enc(`${title}\n${url}`)}`], ['בפייסבוק', `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`], ['בטלגרם', `https://t.me/share/url?url=${enc(url)}&text=${enc(title)}`]];
  const html = `<div dir="rtl" style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6;color:#0E1726"><p>שלום ${escH(w.name || '')},</p>`
    + `<p>הטור שלך פורסם באתר: <a href="${escH(url)}">${escH(title)}</a></p><p>רוצים שיותר אנשים יקראו? אפשר לשתף אותו בלחיצה: `
    + links.map(([t, h]) => `<a href="${escH(h)}">${t}</a>`).join(' · ') + `</p><p>תודה על הכתיבה.</p>`
    + `<p style="color:#5B6676;font-size:13px">חדשות נתניה והשרון, <a href="https://nws.co.il/">nws.co.il</a>. קיבלת את המייל הזה כי אתה כותב טורים באתר.</p></div>`;
  const text = `שלום ${w.name || ''},\n\nהטור שלך פורסם באתר: ${title}\n${url}\n\nאפשר לשתף אותו:\n${links.map(([t, h]) => `${t}: ${h}`).join('\n')}\n\nתודה על הכתיבה.`;
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { authorization: `Bearer ${S.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: S.NWS_MAIL_FROM, to: [w.email], subject: `הטור שלך פורסם: ${title}`.slice(0, 150), html, text }), signal: AbortSignal.timeout(15000) }).catch(() => null);
  return !!r?.ok;
}
async function colReturn(id: number, note: string, by: string) {
  const { data: c } = await sb.from('hns_columns').select('*').eq('id', id).maybeSingle();
  if (!c) return { ok: false, error: 'הטור לא נמצא' };
  if (!['waiting', 'checking'].includes(c.status)) return { ok: false, error: c.status === 'returned' ? 'הטור כבר הוחזר לכותב' : 'אפשר להחזיר רק טור שממתין לאישור' };
  const n = clean(note).slice(0, 1500) || 'העורך החזיר את הטור לתיקון. אפשר לערוך ולשלוח שוב.';
  const now = new Date().toISOString();
  const { data } = await sb.from('hns_columns').update({ status: 'returned', returned_at: now, return_note: n, decided_by: by, updated_at: now, history: hist(c, 'return', by, { note: n }) })
    .eq('id', id).in('status', ['waiting', 'checking']).select('id').maybeSingle();
  if (!data) return { ok: false, error: 'הטור השתנה בינתיים' };
  if (c.tg_message_id && S.TELEGRAM_CHAT_ID) await tg('editMessageText', { chat_id: S.TELEGRAM_CHAT_ID, message_id: c.tg_message_id, disable_web_page_preview: true,
    text: `↩️ הטור הוחזר לכותב: ${clean(c.title)}${note ? `\nההערה: ${n}` : ''}` });
  return { ok: true, id };
}
async function decide(data: string, cq: Any) {
  const [, , act, idStr] = String(data || '').split(':');
  const id = Number(idStr);
  const answer = (text: string) => cq?.id ? tg('answerCallbackQuery', { callback_query_id: cq.id, text }) : null;
  if (!id || !['ok', 'ret'].includes(act)) { await answer('פעולה לא מוכרת'); return { ok: false, error: 'bad data' }; }
  if (act === 'ok') {
    const r = await colPublish(id, 'yakir');
    await answer(r.ok ? (r.already ? 'כבר פורסם' : 'פורסם ✓ יופיע באתר תוך דקה בערך') : `לא פורסם: ${String(r.error).slice(0, 150)}`);
    return r;
  }
  const r = await colReturn(id, '', 'yakir');
  await answer(r.ok ? 'הוחזר לכותב. אפשר להוסיף הערה בלוח הניהול.' : String(r.error).slice(0, 180));
  return r;
}

Deno.serve(async (req) => {
  await secrets();
  if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  const by = clean(b.by || 'yakir-panel').slice(0, 40);
  try {
    switch (b.action) {
      case 'writers': return J(await writers());
      case 'writer_save': return J(await writerSave(b));
      case 'writer_code': return J(await writerCode(Number(b.id)));
      case 'writer_block': return J(await writerBlock(Number(b.id), !!b.blocked));
      case 'cols': return J(await cols(String(b.status || 'waiting')));
      case 'col_get': return J(await colGet(Number(b.id)));
      case 'col_edit': return J(await colEdit(b));
      case 'col_publish': return J(await colPublish(Number(b.id), by));
      case 'col_return': return J(await colReturn(Number(b.id), String(b.note || ''), by));
      case 'decide': return J(await decide(String(b.data || ''), b.cq));
      case 'count': { const { count } = await sb.from('hns_columns').select('id', { count: 'exact', head: true }).in('status', ['waiting', 'checking']); return J({ ok: true, waiting: count || 0 }); }
    }
    return J({ ok: false, error: 'unknown action' }, 400);
  } catch (e) { return J({ ok: false, error: String((e as Error).message || e) }, 500); }
});
