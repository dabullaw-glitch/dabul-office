// מחולל מכתב התפטרות - פוליבוס. מודול טהור, ללא תלויות וללא רשת.

export const CONFIG = {};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");

const REASONS = {
  none: "",
  worsening: "ההתפטרות נובעת מהרעה מוחשית בתנאי העבודה שלי, כפי שפירטתי בפנייתי הקודמת מיום {prev}, ולא תוקנה. לכן אני רואה בהתפטרותי התפטרות בנסיבות שבהן רואים אותה כפיטורים לעניין פיצויי פיטורים.",
  health: "ההתפטרות נובעת ממצב בריאותי שלי (או של בן משפחה), שאינו מאפשר לי להמשיך בעבודה. אישורים רפואיים מצורפים. לכן אני רואה בהתפטרותי התפטרות בנסיבות שבהן רואים אותה כפיטורים לעניין פיצויי פיטורים.",
  relocation: "ההתפטרות נובעת מהעתקת מקום מגוריי בנסיבות שבהן החוק מכיר בזכאות לפיצויי פיטורים. לכן אני רואה בהתפטרותי התפטרות בנסיבות שבהן רואים אותה כפיטורים לעניין פיצויי פיטורים.",
};

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.employee_name) warnings.push("חסר שם העובד.");
  if (!inputs.employer_name) warnings.push("חסר שם המעסיק.");
  if (!inputs.last_day) warnings.push("חסר יום העבודה האחרון. חשבו אותו לפי תקופת ההודעה המוקדמת.");
  const reason = REASONS[inputs.reason] !== undefined ? inputs.reason : "none";
  if (reason === "worsening" && !inputs.previous_notice_date) warnings.push("בהתפטרות בשל הרעה מוחשית מומלץ להתריע קודם בפני המעסיק ולתת לו הזדמנות לתקן. ציינו את תאריך הפנייה הקודמת.");
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;
  const reasonText = reason === "none" ? "" : p(REASONS[reason].replace("{prev}", date(inputs.previous_notice_date)));

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.employer_name)}<br>${inputs.manager_name ? `לידי ${esc(inputs.manager_name)}<br>` : ""}${val(inputs.employer_address)}</p>
<h1>הנדון: הודעה על התפטרות</h1>
${p(`אני מועסק/ת אצלכם בתפקיד ${val(inputs.position)} החל מיום ${date(inputs.start_date)}.`)}
${p(`הריני להודיע על התפטרותי מהעבודה. הודעה זו מהווה הודעה מוקדמת כדין, ויום העבודה האחרון שלי יהיה ${date(inputs.last_day)}.`)}
${reasonText}
${p("אבקש לקבל במועד את כל התשלומים המגיעים לי בסיום העבודה, ובהם השכר עד יום העבודה האחרון, פדיון ימי החופשה שלא נוצלו, דמי הבראה שטרם שולמו וכל תשלום אחר שמגיע לי לפי דין, הסכם או נוהג.")}
${p("אבקש לשחרר לטובתי את הכספים שנצברו בקרן הפנסיה ובקופות הגמל על שמי, ולמסור לי את המסמכים הנדרשים לכך, וכן טופס 161 אם נדרש, מכתב אישור העסקה (תעודת סיום עבודה) ותלוש שכר אחרון.")}
${p("אדאג להעביר את התפקיד באופן מסודר ולהחזיר את הציוד שבידי עד יום העבודה האחרון.")}
${inputs.thanks === false || inputs.thanks === "false" ? "" : p("תודה על תקופת העבודה המשותפת.")}
<p>בכבוד רב,<br>${val(inputs.employee_name)}<br>ת"ז ${val(inputs.employee_id)}<br>${val(inputs.employee_phone)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי ואינה מחליפה התייעצות עם עורך דין לדיני עבודה.</em></p>
</div>`;
  warnings.push("בדקו את תקופת ההודעה המוקדמת לפי הוותק שלכם, כדי שלא יקוזז מכם סכום בגמר החשבון.");
  if (reason !== "none") warnings.push("הזכאות לפיצויים בהתפטרות תלויה בנסיבות ובתנאים שבחוק ובפסיקה. מומלץ להתייעץ עם עורך דין לפני שליחת המכתב.");
  return { title: "מכתב התפטרות", html, warnings };
}
