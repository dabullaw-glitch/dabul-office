// מחולל מכתב דרישה להחזרת פיקדון או ערובה בתום שכירות - פוליבוס

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const money = (n) => (Number(n) > 0 ? Math.round(Number(n)).toLocaleString("he-IL") + " ₪" : "__________ ₪");
const TYPES = {
  deposit: "פיקדון כספי",
  check: "המחאת ביטחון",
  bank_guarantee: "ערבות בנקאית",
  promissory_note: "שטר חוב",
};

export function generate(inputs = {}) {
  const warnings = [];
  const type = TYPES[inputs.security_type] ? inputs.security_type : "deposit";
  if (!inputs.landlord_name) warnings.push("חסר שם המשכיר.");
  if (!inputs.handover_date) warnings.push("חסר מועד החזרת הדירה.");
  if (type === "deposit" && !(Number(inputs.amount) > 0)) warnings.push("חסר סכום הפיקדון.");
  const days = Number(inputs.deadline_days) > 0 ? Math.round(Number(inputs.deadline_days)) : 14;

  const what = type === "deposit"
    ? `את הפיקדון הכספי בסך ${money(inputs.amount)}`
    : `את ${TYPES[type]}${Number(inputs.amount) > 0 ? ` על סך ${money(inputs.amount)}` : ""} שמסרתי לך, או לחלופין לבטל אותה ולאשר זאת בכתב`;

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.landlord_name)}<br>${val(inputs.landlord_address)}</p>
<h1>הנדון: דרישה להשבת ${TYPES[type]} בתום השכירות</h1>
<p>הדירה ברחוב ${val(inputs.property_address)}. הסכם שכירות מיום ${date(inputs.lease_start)}.</p>
<p>1. שכרתי ממך את הדירה שבנדון לתקופה שהסתיימה ביום ${date(inputs.lease_end)}.</p>
<p>2. ביום ${date(inputs.handover_date)} החזרתי לך את החזקה בדירה ואת המפתחות, כשהדירה פנויה ובמצב שבו קיבלתי אותה, למעט בלאי סביר.</p>
${inputs.final_bills_paid === true ? "<p>3. שילמתי את כל החשבונות השוטפים עד מועד הפינוי. אישורים על כך מצורפים למכתב זה.</p>" : "<p>3. אני מתחייב להציג אישורים על תשלום החשבונות השוטפים עד מועד הפינוי, ככל שתבקש.</p>"}
<p>4. חוק השכירות והשאילה, התשל"א-1971 מחייב משכיר להשיב לשוכר את הערובה בתום השכירות, בתוך פרק הזמן שהחוק קובע, אלא אם יש חוב או נזק שהשוכר אחראי להם לפי ההסכם.</p>
<p>5. לכן אבקש שתשיב לי ${what}, בתוך ${days} ימים ממועד קבלת מכתב זה.</p>
${inputs.bank_details ? `<p>6. ניתן להעביר את הכסף לחשבון: ${val(inputs.bank_details)}.</p>` : ""}
<p>${inputs.bank_details ? "7" : "6"}. אם לטענתך קיים חוב או נזק, אבקש לקבל פירוט בכתב של כל רכיב ואסמכתאות לכך, ולהשיב לי בינתיים את היתרה שאינה שנויה במחלוקת.</p>
<p>${inputs.bank_details ? "8" : "7"}. אם לא אקבל מענה, אשקול לפעול למימוש זכויותיי, לרבות בהגשת תביעה לבית המשפט לתביעות קטנות. אין במכתב זה כדי לגרוע מכל זכות או טענה שלי.</p>
<p>בכבוד רב,<br>${val(inputs.tenant_name)}<br>${val(inputs.tenant_address)}<br>${val(inputs.tenant_phone)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי ואינה מחליפה התייעצות עם עורך דין.</em></p>
</div>`;
  return { title: "מכתב דרישה להחזרת פיקדון", html, warnings };
}
