// postoria: publishing through Postoria (one API for TikTok and the other networks), connected 11.10.2026.
// The API key is POSTORIA_API_KEY in app_secrets (saved by Yakir in the office system, never shown).
// Cron/office calls (x-cron-secret):
//  POST {action:'accounts'}                         -> workspaces and connected accounts; marks settings/pub.postoria ok
//  POST {action:'video', reelPath, caption, networks:['tiktok'], who:'private'|'public', at?}
//       -> imports the reel (files bucket) into Postoria, waits until it is ready, creates the post (now or scheduled)
//  POST {action:'post', postId}                     -> the post status and the link on each network
import { loadSecrets, json, cors, admin, env, telegram } from './_shared/common.ts';

const API = 'https://api.postoria.io/v1';
// deno-lint-ignore no-explicit-any
async function pst(path: string, method = 'GET', body?: any): Promise<{ status: number; j: any }> {
  const r = await fetch(API + path, { method, headers: { authorization: `Bearer ${env('POSTORIA_API_KEY')}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j: unknown = null; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 500) }; }
  return { status: r.status, j };
}
const merge = (coll: string, id: string, patch: unknown) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
const list = (j: any) => (Array.isArray(j) ? j : (j && (j.data || j.items || j.results)) || []);

async function workspace(): Promise<number> {
  const { j } = await pst('/workspaces');
  const w = list(j)[0]; if (!w) throw new Error('no workspace');
  return w.id;
}
async function accounts() {
  const ws = await workspace();
  const { status, j } = await pst(`/workspaces/${ws}/social-accounts`);
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
  const imp = await pst(`/workspaces/${ws}/media/imports`, 'POST', { url: su.data.signedUrl, thumbnail_timestamp_ms: 1500 });
  const media = imp.j && (imp.j.id || imp.j.media_id || (imp.j.data && imp.j.data.id));
  if (!media) return { ok: false, step: 'import', status: imp.status, j: imp.j };
  let m: any = null, thumb = imp.j.thumbnail_media_id || null;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    m = (await pst(`/workspaces/${ws}/media/${media}`)).j;
    if (m && (m.status === 'ready' || m.status === 'failed')) break;
  }
  if (!m || m.status !== 'ready') return { ok: false, step: 'media', media, m };
  if (thumb) { for (let i = 0; i < 20; i++) { const t = (await pst(`/workspaces/${ws}/media/${thumb}`)).j; if (t && t.status === 'ready') break; if (t && t.status === 'failed') { thumb = null; break; } await new Promise(r => setTimeout(r, 2000)); } }
  const body: any = { publish_mode: b.at ? 'schedule' : 'publish_now', social_account_ids: ids, content_type: 'video', caption: String(b.caption || ''),
    media: [{ media_id: media, ...(thumb ? { thumbnail_media_id: thumb } : {}) }], is_ai_generated: false,
    tiktok: { who_can_watch: b.who === 'public' ? 'public' : 'private', allow_comments: true, allow_duet: false, allow_stitch: false, your_brand: false, branded_content: false, disclose_post_content: false, auto_add_music: false } };
  if (b.at) body.scheduled_time = new Date(b.at).toISOString().replace(/\.\d{3}Z$/, 'Z');
  const p = await pst(`/workspaces/${ws}/posts`, 'POST', body);
  return { ok: p.status < 300, status: p.status, post: p.j, media, thumb };
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
    if (b.action === 'post') { const ws = await workspace(); return json((await pst(`/workspaces/${ws}/posts/${encodeURIComponent(b.postId)}`)).j); }
    return json({ ok: false, error: 'action?' }, 400);
  } catch (e) { console.error(e); return json({ ok: false, error: String(e) }, 500); }
});
