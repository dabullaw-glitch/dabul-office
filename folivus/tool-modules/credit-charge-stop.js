// מחולל הודעה לחברת האשראי על עצירת חיובים עתידיים בעסקה שבוטלה - פוליבוס. מודול טהור.
// לפי חוק כרטיסי חיוב, התשמ"ו-1986 (כפי שמתואר בכל זכות).

export const CONFIG = {
  rechargeNoticeDays: 15, // חיוב מחדש מותר רק בהודעה מנומקת 15 ימים לפחות מראש
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const money = (n) => (Number(n) > 0 ? Math.round(Number(n)).toLocaleString("en-US") + " ₪" : "__________ ₪");

const REASONS = {
  not_supplied: (d) => `המוצר או השירות לא סופקו לי במועד שנקבע בעסקה (${d}).`,
  ceased: () => "בית העסק הפסיק באופן קבוע למכור את המוצר או לתת את השירות.",
  partial: (d) => `המוצר או השירות סופקו באופן חלקי בלבד, והחלק שלא סופק (שהיה אמור להיות מסופק עד ${d}) ניתן להפרדה.`,
};

export function generate(inputs = {}) {
  const warnings = [];
  const reason = REASONS[inputs.reason] ? inputs.reason : "not_supplied";
  if (!inputs.issuer_name) warnings.push("חסר שם חברת כרטיס האשראי או הבנק.");
  if (!inputs.merchant_name) warnings.push("חסר שם בית העסק.");
  if (!inputs.merchant_notice_date) warnings.push("תנאי לעצירת החיובים: קודם להודיע לבית העסק על ביטול העסקה. ציינו מתי הודעתם.");
  const remaining = Number(inputs.remaining_installments);
  if (!(remaining > 0)) warnings.push("עצירה אפשרית רק לתשלומים עתידיים. ציינו כמה תשלומים נותרו.");
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.issuer_name)}<br>מחלקת שירות לקוחות / בירורים</p>
<h1>הנדון: הודעה על ביטול עסקה ובקשה להפסיק חיובים עתידיים</h1>
<p>בעל הכרטיס: ${val(inputs.cardholder_name)}, ת"ז ${val(inputs.cardholder_id)}, כרטיס המסתיים בספרות ${val(inputs.card_last4)}.</p>
${p(`ביום ${date(inputs.transaction_date)} ביצעתי עסקה עם ${val(inputs.merchant_name)} בסך ${money(inputs.amount)}, ב-${Number(inputs.total_installments) > 0 ? Math.round(Number(inputs.total_installments)) : "__"} תשלומים${inputs.description ? `, עבור ${esc(inputs.description)}` : ""}.`)}
${p(REASONS[reason](date(inputs.supply_date)))}
${p(`ביום ${date(inputs.merchant_notice_date)} הודעתי לבית העסק על ביטול העסקה${inputs.merchant_notice_method ? ` (${esc(inputs.merchant_notice_method)})` : ""}. העתק ההודעה מצורף.`)}
${p(`לכן אבקש להפסיק מיד את החיוב בתשלומים העתידיים בגין העסקה${remaining > 0 ? ` (${Math.round(remaining)} תשלומים שנותרו)` : ""}${reason === "partial" ? ", ביחס לחלק שלא סופק" : ""}.`)}
${p(`ידוע לי כי אם יתברר שהתמורה סופקה או שהעסקה לא בוטלה, תהיו רשאים לחייב אותי שוב, ובלבד שתשלחו לי הודעה מנומקת לפחות ${CONFIG.rechargeNoticeDays} ימים לפני החיוב, ולפי בקשתי גם העתקי מסמכים רלוונטיים.`)}
${p("את הסכומים שכבר שולמו אדרוש מבית העסק עצמו.")}
<p>בכבוד רב,<br>${val(inputs.cardholder_name)}<br>${val(inputs.cardholder_phone)}</p>
<p>חתימה: __________________</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי.</em></p>
</div>`;
  warnings.push("שמרו העתק של ההודעה לבית העסק ושל ההודעה לחברת האשראי, עם אישור משלוח.");
  warnings.push("חברת האשראי מפסיקה רק חיובים עתידיים. כספים ששולמו נדרשים מבית העסק, ואם צריך, בתביעה קטנה.");
  return { title: "הודעה על עצירת חיובים בכרטיס אשראי", html, warnings };
}
