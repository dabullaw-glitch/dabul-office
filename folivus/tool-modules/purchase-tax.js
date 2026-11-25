// מחשבון מס רכישה לדירת מגורים - פוליבוס
// מדרגות לתקופה 16.1.2024 עד 15.1.2028 (העדכון השנתי הוקפא). נכון ל-2026.
// מקור: רשות המסים, מדריך למוכר ולרוכש זכות במקרקעין 2026.

export const VALID_FROM = "2024-01-16";
export const VALID_TO = "2028-01-15";

const BRACKETS = {
  single: [
    { upTo: 1978745, rate: 0 },
    { upTo: 2347040, rate: 0.035 },
    { upTo: 6055070, rate: 0.05 },
    { upTo: 20183565, rate: 0.08 },
    { upTo: Infinity, rate: 0.1 },
  ],
  additional: [
    { upTo: 6055070, rate: 0.08 },
    { upTo: Infinity, rate: 0.1 },
  ],
  non_residential: [{ upTo: Infinity, rate: 0.06 }],
};

const fmt = (n) => Math.round(n).toLocaleString("he-IL") + " ₪";
const pct = (r) => (Math.round(r * 10000) / 100).toString() + "%";

export function compute(inputs = {}) {
  const errors = [];
  const price = Number(inputs.price);
  const type = inputs.buyer_type || "single";
  if (!Number.isFinite(price) || price < 0) errors.push("יש להזין שווי עסקה חיובי.");
  if (!["single", "replacement", "additional", "non_residential"].includes(type)) {
    errors.push("סוג הרכישה אינו מוכר.");
  }
  if (errors.length) return { outputs: null, steps: [], errors };

  const table = type === "replacement" ? BRACKETS.single : BRACKETS[type];
  const steps = [];
  const labels = {
    single: "דירה יחידה",
    replacement: "דירה חלופית (משפר דיור) - לפי מדרגות דירה יחידה",
    additional: "דירה נוספת",
    non_residential: "נכס שאינו דירת מגורים",
  };
  steps.push(`סוג הרכישה: ${labels[type]}. מדרגות בתוקף מ-16.1.2024 עד 15.1.2028 (נכון ל-2026).`);

  let tax = 0;
  let lower = 0;
  for (const b of table) {
    if (price <= lower) break;
    const top = Math.min(price, b.upTo);
    const part = top - lower;
    const t = part * b.rate;
    tax += t;
    const range = b.upTo === Infinity ? `מעל ${fmt(lower)}` : `${fmt(lower)} עד ${fmt(b.upTo)}`;
    steps.push(`מדרגה ${range}: ${fmt(part)} × ${pct(b.rate)} = ${fmt(t)}`);
    lower = b.upTo;
  }
  tax = Math.round(tax);
  const effective = price > 0 ? tax / price : 0;
  steps.push(`סך מס הרכישה המשוער: ${fmt(tax)} (שיעור אפקטיבי ${pct(effective)}).`);
  if (type === "replacement") {
    steps.push("בדירה חלופית יש למכור את הדירה הקודמת בתוך פרק הזמן שקבע החוק, אחרת יחויב המס לפי מדרגות דירה נוספת.");
  }
  return {
    outputs: { tax, effective_rate: Math.round(effective * 10000) / 100, total_cost: Math.round(price + tax) },
    steps,
  };
}
