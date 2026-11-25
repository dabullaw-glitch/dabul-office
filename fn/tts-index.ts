// tts: narration of the online course slides and the services explainers. Cron secret only.
//  POST {lesson:n}            -> the online course (docs course/first-home), Google mode (voice he-IL-Chirp3-HD-Charon):
//                                every scene of lesson n's deck that has text ("say") and no audio yet gets an mp3 in the
//                                public "pv" bucket (course/first-home/lNN-sNN-<hash>.mp3), saved back into the deck as it
//                                goes. Stops before the time limit and continues on the next call.
//                                Returns {ok, lesson, scenes, voiced, left}.
//  POST {lesson:n, engine:'eleven', skipEnds?:true, only?:[sceneNo..]}
//                             -> (25.11.2026) ELEVENLABS MODE: the same scenes read in Yakir's own professional voice clone
//                                (ElevenLabs, approved by Yakir 25.11.2026) through the edge function `voice`
//                                ({action:'say', bucket:'pv'}; it fixes דבול / נסח itself). 25.11.2026: PAID lessons (not
//                                lesson.free) go to the PRIVATE bucket 'files' and scene.audio = "sb:files/<path>" (signed by
//                                the academy function for buyers and for the course-lesson workflow). Same path pattern
//                                (lNN-sNN-<hash of "eleven|say">.mp3) and the same deck fields (scene.audio, scene.ah), so
//                                the course-lesson build (narration mode 'google' / 'eleven' = the deck's scene.audio files)
//                                works unchanged. Extra fields: scene.av = 'eleven'; the previous Google file is kept in
//                                scene.gaudio / scene.gah (fallback). skipEnds (default true) leaves out the first welcome
//                                slide and the last "בשיעור הבא" / "תודה שהייתם" slide, exactly like tools/course-lesson
//                                (they are not in the video, so they are not paid for). Continues on the next call like
//                                the Google mode. Returns {ok, lesson, engine, scenes, voiced, left, now, chars}.
//  POST {lesson:n, engine:'google', restore:true}
//                             -> FALLBACK: puts the kept Google files back (scene.gaudio -> scene.audio) on every scene
//                                voiced by ElevenLabs. A plain {lesson:n} (Google mode) never re-voices a scene that has audio.
//  POST {items:[{name,text}]} -> (11.10.2026) narration for the online services explainer videos: pv/svcvo/<name>.mp3.
// (Rebuilt 11.10.2026: the deployed source of the course mode was not in the repo; same contract as before.)
import { createClient } from 'npm:@supabase/supabase-js@2';

const SECRETS: Record<string, string> = {};
const env = (k: string) => Deno.env.get(k) || SECRETS[k] || '';
// deno-lint-ignore no-explicit-any
let _sb: any = null;
const sb = () => _sb || (_sb = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } }));
async function loadSecrets() { const { data } = await sb().from('app_secrets').select('k,v'); (data || []).forEach((r: { k: string; v: string }) => { SECRETS[r.k] = r.v; }); }
const json = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });
const VOICE = 'he-IL-Chirp3-HD-Charon';

const b64url = (b: ArrayBuffer | Uint8Array | string) => { const bytes = typeof b === 'string' ? new TextEncoder().encode(b) : new Uint8Array(b as ArrayBuffer); let s = ''; bytes.forEach((x) => (s += String.fromCharCode(x))); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
let tokCache = { t: '', exp: 0 };
async function gtoken() {
  if (tokCache.t && Date.now() < tokCache.exp) return tokCache.t;
  const sa = JSON.parse(env('GOOGLE_SA_JSON')), now = Math.floor(Date.now() / 1000);
  const head = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({ iss: sa.client_email, scope: 'https://www.googleapis.com/auth/cloud-platform', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 }));
  const pem = String(sa.private_key).replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', Uint8Array.from(atob(pem), (c) => c.charCodeAt(0)), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${head}.${claim}`));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${head}.${claim}.${b64url(sig)}` });
  const j = await r.json(); tokCache = { t: j.access_token, exp: Date.now() + 50 * 60e3 }; return j.access_token as string;
}
async function synth(text: string, voice: string) {
  const r = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', { method: 'POST', headers: { authorization: `Bearer ${await gtoken()}`, 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: 'he-IL', name: voice }, audioConfig: { audioEncoding: 'MP3', sampleRateHertz: 24000 } }) });
  const j = await r.json(); if (!r.ok) throw new Error(j.error?.message || String(r.status));
  return Uint8Array.from(atob(j.audioContent), (c) => c.charCodeAt(0));
}

