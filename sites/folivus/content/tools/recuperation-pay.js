// מחשבון דמי הבראה - מודול טהור. ערכי יום הבראה לשנת 2026.

export const CONFIG = {
  year: 2026,
  // מגזר פרטי: צו הרחבה בדבר השתתפות המעסיק בהוצאות הבראה ונופש, פורסם ברשומות 18.8.2026
  privateDayValue: 451.5,
  // מגזר ציבורי: חוזר הממונה על השכר, מ-1.6.2026 (טעון אימות מול החוזר עצמו)
  publicDayValue: 511.6,
  privateDays(yearIndex) {
    if (yearIndex <= 1) return 5;
    if (yearIndex <= 3) return 6;
    if (yearIndex <= 10) return 7;
    if (yearIndex <= 15) return 8;
    if (yearIndex <= 19) return 9;
    return 10;
  },
  // טבלה כפי שפורסמה למגזר הציבורי (טעונה אימות לפי הדירוג הספציפי)
  publicDays(yearIndex) {
    if (yearIndex <= 3) return 7;
    if (yearIndex <= 10) return 9;
    if (yearIndex <= 15) return 10;
    if (yearIndex <= 19) return 11;
    if (yearIndex <= 24) return 12;
    return 13;
  },
};

const r2 = (x) => Math.round(x * 100) / 100;

export function compute(inputs = {}) {
  const errors = [];
  const sector = inputs.sector || "private";
  const years = Number(inputs.years_completed);
  const extraMonths = inputs.extra_months === undefined || inputs.extra_months === "" ? 0 : Number(inputs.extra_months);
  const pct = inputs.job_percent === undefined || inputs.job_percent === "" ? 100 : Number(inputs.job_percent);
  const custom = inputs.custom_day_value === undefined || inputs.custom_day_value === "" || inputs.custom_day_value === null ? null : Number(inputs.custom_day_value);

  if (!["private", "public"].includes(sector)) errors.push("יש לבחור מגזר פרטי או ציבורי.");
  if (!Number.isInteger(years) || years < 0 || years > 60) errors.push("מספר שנות העבודה השלמות צריך להיות מספר שלם בין 0 ל-60.");
  if (!Number.isInteger(extraMonths) || extraMonths < 0 || extraMonths > 11) errors.push("חודשים נוספים צריכים להיות בין 0 ל-11.");
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) errors.push("היקף המשרה צריך להיות בין 1 ל-100 אחוז.");
  if (custom !== null && (!Number.isFinite(custom) || custom <= 0)) errors.push("ערך יום מותאם צריך להיות מספר חיובי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const table = sector === "private" ? CONFIG.privateDays : CONFIG.publicDays;
  const baseValue = sector === "private" ? CONFIG.privateDayValue : CONFIG.publicDayValue;
  const dayValue = custom !== null ? custom : baseValue;

  if (years < 1) {
    steps.push("הזכאות לדמי הבראה נוצרת רק אחרי שמשלימים שנת עבודה ראשונה אצל המעסיק. כשמשלימים את השנה, משולמים דמי ההבראה גם בעד השנה הראשונה.");
    return {
      outputs: { eligible: "עדיין לא (פחות משנת עבודה)", days_entitled: 0, day_value: dayValue, amount: 0 },
      steps,
    };
  }

  const fullDays = table(years);
  steps.push(`שנת העבודה ה-${years}: ${fullDays} ימי הבראה למשרה מלאה (${sector === "private" ? "לפי צו ההרחבה במגזר הפרטי" : "לפי הטבלה שפורסמה למגזר הציבורי"}).`);
  let days = fullDays;
  if (extraMonths > 0) {
    const nextYearDays = table(years + 1);
    const partial = (nextYearDays * extraMonths) / 12;
    days += partial;
    steps.push(`חלק יחסי לשנה החלקית שלאחר מכן (${extraMonths} חודשים): ${nextYearDays} כפול ${extraMonths}/12 = ${r2(partial)} ימים. רלוונטי בעיקר כשהעבודה מסתיימת.`);
  }
  const scaled = (days * pct) / 100;
  if (pct < 100) steps.push(`משרה חלקית של ${pct}%: ${r2(days)} ימים כפול ${pct}% = ${r2(scaled)} ימים.`);

  const amount = scaled * dayValue;
  steps.push(`ערך יום הבראה ל-${CONFIG.year}: ${dayValue} ₪${custom !== null ? " (ערך שהוזן ידנית)" : ""}. סכום משוער: ${r2(scaled)} ימים כפול ${dayValue} ₪ = ${r2(amount)} ₪ ברוטו.`);
  steps.push("אם הסכם קיבוצי, צו הרחבה ענפי או חוזה העבודה קובעים יותר ימים או ערך גבוה יותר, הם גוברים.");

  return {
    outputs: {
      eligible: "זכאי",
      days_entitled: r2(scaled),
      day_value: dayValue,
      amount: r2(amount),
    },
    steps,
  };
}
