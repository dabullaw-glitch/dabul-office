// מחשבון אגרת בית משפט בתביעה כספית - מודול טהור.
// אומת ב-25.11.2026 מול הודעת בתי המשפט (אגרות), התשפ"ו-2025, בתוקף מ-1.1.2026 (ראו sources ב-JSON):
// תביעה כספית בשלום: 2.5% מהסכום הנתבע, ולא פחות מ-893 ש"ח. במחוזי: 2.5%, ועל הסכום שמעל 28,580,660 ש"ח 1%.
// תקנה 6 לתקנות בתי המשפט (אגרות), התשס"ז-2007: האגרה משולמת בשתי מחציות, מחצית בהגשה ומחצית בהמשך ההליך.
// תביעה קטנה: 1% מסכום התביעה (כל זכות); האגרה המינימלית ל-2026 טרם אומתה.

export const CONFIG = {
  verified: true,
  verifiedOn: "2026-11-25",
  year: 2026,
  regular: { rate: 0.025, firstShare: 0.5 }, // מחצית בהגשה, מחצית בשלב השני
  magistrateMinimum: 893, // אגרה מינימלית בתביעה כספית בבית משפט השלום, מ-1.1.2026
  districtTier: { threshold: 28580660, rateAbove: 0.01 }, // במחוזי: 1% על החלק שמעל הסף
  smallClaims: { rate: 0.01, minimum: null }, // מינימום ל-2026 טרם אומת
};

const r2 = (x) => Math.round(x * 100) / 100;
const fmt = (x) => r2(x).toLocaleString("en-US") + " ₪";

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
    steps.push(`תביעה קטנה: אגרה בשיעור ${CONFIG.smallClaims.rate * 100}% מסכום התביעה = ${fmt(fee)}, בתשלום אחד בעת ההגשה.`);
    if (CONFIG.smallClaims.minimum && fee < CONFIG.smallClaims.minimum) {
      fee = CONFIG.smallClaims.minimum;
      steps.push(`הסכום נמוך מהאגרה המינימלית, ולכן משולם המינימום: ${fmt(fee)}.`);
    } else if (!CONFIG.smallClaims.minimum) {
      steps.push("קיימת אגרה מינימלית בתביעה קטנה, והיא מתעדכנת מעת לעת. בדקו אותה בעת ההגשה.");
    }
    return { outputs: { first_payment: r2(fee), second_payment: 0, total_fee: r2(fee) }, steps };
  }

  let total;
  if (court === "district" && amount > CONFIG.districtTier.threshold) {
    const above = amount - CONFIG.districtTier.threshold;
    total = CONFIG.districtTier.threshold * CONFIG.regular.rate + above * CONFIG.districtTier.rateAbove;
    steps.push(`תביעה כספית בבית המשפט המחוזי: 2.5% עד ${fmt(CONFIG.districtTier.threshold)}, ו-1% על היתרה (${fmt(above)}). סך האגרה: ${fmt(total)}.`);
  } else {
    total = amount * CONFIG.regular.rate;
    steps.push(`תביעה כספית ב${court === "magistrate" ? "בית משפט השלום" : "בית המשפט המחוזי"}: 2.5% מ-${fmt(amount)} = ${fmt(total)}.`);
  }
  if (court === "magistrate" && total < CONFIG.magistrateMinimum) {
    total = CONFIG.magistrateMinimum;
    steps.push(`הסכום נמוך מהאגרה המינימלית בבית משפט השלום, ולכן האגרה היא ${fmt(total)} (נכון ל-${CONFIG.year}).`);
  }
  const first = total * CONFIG.regular.firstShare;
  const second = total - first;
  steps.push(`האגרה משולמת בשתי מחציות: ${fmt(first)} בעת הגשת התביעה, ו-${fmt(second)} בשלב השני, עד 20 ימים לפני הדיון שנקבע לכך בתקנות. המחצית השנייה מתעדכנת לפי המדד.`);
  steps.push("כשניתן פסק דין בהיעדר הגנה, או כשההליך מסתיים לפני שהדיון החל (למשל בפשרה או במחיקה), בדרך כלל אין צורך לשלם את המחצית השנייה, ובמקרים מסוימים אפשר לקבל החזר חלקי.");
  steps.push("בתביעה שאינה כספית, בערעור ובבקשות מסוימות משולמת אגרה קבועה שאינה מחושבת כאן. יש מקרים של פטור מאגרה (למשל לפי מצב כלכלי או סוג התביעה).");

  return {
    outputs: { first_payment: r2(first), second_payment: r2(second), total_fee: r2(total) },
    steps,
  };
}
