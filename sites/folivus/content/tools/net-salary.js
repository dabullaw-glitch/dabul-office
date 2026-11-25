// מחשבון שכר נטו 2026 - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// מדרגות מס הכנסה אחרי תיקון 288 (רטרואקטיבי מינואר 2026), נקודת זיכוי 242 ₪,
// דמי ביטוח לאומי ובריאות לעובד שכיר מ-1.1.2026. ראו net-salary.json.

export const CONFIG = {
  year: 2026,
  // מדרגות חודשיות על הכנסה מיגיעה אישית
  taxBrackets: [
    { upTo: 7010, rate: 0.1 },
    { upTo: 10060, rate: 0.14 },
    { upTo: 19000, rate: 0.2 },
    { upTo: 25100, rate: 0.31 },
    { upTo: 46690, rate: 0.35 },
    { upTo: 60130, rate: 0.47 },
    { upTo: Infinity, rate: 0.5 }, // 47% ועוד מס יסף 3%
  ],
  creditPointMonthly: 242,
  basePoints: { male: 2.25, female: 2.75 },
  // דמי ביטוח לאומי ובריאות לעובד (תושב, גיל 18 עד גיל פרישה)
  niReducedCeiling: 7703,
  niMaxIncome: 51910,
  employeeRates: { niReduced: 0.0104, niFull: 0.07, healthReduced: 0.0323, healthFull: 0.0517 },
  // זיכוי ממס על הפקדה לפנסיה: לא מחושב (התקרה ל-2026 לא אומתה)
  pensionTaxCredit: null,
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
const opt = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

export function incomeTax(monthly) {
  let tax = 0, lower = 0;
  const parts = [];
  for (const b of CONFIG.taxBrackets) {
    if (monthly <= lower) break;
    const part = Math.min(monthly, b.upTo) - lower;
    tax += part * b.rate;
    parts.push({ from: lower, to: Math.min(monthly, b.upTo), rate: b.rate, tax: part * b.rate });
    lower = b.upTo;
  }
  return { tax, parts };
}

export function compute(inputs = {}) {
  const errors = [];
  const gross = Number(inputs.gross_monthly);
  const gender = inputs.gender || "male";
  const extra = opt(inputs.extra_credit_points) ?? 0;
  const pensionPct = opt(inputs.pension_percent) ?? 6;
  if (!Number.isFinite(gross) || gross <= 0) errors.push("יש להזין שכר ברוטו חודשי גדול מאפס.");
  if (!["male", "female"].includes(gender)) errors.push("יש לבחור מגדר לצורך נקודות הזיכוי הבסיסיות.");
  if (!Number.isFinite(extra) || extra < 0 || extra > 20) errors.push("נקודות זיכוי נוספות צריכות להיות בין 0 ל-20.");
  if (!Number.isFinite(pensionPct) || pensionPct < 0 || pensionPct > 10) errors.push("שיעור ההפרשה לפנסיה צריך להיות בין 0 ל-10 אחוז.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const { tax: grossTax, parts } = incomeTax(gross);
  for (const p of parts) steps.push(`מס הכנסה: ${money(p.from)} עד ${money(p.to)} × ${Math.round(p.rate * 100)}% = ${money(p.tax)}.`);
  const points = CONFIG.basePoints[gender] + extra;
  const credit = points * CONFIG.creditPointMonthly;
  const tax = Math.max(0, grossTax - credit);
  steps.push(`נקודות זיכוי: ${points} × ${money(CONFIG.creditPointMonthly)} = ${money(credit)}. מס לתשלום: ${money(tax)}.`);

  const base = Math.min(gross, CONFIG.niMaxIncome);
  const low = Math.min(base, CONFIG.niReducedCeiling);
  const high = Math.max(0, base - CONFIG.niReducedCeiling);
  const R = CONFIG.employeeRates;
  const ni = low * R.niReduced + high * R.niFull;
  const health = low * R.healthReduced + high * R.healthFull;
  steps.push(`ביטוח לאומי: עד ${money(CONFIG.niReducedCeiling)} בשיעור 1.04%, ומעליו עד ${money(CONFIG.niMaxIncome)} בשיעור 7% = ${money(ni)}.`);
  steps.push(`ביטוח בריאות: עד ${money(CONFIG.niReducedCeiling)} בשיעור 3.23%, ומעליו 5.17% = ${money(health)}.`);

  const pension = gross * (pensionPct / 100);
  if (pension > 0) steps.push(`הפרשת עובד לפנסיה: ${pensionPct}% מהשכר = ${money(pension)} (בפועל לפי השכר המבוטח).`);
  steps.push("לא חושב זיכוי ממס על ההפרשה לפנסיה ולא קרן השתלמות, ולכן הנטו בפועל עשוי להיות מעט גבוה יותר.");

  const net = gross - tax - ni - health - pension;
  steps.push(`שכר נטו משוער: ${money(net)}.`);
  return {
    outputs: {
      income_tax: r2(tax),
      national_insurance: r2(ni),
      health_insurance: r2(health),
      pension_deduction: r2(pension),
      credit_points: points,
      net_salary: r2(net),
    },
    steps,
  };
}
