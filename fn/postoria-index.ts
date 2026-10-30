// postoria: publishing through Postoria (one API for TikTok and the other networks), connected 11.10.2026.
// The API key is POSTORIA_API_KEY in app_secrets (saved by Yakir in the office system, never shown).
// Cron/office calls (x-cron-secret):
//  POST {action:'accounts'}                         -> workspaces and connected accounts; marks settings/pub.postoria ok
//  POST {action:'video', reelPath, caption, networks:['tiktok'], who:'private'|'public', at?}
//       -> imports the reel (files bucket) into Postoria, waits until it is ready, creates the post (now or scheduled)
//  POST {action:'post', postId}                     -> the post status and the link on each network
//  POST {action:'publish'} (cron every 10 minutes)   -> the content calendar (docs coll "pub"): every network except X goes out
//       here once settings/pub.postoria.ok (Yakir, 11.10.2026: Facebook, Instagram, YouTube, LinkedIn, TikTok, Google Business).
//       Step 1 imports the row's media (the staged reel, or the images) into Postoria and keeps the ids in row.pst; a later run
//       posts each channel once the media is ready (result.<ch>.pending = Postoria post id); a later run fills in the link.
//       Failures go to Telegram; a row that is still not out 4 hours after its time becomes "missed".
import { loadSecrets, json, cors, admin, env, telegram } from './_shared/common.ts';

