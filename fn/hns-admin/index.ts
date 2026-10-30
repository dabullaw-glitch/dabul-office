// hns-admin (28.10.2026): small admin actions for the HNS (nws.co.il) news engine. POST with x-cron-secret.
//   {action:'outlets'}                      the media outlet list (table hns_outlets, used by hns-write and hns-publish)
//   {action:'outlet_add', names:[...]}      add names (do not add common Hebrew words such as דבר, הון, הארץ or כאן alone)
//   {action:'outlet_remove', names:[...]}   remove names
// 28.10.2026 (home redesign):
//   {action:'events'}                       all events (table hns_event), newest first
//   {action:'event_set', event:{...}}       create (no id) or change (with id) an event. Fields: kind ('elections'|'storm'|'holiday'|
//                                           'emergency'|'other'), title, tag, stat1, stat1_label, stat2, stat2_label, cta_text, cta_url,
//                                           story_ids, block {kicker, headline, text, bar:{pct,left,right}, source}, starts_at, ends_at, active.
//                                           An active event switches every other event off (one strip at a time).
//   {action:'event_clear', id?}             switch off one event, or all of them (no strip on the site after the next build)
//   {action:'story_meta', id, kicker?, closure?, kind?, author?, author_role?, video_url?}   card fields of a story.
//                                           kicker: up to 5 words, never a media outlet name; closure: {place, what, until:'YYYY-MM-DD', approx}
//   {action:'img_redo', id}                 forget a story's AI image (and its prompt), so hns-img makes a new one on its next run
// 29.10.2026 (management panel /yakirdab/, called by hns-panel after its session check):
//   {action:'pin_set', id?, hours?}         pin a published story (not sponsored) as the home page lead for 1 to 72 hours (default 12);
//                                           no id = no pin ({}). Saved in hns_config 'site_pin' {id, until}; hns-feed sends it as "pin".
//   {action:'source_set', id, active}       switch a source on or off. Sources of kind 'html' (polled by hns-official, enabled stays
//                                           false) are switched with the word "paused" in notes; every other kind with enabled.
//   {action:'flash_mod', item_id, hidden?, text?}   hide or show an automatic flash (an hns_items row), or replace its text
//                                           (empty text = back to the original). Table hns_flash_mod, read by hns-feed.
//   {action:'flash_add', text, place?, at?, ttl_h?, url?}   a flash written by hand (table hns_flash), 10 to 150 characters.
//   {action:'flash_edit', id, text?, place?, at?, ttl_h?, url?, hidden?}   change or hide a hand written flash.
//   Texts: no long or medium dash, no media outlet name.
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

