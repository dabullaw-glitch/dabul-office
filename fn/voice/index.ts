// voice (25.11.2026): Yakir's own voice (ElevenLabs professional voice clone "יקיר דבול", model Eleven v4) for the
// podcast, the HeyGen videos and the courses. Cron secret only (header x-cron-secret).
//  POST {action:'voices'}                          -> [{id,name,category}] of the account (no secrets returned)
//  POST {action:'say', text, path, bucket?:'files'} -> fixes the known Hebrew pronunciations (vowel marks Yakir approved
//      25.11.2026: דַּבּוּל, נֶסַח), splits the text into parts at paragraph/sentence ends, voices each part with request
//      stitching for an even sound, joins the MP3 parts, stores <bucket>/<path> (private) and returns a signed link (24h).
// The API key is the edge function secret ELEVENLABS_API_KEY, saved by Yakir himself; it is never returned or logged.
//  GET ?gh=podcast&path=podcast/epNN/<name>.mp3 with Authorization: Bearer <GitHub Actions OIDC token, audience
//      'dabul-voice'> (25.11.2026) -> a 10-minute signed link to a podcast voice part, only for the podcast-mix workflow
//      of this repo on main. So the mix job file in the public repo holds only storage paths, never a link.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createRemoteJWKSet, jwtVerify } from 'https://esm.sh/jose@5.9.6';
const GH_JWKS = createRemoteJWKSet(new URL('https://token.actions.githubusercontent.com/.well-known/jwks'));

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { if (!Deno.env.get(r.k)) SECRETS[r.k] = r.v; }); }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

const API = 'https://api.elevenlabs.io/v1';
const MODEL = 'eleven_v4';
// 25.11.2026 (Yakir approved the storage cleanup 20:02): speech is stored as MP3 44.1 kHz 96 kbps (ElevenLabs output is
// mono); was mp3_44100_192, about half the size with no audible difference for speech.
const FORMAT = 'mp3_44100_96';
const VOICE_NAME = 'יקיר דבול';
// approved by Yakir 25.11.2026 (version 2 of the test): only these settings
const SETTINGS = { stability: 0.5, similarity_boost: 0.75 };
// whole-word fixes; more words are added in docs settings/voice {pron:{word:fixed}}
const PRON: Record<string, string> = { 'דבול': 'דַּבּוּל', 'נסח': 'נֶסַח', 'הנסח': 'הַנֶּסַח', 'בנסח': 'בְּנֶסַח' };

const key = () => env('ELEVENLABS_API_KEY');
const H = () => ({ 'xi-api-key': key(), 'content-type': 'application/json' });

async function pronMap() {
  const { data } = await sb().from('docs').select('data').match({ coll: 'settings', id: 'voice' }).maybeSingle();
  return { ...PRON, ...((data?.data?.pron as Record<string, string>) || {}) };
}
function fixPron(text: string, map: Record<string, string>) {
  let t = text;
  for (const [w, f] of Object.entries(map)) {
    const re = new RegExp(`(^|[^\\u05D0-\\u05EA\\u0591-\\u05C7])${w}(?=$|[^\\u05D0-\\u05EA\\u0591-\\u05C7])`, 'g');
    t = t.replace(re, (_m, p) => p + f);
  }
  return t;
}
// split at blank lines, then sentence ends, into parts of at most `max` characters
function split(text: string, max = 2400) {
  const out: string[] = []; let cur = '';
  const push = () => { if (cur.trim()) out.push(cur.trim()); cur = ''; };
  for (const para of text.split(/\n\s*\n/)) {
    const p = para.trim(); if (!p) continue;
    if ((cur + '\n\n' + p).length <= max) { cur = cur ? cur + '\n\n' + p : p; continue; }
    push();
    if (p.length <= max) { cur = p; continue; }
    for (const s of p.split(/(?<=[.!?…])\s+/)) {
      if ((cur + ' ' + s).length > max) push();
      cur = cur ? cur + ' ' + s : s;
    }
  }
  push();
  return out;
}

async function voiceId() {
  const { data } = await sb().from('docs').select('data').match({ coll: 'settings', id: 'voice' }).maybeSingle();
  if (data?.data?.voiceId) return data.data.voiceId as string;
  const r = await fetch(`${API}/voices?show_legacy=false`, { headers: H() });
  const j = await r.json();
  // deno-lint-ignore no-explicit-any
  const v = (j.voices || []).find((x: any) => String(x.name).trim() === VOICE_NAME);
  if (!v) throw new Error('voice not found');
  await sb().rpc('docs_merge', { p_coll: 'settings', p_id: 'voice', p_patch: { voiceId: v.voice_id, model: MODEL, name: VOICE_NAME } });
  return v.voice_id as string;
}

