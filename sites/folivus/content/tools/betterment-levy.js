// הערכת היטל השבחה - פוליבוס
// עיקרון: לרוב ההיטל הוא מחצית (50%) מעליית שווי המקרקעין בעקבות תכנית, הקלה או שימוש חורג.
// השומה בפועל נקבעת על ידי הוועדה המקומית. הערכה בלבד.

export const RATE = 0.5;
const fmt = (n) => Math.round(n).toLocaleString("he-IL") + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const before = Number(inputs.value_before);
  const after = Number(inputs.value_after);
  const share = inputs.ownership_share === undefined || inputs.ownership_share === "" ? 100 : Number(inputs.ownership_share);
  if (!(before >= 0) || !(after >= 0)) errors.push("יש להזין שווי לפני ואחרי כמספרים חיוביים.");
  if (!(share > 0 && share <= 100)) errors.push("חלק הבעלות צריך להיות בין 1% ל-100%.");
  if (errors.length) return { outputs: null, steps: [], errors };

  const steps = [];
  const rawIncrease = after - before;
  steps.push(`שווי לפני: ${fmt(before)}. שווי אחרי: ${fmt(after)}. עליית שווי של כל הנכס: ${fmt(rawIncrease)}.`);
  if (rawIncrease <= 0) {
    steps.push("אין עליית שווי, ולכן לפי עיקרון זה לא אמור לחול היטל השבחה.");
    return { outputs: { increase: 0, levy: 0, net_increase: 0 }, steps };
  }
  const increase = rawIncrease * (share / 100);
  if (share !== 100) steps.push(`חלקכם בנכס ${share}%: עליית שווי המיוחסת לכם ${fmt(increase)}.`);
  const levy = Math.round(increase * RATE);
  steps.push(`היטל משוער: ${fmt(increase)} × 50% = ${fmt(levy)}.`);
  if (inputs.expansion_140 === true) {
    steps.push("סימנתם הרחבת דירת מגורים. ייתכן פטור עד שטח כולל של 140 מ\"ר, בכפוף לתנאים (בין היתר מגורים בדירה לאחר הבנייה ופטור שלא נוצל בעבר). החישוב אינו מנכה את הפטור.");
  }
  steps.push("זו הערכה בלבד. השומה בפועל נערכת על ידי הוועדה המקומית, וניתן להשיג עליה.");
  return { outputs: { increase: Math.round(increase), levy, net_increase: Math.round(increase - levy) }, steps };
}
