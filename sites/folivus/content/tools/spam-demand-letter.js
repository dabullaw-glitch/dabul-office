// מחולל מכתב דרישה בגין הודעות פרסומת (ספאם) לפי סעיף 30א לחוק התקשורת - פוליבוס. מודול טהור.

export const CONFIG = {
  maxPerMessage: 1000, // פיצוי ללא הוכחת נזק, עד 1,000 ₪ לכל דבר פרסומת (סעיף 30א(י))
  defaultDeadlineDays: 14,
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const fmt = (n) => Math.round(n).toLocaleString("en-US") + " ₪";
const CHANNELS = { sms: "מסרון (SMS)", email: "דואר אלקטרוני", call: "שיחה ממערכת חיוג אוטומטי", fax: "פקסימיליה" };

export function generate(inputs = {}) {
  const warnings = [];
  const count = Number(inputs.message_count);
  const per = Number(inputs.amount_per_message) > 0 ? Number(inputs.amount_per_message) : CONFIG.maxPerMessage;
  if (!Number.isInteger(count) || count < 1) warnings.push("יש להזין את מספר ההודעות שהתקבלו (מספר שלם).");
  if (per > CONFIG.maxPerMessage) warnings.push(`החוק מאפשר פיצוי ללא הוכחת נזק של עד ${fmt(CONFIG.maxPerMessage)} לכל הודעה. הסכום לכל הודעה הוגבל לתקרה.`);
  const perUsed = Math.min(per, CONFIG.maxPerMessage);
  const total = Number.isInteger(count) && count > 0 ? count * perUsed : 0;
  if (!inputs.sender_company) warnings.push("חסר שם המפרסם (שולח ההודעות).");
  const channel = CHANNELS[inputs.channel] ? inputs.channel : "sms";
  const refused = inputs.refusal_sent === true || inputs.refusal_sent === "true";
  const days = Number(inputs.deadline_days) > 0 ? Math.round(Number(inputs.deadline_days)) : CONFIG.defaultDeadlineDays;
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.sender_company)}<br>${val(inputs.sender_company_address)}</p>
<h1>הנדון: משלוח דברי פרסומת בניגוד לסעיף 30א לחוק התקשורת (בזק ושידורים), התשמ"ב-1982. דרישה לחדול ולפצות</h1>
${p(`בין התאריכים ${date(inputs.first_message_date)} ו-${date(inputs.last_message_date)} שלחתם אליי ${Number.isInteger(count) && count > 0 ? count : "__________"} הודעות פרסומת באמצעות ${CHANNELS[channel]}, אל ${val(inputs.recipient_contact)}.`)}
${p("לא נתתי לכם הסכמה מפורשת מראש ובכתב לקבל דברי פרסומת, כפי שמחייב סעיף 30א(ב) לחוק.")}
${refused ? p(`ביום ${date(inputs.refusal_date)} שלחתי לכם הודעת סירוב לקבלת דברי פרסומת, ואף על פי כן המשכתם לשלוח הודעות.`) : ""}
${inputs.missing_label === true || inputs.missing_label === "true" ? p("ההודעות לא סומנו במילה \"פרסומת\" בתחילתן, ולא כללו דרך פשוטה לסרב לקבלת הודעות נוספות, כנדרש בחוק.") : ""}
${p(`לפי סעיף 30א(י) לחוק, בית המשפט רשאי לפסוק פיצוי שאינו תלוי בנזק, בסכום של עד ${fmt(CONFIG.maxPerMessage)} בשל כל דבר פרסומת שהתקבל בניגוד לחוק.`)}
${p(`לכן אני דורש/ת: (א) להפסיק מיד לשלוח אליי דברי פרסומת ולמחוק את פרטיי מרשימות התפוצה שלכם; (ב) לשלם לי פיצוי בסך ${total > 0 ? fmt(total) : "__________ ₪"} (${Number.isInteger(count) && count > 0 ? count : "__"} הודעות × ${fmt(perUsed)}), בתוך ${days} ימים ממועד קבלת מכתב זה.`)}
${p("אם הדרישה לא תיענה, אשקול להגיש נגדכם תביעה, לרבות בבית המשפט לתביעות קטנות, בלי הודעה נוספת. אין במכתב זה כדי לגרוע מכל זכות או טענה שלי.")}
<p>בכבוד רב,<br>${val(inputs.my_name)}<br>${val(inputs.my_address)}<br>${val(inputs.my_phone)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי ואינה מחליפה התייעצות עם עורך דין.</em></p>
</div>`;
  warnings.push("שמרו צילומי מסך של כל ההודעות עם התאריך והשעה, ואת הודעת הסירוב אם שלחתם.");
  warnings.push("הסכום הוא תקרה. בתי המשפט פוסקים לעיתים קרובות פחות, לפי הנסיבות, למשל אם נשלחה הודעת סירוב ומספר ההודעות.");
  return { title: "מכתב דרישה בגין הודעות ספאם", html, warnings, total_claimed: total };
}
