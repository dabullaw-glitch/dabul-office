// מחשבון ביטול עסקת מכר מרחוק (חוק הגנת הצרכן) - פוליבוס
// כללים: ביטול בתוך 14 ימים מהמאוחר מבין קבלת המוצר וקבלת מסמך פרטי העסקה.
// דמי ביטול: 5% ממחיר העסקה או 100 ₪, הנמוך מביניהם, רק בביטול שאינו בגלל הפרה של העוסק.
// אזרח ותיק, אדם עם מוגבלות ועולה חדש: עד 4 חודשים, אם העסקה כללה שיחה בין העוסק לצרכן.
// החזר כספי: בתוך 14 ימים מקבלת הודעת הביטול.

export const FEE_RATE = 0.05;
export const FEE_CAP = 100;
export const WINDOW_DAYS = 14;
export const PROTECTED_MONTHS = 4;

const DAY = 86400000;
const parse = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
};
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const he = (t) => iso(t).split("-").reverse().join(".");
const addMonths = (t, m) => {
  const d = new Date(t);
  const day = d.getUTCDate();
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + m, 1));
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(day, last));
  return r.getTime();
};
const fmt = (n) => (Math.round(n * 100) / 100).toLocaleString("he-IL") + " ₪";

export function compute(inputs = {}) {
  const errors = [];
  const price = Number(inputs.price);
  const received = parse(inputs.received_date);
  const details = inputs.details_date ? parse(inputs.details_date) : received;
  const cancel = parse(inputs.cancel_date);
  const reason = inputs.reason || "change_of_mind";
  if (!(price > 0)) errors.push("יש להזין מחיר עסקה חיובי.");
  if (Number.isNaN(received) || Number.isNaN(cancel) || Number.isNaN(details)) errors.push("יש להזין תאריכים תקינים.");
  if (!["change_of_mind", "business_breach"].includes(reason)) errors.push("סיבת הביטול אינה מוכרת.");
  if (errors.length) return { outputs: null, steps: [], errors };
  if (cancel < Math.min(received, details)) {
    return { outputs: null, steps: [], errors: ["תאריך הביטול מוקדם מתאריך הקבלה."] };
  }

  const steps = [];
  if (inputs.excluded_product === true) {
    steps.push("סימנתם שהמוצר שייך לסוג שהחוק מחריג מזכות הביטול (למשל מוצר מתכלה או מוצר שיוצר במיוחד עבורכם). במקרה כזה בדרך כלל אין זכות לבטל מטעם זה.");
    return { outputs: { can_cancel: false, deadline: null, fee: 0, refund: 0, refund_due: null }, steps };
  }

  const start = Math.max(received, details);
  const extended = inputs.protected_consumer === true && inputs.phone_call === true;
  const deadline = extended ? addMonths(start, PROTECTED_MONTHS) : start + WINDOW_DAYS * DAY;
  steps.push(`מועד תחילת הספירה: ${he(start)} (המאוחר מבין קבלת המוצר וקבלת מסמך הפרטים).`);
  steps.push(extended
    ? `סימנתם צרכן מוגן ושיחה עם העוסק: חלון הביטול הוא 4 חודשים, עד ${he(deadline)}.`
    : `חלון הביטול הוא 14 ימים, עד ${he(deadline)}.`);
  if (inputs.protected_consumer === true && inputs.phone_call !== true) {
    steps.push("ההארכה ל-4 חודשים חלה רק כשהעסקה כללה שיחה בין העוסק לצרכן, ולכן חושב חלון רגיל.");
  }

  const canCancel = cancel <= deadline;
  if (!canCancel && reason === "change_of_mind") {
    steps.push(`תאריך הביטול (${he(cancel)}) אחרי סוף החלון. ביטול בגלל שינוי דעת כבר אינו מוקנה לפי כללים אלה.`);
    return { outputs: { can_cancel: false, deadline: iso(deadline), fee: 0, refund: 0, refund_due: null }, steps };
  }
  if (!canCancel && reason === "business_breach") {
    steps.push("חלון הביטול הרגיל חלף, אך בהפרה של העוסק (פגם, אי התאמה או איחור באספקה) ייתכנו זכויות נוספות לפי דיני החוזים. החישוב שלהלן מניח ביטול בשל הפרה.");
  }

  let fee = 0;
  if (reason === "change_of_mind") {
    const pctFee = price * FEE_RATE;
    fee = Math.min(pctFee, FEE_CAP);
    steps.push(`דמי ביטול מרביים: הנמוך מבין 5% (${fmt(pctFee)}) לבין 100 ₪, כלומר ${fmt(fee)}.`);
  } else {
    steps.push("ביטול בשל הפרה של העוסק: אין לגבות דמי ביטול.");
  }
  fee = Math.round(fee * 100) / 100;
  const refund = Math.round((price - fee) * 100) / 100;
  const due = cancel + WINDOW_DAYS * DAY;
  steps.push(`החזר צפוי: ${fmt(price)} פחות ${fmt(fee)} = ${fmt(refund)}, בתוך 14 ימים מקבלת הודעת הביטול (עד ${he(due)}, אם ההודעה נמסרה ב-${he(cancel)}).`);
  return {
    outputs: { can_cancel: true, deadline: iso(deadline), fee, refund, refund_due: iso(due) },
    steps,
  };
}
