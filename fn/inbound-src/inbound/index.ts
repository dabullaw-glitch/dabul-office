// Documents that arrive by WhatsApp (a client sends them) or that you forward to the office
// Telegram bot. Each file is stored, read by AI, and filed under the right client and deal.
// Text you forward to the bot (a client's request, your own notes) is collected into a service request,
// and one tap on "הכנת טיוטה" turns it into a ready draft: the document, what is missing, and a reply to the client.
import { loadSecrets, json, cors, admin, env, uid, telegram, aiHeaders } from '../_shared/common.ts';
import { intl, reply, send } from '../_shared/send.ts';
import { DRAFT_PROMPT, parseDraft, docxBytes } from '../_shared/draft.ts';

type Inc = { src: string; phone: string; name: string; caption: string; forwardedFrom: string; files: { url: string; auth?: string; mime: string; fileName: string }[] };
const normPhone = (p: string) => { let x = String(p || '').replace(/\D/g, ''); if (x.startsWith('972')) x = '0' + x.slice(3); return x.length >= 9 && x.length <= 10 ? x : ''; };
const extFor = (mime: string) => ({ 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/heic': 'heic' } as Record<string, string>)[mime] || 'bin';
const tgApi = (m: string) => `https://api.telegram.org/bot${env('TELEGRAM_BOT_TOKEN')}/${m}`;
const tgSend = (body: Record<string, unknown>) => fetch(tgApi('sendMessage'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.assign({ chat_id: env('TELEGRAM_CHAT_ID'), disable_web_page_preview: true }, body)) }).catch(() => null);

async function parse(req: Request, src: string): Promise<Inc | null> {
  if (src === 'telegram') {
    const u = await req.json().catch(() => ({}));
    if (u.callback_query) { await onButton(u.callback_query).catch(e => console.error('button', e)); return null; }
    const m = u.message || u.channel_post; if (!m) return null;
    // pairing: the link from the connections screen sends "/start <code>" and makes this chat the office chat
    const pair = String(m.text || '').match(/^\/start\s+(\w+)/);
    if (pair && env('TG_PAIR') && pair[1] === env('TG_PAIR')) {
      await admin().from('app_secrets').upsert({ k: 'TELEGRAM_CHAT_ID', v: String(m.chat.id) });
      await admin().from('app_secrets').delete().eq('k', 'TG_PAIR');
      await fetch(tgApi('sendMessage'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: m.chat.id, text: '✅ מחובר! מעכשיו יגיעו לכאן סיכום הבוקר, לידים חדשים, חתימות ותזכורות ללקוחות.\n\nאפשר גם להעביר לכאן מסמכים (גם מוואטסאפ), ואני אשייך אותם ללקוח ולעסקה.' }) }).catch(() => {});
      return null;
    }
    if (String(m.chat?.id) !== env('TELEGRAM_CHAT_ID')) return null; // only you can file documents through the bot
    const o = m.forward_origin || {};
    const forwardedFrom = o.sender_user?.first_name ? `${o.sender_user.first_name} ${o.sender_user.last_name || ''}`.trim() : o.sender_user_name || m.forward_sender_name || '';
    const files: Inc['files'] = [];
    const add = async (file_id: string, mime: string, name: string) => { const r = await fetch(tgApi(`getFile?file_id=${file_id}`)).then(r => r.json()).catch(() => null); if (r?.ok) files.push({ url: `https://api.telegram.org/file/bot${env('TELEGRAM_BOT_TOKEN')}/${r.result.file_path}`, mime, fileName: name || r.result.file_path.split('/').pop() }); };
    if (m.document) await add(m.document.file_id, m.document.mime_type || 'application/octet-stream', m.document.file_name);
    if (m.photo?.length) await add(m.photo[m.photo.length - 1].file_id, 'image/jpeg', '');
    return { src, phone: '', name: '', caption: m.caption || m.text || '', forwardedFrom, files };
  }
  if (src === 'green') {
    const b = await req.json().catch(() => ({}));
    if (b.typeWebhook !== 'incomingMessageReceived') return null;
    const chat = b.senderData?.chatId || ''; if (!chat.endsWith('@c.us')) return null; // skip groups
    const md = b.messageData || {}, f = md.fileMessageData;
    return { src, phone: chat.replace('@c.us', ''), name: b.senderData?.senderName || '', caption: f?.caption || md.textMessageData?.textMessage || md.extendedTextMessageData?.text || '', forwardedFrom: '',
      files: f?.downloadUrl ? [{ url: f.downloadUrl, mime: f.mimeType || 'application/octet-stream', fileName: f.fileName || '' }] : [] };
  }
  if (src === 'twilio') {
    const f = await req.formData(); const g = (k: string) => String(f.get(k) || '');
    const n = +g('NumMedia') || 0, auth = 'Basic ' + btoa(`${env('TWILIO_ACCOUNT_SID')}:${env('TWILIO_AUTH_TOKEN')}`);
    return { src, phone: g('From').replace(/^whatsapp:/, ''), name: g('ProfileName'), caption: g('Body'), forwardedFrom: '',
      files: Array.from({ length: n }, (_, i) => ({ url: g(`MediaUrl${i}`), auth, mime: g(`MediaContentType${i}`), fileName: '' })) };
  }
  return null;
}

