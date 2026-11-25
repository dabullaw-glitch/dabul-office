// מחשבון פיצוי על איחור במסירת דירה חדשה (סעיף 5א לחוק המכר (דירות), התשל"ג-1973) - פוליבוס
// שני משטרים, לפי מועד חתימת החוזה:
//  after_2022: חוזה שנחתם אחרי כניסת התיקון של 2022 לתוקף (יולי 2022):
//    איחור של חודש לפחות. חודשים 1 עד 4: 100% מדמי שכירות של דירה דומה; חודשים 5 עד 10: 125%; מהחודש ה-11: 150%.
//  before_2022: חוזה שנחתם לפני כן: איחור של יותר מ-60 ימים. עד 8 חודשים: 150%; מעבר לכך: 125%.
// לבדיקה מול נוסח החוק הרשמי לפני פרסום (ראו todo_verify בקובץ ה-JSON).

const DAY = 86400000;
const MONTH_DAYS = 365.25 / 12;
const parse = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
};
const addMonths = (t, m) => {
  const d = new Date(t);
  const day = d.getUTCDate();
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, 1));
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r.getTime();
};
const fmt = (n) => Math.round(n).toLocaleString("he-IL") + " ₪";

const TIERS = {
  after_2022: [
    { from: 0, to: 4, mult: 1 },
    { from: 4, to: 10, mult: 1.25 },
    { from: 10, to: Infinity, mult: 1.5 },
  ],
  before_2022: [
    { from: 0, to: 8, mult: 1.5 },
    { from: 8, to: Infinity, mult: 1.25 },
  ],
};

export function compute(inputs = {}) {
  const errors = [];
  const regime = inputs.contract_regime || "after_2022";
  const due = parse(inputs.contractual_date);
  const actual = parse(inputs.actual_date);
  const rent = Number(inputs.monthly_rent);
  if (!TIERS[regime]) errors.push("יש לבחור מתי נחתם החוזה.");
  if (Number.isNaN(due) || Number.isNaN(actual)) errors.push("יש להזין מועד מסירה לפי החוזה ומועד מסירה בפועל.");
  if (!(rent > 0)) errors.push("יש להזין דמי שכירות חודשיים של דירה דומה.");
  if (errors.length) return { outputs: null, steps: [], errors };

  const steps = [];
  const days = Math.round((actual - due) / DAY);
  if (days <= 0) {
    steps.push("הדירה נמסרה במועד או לפניו. אין איחור.");
    return { outputs: { delay_days: Math.max(days, 0), delay_months: 0, compensation: 0 }, steps };
  }
  const months = days / MONTH_DAYS;
  steps.push(`איחור של ${days} ימים (כ-${months.toFixed(2)} חודשים).`);

  if (regime === "after_2022") {
    if (actual < addMonths(due, 1)) {
      steps.push("האיחור קצר מחודש. לפי ההסדר שחל על חוזים שנחתמו אחרי תיקון 2022, איחור כזה אינו מזכה בפיצוי הסטטוטורי.");
      return { outputs: { delay_days: days, delay_months: Math.round(months * 100) / 100, compensation: 0 }, steps };
    }
  } else if (days <= 60) {
    steps.push("האיחור אינו עולה על 60 ימים. לפי ההסדר שחל על חוזים ישנים, איחור כזה אינו מזכה בפיצוי הסטטוטורי.");
    return { outputs: { delay_days: days, delay_months: Math.round(months * 100) / 100, compensation: 0 }, steps };
  }

  let total = 0;
  for (const t of TIERS[regime]) {
    const m = Math.max(0, Math.min(months, t.to) - t.from);
    if (m <= 0) continue;
    const part = m * rent * t.mult;
    total += part;
    const range = t.to === Infinity ? `מהחודש ה-${t.from + 1} ואילך` : `חודשים ${t.from + 1} עד ${t.to}`;
    steps.push(`${range}: ${m.toFixed(2)} חודשים × ${fmt(rent)} × ${t.mult} = ${fmt(part)}.`);
  }
  total = Math.round(total);
  steps.push(`פיצוי סטטוטורי משוער: ${fmt(total)}, מחושב מהמועד שנקבע בחוזה. הסכום אינו כולל הפרשי הצמדה, ריבית או נזקים נוספים.`);
  return {
    outputs: { delay_days: days, delay_months: Math.round(months * 100) / 100, compensation: total },
    steps,
  };
}
