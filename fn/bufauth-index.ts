// Buffer connection for the office (11.10.2026, Yakir: publish to Facebook, LinkedIn and X through Buffer instead of Grok Bot).
// action 'save' {key}: an office user pastes the Buffer API key in the publishing board. The key is tested against
//   the Buffer API (account, organizations, channels) and saved in app_secrets (BUFFER_API_KEY) only if it works.
// action 'status': what the board shows (settings/pub.buffer).
// cron (x-cron-secret) {action:'channels'}: re-reads the channels with the saved key.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { loadSecrets, env, admin, cors, json, telegram } from '../_shared/common.ts';

const API = 'https://api.buffer.com';
// deno-lint-ignore no-explicit-any
async function gql(key: string, query: string, variables: any = {}) {
  const r = await fetch(API, { method: 'POST', headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  // deno-lint-ignore no-explicit-any
  const d: any = await r.json().catch(() => ({}));
  if (!r.ok || d.errors) throw new Error((d.errors && d.errors[0] && d.errors[0].message) || `Buffer ${r.status}`);
  return d.data;
}
async function readChannels(key: string) {
  const a = await gql(key, '{ account { id name organizations { id name } } }');
  const orgs = (a && a.account && a.account.organizations) || [];
  const channels: { id: string; name: string; displayName: string; service: string; org: string; paused: boolean }[] = [];
  for (const o of orgs) {
    const c = await gql(key, 'query($i: ChannelsInput!) { channels(input: $i) { id name displayName service isQueuePaused } }', { i: { organizationId: o.id } });
    // deno-lint-ignore no-explicit-any
    (c.channels || []).forEach((x: any) => channels.push({ id: x.id, name: x.displayName || x.name, displayName: x.displayName || '', service: x.service, org: o.id, paused: !!x.isQueuePaused }));
  }
  return { account: a.account ? a.account.name : '', orgs: orgs.map((o: { id: string; name: string }) => ({ id: o.id, name: o.name })), channels };
}
async function isOffice(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (!auth) return false;
  const u = createClient(env('SUPABASE_URL'), env('SUPABASE_ANON_KEY'), { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
  const { data: ok, error } = await u.rpc('is_office_user'); return !error && ok === true;
}
// deno-lint-ignore no-explicit-any
const merge = (patch: any) => admin().rpc('docs_merge', { p_coll: 'settings', p_id: 'pub', p_patch: patch });
// deno-lint-ignore no-explicit-any
const mergeDoc = (coll: string, id: string, patch: any) => admin().rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });

// ---- publishing (cron every 10 minutes): calendar rows (docs coll "pub") whose owner is "office" ----
// (11.10.2026: Grok Bot was cancelled; facebook / linkedin / x go through Buffer, youtube through SocialAPI)
// Each row: at (Israel time 'YYYY-MM-DDTHH:MM'), channels (facebook / linkedin / x), text, textX (optional, for X),
// link (optional, added to the text if missing), media (images or one .mp4; {MEDIA} token allowed), reelPath (storage)
// or reelFrom (the id of the 19:05 system row whose staged reel to use), ytTitle / ytDesc / ytTags for YouTube.
// A channel that went out gets result.<channel> = {ok, id, url}; failures go to Telegram and are retried for 2 hours.
const CH2SVC: Record<string, string> = { facebook: 'facebook', linkedin: 'linkedin', x: 'twitter' };
function ilToMs(at: string) {
  const [d, t] = String(at).split('T'); const [y, m, dd] = d.split('-').map(Number); const [hh, mm] = (t || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, m - 1, dd, hh, mm);
  const il = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' })).getTime();
  const utc = new Date(new Date(guess).toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  return guess - (il - utc);
}
const SAPI = 'https://api.social-api.ai/v1';
// deno-lint-ignore no-explicit-any
async function sapi(key: string, path: string, method = 'GET', body?: any) {
  const r = await fetch(SAPI + path, { method, headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  // deno-lint-ignore no-explicit-any
  const d: any = await r.json().catch(() => ({}));
  return { status: r.status, d };
}
// deno-lint-ignore no-explicit-any
async function youtubeOut(row: any, media: string[], cfg: any) {
  const key = env('SOCAPI_KEY'); if (!key) return { ok: false, error: 'SocialAPI לא מחובר' };
  const acc = ((cfg.socapi && cfg.socapi.accounts) || []).find((a: { platform: string }) => a.platform === 'youtube');
  if (!acc) return { ok: false, error: 'ערוץ היוטיוב לא מחובר ב-SocialAPI' };
  const vid = media.find(m => /\.mp4(\?|$)/i.test(m) || /reels\//.test(m) || /token=/.test(m));
  if (!vid) return { ok: false, error: 'אין קובץ וידאו בשורה' };
  // monthly limit of the plan (10 uploads): counted from our own results
  const month = new Date().toISOString().slice(0, 7);
  const { data: done } = await admin().from('docs').select('id').eq('coll', 'pub').like('data->result->youtube->>at', month + '%');
  const cap = +(cfg.socapi && cfg.socapi.monthlyCap) || 10;
  if ((done || []).length >= cap) return { ok: false, error: `הגענו למכסה החודשית של SocialAPI (${cap} העלאות)`, cap: true };
  const tags = String(row.ytTags || '').split(',').map((t: string) => t.trim()).filter(Boolean).slice(0, 15);
  const body = { targets: [{ account_id: acc.id }], publish_now: true, title: String(row.ytTitle || row.title || '').replace(/^סרטון שאלה: /, '').slice(0, 100), text: String(row.ytDesc || row.text || '').slice(0, 4900), visibility: 'public', media: [{ source_type: 'url', source: vid }], platform_data: { youtube: { category_id: '27', tags, made_for_kids: false, default_language: 'he' } } };
  const { status, d } = await sapi(key, '/posts', 'POST', body);
  if (status >= 300 || !d.id) return { ok: false, error: `SocialAPI ${status}: ${String((d.error && (d.error.message || d.error)) || d.message || '').slice(0, 200)}` };
  return { ok: true, pid: d.id, state: d.status || 'publishing', at: new Date().toISOString() };
}
const CREATE = 'mutation($i: CreatePostInput!) { createPost(input: $i) { __typename ... on PostActionSuccess { post { id status externalLink } } ... on MutationError { message } } }';
// deno-lint-ignore no-explicit-any
function buildInput(row: any, ch: string, channelId: string, media: string[], draft: boolean) {
  let text = String((ch === 'x' && row.textX) || row.text || '').trim();
  if (row.link && !text.includes(row.link)) text += `\n\n${row.link}`;
  if (ch === 'x' && !row.textX && text.length > 270) {
    const keep = row.link ? 270 - row.link.length - 4 : 268;
    text = text.replace(row.link || '\u0000', '').trim().slice(0, keep).replace(/\s+\S*$/, '') + '…' + (row.link ? `\n${row.link}` : '');
  }
  const vids = media.filter(m => /\.mp4(\?|$)/i.test(m) || /reels\//.test(m));
  const imgs = media.filter(m => /\.(jpe?g|png|webp)(\?|$)/i.test(m));
  // deno-lint-ignore no-explicit-any
  const assets: any[] = vids.length ? [{ video: { url: vids[0], metadata: { title: String(row.title || '').slice(0, 90) } } }]
    : imgs.slice(0, 4).map(u => ({ image: { url: u, metadata: { altText: String(row.alt || row.title || 'עו״ד יקיר דבול').slice(0, 200) } } }));
  // deno-lint-ignore no-explicit-any
  const input: any = { channelId, text, schedulingType: 'automatic', mode: 'shareNow', needsApproval: false, assets, source: 'dabul-office' };
  if (draft) { input.saveToDraft = true; input.mode = 'addToQueue'; }
  if (ch === 'facebook') input.metadata = { facebook: { type: vids.length && row.kind === 'video' ? 'reel' : 'post' } };
  return input;
}
async function publishDue(key: string, dryRow?: string) {
  const cfgRow = await admin().from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle();
  // deno-lint-ignore no-explicit-any
  const cfg: any = (cfgRow.data && cfgRow.data.data) || {};
  const chans = (cfg.buffer && cfg.buffer.channels) || [];
  const byChan: Record<string, string> = {};
  for (const [ch, svc] of Object.entries(CH2SVC)) { const c = chans.find((x: { service: string; paused: boolean }) => x.service === svc && !x.paused); if (c) byChan[ch] = c.id; }
  const now = Date.now(), log: string[] = [];
  const from = new Date(now - 30 * 3600e3).toISOString().slice(0, 10);
  const q = admin().from('docs').select('id,data').eq('coll', 'pub').eq('data->>owner', 'office');
  const { data } = dryRow ? await q.eq('id', dryRow) : await q.eq('data->>status', 'planned').gte('data->>at', from);
  for (const r of data || []) {
    const row = r.data; const t = ilToMs(row.at);
    if (!dryRow && (t > now || now - t > 2 * 3600e3)) continue;
    const res = { ...(row.result || {}) };
    let media: string[] = (row.media || []).map((m: string) => String(m).replace('{MEDIA}', cfg.media || ''));
    let reelPath = row.reelPath;
    if (!reelPath && row.reelFrom) { const { data: rf } = await admin().from('docs').select('data').match({ coll: 'pub', id: row.reelFrom }).maybeSingle(); reelPath = rf && rf.data && rf.data.reelPath; }
    if (reelPath) {
      const su = await admin().storage.from('files').createSignedUrl(reelPath, 6 * 3600);
      if (su.data) media = [su.data.signedUrl, ...media.filter(m => !/\.mp4/i.test(m))];
    }
    if (!dryRow && (row.channels || []).includes('youtube') && !(res.youtube && (res.youtube.ok || res.youtube.cap))) {
      try { res.youtube = await youtubeOut(row, media, cfg); } catch (e) { res.youtube = { ok: false, error: String((e as Error).message || e).slice(0, 300) }; }
    }
    for (const ch of (row.channels || []) as string[]) {
      if (!CH2SVC[ch] || (res[ch] && res[ch].ok)) continue;
      if (!byChan[ch]) { res[ch] = { ok: false, error: 'הערוץ לא מחובר ב-Buffer' }; continue; }
      if (!row.text && !row.textX) { res[ch] = { ok: false, error: 'אין טקסט בשורה' }; continue; }
      try {
        const d = await gql(key, CREATE, { i: buildInput(row, ch, byChan[ch], media, !!dryRow) });
        const o = d.createPost || {};
        if (o.__typename !== 'PostActionSuccess') throw new Error(o.message || 'Buffer לא קיבל את הפוסט');
        res[ch] = { ok: true, id: o.post.id, url: o.post.externalLink || '', at: new Date().toISOString(), draft: !!dryRow };
      } catch (e) { res[ch] = { ok: false, error: String((e as Error).message || e).slice(0, 300) }; }
    }
    const want = ((row.channels || []) as string[]).filter(c => CH2SVC[c] || c === 'youtube');
    const allOk = want.length > 0 && want.every(c => res[c] && res[c].ok);
    const failed = want.filter(c => res[c] && !res[c].ok);
    if (dryRow) { log.push(JSON.stringify(res)); continue; }
    const last = now - t > 100 * 60e3;
    await mergeDoc('pub', r.id, { result: res, status: allOk ? 'published' : last ? 'missed' : 'planned', handledAt: new Date().toISOString() });
    if (failed.length && (last || !row.result)) await telegram(`⚠️ פרסום דרך Buffer נכשל: ${row.title || r.id}\n${failed.map(c => `${c}: ${res[c].error}`).join('\n')}${last ? '' : '\nאנסה שוב בעשר הדקות הבאות.'}`).catch(() => false);
    log.push(`${r.id}: ${JSON.stringify(res).slice(0, 200)}`);
  }
  // YouTube uploads run in the background at SocialAPI: fill in the link (or report a failure) later
  try {
    const key2 = env('SOCAPI_KEY');
    if (key2 && !dryRow) {
      const { data: yt } = await admin().from('docs').select('id,data').eq('coll', 'pub').eq('data->>owner', 'office').not('data->result->youtube->>pid', 'is', null).is('data->result->youtube->>url', null).gte('data->>at', from);
      for (const r of yt || []) {
        const y = r.data.result.youtube; const { d } = await sapi(key2, '/posts/' + y.pid);
        const tg0 = (d.targets || [])[0] || {};
        const st = String(tg0.status || d.status || '');
        if (/published|success|completed/i.test(st)) { await mergeDoc('pub', r.id, { result: { ...r.data.result, youtube: { ...y, state: st, url: tg0.url || tg0.platform_url || tg0.permalink || d.url || 'ok' } } }); log.push(r.id + ': youtube ' + st); }
        else if (/fail|error/i.test(st)) { await mergeDoc('pub', r.id, { result: { ...r.data.result, youtube: { ...y, ok: false, state: st, error: String(tg0.error || d.error || st).slice(0, 300) } }, status: 'planned' }); await telegram(`⚠️ ההעלאה ליוטיוב נכשלה: ${r.data.title}\n${String(tg0.error || st).slice(0, 200)}`).catch(() => false); }
      }
    }
  } catch (e) { log.push('yt check: ' + String((e as Error).message || e)); }
  return log;
}
const SVC: Record<string, string> = { facebook: 'פייסבוק', linkedin: 'לינקדאין', twitter: 'X', instagram: 'אינסטגרם', tiktok: 'טיקטוק', youtube: 'יוטיוב', threads: 'Threads', pinterest: 'Pinterest', googlebusiness: 'גוגל עסקי', google: 'גוגל עסקי' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  // deno-lint-ignore no-explicit-any
  const b: any = await req.json().catch(() => ({}));
  const cron = env('CRON_SECRET') && req.headers.get('x-cron-secret') === env('CRON_SECRET');
  try {
    if (cron && (b.action === 'publish' || b.action === 'dry')) {
      const key = env('BUFFER_API_KEY'); if (!key) return json({ ok: false, error: 'no key' });
      return json({ ok: true, log: await publishDue(key, b.action === 'dry' ? String(b.id || '') : undefined) });
    }
    if (cron && b.action === 'channels') {
      const key = env('BUFFER_API_KEY'); if (!key) return json({ ok: false, error: 'no key' });
      const r = await readChannels(key);
      await merge({ buffer: { ok: true, check: 'done', checkedAt: new Date().toISOString(), account: r.account, orgs: r.orgs, channels: r.channels } });
      return json({ ok: true, ...r });
    }
    if (!(await isOffice(req))) return json({ error: 'אין הרשאה' }, 401);
    if (b.action === 'status') {
      const { data } = await admin().from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle();
      return json({ buffer: (data && data.data && data.data.buffer) || {}, hasKey: !!env('BUFFER_API_KEY') });
    }
    if (b.action === 'save-sapi') {
      const key = String(b.key || '').trim();
      if (key.length < 20 || /\s/.test(key)) return json({ error: 'המפתח לא נראה תקין' }, 400);
      const { status, d } = await sapi(key, '/accounts');
      if (status !== 200) return json({ error: `SocialAPI לא קיבל את המפתח (${status})` }, 400);
      // deno-lint-ignore no-explicit-any
      const accounts = (d.data || []).map((a: any) => ({ id: a.id, platform: a.platform, name: a.name || a.username || '' }));
      const { error } = await admin().from('app_secrets').upsert({ k: 'SOCAPI_KEY', v: key }, { onConflict: 'k' });
      if (error) return json({ error: 'השמירה נכשלה' }, 500);
      const now = new Date().toISOString();
      await merge({ socapi: { ok: true, saved: now, checkedAt: now, accounts, monthlyCap: 10 } });
      await telegram(`🔗 SocialAPI מחובר למערכת המשרד.\nהחשבונות: ${accounts.map((a: { platform: string; name: string }) => `${a.platform}: ${a.name}`).join(', ') || 'לא נמצאו'}`).catch(() => false);
      return json({ ok: true, accounts });
    }
    if (b.action === 'save') {
      const key = String(b.key || '').trim();
      if (key.length < 20 || /\s/.test(key)) return json({ error: 'המפתח לא נראה תקין' }, 400);
      let r;
      try { r = await readChannels(key); } catch (e) { return json({ error: 'Buffer לא קיבל את המפתח: ' + String((e as Error).message || e).slice(0, 160) }, 400); }
      const { error } = await admin().from('app_secrets').upsert({ k: 'BUFFER_API_KEY', v: key }, { onConflict: 'k' });
      if (error) return json({ error: 'השמירה נכשלה' }, 500);
      const now = new Date().toISOString();
      await merge({ buffer: { ok: true, check: 'done', saved: now, checkedAt: now, account: r.account, orgs: r.orgs, channels: r.channels } });
      const list = r.channels.map(c => `${SVC[c.service] || c.service}: ${c.name}`).join('\n');
      await telegram(`🔗 Buffer מחובר למערכת המשרד.\nהערוצים שנמצאו:\n${list || 'לא נמצאו ערוצים'}`).catch(() => false);
      return json({ ok: true, channels: r.channels });
    }
    return json({ error: 'action?' }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e).slice(0, 300) }, 500);
  }
});