const hash10 = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s)))).slice(0, 5).map((x) => x.toString(16).padStart(2, '0')).join('');
// ElevenLabs: Yakir's own voice through the edge function `voice` (25.11.2026)
async function elevenSay(text: string, path: string, bucket: 'pv' | 'files' = 'pv') {
  const r = await fetch(`${env('SUPABASE_URL')}/functions/v1/voice`, { method: 'POST',
    headers: { 'content-type': 'application/json', 'x-cron-secret': env('CRON_SECRET') },
    body: JSON.stringify({ action: 'say', text, path, bucket }) });
  // deno-lint-ignore no-explicit-any
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.ok) throw new Error('voice: ' + String(j.error || r.status).slice(0, 300));
  return j as { chars: number; bytes: number };
}
// the slides the lesson video leaves out (same rule as tools/course-lesson/lesson.py and TASK.md section 8)
// deno-lint-ignore no-explicit-any
function endsSkipped(scenes: any[]) {
  const skip = new Set<number>();
  if (scenes.length > 2) {
    if (scenes[0].kind === 'title' || String(scenes[0].say || '').startsWith('ברוכים הבאים')) skip.add(0);
    const last = scenes.length - 1;
    if (/^(בשיעור הבא|תודה שהייתם)/.test(String(scenes[last].say || ''))) skip.add(last);
  }
  return skip;
}
// deno-lint-ignore no-explicit-any
async function lesson(n: number, b: any = {}) {
  const t0 = Date.now();
  const engine = b.engine === 'eleven' ? 'eleven' : 'google';
  const { data: row } = await sb().from('docs').select('data').match({ coll: 'course', id: 'first-home' }).maybeSingle();
  if (!row) return json({ ok: false, error: 'no course' }, 404);
  // deno-lint-ignore no-explicit-any
  const lessons: any[] = row.data.lessons || [];
  const li = lessons.findIndex((l) => +l.n === n); if (li < 0) return json({ ok: false, error: 'no lesson ' + n }, 404);
  const deck = lessons[li].deck; if (!deck || !Array.isArray(deck.scenes)) return json({ ok: false, error: 'no deck in lesson ' + n }, 400);
  const voice = deck.voice || VOICE; deck.voice = voice;
  // save only this lesson's deck into the CURRENT lessons array (read again just before writing)
  const save = async () => {
    deck.at = new Date().toISOString();
    const { data: cur } = await sb().from('docs').select('data').match({ coll: 'course', id: 'first-home' }).maybeSingle();
    // deno-lint-ignore no-explicit-any
    const ls: any[] = (cur && cur.data.lessons) || lessons;
    const k = ls.findIndex((l) => +l.n === n); if (k < 0) throw new Error('lesson vanished');
    ls[k] = { ...ls[k], deck };
    const { error } = await sb().rpc('docs_merge', { p_coll: 'course', p_id: 'first-home', p_patch: { lessons: ls } });
    if (error) throw new Error('save: ' + error.message);
  };
  const nn = String(n).padStart(2, '0');
  let done = 0, dirty = false, chars = 0;

  if (engine === 'google' && b.restore) {   // fallback: back to the kept Google files
    for (const sc of deck.scenes) if (sc.av === 'eleven' && sc.gaudio) { sc.audio = sc.gaudio; sc.ah = sc.gah; delete sc.av; delete sc.gaudio; delete sc.gah; done++; }
    if (done) { deck.engine = 'google'; await save(); }
    return json({ ok: true, lesson: n, engine, restored: done });
  }

  if (engine === 'eleven') {
    const skip = b.skipEnds === false ? new Set<number>() : endsSkipped(deck.scenes);
    const only = Array.isArray(b.only) ? new Set((b.only as number[]).map((x) => +x - 1)) : null;
    const want = (i: number) => !!deck.scenes[i].say && !skip.has(i) && (!only || only.has(i));
    let err = '';
    try {
      for (let i = 0; i < deck.scenes.length; i++) {
        const sc = deck.scenes[i]; if (!want(i)) continue;
        const h = await hash10(`eleven|${sc.say}`);
        if (sc.av === 'eleven' && sc.ah === h && sc.audio) continue;   // already in his voice, same text
        if (Date.now() - t0 > 95_000) break;
        const path = `course/first-home/l${nn}-s${String(i + 1).padStart(2, '0')}-${h}.mp3`;
        // 25.11.2026 (Yakir approved: paid lessons are private): a paid lesson's narration goes to the PRIVATE bucket 'files'
        // and the deck keeps a reference "sb:files/<path>" (the academy signs it for buyers, the course-lesson workflow
        // gets a signed link through academy ?gh=job). Free lessons stay in the public bucket 'pv'.
        const priv = !lessons[li].free;
        const r = await elevenSay(sc.say, path, priv ? 'files' : 'pv');
        if (sc.audio && sc.av !== 'eleven') { sc.gaudio = sc.audio; sc.gah = sc.ah; }
        sc.audio = priv ? `sb:files/${path}` : sb().storage.from('pv').getPublicUrl(path).data.publicUrl; sc.ah = h; sc.av = 'eleven';
        chars += r.chars || sc.say.length; done++; dirty = true;
        if (done % 3 === 0) await save();
      }
    } catch (e) { err = String((e as Error).message || e); }   // keep (save) what was already paid for
    deck.engine = 'eleven';
    if (dirty) { deck.elevenAt = new Date().toISOString(); await save(); }
    if (err) return json({ ok: false, lesson: n, engine, error: err, now: done, chars }, 500);
    const idx = deck.scenes.map((_: unknown, i: number) => i).filter(want);
    const voiced = idx.filter((i: number) => deck.scenes[i].av === 'eleven' && deck.scenes[i].audio).length;
    return json({ ok: voiced === idx.length, lesson: n, engine, scenes: deck.scenes.length, wanted: idx.length, voiced, left: idx.length - voiced, now: done, chars });
  }

  for (let i = 0; i < deck.scenes.length; i++) {
    const sc = deck.scenes[i]; if (!sc.say) continue;
    const h = await hash10(`${voice}|${sc.say}`);
    if (sc.audio) continue; // already voiced (a rewritten deck comes without audio)
    if (Date.now() - t0 > 110_000) break;
    const bytes = await synth(sc.say, voice);
    const path = `course/first-home/l${nn}-s${String(i + 1).padStart(2, '0')}-${h}.mp3`;
    const up = await sb().storage.from('pv').upload(path, bytes, { upsert: true, contentType: 'audio/mpeg' });
    if (up.error) throw new Error(up.error.message);
    sc.audio = sb().storage.from('pv').getPublicUrl(path).data.publicUrl; sc.ah = h; done++; dirty = true;
    if (done % 5 === 0) await save();
  }
  if (dirty) await save();
  const withSay = deck.scenes.filter((s: { say?: string }) => s.say).length, voiced = deck.scenes.filter((s: { say?: string; audio?: string }) => s.say && s.audio).length;
  return json({ ok: voiced === withSay, lesson: n, engine, scenes: deck.scenes.length, voiced, left: withSay - voiced, now: done });
}

