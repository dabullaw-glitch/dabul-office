// מחולל מכתב השגה על דחיית תביעת ביטוח - פוליבוס. מודול טהור.

export const CONFIG = {
  paymentDays: 30, // תגמולי ביטוח משולמים תוך 30 ימים מקבלת המידע והמסמכים (חוק חוזה הביטוח)
  limitationYears: 3, // התיישנות תביעה לתגמולי ביטוח (סעיף 31 לחוק חוזה הביטוח)
  defaultDeadlineDays: 30,
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
const money = (n) => (Number(n) > 0 ? Math.round(Number(n)).toLocaleString("en-US") + " ₪" : null);

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.insurer_name) warnings.push("חסר שם חברת הביטוח.");
  if (!inputs.policy_number) warnings.push("חסר מספר הפוליסה.");
  if (!inputs.event_date) warnings.push("חסר מועד האירוע (מקרה הביטוח).");
  const args = lines(inputs.arguments);
  const docs = lines(inputs.attached_documents);
  if (!args.length) warnings.push("כדאי לפרט טענות ענייניות נגד נימוק הדחייה, שורה לכל טענה.");
  const days = Number(inputs.deadline_days) > 0 ? Math.round(Number(inputs.deadline_days)) : CONFIG.defaultDeadlineDays;
  if (inputs.event_date && /^\d{4}-\d{2}-\d{2}$/.test(inputs.event_date)) {
    const [y, m, d] = inputs.event_date.split("-").map(Number);
    const lim = new Date(Date.UTC(y + CONFIG.limitationYears, m - 1, d));
    const ref = inputs.letter_date && /^\d{4}-\d{2}-\d{2}$/.test(inputs.letter_date) ? new Date(inputs.letter_date + "T00:00:00Z") : null;
    const limText = lim.toISOString().slice(0, 10).split("-").reverse().join(".");
    if (ref && (lim - ref) / 86400000 < 120) warnings.push(`תקופת ההתיישנות (3 שנים ממקרה הביטוח) מסתיימת בערך ב-${limText}. מכתב אינו עוצר את ההתיישנות; כדאי לפנות לעורך דין בהקדם.`);
    else warnings.push(`לתשומת לב: תקופת ההתיישנות לתביעת תגמולי ביטוח היא 3 שנים ממקרה הביטוח (בערך עד ${limText}), ובביטוחים מסוימים נקבעו כללים אחרים.`);
  }
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;
  const amount = money(inputs.claimed_amount);

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.insurer_name)}<br>מחלקת תביעות${inputs.insurer_address ? `<br>${esc(inputs.insurer_address)}` : ""}</p>
<h1>הנדון: השגה על דחיית תביעה ובקשה לבחינה מחודשת</h1>
<p>מבוטח: ${val(inputs.insured_name)}, ת"ז ${val(inputs.insured_id)}. פוליסה מס' ${val(inputs.policy_number)}. תביעה מס' ${val(inputs.claim_number)}.</p>
${p(`ביום ${date(inputs.event_date)} אירע מקרה הביטוח: ${val(inputs.event_description)}. הגשתי תביעה ומסרתי את המידע והמסמכים שנדרשו.`)}
${p(`ביום ${date(inputs.rejection_date)} קיבלתי את הודעתכם על דחיית התביעה${inputs.rejection_reason ? `, בנימוק: "${esc(inputs.rejection_reason)}"` : ""}.`)}
${p("אני חולק/ת על הדחייה מהטעמים הבאים:")}
${args.length ? `<ul>${args.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : "<p>__________</p>"}
${docs.length ? p(`מצורפים למכתב זה: ${docs.map(esc).join("; ")}.`) : ""}
${p("לפי חוק חוזה הביטוח, על המבטח לברר את חבותו בהקדם, ותגמולי הביטוח משולמים בתוך 30 ימים מהיום שבו היו בידיו המידע והמסמכים הדרושים לבירור. תגמולים שלא שולמו במועד נושאים הפרשי הצמדה וריבית כדין.")}
${p(`לכן אבקש לבחון מחדש את התביעה ולשלם את תגמולי הביטוח${amount ? ` בסך ${amount}` : ""}, או לחלופין למסור לי בתוך ${days} ימים נימוק מפורט בכתב לכל רכיב שנדחה, כולל הסעיף בפוליסה שעליו אתם נסמכים, והעתק של כל חוות דעת או מסמך ששימשו להחלטה.`)}
${p("אם לא תתקבל תשובה עניינית, אשקול להגיש תלונה ליחידת פניות הציבור ברשות שוק ההון, ביטוח וחיסכון, ולפעול בכל דרך חוקית אחרת. אין במכתב זה כדי לגרוע מכל זכות או טענה שלי.")}
<p>בכבוד רב,<br>${val(inputs.insured_name)}<br>${val(inputs.insured_phone)}<br>${val(inputs.insured_email)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי ואינה מחליפה התייעצות עם עורך דין.</em></p>
</div>`;
  return { title: "השגה על דחיית תביעת ביטוח", html, warnings };
}
