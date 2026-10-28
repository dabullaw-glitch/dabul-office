// hns-feed (28.10.2026): public read endpoint of the HNS news engine for the nws.co.il site build.
// GET -> published stories only, newest first, with just the fields the site needs. No secrets, no internal notes.
// ?limit=N (default 300, max 1000). No long or medium dashes in any text.
// 28.10.2026 (Yakir): an independent news site. Only official sources (municipality, police, MDA, IMS...) are shown as the source
// of a story; media outlets are never exposed as the source (a needed credit is one line at the end of the body, written by hns-write).
import { createClient } from 'npm:@supabase/supabase-js@2';

// deno-lint-ignore no-explicit-any
type Any = any;
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const H = { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=60' };
const clean = (s: unknown) => String(s ?? '').replace(/\s*—\s*/g, ', ').replace(/\s*–\s*/g, ' - ').replace(/ {2,}/g, ' ').trim();
const arr = (a: unknown) => (Array.isArray(a) ? a : []).map(clean).filter(Boolean);
const faq = (a: unknown) => (Array.isArray(a) ? a : []).map((x: Any) => Array.isArray(x) ? [clean(x[0]), clean(x[1])] : [clean(x?.q ?? x?.question), clean(x?.a ?? x?.answer)]).filter((x) => x[0] && x[1]);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: H });
  const url = new URL(req.url);
  const limit = Math.min(1000, Math.max(1, Number(url.searchParams.get('limit')) || 300));
  const { data, error } = await sb.from('hns_stories')
    .select('id,created_at,published_at,updated_at,section,title,dek,body,key_points,faq,places,sources')
    .eq('state', 'published').not('published_at', 'is', null)
    .order('published_at', { ascending: false }).limit(limit);
  if (error) return new Response(JSON.stringify({ ok: false, error: 'db' }), { status: 500, headers: H });
  const stories = (data || []).map((s: Any) => {
    const src = (Array.isArray(s.sources) ? s.sources : []).filter((x: Any) => x.trust === 'official').map((x: Any) => ({ name: clean(x.name).replace(/\s*-\s*ערוץ טלגרם( רשמי)?$/, ''), url: String(x.url || '') }));
    return {
      id: s.id, section: s.section || null, title: clean(s.title), dek: clean(s.dek), body: arr(s.body), keyPoints: arr(s.key_points), faq: faq(s.faq),
      places: arr(s.places), date: s.created_at, publishedAt: s.published_at,
      sourceName: src[0]?.name || '', sourceUrl: src[0]?.url || '', sources: src,
    };
  });
  return new Response(JSON.stringify({ ok: true, generated: new Date().toISOString(), count: stories.length, stories }), { headers: H });
});
