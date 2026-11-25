// מחשבון גמול שעות נוספות - מודול טהור.
// לפי חוק שעות עבודה ומנוחה, התשי"א-1951 (סעיפים 16, 17) וצו ההרחבה לשבוע עבודה של 42 שעות. נכון ל-2026.

export const CONFIG = {
  monthlyHoursDivisor: 182,
  dailyNorm: { 5: { regular: 8.6, short: 7.6 }, 6: { regular: 8, short: 7 } },
  firstTierHours: 2,
  firstTierRate: 1.25,
  secondTierRate: 1.5,
  restDayRate: 1.5,
  weeklyLimit: 42,
};

const r2 = (x) => Math.round(x * 100) / 100;

export function compute(inputs = {}) {
  const errors = [];
  const hourlyIn = inputs.hourly_wage === undefined || inputs.hourly_wage === "" || inputs.hourly_wage === null ? null : Number(inputs.hourly_wage);
  const monthly = inputs.monthly_salary === undefined || inputs.monthly_salary === "" || inputs.monthly_salary === null ? null : Number(inputs.monthly_salary);
  const weekType = Number(inputs.week_type || 5);
  const dayType = inputs.day_type || "regular";
  const hours = Number(inputs.hours_per_day);
  const days = inputs.days_count === undefined || inputs.days_count === "" ? 1 : Number(inputs.days_count);
  const restHours = inputs.rest_day_hours === undefined || inputs.rest_day_hours === "" ? 0 : Number(inputs.rest_day_hours);

  if (hourlyIn === null && monthly === null) errors.push("יש להזין שכר שעתי או שכר חודשי.");
  if (hourlyIn !== null && (!Number.isFinite(hourlyIn) || hourlyIn <= 0)) errors.push("השכר השעתי צריך להיות גדול מאפס.");
  if (monthly !== null && (!Number.isFinite(monthly) || monthly <= 0)) errors.push("השכר החודשי צריך להיות גדול מאפס.");
  if (![5, 6].includes(weekType)) errors.push("יש לבחור שבוע עבודה של 5 או 6 ימים.");
  if (!["regular", "short"].includes(dayType)) errors.push("סוג יום לא מוכר.");
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) errors.push("שעות העבודה ביום צריכות להיות בין 0 ל-24.");
  if (!Number.isInteger(days) || days < 1 || days > 31) errors.push("מספר הימים צריך להיות מספר שלם בין 1 ל-31.");
  if (!Number.isFinite(restHours) || restHours < 0 || restHours > 24) errors.push("שעות ביום המנוחה צריכות להיות בין 0 ל-24.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  let hourly = hourlyIn;
  if (hourly === null) {
    hourly = monthly / CONFIG.monthlyHoursDivisor;
    steps.push(`שכר שעה לעובד חודשי: ${monthly} ₪ חלקי ${CONFIG.monthlyHoursDivisor} = ${r2(hourly)} ₪.`);
  } else {
    steps.push(`שכר שעה רגיל: ${hourly} ₪.`);
  }

  const norm = CONFIG.dailyNorm[weekType][dayType];
  steps.push(`מכסת השעות היומית: ${norm} שעות (שבוע של ${weekType} ימים, ${dayType === "regular" ? "יום רגיל" : weekType === 5 ? "היום המקוצר בשבוע" : "יום שישי או ערב חג"}).`);

  const ot = Math.max(0, hours - norm);
  const regular = Math.min(hours, norm);
  const tier1 = Math.min(ot, CONFIG.firstTierHours);
  const tier2 = Math.max(0, ot - CONFIG.firstTierHours);
  steps.push(`בכל יום: ${r2(regular)} שעות רגילות, ${r2(tier1)} שעות נוספות בשיעור 125% ו-${r2(tier2)} שעות בשיעור 150%.`);

  const regPay = regular * hourly * days;
  const t1Pay = tier1 * hourly * CONFIG.firstTierRate * days;
  const t2Pay = tier2 * hourly * CONFIG.secondTierRate * days;
  const restPay = restHours * hourly * CONFIG.restDayRate;
  if (days > 1) steps.push(`הכפלה ב-${days} ימים כאלה.`);
  steps.push(`תשלום לשעות הרגילות: ${r2(regPay)} ₪. גמול שעות נוספות: ${r2(t1Pay)} ₪ (125%) ועוד ${r2(t2Pay)} ₪ (150%).`);
  if (restHours > 0) steps.push(`עבודה ביום המנוחה השבועי: ${restHours} שעות כפול 150% = ${r2(restPay)} ₪. שעות נוספות ביום המנוחה מזכות בדרך כלל בשיעור גבוה יותר, שלא חושב כאן.`);

  const weeklyHours = hours * Math.min(days, weekType) + restHours;
  if (days <= weekType && weeklyHours > CONFIG.weeklyLimit && ot === 0) {
    steps.push(`שימו לב: סך השעות בשבוע (${r2(weeklyHours)}) עולה על ${CONFIG.weeklyLimit}. שעות מעבר למכסה השבועית מזכות גם הן בגמול, גם אם לא חרגתם מהמכסה היומית.`);
  }
  steps.push("לעובד חודשי, התשלום על השעות הרגילות כבר כלול במשכורת, והתוספת היא גמול השעות הנוספות.");

  return {
    outputs: {
      hourly_wage: r2(hourly),
      overtime_hours_125: r2(tier1 * days),
      overtime_hours_150: r2(tier2 * days),
      overtime_pay: r2(t1Pay + t2Pay),
      rest_day_pay: r2(restPay),
      total_pay: r2(regPay + t1Pay + t2Pay + restPay),
    },
    steps,
  };
}