async function say(text: string, path: string, bucket = 'files') {
  const t0 = Date.now();
  const vid = await voiceId();
  const parts = split(fixPron(text, await pronMap()));
  const chunks: Uint8Array[] = []; const ids: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const body: Record<string, unknown> = { text: parts[i], model_id: MODEL, voice_settings: SETTINGS, language_code: 'he' };
    if (ids.length) body.previous_request_ids = ids.slice(-3);
    let r: Response | null = null;
    for (let a = 0; a < 3; a++) {
      r = await fetch(`${API}/text-to-speech/${vid}?output_format=${FORMAT}`, { method: 'POST', headers: H(), body: JSON.stringify(body) });
      if (r.ok || (r.status !== 429 && r.status < 500)) break;
      await new Promise((ok) => setTimeout(ok, 3000 * (a + 1)));
    }
    if (!r || !r.ok) { const e = await r?.text(); throw new Error(`part ${i + 1}: ${r?.status} ${String(e).slice(0, 300)}`); }
    const rid = r.headers.get('request-id'); if (rid) ids.push(rid);
    chunks.push(new Uint8Array(await r.arrayBuffer()));
  }
  const total = chunks.reduce((n, c) => n + c.length, 0); const all = new Uint8Array(total); let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  const up = await sb().storage.from(bucket).upload(path, all, { upsert: true, contentType: 'audio/mpeg' });
  if (up.error) throw new Error('upload: ' + up.error.message);
  const { data: s } = await sb().storage.from(bucket).createSignedUrl(path, 86400);
  return { ok: true, bucket, path, parts: parts.length, chars: parts.reduce((n, p) => n + p.length, 0), bytes: total, sec: Math.round((Date.now() - t0) / 1000), url: s?.signedUrl };
}

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    if (req.method === 'GET' && u.searchParams.get('gh') === 'podcast') {
      const path = String(u.searchParams.get('path') || '');
      if (!/^podcast\/ep\d{2,3}\/[a-z0-9_-]+\.mp3$/.test(path)) return json({ ok: false, error: 'bad path' }, 400);
      try {
        const tok = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
        const { payload } = await jwtVerify(tok, GH_JWKS, { issuer: 'https://token.actions.githubusercontent.com', audience: 'dabul-voice' });
        const ok = payload.repository === 'dabullaw-glitch/dabul-office' && payload.ref === 'refs/heads/main'
          && String(payload.job_workflow_ref || '').startsWith('dabullaw-glitch/dabul-office/.github/workflows/podcast-mix.yml@refs/heads/main');
        if (!ok) return json({ ok: false, error: 'forbidden' }, 403);
      } catch (_e) { return json({ ok: false, error: 'unauthorized' }, 401); }
      const { data: s, error } = await sb().storage.from('files').createSignedUrl(path, 600);
      return error ? json({ ok: false, error: error.message }, 404) : json({ ok: true, url: s?.signedUrl });
    }
    await loadSecrets();
    if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ ok: false, error: 'forbidden' }, 403);
    if (!key()) return json({ ok: false, error: 'ELEVENLABS_API_KEY missing' }, 500);
    const b = await req.json().catch(() => ({}));
    if (b.action === 'voices') {
      const r = await fetch(`${API}/voices?show_legacy=false`, { headers: H() }); const j = await r.json();
      if (!r.ok) return json({ ok: false, status: r.status, error: j?.detail?.status || 'error' }, 502);
      // deno-lint-ignore no-explicit-any
      return json({ ok: true, voices: (j.voices || []).filter((v: any) => v.category !== 'premade').map((v: any) => ({ id: v.voice_id, name: v.name, category: v.category })) });
    }
    if (b.action === 'say') {
      const text = String(b.text || ''), path = String(b.path || '');
      if (!text.trim() || !/^[a-z0-9/_.-]+\.mp3$/.test(path)) return json({ ok: false, error: 'text and path (a-z0-9/_.- ending .mp3) required' }, 400);
      return json(await say(text, path, b.bucket === 'pv' ? 'pv' : 'files'));
    }
    return json({ ok: false, error: 'action?' }, 400);
  } catch (e) {
    return json({ ok: false, error: String((e as Error).message || e).slice(0, 400) }, 500);
  }
});
