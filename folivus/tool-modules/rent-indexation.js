// מחשבון הצמדת שכר דירה למדד המחירים לצרכן - פוליבוס
// נוסחה: שכר דירה מעודכן = שכר בסיס × (מדד חדש / מדד בסיס).

const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString("he-IL") + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const rent = Number(inputs.base_rent);
  const b = Number(inputs.base_index);
  const n = Number(inputs.new_index);
  if (!(rent > 0)) errors.push("יש להזין שכר דירה בסיסי חיובי.");
  if (!(b > 0) || !(n > 0)) errors.push("יש להזין מדד בסיס ומדד חדש חיוביים.");
  if (errors.length) return { outputs: null, steps: [], errors };

  const steps = [];
  const change = n / b - 1;
  steps.push(`שינוי במדד: (${n} / ${b}) פחות 1 = ${(change * 100).toFixed(2)}%.`);
  let newRent = rent * (n / b);
  steps.push(`שכר דירה לפי המדד: ${fmt(rent)} × ${(n / b).toFixed(4)} = ${fmt(newRent)}.`);
  if (inputs.only_increase === true && newRent < rent) {
    steps.push("המדד ירד, ובחוזה נקבע שהשכר לא יפחת משכר הבסיס. לכן השכר נשאר כפי שהיה.");
    newRent = rent;
  }
  newRent = Math.round(newRent * 100) / 100;
  steps.push(`שכר דירה מעודכן: ${fmt(newRent)}. הפרש חודשי: ${fmt(newRent - rent)}.`);
  return {
    outputs: {
      new_rent: newRent,
      change_percent: Math.round(change * 10000) / 100,
      monthly_difference: Math.round((newRent - rent) * 100) / 100,
    },
    steps,
  };
}
