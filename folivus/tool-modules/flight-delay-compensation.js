// מחשבון זכויות בעיכוב או ביטול טיסה לפי חוק שירותי תעופה (פיצוי ועזרה בשל ביטול טיסה
// או שינוי בתנאיה), התשע"ב-2012 - פוליבוס. מודול טהור.

export const CONFIG = {
  // סכומי הפיצוי לפי התוספת הראשונה מתעדכנים ב-1 בינואר בכל שנה. סכומי 2026 לא אומתו ממקור רשמי.
  compensationByBand: null, // { short: ?, medium: ?, long: ? }
  bands: [
    { id: "short", maxKm: 2000, reductionHours: 2 },
    { id: "medium", maxKm: 4500, reductionHours: 3 },
    { id: "long", maxKm: Infinity, reductionHours: 4 },
  ],
  assistanceFromHours: 2,
  refundFromHours: 5,
  cancellationFromHours: 8, // המראה באיחור של 8 שעות לפחות נחשבת ביטול
  refundPaymentDays: 21,
};

const BAND_LABEL = { short: "עד 2,000 ק\"מ", medium: "2,000 עד 4,500 ק\"מ", long: "מעל 4,500 ק\"מ" };
const r2 = (x) => Math.round(x * 100) / 100;

export function compute(inputs = {}, cfg = CONFIG) {
  const errors = [];
  const km = Number(inputs.distance_km);
  const event = inputs.event_type || "delay";
  const delay = Number(inputs.delay_hours ?? 0);
  const notice = inputs.notice_days === undefined || inputs.notice_days === "" || inputs.notice_days === null ? null : Number(inputs.notice_days);
  const exempt = inputs.extraordinary === true || inputs.extraordinary === "true";
  const altAccepted = inputs.alternative_accepted === true || inputs.alternative_accepted === "true";
  const arrDelay = Number(inputs.arrival_delay_hours ?? 0);
  const altDep = Number(inputs.alternative_departure_earlier_hours ?? 0);
  if (!Number.isFinite(km) || km <= 0) errors.push("יש להזין את מרחק הטיסה בק\"מ.");
  if (!["delay", "cancellation"].includes(event)) errors.push("יש לבחור עיכוב או ביטול.");
  if (event === "delay" && (!Number.isFinite(delay) || delay < 0)) errors.push("יש להזין את שעות העיכוב בהמראה.");
  if (notice !== null && (!Number.isFinite(notice) || notice < 0)) errors.push("ימי ההודעה מראש צריכים להיות מספר חיובי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const band = cfg.bands.find((b) => km <= b.maxKm);
  steps.push(`מרחק ${km} ק"מ: קטגוריית פיצוי ${BAND_LABEL[band.id]}.`);
  const isCancel = event === "cancellation" || delay >= cfg.cancellationFromHours;
  const rights = [];
  if (event === "delay" && delay >= cfg.assistanceFromHours) rights.push("שירותי סיוע: מזון ומשקאות ואמצעי תקשורת (מעיכוב של שעתיים).");
  if ((event === "delay" && delay >= cfg.refundFromHours) || isCancel) rights.push(`בחירה בין החזר כספי לכרטיס חלופי. החזר כספי ישולם בתוך ${cfg.refundPaymentDays} ימים מבקשה בכתב.`);
  if (isCancel) rights.push("אם הטיסה החלופית למחרת: גם בית מלון והסעות.");
  if (event === "delay" && delay >= cfg.cancellationFromHours) steps.push("המראה באיחור של 8 שעות לפחות נחשבת ביטול טיסה לפי החוק.");

  let comp = false;
  let reason = "";
  if (!isCancel) {
    reason = "עיכוב של פחות מ-8 שעות אינו מזכה בפיצוי כספי לפי החוק, אלא בשירותי סיוע ובהחזר או בכרטיס חלופי לפי משך העיכוב.";
  } else if (exempt) {
    reason = "המפעיל טוען לנסיבות מיוחדות שאינן בשליטתו, שביתה מוגנת או הימנעות מחילול שבת. אם יוכיח זאת, הוא פטור מפיצוי כספי (אך לא מהחזר ומשירותי סיוע).";
  } else if (notice !== null && notice >= 14) {
    reason = "הודעה על הביטול ניתנה 14 ימים לפחות לפני הטיסה, ולכן אין פיצוי כספי.";
  } else if (notice !== null && notice >= 7 && altAccepted && altDep <= 2 && arrDelay <= 4) {
    reason = "הודעה ניתנה 7 עד 14 ימים מראש עם טיסה חלופית שהמריאה עד שעתיים לפני המועד ונחתה עד 4 שעות אחריו, ולכן אין פיצוי כספי.";
  } else if (notice !== null && notice < 7 && altAccepted && altDep <= 1 && arrDelay <= 2) {
    reason = "הודעה ניתנה פחות מ-7 ימים מראש עם טיסה חלופית שהמריאה עד שעה לפני המועד ונחתה עד שעתיים אחריו, ולכן אין פיצוי כספי.";
  } else {
    comp = true;
    reason = "הטיסה נחשבת מבוטלת ולא נמצא פטור: זכאות לפיצוי כספי לפי התוספת הראשונה.";
  }
  steps.push(reason);

  let halved = false;
  if (comp && altAccepted && arrDelay <= band.reductionHours) {
    halved = true;
    steps.push(`התקבלה טיסה חלופית שהגיעה ליעד באיחור של עד ${band.reductionHours} שעות, ולכן המפעיל רשאי להפחית את הפיצוי במחצית.`);
  }
  let amount = null;
  if (comp) {
    const table = cfg.compensationByBand;
    if (table && Number.isFinite(table[band.id])) {
      amount = r2(table[band.id] * (halved ? 0.5 : 1));
      steps.push(`פיצוי כספי: ${amount.toLocaleString("en-US")} ₪.`);
    } else {
      steps.push("הסכום לכל קטגוריה מתעדכן ב-1 בינואר בכל שנה. הכלי אינו מציג סכום עד שיאומת מול פרסום רשמי; בדקו את הסכום העדכני בהודעת הזכויות של חברת התעופה.");
    }
  }
  return {
    outputs: { distance_band: BAND_LABEL[band.id], treated_as_cancellation: isCancel, rights, compensation_due: comp, compensation_halved: halved, compensation_amount: amount },
    steps,
  };
}
