// מחשבון ימי חופשה שנתית ופדיון חופשה - מודול טהור.
// לפי חוק חופשה שנתית, התשי"א-1951 (סעיף 3 בנוסחו מ-2017). נכון ל-2026.

export const CONFIG = {
  // אורך החופשה לפי סעיף 3, בימים קלנדריים (כולל ימי מנוחה שבועית)
  grossDaysBySeniority(year) {
    if (year <= 5) return 16;
    if (year === 6) return 18;
    if (year === 7) return 21;
    return Math.min(28, 21 + (year - 7));
  },
  fullYearThresholdContinuous: 200,
  fullYearThresholdNonContinuous: 240,
  dailyDivisor: { 5: 21.67, 6: 25 },
  redeemableYearsBack: 3,
};

// המרת ימים קלנדריים לימי עבודה: ספירת ימי העבודה בתוך רצף ימים קלנדריים שמתחיל ביום ראשון
export function netWorkDays(gross, weekType) {
  let net = 0;
  for (let i = 0; i < gross; i++) {
    const dow = i % 7; // 0=ראשון ... 5=שישי, 6=שבת
    if (dow === 6) continue;
    if (weekType === 5 && dow === 5) continue;
    net++;
  }
  return net;
}

const r2 = (x) => Math.round(x * 100) / 100;

export function compute(inputs = {}) {
  const errors = [];
  const weekType = Number(inputs.week_type || 5);
  const year = Number(inputs.seniority_year);
  const workedDays = Number(inputs.workdays_current_year);
  const continuous = inputs.continuous_employment === undefined ? true : inputs.continuous_employment === true || inputs.continuous_employment === "true";
  const prev = inputs.unused_previous_days === undefined || inputs.unused_previous_days === "" ? 0 : Number(inputs.unused_previous_days);
  const salary = inputs.monthly_salary === undefined || inputs.monthly_salary === "" ? null : Number(inputs.monthly_salary);
  const dailyIn = inputs.daily_value === undefined || inputs.daily_value === "" ? null : Number(inputs.daily_value);

  if (![5, 6].includes(weekType)) errors.push("יש לבחור שבוע עבודה של 5 או 6 ימים.");
  if (!Number.isInteger(year) || year < 1 || year > 60) errors.push("שנת הוותק צריכה להיות מספר שלם בין 1 ל-60.");
  if (!Number.isFinite(workedDays) || workedDays < 0 || workedDays > 366) errors.push("מספר ימי העבודה בשנה הנוכחית צריך להיות בין 0 ל-366.");
  if (!Number.isFinite(prev) || prev < 0) errors.push("יתרת ימים משנים קודמות צריכה להיות 0 או יותר.");
  if (salary !== null && (!Number.isFinite(salary) || salary < 0)) errors.push("השכר החודשי צריך להיות מספר חיובי.");
  if (dailyIn !== null && (!Number.isFinite(dailyIn) || dailyIn < 0)) errors.push("ערך יום חופשה צריך להיות מספר חיובי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const gross = CONFIG.grossDaysBySeniority(year);
  const net = netWorkDays(gross, weekType);
  steps.push(`שנת עבודה ${year}: לפי סעיף 3 לחוק, ${gross} ימים קלנדריים (כולל ימי מנוחה). בשבוע עבודה של ${weekType} ימים זה שווה ל-${net} ימי עבודה.`);

  const threshold = continuous ? CONFIG.fullYearThresholdContinuous : CONFIG.fullYearThresholdNonContinuous;
  let accrued = net;
  if (workedDays < threshold) {
    accrued = (net * workedDays) / threshold;
    steps.push(`בשנה הנוכחית עבדתם ${workedDays} ימים, פחות מ-${threshold}. לכן הזכאות יחסית: ${net} כפול ${workedDays} חלקי ${threshold} = ${r2(accrued)} ימים.`);
  } else {
    steps.push(`בשנה הנוכחית עבדתם לפחות ${threshold} ימים, ולכן הזכאות לשנה זו מלאה: ${net} ימים.`);
  }

  const total = accrued + prev;
  const redeemable = Math.floor(total);
  steps.push(`יתרה כוללת: ${r2(accrued)} ימים מהשנה הנוכחית ועוד ${prev} ימים שנצברו = ${r2(total)} ימים. בפדיון נהוג לשלם רק על ימים שלמים: ${redeemable} ימים.`);
  steps.push(`בסיום העבודה אפשר לפדות ימים שלא נוצלו מהשנה האחרונה ומ-${CONFIG.redeemableYearsBack} השנים שלפניה.`);

  let dayValue = null;
  if (dailyIn !== null && dailyIn > 0) {
    dayValue = dailyIn;
    steps.push(`ערך יום חופשה לפי מה שהוזן: ${dayValue} ₪.`);
  } else if (salary !== null && salary > 0) {
    const div = CONFIG.dailyDivisor[weekType];
    dayValue = salary / div;
    steps.push(`ערך יום חופשה לעובד חודשי: ${salary} ₪ חלקי ${div} = ${r2(dayValue)} ₪.`);
  }
  const payout = dayValue === null ? null : r2(dayValue * redeemable);
  if (payout !== null) steps.push(`פדיון חופשה משוער: ${redeemable} ימים כפול ${r2(dayValue)} ₪ = ${payout} ₪ (ברוטו).`);

  return {
    outputs: {
      annual_gross_days: gross,
      annual_net_days: net,
      accrued_current_year: r2(accrued),
      total_balance: r2(total),
      redeemable_days: redeemable,
      day_value: dayValue === null ? null : r2(dayValue),
      payout_amount: payout,
    },
    steps,
  };
}
