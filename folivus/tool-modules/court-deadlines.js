// מחשבון מועדים משפטיים בהליך אזרחי - מודול טהור.
// מבוסס על תקנות סדר הדין האזרחי, התשע"ט-2018. כל הנתונים ב-CONFIG טעונים אימות (ראו todo_verify ב-JSON).

export const CONFIG = {
  verified: false,
  events: {
    defense: { days: 60, label: "הגשת כתב הגנה (מיום המצאת כתב התביעה)" },
    appeal_judgment: { days: 60, label: "ערעור על פסק דין (מיום מתן פסק הדין או המצאתו)" },
    leave_to_appeal: { days: 30, label: "בקשת רשות ערעור על החלטה אחרת (מיום מתן ההחלטה)" },
    set_aside_default: { days: 30, label: "בקשה לביטול פסק דין שניתן בהיעדר הגנה (מיום ההמצאה)" },
    custom: { days: null, label: "מועד אחר בימים (לפי מה שנקבע בהחלטה או בדין)" },
  },
  // פגרת הקיץ בבתי המשפט: 16 ביולי עד 31 באוגוסט (חודש מבוסס 0)
  summerRecess: { from: [6, 16], to: [7, 31] },
  closedWeekdays: [5, 6], // שישי ושבת
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

function inSummerRecess(d) {
  const y = d.getUTCFullYear();
  const from = Date.UTC(y, CONFIG.summerRecess.from[0], CONFIG.summerRecess.from[1]);
  const to = Date.UTC(y, CONFIG.summerRecess.to[0], CONFIG.summerRecess.to[1]);
  return d.getTime() >= from && d.getTime() <= to;
}

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
  if (!Number.isInteger(extraRecess) || extraRecess < 0 || extraRecess > 60) errors.push("ימי פגרה נוספים צריכים להיות מספר שלם בין 0 ל-60.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  steps.push(`${ev.label}: ${days} ימים. הספירה מתחילה ביום שאחרי ${heDate(start)}.`);

  let d = start;
  let counted = 0;
  let skipped = 0;
  while (counted < days) {
    d = addDays(d, 1);
    if (excludeRecess && inSummerRecess(d)) { skipped++; continue; }
    counted++;
  }
  if (excludeRecess) steps.push(skipped ? `${skipped} ימים של פגרת הקיץ (16.7 עד 31.8) לא נספרו.` : "תקופת הספירה אינה חלה על פגרת הקיץ.");
  else steps.push("בחרתם לא לנכות ימי פגרה (למשל בהליך דחוף או כשבית המשפט הורה אחרת).");

  if (extraRecess > 0) {
    let added = 0;
    while (added < extraRecess) {
      d = addDays(d, 1);
      if (excludeRecess && inSummerRecess(d)) continue;
      added++;
    }
    steps.push(`נוספו ${extraRecess} ימי פגרה של חגים (פסח או סוכות) שהזנתם ידנית.`);
  }

  const raw = d;
  let moved = 0;
  while (CONFIG.closedWeekdays.includes(d.getUTCDay())) { d = addDays(d, 1); moved++; }
  if (moved) steps.push(`המועד נפל ביום ${DAYS[raw.getUTCDay()]} (${heDate(raw)}), ולכן נדחה ליום העבודה הבא: ${heDate(d)}.`);
  steps.push(`המועד האחרון המשוער: יום ${DAYS[d.getUTCDay()]}, ${heDate(d)}. חגים ומועדי ישראל לא נבדקים אוטומטית. אם המועד חל בחג, בדקו את הדחייה.`);
  steps.push("בית המשפט רשאי להאריך או לקצר מועדים, ומועד שנקבע בהחלטה גובר על החישוב הכללי.");

  return {
    outputs: {
      deadline_date: iso(d),
      deadline_display: `${DAYS[d.getUTCDay()]}, ${heDate(d)}`,
      days_counted: days,
      recess_days_skipped: skipped + extraRecess,
    },
    steps,
  };
}
