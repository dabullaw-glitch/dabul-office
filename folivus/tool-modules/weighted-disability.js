// מחשבון שקלול אחוזי נכות (נכות משוקללת) - פוליבוס. מודול טהור.
// שיטת השקלול של ביטוח לאומי: הליקוי הגבוה במלואו, וכל ליקוי נוסף מתוך האחוזים שנותרו.
// ראו weighted-disability.json.

export const CONFIG = {
  // עיגול התוצאה: שבר מעוגל לשלם כלפי מעלה (לפי כל זכות; טעון אימות לכל ענף)
  rounding: "ceil",
  maxItems: 20,
};

const r2 = (x) => Math.round(x * 100) / 100;

export function compute(inputs = {}) {
  const errors = [];
  let list = inputs.percentages;
  if (typeof list === "string") list = list.split(/[,\s]+/).filter(Boolean);
  if (!Array.isArray(list) || list.length === 0) errors.push("יש להזין לפחות אחוז נכות אחד.");
  const nums = Array.isArray(list) ? list.map(Number) : [];
  if (nums.some((n) => !Number.isFinite(n) || n < 0 || n > 100)) errors.push("כל אחוז נכות צריך להיות בין 0 ל-100.");
  if (nums.length > CONFIG.maxItems) errors.push(`אפשר להזין עד ${CONFIG.maxItems} ליקויים.`);
  if (errors.length) return { outputs: {}, steps: [], errors };

  const sorted = nums.filter((n) => n > 0).sort((a, b) => b - a);
  const steps = [];
  let total = 0;
  sorted.forEach((p, i) => {
    const remaining = 100 - total;
    const part = (p * remaining) / 100;
    total += part;
    steps.push(i === 0
      ? `ליקוי ראשון (הגבוה): ${p}% במלואו. מצטבר: ${r2(total)}%.`
      : `ליקוי ${i + 1}: ${p}% מתוך ${r2(remaining)}% שנותרו = ${r2(part)}%. מצטבר: ${r2(total)}%.`);
  });
  const exact = r2(total);
  const rounded = CONFIG.rounding === "ceil" ? Math.ceil(exact - 1e-9) : Math.round(exact);
  const simpleSum = nums.reduce((a, b) => a + b, 0);
  steps.push(`תוצאה מדויקת: ${exact}%. אחרי עיגול כלפי מעלה: ${rounded}%. לשם השוואה, חיבור פשוט היה נותן ${r2(simpleSum)}%.`);
  return {
    outputs: { weighted_exact: exact, weighted_rounded: rounded, simple_sum: r2(simpleSum), order: sorted },
    steps,
  };
}
