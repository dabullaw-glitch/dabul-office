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
    if (b.kind !== undefined) patch.kind = b.kind === 'opinion' ? 'opinion' : 'news';
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
  if (b.action === 'outlets') {
    const { data } = await sb.from('hns_outlets').select('name').order('name');
    return J({ ok: true, outlets: (data || []).map((r: Any) => r.name) });
  }
  return J({ ok: false, error: 'unknown action' }, 400);
});
