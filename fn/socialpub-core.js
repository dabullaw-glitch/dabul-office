// socialpub: the office system's own publisher (cron every 10 minutes, x-cron-secret).
// Publishes calendar rows (docs coll "pub") whose owner is "system", when their time comes:
//   instagram: feed image, reel (video) and story, through the Instagram API with Instagram Login (secret IG_TOKEN)
//   tiktok:    once settings/pub.tiktok.ok (secret TIKTOK_TOKEN) - not active yet
// Also: checks a newly saved Instagram token (settings/pub.ig.check = 'pending'), refreshes it every 30 days,
// and reports to Telegram. Grok Bot's rows are never touched here.
export function start(createClient) {
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const IG = 'https://graph.instagram.com/v21.0';
  const merge = (coll, id, patch) => sb.rpc('docs_merge', { p_coll: coll, p_id: id, p_patch: patch });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  // "2026-10-14T12:30" Israel time -> epoch ms
  const ilToMs = (at) => {
    const guess = Date.parse(at + ':00Z');
    const off = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jerusalem', timeZoneName: 'shortOffset' }).formatToParts(new Date(guess)).find((p) => p.type === 'timeZoneName')?.value || 'GMT+2';
    const h = Number((off.match(/GMT([+-]\d+)/) || [0, 2])[1]);
    return guess - h * 3600e3;
  };
  async function secrets() {
    const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'IG_TOKEN', 'TIKTOK_TOKEN', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
    return Object.fromEntries((data || []).map((r) => [r.k, r.v]));
  }
  async function tg(S, text) {
    if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return;
    await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }) }).catch(() => null);
  }
  async function ig(path, params, token, method = 'POST') {
    const u = new URL(IG + path); Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, String(v))); u.searchParams.set('access_token', token);
    const r = await fetch(u, { method }); const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error?.message || ('HTTP ' + r.status));
    return j;
  }
  async function igWait(id, token) {
    for (let i = 0; i < 40; i++) {
      const s = await ig('/' + id, { fields: 'status_code' }, token, 'GET');
      if (s.status_code === 'FINISHED') return;
      if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram could not process the file (' + s.status_code + ')');
      await sleep(5000);
    }
    throw new Error('Instagram is still processing the video');
  }
  async function igPublish(row, cfg, token) {
    const fill = (s) => String(s || '').split('{SITE}').join(cfg.site || '').split('{MEDIA}').join(cfg.media || '');
    const media = (row.media || []).map(fill);
    const caption = fill(row.text).slice(0, 2150);
    const done = [];
    const feed = media.find((m) => !/story/i.test(m.split('/').pop()));
    const stories = media.filter((m) => /story/i.test(m.split('/').pop()));
    if (feed) {
      const isVideo = /\.(mp4|mov)$/i.test(feed);
      const c = await ig('/me/media', isVideo ? { media_type: 'REELS', video_url: feed, caption, share_to_feed: true } : { image_url: feed, caption }, token);
      if (isVideo) await igWait(c.id, token);
      const p = await ig('/me/media_publish', { creation_id: c.id }, token);
      done.push({ kind: isVideo ? 'reel' : 'post', id: p.id });
    }
    for (const s of stories) {
      const isVideo = /\.(mp4|mov)$/i.test(s);
      const c = await ig('/me/media', isVideo ? { media_type: 'STORIES', video_url: s } : { media_type: 'STORIES', image_url: s }, token);
      if (isVideo) await igWait(c.id, token);
      const p = await ig('/me/media_publish', { creation_id: c.id }, token);
      done.push({ kind: 'story', id: p.id });
    }
    if (!done.length) throw new Error('no media file in the row');
    return done;
  }
  Deno.serve(async (req) => {
    const S = await secrets();
    if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return new Response('unauthorized', { status: 401 });
    const cfg = (await sb.from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle()).data?.data || {};
    const igc = cfg.ig || {}; const log = [];
    // 1) a new Instagram token: check it once and report
    if (S.IG_TOKEN && igc.check === 'pending') {
      try {
        const me = await ig('/me', { fields: 'user_id,username,account_type' }, S.IG_TOKEN, 'GET');
        await merge('settings', 'pub', { ig: { ok: true, check: 'done', username: me.username || '', type: me.account_type || '', saved: igc.saved || new Date().toISOString(), refreshed: new Date().toISOString() } });
        await tg(S, `✅ אינסטגרם מחובר (@${me.username || ''}). מעכשיו המערכת מפרסמת באינסטגרם לפי לוח הפרסום.`);
        igc.ok = true;
      } catch (e) {
        await merge('settings', 'pub', { ig: { ok: false, check: 'failed', error: String(e.message || e).slice(0, 200), saved: igc.saved || '' } });
        await tg(S, `⚠️ קוד הגישה של אינסטגרם לא עבד: ${String(e.message || e).slice(0, 150)}. צריך ליצור קוד חדש ולהדביק שוב (שיווק > לוח פרסום).`);
      }
    }
    // 2) refresh the long-lived token every 30 days (it lives 60)
    if (S.IG_TOKEN && igc.ok && Date.now() - Date.parse(igc.refreshed || igc.saved || 0) > 30 * 864e5) {
      try {
        const r = await ig('/refresh_access_token', { grant_type: 'ig_refresh_token' }, S.IG_TOKEN, 'GET').catch(async () => {
          const u = new URL('https://graph.instagram.com/refresh_access_token'); u.searchParams.set('grant_type', 'ig_refresh_token'); u.searchParams.set('access_token', S.IG_TOKEN);
          const x = await fetch(u); return x.json();
        });
        if (r.access_token) { await sb.rpc('set_secret', { p_key: 'IG_TOKEN', p_value: r.access_token }); S.IG_TOKEN = r.access_token; await merge('settings', 'pub', { ig: { ...igc, refreshed: new Date().toISOString() } }); log.push('ig token refreshed'); }
      } catch (e) { log.push('ig refresh failed: ' + (e.message || e)); }
    }
    // 3) due rows of the system: from 2 hours ago until now
    const now = Date.now();
    const from = new Date(now - 30 * 3600e3).toISOString().slice(0, 10);
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'pub').eq('data->>owner', 'system').eq('data->>status', 'planned').gte('data->>at', from);
    for (const r of data || []) {
      const row = r.data; const t = ilToMs(row.at);
      if (t > now || now - t > 2 * 3600e3) continue;
      const ch = row.channels || [];
      const res = { ...(row.result || {}) };
      if (ch.includes('instagram') && !res.instagram) {
        if (!S.IG_TOKEN || !igc.ok) { res.instagram = { skipped: 'not connected' }; }
        else {
          try { res.instagram = { ok: true, at: new Date().toISOString(), items: await igPublish(row, cfg, S.IG_TOKEN) }; }
          catch (e) { res.instagram = { ok: false, error: String(e.message || e).slice(0, 300) }; await tg(S, `⚠️ פרסום באינסטגרם נכשל: ${row.title}\n${res.instagram.error}`); }
        }
      }
      if (ch.includes('tiktok') && !res.tiktok) res.tiktok = { skipped: 'not connected' };
      if (ch.includes('whatsapp') && !res.whatsapp) res.whatsapp = { skipped: 'handled by the community job' };
      const anyOk = Object.values(res).some((x) => x && x.ok);
      const allSkipped = Object.values(res).every((x) => x && x.skipped);
      await merge('pub', r.id, { result: res, status: anyOk ? 'published' : allSkipped ? 'waiting' : 'planned', handledAt: new Date().toISOString() });
      log.push(r.id + ': ' + JSON.stringify(res).slice(0, 200));
    }
    return Response.json({ ok: true, log });
  });
}
