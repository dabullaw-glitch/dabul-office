// מחולל בקשה לביטול דוח חניה של רשות מקומית - פוליבוס. מודול טהור.
// לפי סעיף 229 לחוק סדר הדין הפלילי [נוסח משולב], התשמ"ב-1982.

export const CONFIG = {
  cancellationRequestDays: 30, // בקשה לביטול לתובע העירוני, מיום ההמצאה
  trialRequestDays: 90, // בקשה להישפט, מיום ההמצאה
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const parse = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + "T00:00:00Z") : null);
const he = (d) => (d ? d.toISOString().slice(0, 10).split("-").reverse().join(".") : "__________");
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);

const GROUNDS = {
  paid: "החניה שולמה כדין באמצעות אפליקציה או מכשיר תשלום, ואישור התשלום מצורף.",
  no_sign: "במקום לא היה שילוט או סימון ברור שאוסר או מגביל את החניה, או שהשילוט היה מוסתר או פגום. תמונות מצורפות.",
  emergency: "החניה נעשתה בנסיבות של מצב חירום רפואי או אחר, שלא הותיר לי ברירה. מסמכים מצורפים.",
  disabled: "לרכב יש תג נכה בתוקף, והחניה הייתה מותרת לי. צילום התג מצורף.",
  not_me: "הרכב לא היה בשימושי במועד העבירה. פרטי האדם שנהג ברכב מצורפים.",
  wrong_details: "בדוח נפלו טעויות מהותיות בפרטי הרכב, המקום או המועד.",
  other: "",
};

export function generate(inputs = {}) {
  const warnings = [];
  const served = parse(inputs.served_date);
  const today = parse(inputs.letter_date);
  if (!inputs.ticket_number) warnings.push("חסר מספר הדוח.");
  if (!inputs.municipality) warnings.push("חסר שם הרשות המקומית.");
  if (!served) warnings.push("חסר המועד שבו קיבלתם את הדוח.");
  const deadline = served ? addDays(served, CONFIG.cancellationRequestDays) : null;
  const trialDeadline = served ? addDays(served, CONFIG.trialRequestDays) : null;
  if (deadline && today && today > deadline) warnings.push(`המועד להגשת בקשת ביטול (${CONFIG.cancellationRequestDays} ימים מההמצאה) חלף ב-${he(deadline)}. בבקשה באיחור יש לפרט את סיבת האיחור ולצרף מסמכים.`);
  if (trialDeadline) warnings.push(`המועד האחרון לבקשה להישפט: ${he(trialDeadline)} (${CONFIG.trialRequestDays} ימים מההמצאה).`);
  let grounds = Array.isArray(inputs.grounds) ? inputs.grounds : typeof inputs.grounds === "string" && inputs.grounds ? inputs.grounds.split(",") : [];
  grounds = grounds.map((g) => g.trim()).filter((g) => GROUNDS[g] !== undefined);
  const extra = lines(inputs.arguments);
  if (!grounds.length && !extra.length) warnings.push("בחרו לפחות נימוק אחד או כתבו טענה משלכם.");
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${he(today)}</p>
<p>לכבוד<br>התובע העירוני / המחלקה לביטול דוחות<br>${val(inputs.municipality)}</p>
<h1>הנדון: בקשה לביטול הודעת תשלום קנס (דוח חניה) מס' ${val(inputs.ticket_number)}</h1>
<p>שם: ${val(inputs.full_name)}, ת"ז ${val(inputs.id_number)}, רכב מס' ${val(inputs.vehicle_number)}, כתובת: ${val(inputs.address)}, טלפון: ${val(inputs.phone)}.</p>
${p(`ביום ${he(parse(inputs.offense_date))} ניתן לרכבי דוח חניה ב${val(inputs.location)}. הדוח הומצא לי ביום ${he(served)}.`)}
${p("אני מבקש/ת לבטל את הדוח מהנימוקים הבאים:")}
<ul>${grounds.filter((g) => g !== "other").map((g) => `<li>${GROUNDS[g]}</li>`).join("")}${extra.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>
${p("לפי סעיף 229 לחוק סדר הדין הפלילי, תובע רשאי לבטל הודעת תשלום קנס אם נוכח שלא נעברה עבירה, שהעבירה נעברה בידי אחר, או שאין עניין לציבור בהמשך ההליכים.")}
${lines(inputs.attachments).length ? p(`מצורפים: ${lines(inputs.attachments).map(esc).join("; ")}.`) : ""}
${p("אם הבקשה לא תתקבל, אבקש לקבל החלטה מנומקת ולשמור על זכותי להגיש בקשה להישפט.")}
<p>בכבוד רב,<br>${val(inputs.full_name)}</p>
<p>חתימה: __________________</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי.</em></p>
</div>`;
  warnings.push("ברוב הרשויות אפשר להגיש את הבקשה באתר הרשות. צרפו תמונות, קבלות ואישורים, ושמרו אישור הגשה.");
  return { title: "בקשה לביטול דוח חניה", html, warnings, deadline: deadline ? deadline.toISOString().slice(0, 10) : null };
}
