// All forms with data-dir="<action>" post JSON to the directory engine: <endpoint>?a=<action>.
// A hidden "website" field is a trap for bots: if it is filled we pretend it worked and send nothing.
const OK: Record<string, string> = {
  lead: 'הפנייה נשלחה. עורך הדין או צוות האתר יחזרו אליכם בהקדם האפשרי.',
  join: 'הבקשה התקבלה. נבדוק את הפרטים וניצור קשר כדי להשלים את ההצטרפות.',
  claim: 'הבקשה התקבלה. לפני שנעביר אליכם את הפרופיל נוודא שאתם עורכי הדין שמופיעים בו, ונחזור אליכם.',
  remove: 'הבקשה התקבלה. נטפל בה ונעדכן אתכם בטלפון או במייל שהשארתם.',
  review: 'תודה. חוות הדעת התקבלה ותופיע אחרי בדיקה קצרה.',
  otp: 'שלחנו קוד לטלפון שהזנתם. הקלידו אותו כאן כדי לאשר את חוות הדעת.',
};
const ERR = 'השליחה לא הצליחה. בדקו את החיבור לאינטרנט ונסו שוב, או כתבו לנו דרך עמוד יצירת הקשר.';

function endpoint() { return document.body.dataset.dir || ''; }

async function post(action: string, data: Record<string, unknown>) {
  const r = await fetch(endpoint(), { method: 'POST', headers: { apikey: document.body.dataset.dk || '', 'content-type': 'application/json' }, body: JSON.stringify({ a: action, p: { site: 'folivus', page: location.pathname, ...data } }) });
  if (!r.ok) throw new Error(String(r.status));
  const j = await r.json().catch(() => ({}));
  if (j && j.ok === false) throw new Error(String(j.error || 'failed'));
  return j;
}

function collect(f: HTMLFormElement) {
  const o: Record<string, unknown> = {};
  new FormData(f).forEach((v, k) => {
    if (k in o) o[k] = ([] as unknown[]).concat(o[k], v);
    else o[k] = v;
  });
  // checkbox groups (data-multi) always as arrays
  f.querySelectorAll<HTMLInputElement>('[data-multi]').forEach((el) => { const k = el.name; if (!Array.isArray(o[k])) o[k] = o[k] ? [o[k]] : []; });
  return o;
}

function setStatus(f: HTMLFormElement, kind: 'ok' | 'err' | '', text: string) {
  const s = f.querySelector('.status') as HTMLElement | null;
  if (!s) return;
  s.className = 'status' + (kind ? ' ' + kind : '');
  s.textContent = text;
}

function validate(f: HTMLFormElement) {
  for (const el of Array.from(f.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('[required]'))) {
    if (el.closest('[hidden]')) continue;
    const empty = el instanceof HTMLInputElement && el.type === 'checkbox' ? !el.checked : !String(el.value).trim();
    if (empty) { el.focus(); return 'נא למלא את כל שדות החובה ולסמן את תיבת ההסכמה.'; }
    if (el instanceof HTMLInputElement && el.type === 'tel' && el.value.replace(/\D/g, '').length < 9) { el.focus(); return 'מספר הטלפון נראה קצר מדי. נא לבדוק אותו.'; }
    if (el instanceof HTMLInputElement && el.type === 'email' && el.value && !/^\S+@\S+\.\S+$/.test(el.value)) { el.focus(); return 'כתובת המייל לא נראית תקינה.'; }
  }
  return '';
}

export function initForms() {
  // prefill from query string (?id=, ?claim=, ?area=)
  const qs = new URLSearchParams(location.search);
  document.querySelectorAll<HTMLInputElement>('[data-from-qs]').forEach((el) => { const v = qs.get(el.dataset.fromQs!); if (v) el.value = v; });

  document.querySelectorAll<HTMLFormElement>('form[data-dir]').forEach((f) => {
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const action = f.dataset.dir!;
      const step = f.dataset.step || '';
      const data = collect(f);
      const btn = f.querySelector('button[type=submit]') as HTMLButtonElement | null;
      const msg = validate(f);
      if (msg) return setStatus(f, 'err', msg);
      if (data.website) { f.classList.add('sent'); return setStatus(f, 'ok', OK[action] || OK.lead); }
      delete data.website;
      if (btn) { btn.disabled = true; btn.dataset.t = btn.textContent || ''; btn.textContent = 'שולח...'; }
      setStatus(f, '', '');
      try {
        if (action === 'review' && step !== 'code') {
          // step 1: ask for a phone code (verified reviews only)
          const o = await post('otp', { phone: data.phone, lawyerId: data.lawyerId });
          if (o && o.skip) {
            // no phone code yet: the review is saved as pending and checked by a phone call before it goes live
            await post('review', data);
            f.classList.add('sent');
            setStatus(f, 'ok', 'תודה. חוות הדעת התקבלה. לפני שהיא עולה לאתר נוודא בטלפון שאתם לקוחות של המשרד.');
            return;
          }
          f.dataset.step = 'code';
          f.querySelectorAll<HTMLElement>('[data-step-code]').forEach((el) => { el.hidden = false; });
          if (btn) btn.dataset.t = 'אישור ושליחה';
          setStatus(f, 'ok', OK.otp);
        } else {
          await post(action, data);
          f.classList.add('sent');
          setStatus(f, 'ok', OK[action] || OK.lead);
        }
      } catch {
        setStatus(f, 'err', ERR);
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = btn.dataset.t || btn.textContent; }
      }
    });
  });
}

export function initCookie() {
  const el = document.getElementById('cookie');
  if (!el) return;
  let seen = false;
  try { seen = localStorage.getItem('fv-cookie') === '1'; } catch {}
  if (!seen) el.hidden = false;
  el.querySelector('button')?.addEventListener('click', () => { el.hidden = true; try { localStorage.setItem('fv-cookie', '1'); } catch {} });
}

export function initMenu() {
  const h = document.getElementById('hdr');
  const b = h?.querySelector('.menu-btn');
  b?.addEventListener('click', () => { const o = h!.classList.toggle('open'); b.setAttribute('aria-expanded', o ? 'true' : 'false'); });
}
