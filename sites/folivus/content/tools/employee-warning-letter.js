// מחולל מכתב התראה לעובד - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// עיקרון הפירוט (אירועים ומועדים) לפי פסיקת השימוע שסוכמה בכל זכות. נבדק 25.11.2026.

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

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.employer_name) warnings.push("חסר שם המעסיק.");
  if (!inputs.employee_name) warnings.push("חסר שם העובד.");
  const inc = lines(inputs.incidents);
  if (!inc.length) warnings.push("לא תוארו אירועים. מכתב התראה צריך לפרט אירועים מסוימים ומועדיהם.");
  else if (inc.some((x) => !/\d/.test(x))) warnings.push("בחלק מהאירועים אין תאריך. ציינו מועד לכל אירוע.");
  if (!inputs.expectations) warnings.push("לא צוין מה מצופה מהעובד. בלי ציפיות ברורות קשה להשתפר.");
  const days = Math.max(1, Math.round(Number(inputs.response_days)) || 7);
  const d = parseDate(inputs.letter_date);

  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<p>תאריך: ${heDate(inputs.letter_date)}</p><p>לכבוד<br>${blank(inputs.employee_name)}${inputs.employee_role ? `, ${esc(String(inputs.employee_role).trim())}` : ""}</p>`);
  p.push(`<h1>הנדון: התראה</h1>`);
  p.push(`<p>1. מכתב זה נועד לתעד את האירועים הבאים, ולהבהיר מה מצופה ממך מעתה:</p>${inc.length ? `<ol>${inc.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>` : "<p>____________</p>"}`);
  if (inputs.prior_talks) p.push(`<p>2. העניין עלה כבר בעבר: ${esc(String(inputs.prior_talks).trim())}.</p>`);
  p.push(`<p>${inputs.prior_talks ? 3 : 2}. מעתה אנו מצפים ש${blank(inputs.expectations)}.</p>`);
  if (inputs.support) p.push(`<p>כדי לעזור לך, אנו מציעים: ${esc(String(inputs.support).trim())}.</p>`);
  p.push(`<p>אם יש לך הסבר, הסתייגות או תגובה, אתה מוזמן למסור אותם בכתב עד יום ${d ? fmtDate(new Date(d.getTime() + days * 86400000)) : "____________"}. תגובתך תצורף לתיק האישי יחד עם מכתב זה.</p>`);
  p.push(`<p>${inputs.consequence === "hearing" ? "אם הבעיה תימשך, תוזמן לשימוע, שבו נשקול את המשך העסקתך, ולאחר שנשמע את טענותיך." : "אם הבעיה תימשך, נשקול צעדים נוספים, לרבות זימון לשימוע."} מכתב זה אינו החלטה על פיטורים.</p>`);
  p.push(`<p>בברכה,<br>${blank(inputs.signer, "________")}, בשם ${blank(inputs.employer_name)}<br>חתימה: __________</p>`);
  p.push(`<p>אישור קבלה (אינו מהווה הסכמה לתוכן): קיבלתי מכתב זה ביום ________. חתימת העובד: __________</p>`, DISCLAIMER, `</div>`);
  return { title: "מכתב התראה לעובד", html: p.join("\n"), warnings };
}
