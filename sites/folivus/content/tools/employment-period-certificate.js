// מחולל אישור על תקופת העסקה (מכתב סיום העסקה) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// סעיף 8 לחוק הודעה מוקדמת לפיטורים ולהתפטרות: 14 ימים, או 7 ימים מבקשה בכתב, לפי המוקדם (כל זכות, נבדק 25.11.2026).

export const CONFIG = {
  autoDays: 14, // מיום העבודה האחרון
  onRequestDays: 7, // מבקשה בכתב של העובד
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const blank = (s, w = "____________") => (s !== undefined && s !== null && String(s).trim() ? esc(String(s).trim()) : w);
const lines = (s) => String(s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const isTrue = (v) => v === true || v === "true";
const flag = (v, d = false) => (v === undefined || v === null || v === "" ? d : isTrue(v));
const numOr = (v, d) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));
function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const fmtDate = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
const heDate = (s) => (parseDate(s) ? fmtDate(parseDate(s)) : "____________");
const money = (x) => (Number(x) > 0 ? Number(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪" : "____________ ₪");
const ul = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const warnBox = (w) => (w.length ? `<div class="warnings"><h3>לבדיקה לפני חתימה או משלוח</h3><ul>${w.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "");
const signTable = (parties) => `<table><tr>${parties.map((p) => `<th>${p.role}</th>`).join("")}</tr><tr>${parties.map((p) => `<td>${blank(p.name)}<br>חתימה: __________</td>`).join("")}</tr></table>`;
const DISCLAIMER = `<p class="disclaimer"><strong>טיוטה כללית, מומלץ להתייעץ עם עורך דין.</strong> המסמך הופק אוטומטית בכלי של פוליבוס לפי הפרטים שהוזנו, ואינו ייעוץ משפטי. כל מקרה שונה, ולכן כדאי שעורך דין יבדוק את הנוסח לפני חתימה או משלוח.</p>`;

export function deadline(endDate, requestDate) {
  const e = parseDate(endDate), r = parseDate(requestDate);
  if (!e) return null;
  const a = new Date(e.getTime() + CONFIG.autoDays * 86400000);
  if (!r) return a;
  const b = new Date(r.getTime() + CONFIG.onRequestDays * 86400000);
  return b < a ? b : a;
}

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.employer_name) warnings.push("חסר שם המעסיק.");
  if (!inputs.employee_name) warnings.push("חסר שם העובד.");
  const s = parseDate(inputs.start_date), e = parseDate(inputs.end_date);
  if (!s || !e) warnings.push("חסרים תאריך תחילת העבודה או יום העבודה האחרון. אלה הפרטים שהחוק מחייב.");
  if (s && e && e < s) warnings.push("יום העבודה האחרון מוקדם מתאריך התחלת העבודה.");
  const dl = deadline(inputs.end_date, inputs.request_date);
  const iss = parseDate(inputs.issue_date);
  if (dl && iss && iss > dl) warnings.push(`האישור נמסר ב-${fmtDate(iss)}, אחרי המועד האחרון לפי החוק (${fmtDate(dl)}).`);

  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<p>${blank(inputs.employer_name)}, ח.פ./ת"ז ${blank(inputs.employer_id)}<br>${blank(inputs.employer_address)}</p><p>תאריך: ${heDate(inputs.issue_date)}</p>`);
  p.push(`<h1>אישור על תקופת העבודה</h1>`);
  p.push(`<p>הננו מאשרים כי ${blank(inputs.employee_name)}, ת"ז ${blank(inputs.employee_id)}, הועסק/ה אצלנו מיום ${heDate(inputs.start_date)} ועד יום ${heDate(inputs.end_date)} (יום העבודה האחרון).</p>`);
  if (isTrue(inputs.include_role)) p.push(`<p>התפקיד: ${blank(inputs.role)}. היקף המשרה: ${blank(inputs.scope)}.</p>`);
  p.push(`<p>אישור זה ניתן לפי סעיף 8 לחוק הודעה מוקדמת לפיטורים ולהתפטרות.</p>`);
  p.push(`<p>${blank(inputs.signer, "________")}<br>חתימה וחותמת: __________</p>`, DISCLAIMER, `</div>`);
  return { title: "אישור על תקופת העבודה", html: p.join("\n"), warnings };
}
