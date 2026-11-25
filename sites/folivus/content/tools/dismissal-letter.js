// מחולל מכתב פיטורים (הודעה על סיום העסקה) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// תקופות הודעה מוקדמת לפי כל זכות (נבדק 25.11.2026). פיצויים עד 15 ימים; אישור תקופת עבודה 14 ימים (כל זכות).

export const CONFIG = {
  severanceLatestDays: 15, // פיצויים ביום סיום העבודה, לכל המאוחר בתוך 15 ימים
  certificateDays: 14, // אישור על תקופת העבודה בתוך 14 ימים
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

function fullMonths(a, b) {
  let m = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) m -= 1;
  return Math.max(0, m);
}
function addMonths(d, k) {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + k, 1));
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(d.getUTCDate(), last));
  return r;
}
// מחזיר { days } או { month: true } לפי הוותק במועד ההודעה
export function requiredNotice(start, noticeDate, wageType) {
  const m = fullMonths(start, noticeDate);
  if (wageType === "hourly") {
    if (m < 12) return { days: Math.max(1, m) };
    if (m < 24) return { days: 14 + Math.floor((m - 12) / 2) };
    if (m < 36) return { days: 21 + Math.floor((m - 24) / 2) };
    return { month: true };
  }
  if (m >= 12) return { month: true };
  return { days: Math.min(6, m) + Math.max(0, m - 6) * 2.5 };
}

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.employer_name) warnings.push("חסר שם המעסיק.");
  if (!inputs.employee_name) warnings.push("חסר שם העובד.");
  if (!parseDate(inputs.hearing_date)) warnings.push("לא צוין מועד שימוע. לפי הפסיקה, לפני פיטורים יש לערוך לעובד שימוע.");
  const s = parseDate(inputs.start_date), l = parseDate(inputs.letter_date), e = parseDate(inputs.end_date);
  if (!l || !e) warnings.push("חסרים תאריך המכתב או מועד סיום יחסי העבודה.");
  let noticeText = "____________";
  if (s && l && e) {
    const req = requiredNotice(s, l, inputs.wage_type);
    const earliest = req.month ? addMonths(l, 1) : new Date(l.getTime() + Math.ceil(req.days) * 86400000);
    noticeText = req.month ? "חודש" : `${req.days} ימים`;
    if (e < l) warnings.push("מועד הסיום מוקדם ממועד מסירת המכתב.");
    else if (e < earliest && inputs.notice_mode !== "pay") warnings.push(`תקופת ההודעה (עד ${fmtDate(e)}) קצרה מהמינימום לפי הוותק (${noticeText}, כלומר עד ${fmtDate(earliest)} לפחות). האריכו את התקופה או שלמו חלף הודעה מוקדמת.`);
    if (fullMonths(s, e) < 12 && flag(inputs.severance, true)) warnings.push("הוותק עד מועד הסיום קצר משנה. בדרך כלל אין זכאות לפיצויי פיטורים לפני שנת עבודה, למעט חריגים.");
  }
  const eq = lines(inputs.equipment);

  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<p>תאריך: ${heDate(inputs.letter_date)}</p><p>לכבוד<br>${blank(inputs.employee_name)}, ת"ז ${blank(inputs.employee_id)}</p>`);
  p.push(`<h1>הנדון: הודעה על סיום העסקה</h1>`);
  p.push(`<p>1. ${parseDate(inputs.hearing_date) ? `בהמשך לשימוע שנערך לך ביום ${heDate(inputs.hearing_date)}, ולאחר ששקלנו את טענותיך,` : "לאחר ששקלנו את העניין,"} הוחלט לסיים את העסקתך ב${blank(inputs.employer_name)}.${inputs.reasons_summary ? ` תמצית הנימוקים: ${esc(String(inputs.reasons_summary).trim())}.` : ""}</p>`);
  p.push(`<p>2. מכתב זה הוא הודעה מוקדמת לפיטורים. יחסי העבודה יסתיימו ביום ${heDate(inputs.end_date)}. ${inputs.notice_mode === "pay" ? "אנו מוותרים על עבודתך בתקופת ההודעה, ותשולם לך תמורה מלאה בעבורה (חלף הודעה מוקדמת)." : "בתקופת ההודעה תמשיך לעבוד כרגיל."}</p>`);
  p.push(`<p>3. בגמר החשבון ישולמו לך: שכר עד מועד הסיום, פדיון ימי חופשה שנצברו, דמי הבראה לפי הדין${flag(inputs.severance, true) ? `, ופיצויי פיטורים${isTrue(inputs.section14) ? " באמצעות שחרור הכספים שהופקדו בקופה לפי הסדר סעיף 14, וככל שיידרש השלמה" : ""}` : ""}. התשלומים ישולמו ביום סיום העבודה, ולכל המאוחר בתוך ${CONFIG.severanceLatestDays} ימים ממנו, ואינם מותנים בחתימה על מסמך כלשהו.</p>`);
  p.push(`<p>4. נמסור לך אישור על תקופת העבודה בתוך ${CONFIG.certificateDays} ימים מסיום העבודה${flag(inputs.severance, true) ? ", וכן את המסמכים הנדרשים לשחרור כספי הפיצויים והפנסיה מהקופה" : ""}.</p>`);
  if (eq.length) p.push(`<p>5. נבקש להחזיר עד יום סיום העבודה את הציוד הבא:</p>${ul(eq)}`);
  p.push(`<p>אנו מודים לך על עבודתך ומאחלים לך הצלחה בהמשך.</p><p>בברכה,<br>${blank(inputs.employer_name)}<br>חתימה: __________</p>`);
  p.push(`<p>אישור קבלה: קיבלתי מכתב זה ביום ________. חתימת העובד: __________</p>`, DISCLAIMER, `</div>`);
  return { title: "הודעה על סיום העסקה", html: p.join("\n"), warnings };
}
