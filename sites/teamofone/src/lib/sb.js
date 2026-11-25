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
};
export const errText = (e) => ERR[e?.message || e] || ERR[String(e?.message || '').replace(/^.*?: /, '')] || 'משהו השתבש. נסו שוב.';
