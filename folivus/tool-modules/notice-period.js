// מחשבון הודעה מוקדמת לפיטורים ולהתפטרות - מודול טהור.
// לפי חוק הודעה מוקדמת לפיטורים ולהתפטרות, התשס"א-2001. נכון ל-2026.

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const iso = (d) => d.toISOString().slice(0, 10);
const heDate = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;

function fullMonthsBetween(a, b) {
  let months = (b.getUTCFullYear() - a.getUTCFullYear()) * 12 + (b.getUTCMonth() - a.getUTCMonth());
  if (b.getUTCDate() < a.getUTCDate()) months -= 1;
  return Math.max(0, months);
}
function addMonths(d, n) {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const lastDay = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return r;
}
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

export function compute(inputs = {}) {
  const errors = [];
  const payType = inputs.pay_type || "monthly";
  const start = parseDate(inputs.start_date);
  const notice = parseDate(inputs.notice_date);
  const salary = inputs.monthly_salary === undefined || inputs.monthly_salary === "" || inputs.monthly_salary === null ? null : Number(inputs.monthly_salary);
  if (!["monthly", "hourly_daily"].includes(payType)) errors.push("סוג שכר לא מוכר.");
  if (!start) errors.push("יש להזין תאריך תחילת עבודה תקין.");
  if (!notice) errors.push("יש להזין את תאריך מסירת ההודעה.");
  if (start && notice && notice < start) errors.push("תאריך ההודעה מוקדם מתאריך תחילת העבודה.");
  if (salary !== null && (!Number.isFinite(salary) || salary < 0)) errors.push("השכר צריך להיות מספר חיובי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const m = fullMonthsBetween(start, notice);
  steps.push(`ותק במועד מסירת ההודעה: ${m} חודשים מלאים (חודש חלקי אינו נספר).`);

  let days = null; // null = חודש קלנדרי מלא
  let label;
  if (payType === "monthly") {
    if (m < 6) {
      days = m;
      steps.push(`עובד במשכורת חודשית בחצי השנה הראשונה: יום אחד לכל חודש עבודה = ${days} ימים.`);
    } else if (m < 12) {
      days = 6 + 2.5 * (m - 6);
      steps.push(`עובד במשכורת חודשית בין חצי שנה לשנה: 6 ימים ועוד 2.5 ימים לכל חודש מלא אחרי החודש השישי (${m - 6} חודשים) = ${days} ימים.`);
    } else {
      steps.push("עובד במשכורת חודשית אחרי שנת עבודה: הודעה מוקדמת של חודש.");
    }
  } else {
    if (m < 12) {
      days = m;
      steps.push(`עובד בשכר שעתי או יומי בשנה הראשונה: יום אחד לכל חודש עבודה = ${days} ימים.`);
    } else if (m < 24) {
      days = 14 + Math.floor((m - 12) / 2);
      steps.push(`עובד בשכר שעתי או יומי בשנה השנייה: 14 ימים ועוד יום לכל חודשיים מלאים בשנה השנייה (${m - 12} חודשים) = ${days} ימים.`);
    } else if (m < 36) {
      days = 21 + Math.floor((m - 24) / 2);
      steps.push(`עובד בשכר שעתי או יומי בשנה השלישית: 21 ימים ועוד יום לכל חודשיים מלאים בשנה השלישית (${m - 24} חודשים) = ${days} ימים.`);
    } else {
      steps.push("עובד בשכר שעתי או יומי אחרי שלוש שנות עבודה: הודעה מוקדמת של חודש.");
    }
  }

  let lastDay;
  if (days === null) {
    lastDay = addDays(addMonths(notice, 1), 0);
    label = "חודש";
  } else {
    lastDay = addDays(notice, Math.ceil(days));
    label = `${days} ימים`;
  }
  if (days === 0) {
    steps.push("ותק של פחות מחודש מלא: לפי החוק אין עדיין זכות להודעה מוקדמת, אלא אם נקבע אחרת בהסכם.");
  } else {
    steps.push(`הימים נספרים כימים קלנדריים, החל מהיום שאחרי מסירת ההודעה. מועד משוער לסיום תקופת ההודעה: ${heDate(lastDay)}.`);
  }

  let payInLieu = null;
  if (salary !== null && salary > 0 && payType === "monthly") {
    payInLieu = days === null ? salary : Math.round((salary / 30) * days * 100) / 100;
    steps.push(`תמורת הודעה מוקדמת (אם המעסיק מוותר על העבודה בתקופה זו): ${days === null ? "שכר חודש מלא" : "שכר חודשי חלקי 30 כפול מספר הימים"} = ${payInLieu} ₪ בקירוב.`);
  }
  steps.push("החוק חל גם על התפטרות: עובד שמתפטר צריך לתת למעסיק הודעה מוקדמת באותו אורך.");

  return {
    outputs: {
      seniority_months: m,
      notice_length: label,
      notice_days: days === null ? 30 : days,
      notice_end_date: iso(lastDay),
      pay_in_lieu: payInLieu,
    },
    steps,
  };
}
