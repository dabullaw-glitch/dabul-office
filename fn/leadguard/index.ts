// leadguard (25.10.2026, Yakir approved). The website's Elementor forms (snippet 19 on dabullaw.co.il) post here instead of
// straight to the "lead" function. Spam bots were using the old "טופס וואטספ" form: no name, a fake phone, English text.
// Rule Yakir asked for, exactly: ONLY when the message has no Hebrew at all AND the phone does not look real, the sender must
// pass the free "I am not a robot" check (Cloudflare Turnstile; secret TURNSTILE_SECRET in the edge function secrets).
//   - passed, or any other case  -> the same JSON is forwarded unchanged to the "lead" function (lead, Telegram, as before)
//   - not passed                 -> no lead, no Telegram alert; the attempt is kept in docs coll 'leads_spam' (nothing deleted)
// Real phone: Israeli 05X / landline / 07X, or an international number (+...) that libphonenumber says is valid.
import { createClient } from 'npm:@supabase/supabase-js@2';
import { isValidPhoneNumber } from 'npm:libphonenumber-js@1.11.12';

const URL_ = Deno.env.get('SUPABASE_URL')!, KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const sb = createClient(URL_, KEY, { auth: { persistSession: false } });
const J = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'content-type': 'application/json; charset=utf-8' } });

const digits = (p: string) => String(p || '').replace(/[^\d+]/g, '');
function realPhone(p: string) {
  let s = digits(p);
  if (!s) return false;
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('+972')) s = '0' + s.slice(4);
  if (s.startsWith('972') && s.length >= 11) s = '0' + s.slice(3);
  if (/^0(5\d|[2-4689]|7[2-9])\d{7}$/.test(s)) return true;
  if (s.startsWith('+')) { try { return isValidPhoneNumber(s); } catch { return false; } }
  return false;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return J({ ok: true, info: 'POST the form JSON' });
  const u = new URL(req.url);
  // deno-lint-ignore no-explicit-any
  const b: any = await req.json().catch(() => ({}));
  const msg = String(b.message || b.notes || '').replace(/^טופס:.*$/m, '');
  const heb = /[א-ת]/.test(`${b.name || ''} ${msg} ${b.topic || ''}`);
  if (!heb && !realPhone(String(b.phone || ''))) {
    const token = String(b.turnstile || '');
    let passed = false;
    const secret = Deno.env.get('TURNSTILE_SECRET') || '';
    if (token && secret) {
      // deno-lint-ignore no-explicit-any
      const v: any = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret, response: token }) })
        .then(r => r.json()).catch(() => ({}));
      passed = !!(v && v.success);
    }
    if (!passed) {
      const at = new Date().toISOString();
      await sb.from('docs').insert({ coll: 'leads_spam', id: 's-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        data: { at, reason: token ? 'turnstile-failed' : 'no-turnstile', form: String(b.form || ''), name: String(b.name || ''), phone: String(b.phone || ''),
          email: String(b.email || ''), message: String(b.message || '').slice(0, 2000), page: String(b.page || '') } });
      return J({ ok: true, held: true });
    }
  }
  delete b.turnstile;
  const r = await fetch(`${URL_}/functions/v1/lead?source=${encodeURIComponent(u.searchParams.get('source') || 'website')}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  return new Response(await r.text(), { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8' } });
});
