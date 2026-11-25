// מחולל בקשה לקבלת העתק רשומה רפואית - פוליבוס. מודול טהור.
// לפי סעיף 18 לחוק זכויות החולה, התשנ"ו-1996.

export const CONFIG = {};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");

const SCOPE = {
  full: "העתק מלא של הרשומה הרפואית שלי",
  period: "העתק הרשומה הרפואית שלי לתקופה המפורטת להלן",
  specific: "המסמכים הרפואיים המפורטים להלן",
};

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.patient_name) warnings.push("חסר שם המטופל.");
  if (!inputs.institution_name) warnings.push("חסר שם המוסד הרפואי או המטפל.");
  const scope = SCOPE[inputs.scope] ? inputs.scope : "full";
  if (scope === "specific" && !inputs.specific_documents) warnings.push("פרטו אילו מסמכים מבוקשים.");
  const rep = inputs.via_representative === true || inputs.via_representative === "true";
  if (rep && !inputs.representative_name) warnings.push("בבקשה באמצעות מיופה כוח יש לציין את שמו ולצרף ייפוי כוח או כתב ויתור על סודיות.");
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.institution_name)}<br>${inputs.department ? `${esc(inputs.department)}<br>` : ""}מחלקת רשומות רפואיות</p>
<h1>הנדון: בקשה לקבלת מידע רפואי מהרשומה הרפואית</h1>
<p>שם המטופל: ${val(inputs.patient_name)}, ת"ז ${val(inputs.patient_id)}, תאריך לידה ${date(inputs.patient_birth_date)}.</p>
${p(`לפי סעיף 18 לחוק זכויות החולה, התשנ"ו-1996, מטופל זכאי לקבל מהמטפל או מהמוסד הרפואי מידע רפואי מהרשומה הרפואית המתייחסת אליו, לרבות העתקה.`)}
${p(`לכן אבקש לקבל ${SCOPE[scope]}${scope === "period" ? `: מיום ${date(inputs.period_from)} עד יום ${date(inputs.period_to)}` : ""}${scope === "specific" ? `: ${val(inputs.specific_documents)}` : ""}, כולל סיכומי ביקור ואשפוז, תוצאות בדיקות, פענוחי הדמיה ומכתבי שחרור, ככל שקיימים.`)}
${p(`אבקש לקבל את המידע ${inputs.delivery === "pickup" ? "באיסוף עצמי, בתיאום מראש" : `בעותק אלקטרוני לכתובת ${val(inputs.delivery_email)}`}.`)}
${rep ? p(`את הבקשה מגיש בשמי ${val(inputs.representative_name)}. ייפוי כוח או כתב ויתור על סודיות מצורף.`) : ""}
${p("ככל שנדרש תשלום עבור ההעתקה, אבקש לקבל הודעה על הסכום מראש.")}
${p("אבקש לקבל את המידע בהקדם. אם הוחלט שלא למסור מידע מסוים, אבקש לקבל הודעה על כך ועל ההליך לפי החוק.")}
<p>בכבוד רב,<br>${val(inputs.patient_name)}<br>${val(inputs.patient_phone)}</p>
<p>חתימה: __________________</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי.</em></p>
</div>`;
  warnings.push("צרפו צילום תעודת זהות. במוסדות רבים יש טופס בקשה משלהם ואפשרות להגיש באתר או באפליקציה.");
  return { title: "בקשה לקבלת רשומה רפואית", html, warnings };
}
