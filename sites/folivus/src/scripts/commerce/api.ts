// Client side of the commerce layer: calls the server function fol-api, keeps the sign-in session, small helpers.
// No prices or rules are decided here: the server checks and computes everything again.
import { DB } from '../../config/brand';

export const FN = DB.url + '/functions/v1/fol-api';
const KEY = 'fol_session';
export type Session = { access_token: string; refresh_token: string; expires_at: number };

export function session(): Session | null { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } }
export function setSession(s: Session | null) { if (s) localStorage.setItem(KEY, JSON.stringify(s)); else localStorage.removeItem(KEY); }
async function fresh(): Promise<Session | null> {
  const s = session(); if (!s) return null;
  if (s.expires_at * 1000 - Date.now() > 60e3) return s;
  const r = await fetch(DB.url + '/auth/v1/token?grant_type=refresh_token', { method: 'POST', headers: { apikey: DB.key, 'content-type': 'application/json' }, body: JSON.stringify({ refresh_token: s.refresh_token }) }).catch(() => null);
  if (!r || !r.ok) { setSession(null); return null; }
  const j = await r.json(); const n = { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at };
  setSession(n); return n;
}
export async function api(action: string, body: Record<string, unknown> = {}, auth = false): Promise<any> {
  const h: Record<string, string> = { 'content-type': 'application/json', apikey: DB.key };
  if (auth) { const s = await fresh(); if (s) h.authorization = 'Bearer ' + s.access_token; }
  try {
    const r = await fetch(FN, { method: 'POST', headers: h, body: JSON.stringify({ action, ...body }) });
    const j = await r.json().catch(() => ({}));
    return { ...j, state: j.status, status: r.status }; // state = the server's own status field (for example an order state)
  } catch { return { status: 0, error: 'network' }; }
}
export async function rpc(fn: string, args: Record<string, unknown>): Promise<any> {
  const r = await fetch(`${DB.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: DB.key, 'content-type': 'application/json' }, body: JSON.stringify(args) }).catch(() => null);
  return r && r.ok ? r.json() : null;
}
export async function rest(path: string): Promise<any> {
  const r = await fetch(`${DB.url}/rest/v1/${path}`, { headers: { apikey: DB.key } }).catch(() => null);
  return r && r.ok ? r.json() : null;
}
export async function testMode(): Promise<boolean> {
  const j = await rest('fol_settings?key=eq.test_mode&select=value');
  return !(Array.isArray(j) && j[0] && j[0].value === false);
}
export async function salesWhatsapp(): Promise<string> {
  const j = await rest('fol_settings?key=eq.sales&select=value');
  const n = Array.isArray(j) && j[0] && j[0].value && String(j[0].value.whatsapp || '').replace(/[^0-9]/g, '');
  return n ? n.replace(/^0/, '972') : '';
}

export const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
export const ils = (n: unknown) => (Number(n) || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 }) + ' ₪';
export const heDate = (d: unknown) => (d ? new Date(String(d)).toLocaleDateString('he-IL') : '');
export const $ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector(sel) as T;
export const $$ = <T extends HTMLElement = HTMLElement>(sel: string, root: ParentNode = document) => [...root.querySelectorAll(sel)] as T[];
export function say(el: HTMLElement | null, text: string, kind: 'ok' | 'bad' | 'info' = 'info') { if (!el) return; el.className = 'msg show ' + kind; el.textContent = text; }

// error codes from the server, in simple Hebrew
export const ERR: Record<string, string> = {
  name: 'נא לכתוב שם מלא.', email: 'כתובת המייל לא נראית תקינה.', phone: 'מספר הטלפון לא נראה תקין.', rate: 'נשלחו יותר מדי בקשות. נסו שוב בעוד שעה.',
  network: 'אין חיבור כרגע. נסו שוב בעוד כמה דקות.', server: 'משהו השתבש אצלנו. נסו שוב בעוד כמה דקות.', test_mode_on: 'האתר במצב בדיקה: אפשר לבצע רכישת בדיקה בלי חיוב.',
  test_mode_off: 'רכישת בדיקה אפשרית רק במצב בדיקה.', no_plan: 'החבילה לא זמינה.', no_price: 'המחיר של המוצר הזה עוד לא נקבע.', slots: 'נא לבחור תחום ועיר.',
  too_many_slots: 'בחרתם יותר מקומות ממה שהחבילה כוללת.', area: 'נא לבחור תחום.', city: 'נא לבחור עיר.', duplicate_slot: 'בחרתם את אותו תחום ועיר פעמיים.',
  target: 'נא לבחור עמוד מהרשימה.', sold_out: 'המקום הזה כבר תפוס. נא לבחור מקום אחר.', months: 'נא לבחור מספר חודשים.', brief: 'נא לכתוב את נושא המאמר.',
  ad_name: 'נא לכתוב את שם העסק.', ad_category: 'נא לבחור תחום שירות.', ad_text: 'הטקסט של המודעה כולל ניסוח שאסור לפרסם (לשון הפלגה או הבטחה).', website: 'כתובת האתר צריכה להתחיל ב https://',
  login_required: 'כדי לקנות למשרד שכבר מופיע באתר צריך להיכנס לאזור המשרדים.', not_owner: 'רק בעלי הפרופיל יכולים לקנות עבורו.', firm_name: 'נא לכתוב את שם המשרד.',
  firm_name_words: 'שם המשרד כולל ניסוח שאסור לפרסם.', firm_exists: 'המשרד כבר מופיע באתר. קודם מאשרים בעלות על הפרופיל, ואז קונים מאזור המשרדים.',
  pay_unavailable: 'דף התשלום לא זמין כרגע. נסו שוב בעוד כמה דקות.', targets_unavailable: 'רשימת העמודים לא זמינה כרגע. נסו שוב בעוד כמה דקות.',
  renew_link: 'קישור החידוש לא בתוקף. היכנסו לאזור המשרדים כדי לחדש.', review: 'ההזמנה עברה לבדיקה ידנית.', code: 'הקוד לא נכון.', expired: 'הקוד פג תוקף. שלחו את הטופס שוב.',
  attempts: 'היו יותר מדי ניסיונות. שלחו את הטופס שוב.', firm: 'המשרד לא נמצא.', claimed: 'כבר יש בעלים מאושרים לפרופיל הזה. אם זו טעות, כתבו לנו.',
  rating: 'נא לבחור ציון.', body_short: 'נא לכתוב לפחות 30 תווים.', consent: 'צריך לאשר את התנאים.', duplicate: 'כבר כתבתם חוות דעת על המשרד הזה בשנה האחרונה.',
  invite: 'קישור ההזמנה לא בתוקף.', words: 'הטקסט כולל ביטויים שהאתר לא מפרסם, כמו לשון הפלגה. נסחו מחדש בבקשה.', login: 'הכניסה לא הצליחה. בקשו קישור חדש.',
  not_enabled: 'פרופיל מורחב זמין למשרדים שאישרו בעלות או קנו חבילה.', too_big: 'הקובץ גדול מדי.', type: 'אפשר להעלות רק תמונה (PNG, JPG או WEBP).', rules: 'הטקסט לא עומד בכללי הפרסום.',
  not_admin: 'אין הרשאה.', link: 'הקישור לא בתוקף.', status: 'הפעולה כבר בוצעה.',
};
export const errText = (j: any) => ERR[j?.error] || 'משהו השתבש. נסו שוב.';

// tiny, safe markdown for sponsored drafts and articles: headings, lists, bold, paragraphs (everything escaped first)
export function mdLite(src: string): string {
  const out: string[] = []; let list = false;
  for (const raw of esc(src).split(/\n/)) {
    const line = raw.trim();
    const inline = (t: string) => t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (/^[-*] /.test(line)) { if (!list) { out.push('<ul>'); list = true; } out.push(`<li>${inline(line.slice(2))}</li>`); continue; }
    if (list) { out.push('</ul>'); list = false; }
    if (!line) continue;
    const h = line.match(/^(#{2,4}) (.+)$/);
    out.push(h ? `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>` : `<p>${inline(line)}</p>`);
  }
  if (list) out.push('</ul>');
  return out.join('');
}
export const LANGS = ['עברית', 'אנגלית', 'ערבית', 'רוסית', 'צרפתית', 'ספרדית', 'אמהרית', 'יידיש', 'גרמנית', 'איטלקית', 'פורטוגזית', 'רומנית', 'אוקראינית', 'הונגרית', 'פרסית', 'טורקית'];
export const DAYS: [string, string][] = [['sun', 'ראשון'], ['mon', 'שני'], ['tue', 'שלישי'], ['wed', 'רביעי'], ['thu', 'חמישי'], ['fri', 'שישי'], ['sat', 'שבת']];
