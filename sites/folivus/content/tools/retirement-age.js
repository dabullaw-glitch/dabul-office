// מחשבון גיל פרישה וגיל זכאות לקצבת אזרח ותיק - פוליבוס. מודול טהור.
// לפי חוק גיל פרישה כפי שתוקן ב-2021, טבלת ביטוח לאומי. ראו retirement-age.json.

export const CONFIG = {
  menRetirementAge: { years: 67, months: 0 },
  menEntitlementAge: { years: 70, months: 0 }, // גיל הזכאות: קצבה בלי מבחן הכנסות
  womenEntitlementAge: null, // לא אומת לילידות אחרי 1944
  // נשים: גיל פרישה לפי חודש ושנת לידה (כולל)
  womenTable: [
    { from: [1944, 6], to: [1944, 6], age: [60, 0] },
    { from: [1944, 7], to: [1944, 8], age: [60, 4] },
    { from: [1944, 9], to: [1945, 4], age: [60, 8] },
    { from: [1945, 5], to: [1945, 12], age: [61, 0] },
    { from: [1946, 1], to: [1946, 8], age: [61, 4] },
    { from: [1946, 9], to: [1947, 4], age: [61, 8] },
    { from: [1947, 5], to: [1959, 12], age: [62, 0] },
    { from: [1960, 1], to: [1960, 12], age: [62, 4] },
    { from: [1961, 1], to: [1961, 12], age: [62, 8] },
    { from: [1962, 1], to: [1962, 12], age: [63, 0] },
    { from: [1963, 1], to: [1963, 12], age: [63, 3] },
    { from: [1964, 1], to: [1964, 12], age: [63, 6] },
    { from: [1965, 1], to: [1965, 12], age: [63, 9] },
    { from: [1966, 1], to: [1966, 12], age: [64, 0] },
    { from: [1967, 1], to: [1967, 12], age: [64, 3] },
    { from: [1968, 1], to: [1968, 12], age: [64, 6] },
    { from: [1969, 1], to: [1969, 12], age: [64, 9] },
    { from: [1970, 1], to: [9999, 12], age: [65, 0] },
  ],
};

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const iso = (d) => d.toISOString().slice(0, 10);
function addYM(d, years, months) {
  const total = d.getUTCMonth() + months;
  const y = d.getUTCFullYear() + years + Math.floor(total / 12);
  const m = ((total % 12) + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last)));
}
const ageText = (y, m) => (m ? `${y} ו-${m} חודשים` : `${y}`);

export function compute(inputs = {}) {
  const errors = [];
  const gender = inputs.gender;
  const birth = parseDate(inputs.birth_date);
  if (!["male", "female"].includes(gender)) errors.push("יש לבחור גבר או אישה.");
  if (!birth) errors.push("יש להזין תאריך לידה תקין.");
  if (birth && birth.getUTCFullYear() < 1900) errors.push("תאריך הלידה מוקדם מדי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  let age;
  if (gender === "male") {
    age = CONFIG.menRetirementAge;
    steps.push("גיל הפרישה לגברים: 67.");
  } else {
    const key = birth.getUTCFullYear() * 100 + birth.getUTCMonth() + 1;
    const row = CONFIG.womenTable.find((r) => key >= r.from[0] * 100 + r.from[1] && key <= r.to[0] * 100 + r.to[1]);
    if (!row) {
      return { outputs: {}, steps: [], errors: ["הטבלה בכלי מתחילה בילידות יוני 1944. לילידות מוקדם יותר יש לבדוק מול ביטוח לאומי."] };
    }
    age = { years: row.age[0], months: row.age[1] };
    steps.push(`אישה ילידת ${birth.getUTCMonth() + 1}/${birth.getUTCFullYear()}: גיל פרישה ${ageText(age.years, age.months)} לפי טבלת ביטוח לאומי (העלאה הדרגתית עד 65 לילידות 1970 ואילך).`);
  }
  const retDate = addYM(birth, age.years, age.months);
  steps.push(`תאריך הגעה לגיל הפרישה: ${iso(retDate)}. מגיל זה אפשר לקבל קצבת אזרח ותיק אם עוברים את מבחן ההכנסות. קצבה מפנסיה אינה נחשבת הכנסה לעניין המבחן.`);

  let entDate = null;
  if (gender === "male") {
    entDate = addYM(birth, CONFIG.menEntitlementAge.years, 0);
    steps.push(`גיל הזכאות לגברים: 70 (${iso(entDate)}). מגיל זה משולמת הקצבה בלי קשר להכנסות.`);
  } else {
    steps.push("גיל הזכאות לנשים (קצבה בלי מבחן הכנסות) תלוי בתאריך הלידה ולא מחושב בכלי. כדאי לבדוק מול ביטוח לאומי.");
  }
  return {
    outputs: {
      retirement_age: ageText(age.years, age.months),
      retirement_date: iso(retDate),
      entitlement_date: entDate ? iso(entDate) : null,
    },
    steps,
  };
}
