// מחשבון פיצויי הלנת שכר והלנת פיצויי פיטורים - פוליבוס. מודול טהור.
// לפי חוק הגנת השכר, התשי"ח-1958 (סעיפים 17 ו-20). ראו late-wage-compensation.json.

export const CONFIG = {
  wage: { graceDays: 9, firstWeekRate: 0.05, nextWeekRate: 0.1 },
  severance: { graceDays: 15, linkageOnlyUntilDay: 30, monthlyAddOn: 0.2 },
  // הפרשי הצמדה למדד אינם מחושבים בכלי (דורשים נתוני מדד)
  includeLinkage: false,
};

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const kind = inputs.payment_type || "wage";
  const amount = Number(inputs.amount);
  const due = parseDate(inputs.due_date);
  const paid = parseDate(inputs.paid_date);
  if (!["wage", "severance"].includes(kind)) errors.push("יש לבחור סוג תשלום: שכר או פיצויי פיטורים.");
  if (!Number.isFinite(amount) || amount <= 0) errors.push("יש להזין סכום מולן גדול מאפס.");
  if (!due) errors.push("יש להזין את המועד שבו היה צריך לשלם.");
  if (!paid) errors.push("יש להזין את מועד התשלום בפועל (או את התאריך של היום אם טרם שולם).");
  if (due && paid && paid < due) errors.push("מועד התשלום מוקדם מהמועד הקובע.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const days = Math.round((paid - due) / 86400000);
  const steps = [`ימי איחור מהמועד הקובע: ${days}.`];
  let delayed = false;
  let comp = 0;

  if (kind === "wage") {
    const c = CONFIG.wage;
    if (days <= c.graceDays) {
      steps.push(`שכר נחשב מולן רק אם לא שולם עד היום התשיעי שאחרי המועד הקובע. התשלום בוצע ביום ${days}, ולכן אין פיצויי הלנה.`);
    } else {
      delayed = true;
      const weeks = Math.ceil(days / 7);
      const rate = c.firstWeekRate + c.nextWeekRate * (weeks - 1);
      comp = amount * rate;
      steps.push(`השכר מולן. הפיצוי נספר מהמועד הקובע: 5% בעד השבוע הראשון ו-10% בעד כל שבוע נוסף או חלק ממנו.`);
      steps.push(`${weeks} שבועות: 5% + ${weeks - 1} × 10% = ${Math.round(rate * 100)}% מהשכר המולן, כלומר ${money(comp)}.`);
      steps.push("החוק מאפשר גם חישוב חלופי (הפרשי הצמדה ותוספת של 20% לחודש), והעובד זכאי לגבוה מבין השניים. החישוב החלופי אינו מחושב כאן כי הוא דורש נתוני מדד.");
      steps.push("בית הדין לעבודה רשאי להפחית את הפיצוי או לבטלו, למשל בטעות כנה או בנסיבות שאינן בשליטת המעסיק. בפועל פיצוי מלא נפסק לעיתים רחוקות.");
    }
  } else {
    const c = CONFIG.severance;
    if (days <= c.graceDays) {
      steps.push(`פיצויי פיטורים שולמו בתוך ${c.graceDays} ימים מהמועד שבו היו אמורים להיות משולמים, ולכן אין פיצויי הלנה.`);
    } else if (days <= c.linkageOnlyUntilDay) {
      delayed = true;
      steps.push("פיצויים ששולמו בין היום ה-16 ליום ה-30 מזכים בהפרשי הצמדה בלבד. הכלי אינו מחשב הצמדה למדד, ולכן הסכום המוצג הוא 0.");
    } else {
      delayed = true;
      const months = days / 30;
      comp = amount * c.monthlyAddOn * months;
      steps.push(`איחור של יותר מ-30 ימים: הפרשי הצמדה ועוד 20% לכל חודש איחור (חלק יחסי לחלק מחודש). בלי הצמדה: ${money(amount)} × 20% × ${months.toFixed(2)} חודשים = ${money(comp)}.`);
      steps.push("הסכום אינו כולל הפרשי הצמדה למדד, ולכן הוא הערכת מינימום. בית הדין רשאי להפחית את הפיצוי.");
    }
  }
  steps.push("מועד להגשת תביעה: בתוך 60 ימים מהיום שבו התקבל התשלום המולן, או בתוך שנה אם טרם שולם (המוקדם מביניהם).");

  return {
    outputs: { days_late: days, is_delayed: delayed, compensation: r2(comp), total_with_compensation: r2(amount + comp) },
    steps,
  };
}
