// מחולל הודעה לעובד על תנאי העסקה - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק הודעה לעובד: 30 ימים מתחילת העבודה, 7 ימים לקטין; רשימת הפרטים לפי כל זכות (נבדק 25.11.2026).

export const CONFIG = {
  noticeDays: 30, // לא יאוחר מ-30 ימים מתחילת העבודה
  minorNoticeDays: 7, // עובד קטין: 7 ימים
  changeNoticeDays: 30,
  minorChangeNoticeDays: 7,
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

const BASIS = { monthly: "שכר חודשי", hourly: "שכר שעתי", daily: "שכר יומי", piece: "שכר לפי תוצרת" };
const REST = { saturday: "שבת", friday: "שישי", sunday: "ראשון" };

export function generate(inputs = {}) {
  const warnings = [];
  const req = [["employer_name", "שם המעסיק"], ["employee_name", "שם העובד"], ["role", "התפקיד"], ["manager", "הממונה הישיר"], ["workday_hours", "אורך יום או שבוע העבודה"], ["social_benefits", "ההפרשות הסוציאליות"]];
  for (const [k, l] of req) if (!inputs[k]) warnings.push(`חסר פרט שהחוק מחייב: ${l}.`);
  if (!(Number(inputs.wage) > 0)) warnings.push("חסר פרט שהחוק מחייב: השכר.");
  const s = parseDate(inputs.start_date), nd = parseDate(inputs.notice_date);
  if (!s) warnings.push("חסר תאריך תחילת העבודה.");
  const minor = isTrue(inputs.employee_minor);
  const limit = minor ? CONFIG.minorNoticeDays : CONFIG.noticeDays;
  if (s && nd) {
    const diff = Math.round((nd - s) / 86400000);
    if (diff > limit) { warnings.push(`ההודעה נמסרת ${diff} ימים אחרי תחילת העבודה, מעבר למועד שבחוק (${limit} ימים${minor ? " לעובד קטין" : ""}). מסרו אותה מיד.`); }
    if (diff < 0) warnings.push("תאריך המסירה מוקדם מתחילת העבודה. זה מותר, אבל בדקו שהתאריכים נכונים.");
  }
  const fixed = inputs.term_type === "fixed";
  if (fixed && !parseDate(inputs.end_date)) warnings.push("נבחרה תקופה קצובה, אבל לא הוזן מועד הסיום.");
  const comps = lines(inputs.wage_components);

  const row = (k, v) => `<tr><th>${k}</th><td>${v}</td></tr>`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הודעה לעובד על תנאי העסקה</h1>`, `<p>לפי חוק הודעה לעובד. תאריך מסירה: ${heDate(inputs.notice_date)}</p>`);
  p.push(`<table>`);
  p.push(row("המעסיק", `${blank(inputs.employer_name)}, ח.פ./ת"ז ${blank(inputs.employer_id)}, ${blank(inputs.employer_address)}`));
  p.push(row("העובד", `${blank(inputs.employee_name)}, ת"ז ${blank(inputs.employee_id)}, ${blank(inputs.employee_address)}`));
  p.push(row("תאריך תחילת העבודה", heDate(inputs.start_date)));
  p.push(row("תקופת ההעסקה", fixed ? `לתקופה קצובה, עד ${heDate(inputs.end_date)}` : "לתקופה בלתי קצובה"));
  p.push(row("התפקיד העיקרי", blank(inputs.role)));
  p.push(row("הממונה הישיר", blank(inputs.manager)));
  p.push(row("בסיס השכר", BASIS[inputs.wage_basis] || BASIS.monthly));
  p.push(row("השכר", `${money(inputs.wage)} ברוטו${inputs.wage_basis === "hourly" ? " לשעה" : inputs.wage_basis === "daily" ? " ליום" : inputs.wage_basis === "piece" ? " ליחידה" : " לחודש"}`));
  p.push(row("תשלומים נוספים", comps.length ? ul(comps) : "אין"));
  p.push(row("מועד תשלום השכר", blank(inputs.pay_day, "עד ה-9 בחודש שלאחר חודש העבודה")));
  p.push(row("אורך יום או שבוע העבודה הרגיל", blank(inputs.workday_hours)));
  p.push(row("יום המנוחה השבועי", REST[inputs.rest_day] || "שבת"));
  p.push(row("הפרשות סוציאליות והגופים שאליהם הן מועברות", blank(inputs.social_benefits)));
  p.push(row("הסכם קיבוצי", blank(inputs.collective_agreement, "לא חל הסכם קיבוצי לפי ידיעת המעסיק")));
  p.push(`</table>`);
  p.push(`<p>שינוי באחד הפרטים יימסר לעובד בכתב בתוך ${minor ? CONFIG.minorChangeNoticeDays : CONFIG.changeNoticeDays} ימים מהשינוי, אלא אם השינוי נובע משינוי בחוק או מופיע בתלוש השכר.</p>`);
  p.push(`<p>חתימת המעסיק: __________</p><p>אישור העובד על קבלת ההודעה: __________ תאריך: ________</p>`, DISCLAIMER, `</div>`);
  return { title: "הודעה לעובד על תנאי העסקה", html: p.join("\n"), warnings };
}
