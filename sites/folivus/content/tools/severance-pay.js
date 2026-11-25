// מחשבון פיצויי פיטורים - מודול טהור, ללא תלויות וללא רשת.
// נתונים מעודכנים ל-2026. ראו severance-pay.json (sources, todo_verify).

export const CONFIG = {
  year: 2026,
  // תקרת הפטור ממס על פיצויים לכל שנת עבודה, 2026 (סעיף 9(7א) לפקודת מס הכנסה)
  taxExemptCeilingPerYear: 13750,
  minYearsForEligibility: 1,
};

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}

function fullMonthsBetween(a, b) {
  // מספר חודשים מלאים מ-a עד b (כולל יום הסיום כיום עבודה)
  const end = new Date(b.getTime() + 86400000); // יום אחרי יום העבודה האחרון
  let months = (end.getUTCFullYear() - a.getUTCFullYear()) * 12 + (end.getUTCMonth() - a.getUTCMonth());
  if (end.getUTCDate() < a.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

function addMonths(d, n) {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return r;
}

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const start = parseDate(inputs.start_date);
  const end = parseDate(inputs.end_date);
  const salary = Number(inputs.last_monthly_salary);
  const reason = inputs.termination_reason || "dismissal";
  const s14 = inputs.section14 === true || inputs.section14 === "true";
  const fund = inputs.fund_balance === undefined || inputs.fund_balance === "" || inputs.fund_balance === null ? null : Number(inputs.fund_balance);

  if (!start) errors.push("יש להזין תאריך תחילת עבודה תקין.");
  if (!end) errors.push("יש להזין תאריך סיום עבודה תקין.");
  if (start && end && end < start) errors.push("תאריך הסיום מוקדם מתאריך התחילה.");
  if (!Number.isFinite(salary) || salary <= 0) errors.push("יש להזין שכר חודשי אחרון גדול מאפס.");
  if (fund !== null && (!Number.isFinite(fund) || fund < 0)) errors.push("יתרת הפיצויים בקופה צריכה להיות מספר חיובי או ריק.");
  if (!["dismissal", "resignation_entitled", "resignation_not_entitled"].includes(reason)) errors.push("סיבת סיום לא מוכרת.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const months = fullMonthsBetween(start, end);
  const afterMonths = addMonths(start, months);
  const extraDays = Math.max(0, Math.round((end.getTime() + 86400000 - afterMonths.getTime()) / 86400000));
  const years = months / 12 + extraDays / 365;
  steps.push(`ותק: ${Math.floor(months / 12)} שנים, ${months % 12} חודשים ו-${extraDays} ימים, כלומר כ-${years.toFixed(3)} שנים.`);

  const eligibleBySeniority = years >= CONFIG.minYearsForEligibility;
  const eligibleByReason = reason !== "resignation_not_entitled";
  let eligibleText;
  let severance = 0;

  if (!eligibleBySeniority) {
    eligibleText = "לא זכאי לפי החוק (ותק של פחות משנה)";
    steps.push("החוק מזכה בפיצויים רק לאחר שנת עבודה אחת לפחות אצל אותו מעסיק או באותו מקום עבודה. יש חריגים (למשל עובדים עונתיים, או פיטורים סמוך לסיום השנה כדי להתחמק מתשלום), ולכן כדאי לבדוק את המקרה.");
  } else if (!eligibleByReason) {
    eligibleText = "ככלל לא זכאי (התפטרות רגילה)";
    steps.push("בהתפטרות שאינה בנסיבות המזכות לפי החוק, אין חובה לשלם פיצויים. ואולם אם חל הסדר סעיף 14 או שקיימת יתרה בקופה, ייתכן שהכספים שנצברו ישוחררו לעובד.");
  } else {
    eligibleText = reason === "dismissal" ? "זכאי (פיטורים)" : "זכאי (התפטרות בנסיבות המזכות)";
    severance = salary * years;
    steps.push(`פיצויים לפי החוק: שכר חודשי אחרון ${money(salary)} כפול ${years.toFixed(3)} שנים = ${money(severance)}.`);
  }

  let employerBalance = severance;
  if (severance > 0) {
    if (s14) {
      employerBalance = 0;
      steps.push("סומן שחל הסדר סעיף 14: הפקדות מלאות לרכיב הפיצויים בקופה באות במקום פיצויי הפיטורים לתקופה שבה הופקדו. אם ההפקדות היו חלקיות (פחות מ-8.33% מהשכר) או לא על כל השכר, ייתכן שמגיעה השלמה.");
    } else if (fund !== null) {
      employerBalance = Math.max(0, severance - fund);
      steps.push(`בלי סעיף 14: יתרת רכיב הפיצויים בקופה (${money(fund)}) נזקפת על חשבון הפיצויים, והמעסיק משלים את ההפרש: ${money(employerBalance)}.`);
    } else {
      steps.push("לא הוזנה יתרה בקופה. אם המעסיק הפריש לרכיב פיצויים, הסכום שבקופה ייזקף על חשבון הפיצויים והמעסיק ישלים את ההפרש.");
    }
  }

  const ceiling = CONFIG.taxExemptCeilingPerYear * years;
  steps.push(`תקרת הפטור ממס ל-${CONFIG.year}: ${money(CONFIG.taxExemptCeilingPerYear)} לכל שנת עבודה, כלומר עד כ-${money(ceiling)} בסך הכול. הפטור בפועל תלוי בתנאים נוספים ונבדק מול פקיד השומה.`);

  return {
    outputs: {
      seniority_years: r2(years),
      eligibility: eligibleText,
      severance_amount: r2(severance),
      employer_balance: r2(employerBalance),
      tax_exempt_ceiling: r2(ceiling),
    },
    steps,
  };
}
