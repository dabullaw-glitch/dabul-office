// מחשבון גמר חשבון בסיום עבודה - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// נתונים מעודכנים ל-2026. ראו final-settlement.json (sources, todo_verify).

export const CONFIG = {
  year: 2026,
  // מחלק לחישוב ערך יום עבודה: שבוע של 5 ימים או 6 ימים (כמו במחשבון ימי החופשה)
  dailyDivisor: { 5: 21.67, 6: 25 },
  // ערך יום הבראה במגזר הפרטי, 2026 (צו הרחבה שפורסם ברשומות 18.8.2026)
  recuperationDayValue: 451.5,
  // תקרת הפטור ממס על פיצויים לכל שנת עבודה, 2026
  severanceTaxExemptPerYear: 13750,
  minYearsForSeverance: 1,
};

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
function fullMonthsBetween(a, b) {
  const end = new Date(b.getTime() + 86400000);
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
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
const num = (v) => (v === undefined || v === null || v === "" ? 0 : Number(v));

export function compute(inputs = {}) {
  const errors = [];
  const start = parseDate(inputs.start_date);
  const end = parseDate(inputs.end_date);
  const salary = Number(inputs.monthly_salary);
  const week = String(inputs.week_type || "5");
  const reason = inputs.termination_reason || "dismissal";
  const unpaidDays = num(inputs.unpaid_workdays);
  const vacDays = num(inputs.unused_vacation_days);
  const recDays = num(inputs.unpaid_recuperation_days);
  const notice = num(inputs.notice_pay_in_lieu);
  const fund = num(inputs.severance_fund_balance);
  const s14 = inputs.section14 === true || inputs.section14 === "true";
  const other = num(inputs.other_amounts);

  if (!start) errors.push("יש להזין תאריך תחילת עבודה תקין.");
  if (!end) errors.push("יש להזין יום עבודה אחרון תקין.");
  if (start && end && end < start) errors.push("יום העבודה האחרון מוקדם מתאריך התחילה.");
  if (!Number.isFinite(salary) || salary <= 0) errors.push("יש להזין שכר חודשי גדול מאפס.");
  if (!["5", "6"].includes(week)) errors.push("יש לבחור שבוע עבודה של 5 או 6 ימים.");
  if (!["dismissal", "resignation_entitled", "resignation_not_entitled"].includes(reason)) errors.push("סיבת הסיום אינה מוכרת.");
  for (const [v, label] of [[unpaidDays, "ימי עבודה שלא שולמו"], [vacDays, "ימי חופשה"], [recDays, "ימי הבראה"], [notice, "תמורת הודעה מוקדמת"], [fund, "יתרת פיצויים בקופה"], [other, "תשלומים נוספים"]]) {
    if (!Number.isFinite(v) || v < 0) errors.push(`השדה "${label}" צריך להיות מספר חיובי או ריק.`);
  }
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const daily = salary / CONFIG.dailyDivisor[week];
  steps.push(`ערך יום עבודה: ${money(salary)} חלקי ${CONFIG.dailyDivisor[week]} = ${money(daily)}.`);

  const lastSalary = unpaidDays * daily;
  if (unpaidDays > 0) steps.push(`שכר על ימי עבודה שטרם שולמו: ${unpaidDays} × ${money(daily)} = ${money(lastSalary)}.`);

  const vacation = vacDays * daily;
  if (vacDays > 0) steps.push(`פדיון חופשה: ${vacDays} ימים × ${money(daily)} = ${money(vacation)}. בסיום עבודה החוק מחייב לפדות את יתרת החופשה שנצברה.`);

  const recup = recDays * CONFIG.recuperationDayValue;
  if (recDays > 0) steps.push(`דמי הבראה שלא שולמו: ${recDays} ימים × ${money(CONFIG.recuperationDayValue)} (ערך יום במגזר הפרטי, ${CONFIG.year}) = ${money(recup)}. בהיקף משרה חלקי יש להקטין באופן יחסי.`);

  const months = fullMonthsBetween(start, end);
  const after = addMonths(start, months);
  const extraDays = Math.max(0, Math.round((end.getTime() + 86400000 - after.getTime()) / 86400000));
  const years = months / 12 + extraDays / 365;
  steps.push(`ותק: ${Math.floor(months / 12)} שנים, ${months % 12} חודשים ו-${extraDays} ימים (כ-${years.toFixed(3)} שנים).`);

  let severance = 0;
  if (years < CONFIG.minYearsForSeverance) {
    steps.push("ותק של פחות משנה: ככלל אין זכאות לפיצויי פיטורים (יש חריגים).");
  } else if (reason === "resignation_not_entitled") {
    steps.push("התפטרות רגילה: ככלל אין חובה לשלם פיצויים, אך ייתכן שכספי הפיצויים שבקופה ישוחררו לפי ההסכם.");
  } else {
    severance = salary * years;
    steps.push(`פיצויי פיטורים: ${money(salary)} × ${years.toFixed(3)} = ${money(severance)}.`);
  }
  let employerSev = severance;
  if (severance > 0) {
    if (s14) {
      employerSev = 0;
      steps.push("סומן הסדר סעיף 14: ההפקדות לקופה באות במקום הפיצויים. אם ההפקדות היו חלקיות ייתכן שמגיעה השלמה.");
    } else if (fund > 0) {
      employerSev = Math.max(0, severance - fund);
      steps.push(`יתרת הפיצויים בקופה (${money(fund)}) נזקפת על חשבון הפיצויים. השלמה מהמעסיק: ${money(employerSev)}.`);
    }
  }
  if (notice > 0) steps.push(`תמורת הודעה מוקדמת שהוזנה: ${money(notice)}. לחישוב אורך ההודעה ראו [[tool:notice-period]].`);
  if (other > 0) steps.push(`תשלומים נוספים שהוזנו: ${money(other)}.`);

  const total = lastSalary + vacation + recup + employerSev + notice + other;
  steps.push(`סך גמר החשבון המשוער מהמעסיק (ברוטו, לפני ניכויים): ${money(total)}.`);
  steps.push(`תקרת הפטור ממס על פיצויים ב-${CONFIG.year}: ${money(CONFIG.severanceTaxExemptPerYear)} לכל שנת עבודה. שאר הרכיבים חייבים במס ובניכויי חובה.`);

  return {
    outputs: {
      seniority_years: r2(years),
      unpaid_salary: r2(lastSalary),
      vacation_payout: r2(vacation),
      recuperation_payout: r2(recup),
      severance_total: r2(severance),
      employer_severance_balance: r2(employerSev),
      notice_pay: r2(notice),
      total_gross: r2(total),
    },
    steps,
  };
}
