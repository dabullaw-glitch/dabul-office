// סיכום זכויות עובד זר בסיעוד - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// נתונים לפי חוברת הזכויות של רשות האוכלוסין וההגירה לשנת 2026. ראו foreign-caregiver-rights.json.

export const CONFIG = {
  year: 2026,
  minimumMonthlyWage: 6443.85, // מ-1.4.2026
  housingMaxByRegion: { tel_aviv: 578.36, jerusalem: 508.62, haifa: 385.61, center: 385.61, south: 342.8, north: 315.41 },
  employerOwnedHousingFactor: 0.5,
  utilitiesMax: 94.34,
  medicalInsuranceMax: 168.8, // או מחצית עלות הביטוח למעסיק, הנמוך מביניהם
  totalDeductionCapRate: 0.25,
  weeklyRestHours: 25,
  holidaysPerYear: 9,
  sickDaysPerMonth: 1.5,
  sickDaysMax: 90,
  vacationDays(year) {
    if (year <= 5) return 16;
    if (year === 6) return 18;
    if (year === 7) return 21;
    return Math.min(28, 21 + (year - 7));
  },
  recuperationDays(year) {
    if (year <= 1) return 5;
    if (year <= 3) return 6;
    if (year <= 10) return 7;
    return null; // מעבר ל-10 שנים: לא אומת בחוברת
  },
};

const REGIONS = { tel_aviv: "תל אביב", jerusalem: "ירושלים", haifa: "חיפה", center: "מרכז", south: "דרום", north: "צפון" };
const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
const opt = (v) => (v === undefined || v === null || v === "" ? null : Number(v));

export function compute(inputs = {}) {
  const errors = [];
  const gross = Number(inputs.gross_monthly);
  const region = inputs.region || "center";
  const owned = inputs.employer_owned_housing === true || inputs.employer_owned_housing === "true";
  const insCost = opt(inputs.employer_insurance_cost);
  const year = inputs.seniority_year === undefined || inputs.seniority_year === "" || inputs.seniority_year === null ? 1 : Number(inputs.seniority_year);
  const claimed = opt(inputs.total_deductions_claimed);

  if (!Number.isFinite(gross) || gross <= 0) errors.push("יש להזין שכר חודשי ברוטו גדול מאפס.");
  if (!REGIONS[region]) errors.push("יש לבחור אזור מגורים.");
  if (insCost !== null && (!Number.isFinite(insCost) || insCost < 0)) errors.push("עלות הביטוח הרפואי צריכה להיות מספר חיובי.");
  if (!Number.isInteger(year) || year < 1 || year > 60) errors.push("שנת העבודה צריכה להיות מספר שלם מ-1 ומעלה.");
  if (claimed !== null && (!Number.isFinite(claimed) || claimed < 0)) errors.push("סך הניכויים צריך להיות מספר חיובי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const warnings = [];
  const minOk = gross + 0.5 >= CONFIG.minimumMonthlyWage;
  steps.push(`שכר מינימום חודשי ל-${CONFIG.year} (מ-1.4.2026): ${money(CONFIG.minimumMonthlyWage)}. השכר שהוזן ${minOk ? "אינו נמוך ממנו" : "נמוך ממנו"}.`);
  if (!minOk) warnings.push("השכר נמוך משכר המינימום למשרה מלאה.");

  const housing = CONFIG.housingMaxByRegion[region] * (owned ? CONFIG.employerOwnedHousingFactor : 1);
  steps.push(`ניכוי מרבי למגורים באזור ${REGIONS[region]}: ${money(housing)}${owned ? " (מחצית, כי הדירה בבעלות המעסיק)" : ""}.`);
  const medical = insCost !== null ? Math.min(CONFIG.medicalInsuranceMax, insCost / 2) : CONFIG.medicalInsuranceMax;
  steps.push(`ניכוי מרבי לביטוח רפואי: ${money(medical)} (מחצית מעלות הביטוח למעסיק או ${money(CONFIG.medicalInsuranceMax)}, הנמוך מביניהם).`);
  steps.push(`ניכוי מרבי להוצאות נלוות (מים, חשמל, ארנונה): ${money(CONFIG.utilitiesMax)}.`);
  const itemsTotal = housing + medical + CONFIG.utilitiesMax;
  const cap = gross * CONFIG.totalDeductionCapRate;
  const permitted = Math.min(itemsTotal, cap);
  steps.push(`סך הניכויים לא יעלה על 25% מהשכר (${money(cap)}), למעט בחודש העבודה האחרון. המרבי המותר כאן: ${money(permitted)}.`);
  if (claimed !== null && claimed > permitted + 0.5) warnings.push(`הניכויים בתלוש (${money(claimed)}) גבוהים מהמרבי המותר לפי הנתונים (${money(permitted)}).`);

  const vac = CONFIG.vacationDays(year);
  const rec = CONFIG.recuperationDays(year);
  steps.push(`חופשה שנתית בשנת העבודה ה-${year}: ${vac} ימים קלנדריים בתשלום.`);
  steps.push(rec === null ? "ימי הבראה אחרי השנה העשירית: יש לבדוק מול צו ההרחבה." : `ימי הבראה בשנת העבודה ה-${year}: ${rec}.`);
  steps.push(`מנוחה שבועית: לפחות ${CONFIG.weeklyRestHours} שעות רצופות למטפל שגר אצל המטופל. ימי חג: עד ${CONFIG.holidaysPerYear} בשנה. ימי מחלה: ${CONFIG.sickDaysPerMonth} לכל חודש, עד ${CONFIG.sickDaysMax}.`);

  return {
    outputs: {
      minimum_wage_ok: minOk,
      max_housing_deduction: r2(housing),
      max_medical_deduction: r2(medical),
      max_utilities_deduction: CONFIG.utilitiesMax,
      max_total_deductions: r2(permitted),
      vacation_days: vac,
      recuperation_days: rec,
      warnings,
    },
    steps,
  };
}
