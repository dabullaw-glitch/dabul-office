// מחשבון תגמולי מילואים לשכיר - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// נתונים מעודכנים ל-1.1.2026 (ביטוח לאומי). ראו reserve-duty-pay.json.

export const CONFIG = {
  year: 2026,
  divisor: 90,
  minDaily: 328.76,
  maxDaily: 1730.33,
  // תוספת ימים לפי השארית של ימי השירות חלקי 7: שארית 1 עד 5 = 0.4 לכל יום, שארית 6 = יום אחד
  paidDays(serviceDays) {
    const weeks = Math.floor(serviceDays / 7);
    const r = serviceDays % 7;
    return weeks * 7 + Math.min(r * 1.4, 7);
  },
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const income = Number(inputs.income_3_months);
  const days = Number(inputs.service_days);
  const noWork = inputs.not_working === true || inputs.not_working === "true";
  if (!noWork && (!Number.isFinite(income) || income < 0)) errors.push("יש להזין את סך השכר ב-3 החודשים שלפני השירות.");
  if (!Number.isInteger(days) || days < 1 || days > 400) errors.push("יש להזין מספר ימי שירות שלם, 1 ומעלה.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  let daily;
  if (noWork) {
    daily = CONFIG.minDaily;
    steps.push(`מי שאינו עובד, סטודנט או בעל הכנסה נמוכה מקבל את התגמול המזערי: ${money(CONFIG.minDaily)} ליום (2026).`);
  } else {
    const raw = income / CONFIG.divisor;
    daily = Math.min(CONFIG.maxDaily, Math.max(CONFIG.minDaily, raw));
    steps.push(`שכר יומי: ${money(income)} חלקי ${CONFIG.divisor} = ${money(raw)}.`);
    if (raw < CONFIG.minDaily) steps.push(`נמוך מהתגמול המזערי, ולכן משולם ${money(CONFIG.minDaily)} ליום.`);
    if (raw > CONFIG.maxDaily) steps.push(`גבוה מהתגמול המרבי לשכיר, ולכן מוגבל ל-${money(CONFIG.maxDaily)} ליום.`);
  }
  const paid = CONFIG.paidDays(days);
  const extra = r2(paid - days);
  steps.push(`ימים לתשלום: ${days} ימי שירות. כל 7 ימים משולמים כ-7; על השארית מתווספת תוספת של 40% (שארית 6 מקבלת יום אחד). ימים לתשלום: ${r2(paid)} (תוספת ${extra}).`);
  const total = daily * paid;
  steps.push(`תגמול משוער: ${r2(paid)} × ${money(daily)} = ${money(total)} (ברוטו). מהתגמול מנוכים מס הכנסה, דמי ביטוח והפרשות לפנסיה.`);
  steps.push("לשכיר: המעסיק משלם את התגמול עם המשכורת ומקבל החזר מביטוח לאומי. ייתכנו מענקים ותוספות נוספים בתקופות לחימה, שאינם מחושבים כאן.");
  return {
    outputs: { daily_amount: r2(daily), paid_days: r2(paid), total_amount: r2(total) },
    steps,
  };
}