Deno.serve(async (req) => {
  await loadSecrets().catch(() => {});
  if (!env('CRON_SECRET') || req.headers.get('x-cron-secret') !== env('CRON_SECRET')) return json({ error: 'unauthorized' }, 401);
  // deno-lint-ignore no-explicit-any
  const b: any = await req.json().catch(() => ({}));
  if (b.lesson) { try { return await lesson(+b.lesson, b); } catch (e) { return json({ ok: false, error: String((e as Error).message || e) }, 500); } }
  const voice = String(b.voice || VOICE), out: { name: string; url: string }[] = [];
  try {
    for (const it of (b.items || []).slice(0, 20)) {
      const name = String(it.name || '').replace(/[^a-z0-9-]/gi, ''); const text = String(it.text || '').slice(0, 1500);
      if (!name || !text) continue;
      const bytes = await synth(text, voice);
      const path = `svcvo/${name}.mp3`;
      const up = await sb().storage.from('pv').upload(path, bytes, { upsert: true, contentType: 'audio/mpeg' });
      if (up.error) throw new Error(up.error.message);
      out.push({ name, url: sb().storage.from('pv').getPublicUrl(path).data.publicUrl });
    }
    return json({ ok: true, items: out });
  } catch (e) { return json({ ok: false, error: String((e as Error).message || e), items: out }, 500); }
});
