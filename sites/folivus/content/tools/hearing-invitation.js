// מחולל זימון לשימוע לפני פיטורים - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// דרישות השימוע לפי פסיקה כפי שסוכמה בכל זכות (נבדק 25.11.2026): זימון בכתב, זמן סביר, פירוט אירועים ומועדים, ייצוג, פרוטוקול.

export const CONFIG = {
  doubtfulHours: 24, // בית הדין הביע ספק אם פחות מ-24 שעות מספיקות (כל זכות)
  recommendedDays: 3, // המלצה כללית של הכלי, לא כלל משפטי
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

const CONSIDERED = { dismissal: "סיום העסקתך", terms: "שינוי מהותי בתנאי העסקתך", disciplinary: "נקיטת צעד משמעתי" };

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.employer_name) warnings.push("חסר שם המעסיק.");
  if (!inputs.employee_name) warnings.push("חסר שם העובד.");
  const reasons = lines(inputs.reasons);
  if (!reasons.length) warnings.push("לא פורטו הטענות. יש לפרט את הנימוקים המלאים, עם אירועים ומועדים.");
  else if (reasons.some((r) => !/\d/.test(r))) warnings.push("בחלק מהטענות אין תאריך. טענות כלליות אינן מספיקות; ציינו אירועים מסוימים ומועדיהם.");
  const l = parseDate(inputs.letter_date), h = parseDate(inputs.hearing_date);
  if (!l || !h) warnings.push("חסרים תאריך מסירת הזימון או תאריך השימוע.");
  if (l && h) {
    const tm = String(inputs.hearing_time || "").match(/^(\d{1,2}):(\d{2})$/);
    const hearingMs = h.getTime() + (tm ? (Number(tm[1]) * 60 + Number(tm[2])) * 60000 : 9 * 3600000);
    const hours = (hearingMs - (l.getTime() + 17 * 3600000)) / 3600000; // הנחה: הזימון נמסר עד 17:00
    if (h < l) warnings.push("מועד השימוע מוקדם ממועד מסירת הזימון.");
    else if (hours < CONFIG.doubtfulHours) warnings.push(`בין מסירת הזימון לשימוע יש פחות מ-${CONFIG.doubtfulHours} שעות. בית הדין לעבודה הביע ספק אם זמן כזה מספיק להתכונן. קבעו מועד מאוחר יותר.`);
    else if ((h - l) / 86400000 < CONFIG.recommendedDays) warnings.push(`בין מסירת הזימון לשימוע יש פחות מ-${CONFIG.recommendedDays} ימים. שקלו לתת יותר זמן להתכונן, במיוחד כשהטענות מורכבות.`);
  }
  const docs = lines(inputs.documents);

  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<p>תאריך: ${heDate(inputs.letter_date)}</p><p>לכבוד<br>${blank(inputs.employee_name)}${inputs.employee_role ? `, ${esc(String(inputs.employee_role).trim())}` : ""}</p>`);
  p.push(`<h1>הנדון: הזמנה לשימוע</h1>`);
  p.push(`<p>1. ${blank(inputs.employer_name)} שוקלת את האפשרות של ${CONSIDERED[inputs.considered] || CONSIDERED.dismissal}. לפני קבלת החלטה, אנו מזמינים אותך לשימוע, כדי לשמוע את עמדתך.</p>`);
  p.push(`<p>2. השימוע ייערך ביום ${heDate(inputs.hearing_date)}, בשעה ${blank(inputs.hearing_time, "____")}, ב${blank(inputs.hearing_place, "________")}, בפני ${blank(inputs.hearing_by)}.</p>`);
  p.push(`<p>3. אלה הטענות והנימוקים שבגללם נשקלת האפשרות:</p>${reasons.length ? `<ol>${reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ol>` : "<p>____________</p>"}`);
  p.push(`<p>4. ${docs.length ? "המסמכים שעליהם אנו נסמכים מצורפים, או פתוחים לעיונך לפי בקשה לפני השימוע:" : "אם יש מסמכים שעליהם אנו נסמכים, הם יועמדו לעיונך לפי בקשה לפני השימוע."}</p>${docs.length ? ul(docs) : ""}`);
  p.push(`<p>5. אתה רשאי להגיע לשימוע עם מייצג מטעמך, לרבות עורך דין${isTrue(inputs.workers_committee) ? ", וכן לבקש שנציג ועד העובדים ישתתף" : ""}. אתה רשאי גם להגיש את עמדתך בכתב, לפני השימוע או במקומו.</p>`);
  p.push(`<p>6. לא התקבלה כל החלטה. נשקול את דבריך בלב פתוח, וההחלטה תימסר לך בכתב לאחר השימוע.</p>`);
  p.push(`<p>7. השימוע יתועד בפרוטוקול. לאחר שתעיין בו ותאשר את נכונותו, תקבל עותק חתום.</p>`);
  p.push(`<p>8. אם המועד אינו מתאים לך, או שאתה זקוק לזמן נוסף כדי להתכונן, אנא פנה אלינו בהקדם ונתאם מועד אחר.</p>`);
  p.push(`<p>בברכה,<br>${blank(inputs.employer_name)}<br>חתימה: __________</p>`);
  p.push(`<p>אישור קבלה: אני מאשר שקיבלתי זימון זה ביום ________. חתימת העובד: __________</p>`, DISCLAIMER, `</div>`);
  return { title: "הזמנה לשימוע", html: p.join("\n"), warnings };
}
