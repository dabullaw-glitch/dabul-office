// מחשבון מועדים משפטיים בהליך אזרחי - מודול טהור.
// מבוסס על תקנות סדר הדין האזרחי, התשע"ט-2018. מספרי הימים אומתו ב-25.11.2026 (ראו sources ב-JSON):
// מועד שחל בשבת עובר ליום שאחריו לפי סעיף 10(ג) לחוק הפרשנות, התשמ"א-1981; יום שישי אינו נדחה.
// כתב הגנה 60 ימים (תקנה 9(ב)); ערעור ובקשת רשות ערעור 60 ימים מהמצאת ההחלטה (תקנה 137(א), שאלות ותשובות של הנהלת בתי המשפט);
// ביטול החלטה שניתנה במעמד צד אחד 30 ימים מההמצאה (תקנה 131).
// תאריכי הפגרות לא אומתו, ולכן המחשבון אינו קובע אותם בעצמו: המשתמש מזין את מספר ימי הפגרה שבתוך התקופה.

export const CONFIG = {
  verified: true,
  verifiedOn: "2026-11-25",
  events: {
    defense: { days: 60, label: "הגשת כתב הגנה בתביעה רגילה (מיום המצאת כתב התביעה)" },
    appeal_judgment: { days: 60, label: "ערעור על פסק דין (מיום המצאת פסק הדין)" },
    leave_to_appeal: { days: 60, label: "בקשת רשות ערעור על החלטה אחרת (מיום המצאת ההחלטה)" },
    set_aside_default: { days: 30, label: "בקשה לביטול פסק דין שניתן במעמד צד אחד (מיום המצאתו)" },
    custom: { days: null, label: "מועד אחר בימים (לפי מה שנקבע בהחלטה או בדין)" },
  },
  // חוק הפרשנות, סעיף 10(ג): ימי מנוחה נספרים, אלא אם הם הימים האחרונים בתקופה. יום שישי אינו יום מנוחה לפי חיקוק.
  closedWeekdays: [6], // שבת
};

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const iso = (d) => d.toISOString().slice(0, 10);
const heDate = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);
const DAYS = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

export function compute(inputs = {}) {
  const errors = [];
  const type = inputs.event_type || "defense";
  const start = parseDate(inputs.start_date);
  const excludeRecess = inputs.exclude_recess === undefined ? true : inputs.exclude_recess === true || inputs.exclude_recess === "true";
  const extraRecess = inputs.extra_recess_days === undefined || inputs.extra_recess_days === "" ? 0 : Number(inputs.extra_recess_days);
  const ev = CONFIG.events[type];
  if (!ev) errors.push("סוג מועד לא מוכר.");
  if (!start) errors.push("יש להזין תאריך התחלה תקין (המצאה או מתן ההחלטה).");
  let days = ev ? ev.days : null;
  if (type === "custom") {
    days = Number(inputs.custom_days);
    if (!Number.isInteger(days) || days < 1 || days > 365) errors.push("יש להזין מספר ימים שלם בין 1 ל-365.");
  }
  if (!Number.isInteger(extraRecess) || extraRecess < 0 || extraRecess > 90) errors.push("ימי פגרה צריכים להיות מספר שלם בין 0 ל-90.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  steps.push(`${ev.label}: ${days} ימים. הספירה מתחילה ביום שאחרי ${heDate(start)}.`);
  if (type === "defense") steps.push("במסלולים מיוחדים המועד שונה: בדיון מהיר 45 ימים, בתביעה לפינוי מושכר 30 ימים ובתביעת רשלנות רפואית 120 ימים. במקרים אלה בחרו \"מספר ימים אחר\".");
  if (type === "appeal_judgment" || type === "leave_to_appeal") steps.push("בבית משפט לענייני משפחה, בבית הדין לעבודה, בעניינים מינהליים ובתביעות קטנות נקבעו מועדי ערעור אחרים. בדקו את הכללים של אותה ערכאה.");

  let d = addDays(start, days);
  const recess = excludeRecess ? extraRecess : 0;
  if (recess > 0) {
    d = addDays(d, recess);
    steps.push(`נוספו ${recess} ימי פגרה שהזנתם, כי ימי פגרה אינם באים במניין מועד שנקבע בתקנות או בהחלטת בית משפט.`);
  } else if (excludeRecess) {
    steps.push("לא הוזנו ימי פגרה. אם התקופה חופפת לפגרת הקיץ, פסח או סוכות, הזינו את מספר ימי הפגרה לפי לוח הפגרות של הרשות השופטת.");
  } else {
    steps.push("בחרתם לספור גם ימי פגרה (למשל במועד שנקבע בחוק, בהליך דחוף או כשבית המשפט הורה אחרת).");
  }

  const raw = d;
  let moved = 0;
  while (CONFIG.closedWeekdays.includes(d.getUTCDay())) { d = addDays(d, 1); moved++; }
  if (moved) steps.push(`המועד נפל ביום ${DAYS[raw.getUTCDay()]} (${heDate(raw)}). לפי חוק הפרשנות, יום מנוחה שהוא היום האחרון בתקופה אינו נמנה, ולכן המועד עובר ל-${heDate(d)}.`);
  if (d.getUTCDay() === 5) steps.push("המועד חל ביום שישי. יום שישי אינו יום מנוחה לפי חוק הפרשנות, ולכן אין להניח שהמועד נדחה. כדאי להגיש עד יום חמישי או בהגשה מקוונת.");
  steps.push(`המועד האחרון המשוער: יום ${DAYS[d.getUTCDay()]}, ${heDate(d)}. חגים ומועדי ישראל לא נבדקים אוטומטית. אם המועד חל בחג, בדקו את הדחייה.`);
  steps.push("בית המשפט רשאי להאריך או לקצר מועדים, ומועד שנקבע בהחלטה גובר על החישוב הכללי.");

  return {
    outputs: {
      deadline_date: iso(d),
      deadline_display: `${DAYS[d.getUTCDay()]}, ${heDate(d)}`,
      days_counted: days,
      recess_days_skipped: recess,
    },
    steps,
  };
}
