// אומדן איזון משאבים בין בני זוג - פוליבוס. מודול טהור, ללא תלויות וללא רשת.
// לפי חוק יחסי ממון בין בני זוג, התשל"ג-1973, סעיפים 3 עד 6. ראו assets-balancing.json.

export const CONFIG = {
  lawStartDate: "1974-01-01", // ההסדר חל על מי שנישאו מיום זה
  shareRate: 0.5,
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
const n0 = (v) => (v === undefined || v === null || v === "" ? 0 : Number(v));

export function compute(inputs = {}) {
  const errors = [];
  const married = parseDate(inputs.marriage_date);
  const f = {
    aAssets: n0(inputs.a_assets), aExcluded: n0(inputs.a_excluded), aDebts: n0(inputs.a_debts),
    bAssets: n0(inputs.b_assets), bExcluded: n0(inputs.b_excluded), bDebts: n0(inputs.b_debts),
  };
  if (!married) errors.push("יש להזין תאריך נישואין תקין.");
  for (const [k, v] of Object.entries(f)) if (!Number.isFinite(v) || v < 0) errors.push(`ערך לא תקין בשדה ${k}.`);
  if (f.aExcluded > f.aAssets) errors.push("הנכסים המוחרגים של בן הזוג הראשון גבוהים מסך נכסיו.");
  if (f.bExcluded > f.bAssets) errors.push("הנכסים המוחרגים של בן הזוג השני גבוהים מסך נכסיו.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const applies = married >= parseDate(CONFIG.lawStartDate);
  if (!applies) {
    steps.push("בני זוג שנישאו לפני 1.1.1974 אינם כפופים להסדר איזון המשאבים שבחוק. חלוקת הרכוש נבחנת לפי הלכת השיתוף והדין הכללי. החישוב שלהלן להמחשה בלבד.");
  }
  const aNet = Math.max(0, f.aAssets - f.aExcluded - f.aDebts);
  const bNet = Math.max(0, f.bAssets - f.bExcluded - f.bDebts);
  steps.push(`בן הזוג הראשון: ${money(f.aAssets)} נכסים, פחות ${money(f.aExcluded)} מוחרגים, פחות ${money(f.aDebts)} חובות = ${money(aNet)} לאיזון.`);
  steps.push(`בן הזוג השני: ${money(f.bAssets)} נכסים, פחות ${money(f.bExcluded)} מוחרגים, פחות ${money(f.bDebts)} חובות = ${money(bNet)} לאיזון.`);
  const diff = Math.abs(aNet - bNet);
  const transfer = diff * CONFIG.shareRate;
  const payer = aNet > bNet ? "בן הזוג הראשון" : aNet < bNet ? "בן הזוג השני" : "אין";
  steps.push(transfer > 0
    ? `ההפרש ${money(diff)}. ${payer} חייב לאזן מחצית ההפרש: ${money(transfer)}, בעין, בכסף או בשווה כסף.`
    : "השווי לאיזון זהה, ולכן אין תשלום איזון.");
  steps.push("מוחרגים: נכסים מלפני הנישואין, מתנות וירושות, זכויות שלפי דין אינן ניתנות להעברה, ונכסים שבני הזוג הסכימו בכתב שלא לאזן. נכס מוחרג שעבר שיתוף עשוי לא להיות מוחרג.");
  return {
    outputs: { law_applies: applies, a_balanceable: r2(aNet), b_balanceable: r2(bNet), paying_spouse: payer, balancing_payment: r2(transfer) },
    steps,
  };
}
