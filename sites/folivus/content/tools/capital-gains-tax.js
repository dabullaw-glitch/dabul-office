// הערכת מס שבח בחישוב ליניארי מוטב (ליניארי חדש) לדירת מגורים מזכה - פוליבוס
// הערכה בלבד. עקרונות: השבח הריאלי עד 1.1.2014 פטור, השבח הריאלי שמ-2.1.2014 חייב ב-25%,
// הסכום האינפלציוני פטור. תקרת פטור לדירה יחידה 5,008,000 ₪ (1.1.2024 עד 31.12.2027).
// מקור: רשות המסים, מדריך למוכר ולרוכש זכות במקרקעין 2026.

export const RATE = 0.25;
export const CUTOFF = "2014-01-01";
export const SINGLE_CEILING = 5008000;

const DAY = 86400000;
const parse = (s) => {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return NaN;
  return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
};
const fmt = (n) => Math.round(n).toLocaleString("he-IL") + " ₪";
const he = (s) => s.split("-").reverse().join(".");

export function compute(inputs = {}) {
  const errors = [];
  const buy = Number(inputs.purchase_price);
  const sell = Number(inputs.sale_price);
  const exp = inputs.expenses === undefined || inputs.expenses === "" ? 0 : Number(inputs.expenses);
  const dBuy = parse(inputs.purchase_date);
  const dSell = parse(inputs.sale_date);
  const cpiB = Number(inputs.cpi_purchase);
  const cpiS = Number(inputs.cpi_sale);
  if (!(buy >= 0) || !(sell >= 0) || !(exp >= 0)) errors.push("יש להזין סכומים חיוביים.");
  if (Number.isNaN(dBuy) || Number.isNaN(dSell)) errors.push("יש להזין תאריכי רכישה ומכירה תקינים.");
  else if (dSell <= dBuy) errors.push("תאריך המכירה חייב להיות אחרי תאריך הרכישה.");
  if (errors.length) return { outputs: null, steps: [], errors };

  const steps = [];
  const useCpi = cpiB > 0 && cpiS > 0;
  const factor = useCpi ? cpiS / cpiB : 1;
  const nominal = sell - buy - exp;
  const indexedCost = (buy + exp) * factor;
  const real = Math.max(0, sell - indexedCost);
  steps.push(`שבח נומינלי: ${fmt(sell)} פחות ${fmt(buy)} פחות הוצאות ${fmt(exp)} = ${fmt(nominal)}.`);
  if (useCpi) {
    steps.push(`מקדם הצמדה למדד: ${cpiS} / ${cpiB} = ${factor.toFixed(4)}. עלות מתואמת (מחיר רכישה והוצאות): ${fmt(indexedCost)}.`);
    steps.push("לשם פשטות, גם ההוצאות הוצמדו מיום הרכישה. בפועל כל הוצאה מוצמדת מיום שהוצאה.");
  } else {
    steps.push("לא הוזנו מדדים, ולכן החישוב לא מנכה את האינפלציה. התוצאה עלולה להיות גבוהה מהמס בפועל.");
  }
  steps.push(`שבח ריאלי משוער: ${fmt(real)}.`);

  let gainBase = real;
  if (inputs.single_apartment === true) {
    if (sell <= SINGLE_CEILING) {
      steps.push(`סימנתם שזו עשויה להיות דירה יחידה הזכאית לפטור, ושווי המכירה אינו עולה על תקרת הפטור (${fmt(SINGLE_CEILING)} לשנים 2024 עד 2027). אם כל תנאי הפטור מתקיימים, ייתכן שלא יחול מס שבח.`);
      return {
        outputs: { nominal_gain: Math.round(nominal), real_gain: Math.round(real), taxable_fraction: 0, taxable_gain: 0, tax: 0 },
        steps,
      };
    }
    const share = (sell - SINGLE_CEILING) / sell;
    gainBase = real * share;
    steps.push(`שווי המכירה עולה על תקרת הפטור. הערכה: החלק החייב מהשבח הוא היחס שבין השווי העודף לשווי המכירה (${(share * 100).toFixed(2)}%), כלומר ${fmt(gainBase)}.`);
  }

  const cut = parse(CUTOFF);
  const total = (dSell - dBuy) / DAY;
  const exemptDays = dBuy < cut ? (Math.min(dSell, cut) - dBuy) / DAY : 0;
  const taxableDays = total - exemptDays;
  const fraction = taxableDays / total;
  steps.push(`תקופת ההחזקה: ${Math.round(total)} ימים, מתוכם ${Math.round(exemptDays)} ימים עד 1.1.2014 (פטורים) ו-${Math.round(taxableDays)} ימים מאז (חייבים).`);
  const taxable = gainBase * fraction;
  const tax = Math.round(taxable * RATE);
  steps.push(`שבח חייב: ${fmt(gainBase)} × ${(fraction * 100).toFixed(2)}% = ${fmt(taxable)}.`);
  steps.push(`מס שבח משוער: ${fmt(taxable)} × 25% = ${fmt(tax)}.`);
  steps.push(`תאריכים: רכישה ${he(inputs.purchase_date)}, מכירה ${he(inputs.sale_date)}. זו הערכה בלבד ואינה כוללת מס יסף, פחת, זיכויים או פטורים נוספים.`);
  return {
    outputs: {
      nominal_gain: Math.round(nominal),
      real_gain: Math.round(real),
      taxable_fraction: Math.round(fraction * 10000) / 100,
      taxable_gain: Math.round(taxable),
      tax,
    },
    steps,
  };
}
