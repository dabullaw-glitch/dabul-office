// בודק תלוש שכר בסיסי - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// נתונים מעודכנים ל-2026. ראו payslip-check.json (sources, todo_verify).

export const CONFIG = {
  year: 2026,
  // שכר מינימום חודשי למשרה מלאה, החל מ-1.4.2026 (ביטוח לאומי)
  minimumMonthlyWage: 6443.85,
  // שכר מינימום לשעה במשרה של 182 שעות בחודש, החל מ-1.4.2026
  minimumHourlyWage: 35.4,
  // שיעורי הפרשה לפנסיה לפי צו ההרחבה לפנסיה חובה (מ-2017)
  pension: { employee: 0.06, employerBenefits: 0.065, employerSeverance: 0.06 },
  // תקרת השכר להפרשות (השכר הממוצע במשק) - לא אומתה ל-2026, ולכן לא מופעלת
  pensionWageCap: null,
  waitingMonthsNew: 6,
  waitingMonthsInsured: 3,
  payslipLatestDay: 9,
  tolerance: 1,
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
const opt = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
const yes = (v) => v === true || v === "true";

const FIELDS = [
  ["shows_employer_details", "פרטי המעסיק (שם, מספר מזהה וכתובת)"],
  ["shows_seniority", "תאריך תחילת העבודה או הוותק"],
  ["shows_hours", "מספר ימי העבודה או שעות העבודה בחודש"],
  ["shows_deductions_detail", "פירוט כל ניכוי (מס הכנסה, ביטוח לאומי, פנסיה)"],
  ["shows_vacation_balance", "יתרת ימי החופשה"],
  ["shows_sick_balance", "יתרת ימי המחלה"],
];

export function compute(inputs = {}) {
  const errors = [];
  const gross = Number(inputs.base_salary);
  const jobPct = opt(inputs.job_percent) ?? 100;
  const months = Number(inputs.months_employed);
  const empDed = opt(inputs.employee_pension);
  const erBen = opt(inputs.employer_pension);
  const erSev = opt(inputs.employer_severance);
  const day = opt(inputs.payslip_day);
  const insured = yes(inputs.previously_insured);

  if (!Number.isFinite(gross) || gross <= 0) errors.push("יש להזין שכר יסוד חודשי גדול מאפס.");
  if (!Number.isFinite(jobPct) || jobPct <= 0 || jobPct > 100) errors.push("היקף משרה צריך להיות בין 1 ל-100 אחוז.");
  if (!Number.isFinite(months) || months < 0) errors.push("יש להזין מספר חודשי עבודה (0 ומעלה).");
  for (const [v, l] of [[empDed, "ניכוי פנסיה מהעובד"], [erBen, "הפרשת מעסיק לתגמולים"], [erSev, "הפרשת מעסיק לפיצויים"]]) {
    if (v !== null && (!Number.isFinite(v) || v < 0)) errors.push(`השדה "${l}" צריך להיות מספר חיובי או ריק.`);
  }
  if (day !== null && (!Number.isInteger(day) || day < 1 || day > 31)) errors.push("יום קבלת התלוש צריך להיות בין 1 ל-31.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const issues = [];
  const steps = [];

  const minForJob = CONFIG.minimumMonthlyWage * (jobPct / 100);
  steps.push(`שכר מינימום ל-${CONFIG.year} (מ-1.4.2026): ${money(CONFIG.minimumMonthlyWage)} למשרה מלאה, כלומר ${money(minForJob)} בהיקף משרה של ${jobPct}%.`);
  if (gross + CONFIG.tolerance < minForJob) issues.push(`שכר היסוד (${money(gross)}) נמוך משכר המינימום להיקף המשרה (${money(minForJob)}).`);

  const base = CONFIG.pensionWageCap ? Math.min(gross, CONFIG.pensionWageCap) : gross;
  const waiting = insured ? CONFIG.waitingMonthsInsured : CONFIG.waitingMonthsNew;
  const pensionDue = months >= waiting;
  const exp = {
    employee: base * CONFIG.pension.employee,
    employer: base * CONFIG.pension.employerBenefits,
    severance: base * CONFIG.pension.employerSeverance,
  };
  if (!pensionDue) {
    steps.push(`הפרשות לפנסיה מתחילות אחרי ${waiting} חודשי עבודה${insured ? " (ולמי שהיה מבוטח קודם, רטרואקטיבית מהיום הראשון)" : ""}. עדיין לא חלפה התקופה.`);
  } else {
    steps.push(`הפרשות מינימום צפויות על שכר של ${money(base)}: עובד 6% (${money(exp.employee)}), מעסיק לתגמולים 6.5% (${money(exp.employer)}), מעסיק לפיצויים 6% (${money(exp.severance)}).`);
    if (empDed === null && erBen === null && erSev === null) {
      issues.push("לא הוזנו הפרשות לפנסיה. אם התלוש אינו מציג הפרשות אחרי תקופת ההמתנה, יש לברר.");
    } else {
      if (erBen !== null && erBen + CONFIG.tolerance < exp.employer) issues.push(`הפרשת המעסיק לתגמולים (${money(erBen)}) נמוכה מ-6.5% (${money(exp.employer)}).`);
      if (erSev !== null && erSev + CONFIG.tolerance < exp.severance) issues.push(`הפרשת המעסיק לפיצויים (${money(erSev)}) נמוכה מ-6% (${money(exp.severance)}).`);
      if (empDed !== null && empDed > exp.employee + CONFIG.tolerance) steps.push(`ניכוי הפנסיה מהעובד (${money(empDed)}) גבוה מ-6%. זה תקין אם בחרתם בהפרשה גבוהה יותר או אם ההסכם קובע זאת.`);
      if (empDed !== null && empDed + CONFIG.tolerance < exp.employee) steps.push(`ניכוי הפנסיה מהעובד (${money(empDed)}) נמוך מ-6%. כדאי לבדוק שהמעסיק משלים את חלקו כנדרש.`);
    }
  }

  if (day !== null) {
    if (day > CONFIG.payslipLatestDay) issues.push(`התלוש התקבל ביום ${day} לחודש. החוק מחייב למסור תלוש עד היום התשיעי שאחרי מועד תשלום השכר.`);
    else steps.push("מועד קבלת התלוש תקין (עד היום התשיעי).");
  }

  for (const [id, label] of FIELDS) {
    if (inputs[id] === false || inputs[id] === "false") issues.push(`חסר בתלוש: ${label}.`);
  }

  steps.push(issues.length ? `נמצאו ${issues.length} נקודות לבדיקה.` : "לא נמצאו בעיות בבדיקות הבסיסיות.");
  return {
    outputs: {
      issues,
      issues_count: issues.length,
      minimum_wage_for_position: r2(minForJob),
      expected_employee_pension: pensionDue ? r2(exp.employee) : 0,
      expected_employer_pension: pensionDue ? r2(exp.employer) : 0,
      expected_employer_severance: pensionDue ? r2(exp.severance) : 0,
    },
    steps,
  };
}
