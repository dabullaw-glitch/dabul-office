// מחשבון דמי מחלה - מודול טהור. לפי חוק דמי מחלה, התשל"ו-1976. נכון ל-2026.

export const CONFIG = {
  accrualPerMonth: 1.5,
  maxBalance: 90,
  // שיעור התשלום לפי מספר היום בתקופת המחלה
  rateForDay(n) {
    if (n === 1) return 0;
    if (n <= 3) return 0.5;
    return 1;
  },
};

const r2 = (x) => Math.round(x * 100) / 100;

export function compute(inputs = {}) {
  const errors = [];
  const daily = Number(inputs.daily_wage);
  const months = Number(inputs.months_worked);
  const used = inputs.used_days === undefined || inputs.used_days === "" ? 0 : Number(inputs.used_days);
  const sickDays = Number(inputs.sick_days);

  if (!Number.isFinite(daily) || daily <= 0) errors.push("יש להזין שכר יומי רגיל גדול מאפס.");
  if (!Number.isFinite(months) || months < 0 || months > 600) errors.push("מספר חודשי העבודה צריך להיות בין 0 ל-600.");
  if (!Number.isFinite(used) || used < 0) errors.push("ימי מחלה שנוצלו צריכים להיות 0 או יותר.");
  if (!Number.isInteger(sickDays) || sickDays < 1 || sickDays > 365) errors.push("מספר ימי ההיעדרות צריך להיות מספר שלם בין 1 ל-365.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const accrued = Math.min(CONFIG.maxBalance, Math.floor(months) * CONFIG.accrualPerMonth);
  const balance = Math.max(0, accrued - used);
  steps.push(`צבירה: ${CONFIG.accrualPerMonth} ימים לכל חודש עבודה מלא, עד ${CONFIG.maxBalance} ימים. ${Math.floor(months)} חודשים = ${accrued} ימים. אחרי ניכוי ${used} ימים שנוצלו, היתרה היא ${balance} ימים.`);

  let pay = 0;
  let paidDays = 0;
  let remaining = balance;
  const breakdown = { unpaid: 0, half: 0, full: 0, noBalance: 0 };
  for (let n = 1; n <= sickDays; n++) {
    const rate = CONFIG.rateForDay(n);
    if (rate === 0) { breakdown.unpaid++; continue; }
    if (remaining < 1) { breakdown.noBalance++; continue; }
    remaining -= 1;
    paidDays++;
    pay += daily * rate;
    if (rate === 0.5) breakdown.half++; else breakdown.full++;
  }
  steps.push(`יום ראשון למחלה: ללא תשלום (${breakdown.unpaid} ימים).`);
  if (breakdown.half) steps.push(`הימים השני והשלישי: 50% מהשכר היומי (${breakdown.half} ימים כפול ${r2(daily * 0.5)} ₪).`);
  if (breakdown.full) steps.push(`מהיום הרביעי: 100% מהשכר היומי (${breakdown.full} ימים כפול ${r2(daily)} ₪).`);
  if (breakdown.noBalance) steps.push(`${breakdown.noBalance} ימים לא משולמים כי יתרת ימי המחלה נגמרה.`);
  steps.push(`סך דמי מחלה משוערים: ${r2(pay)} ₪ ברוטו. יתרה אחרי תקופה זו: ${r2(remaining)} ימים (בהנחה שרק ימים משולמים נגרעים מהיתרה).`);
  steps.push("ימי מחלה שלא נוצלו אינם נפדים בכסף בסיום העבודה, אלא אם נקבע אחרת בהסכם.");

  return {
    outputs: {
      accrued_days: accrued,
      balance_before: balance,
      paid_days: paidDays,
      sick_pay: r2(pay),
      balance_after: r2(remaining),
    },
    steps,
  };
}