// ---------- service requests: collect forwarded text, then one tap makes a draft ----------
const INTAKE_WINDOW = 45 * 60e3;
// each piece (a message or a file) is its own record, so several files forwarded together never overwrite each other
async function openIntake(fresh: boolean) {
  const sb = admin();
  if (!fresh) {
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'intake').eq('data->>status', 'collecting').order('updated_at', { ascending: false }).limit(1);
    const row = data && data[0];
    if (row && Date.now() - Date.parse(row.data.at || row.data.created) < INTAKE_WINDOW) return { id: row.id as string, data: row.data };
  }
  const id = fresh ? uid('in') : `in-${Math.floor(Date.now() / 60e3)}`, now = new Date().toISOString();
  await sb.from('docs').upsert({ coll: 'intake', id, data: { status: 'collecting', created: now, at: now, source: 'telegram' }, updated_at: now }, { onConflict: 'coll,id', ignoreDuplicates: true });
  const { data: row } = await sb.from('docs').select('data').match({ coll: 'intake', id }).maybeSingle();
  return { id, data: (row && row.data) || { status: 'collecting', created: now, at: now } };
}
async function partsOf(id: string, legacy: any[] = []) {
  const { data } = await admin().from('docs').select('data').eq('coll', 'intakepart').eq('data->>intakeId', id);
  return legacy.concat((data || []).map((r: any) => r.data)).sort((a: any, b: any) => String(a.at || '').localeCompare(String(b.at || '')));
}
async function addParts(id: string, parts: any[]) {
  const sb = admin(), now = new Date().toISOString();
  for (const p of parts) await sb.from('docs').insert({ coll: 'intakepart', id: uid('ip'), data: Object.assign({ intakeId: id, at: now }, p) });
  await sb.rpc('docs_merge', { p_coll: 'intake', p_id: id, p_patch: { at: now } });
  return (await partsOf(id)).length;
}
// a message forwarded from a different client starts a new request on its own
async function intakeFor(from: string) {
  const it = await openIntake(false);
  const others = (await partsOf(it.id, it.data.parts || [])).map((p: any) => p.from).filter((f: string) => f && !f.startsWith('עו״ד'));
  if (from && others.length && !others.includes(from)) { await admin().rpc('docs_merge', { p_coll: 'intake', p_id: it.id, p_patch: { status: 'idle' } }); return { it: await openIntake(true), split: true }; }
  return { it, split: false };
}
async function onText(inc: Inc) {
  const text = inc.caption.trim();
  if (/^\/(new|חדש)\b/.test(text)) { const it = await openIntake(true); await tgSend({ text: '🆕 נפתחה בקשה חדשה. מעבירים לכאן את ההודעות של הלקוח ואת ההערות שלך.', reply_markup: { inline_keyboard: [[{ text: '✗ ביטול', callback_data: `dx:${it.id}` }]] } }); return; }
  if (/^\/(draft|טיוטה)\b/.test(text)) { const o = await openIntake(false); await makeDraft(o.id); return; }
  const { it, split } = await intakeFor(inc.forwardedFrom);
  const n = await addParts(it.id, [{ text: text.slice(0, 6000), from: inc.forwardedFrom || 'עו״ד (הערה)' }]);
  await tgSend({ text: `${split ? '🆕 התחלתי בקשה חדשה (הודעה מלקוח אחר).\n' : ''}📥 נוסף לבקשה (${n} פריטים${inc.forwardedFrom ? `, אחרון מ${inc.forwardedFrom}` : ''}).\nאפשר להמשיך להעביר הודעות, מסמכים או הערות. כשמוכן, לוחצים "הכנת טיוטה".`,
    reply_markup: { inline_keyboard: [[{ text: '📝 הכנת טיוטה', callback_data: `dr:${it.id}` }, { text: '✗ ביטול', callback_data: `dx:${it.id}` }]] } });
}
async function makeDraft(intakeId: string) {
  const sb = admin(), key = env('ANTHROPIC_API_KEY');
  const { data: row } = await sb.from('docs').select('data').match({ coll: 'intake', id: intakeId }).maybeSingle();
  const all = row ? await partsOf(intakeId, row.data.parts || []) : [];
  if (!row || !all.length) { await tgSend({ text: 'אין עדיין הודעות בבקשה. מעבירים לכאן את הבקשה של הלקוח ואז לוחצים "הכנת טיוטה".' }); return; }
  if (!key) { await tgSend({ text: '⚠️ מפתח ה-AI לא מוגדר במערכת, אי אפשר להכין טיוטה.' }); return; }
  await sb.from('docs').upsert({ coll: 'intake', id: intakeId, data: Object.assign({}, row.data, { status: 'drafting' }), updated_at: new Date().toISOString() });
  await tgSend({ text: '⏳ מכין טיוטה. זה לוקח בערך דקה.' });
  const { data: cl } = await sb.from('docs').select('id,data').eq('coll', 'clients');
  const clients = (cl || []).map((c: any) => ({ id: c.id, name: c.data.name, phone: c.data.phone || '', idNo: c.data.idNo || '' }));
  const { data: st } = await sb.from('docs').select('data').match({ coll: 'settings', id: 'main' }).maybeSingle();
  const parts = all.map((p: any) => p.kind === 'file' ? `[מסמך מצורף: ${p.title || p.name}]` : `[${p.from}] ${p.text}`).join('\n\n');
  const prompt = DRAFT_PROMPT(parts, JSON.stringify(clients.slice(0, 500)), (st && st.data) || {}) + (all.some((p: any) => p.kind === 'file') ? '\nהמסמכים המצורפים מופיעים לפני ההוראות. קח מהם שמות, מספרי זהות, כתובות, סכומים ותאריכים, ואל תשאיר [להשלים] על פרט שמופיע בהם.' : '');
  // the documents the client sent (photos, PDF, Word) are read together with the messages
  const blocks: any[] = []; let size = 0;
  for (const f of all.filter((p: any) => p.kind === 'file').slice(-8)) {
    try {
      const { data: blob } = await sb.storage.from('files').download(f.path);
      if (!blob) continue;
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.length > 6e6 || size + bytes.length > 18e6) continue;
      size += bytes.length;
      if (/wordprocessingml|msword/.test(f.mime) || /\.docx$/i.test(f.name || '')) {
        const JSZip = (await import('npm:jszip@3.10.1')).default; const z = await JSZip.loadAsync(bytes);
        const t = (await z.file('word/document.xml')!.async('string')).replace(/<w:p[ >]/g, '\n<w:p ').replace(/<[^>]+>/g, '').slice(0, 30000);
        blocks.push({ type: 'text', text: `תוכן המסמך "${f.name}":\n${t}` }); continue;
      }
      let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      if (f.mime === 'application/pdf') blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: btoa(bin) } });
      else if (/^image\/(jpeg|png|webp|gif)$/.test(f.mime)) blocks.push({ type: 'image', source: { type: 'base64', media_type: f.mime, data: btoa(bin) } });
    } catch (e) { console.error('draft file', e); }
  }
  let out = '', why = '';
  for (const model of ['claude-opus-5-5', 'claude-sonnet-5']) {
    const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: aiHeaders(key),
      body: JSON.stringify({ model, max_tokens: 6000, messages: [{ role: 'user', content: [...blocks, { type: 'text', text: prompt }] }] }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    out = ((j as any).content || []).filter((c: any) => c.type === 'text').map((c: any) => c.text).join('');
    if (out) break;
    why = String((j as any).error?.message || why);
  }
  if (!out) { await sb.from('docs').upsert({ coll: 'intake', id: intakeId, data: Object.assign({}, row.data, { status: 'collecting' }), updated_at: new Date().toISOString() }); await tgSend({ text: /workspace|api.key|authentication|credit/i.test(why) ? '⚠️ הכנת הטיוטה נכשלה כי מפתח ה-AI במערכת לא תקין או חסום. אחרי עדכון המפתח בהגדרות, לוחצים כאן שוב.' : '⚠️ הכנת הטיוטה נכשלה. אפשר ללחוץ שוב בעוד דקה.', reply_markup: { inline_keyboard: [[{ text: '📝 ניסיון נוסף', callback_data: `dr:${intakeId}` }]] } }); return; }
  const d = parseDraft(out);
  const client = clients.find((c: any) => c.id === d.meta.clientId);
  const phone = client?.phone || normPhone(d.meta.phone || '');
  const id = uid('dr'), now = new Date().toISOString();
  const draft = { intakeId, clientId: client ? client.id : '', clientName: client?.name || d.meta.clientName || '', phone, service: d.meta.service || '', docType: d.meta.docType || '', title: d.meta.title || 'טיוטה',
    summary: d.meta.summary || '', missing: d.meta.missing || [], next: d.meta.next || [], text: d.draft, reply: d.reply, parts: all.map((p: any) => p.kind === 'file' ? { from: p.from, text: `[מסמך: ${p.title || p.name}]` } : { from: p.from, text: p.text }), status: 'draft', source: 'telegram', created: now };
  await sb.from('docs').insert({ coll: 'drafts', id, data: draft });
  await sb.from('docs').upsert({ coll: 'intake', id: intakeId, data: Object.assign({}, row.data, { status: 'done', draftId: id }), updated_at: now });
  if (draft.clientId) await sb.from('docs').insert({ coll: 'notes', id: uid('n'), data: { refType: 'client', refId: draft.clientId, text: `טיוטה מוכנה מבקשת שירות: ${draft.title}`, kind: 'system', date: now } });
  // the Word file is also kept in the client's documents
  const fileName = `${draft.title.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60)}.docx`;
  const docx = await docxBytes(draft.title, draft.text);
  const path = `drafts/${now.slice(0, 10)}/${id}.docx`;
  const up = await sb.storage.from('files').upload(path, docx, { contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', upsert: true });
  if (!up.error) await sb.from('docs').insert({ coll: 'documents', id: uid('f'), data: { title: `טיוטה: ${draft.title}`, type: 'draft', fileName, url: 'sbfile:' + path, clientId: draft.clientId, dealId: '', folder: 'טיוטות', created: now.slice(0, 10), at: now, draftId: id, inbox: !draft.clientId } });
  const app = env('APP_URL');
  const kb: any[] = [];
  if (app) kb.push([{ text: '📂 פתיחה ועריכה במערכת', url: `${app}#drafts/${id}` }]);
  if (phone && draft.reply) kb.push([{ text: '💬 הודעה ללקוח בוואטסאפ', url: `https://wa.me/${intl(phone)}?text=${encodeURIComponent(draft.reply)}` }]);
  const head = `📝 טיוטה מוכנה: ${draft.title}\n👤 ${draft.clientName || 'לקוח לא זוהה'}${client ? '' : draft.clientName ? ' (לא נמצא כרטיס, כדאי לשייך)' : ''}\n\n${draft.summary}${draft.missing.length ? `\n\n❓ חסר להשלמה:\n${draft.missing.map((x: string) => '• ' + x).join('\n')}` : ''}${draft.next.length ? `\n\n➡️ הצעדים הבאים:\n${draft.next.map((x: string) => '• ' + x).join('\n')}` : ''}`;
  // the draft itself as a Word file, ready to edit
  try {
    const fd = new FormData();
    fd.append('chat_id', env('TELEGRAM_CHAT_ID'));
    fd.append('caption', head.slice(0, 1000));
    if (kb.length) fd.append('reply_markup', JSON.stringify({ inline_keyboard: kb }));
    fd.append('document', new Blob([docx as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), fileName);
    const r = await fetch(tgApi('sendDocument'), { method: 'POST', body: fd });
    if (!r.ok) throw new Error('send');
    if (head.length > 1000) await tgSend({ text: head });
  } catch { await tgSend({ text: `${head}\n\n${draft.text}`.slice(0, 4000), reply_markup: kb.length ? { inline_keyboard: kb } : undefined }); }
}

// 28.10.2026: buttons under news-site approval messages (hns:ok:<id> / hns:no:<id>) belong to the nws.co.il news engine.
// The hns-publish function publishes or rejects the story, answers the tap and updates the message.
async function hnsButton(q: any) {
  const r = await fetch(`${env('SUPABASE_URL')}/functions/v1/hns-publish`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cron-secret': env('CRON_SECRET') },
    body: JSON.stringify({ action: 'decide', data: String(q.data), cq: { id: q.id, chat_id: q.message?.chat?.id, message_id: q.message?.message_id } }) }).catch(() => null);
  if (!r || !r.ok) await fetch(tgApi('answerCallbackQuery'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callback_query_id: q.id, text: 'הפעולה נכשלה, אפשר לנסות שוב בעוד דקה' }) }).catch(() => null);
}

