// The debtor's personal page for the bi-monthly report to the trustee.
// With the private link token the client can read and fill only his own current report,
// upload documents for it and sign. Nothing else from the office is exposed.
import { loadSecrets, json, cors, admin, telegram, uid } from '../_shared/common.ts';

const MONTHS = ['ינואר','פברואר','מרץ','אפריל','מאי','יוני','יולי','אוגוסט','ספטמבר','אוקטובר','נובמבר','דצמבר'];
const ym = (s: string) => String(s || '').slice(0, 7);
const addM = (k: string, n: number) => { const [y, m] = k.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; };
const todayIL = () => new Date(Date.now() + 3 * 3600e3).toISOString().slice(0, 10);
const label = (p: any) => { const [y1, m1] = p.months[0].split('-').map(Number), [y2, m2] = p.months[1].split('-').map(Number); return y1 === y2 ? `${MONTHS[m1 - 1]}-${MONTHS[m2 - 1]} ${y1}` : `${MONTHS[m1 - 1]} ${y1} - ${MONTHS[m2 - 1]} ${y2}`; };
function periods(m: any) {
  const first = m.firstPeriod || ym(m.orderDate); if (!/^\d{4}-\d{2}$/.test(first || '')) return [];
  const now = ym(todayIL()), out: any[] = [];
  for (let k = first, i = 0; i < 120 && k <= now; k = addM(k, 2), i++) { const end = addM(k, 1); out.push({ key: k, months: [k, end], end, due: addM(end, 1) + '-15' }); }
  return out;
}
const rep = (m: any, k: string) => (m.irep || {})[k] || {};
const LOCKED = ['ready', 'submitted'];
const nowM = () => ym(todayIL());
// the period of the current month (photos go there) and the oldest ended one that still needs closing
function state(m: any) {
  const ps = periods(m), now = nowM();
  const cur = ps.find(p => p.months.includes(now)) || null;
  const close = ps.find(p => p.end < now && rep(m, p.key).status !== 'submitted' && !LOCKED.includes(rep(m, p.key).status || '')) || null;
  const open = [close, cur].filter((p, i, a) => p && !LOCKED.includes(rep(m, p.key).status || '') && a.indexOf(p) === i) as any[];
  const months = open.flatMap(p => p.months.filter((x: string) => x <= now));
  return { ps, cur, close, open, months };
}
const INC = ['salary', 'business', 'pension', 'rentIn', 'nii', 'alimonyIn'];
const EXP = ['rent', 'mortgage', 'arnona', 'food', 'phone', 'mobile', 'gas', 'vaad', 'water', 'elec', 'trustee', 'medical', 'travel', 'daycare', 'alimonyOut', 'travel2', 'car', 'edu', 'clothes'];
const LINES = INC.concat(EXP);
const fileFor = (r: any, cat: string, month: string) => (r.files || []).some((f: any) => f.cat === cat && (!f.month || f.month === month));
function missing(r: any, p: any) {
  const out: any[] = [];
  LINES.forEach(k => { const v = (r.inc || {})[k] || (r.exp || {})[k] || []; p.months.forEach((mo: string, i: number) => { if (+v[i] > 0 && !fileFor(r, k, mo)) out.push({ k, month: mo }); }); });
  (r.incX || []).concat(r.expX || []).forEach((x: any) => p.months.forEach((mo: string, i: number) => { if (+(x.v || [])[i] > 0 && !fileFor(r, 'extra', mo) && !out.some(o => o.k === 'extra' && o.month === mo)) out.push({ k: 'extra', month: mo }); }));
  return out;
}
function expected(m: any, ps: any[]) {
  const r = ps.slice().reverse().map(p => rep(m, p.key)).find((x: any) => Object.keys(x.inc || {}).length || Object.keys(x.exp || {}).length) || {};
  const ks = LINES.filter(k => ((r.inc || {})[k] || (r.exp || {})[k] || []).some((v: any) => +v > 0));
  if (+m.trusteePay && !ks.includes('trustee')) ks.push('trustee');
  return ks;
}
const amt = (v: any) => { if (v === '' || v == null) return ''; const n = Math.round(Number(v) * 100) / 100; return isFinite(n) && n >= 0 && n < 1e8 ? n : ''; };
const pair = (v: any) => Array.isArray(v) ? [amt(v[0]), amt(v[1])] : ['', ''];
const str = (v: any, n = 200) => String(v ?? '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, n);
const extras = (a: any, n: number) => (Array.isArray(a) ? a : []).slice(0, n).map((x: any) => ({ label: str(x && x.label, 80), v: pair(x && x.v) })).filter(x => x.label || x.v.some(v => v !== ''));
const safeName = (s: string) => str(s, 120).replace(/[\\/:*?"<>|#%]/g, '_') || 'file';

async function find(t: string) {
  if (!/^[A-Za-z0-9]{16,64}$/.test(t)) return null;
  const { data } = await admin().from('docs').select('id,data').eq('coll', 'matters').eq('data->>reportToken', t).limit(1);
  if (!data || !data.length) return null;
  const m: any = Object.assign({ id: data[0].id }, data[0].data);
  if (m.reportOff || m.kind !== 'insolvency') return null;
  return m;
}
async function office() {
  const { data } = await admin().from('docs').select('data').eq('coll', 'settings').eq('id', 'main').maybeSingle();
  const s: any = Object.assign({ office: 'משרד עו״ד יקיר דבול', phone: '09-8613413', lawyer: 'עו״ד יקיר דבול' }, (data && data.data) || {});
  return { name: s.office, phone: s.phone, lawyer: s.lawyer, whatsapp: s.whatsapp || '' };
}
// write the report back (the whole matter record is re-read right before, so office edits are kept)
async function saveRep(id: string, key: string, fn: (r: any, m: any) => any) {
  const sb = admin();
  const { data } = await sb.from('docs').select('data').eq('coll', 'matters').eq('id', id).single();
  const m: any = data!.data, irep = Object.assign({}, m.irep || {});
  const r = fn(Object.assign({}, irep[key] || {}), m); irep[key] = r;
  const { error } = await sb.rpc('docs_merge', { p_coll: 'matters', p_id: id, p_patch: { irep } });
  if (error) throw error;
  return r;
}
const view = (m: any, p: any, r: any) => ({
  key: p.key, label: label(p), months: p.months.map((k: string) => MONTHS[+k.slice(5) - 1]), mkeys: p.months, due: p.due, ended: p.end < nowM(),
  status: r.status || '', locked: ['ready', 'submitted'].includes(r.status || ''),
  inc: r.inc || {}, exp: Object.assign({}, +m.trusteePay && !(r.exp && r.exp.trustee) ? { trustee: [+m.trusteePay, +m.trusteePay] } : {}, r.exp || {}),
  incX: r.incX || [], expX: r.expX || [], persons: r.persons ?? m.persons ?? '', address: r.address || m.address || '', phone: r.phone || m.phone || '',
  files: (r.files || []).map((f: any) => ({ name: f.name, cat: f.cat || '', month: f.month || '', amount: f.amount ?? '', path: String(f.url || '').startsWith('sbfile:') ? String(f.url).slice(7) : '', by: f.by || '' })),
  signed: !!r.sig, filledAt: r.filledAt || null, missing: missing(r, p),
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  await loadSecrets().catch(() => {});
  try {
    if (req.method === 'GET') {
      const m = await find(new URL(req.url).searchParams.get('t') || '');
      if (!m) return json({ error: 'not_found' }, 404);
      const S = state(m), first = String(m.debtor || m.title || '').split(/[ ,(]/)[0], views: any = {};
      S.ps.filter(p => p === S.cur || p === S.close || ['filled'].includes(rep(m, p.key).status || '') && p.end < nowM() && S.ps.indexOf(p) >= S.ps.length - 3).forEach(p => views[p.key] = view(m, p, rep(m, p.key)));
      return json({ office: await office(), name: first, caseNo: m.caseNo || '', now: nowM(), cur: S.cur && S.cur.key, close: S.close && S.close.key,
        months: S.months.map(k => ({ key: k, label: MONTHS[+k.slice(5) - 1] })), expect: expected(m, S.ps), periods: views,
        history: S.ps.filter(x => rep(m, x.key).status === 'submitted').map(x => ({ label: label(x), at: rep(m, x.key).submittedAt || null })).reverse().slice(0, 6) });
    }
    if (req.method !== 'POST') return json({ error: 'method' }, 405);
    const b = await req.json().catch(() => ({}));
    const m = await find(String(b.t || ''));
    if (!m) return json({ error: 'not_found' }, 404);
    const S = state(m), sb = admin();
    const byMonth = (mo: string) => S.open.find(p => p.months.includes(mo) && mo <= nowM());
    const byPath = (path: string) => S.open.find(p => path.startsWith(`insolv/${m.id}/${p.key}/`) && !path.includes('..'));
    const p: any = b.key ? S.open.find(p => p.key === b.key) : null;
    const dir = p ? `insolv/${m.id}/${p.key}` : '';

    if (b.op === 'upload') {
      const pp = byMonth(String(b.month || ''));
      if (!pp) return json({ error: 'locked' }, 423);
      if ((rep(m, pp.key).files || []).length >= 150) return json({ error: 'too_many' }, 400);
      const clean = safeName(b.name).replace(/[^A-Za-z0-9._-]/g, '');
      const path = `insolv/${m.id}/${pp.key}/${uid('f')}-${clean || 'file'}${/\.[A-Za-z0-9]{2,5}$/.test(clean) ? '' : (String(b.type || '').includes('pdf') ? '.pdf' : '.jpg')}`;
      const { data, error } = await sb.storage.from('files').createSignedUploadUrl(path);
      if (error) throw error;
      return json({ path, url: data.signedUrl, key: pp.key });
    }
    if (b.op === 'uploaded') {
      const path = String(b.path || ''), pp = byPath(path), month = String(b.month || '');
      if (!pp || !pp.months.includes(month)) return json({ error: 'path' }, 400);
      const name = safeName(b.name), type = str(b.type, 60), cat = str(b.cat, 30), amount = amt(b.amount);
      await saveRep(m.id, pp.key, r => Object.assign(r, { files: (r.files || []).filter((f: any) => f.url !== 'sbfile:' + path).concat([{ name, type, cat, month, amount, url: 'sbfile:' + path, at: new Date().toISOString(), by: 'client' }]) }));
      // the same file also lands in the client's folder in the office
      await sb.from('docs').upsert({ coll: 'documents', id: uid('f'), data: { clientId: m.clientId || '', dealId: '', folder: `חדלות פירעון/דוח ${label(pp)}`, title: name.replace(/\.[^.]+$/, ''), type: 'incoming', fileName: name, url: 'sbfile:' + path, created: todayIL(), fromClient: true, matterId: m.id }, updated_at: new Date().toISOString() });
      return json({ ok: true, key: pp.key });
    }
    if (b.op === 'amount' || b.op === 'unfile') {
      const path = String(b.path || ''), pp = byPath(path);
      if (!pp) return json({ error: 'path' }, 400);
      await saveRep(m.id, pp.key, r => Object.assign(r, { files: b.op === 'unfile' ? (r.files || []).filter((f: any) => f.url !== 'sbfile:' + path) : (r.files || []).map((f: any) => f.url === 'sbfile:' + path ? Object.assign({}, f, { amount: amt(b.amount) }) : f) }));
      return json({ ok: true });
    }
    if (!p) return json({ error: 'period' }, 409);

    if (b.op === 'save' || b.op === 'submit') {
      const fields = (r: any) => {
        const inc: any = {}, exp: any = {};
        INC.forEach(k => { const v = pair((b.inc || {})[k]); if (v.some(x => x !== '')) inc[k] = v; });
        EXP.forEach(k => { const v = pair((b.exp || {})[k]); if (v.some(x => x !== '')) exp[k] = v; });
        return Object.assign(r, { inc, exp, incX: extras(b.incX, 4), expX: extras(b.expX, 5), persons: amt(b.persons), address: str(b.address, 160), phone: str(b.phone, 30), savedAt: new Date().toISOString() });
      };
      if (b.op === 'save') { await saveRep(m.id, p.key, r => fields(r)); return json({ ok: true }); }
      // submit: only when the two months are over. Receipts are recommended, not required:
      // a client who lives in his own apartment or with his parents has no rent receipt, and that is fine.
      if (p.end >= nowM()) return json({ error: 'early' }, 400);
      const miss = missing(fields(Object.assign({}, rep(m, p.key))), p);
      const sig = String(b.sig || '');
      if (!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig) || sig.length > 600_000) return json({ error: 'signature' }, 400);
      const bytes = Uint8Array.from(atob(sig.split(',')[1]), c => c.charCodeAt(0));
      const sigPath = `${dir}/signature-${Date.now()}.png`;
      const up = await sb.storage.from('files').upload(sigPath, bytes, { contentType: 'image/png', upsert: true });
      if (up.error) throw up.error;
      const r = await saveRep(m.id, p.key, r => Object.assign(fields(r), { status: 'filled', filledAt: new Date().toISOString(), sig: 'sbfile:' + sigPath, signedAt: todayIL(), signedName: str(b.name, 80), missingAtSubmit: miss.length }));
      const nf = (r.files || []).length;
      await telegram(`📄 ${m.debtor || m.title} מילא/ה את הדוח הדו-חודשי לממונה (${label(p)})\n${nf} מסמכים צורפו · להגשה עד ${p.due.split('-').reverse().join('/')}${miss.length ? `\n⚠️ ${miss.length} שורות עם סכום בלי קבלה. כדאי לבדוק אם הן רלוונטיות לפני ההגשה.` : ''}\n\nנכנסים לתיק, בודקים ומפיקים PDF בלחיצה.`).catch(() => false);
      return json({ ok: true });
    }
    return json({ error: 'op' }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: 'server' }, 500);
  }
});
