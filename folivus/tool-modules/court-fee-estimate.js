// הערכת אגרת בית משפט בתביעה כספית אזרחית - מודול טהור.
// מבוסס על תקנות בתי המשפט (אגרות), התשס"ז-2007. השיעורים ב-CONFIG טעונים אימות (ראו todo_verify ב-JSON).

export const CONFIG = {
  verified: false,
  year: 2026,
  regular: { firstRate: 0.01, secondRate: 0.015 }, // שיעור ראשון בהגשה, שיעור שני לפני דיון ההוכחות
  smallClaims: { rate: 0.01, minimum: null }, // מינימום טרם אומת ל-2026
  regularMinimum: null, // אגרה מינימלית טרם אומתה ל-2026
};

const r2 = (x) => Math.round(x * 100) / 100;

export function compute(inputs = {}) {
  const errors = [];
  const proc = inputs.procedure || "regular";
  const court = inputs.court || "magistrate";
  const amount = Number(inputs.claim_amount);
  if (!["regular", "small_claims"].includes(proc)) errors.push("סוג הליך לא מוכר.");
  if (!["magistrate", "district"].includes(court)) errors.push("ערכאה לא מוכרת.");
  if (!Number.isFinite(amount) || amount <= 0) errors.push("יש להזין סכום תביעה גדול מאפס.");
  if (amount > 1e10) errors.push("סכום התביעה גדול מדי לחישוב.");
  if (proc === "small_claims" && court === "district") errors.push("תביעה קטנה נדונה בבית המשפט לתביעות קטנות (במסגרת בית משפט השלום), לא במחוזי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  if (proc === "small_claims") {
    let fee = amount * CONFIG.smallClaims.rate;
    steps.push(`תביעה קטנה: אגרה בשיעור ${CONFIG.smallClaims.rate * 100}% מסכום התביעה = ${r2(fee)} ₪.`);
    if (CONFIG.smallClaims.minimum && fee < CONFIG.smallClaims.minimum) {
      fee = CONFIG.smallClaims.minimum;
      steps.push(`הסכום נמוך מהאגרה המינימלית, ולכן משולם המינימום: ${fee} ₪.`);
    } else if (!CONFIG.smallClaims.minimum) {
      steps.push("קיימת אגרה מינימלית שמתעדכנת מעת לעת. בדקו אותה בעת ההגשה.");
    }
    return { outputs: { first_payment: r2(fee), second_payment: 0, total_fee: r2(fee) }, steps };
  }

  const first = amount * CONFIG.regular.firstRate;
  const second = amount * CONFIG.regular.secondRate;
  steps.push(`תביעה כספית ב${court === "magistrate" ? "בית משפט השלום" : "בית המשפט המחוזי"}: האגרה משולמת בשני שלבים.`);
  steps.push(`שלב ראשון, בעת הגשת התביעה: ${CONFIG.regular.firstRate * 100}% מ-${amount} ₪ = ${r2(first)} ₪.`);
  steps.push(`שלב שני, לפני ישיבת ההוכחות הראשונה: ${CONFIG.regular.secondRate * 100}% = ${r2(second)} ₪. אם התיק מסתיים קודם (פשרה, מחיקה), בדרך כלל לא משלמים את השלב השני.`);
  if (!CONFIG.regularMinimum) steps.push("בתקנות נקבעה גם אגרה מינימלית, וסכומים קבועים מתעדכנים לפי המדד. בדקו את הסכום המעודכן בעת ההגשה.");
  steps.push("בתביעה שאינה כספית, בערעור ובבקשות מסוימות משולמת אגרה קבועה שאינה מחושבת כאן. יש מקרים של פטור מאגרה (למשל לפי מצב כלכלי או סוג התביעה).");

  return {
    outputs: { first_payment: r2(first), second_payment: r2(second), total_fee: r2(first + second) },
    steps,
  };
}
