// מחולל בקשה לקבלת מידע לפי חוק חופש המידע, התשנ"ח-1998 - פוליבוס. מודול טהור.

export const CONFIG = {
  responseDays: 30, // תשובה בתוך 30 ימים מקבלת הבקשה
  extensionDays: 30, // הארכה אפשרית בהודעה מנומקת
  complexExtensionDays: 60, // הארכה נוספת במידע מורכב או רב היקף
  transferDays: 15, // העברת המידע אחרי החלטה להיענות
  // סכומי האגרות לא אומתו ל-2026, ולכן אינם מוצגים
  fees: null,
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);

const EXEMPT = {
  none: "",
  personal: "המידע המבוקש נוגע לי עצמי, ולכן אבקש פטור מאגרה.",
  nonprofit: "הבקשה מוגשת מטעם עמותה הפועלת למטרה ציבורית, ולכן אבקש פטור מאגרה.",
  research: "המידע מבוקש לצורך מחקר אקדמי, ולכן אבקש פטור מאגרה.",
  allowance: "אני מקבל/ת קצבה, ולכן אבקש פטור מאגרה.",
};

export function generate(inputs = {}) {
  const warnings = [];
  const items = lines(inputs.information_requested);
  if (!inputs.authority_name) warnings.push("חסר שם הרשות הציבורית.");
  if (!items.length) warnings.push("פרטו את המידע המבוקש, שורה לכל פריט. בקשה ממוקדת נענית מהר יותר.");
  if (!inputs.requester_name) warnings.push("חסר שם המבקש.");
  const ex = EXEMPT[inputs.fee_exemption] !== undefined ? inputs.fee_exemption : "none";
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>הממונה על חופש המידע<br>${val(inputs.authority_name)}</p>
<h1>הנדון: בקשה לקבלת מידע לפי חוק חופש המידע, התשנ"ח-1998</h1>
${p(`אני, ${val(inputs.requester_name)}, ת"ז ${val(inputs.requester_id)}, מבקש/ת לקבל מהרשות את המידע הבא:`)}
<ol>${items.length ? items.map((i) => `<li>${esc(i)}</li>`).join("") : "<li>__________</li>"}</ol>
${inputs.period ? p(`המידע מבוקש לתקופה: ${esc(inputs.period)}.`) : ""}
${p(`אבקש לקבל את המידע ${inputs.format === "paper" ? "בהעתק מודפס" : "בעותק אלקטרוני, ככל האפשר בקבצים הניתנים לעיבוד"}, לכתובת: ${val(inputs.delivery_address)}.`)}
${inputs.purpose ? p(`לידיעתכם, המידע נחוץ לי לצורך: ${esc(inputs.purpose)}. החוק אינו מחייב לציין את מטרת הבקשה.`) : ""}
${ex !== "none" ? p(EXEMPT[ex]) : p("אני מתחייב/ת לשאת באגרות לפי תקנות חופש המידע (אגרות), ככל שיחולו.")}
${p("אם חלק מהמידע חסוי, אבקש למסור את יתר המידע, תוך השמטה או השחרה של החלק החסוי בלבד, ולנמק בכתב כל סירוב.")}
${p("אודה לקבלת תשובתכם בהקדם, ולכל המאוחר בתוך 30 ימים כקבוע בחוק.")}
<p>בכבוד רב,<br>${val(inputs.requester_name)}<br>${val(inputs.requester_phone)}<br>${val(inputs.requester_email)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי.</em></p>
</div>`;
  warnings.push("ברוב משרדי הממשלה מגישים בקשה בטופס מקוון באתר השירותים הממשלתי, ושם גם משלמים אגרה אם נדרשת. אפשר להעתיק את הנוסח לטופס.");
  return { title: "בקשה לפי חוק חופש המידע", html, warnings };
}
