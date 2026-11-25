// מחשבון דמי אבטלה - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// נתונים מעודכנים ל-1.1.2026 (ביטוח לאומי). ראו unemployment-benefit.json.

export const CONFIG = {
  year: 2026,
  divisor: 150, // הכנסה ב-6 החודשים שלפני הרישום, חלקי 150
  baseAmount: 415, // סכום בסיס יומי לחישוב המדרגות, מ-1.1.2026
  // מדרגות: עד מכפלה של סכום הבסיס, שיעור לבני 28 ומעלה ולצעירים מ-28
  brackets: [
    { upToFactor: 0.5, over28: 0.8, under28: 0.6 },
    { upToFactor: 0.75, over28: 0.5, under28: 0.4 },
    { upToFactor: 1, over28: 0.45, under28: 0.35 },
    { upToFactor: 5, over28: 0.3, under28: 0.25 },
  ],
  maxDailyFirst125: 550.76,
  maxDailyAfter125: 367.17,
  qualifying: { months: 12, of: 18 },
  ageRange: { min: 20, max: 67 },
  // מספר ימים מרבי: [עד 2 תלויים, 3 תלויים ויותר]
  maxDays(age, dependents) {
    const three = dependents >= 3;
    if (age < 25) return three ? 138 : 50;
    if (age < 28) return three ? 138 : 67;
    if (age < 35) return three ? 138 : 100;
    if (age < 45) return three ? 175 : 138;
    return 175;
  },
};

const r2 = (x) => Math.round(x * 100) / 100;
const floor2 = (x) => Math.floor(x * 100 + 1e-9) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";

export function dailyBenefit(avgDaily, age) {
  const key = age >= 28 ? "over28" : "under28";
  let lower = 0, total = 0;
  for (const b of CONFIG.brackets) {
    const top = b.upToFactor * CONFIG.baseAmount;
    if (avgDaily <= lower) break;
    total += floor2((Math.min(avgDaily, top) - lower) * b[key]);
    lower = top;
  }
  return r2(total);
}

export function compute(inputs = {}) {
  const errors = [];
  const income = Number(inputs.income_6_months);
  const age = Number(inputs.age);
  const deps = Number(inputs.dependents ?? 0);
  const months = Number(inputs.work_months_of_18);
  if (!Number.isFinite(income) || income <= 0) errors.push("יש להזין את סך השכר ב-6 החודשים שלפני הרישום בשירות התעסוקה.");
  if (!Number.isInteger(age) || age < 16 || age > 80) errors.push("יש להזין גיל תקין.");
  if (!Number.isInteger(deps) || deps < 0) errors.push("מספר התלויים צריך להיות מספר שלם 0 ומעלה.");
  if (!Number.isInteger(months) || months < 0 || months > 18) errors.push("חודשי עבודה מתוך 18 צריכים להיות מספר שלם בין 0 ל-18.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const eligible = months >= CONFIG.qualifying.months && age >= CONFIG.ageRange.min && age < CONFIG.ageRange.max;
  if (months < CONFIG.qualifying.months) steps.push("נדרשים לפחות 12 חודשי עבודה כשכיר מתוך 18 החודשים שלפני הרישום הראשון בשירות התעסוקה.");
  if (age < CONFIG.ageRange.min || age >= CONFIG.ageRange.max) steps.push("דמי אבטלה משולמים ככלל מגיל 20 ועד גיל 67 (יש חריגים לצעירים מ-20).");

  const avg = income / CONFIG.divisor;
  steps.push(`שכר יומי ממוצע: ${money(income)} חלקי ${CONFIG.divisor} = ${money(avg)}.`);
  const raw = dailyBenefit(avg, age);
  steps.push(`לפי מדרגות ${age >= 28 ? "גיל 28 ומעלה (80%, 50%, 45%, 30%)" : "צעירים מ-28 (60%, 40%, 35%, 25%)"} על בסיס ${money(CONFIG.baseAmount)}: ${money(raw)} ליום.`);
  const first = Math.min(raw, CONFIG.maxDailyFirst125);
  const later = Math.min(raw, CONFIG.maxDailyAfter125);
  if (raw > CONFIG.maxDailyFirst125) steps.push(`בימים 1 עד 125 התשלום מוגבל ל-${money(CONFIG.maxDailyFirst125)} ליום.`);
  if (raw > CONFIG.maxDailyAfter125) steps.push(`מהיום ה-126 התשלום מוגבל ל-${money(CONFIG.maxDailyAfter125)} ליום.`);

  const days = CONFIG.maxDays(age, deps);
  steps.push(`מספר ימי אבטלה מרבי לגיל ${age} עם ${deps} תלויים: ${days}.`);
  const total = eligible ? Math.min(days, 125) * first + Math.max(0, days - 125) * later : 0;
  if (eligible) steps.push(`הערכה לכל התקופה: ${money(total)} (ברוטו). התשלום בפועל תלוי בימי האבטלה שיאושרו בכל חודש.`);
  steps.push("סיבת סיום העבודה משפיעה על המועד שבו מתחיל התשלום (למשל בהתפטרות). סירוב לעבודה מתאימה או להכשרה גורר הפחתה של 30 ימים ושלילה של 90 ימים לכל סירוב.");
  return {
    outputs: {
      eligible,
      average_daily_wage: r2(avg),
      daily_benefit: r2(first),
      daily_benefit_after_125: r2(later),
      max_days: days,
      estimated_total: r2(total),
    },
    steps,
  };
}