const API = 'https://api.postoria.io/v1';
// YouTube titles (Yakir, 11.10.2026: "לא לכתוב יותר שורטס ... תכתוב כמו בשאר הסרטונים"): no #shorts or other hashtags,
// and the same ending as the other videos on the channel: "<title> | עורך דין יקיר דבול".
const YT_END = ' | עורך דין יקיר דבול';
// deno-lint-ignore no-explicit-any
function ytTitle(row: any) {
  let t = String(row.ytTitle || row.title || '').replace(/^(רילס|סרטון שאלה): /, '').replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim();
  if (!/יקיר דבול/.test(t)) t = (t.length + YT_END.length <= 100) ? t + YT_END : t;
  return t.slice(0, 100);
}
// deno-lint-ignore no-explicit-any
async function pst_(path: string, method = 'GET', body?: any): Promise<{ status: number; j: any }> {
  const r = await fetch(API + path, { method, headers: { authorization: `Bearer ${env('POSTORIA_API_KEY')}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j: unknown = null; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 500) }; }
  return { status: r.status, j };
}
const merge = (coll: string, id: string, patch: unknown) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const list = (j: any) => (Array.isArray(j) ? j : (j && (j.data || j.items || j.results)) || []);

async function workspace(): Promise<number> {
  const { j } = await pst_('/workspaces');
  const w = list(j)[0]; if (!w) throw new Error('no workspace');
  return w.id;
}
async function accounts() {
  const ws = await workspace();
  const { status, j } = await pst_(`/workspaces/${ws}/social-accounts`);
  const acc = list(j).map((a: any) => ({ id: a.id, network: a.network || a.social_network, name: a.name || a.display_name || a.username || '' }));
  if (status === 200) await merge('settings', 'pub', { postoria: { ok: true, checked: new Date().toISOString(), workspace: ws, accounts: acc } });
  return { status, workspace: ws, accounts: acc, raw: status === 200 ? undefined : j };
}
async function video(b: any) {
  const ws = await workspace();
  const { accounts: acc } = await accounts();
  const nets: string[] = Array.isArray(b.networks) && b.networks.length ? b.networks : ['tiktok'];
  const ids = acc.filter((a: any) => nets.includes(String(a.network || '').toLowerCase())).map((a: any) => a.id);
  if (!ids.length) return { ok: false, error: 'no connected account for ' + nets.join(','), accounts: acc };
  const su = await admin().storage.from('files').createSignedUrl(String(b.reelPath), 6 * 3600);
  if (!su.data?.signedUrl) return { ok: false, error: 'reel not found: ' + b.reelPath };
  const imp = await pst_(`/workspaces/${ws}/media/imports`, 'POST', { url: su.data.signedUrl, thumbnail_timestamp_ms: 1500 });
  const media = imp.j && (imp.j.id || imp.j.media_id || (imp.j.data && imp.j.data.id));
  if (!media) return { ok: false, step: 'import', status: imp.status, j: imp.j };
  let m: any = null, thumb = imp.j.thumbnail_media_id || null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    m = (await pst_(`/workspaces/${ws}/media/${media}`)).j;
    if (m && (m.status === 'ready' || m.status === 'failed')) break;
  }
  if (!m || m.status !== 'ready') return { ok: false, step: 'media', media, m };
  if (thumb) { for (let i = 0; i < 20; i++) { const t = (await pst_(`/workspaces/${ws}/media/${thumb}`)).j; if (t && t.status === 'ready') break; if (t && t.status === 'failed') { thumb = null; break; } await new Promise(r => setTimeout(r, 2000)); } }
  const body: any = { publish_mode: b.at ? 'schedule' : 'publish_now', social_account_ids: ids, content_type: 'video', caption: String(b.caption || ''),
    media: [{ media_id: media, ...(thumb ? { thumbnail_media_id: thumb } : {}) }], is_ai_generated: false,
    tiktok: { who_can_watch: b.who === 'public' ? 'public' : 'private', allow_comments: true, allow_duet: false, allow_stitch: false, your_brand: false, branded_content: false, disclose_post_content: false, auto_add_music: false } };
  if (b.at) body.scheduled_time = new Date(b.at).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const p = await pst_(`/workspaces/${ws}/posts`, 'POST', body);
  return { ok: p.status < 300, status: p.status, post: p.j, media, thumb };
}

// ---------------- the content calendar ----------------
const NET: Record<string, string> = { facebook: 'facebook', instagram: 'instagram', youtube: 'you_tube', linkedin: 'linked_in', tiktok: 'tik_tok', gbp: 'google_business_profile' };
function ilToMs(at: string) {
  const guess = Date.parse(at + ':00Z');
  const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
  return guess - Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]) * 3600e3;
}
const isVid = (u: string) => /\.(mp4|mov)(\?|$)/i.test(u) || /\/reels\//.test(u);
const isImg = (u: string) => /\.(jpe?g|png|webp)(\?|$)/i.test(u);
async function mediaOf(row: any, cfg: any) {
  const fill = (x: string) => String(x || '').split('{MEDIA}').join(cfg.media || '').split('{SITE}').join(cfg.site || '');
  let reelPath = row.reelPath;
  if (!reelPath && row.reelFrom) { const { data } = await admin().from('docs').select('data').match({ coll: 'pub', id: row.reelFrom }).maybeSingle(); reelPath = data && data.data && data.data.reelPath; }
  if (reelPath) { const su = await admin().storage.from('files').createSignedUrl(reelPath, 6 * 3600); if (!su.data?.signedUrl) throw new Error('the reel file is missing in storage'); return { kind: 'video', urls: [su.data.signedUrl] }; }
  const m = (row.media || []).map(fill).filter((u: string) => !/story/i.test(u.split('?')[0].split('/').pop() || ''));
  const v = m.find(isVid); if (v) return { kind: 'video', urls: [v] };
  const im = m.filter(isImg).slice(0, 10); if (im.length) return { kind: 'image', urls: im };
  if (row.kind === 'video' || row.kind === 'own-video') throw new Error('no video attached to this slot yet');
  return { kind: 'none', urls: [] };
}
function postBody(row: any, ch: string, acc: number, pst: any) {
  let text = String((ch === 'tiktok' && row.textTiktok) || (ch === 'youtube' && row.ytDesc) || row.text || '').trim();
  const body: any = { publish_mode: 'publish_now', social_account_ids: [acc], is_ai_generated: false };
  if (pst.kind === 'video') {
    body.content_type = (ch === 'instagram' || (ch === 'facebook' && row.kind === 'video')) ? 'reel' : 'video';
    body.media = [{ media_id: pst.media[0], ...(pst.thumb ? { thumbnail_media_id: pst.thumb } : {}) }];
  } else if (pst.kind === 'image') {
    body.content_type = pst.media.length > 1 ? 'carousel' : 'image';
    // LinkedIn takes at most 9 files in one post (Postoria 400 "You can upload up to 9 files", 30.10.2026): keep the first 8 and the
    // last slide (the closing slide with the office details)
    const ids: number[] = ch === 'linkedin' && pst.media.length > 9 ? [...pst.media.slice(0, 8), pst.media[pst.media.length - 1]] : pst.media;
    body.media = ids.map((id: number) => ({ media_id: id }));
  } else if (row.link && (ch === 'facebook' || ch === 'linkedin')) { body.content_type = 'link'; body.link_url = row.link; }
  else body.content_type = 'text';
  // Google Business: its own weekly post in Yakir's template (text as written, article link at the end), plus a "Learn more" button
  if (ch === 'gbp') { const u = row.gbpLink || row.link || 'https://dabullaw.co.il/'; body.google_business_profile = { button_type: 'LEARN_MORE', button_url: u }; text = String(row.textGbp || text).trim(); }
  if (row.link && body.content_type !== 'link' && (ch === 'facebook' || ch === 'linkedin') && !text.includes(row.link)) text += `\n\n${row.link}`;
  body.caption = text.slice(0, ch === 'instagram' ? 2150 : ch === 'tiktok' ? 2200 : ch === 'gbp' ? 1450 : 5000);
  if (ch === 'tiktok') body.tiktok = { who_can_watch: 'public', allow_comments: true, allow_duet: false, allow_stitch: false, your_brand: false, branded_content: false, disclose_post_content: false, auto_add_music: false };
  if (ch === 'youtube') body.youtube = { title: ytTitle(row), tags: String(row.ytTags || '').split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 15), visibility: 'public', made_for_kids: false };
  return body;
}
async function publish() {
  const { data: cr } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle();
  const cfg: any = (cr && cr.data) || {};
  const pc = cfg.postoria || {}; const log: string[] = [];
  if (!pc.ok) return { ok: false, log: ['postoria not connected'] };
  let acc: any[] = pc.accounts || [];
  if (!acc.length || Date.now() - Date.parse(pc.checked || 0) > 6 * 3600e3) acc = (await accounts()).accounts;
  const accOf = (ch: string) => (acc.find((a: any) => a.network === NET[ch]) || {}).id;
  const ws = pc.workspace || await workspace();
  const now = Date.now(); const from = new Date(now - 30 * 3600e3).toISOString().slice(0, 10);
  const budget = now + 80e3;
  const { data: rows } = await admin().from('docs').select('id,data').eq('coll', 'pub').in('data->>owner', ['office', 'system']).eq('data->>status', 'planned').gte('data->>at', from).order('data->>at');
  for (const r of rows || []) {
    const row = r.data, t = ilToMs(row.at);
    if (t > now || now - t > 4 * 3600e3) continue;
    // Yakir, 20.10.2026: TikTok and Instagram get only his own edited videos where he talks, never videos made by AI
    // (the YouTube question videos built from a script: row.ytscript, media under {MEDIA}yt/, or row.ai)
    const isAi = !!row.ytscript || row.ai === true || ((row.media || []) as string[]).some((m) => /\{MEDIA\}yt\//.test(String(m)));
    let chans = ((row.channels || []) as string[]).filter(c => NET[c]);
    if (isAi && chans.some(c => c === 'tiktok' || c === 'instagram')) {
      chans = chans.filter(c => c !== 'tiktok' && c !== 'instagram');
      if (!chans.length) { await merge('pub', r.id, { status: 'skipped', skipNote: 'סרטון שנוצר בבינה מלאכותית: לא עולה לטיקטוק ולאינסטגרם (יקיר, 20.10.2026)' }); log.push(`${r.id}: skipped (AI video, no TikTok/Instagram)`); continue; }
    }
    if (!chans.length) continue;
    const res: any = { ...(row.result || {}) }; let pst = row.pst || null; let changed = false;
    const todo = chans.filter(c => !(res[c] && (res[c].ok || res[c].pending)));
    try {
      if (todo.length) {
        if (!pst) {
          const m = await mediaOf(row, cfg);
          const ids: number[] = []; let thumb = null;
          for (const u of m.urls) {
            const imp = await pst_(`/workspaces/${ws}/media/imports`, 'POST', m.kind === 'video' ? { url: u, thumbnail_timestamp_ms: 1500 } : { url: u });
            const id = imp.j && imp.j.id; if (!id) throw new Error(`Postoria import ${imp.status}: ${JSON.stringify(imp.j).slice(0, 160)}`);
            ids.push(id); if (imp.j.thumbnail_media_id) thumb = imp.j.thumbnail_media_id;
          }
          pst = { kind: m.kind, media: ids, thumb, at: new Date().toISOString() };
          await merge('pub', r.id, { pst }); log.push(`${r.id}: media imported (${m.kind})`);
          // give Postoria up to a minute (within this run's time budget) so the post goes out close to its time
          for (let i = 0; i < 12 && ids.length && Date.now() < budget; i++) {
            await new Promise(res2 => setTimeout(res2, 5000));
            const sts = await Promise.all(ids.map(id => pst_(`/workspaces/${ws}/media/${id}`)));
            if (sts.every(s => s.j && (s.j.status === 'ready' || s.j.status === 'failed'))) break;
          }
        }
        const wait = [...pst.media, ...(pst.thumb ? [pst.thumb] : [])];
        let ready = true;
        for (const id of wait) {
          const st = (await pst_(`/workspaces/${ws}/media/${id}`)).j;
          if (st && st.status === 'failed') { if (id === pst.thumb) { pst.thumb = null; changed = true; continue; } throw new Error('Postoria could not process the media'); }
          if (!st || st.status !== 'ready') ready = false;
        }
        if (!ready) { if (changed) await merge('pub', r.id, { pst }); log.push(`${r.id}: media processing`); continue; }
        for (const ch of todo) {
          const a = accOf(ch); if (!a) { res[ch] = { ok: false, error: 'החשבון לא מחובר ב-Postoria' }; continue; }
          if (ch === 'gbp' && pst.kind === 'video') { res[ch] = { ok: false, error: 'גוגל עסקי לא מקבל סרטונים' }; continue; }
          const p = await pst_(`/workspaces/${ws}/posts`, 'POST', postBody(row, ch, a, pst));
          if (p.status < 300 && p.j && p.j.id) res[ch] = { pending: p.j.id, via: 'postoria', at: new Date().toISOString() };
          else { const m = p.j && (p.j.message || p.j.error || p.j.title || p.j.errors); res[ch] = { ok: false, via: 'postoria', error: `Postoria ${p.status}: ${(m && typeof m === 'object' ? JSON.stringify(m) : String(m || JSON.stringify(p.j))).slice(0, 300)}` }; }
        }
      }
      // the links of what was sent
      for (const ch of chans) {
        if (!(res[ch] && res[ch].pending)) continue;
        const g = (await pst_(`/workspaces/${ws}/posts/${res[ch].pending}`)).j || {};
        const x = (g.results || [])[0] || {};
        if (x.error) res[ch] = { ok: false, via: 'postoria', postId: res[ch].pending, error: String(x.error).slice(0, 300) };
        else if (g.status === 'posted' || x.link_to_post) res[ch] = { ok: true, via: 'postoria', postId: res[ch].pending, url: x.link_to_post || '', at: res[ch].at };
      }
    } catch (e) { for (const ch of todo) if (!res[ch] || !res[ch].ok) res[ch] = { ok: false, via: 'postoria', error: String((e as Error).message || e).slice(0, 300) }; }
    // X (and any channel outside Postoria) is published by another function (bufauth): re-read its latest result so it is
    // never overwritten, and mark the row published only when those channels went out too
    const others = ((row.channels || []) as string[]).filter(c => !NET[c]);
    if (others.length) {
      const { data: cur } = await admin().from('docs').select('data').match({ coll: 'pub', id: r.id }).maybeSingle();
      const cres = (cur && cur.data && cur.data.result) || {};
      for (const c of others) if (cres[c]) res[c] = cres[c];
    }
    const allOk = chans.every(c => res[c] && res[c].ok) && others.every(c => res[c] && res[c].ok);
    const failed = chans.filter(c => res[c] && res[c].ok === false && !res[c].pending);
    const late = now - t > 3.5 * 3600e3;
    const status = allOk ? 'published' : late ? 'missed' : 'planned';
    // a failed channel is tried again on the next run (until 4 hours after the time)
    const patch: any = { result: res, status, handledAt: new Date().toISOString(), ...(pst ? { pst } : {}) };
    if (failed.length && !late) { for (const c of failed) { const e = res[c]; res[c] = { ...e, tries: ((row.result && row.result[c] && row.result[c].tries) || 0) + 1 }; if (res[c].tries < 6) delete res[c].ok; } }
    await merge('pub', r.id, patch);
    if (allOk && row.reel && res.instagram && res.instagram.ok) await merge('reel', row.reel, { igAt: new Date().toISOString(), igPub: r.id });
    const firstFail = failed.filter(c => !(row.result && row.result[c] && row.result[c].error));
    if (firstFail.length || (late && !allOk)) await telegram(`⚠️ פרסום דרך Postoria ${late ? 'לא הצליח' : 'נכשל, אנסה שוב'}: ${row.title || r.id}\n${chans.filter(c => !(res[c] && (res[c].ok || res[c].pending))).map(c => `${c}: ${(res[c] && res[c].error) || 'לא יצא'}`).join('\n')}`).catch(() => false);
    log.push(`${r.id}: ${status} ${JSON.stringify(res).slice(0, 220)}`);
  }
  return { ok: true, log };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  if (req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ ok: false }, 401);
  if (!env('POSTORIA_API_KEY')) return json({ ok: false, error: 'no key' }, 400);
  try {
    const b: any = await req.json().catch(() => ({}));
    if (b.action === 'accounts') return json(await accounts());
    if (b.action === 'video') { const r = await video(b); if (!r.ok) await telegram(`⚠️ Postoria: העלאת סרטון נכשלה (${(r as any).step || (r as any).status || ''})`).catch(() => false); return json(r); }
    if (b.action === 'publish') return json(await publish());
    if (b.action === 'post') { const ws = await workspace(); return json((await pst_(`/workspaces/${ws}/posts/${encodeURIComponent(b.postId)}`)).j); }
    return json({ ok: false, error: 'action?' }, 400);
  } catch (e) { console.error(e); return json({ ok: false, error: String(e) }, 500); }
});
