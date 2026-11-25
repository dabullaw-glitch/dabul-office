// מחשבון דמי חגים - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// לפי סעיף 7 לצו ההרחבה (הסכם מסגרת 2000), נכון ל-2026. ראו holiday-pay.json.

export const CONFIG = {
  maxHolidaysPerYear: 9,
  minMonthsForHourly: 3,
  // תשעת ימי החג לפי צו ההרחבה (העובד רשאי לבחור את חגי דתו)
  holidays: [
    { name: "ראש השנה", days: 2 },
    { name: "יום הכיפורים", days: 1 },
    { name: "סוכות (החג הראשון ושמחת תורה)", days: 2 },
    { name: "פסח (החג הראשון והשביעי)", days: 2 },
    { name: "שבועות", days: 1 },
    { name: "יום העצמאות", days: 1 },
  ],
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const payType = inputs.pay_type || "hourly_daily";
  const months = Number(inputs.seniority_months);
  const count = Number(inputs.holidays_on_workdays);
  const adjacent = !(inputs.worked_adjacent_days === false || inputs.worked_adjacent_days === "false");
  const daily = inputs.daily_wage === undefined || inputs.daily_wage === "" || inputs.daily_wage === null ? null : Number(inputs.daily_wage);

  if (!["monthly", "hourly_daily"].includes(payType)) errors.push("יש לבחור אופן העסקה: חודשי או שעתי/יומי.");
  if (!Number.isFinite(months) || months < 0) errors.push("יש להזין ותק בחודשים (0 ומעלה).");
  if (!Number.isInteger(count) || count < 0 || count > CONFIG.maxHolidaysPerYear) errors.push(`מספר ימי החג צריך להיות מספר שלם בין 0 ל-${CONFIG.maxHolidaysPerYear}.`);
  if (daily !== null && (!Number.isFinite(daily) || daily < 0)) errors.push("שכר יומי צריך להיות מספר חיובי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  steps.push(`צו ההרחבה מזכה בתשלום עד ${CONFIG.maxHolidaysPerYear} ימי חג בשנה: ${CONFIG.holidays.map((h) => `${h.name} (${h.days})`).join(", ")}. עובד רשאי לבחור במקומם את חגי דתו.`);

  let eligibility;
  let paidDays = 0;
  let amount = null;
  if (payType === "monthly") {
    eligibility = "זכאי מהיום הראשון (שכר חודשי)";
    paidDays = count;
    steps.push("עובד חודשי זכאי לתשלום על ימי החג מיום העבודה הראשון. בפועל אין תשלום נפרד: אסור להפחית משכרו החודשי בגלל ימי החג.");
    if (daily !== null) {
      amount = 0;
      steps.push(`שווי ימי החג שכלולים בשכר החודשי: ${count} × ${money(daily)} = ${money(count * daily)}. סכום זה אינו תשלום נוסף.`);
    }
  } else if (months < CONFIG.minMonthsForHourly) {
    eligibility = "לא זכאי עדיין (פחות מ-3 חודשי עבודה)";
    steps.push(`עובד שעתי או יומי זכאי לדמי חגים רק אחרי ${CONFIG.minMonthsForHourly} חודשי עבודה במקום העבודה.`);
    amount = 0;
  } else if (!adjacent) {
    eligibility = "ייתכן שלא זכאי (היעדרות ביום שלפני החג או שאחריו)";
    steps.push("תנאי לזכאות: העובד עבד ביום שלפני החג וביום שאחריו, אלא אם נעדר בהסכמת המעסיק. היעדרות בהסכמה (למשל חופשה מאושרת) לרוב אינה שוללת את הזכאות.");
    amount = 0;
  } else {
    eligibility = "זכאי (עובד שעתי או יומי)";
    paidDays = count;
    steps.push("עובד שעתי או יומי זכאי לדמי חג על חג שחל ביום שבו היה עובד בדרך כלל. חג שחל ביום שישי או בשבת אינו מזכה בתשלום, אלא אם נקבע אחרת בהסכם.");
    if (daily !== null) {
      amount = count * daily;
      steps.push(`דמי חגים: ${count} ימים × ${money(daily)} = ${money(amount)}. השכר היומי הוא השכר הרגיל ליום עבודה, בלי דמי נסיעה.`);
    } else {
      steps.push("להצגת סכום יש להזין שכר יומי רגיל.");
    }
  }

  return {
    outputs: { eligibility, paid_days: paidDays, amount: amount === null ? null : r2(amount) },
    steps,
  };
}
