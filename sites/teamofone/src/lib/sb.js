// Supabase client for the browser (public key only; every table is protected by row level security).
import { createClient } from '@supabase/supabase-js';
import { SB_URL, SB_KEY, FN } from './const.js';
export { SB_URL, SB_KEY, FN };
export const sb = createClient(SB_URL, SB_KEY, { auth: { persistSession: true, storageKey: 'too-auth', autoRefreshToken: true } });
export const BASE = import.meta.env.BASE_URL;
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtDate = (d) => d ? new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' }) : '';
export const ils = (n) => (Number(n) || 0).toLocaleString('he-IL') + ' ₪';
export function toast(msg, bad) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.className = bad ? 'show bad' : 'show';
  clearTimeout(t._h); t._h = setTimeout(() => (t.className = ''), 3200);
}
export const ERR = {
  email: 'כתובת המייל לא נראית תקינה.', password: 'הסיסמה צריכה להיות באורך 8 תווים לפחות.', name: 'נא לכתוב שם מלא.',
  exists: 'כבר יש חשבון עם המייל הזה. אפשר להיכנס.', rate: 'יותר מדי ניסיונות. נסו שוב בעוד שעה.', create: 'לא הצלחנו ליצור חשבון. נסו שוב.',
  'Invalid login credentials': 'המייל או הסיסמה לא נכונים.', not_admin: 'אין הרשאה לפעולה הזאת.', test_mode_off: 'התשלום באתר ייפתח בקרוב.',
  mail: 'לא הצלחנו לשלוח את מייל האישור. נסו שוב בעוד כמה דקות.', pay_unavailable: 'דף התשלום לא נפתח כרגע. נסו שוב בעוד כמה דקות.',
  has_access: 'כבר יש לכם גישה לקורס. אפשר להיכנס לאזור האישי.', test_mode_on: 'האתר עדיין במצב בדיקה.', not_logged_in: 'צריך להיכנס לחשבון קודם.',
  no_price: 'המחיר של הקורס הזה עוד לא נקבע.', not_open: 'הקורס הזה עוד לא נפתח.', no_plan: 'המסלול לא נמצא.',
};
// Database and network errors in plain Hebrew (by Postgres / PostgREST code, then by the message text).
const CODE = {
  23503: 'החשבון שלכם עוד לא הושלם. רעננו את הדף ונסו שוב.', 42501: 'אין לכם הרשאה לפעולה הזאת.',
  23514: 'הטקסט קצר מדי או ארוך מדי.', 23505: 'זה כבר נשמר.', PGRST301: 'פג הזמן של הכניסה לחשבון. היכנסו שוב.',
  PGRST116: 'הפריט לא נמצא. אולי הוא נמחק.', '22P02': 'יש ערך לא תקין בטופס.',
};
export const errText = (e) => {
  const m = String(e?.message || e || '');
  return ERR[m] || ERR[m.replace(/^.*?: /, '')] || CODE[e?.code]
    || (/row-level security|permission denied/i.test(m) ? CODE[42501] : '')
    || (/JWT|token/i.test(m) ? CODE.PGRST301 : '')
    || (/Failed to fetch|NetworkError|Load failed|network/i.test(m) ? 'אין חיבור לאינטרנט כרגע. בדקו את החיבור ונסו שוב.' : '')
    || 'משהו השתבש. נסו שוב בעוד רגע.';
};
