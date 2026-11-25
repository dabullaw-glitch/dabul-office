// מחולל בקשה להישפט או בקשה לביטול על הודעת תשלום קנס תעבורה (משטרה) - פוליבוס. מודול טהור.

export const CONFIG = {
  trialRequestDays: 90, // מיום המצאת הודעת תשלום הקנס
  cancellationRequestDays: 30, // מיום המצאת הודעת תשלום הקנס
  trialAfterRejectionDays: 30, // מיום המצאת ספח בקשה להישפט אחרי דחיית בקשת ביטול
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const parse = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00Z") : null);
const he = (d) => (d ? d.toISOString().slice(0, 10).split("-").reverse().join(".") : "__________");
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);

export function generate(inputs = {}) {
  const warnings = [];
  const type = inputs.request_type === "cancellation" ? "cancellation" : "trial";
  const served = parse(inputs.served_date);
  const today = parse(inputs.letter_date);
  if (!inputs.ticket_number) warnings.push("חסר מספר הודעת תשלום הקנס (הדוח).");
  if (!served) warnings.push("חסר המועד שבו קיבלתם את הדוח. ממנו נספרים המועדים.");
  const deadlineDays = type === "trial" ? CONFIG.trialRequestDays : CONFIG.cancellationRequestDays;
  const deadline = served ? addDays(served, deadlineDays) : null;
  if (deadline && today && today > deadline) warnings.push(`המועד להגשת ${type === "trial" ? "בקשה להישפט" : "בקשת ביטול"} (${deadlineDays} ימים) חלף ב-${he(deadline)}. יש לצרף בקשה להארכת מועד עם נימוק ותצהיר.`);
  if (type === "cancellation") warnings.push(`אם בקשת הביטול תידחה, תוכלו לבקש להישפט בתוך ${CONFIG.trialAfterRejectionDays} ימים מקבלת ההחלטה והספח.`);
  const args = lines(inputs.arguments);
  if (!args.length) warnings.push(type === "trial" ? "בבקשה להישפט אין חובה לנמק, אבל אפשר לציין את עיקרי הטענות." : "בבקשת ביטול חשוב לנמק ולצרף מסמכים שמאמתים את הטענות.");
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;

  const head = type === "trial" ? "בקשה להישפט" : "בקשה לביטול הודעת תשלום קנס";
  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${he(today)}</p>
<p>לכבוד<br>${type === "trial" ? "מרכז פניות נהגים, משטרת ישראל" : "התובע המוסמך, משטרת ישראל"}</p>
<h1>הנדון: ${head}. הודעת תשלום קנס מס' ${val(inputs.ticket_number)}</h1>
<p>שם: ${val(inputs.full_name)}, ת"ז ${val(inputs.id_number)}, כתובת: ${val(inputs.address)}, טלפון: ${val(inputs.phone)}.</p>
${p(`ביום ${he(parse(inputs.offense_date))} נמסרה לי הודעת תשלום קנס בגין: ${val(inputs.offense_description)}${inputs.vehicle_number ? `, רכב מס' ${esc(inputs.vehicle_number)}` : ""}. ההודעה הומצאה לי ביום ${he(served)}.`)}
${type === "trial"
    ? p("הריני מודיע/ה כי אני מבקש/ת להישפט על העבירה המיוחסת לי, ולא לשלם את הקנס. אבקש לזמן אותי לדיון בבית המשפט לתעבורה לכתובת שלעיל.")
    : p("אני מבקש/ת לבטל את הודעת תשלום הקנס, מהנימוקים שלהלן:")}
${args.length ? `<ul>${args.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
${lines(inputs.attachments).length ? p(`מצורפים: ${lines(inputs.attachments).map(esc).join("; ")}.`) : ""}
${type === "cancellation" ? p("אם הבקשה לא תתקבל, אבקש לקבל החלטה מנומקת ואת ספח הבקשה להישפט.") : ""}
<p>בכבוד רב,<br>${val(inputs.full_name)}</p>
<p>חתימה: __________________</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי.</em></p>
</div>`;
  warnings.push("אפשר להגיש את הבקשה באתר המשטרה או בדואר רשום. שמרו אישור הגשה.");
  warnings.push("בבקשה להישפט הדיון מתקיים בבית המשפט לתעבורה, ובית המשפט רשאי להטיל עונש שונה מהקנס, כולל נקודות או פסילה בעבירות מסוימות. כדאי להתייעץ עם עורך דין לתעבורה.");
  return { title: head, html, warnings, deadline: deadline ? deadline.toISOString().slice(0, 10) : null };
}