Deno.serve(async (req) => {
  const { data: sec } = await sb.from('app_secrets').select('v').eq('k', 'CRON_SECRET').maybeSingle();
  if (!sec?.v || req.headers.get('x-cron-secret') !== sec.v) return J({ ok: false }, 401);
  const b: Any = await req.json().catch(() => ({}));
  const names = (Array.isArray(b.names) ? b.names : []).map((x: unknown) => String(x ?? '').trim()).filter(Boolean).slice(0, 50);
  if (b.action === 'outlet_add' && names.length) {
    const { data, error } = await sb.from('hns_outlets').upsert(names.map((name: string) => ({ name })), { onConflict: 'name' }).select('name');
    return J({ ok: !error, added: (data || []).map((r: Any) => r.name), error: error?.message });
  }
  if (b.action === 'outlet_remove' && names.length) {
    const { data, error } = await sb.from('hns_outlets').delete().in('name', names).select('name');
    return J({ ok: !error, removed: (data || []).map((r: Any) => r.name), error: error?.message });
  }
  const clean = (x: unknown) => String(x ?? '').replace(/\s*\u2014\s*/g, ', ').replace(/\s*\u2013\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
  if (b.action === 'events') {
    const { data } = await sb.from('hns_event').select('*').order('id', { ascending: false }).limit(50);
    return J({ ok: true, events: data || [] });
  }
  if (b.action === 'event_set' && b.event && typeof b.event === 'object') {
    const e: Any = b.event; const row: Any = {};
    for (const k of ['kind', 'title', 'tag', 'stat1', 'stat1_label', 'stat2', 'stat2_label', 'cta_text', 'cta_url']) if (e[k] !== undefined) row[k] = e[k] === null ? null : (k === 'cta_url' || k === 'kind' ? String(e[k]) : clean(e[k]));
    if (e.story_ids !== undefined) row.story_ids = (Array.isArray(e.story_ids) ? e.story_ids : []).map(Number).filter(Boolean);
    if (e.block !== undefined) row.block = JSON.parse(clean(JSON.stringify(e.block || {})));
    for (const k of ['starts_at', 'ends_at']) if (e[k] !== undefined) row[k] = e[k];
    if (e.active !== undefined) row.active = !!e.active;
    row.updated_at = new Date().toISOString();
    const q = e.id ? sb.from('hns_event').update(row).eq('id', Number(e.id)) : sb.from('hns_event').insert(row);
    const { data, error } = await q.select('*').single();
    if (error) return J({ ok: false, error: error.message });
    if (data.active) await sb.from('hns_event').update({ active: false, updated_at: new Date().toISOString() }).neq('id', data.id).eq('active', true);
    return J({ ok: true, event: data });
  }
  if (b.action === 'event_clear') {
    let q = sb.from('hns_event').update({ active: false, updated_at: new Date().toISOString() }).eq('active', true);
    if (b.id) q = q.eq('id', Number(b.id));
    const { data, error } = await q.select('id');
    return J({ ok: !error, cleared: (data || []).map((r: Any) => r.id), error: error?.message });
  }
  if (b.action === 'story_meta' && b.id) {
    const patch: Any = {};
    if (b.kicker !== undefined) {
      const k = clean(b.kicker);
      if (k) {
        if (k.split(/\s+/).length > 5) return J({ ok: false, error: 'kicker: up to 5 words' });
        const { data: outl } = await sb.from('hns_outlets').select('name');
        const hit = (outl || []).map((r: Any) => String(r.name || '').trim()).find((n: string) => n.length >= 2 && k.toLowerCase().includes(n.toLowerCase()));
        if (hit) return J({ ok: false, error: `kicker names a media outlet (${hit})` });
      }
      patch.kicker = k || null;
    }
    if (b.closure !== undefined) patch.closure = b.closure && typeof b.closure === 'object' ? { place: clean(b.closure.place), what: clean(b.closure.what), until: String(b.closure.until || '').slice(0, 10), approx: !!b.closure.approx } : null;
    if (b.kind !== undefined) patch.kind = b.kind === 'opinion' ? 'opinion' : b.kind === 'flash' ? 'flash' : 'news';
    if (b.author !== undefined) patch.author = clean(b.author) || null;
    if (b.author_role !== undefined) patch.author_role = clean(b.author_role) || null;
    if (b.video_url !== undefined) patch.video_url = String(b.video_url || '') || null;
    if (!Object.keys(patch).length) return J({ ok: false, error: 'nothing to change' });
    const { data, error } = await sb.from('hns_stories').update(patch).eq('id', Number(b.id)).select('id,kicker,closure,kind,author,video_url');
    return J({ ok: !error && !!data?.length, story: data?.[0], error: error?.message });
  }
  if (b.action === 'img_redo' && b.id) {
    const { data, error } = await sb.from('hns_stories').update({ image_url: null, image_prompt: null, image_alt: null, image_model: null, image_at: null, image_note: null }).eq('id', Number(b.id)).select('id');
    return J({ ok: !error && !!data?.length, error: error?.message });
  }
  // ---------- 29.10.2026: management panel ----------
  const outletHit = async (t: string) => {
    const { data: outl } = await sb.from('hns_outlets').select('name');
    // the same matching as hns-publish: Latin names as whole words, Hebrew names also with a prefix letter
    const rx = (n: string) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return (outl || []).map((r: Any) => String(r.name || '').trim()).find((n: string) => n.length >= 2 && new RegExp(/^[\x00-\x7F]+$/.test(n)
      ? `(?<![A-Za-z0-9])${rx(n)}(?![A-Za-z0-9])` : `(?<![\u05D0-\u05EA])(?:[ובלמהשכ]{1,2}-?)?${rx(n)}(?![\u05D0-\u05EA])`, 'i').test(t)) || '';
  };
  if (b.action === 'pin_set') {
    const id = Number(b.id) || 0;
    const now = new Date().toISOString();
    if (!id) {
      const { error } = await sb.from('hns_config').upsert({ k: 'site_pin', v: {}, note: 'home page lead pinned in the panel (hns-admin pin_set)', updated_at: now }, { onConflict: 'k' });
      return J({ ok: !error, pin: null, error: error?.message });
    }
    const { data: st } = await sb.from('hns_stories').select('id,state,kind,section').eq('id', id).maybeSingle();
    if (!st || st.state !== 'published') return J({ ok: false, error: 'אפשר לנעוץ רק ידיעה שמופיעה באתר' });
    if (st.kind === 'sponsored') return J({ ok: false, error: 'תוכן שיווקי לא מופיע כידיעה הראשית' });
    const hours = Math.min(72, Math.max(1, Number(b.hours) || 12));
    const v = { id, until: new Date(Date.now() + hours * 3600e3).toISOString() };
    const { error } = await sb.from('hns_config').upsert({ k: 'site_pin', v, note: 'home page lead pinned in the panel (hns-admin pin_set)', updated_at: now }, { onConflict: 'k' });
    return J({ ok: !error, pin: v, error: error?.message });
  }
  if (b.action === 'source_set' && b.id) {
    const { data: src } = await sb.from('hns_sources').select('id,kind,enabled,notes').eq('id', String(b.id)).maybeSingle();
    if (!src) return J({ ok: false, error: 'המקור לא נמצא' });
    if (src.kind === 'auto') return J({ ok: false, error: 'זה מקור פנימי של המערכת, אין מה להפעיל או לכבות' });
    const on = !!b.active;
    const patch: Any = {};
    if (src.kind === 'html') {
      const notes = String(src.notes || '').replace(/\s*\bpaused\b\s*/g, ' ').trim();
      patch.notes = on ? (notes || null) : `${notes} paused`.trim();
    } else {
      patch.enabled = on;
      if (on) patch.fails = 0;
    }
    const { data, error } = await sb.from('hns_sources').update(patch).eq('id', src.id).select('id,enabled,notes,fails');
    return J({ ok: !error && !!data?.length, source: data?.[0], error: error?.message });
  }
  if (b.action === 'flash_mod' && b.item_id) {
    const item_id = Number(b.item_id);
    const { data: it } = await sb.from('hns_items').select('id').eq('id', item_id).maybeSingle();
    if (!it) return J({ ok: false, error: 'המבזק לא נמצא' });
    const { data: cur } = await sb.from('hns_flash_mod').select('*').eq('item_id', item_id).maybeSingle();
    const row: Any = { item_id, hidden: cur?.hidden ?? false, text: cur?.text ?? null, updated_at: new Date().toISOString() };
    if (b.hidden !== undefined) row.hidden = !!b.hidden;
    if (b.text !== undefined) {
      const t = clean(b.text).slice(0, 150);
      if (t && t.length < 10) return J({ ok: false, error: 'הטקסט קצר מדי' });
      const hit = t ? await outletHit(t) : '';
      if (hit) return J({ ok: false, error: `בלי שם של כלי תקשורת (${hit})` });
      row.text = t || null;
    }
    const { data, error } = await sb.from('hns_flash_mod').upsert(row, { onConflict: 'item_id' }).select('*').single();
    return J({ ok: !error, mod: data, error: error?.message });
  }
  if (b.action === 'flash_add' || (b.action === 'flash_edit' && b.id)) {
    const row: Any = { updated_at: new Date().toISOString() };
    if (b.text !== undefined || b.action === 'flash_add') {
      const t = clean(b.text).slice(0, 150);
      if (t.length < 10) return J({ ok: false, error: 'כתבו מבזק של 10 תווים לפחות' });
      const hit = await outletHit(t);
      if (hit) return J({ ok: false, error: `בלי שם של כלי תקשורת (${hit})` });
      row.text = t;
    }
    if (b.place !== undefined) row.place = clean(b.place).slice(0, 40) || null;
    if (b.url !== undefined) {
      const u = String(b.url || '').trim();
      if (u && !/^(https:\/\/[^\s"<>]{3,400}|\/[^\s"<>]{0,300})$/.test(u)) return J({ ok: false, error: 'הקישור צריך להתחיל ב-https://' });
      row.url = u || null;
    }
    if (b.at !== undefined && b.at) { const t = Date.parse(b.at); if (isNaN(t)) return J({ ok: false, error: 'שעה לא תקינה' }); row.at = new Date(Math.min(t, Date.now() + 60e3)).toISOString(); }
    if (b.ttl_h !== undefined) row.ttl_h = Math.min(48, Math.max(1, Number(b.ttl_h) || 12));
    if (b.hidden !== undefined) row.hidden = !!b.hidden;
    const q = b.action === 'flash_add' ? sb.from('hns_flash').insert(row) : sb.from('hns_flash').update(row).eq('id', Number(b.id));
    const { data, error } = await q.select('*').single();
    return J({ ok: !error, flash: data, error: error?.message });
  }
  if (b.action === 'outlets') {
    const { data } = await sb.from('hns_outlets').select('name').order('name');
    return J({ ok: true, outlets: (data || []).map((r: Any) => r.name) });
  }
  return J({ ok: false, error: 'unknown action' }, 400);
});