// a tap on a button the bot sent: "✓ נשלח" / "✗ לא לשלוח" under a client message, or the draft buttons
async function onButton(q: any) {
  if (String(q.message?.chat?.id) !== env('TELEGRAM_CHAT_ID')) return;
  if (String(q.data || '').startsWith('hns:')) { await hnsButton(q); return; }
  const [act, id] = String(q.data || '').split(':');
  const sb = admin();
  const answer = (text: string) => fetch(tgApi('answerCallbackQuery'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ callback_query_id: q.id, text }) });
  if (act === 'dr' || act === 'dx') {
    const { data: it } = await sb.from('docs').select('data').match({ coll: 'intake', id }).maybeSingle();
    if (!it || it.data.status === 'done') { await answer('הבקשה כבר טופלה'); return; }
    if (act === 'dx') { await sb.from('docs').upsert({ coll: 'intake', id, data: Object.assign({}, it.data, { status: 'cancelled' }), updated_at: new Date().toISOString() }); await answer('הבקשה בוטלה'); return; }
    if (it.data.status === 'drafting') { await answer('כבר מכין, עוד רגע'); return; }
    await answer('מכין טיוטה...');
    await makeDraft(id);
    return;
  }
  const { data: row } = await sb.from('docs').select('data').match({ coll: 'tgq', id }).maybeSingle();
  if (!row) { await answer('ההודעה כבר טופלה'); return; }
  const x = row.data, key = String(x.key).replace(/[^A-Za-z0-9_\-.~:@+]/g, '_');
  // "send" on a message that waited for approval: it goes to the client through the connected WhatsApp sender
  if (act === 'ap') {
    const { data: st } = await sb.from('docs').select('data').match({ coll: 'settings', id: 'main' }).maybeSingle();
    const r = await send(x.phone, x.text, { name: x.name, signature: (st?.data as any)?.signature || '' });
    if (!r.ok) { await answer('השליחה נכשלה, נסה שוב'); return; }
    await sb.from('docs').upsert({ coll: 'outbox', id: key, data: { status: 'sent', via: 'approved', at: new Date().toISOString(), key: x.key, name: x.name, clientId: x.clientId, dealId: x.dealId, type: x.type, text: x.text } });
    if (x.dealId) await sb.from('docs').insert({ coll: 'notes', id: uid('n'), data: { refType: 'deal', refId: x.dealId, text: `נשלחה הודעה (באישורך) ל${x.name}: ${x.label}`, kind: 'system', date: new Date().toISOString() } });
    await sb.from('docs').delete().match({ coll: 'tgq', id });
    await answer('נשלח ✓');
    await fetch(tgApi('editMessageText'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: q.message.chat.id, message_id: q.message.message_id, text: `✅ נשלח ללקוח · ${x.label}: ${x.name}` }) });
    return;
  }
  await sb.from('docs').upsert({ coll: 'outbox', id: key, data: { status: act === 's' ? 'sent' : 'dismissed', via: 'telegram', at: new Date().toISOString(), key: x.key, name: x.name, clientId: x.clientId, dealId: x.dealId, type: x.type, text: x.text } });
  if (act === 's' && x.dealId) await sb.from('docs').insert({ coll: 'notes', id: uid('n'), data: { refType: 'deal', refId: x.dealId, text: `נשלחה הודעה ל${x.name}: ${x.label}`, kind: 'system', date: new Date().toISOString() } });
  if (act === 's' && x.leadId) { const { data: l } = await sb.from('docs').select('data').match({ coll: 'leads', id: x.leadId }).maybeSingle();
    if (l) await sb.rpc('docs_merge', { p_coll: 'leads', p_id: x.leadId, p_patch: { log: ((l.data as any).log || []).concat([{ at: new Date().toISOString(), kind: 'message', text: `נשלחה הודעה: ${x.label}` }]).slice(-80) } }); }
  await sb.from('docs').delete().match({ coll: 'tgq', id });
  await answer(act === 's' ? 'סומן כנשלח ✓' : 'בוטל');
  await fetch(tgApi('editMessageText'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: q.message.chat.id, message_id: q.message.message_id, text: `${act === 's' ? '✅ נשלח' : '✗ בוטל'} · ${x.label}: ${x.name}` }) });
}

