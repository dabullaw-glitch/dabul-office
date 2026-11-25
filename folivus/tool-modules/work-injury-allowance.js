// מחשבון דמי פגיעה (תאונת עבודה) לשכיר - פוליבוס. מודול טהור.
// נתונים מעודכנים ל-1.1.2026 (ביטוח לאומי). ראו work-injury-allowance.json.

export const CONFIG = {
  year: 2026,
  rate: 0.75,
  divisor: 90,
  maxDaily: 1314.25, // לפגיעה שאירעה מ-1.1.1995, החל מ-1.1.2026
  maxDays: 91,
  waitingDays: 2, // לא משולמים בהיעדרות קצרה מ-12 ימים
  fullPayFromDays: 12,
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const income = Number(inputs.income_3_months);
  const days = Number(inputs.incapacity_days);
  if (!Number.isFinite(income) || income <= 0) errors.push("יש להזין את סך השכר ב-3 החודשים המלאים שקדמו לפגיעה.");
  if (!Number.isInteger(days) || days < 1) errors.push("יש להזין מספר ימי אי כושר שלם, 1 ומעלה.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const avg = income / CONFIG.divisor;
  let daily = avg * CONFIG.rate;
  steps.push(`שכר יומי ממוצע: ${money(income)} חלקי ${CONFIG.divisor} = ${money(avg)}. דמי פגיעה ליום: 75% = ${money(daily)}.`);
  if (daily > CONFIG.maxDaily) {
    steps.push(`הסכום גבוה מהמקסימום ליום (${money(CONFIG.maxDaily)} מ-1.1.2026), ולכן הוגבל.`);
    daily = CONFIG.maxDaily;
  }
  const capped = Math.min(days, CONFIG.maxDays);
  if (days > CONFIG.maxDays) steps.push(`דמי פגיעה משולמים עד ${CONFIG.maxDays} ימים. אחרי זה אפשר להגיש תביעה לקביעת דרגת נכות מעבודה.`);
  let paid;
  if (capped >= CONFIG.fullPayFromDays) {
    paid = capped;
    steps.push("אי כושר של 12 ימים לפחות: התשלום מהיום שאחרי יום הפגיעה.");
  } else {
    paid = Math.max(0, capped - CONFIG.waitingDays);
    steps.push("אי כושר קצר מ-12 ימים: ביטוח לאומי משלם מהיום השלישי (היומיים הראשונים אינם משולמים).");
  }
  const total = paid * daily;
  steps.push(`סך הכול: ${paid} ימים × ${money(daily)} = ${money(total)} (ברוטו, לפני מס הכנסה ודמי ביטוח).`);
  steps.push("את יום הפגיעה עצמו משלם המעסיק. המעסיק משלם לרוב גם את 12 הימים הראשונים, וביטוח לאומי גובה ממנו את הסכום ששילם לעובד בעדם.");
  return {
    outputs: { daily_allowance: r2(daily), paid_days: paid, total_allowance: r2(total) },
    steps,
  };
}
