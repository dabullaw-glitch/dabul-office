// בודק התיישנות - מודול טהור. מבוסס על חוק ההתיישנות, התשי"ח-1958, פקודת הנזיקין (סעיף 89),
// חוק חוזה הביטוח (סעיף 31). התקופות אומתו ב-25.11.2026 (ראו sources ב-JSON).

export const CONFIG = {
  verified: true,
  verifiedOn: "2026-11-25", // חוק ההתיישנות ס' 5, 6, 8, 10; פקודת הנזיקין ס' 89; חוק חוזה הביטוח ס' 31 (ראו sources ב-JSON)
  types: {
    general: { years: 7, label: "תביעה אזרחית כללית (חוזה, חוב, הלוואה)" },
    tort: { years: 7, capYears: 10, label: "תביעת נזיקין (תאונה, רשלנות, רשלנות רפואית)" },
    land: { years: 15, label: "תביעה במקרקעין שאינם מוסדרים" },
    land_registered: { years: 25, label: "תביעה במקרקעין מוסדרים" },
    insurance: { years: 3, label: "תביעה לתגמולי ביטוח מחברת הביטוח" },
    labor: { years: 7, label: "תביעת עובד (שכר, פיצויים, הבראה)" },
    vacation: { years: 3, fromEnd: true, label: "פדיון חופשה שנתית (מסיום העבודה)" },
  },
  adultAge: 18,
};

function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const iso = (d) => d.toISOString().slice(0, 10);
const heDate = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
function addYears(d, n) {
  const y = d.getUTCFullYear() + n;
  const m = d.getUTCMonth();
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(d.getUTCDate(), last)));
}

export function compute(inputs = {}) {
  const errors = [];
  const type = inputs.claim_type || "general";
  const t = CONFIG.types[type];
  const cause = parseDate(inputs.cause_date);
  const discovery = inputs.discovery_date ? parseDate(inputs.discovery_date) : null;
  const birth = inputs.birth_date ? parseDate(inputs.birth_date) : null;
  const asOf = inputs.as_of_date ? parseDate(inputs.as_of_date) : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
  if (!t) errors.push("סוג תביעה לא מוכר.");
  if (!cause) errors.push("יש להזין תאריך תקין של האירוע או של סיום העבודה.");
  if (inputs.discovery_date && !discovery) errors.push("תאריך הגילוי אינו תקין.");
  if (inputs.birth_date && !birth) errors.push("תאריך הלידה אינו תקין.");
  if (inputs.as_of_date && !asOf) errors.push("תאריך הבדיקה אינו תקין.");
  if (cause && discovery && discovery < cause) errors.push("תאריך הגילוי מוקדם מתאריך האירוע.");
  if (cause && birth && birth > cause) errors.push("תאריך הלידה מאוחר מתאריך האירוע.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  steps.push(`${t.label}: תקופת התיישנות של ${t.years} שנים${t.fromEnd ? " מסיום יחסי העבודה" : ""}.`);
  let start = cause;
  steps.push(`נקודת המוצא: ${heDate(cause)}.`);

  if (discovery && discovery > cause && type !== "vacation") {
    start = discovery;
    steps.push(`הוזן מועד גילוי מאוחר (${heDate(discovery)}): כשהעובדות או הנזק לא היו ידועים מסיבות שאינן תלויות בתובע, הספירה מתחילה ביום הגילוי.`);
  }

  let minorNote = false;
  if (birth) {
    const adult = addYears(birth, CONFIG.adultAge);
    if (adult > start) {
      steps.push(`התובע היה קטין. תקופת הקטינות אינה נמנית, ולכן הספירה מתחילה ביום הולדתו ה-18: ${heDate(adult)}.`);
      start = adult;
      minorNote = true;
    }
  }

  let end = addYears(start, t.years);
  if (type === "tort" && discovery && discovery > cause) {
    const cap = addYears(cause, t.capYears);
    if (cap < end && !minorNote) {
      steps.push(`בנזק שהתגלה מאוחר יש גם תקרה של ${t.capYears} שנים מיום האירוע (${heDate(cap)}). לשם זהירות מוצג המועד המוקדם מבין השניים.`);
      end = cap;
    }
  }
  if (type === "land_registered") steps.push("במקרקעין רשומים (מוסדרים) חוק המקרקעין קובע כללים מיוחדים, ובמקרים רבים לא חלה התיישנות על תביעה לקיום זכות רשומה. המועד המוצג הוא לפי חוק ההתיישנות בלבד ויש לבדוק את המקרה.");
  if (type === "vacation") steps.push("לפי המידע הרשמי, אפשר לפדות ימים מהשנה האחרונה ומשלוש השנים שלפניה, ואת התביעה יש להגיש בתוך שלוש שנים מסיום העבודה.");
  if (type === "insurance") steps.push("תקופת ההתיישנות בחוק חוזה הביטוח נמנית מיום קרות מקרה הביטוח. בביטוח מחלות קשות ובביטוח אשפוז שנרכשו מ-15.11.2020 נקבעה תקופה של 5 שנים, ובסוגי ביטוח אחרים ייתכנו כללים מיוחדים. בדקו את הפוליסה.");

  const daysLeft = Math.floor((end.getTime() - asOf.getTime()) / 86400000);
  let status;
  if (daysLeft < 0) status = "ככל הנראה חלפה תקופת ההתיישנות";
  else if (daysLeft <= 180) status = "התקופה עומדת להסתיים בקרוב";
  else status = "התקופה טרם חלפה";
  steps.push(`מועד ההתיישנות המשוער: ${heDate(end)}. נכון ל-${heDate(asOf)}: ${status}${daysLeft >= 0 ? ` (${daysLeft} ימים)` : ""}.`);
  steps.push("התיישנות היא טענת הגנה: הנתבע צריך להעלות אותה. גם הודאה בחוב, הסדרים או הליכים קודמים עשויים לשנות את המועד.");

  return {
    outputs: {
      start_date: iso(start),
      limitation_end_date: iso(end),
      days_left: daysLeft,
      status,
    },
    steps,
  };
}
