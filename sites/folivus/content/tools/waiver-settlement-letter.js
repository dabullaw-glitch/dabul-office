// מחולל כתב קבלה וויתור בסיום עבודה - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// עקרונות כתב ויתור לפי כל זכות (נבדק 25.11.2026): אי ויתור על זכויות מגן, איסור התניה, דרישת פירוט והסבר.

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

export function parsePayments(text) {
  return lines(text).map((l) => {
    const m = l.match(/^(.*?)[:\s]+([\d,]+(?:\.\d+)?)\s*₪?$/);
    return m ? { label: m[1].trim(), amount: Number(m[2].replace(/,/g, "")) } : { label: l, amount: NaN };
  });
}

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.employee_name) warnings.push("חסר שם העובד.");
  if (!inputs.employer_name) warnings.push("חסר שם המעסיק.");
  const pays = parsePayments(inputs.payments);
  if (!pays.length) warnings.push("לא פורטו רכיבים וסכומים. בית הדין לא נותן משקל לכתב ויתור שאינו מפרט את הסכומים והזכויות.");
  if (pays.some((x) => !Number.isFinite(x.amount))) warnings.push("לחלק מהרכיבים אין סכום. כתבו כל רכיב בפורמט: תיאור: סכום.");
  if (!isTrue(inputs.explained)) warnings.push("לא סומן שהמסמך הוסבר לעובד ושקיבל זמן לעיין בו. בלי זה המסמך עלול לא לקבל תוקף.");
  const extra = Number(inputs.extra_amount) > 0 ? Number(inputs.extra_amount) : 0;
  if (!extra) warnings.push("לא משולם סכום מעבר לזכויות שבדין. זכויות שבחוק, בצו הרחבה או בהסכם קיבוצי אינן ניתנות לוויתור, ולכן המסמך הוא בעיקר אישור קבלה.");
  if (extra && !inputs.extra_reason) warnings.push("פרטו בעבור מה משולם הסכום הנוסף.");
  const total = pays.reduce((a, x) => a + (Number.isFinite(x.amount) ? x.amount : 0), 0) + extra;

  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>אישור קבלת תשלומים וכתב ויתור</h1>`, `<p>תאריך: ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p>אני, ${blank(inputs.employee_name)}, ת"ז ${blank(inputs.employee_id)}, שעבדתי ב${blank(inputs.employer_name)} (להלן: "המעסיק") ${parseDate(inputs.start_date) ? `מיום ${heDate(inputs.start_date)} ` : ""}עד יום ${heDate(inputs.end_date)}, מאשר/ת כך:</p>`);
  p.push(`<p>1. קיבלתי מהמעסיק את התשלומים הבאים, בסכומים ברוטו:</p>`);
  p.push(`<table><tr><th>רכיב</th><th>סכום</th></tr>${pays.map((x) => `<tr><td>${esc(x.label)}</td><td>${Number.isFinite(x.amount) ? money(x.amount) : "____________"}</td></tr>`).join("")}${extra ? `<tr><td>סכום נוסף מעבר לזכויות שבדין${inputs.extra_reason ? `: ${esc(String(inputs.extra_reason).trim())}` : ""}</td><td>${money(extra)}</td></tr>` : ""}<tr><th>סך הכול</th><th>${total > 0 ? money(total) : "____________"}</th></tr></table>`);
  p.push(`<p>2. התשלומים המגיעים לי לפי דין לא הותנו בחתימתי על מסמך זה.</p>`);
  p.push(`<p>3. ${isTrue(inputs.explained) ? "תוכן המסמך הוסבר לי, קיבלתי זמן לעיין בו ובאפשרותי היה להתייעץ עם עורך דין לפני החתימה." : "קיבלתי הזדמנות לעיין במסמך ולהתייעץ עם עורך דין לפני החתימה."}</p>`);
  p.push(`<p>4. ${extra ? "בכפוף לקבלת כל הסכומים שבטבלה, ובתמורה לסכום הנוסף, אין לי טענות או תביעות נוספות כלפי המעסיק בקשר לרכיבים המפורטים לעיל ולתקופת עבודתי." : "בכפוף לקבלת כל הסכומים שבטבלה, אני מאשר/ת שקיבלתי את הרכיבים המפורטים לעיל."}</p>`);
  p.push(`<p>5. ידוע לי שאין במסמך זה ויתור על זכות שאינה ניתנת לוויתור לפי דין.</p>`);
  p.push(`<p>חתימת העובד/ת: __________</p><p>חתימת המעסיק: __________</p>`, DISCLAIMER, `</div>`);
  return { title: "אישור קבלת תשלומים וכתב ויתור", html: p.join("\n"), warnings };
}