async function identify(bytes: Uint8Array, mime: string, ctx: string, candidates: string) {
  const key = env('ANTHROPIC_API_KEY'); if (!key) return null;
  let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const b64 = btoa(bin);
  let docText = '';
  if (/wordprocessingml|msword/.test(mime)) { try { const JSZip = (await import('npm:jszip@3.10.1')).default; const z = await JSZip.loadAsync(bytes); docText = (await z.file('word/document.xml')!.async('string')).replace(/<w:p[ >]/g, '\n<w:p ').replace(/<[^>]+>/g, '').slice(0, 20000); } catch { /* not readable */ } }
  const block = mime === 'application/pdf' ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } }
    : /^image\/(jpeg|png|webp|gif)$/.test(mime) ? { type: 'image', source: { type: 'base64', media_type: mime, data: b64 } } : null;
  const prompt = `אתה מזכיר במשרד עורכי דין לנדל"ן. התקבל מסמך. זהה לאיזה לקוח ולאיזו עסקה הוא שייך, ומה סוג המסמך.
${ctx}
${docText ? 'תוכן המסמך:\n' + docText + '\n' : ''}לקוחות ועסקאות פעילות במשרד (JSON):
${candidates}
החזר JSON בלבד: {"clientId":"מזהה לקוח מהרשימה או ריק","dealId":"מזהה עסקה מהרשימה או ריק","docType":"אחד מ: תעודת זהות, נסח טאבו, אישור העברה בנקאית, אישור זכויות, אישור עירייה, אישור מיסים, חוזה, מסמך בנק / משכנתא, ייפוי כוח, צילום נכס, אחר","title":"כותרת קצרה בעברית למסמך","confidence":מספר בין 0 ל-1,"reason":"משפט קצר: לפי מה זיהית"}
התאם לפי מספר ת"ז, שם, כתובת נכס, גוש/חלקה או טלפון. אם אין התאמה ברורה, השאר clientId ריק ו-confidence נמוך. אל תנחש.`;
  const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', headers: aiHeaders(key),
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 800, messages: [{ role: 'user', content: [...(block ? [block] : []), { type: 'text', text: prompt }] }] }) });
  const j = await r.json().catch(() => ({}));
  const t = (j.content || []).map((c: any) => c.text || '').join('');
  try { return JSON.parse((t.match(/\{[\s\S]*\}/) || ['{}'])[0]); } catch { return null; }
}

