// socialpub: the office system's own publisher (cron every 10 minutes, x-cron-secret).
// Publishes calendar rows (docs coll "pub") whose owner is "system", when their time comes:
//   instagram: feed image, reel (video) and story, through the Instagram API with Instagram Login (secret IG_TOKEN)
//   tiktok:    once settings/pub.tiktok.ok (secret TIKTOK_TOKEN) - not active yet
// Weekly reels: stageReels() attaches the approved reel of that day and copies it from Drive to storage; reels publish in two steps.
// Also: checks a newly saved Instagram token (settings/pub.ig.check = 'pending'), refreshes it every 30 days,
// and reports to Telegram. Grok Bot's rows are never touched here.
export function start(createClient) {
  const sb = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  const IG = 'https://graph.instagram.com/v21.0', FB = 'https://graph.facebook.com/v21.0';
  // two ways to connect: Instagram login (token IGAA..., calls graph.instagram.com/me/...) or
  // Facebook login (user token EAA... -> the page token of the page linked to Instagram, calls graph.facebook.com/<ig-id>/...)
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
    const { data } = await sb.from('app_secrets').select('k,v').in('k', ['CRON_SECRET', 'IG_TOKEN', 'IG_PAGE_TOKEN', 'TIKTOK_TOKEN', 'TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID']);
    return Object.fromEntries((data || []).map((r) => [r.k, r.v]));
  }
  async function tg(S, text) {
    if (!S.TELEGRAM_BOT_TOKEN || !S.TELEGRAM_CHAT_ID) return;
    await fetch(`https://api.telegram.org/bot${S.TELEGRAM_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ chat_id: S.TELEGRAM_CHAT_ID, text, disable_web_page_preview: true }) }).catch(() => null);
  }
  async function ig(path, params, token, method = 'POST', base = IG) {
    const u = new URL(base + path); Object.entries(params || {}).forEach(([k, v]) => u.searchParams.set(k, String(v))); u.searchParams.set('access_token', token);
    const r = await fetch(u, { method }); const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error) throw new Error(j.error?.message || ('HTTP ' + r.status));
    return j;
  }
  async function igWait(id, C) {
    for (let i = 0; i < 40; i++) {
      const s = await ig('/' + id, { fields: 'status_code' }, C.token, 'GET', C.base);
      if (s.status_code === 'FINISHED') return;
      if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error('Instagram could not process the file (' + s.status_code + ')');
      await sleep(5000);
    }
    throw new Error('Instagram is still processing the video');
  }
  // Publishes one calendar row on Instagram. A reel is done in two steps, so no run waits for Instagram:
  // run 1 creates the reel container and stores its id (pending); a later run (every 10 minutes) publishes it once Instagram has processed the video.
  async function igPublish(row, cfg, C, prev) {
    const fill = (s) => String(s || '').split('{SITE}').join(cfg.site || '').split('{MEDIA}').join(cfg.media || '');
    const media = (row.media || []).map(fill);
    const caption = fill(row.text).slice(0, 2150);
    const done = [...((prev && prev.items) || [])];
    const feed = media.find((m) => !/story/i.test(m.split('?')[0].split('/').pop()));
    const stories = media.filter((m) => /story/i.test(m.split('?')[0].split('/').pop()));
    const feedDone = done.some((d) => d.kind === 'reel' || d.kind === 'post');
    if (feed && !feedDone) {
      const isVideo = /\.(mp4|mov)(\?|$)/i.test(feed);
      let cid = prev && prev.pending;
      if (!cid) {
        const c = await ig(C.who + '/media', isVideo ? { media_type: 'REELS', video_url: feed, caption, share_to_feed: true } : { image_url: feed, caption }, C.token, 'POST', C.base);
        cid = c.id;
      }
      if (isVideo) {
        await sleep(prev && prev.pending ? 0 : 15000);
        const st = await ig('/' + cid, { fields: 'status_code' }, C.token, 'GET', C.base);
        if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error('Instagram could not process the video (' + st.status_code + ')');
        if (st.status_code !== 'FINISHED') return { pending: cid, items: done };
      }
      const p = await ig(C.who + '/media_publish', { creation_id: cid }, C.token, 'POST', C.base);
      done.push({ kind: isVideo ? 'reel' : 'post', id: p.id });
    }
    for (const s of stories) {
      if (done.some((d) => d.kind === 'story' && d.src === s.split('?')[0])) continue;
      const isVideo = /\.(mp4|mov)(\?|$)/i.test(s);
      const c = await ig(C.who + '/media', isVideo ? { media_type: 'STORIES', video_url: s } : { media_type: 'STORIES', image_url: s }, C.token, 'POST', C.base);
      if (isVideo) await igWait(c.id, C);
      const p = await ig(C.who + '/media_publish', { creation_id: c.id }, C.token, 'POST', C.base);
      done.push({ kind: 'story', id: p.id, src: s.split('?')[0] });
    }
    if (!done.length) throw new Error('no media file in the row');
    return { items: done };
  }

  // ---- weekly reel: the approved reel of the same day (docs coll "reel", publishAt) is attached to the system video row,
  // copied from Google Drive to private storage (files/reels/<driveId>.mp4) up to 2 days ahead, and published with its Instagram caption.
  const ilDate = (ms) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem' }).format(new Date(ms));
  async function reelFor(row) {
    if (row.reel) return (await sb.from('docs').select('id,data').match({ coll: 'reel', id: row.reel }).maybeSingle()).data;
    const day = String(row.at).slice(0, 10);
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'reel').in('data->>status', ['approved', 'handed', 'published']);
    return (data || []).find((r) => r.data.publishAt && ilDate(Date.parse(r.data.publishAt)) === day) || null;
  }
  async function stageReels(S, log, only) {
    const now = Date.now();
    const from = new Date(now - 30 * 3600e3).toISOString().slice(0, 10);
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'pub').eq('data->>owner', 'system').eq('data->>status', 'planned').eq('data->>kind', 'video').gte('data->>at', from);
    for (const r of data || []) {
      const row = r.data, t = ilToMs(row.at);
      if (only ? r.id !== only : (row.reelPath || (row.media || []).length || t - now > 48 * 3600e3 || now - t > 2 * 3600e3)) continue;
      if (!(row.channels || []).includes('instagram')) continue;
      const reel = await reelFor(row);
      if (!reel) { if (t - now < 6 * 3600e3 && !row.noReelWarned) { await merge('pub', r.id, { noReelWarned: new Date().toISOString() }); await tg(S, `⚠️ אין רילס מאושר לתאריך ${row.at.slice(0, 10)}, אז באינסטגרם לא יעלה סרטון השבוע.`); } continue; }
      try {
        const res = await fetch('https://drive.usercontent.google.com/download?id=' + encodeURIComponent(reel.data.driveId) + '&export=download&confirm=t');
        const type = res.headers.get('content-type') || '';
        if (!res.ok || !/video|octet-stream/.test(type)) throw new Error('Drive download failed (' + res.status + ' ' + type + ')');
        const buf = new Uint8Array(await res.arrayBuffer());
        if (buf.length < 200000) throw new Error('the file from Drive is too small (' + buf.length + ' bytes)');
        const path = 'reels/' + reel.data.driveId + '.mp4';
        const up = await sb.storage.from('files').upload(path, buf, { contentType: 'video/mp4', upsert: true });
        if (up.error) throw new Error('storage: ' + up.error.message);
        const cap = (reel.data.captions && reel.data.captions.instagram) || '';
        await merge('pub', r.id, { reel: reel.id, reelPath: path, reelBytes: buf.length, staged: new Date().toISOString(), title: 'רילס: ' + (reel.data.name || ''), text: row.text || cap, textTiktok: (reel.data.captions && reel.data.captions.tiktok) || '' });
        log.push(r.id + ' staged ' + path + ' ' + buf.length);
      } catch (e) {
        log.push(r.id + ' stage failed: ' + (e.message || e));
        if (!row.stageWarned) { await merge('pub', r.id, { stageWarned: new Date().toISOString() }); await tg(S, `⚠️ לא הצלחתי להכין את הרילס "${reel.data.name || ''}" לאינסטגרם: ${String(e.message || e).slice(0, 150)}. אנסה שוב בעוד 10 דקות.`); }
      }
      break; // one video per run
    }
  }

  // ---- verification of Grok Bot's rows: did it really go out? (YouTube by the public channel feed, Facebook by the page token)
  async function ytFeed(channelId) {
    const r = await fetch('https://www.youtube.com/feeds/videos.xml?channel_id=' + encodeURIComponent(channelId));
    const x = await r.text(); const out = [];
    for (const e of x.split('<entry>').slice(1)) {
      const g = (re) => (e.match(re) || [])[1] || '';
      out.push({ id: g(/<yt:videoId>([^<]+)</), title: g(/<title>([^<]*)</), at: g(/<published>([^<]+)</) });
    }
    return out;
  }
  async function fbPosts(cfg, S) {
    const ig = cfg.ig || {}; if (ig.mode !== 'fb' || !ig.pageId || !S.IG_PAGE_TOKEN) return null;
    const j = await ig_('/' + ig.pageId + '/posts', { fields: 'message,created_time,permalink_url', limit: 30 }, S.IG_PAGE_TOKEN);
    return (j.data || []).map((p) => ({ id: p.id, at: p.created_time, text: p.message || '', url: p.permalink_url || '' }));
  }
  async function ig_(path, params, token) { return ig(path, params, token, 'GET', FB); }
  async function verifyGrok(S, cfg, log) {
    const now = Date.now();
    const from = new Date(now - 3 * 864e5).toISOString().slice(0, 10);
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'pub').eq('data->>owner', 'grok').eq('data->>status', 'planned').gte('data->>at', from);
    const due = (data || []).filter((r) => { const t = ilToMs(r.data.at); return now - t > 2 * 3600e3; });
    if (!due.length) return;
    const yt = cfg.youtube?.channelId ? await ytFeed(cfg.youtube.channelId).catch(() => null) : null;
    const fb = await fbPosts(cfg, S).catch(() => null);
    const checks = { at: new Date().toISOString(), youtube: yt ? yt.slice(0, 10) : null, facebook: fb ? fb.slice(0, 10).map((p) => ({ id: p.id, at: p.at, url: p.url, text: p.text.slice(0, 80) })) : null };
    await merge('settings', 'pub', { checks });
    const missed = [];
    for (const r of due) {
      const row = r.data, t = ilToMs(row.at), ch = row.channels || [], v = {};
      const near = (iso) => { const x = Date.parse(iso); return x >= t - 3600e3 && x <= t + 8 * 3600e3; };
      if (ch.includes('youtube') && yt) { const hit = yt.find((e) => near(e.at)); v.youtube = hit ? { ok: true, id: hit.id, title: hit.title } : { ok: false }; }
      if (ch.includes('facebook') && fb) {
        const key = String(row.text || '').replace(/\s+/g, ' ').slice(0, 40);
        const hit = fb.find((p) => near(p.at) && (!key || p.text.replace(/\s+/g, ' ').includes(key.slice(0, 25)))) || fb.find((p) => near(p.at));
        v.facebook = hit ? { ok: true, id: hit.id, url: hit.url } : { ok: false };
      }
      const checked = Object.values(v), late = now - t > 8 * 3600e3;
      let status = 'planned';
      if (checked.length && checked.every((x) => x.ok)) status = 'published';
      else if (late) {
        if (row.kind === 'own-video' || row.kind === 'community') status = 'unverified';
        else if (checked.some((x) => !x.ok)) { status = 'missed'; missed.push(row); }
        else status = 'unverified';
      }
      if (status !== 'planned') { await merge('pub', r.id, { status, verify: v, verifiedAt: new Date().toISOString() }); log.push(r.id + ' -> ' + status); }
    }
    if (missed.length) await tg(S, '⚠️ גרוק בוט לא פרסם לפי הלוח:\n' + missed.map((m) => `• ${m.at.replace('T', ' ')} ${m.title}`).join('\n') + '\nאני בודק ומעדכן את הלוח.');
  }
  Deno.serve(async (req) => {
    const S = await secrets();
    if (!S.CRON_SECRET || req.headers.get('x-cron-secret') !== S.CRON_SECRET) return new Response('unauthorized', { status: 401 });
    const cfg = (await sb.from('docs').select('data').match({ coll: 'settings', id: 'pub' }).maybeSingle()).data?.data || {};
    const igc = cfg.ig || {}; const log = [];
    // dry test (?test=reel&pub=<row id>): stage that row's reel and let Instagram process it, without publishing anything
    const q = new URL(req.url).searchParams;
    if (q.get('test') === 'reel' && q.get('pub')) {
      const id = q.get('pub');
      await stageReels(S, log, id);
      const row = (await sb.from('docs').select('data').match({ coll: 'pub', id }).maybeSingle()).data?.data || {};
      if (!row.reelPath) return Response.json({ ok: false, log });
      const su = await sb.storage.from('files').createSignedUrl(row.reelPath, 3600);
      const C = igc.mode === 'fb' ? { base: FB, who: '/' + igc.igId, token: S.IG_PAGE_TOKEN } : { base: IG, who: '/me', token: S.IG_TOKEN };
      try {
        const c = await ig(C.who + '/media', { media_type: 'REELS', video_url: su.data.signedUrl, caption: String(row.text || '').slice(0, 2150), share_to_feed: true }, C.token, 'POST', C.base);
        let st = {};
        for (let i = 0; i < 18; i++) { await sleep(5000); st = await ig('/' + c.id, { fields: 'status_code,status' }, C.token, 'GET', C.base); if (st.status_code !== 'IN_PROGRESS') break; }
        return Response.json({ ok: st.status_code === 'FINISHED', container: c.id, status: st, published: false, title: row.title, caption: row.text, bytes: row.reelBytes, log });
      } catch (e) { return Response.json({ ok: false, error: String(e.message || e), log }); }
    }
    // 1) a new Instagram token: check it once and report
    if (S.IG_TOKEN && igc.check === 'pending') {
      try {
        if (/^EAA/.test(S.IG_TOKEN)) {
          const acc = await ig('/me/accounts', { fields: 'name,access_token,instagram_business_account{id,username}', limit: 50 }, S.IG_TOKEN, 'GET', FB);
          const pg = (acc.data || []).find((p) => p.instagram_business_account);
          if (!pg) throw new Error('לא נמצא עמוד פייסבוק שמקושר לחשבון אינסטגרם מקצועי. צריך לקשר את האינסטגרם לעמוד הפייסבוק של המשרד ולבחור את שניהם באישור.');
          const { error } = await sb.from('app_secrets').upsert({ k: 'IG_PAGE_TOKEN', v: pg.access_token }, { onConflict: 'k' }); if (error) throw new Error(error.message);
          S.IG_PAGE_TOKEN = pg.access_token;
          const nig = { ok: true, mode: 'fb', check: 'done', igId: pg.instagram_business_account.id, username: pg.instagram_business_account.username || '', pageId: pg.id, pageName: pg.name || '', saved: igc.saved || new Date().toISOString() };
          await merge('settings', 'pub', { ig: nig }); Object.assign(igc, nig);
          await tg(S, `✅ אינסטגרם מחובר (@${nig.username}) דרך עמוד הפייסבוק "${nig.pageName}". מעכשיו המערכת מפרסמת באינסטגרם לפי לוח הפרסום, ובודקת מה עלה בעמוד הפייסבוק.`);
        } else {
          const me = await ig('/me', { fields: 'user_id,username,account_type' }, S.IG_TOKEN, 'GET');
          const nig = { ok: true, mode: 'ig', check: 'done', username: me.username || '', type: me.account_type || '', saved: igc.saved || new Date().toISOString(), refreshed: new Date().toISOString() };
          await merge('settings', 'pub', { ig: nig }); Object.assign(igc, nig);
          await tg(S, `✅ אינסטגרם מחובר (@${me.username || ''}). מעכשיו המערכת מפרסמת באינסטגרם לפי לוח הפרסום.`);
        }
      } catch (e) {
        await merge('settings', 'pub', { ig: { ok: false, check: 'failed', error: String(e.message || e).slice(0, 200), saved: igc.saved || '' } });
        await tg(S, `⚠️ קוד הגישה של אינסטגרם לא עבד: ${String(e.message || e).slice(0, 150)}. צריך ליצור קוד חדש ולהדביק שוב (שיווק > לוח פרסום).`);
      }
    }
    // 2) refresh the long-lived token every 30 days (it lives 60)
    if (S.IG_TOKEN && igc.ok && igc.mode !== 'fb' && Date.now() - Date.parse(igc.refreshed || igc.saved || 0) > 30 * 864e5) {
      try {
        const r = await ig('/refresh_access_token', { grant_type: 'ig_refresh_token' }, S.IG_TOKEN, 'GET').catch(async () => {
          const u = new URL('https://graph.instagram.com/refresh_access_token'); u.searchParams.set('grant_type', 'ig_refresh_token'); u.searchParams.set('access_token', S.IG_TOKEN);
          const x = await fetch(u); return x.json();
        });
        if (r.access_token) { await sb.from('app_secrets').upsert({ k: 'IG_TOKEN', v: r.access_token }, { onConflict: 'k' }); S.IG_TOKEN = r.access_token; await merge('settings', 'pub', { ig: { ...igc, refreshed: new Date().toISOString() } }); log.push('ig token refreshed'); }
      } catch (e) { log.push('ig refresh failed: ' + (e.message || e)); }
    }
    // 3) due rows of the system: from 2 hours ago until now
    const now = Date.now();
    const from = new Date(now - 30 * 3600e3).toISOString().slice(0, 10);
    const { data } = await sb.from('docs').select('id,data').eq('coll', 'pub').eq('data->>owner', 'system').eq('data->>status', 'planned').gte('data->>at', from);
    for (const r of data || []) {
      const row = r.data; const t = ilToMs(row.at);
      const pend = row.result && row.result.instagram && row.result.instagram.pending;
      if (t > now || now - t > (pend ? 6 : 2) * 3600e3) continue;
      const ch = row.channels || [];
      const res = { ...(row.result || {}) };
      if (ch.includes('instagram') && (!res.instagram || res.instagram.pending)) {
        const C = igc.mode === 'fb' ? { base: FB, who: '/' + igc.igId, token: S.IG_PAGE_TOKEN } : { base: IG, who: '/me', token: S.IG_TOKEN };
        if (!C.token || !igc.ok) { res.instagram = { skipped: 'not connected' }; }
        else {
          try {
            if (row.reelPath) {
              const su = await sb.storage.from('files').createSignedUrl(row.reelPath, 6 * 3600);
              if (su.error || !su.data) throw new Error('storage link: ' + (su.error && su.error.message));
              row.media = [su.data.signedUrl, ...(row.media || []).filter((m) => /story/i.test(m))];
            }
            if (row.kind === 'video' && !(row.media || []).length) throw new Error('no approved reel was attached to this slot');
            const out = await igPublish(row, cfg, C, res.instagram);
            res.instagram = out.pending ? { pending: out.pending, items: out.items, since: (res.instagram && res.instagram.since) || new Date().toISOString() } : { ok: true, at: new Date().toISOString(), items: out.items };
          }
          catch (e) { res.instagram = { ok: false, error: String(e.message || e).slice(0, 300) }; await tg(S, `⚠️ פרסום באינסטגרם נכשל: ${row.title}\n${res.instagram.error}`); }
        }
      }
      if (ch.includes('tiktok') && !res.tiktok) res.tiktok = { skipped: 'not connected' };
      if (ch.includes('whatsapp') && !res.whatsapp) res.whatsapp = { skipped: 'handled by the community job' };
      if (res.instagram && res.instagram.pending) { await merge('pub', r.id, { result: res, handledAt: new Date().toISOString() }); log.push(r.id + ': instagram processing'); continue; }
      const anyOk = Object.values(res).some((x) => x && x.ok);
      const allSkipped = Object.values(res).every((x) => x && x.skipped);
      await merge('pub', r.id, { result: res, status: anyOk ? 'published' : allSkipped ? 'waiting' : 'planned', handledAt: new Date().toISOString() });
      log.push(r.id + ': ' + JSON.stringify(res).slice(0, 200));
    }
    // weekly reels: copy the approved reel of the next 2 days to storage
    try { await stageReels(S, log); } catch (e) { log.push('stage failed: ' + (e.message || e)); }
    // once an hour: check what Grok Bot published
    if (new Date().getUTCMinutes() < 10) { try { await verifyGrok(S, cfg, log); } catch (e) { log.push('verify failed: ' + (e.message || e)); } }
    return Response.json({ ok: true, log });
  });
}
