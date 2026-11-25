// מחולל מכתב התראה ודרישה לפני נקיטת הליכים - פוליבוס. מודול טהור.

export const CONFIG = {
  year: 2026,
  smallClaimsCap: 39900, // תקרת תביעה קטנה מ-1.1.2026 (הנהלת בתי המשפט)
  defaultDeadlineDays: 14,
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const money = (n) => (Number(n) > 0 ? Math.round(Number(n)).toLocaleString("en-US") + " ₪" : "__________ ₪");
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.recipient_name) warnings.push("חסר שם הנמען.");
  if (!inputs.sender_name) warnings.push("חסר שם השולח.");
  const facts = lines(inputs.facts);
  if (!facts.length) warnings.push("כדאי לפרט את העובדות בקצרה, שורה לכל עובדה.");
  const kind = inputs.demand_type || "payment";
  const amount = Number(inputs.amount);
  if (kind === "payment" && !(amount > 0)) warnings.push("בדרישה לתשלום חסר סכום.");
  const days = Number(inputs.deadline_days) > 0 ? Math.round(Number(inputs.deadline_days)) : CONFIG.defaultDeadlineDays;
  const small = kind === "payment" && amount > 0 && amount <= CONFIG.smallClaimsCap;
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;
  const demand = kind === "payment"
    ? `לשלם לי סך ${money(amount)}${inputs.payment_details ? `, בהעברה לחשבון: ${esc(inputs.payment_details)}` : ""}`
    : esc(inputs.action_demanded || "__________");

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.recipient_name)}<br>${val(inputs.recipient_address)}</p>
<p><strong>בדואר רשום${inputs.also_email ? " ובדואר אלקטרוני" : ""}</strong></p>
<h1>הנדון: ${val(inputs.subject)}. מכתב התראה לפני נקיטת הליכים משפטיים</h1>
${facts.length ? facts.map((f) => p(esc(f))).join("\n") : p("__________")}
${p(`לאור האמור, אני דורש/ת ממך ${demand}, וזאת בתוך ${days} ימים ממועד קבלת מכתב זה.`)}
${p(`אם הדרישה לא תיענה במועד, אשקול לפעול למימוש זכויותיי בכל דרך חוקית${small ? ", לרבות הגשת תביעה לבית המשפט לתביעות קטנות" : ", לרבות פנייה לערכאות"}, ולדרוש גם את ההוצאות שייגרמו לי, ריבית והצמדה כדין.`)}
${p("אני מוכן/ה לשמוע את עמדתך ולנסות להגיע להסדר מוסכם, בתנאי שהפנייה תגיע אליי בתוך המועד האמור.")}
${p("אין במכתב זה כדי לגרוע מכל זכות או טענה שלי, והוא נשלח מבלי לפגוע בהן.")}
<p>בכבוד רב,<br>${val(inputs.sender_name)}<br>${val(inputs.sender_address)}<br>${val(inputs.sender_phone)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי ואינה מחליפה התייעצות עם עורך דין.</em></p>
</div>`;
  warnings.push("שמרו העתק של המכתב ואישור משלוח (דואר רשום או אישור קריאה). הם יעזרו אם תגישו תביעה.");
  if (kind === "payment" && amount > CONFIG.smallClaimsCap) warnings.push(`הסכום גבוה מתקרת התביעה הקטנה (${CONFIG.smallClaimsCap.toLocaleString("en-US")} ₪ ב-${CONFIG.year}). תביעה כזו מוגשת בהליך רגיל, ומומלץ להיעזר בעורך דין.`);
  return { title: "מכתב התראה ודרישה", html, warnings };
}