async function handle(inc: Inc) {
  const sb = admin();
  const { data: rows } = await sb.from('docs').select('coll,id,data').in('coll', ['clients', 'deals']);
  const clients = (rows || []).filter((r: any) => r.coll === 'clients'), deals = (rows || []).filter((r: any) => r.coll === 'deals');
  const owner = normPhone(env('OWNER_PHONE'));
  const fromPhone = normPhone(inc.phone);
  const byPhone = fromPhone && fromPhone !== owner ? clients.find((c: any) => normPhone(c.data.phone) === fromPhone) : null;
  const activeOf = (cid: string) => deals.filter((d: any) => (d.data.clientIds || []).includes(cid) && !['הושלם ונרשם', 'הושלם', 'בוטל', 'העסקה בוטלה'].includes(d.data.status));
  const cand = JSON.stringify({
    clients: (byPhone ? [byPhone] : clients).slice(0, 400).map((c: any) => ({ id: c.id, name: c.data.name, idNo: c.data.idNo || '', phone: c.data.phone || '' })),
    deals: (byPhone ? activeOf(byPhone.id) : deals.filter((d: any) => !['הושלם ונרשם', 'הושלם', 'בוטל', 'העסקה בוטלה'].includes(d.data.status))).slice(0, 200)
      .map((d: any) => ({ id: d.id, address: d.data.address, gush: d.data.gush || '', chelka: d.data.chelka || '', clientIds: d.data.clientIds || [] })) });
  const ctx = [inc.caption && `טקסט שצורף: ${inc.caption}`, inc.forwardedFrom && `הועבר מאת: ${inc.forwardedFrom}`, inc.name && `שם השולח בוואטסאפ: ${inc.name}`, byPhone && `השולח הוא הלקוח ${byPhone.data.name} (זוהה לפי הטלפון)`].filter(Boolean).join('\n');
  const results: string[] = [], filed: any[] = [];
  for (const f of inc.files.slice(0, 10)) {
    const res = await fetch(f.url, f.auth ? { headers: { authorization: f.auth } } : {});
    if (!res.ok) { results.push('❌ לא הצלחתי להוריד קובץ'); continue; }
    const bytes = new Uint8Array(await res.arrayBuffer()); if (bytes.length > 15e6) { results.push('❌ קובץ גדול מדי'); continue; }
    const mime = f.mime || res.headers.get('content-type') || 'application/octet-stream';
    const today = new Date().toISOString().slice(0, 10);
    const fileName = (f.fileName || `מסמך-${today}.${extFor(mime)}`).replace(/[\\/:*?"<>|]/g, '_');
    const path = `inbound/${today}/${Date.now().toString(36)}-${fileName.replace(/[^\w.\-]+/g, '_').slice(-60) || 'file.' + extFor(mime)}`;
    const up = await sb.storage.from('files').upload(path, bytes, { contentType: mime });
    if (up.error) { results.push('❌ השמירה נכשלה'); continue; }
    const ai = await identify(bytes, mime, ctx, cand).catch(() => null) || {};
    let clientId = byPhone ? byPhone.id : '', dealId = '';
    const conf = +ai.confidence || 0;
    if (!clientId && ai.clientId && conf >= 0.8 && clients.some((c: any) => c.id === ai.clientId)) clientId = ai.clientId;
    if (clientId) { const act = activeOf(clientId); dealId = ai.dealId && act.some((d: any) => d.id === ai.dealId) ? ai.dealId : act.length === 1 ? act[0].id : ''; }
    const title = ai.title || (ai.docType && ai.docType !== 'אחר' ? ai.docType : fileName.replace(/\.[^.]+$/, ''));
    const doc = { title, type: 'incoming', docType: ai.docType || '', fileName, assetId: path, url: 'sbfile:' + path, clientId, dealId, source: inc.src, from: fromPhone || '', senderName: inc.forwardedFrom || inc.name || '', caption: inc.caption || '',
      created: today, at: new Date().toISOString(), inbox: !clientId, confidence: conf, reason: ai.reason || '', suggest: !clientId && ai.clientId ? ai.clientId : '' };
    await sb.from('docs').insert({ coll: 'documents', id: uid('f'), data: doc });
    const cl = clients.find((c: any) => c.id === clientId), dl = deals.find((d: any) => d.id === dealId);
    if (clientId) await sb.from('docs').insert({ coll: 'notes', id: uid('n'), data: { refType: dealId ? 'deal' : 'client', refId: dealId || clientId, text: `התקבל מסמך (${inc.src === 'telegram' ? 'הועבר בטלגרם' : 'וואטסאפ'}): ${title}`, kind: 'system', date: new Date().toISOString() } });
    if (inc.src === 'telegram') filed.push({ kind: 'file', path, mime, name: fileName, title, from: inc.forwardedFrom || '', at: new Date().toISOString() });
    results.push(clientId ? `✅ ${title} ← ${cl?.data.name}${dl ? ` · ${dl.data.address}` : ''}` : `❓ ${title} - לא זוהה בוודאות, מחכה לשיוך במערכת${ai.reason ? ` (${ai.reason})` : ''}`);
  }
  const app = env('APP_URL');
  const head = inc.src === 'telegram' ? '📎 מסמכים שהעברת:' : `📎 מסמכים מוואטסאפ${byPhone ? ` מ${byPhone.data.name}` : inc.name ? ` מ${inc.name} (${fromPhone})` : ''}:`;
  const text = `${head}\n${results.join('\n')}${app ? `\n\n👉 ${app}#incoming` : ''}`;
  if (inc.src === 'telegram') {
    // the files also join the open service request, so "הכנת טיוטה" reads them
    let kb: any = undefined;
    if (filed.length) {
      const { it } = await intakeFor(inc.forwardedFrom);
      await addParts(it.id, (inc.caption ? [{ text: inc.caption.slice(0, 6000), from: inc.forwardedFrom || 'עו״ד (הערה)' }] : []).concat(filed));
      kb = { inline_keyboard: [[{ text: '📝 הכנת טיוטה מהחומר', callback_data: `dr:${it.id}` }]] };
    }
    await tgSend({ text: `${text}${filed.length ? '\n\nהמסמכים צורפו גם לבקשה הפתוחה. אפשר להמשיך להעביר חומר, ובסוף "הכנת טיוטה".' : ''}`, reply_markup: kb });
  }
  else {
    await telegram(text).catch(() => false);
    if (byPhone && results.some(r => r.startsWith('✅'))) await reply(inc.phone, `תודה ${String(byPhone.data.name).split(' ')[0]}, קיבלנו את המסמך${results.length > 1 ? 'ים' : ''} ושמרנו בתיק. 🙏`).catch(() => false);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  const url = new URL(req.url), src = url.searchParams.get('src') || '';
  const secret = env('INBOUND_SECRET');
  const given = url.searchParams.get('k') || req.headers.get('x-telegram-bot-api-secret-token') || '';
  if (!secret || given !== secret) return json({ error: 'unauthorized' }, 401);
  // deno-lint-ignore no-explicit-any
  const rt = (globalThis as any).EdgeRuntime;
  const later = (p: Promise<unknown>) => { if (rt && rt.waitUntil) rt.waitUntil(p); else return p; };
  // a button tap that starts a draft keeps working in the background after Telegram gets its answer
  if (src === 'telegram' && req.headers.get('content-type')?.includes('json')) {
    const raw = await req.text();
    const u = (() => { try { return JSON.parse(raw); } catch { return {}; } })();
    if (u.callback_query) { const w = onButton(u.callback_query).catch(e => console.error('button', e)); await later(w); return json({ ok: true }); }
    req = new Request(req.url, { method: 'POST', headers: req.headers, body: raw });
  }
  const inc = await parse(req, src).catch(() => null);
  if (!inc || !inc.files.length) {
    if (inc && src === 'telegram' && inc.caption) { const w = onText(inc).catch(e => console.error('intake', e)); await later(w); }
    return src === 'twilio' ? new Response('<Response/>', { headers: { 'content-type': 'text/xml' } }) : json({ ok: true, skipped: !inc });
  }
  const work = handle(inc).catch(e => console.error('inbound', e));
  // answer the sender right away and keep working in the background
  await later(work);
  return src === 'twilio' ? new Response('<Response/>', { headers: { 'content-type': 'text/xml' } }) : json({ ok: true });
});
