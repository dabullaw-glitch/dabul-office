// מחשבון דמי לידה לשכירה - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// נתונים מעודכנים ל-2026 (ביטוח לאומי). ראו maternity-pay.json.

export const CONFIG = {
  year: 2026,
  maxDaily: 1752.33, // מ-1.1.2026
  full: { weeks: 15, extraWeeksPerBaby: 3 },
  partial: { weeks: 8, extraWeeksPerBaby: 2 },
  qualifyFull: [{ months: 10, of: 14 }, { months: 15, of: 22 }],
  qualifyPartial: { months: 6, of: 14 },
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
const opt = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

export function compute(inputs = {}) {
  const errors = [];
  const s3 = Number(inputs.salary_3_months);
  const s6 = opt(inputs.salary_6_months);
  const m14 = Number(inputs.insured_months_of_14);
  const m22 = opt(inputs.insured_months_of_22);
  const babies = opt(inputs.babies) ?? 1;
  if (!Number.isFinite(s3) || s3 <= 0) errors.push("יש להזין את סך השכר ב-3 החודשים המלאים שלפני הפסקת העבודה.");
  if (s6 !== null && (!Number.isFinite(s6) || s6 < 0)) errors.push("סך השכר ב-6 החודשים צריך להיות מספר חיובי או ריק.");
  if (!Number.isInteger(m14) || m14 < 0 || m14 > 14) errors.push("חודשי ביטוח מתוך 14 צריכים להיות מספר שלם בין 0 ל-14.");
  if (m22 !== null && (!Number.isInteger(m22) || m22 < 0 || m22 > 22)) errors.push("חודשי ביטוח מתוך 22 צריכים להיות מספר שלם בין 0 ל-22.");
  if (!Number.isInteger(babies) || babies < 1 || babies > 8) errors.push("מספר התינוקות צריך להיות מספר שלם 1 ומעלה.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const fullOk = m14 >= 10 || (m22 !== null && m22 >= 15);
  const partialOk = m14 >= 6;
  let weeks = 0;
  let type = "לא זכאית לפי תקופת הביטוח";
  if (fullOk) {
    weeks = CONFIG.full.weeks + CONFIG.full.extraWeeksPerBaby * (babies - 1);
    type = "זכאות מלאה";
    steps.push(`תקופת אכשרה מלאה (10 מתוך 14 חודשים, או 15 מתוך 22): ${CONFIG.full.weeks} שבועות${babies > 1 ? ` ועוד ${CONFIG.full.extraWeeksPerBaby} שבועות לכל תינוק נוסף` : ""}.`);
  } else if (partialOk) {
    weeks = CONFIG.partial.weeks + CONFIG.partial.extraWeeksPerBaby * (babies - 1);
    type = "זכאות חלקית";
    steps.push(`תקופת אכשרה חלקית (6 מתוך 14 חודשים): ${CONFIG.partial.weeks} שבועות${babies > 1 ? ` ועוד ${CONFIG.partial.extraWeeksPerBaby} שבועות לכל תינוק נוסף` : ""}.`);
  } else {
    steps.push("פחות מ-6 חודשי ביטוח מתוך 14: אין זכאות לדמי לידה מתקופת עבודה. ייתכנו זכאויות אחרות, כמו מענק לידה.");
  }

  const d3 = s3 / 90;
  const d6 = s6 !== null ? s6 / 180 : 0;
  let daily = Math.max(d3, d6);
  steps.push(`שכר יומי: 3 חודשים חלקי 90 = ${money(d3)}${s6 !== null ? `; 6 חודשים חלקי 180 = ${money(d6)}` : ""}. נלקח הגבוה: ${money(daily)}.`);
  if (daily > CONFIG.maxDaily) {
    steps.push(`הסכום גבוה מהמקסימום ליום (${money(CONFIG.maxDaily)} ב-2026), ולכן הוגבל.`);
    daily = CONFIG.maxDaily;
  }
  const days = weeks * 7;
  const total = daily * days;
  if (weeks) steps.push(`סך הכול: ${days} ימים × ${money(daily)} = ${money(total)} (ברוטו, לפני מס הכנסה ודמי ביטוח).`);
  steps.push("אשפוז ממושך של האם או של התינוק עשוי להאריך את התקופה. מ-1.4.2026 נוספה גם הארכה של 5 שבועות לילד עם מוגבלות מורכבת, בתנאים.");
  return {
    outputs: { eligibility: type, weeks, daily_amount: r2(daily), total_amount: r2(total) },
    steps,
  };
}
