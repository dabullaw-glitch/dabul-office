// אומדן מזונות ילדים לפי הלכת בע"מ 919/15 - פוליבוס. מודול טהור.
// אין בישראל נוסחה קבועה בחוק; הכלי מציג מודל מפושט בלבד. ראו child-support-estimate.json.

export const CONFIG = {
  // אין סכום מינימום רשמי לצרכים הכרחיים של ילד; המשתמש מזין את הצרכים בעצמו
  minimalNeedsPerChild: null,
  youngAgeLimit: 6, // מתחת לגיל 6: צרכים הכרחיים על האב לפי הדין העברי (להורים יהודים)
  adultAge: 18,
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
const opt = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

export function compute(inputs = {}) {
  const errors = [];
  let ages = inputs.children_ages;
  if (typeof ages === "string") ages = ages.split(/[,\s]+/).filter(Boolean);
  ages = Array.isArray(ages) ? ages.map(Number) : [];
  const payerIncome = Number(inputs.payer_net_income);
  const otherIncome = Number(inputs.other_net_income);
  const needs = Number(inputs.needs_per_child);
  const payerTime = opt(inputs.payer_time_percent) ?? 0;
  const jewishFather = inputs.payer_is_father_jewish_law === true || inputs.payer_is_father_jewish_law === "true";

  if (!ages.length) errors.push("יש להזין את גילאי הילדים.");
  if (ages.some((a) => !Number.isFinite(a) || a < 0 || a >= CONFIG.adultAge)) errors.push("גיל ילד צריך להיות בין 0 ל-17 (הכלי אינו מחשב מזונות אחרי גיל 18).");
  if (!Number.isFinite(payerIncome) || payerIncome < 0) errors.push("יש להזין הכנסה פנויה חודשית של ההורה המשלם.");
  if (!Number.isFinite(otherIncome) || otherIncome < 0) errors.push("יש להזין הכנסה פנויה חודשית של ההורה השני.");
  if (!Number.isFinite(needs) || needs <= 0) errors.push("יש להזין אומדן צרכים חודשי לילד (אין סכום רשמי, ראו הסבר).");
  if (!Number.isFinite(payerTime) || payerTime < 0 || payerTime > 50) errors.push("אחוז הזמן אצל ההורה המשלם צריך להיות בין 0 ל-50.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const totalIncome = payerIncome + otherIncome;
  const payerShare = totalIncome > 0 ? payerIncome / totalIncome : 0.5;
  const t = payerTime / 100;
  steps.push(`חלקו של ההורה המשלם בהכנסה הפנויה של שני ההורים: ${Math.round(payerShare * 1000) / 10}%. זמן השהות אצלו: ${payerTime}%.`);

  const perChild = ages.map((age) => {
    let amount;
    if (age < CONFIG.youngAgeLimit && jewishFather) {
      amount = needs * (1 - t);
      steps.push(`ילד בגיל ${age}: מתחת לגיל 6, לפי הדין העברי הצרכים ההכרחיים מוטלים על האב. המודל: הצרכים (${money(needs)}) פחות חלק הזמן אצלו = ${money(amount)}.`);
    } else {
      amount = Math.max(0, needs * (payerShare - t));
      steps.push(`ילד בגיל ${age}: חלוקה לפי היחס בין ההכנסות, בניכוי ההוצאה הישירה בזמן השהות. ${money(needs)} × (${Math.round(payerShare * 1000) / 10}% פחות ${payerTime}%) = ${money(amount)}.`);
    }
    return { age, amount: r2(amount) };
  });
  const total = perChild.reduce((s, c) => s + c.amount, 0);
  steps.push(`סך הכול אומדן: ${money(total)} לחודש. הכלי אינו כולל מדור (חלק בדיור), הוצאות חינוך ובריאות חריגות, ואינו מחליף את שיקול הדעת של בית המשפט.`);
  return {
    outputs: { payer_income_share: Math.round(payerShare * 1000) / 10, per_child: perChild, total_monthly: r2(total) },
    steps,
  };
}
