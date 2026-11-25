// מחולל כתב ערבות לשכירות דירה - פוליבוס
// טיוטה כללית עם תקרת סכום מפורשת, כדי שהערב ידע מה היקף ההתחייבות שלו.

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const money = (n) => (Number(n) > 0 ? Math.round(Number(n)).toLocaleString("he-IL") + " ₪" : "__________ ₪");

export function generate(inputs = {}) {
  const warnings = [];
  if (!(Number(inputs.max_amount) > 0)) warnings.push("לא הוזן סכום מרבי לערבות. מומלץ מאוד לקבוע תקרה.");
  if (!inputs.guarantor_name) warnings.push("חסר שם הערב.");
  if (!inputs.tenant_name) warnings.push("חסר שם השוכר.");

  const covers = [];
  if (inputs.covers_rent !== false) covers.push("דמי שכירות שלא שולמו");
  if (inputs.covers_bills !== false) covers.push("תשלומים שוטפים שהשוכר התחייב לשלם (ארנונה, מים, חשמל, גז וועד בית)");
  if (inputs.covers_damage !== false) covers.push("נזק למושכר שהשוכר אחראי לו, למעט בלאי סביר");
  if (inputs.covers_eviction === true) covers.push("דמי שימוש בשל איחור בפינוי המושכר");
  if (!covers.length) warnings.push("לא נבחר אף חיוב שהערבות מכסה.");

  const html = `<div dir="rtl" lang="he">
<h1>כתב ערבות</h1>
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד: ${val(inputs.landlord_name)} (להלן: "המשכיר")</p>
<p>אני החתום מטה, ${val(inputs.guarantor_name)}, ת"ז ${val(inputs.guarantor_id)}, מכתובת ${val(inputs.guarantor_address)}, טלפון ${val(inputs.guarantor_phone)} (להלן: "הערב"), מתחייב בזה כלפי המשכיר כדלקמן:</p>
<h2>1. החיוב הנערב</h2>
<p>אני ערב לקיום התחייבויותיו של ${val(inputs.tenant_name)}, ת"ז ${val(inputs.tenant_id)} (להלן: "השוכר"), לפי הסכם השכירות מיום ${date(inputs.lease_date)} לדירה ברחוב ${val(inputs.property_address)}, לתקופת השכירות שעד יום ${date(inputs.lease_end_date)}.</p>
<h2>2. מה הערבות מכסה</h2>
<ul>${covers.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
<h2>3. סכום מרבי</h2>
<p>אחריותי לפי כתב ערבות זה מוגבלת לסכום כולל שלא יעלה על <strong>${money(inputs.max_amount)}</strong>, כולל כל הוצאה, ריבית והפרשי הצמדה.</p>
<h2>4. הודעה לערב לפני דרישה</h2>
<p>המשכיר יודיע לי בכתב, בתוך זמן סביר, על כל הפרה של השוכר שבגינה הוא מתכוון לפנות אליי, ויפרט את הסכום הנדרש ואת אופן חישובו. דרישת תשלום ממני תישלח רק לאחר שהשוכר לא תיקן את ההפרה בתוך זמן סביר מיום שנדרש לכך.</p>
<h2>5. תוקף</h2>
<p>הערבות בתוקף עד ${date(inputs.valid_until)}, ולגבי חובות שנוצרו עד מועד זה בלבד. ${inputs.covers_option === true ? "הערבות תחול גם על תקופת אופציה שהשוכר יממש, בכפוף לאותו סכום מרבי." : "הערבות לא תחול על הארכה של תקופת השכירות או על שינוי בתנאי ההסכם, אלא אם הסכמתי לכך מראש ובכתב."}</p>
<h2>6. כללי</h2>
<p>קיבלתי עותק של הסכם השכירות וקראתי אותו לפני החתימה על כתב ערבות זה.</p>
<table>
<tr><th>הערב</th><th>עד לחתימה</th></tr>
<tr><td>${val(inputs.guarantor_name)}<br>חתימה: __________</td><td>שם: ${val(inputs.witness_name)}<br>חתימה: __________</td></tr>
</table>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי. ערב מתחייב באופן אישי, ומומלץ להתייעץ עם עורך דין לפני החתימה.</em></p>
</div>`;
  return { title: "כתב ערבות לשכירות דירה", html, warnings };
}
