// מחשבון שכר נוטריון לפי תקנות הנוטריונים (שכר שירותים), התשל"ח-1978 - פוליבוס. מודול טהור.
// התעריפים ל-2026 לא אומתו ממקור רשמי ולכן CONFIG.fees = null. הלוגיקה מוכנה לטבלה מאומתת.

export const CONFIG = {
  year: 2026,
  vatRate: 0.18, // מע"מ מ-1.1.2025
  // מבנה הטבלה (₪, לפני מע"מ). יש למלא רק אחרי אימות מול פרסום רשמי של משרד המשפטים.
  // { signature: { first, additional }, copy: { firstPage, additionalPage },
  //   translation: { first100, per100UpTo1000, per100Above1000 },
  //   affidavit: { first, additional }, will: { first, additional }, life_certificate: { each },
  //   extra_copy: number }
  fees: null,
};

const r2 = (x) => Math.round(x * 100) / 100;
const money = (x) => r2(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";
const SERVICES = {
  signature: "אימות חתימה",
  copy: "אישור העתק נאמן למקור",
  translation: "אישור נכונות תרגום",
  affidavit: "אימות תצהיר",
  will: "אימות צוואה",
  life_certificate: "אישור בחיים",
};

export function compute(inputs = {}, cfg = CONFIG) {
  const errors = [];
  const service = inputs.service;
  const qty = Number(inputs.quantity ?? 1);
  const extra = Number(inputs.extra_copies ?? 0);
  if (!SERVICES[service]) errors.push("יש לבחור סוג שירות.");
  if (!Number.isInteger(qty) || qty < 1) errors.push(service === "translation" ? "יש להזין מספר מילים (מספר שלם)." : "הכמות צריכה להיות מספר שלם 1 ומעלה.");
  if (!Number.isInteger(extra) || extra < 0) errors.push("מספר העותקים הנוספים צריך להיות 0 ומעלה.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [`שירות: ${SERVICES[service]}. ${service === "translation" ? `מספר מילים: ${qty}` : service === "copy" ? `מספר עמודים: ${qty}` : `מספר חותמים: ${qty}`}.`];
  const f = cfg.fees;
  if (!f || !f[service] || (extra > 0 && !Number.isFinite(f.extra_copy))) {
    steps.push(`תעריפי שכר הנוטריון ל-${cfg.year} עדיין לא אומתו מול פרסום רשמי, ולכן הכלי אינו מציג סכום. שכר הנוטריון קבוע בתקנות, ונוטריון אינו רשאי לגבות יותר או פחות ממנו.`);
    return { outputs: { service: SERVICES[service], fee_before_vat: null, vat: null, total: null }, steps, warnings: ["התעריף טרם אומת"] };
  }
  let fee = 0;
  const s = f[service];
  if (service === "signature" || service === "affidavit" || service === "will") {
    fee = s.first + Math.max(0, qty - 1) * s.additional;
    steps.push(`חותם ראשון ${money(s.first)}, וכל חותם נוסף ${money(s.additional)}: ${money(fee)}.`);
  } else if (service === "copy") {
    fee = s.firstPage + Math.max(0, qty - 1) * s.additionalPage;
    steps.push(`עמוד ראשון ${money(s.firstPage)}, וכל עמוד נוסף ${money(s.additionalPage)}: ${money(fee)}.`);
  } else if (service === "translation") {
    const blocks = Math.ceil(qty / 100);
    const upTo1000 = Math.max(0, Math.min(blocks, 10) - 1);
    const above = Math.max(0, blocks - 10);
    fee = s.first100 + upTo1000 * s.per100UpTo1000 + above * s.per100Above1000;
    steps.push(`${blocks} יחידות של 100 מילים: ראשונה ${money(s.first100)}, עד 1,000 מילים ${upTo1000} × ${money(s.per100UpTo1000)}, מעל 1,000 מילים ${above} × ${money(s.per100Above1000)} = ${money(fee)}.`);
  } else {
    fee = s.each * qty;
    steps.push(`${qty} × ${money(s.each)} = ${money(fee)}.`);
  }
  if (extra > 0) {
    fee += extra * f.extra_copy;
    steps.push(`עותקים נוספים: ${extra} × ${money(f.extra_copy)}.`);
  }
  const vat = fee * cfg.vatRate;
  steps.push(`מע"מ ${Math.round(cfg.vatRate * 100)}%: ${money(vat)}. סך הכול: ${money(fee + vat)}.`);
  return { outputs: { service: SERVICES[service], fee_before_vat: r2(fee), vat: r2(vat), total: r2(fee + vat) }, steps };
}
