// מחולל מכתב דרישה לקבלן בגין ליקויי בנייה (הודעה על אי התאמה) - פוליבוס

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const lines = (t) => String(t ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const METHOD = { registered: "בדואר רשום", email: "בדואר אלקטרוני", both: "בדואר רשום ובדואר אלקטרוני", hand: "במסירה ביד" };

export function generate(inputs = {}) {
  const warnings = [];
  const defects = lines(inputs.defects);
  if (!defects.length) warnings.push("לא פורטו ליקויים. מכתב בלי פירוט ליקויים חלש מאוד.");
  if (!inputs.seller_name) warnings.push("חסר שם החברה הקבלנית.");
  if (!inputs.buyer_names) warnings.push("חסר שם הרוכשים.");
  const days = Number(inputs.repair_days) > 0 ? Math.round(Number(inputs.repair_days)) : 30;
  const method = METHOD[inputs.send_method] || METHOD.registered;

  const expert = inputs.has_expert_opinion === true
    ? `<p>מצורפת חוות דעת של ${val(inputs.expert_name)} מיום ${date(inputs.expert_date)}, המפרטת את הליקויים ואת אופן תיקונם. חוות הדעת היא חלק בלתי נפרד ממכתב זה.</p>`
    : "";

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>${method}</p>
<p>לכבוד<br>${val(inputs.seller_name)}<br>${val(inputs.seller_address)}</p>
<h1>הנדון: הודעה על אי התאמות (ליקויי בנייה) בדירה ודרישה לתיקונן</h1>
<p>דירה מס' ${val(inputs.apartment_number)} ברחוב ${val(inputs.project_address)}, לפי חוזה מכר מיום ${date(inputs.contract_date)}.</p>
<p>1. אנו, ${val(inputs.buyer_names)}, רוכשי הדירה שבנדון. הדירה נמסרה לנו ביום ${date(inputs.delivery_date)}.</p>
<p>2. בדירה נמצאו אי התאמות (ליקויים) לחוזה, למפרט, לתוכניות, לתקנים ולהוראות הדין, ובהן:</p>
<ol>${defects.map((d) => `<li>${esc(d)}</li>`).join("") || "<li>__________</li>"}</ol>
${expert}
<p>3. מכתב זה מהווה הודעה על אי התאמה לפי חוק המכר (דירות), התשל"ג-1973.</p>
<p>4. נבקש שתיצרו עמנו קשר בתוך ${days} ימים ממועד קבלת מכתב זה, כדי לתאם מועד לבדיקת הליקויים ולתיקונם המלא, באופן מקצועי ובאיכות התואמת את הנדרש.</p>
<p>5. אם הליקויים לא יתוקנו כראוי ובתוך זמן סביר, נשקול לפעול למימוש זכויותינו על פי דין, לרבות תיקון על ידי בעל מקצוע אחר ודרישת עלות התיקון ונזקים נוספים.</p>
<p>6. אין במכתב זה כדי לגרוע מכל טענה או זכות שלנו, לרבות לגבי ליקויים שאינם מפורטים בו או שיתגלו בעתיד.</p>
<p>ליצירת קשר: ${val(inputs.buyer_phone)}, ${val(inputs.buyer_email)}</p>
<p>בכבוד רב,<br>${val(inputs.buyer_names)}<br>${val(inputs.buyer_address)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי. מומלץ להתייעץ עם עורך דין לפני משלוח, במיוחד כשמדובר בליקויים מהותיים או בסכומים גבוהים.</em></p>
</div>`;
  return { title: "מכתב דרישה לקבלן בגין ליקויי בנייה", html, warnings };
}
