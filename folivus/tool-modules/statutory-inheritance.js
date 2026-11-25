// מחשבון חלוקת ירושה על פי דין - מודול טהור.
// לפי חוק הירושה, התשכ"ה-1965, סעיפים 10 עד 17 ו-55. נכון ל-2026.

function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a || 1; }
function F(n, d = 1) { const g = gcd(n, d); return { n: n / g, d: d / g }; }
const mul = (a, b) => F(a.n * b.n, a.d * b.d);
const add = (a, b) => F(a.n * b.d + b.n * a.d, a.d * b.d);
const div = (a, k) => F(a.n, a.d * k);
const txt = (f) => (f.n === 0 ? "0" : f.d === 1 ? String(f.n) : `${f.n}/${f.d}`);
const pct = (f) => Math.round((f.n / f.d) * 10000) / 100;

function int(v, name, errors) {
  if (v === undefined || v === "" || v === null) return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 50) { errors.push(`הערך "${name}" צריך להיות מספר שלם בין 0 ל-50.`); return 0; }
  return n;
}
const bool = (v) => v === true || v === "true";

// חלוקת חלק ה"הורים וצאצאיהם" כשאין בן זוג, או חלק האחים כשיש בן זוג ואין הורים
function splitParentsLine(share, i, heirs, steps, allowParents) {
  const fatherLines = i.fullSib + i.patHalf;
  const motherLines = i.fullSib + i.matHalf;
  const fatherPresent = (allowParents && i.father) || fatherLines > 0;
  const motherPresent = (allowParents && i.mother) || motherLines > 0;
  if (!fatherPresent && !motherPresent) return false;
  let fShare = fatherPresent && motherPresent ? div(share, 2) : fatherPresent ? share : F(0);
  let mShare = fatherPresent && motherPresent ? div(share, 2) : motherPresent ? share : F(0);
  if (fatherPresent && !motherPresent) steps.push("לצד האם אין יורשים (האם אינה בחיים ואין לה צאצאים מלבד המנוח), ולכן כל החלק עובר לצד האב.");
  if (motherPresent && !fatherPresent) steps.push("לצד האב אין יורשים (האב אינו בחיים ואין לו צאצאים מלבד המנוח), ולכן כל החלק עובר לצד האם.");
  const perSib = {};
  const addSib = (key, f) => { perSib[key] = perSib[key] ? add(perSib[key], f) : f; };
  if (fShare.n) {
    if (allowParents && i.father) heirs.push({ heir: "האב", share: fShare });
    else {
      steps.push(`חלקו של האב שנפטר (${txt(fShare)}) עובר לצאצאיו, כלומר לאחים ולאחיות מצד האב (כולל אחים מלאים), בחלקים שווים. מספר הענפים: ${fatherLines}.`);
      for (let k = 0; k < i.fullSib; k++) addSib(`אח/אחות מלא/ה ${k + 1}`, div(fShare, fatherLines));
      for (let k = 0; k < i.patHalf; k++) addSib(`אח/אחות מצד האב ${k + 1}`, div(fShare, fatherLines));
    }
  }
  if (mShare.n) {
    if (allowParents && i.mother) heirs.push({ heir: "האם", share: mShare });
    else {
      steps.push(`חלקה של האם שנפטרה (${txt(mShare)}) עובר לצאצאיה, כלומר לאחים ולאחיות מצד האם (כולל אחים מלאים), בחלקים שווים. מספר הענפים: ${motherLines}.`);
      for (let k = 0; k < i.fullSib; k++) addSib(`אח/אחות מלא/ה ${k + 1}`, div(mShare, motherLines));
      for (let k = 0; k < i.matHalf; k++) addSib(`אח/אחות מצד האם ${k + 1}`, div(mShare, motherLines));
    }
  }
  for (const [heir, s] of Object.entries(perSib)) heirs.push({ heir, share: s });
  return true;
}

export function compute(inputs = {}) {
  const errors = [];
  const spouseType = inputs.spouse_type || "none";
  if (!["none", "married", "common_law"].includes(spouseType)) errors.push("סוג בן הזוג לא מוכר.");
  const i = {
    spouse: spouseType !== "none",
    apt: bool(inputs.married_3y_lived_in_apartment),
    kids: int(inputs.living_children, "ילדים בחיים", errors),
    deadKids: int(inputs.predeceased_children_with_descendants, "ילדים שנפטרו והשאירו צאצאים", errors),
    father: bool(inputs.father_alive),
    mother: bool(inputs.mother_alive),
    fullSib: int(inputs.full_sibling_lines, "אחים מלאים", errors),
    patHalf: int(inputs.paternal_half_sibling_lines, "אחים מצד האב", errors),
    matHalf: int(inputs.maternal_half_sibling_lines, "אחים מצד האם", errors),
    grand: bool(inputs.grandparents_line),
  };
  const estate = inputs.estate_value === undefined || inputs.estate_value === "" || inputs.estate_value === null ? null : Number(inputs.estate_value);
  if (estate !== null && (!Number.isFinite(estate) || estate < 0)) errors.push("שווי העיזבון צריך להיות מספר חיובי.");
  if (errors.length) return { outputs: {}, steps: [], errors };

  const steps = [];
  const heirs = [];
  const notes = [];
  const lines = i.kids + i.deadKids;
  const hasParentsTier = i.father || i.mother || i.fullSib + i.patHalf + i.matHalf > 0;
  let rest = F(1);

  if (spouseType === "common_law") notes.push("ידוע/ה בציבור: לפי סעיף 55, אם אף אחד מבני הזוג לא היה נשוי לאדם אחר בשעת הפטירה, בן הזוג מקבל את מה שהיה מקבל בירושה על פי דין אילו היו נשואים. בפועל יש להוכיח את הקשר בבקשה לצו ירושה.");

  if (i.spouse) {
    if (lines > 0) {
      heirs.push({ heir: "בן/בת הזוג", share: F(1, 2) });
      rest = F(1, 2);
      steps.push("יש בן זוג וילדים: בן הזוג מקבל את המיטלטלין של משק הבית המשותף (כולל מכונית נוסעים) ומחצית משאר העיזבון. המחצית השנייה מתחלקת בין הילדים.");
    } else if (i.father || i.mother) {
      heirs.push({ heir: "בן/בת הזוג", share: F(1, 2) });
      steps.push("יש בן זוג והורים: בן הזוג מקבל את המיטלטלין ומחצית משאר העיזבון. המחצית השנייה להורים. אם רק אחד ההורים בחיים, הוא מקבל את כל המחצית, ואחי המנוח אינם באים במקום ההורה שנפטר (סעיף 14(א)).");
      if (i.father && i.mother) { heirs.push({ heir: "האב", share: F(1, 4) }); heirs.push({ heir: "האם", share: F(1, 4) }); }
      else heirs.push({ heir: i.father ? "האב" : "האם", share: F(1, 2) });
      rest = F(0);
    } else if (i.fullSib + i.patHalf + i.matHalf > 0 || i.grand) {
      heirs.push({ heir: "בן/בת הזוג", share: F(2, 3) });
      steps.push("יש בן זוג, ואין ילדים או הורים בחיים: בן הזוג מקבל את המיטלטלין ושני שלישים משאר העיזבון.");
      if (i.apt) steps.push("בן הזוג היה נשוי למנוח שלוש שנים לפחות וגר איתו בדירה שבעיזבון: הוא מקבל גם את כל חלקו של המנוח בדירה, ושני השלישים מחושבים על שאר העיזבון (בלי הדירה).");
      if (i.fullSib + i.patHalf + i.matHalf > 0) {
        steps.push("השליש הנותר עובר לאחים ולאחיות (ובמקום אח שנפטר, לילדיו).");
        splitParentsLine(F(1, 3), i, heirs, steps, false);
      } else {
        steps.push("השליש הנותר עובר להורי ההורים (סבים וסבתות) ולצאצאיהם. חלוקה זו לא מחושבת כאן בפירוט.");
        heirs.push({ heir: "סבים וסבתות וצאצאיהם", share: F(1, 3) });
      }
      rest = F(0);
    } else {
      heirs.push({ heir: "בן/בת הזוג", share: F(1) });
      steps.push("אין קרובים מהרשימה בחוק (ילדים, הורים, אחים, סבים): בן הזוג יורש את כל העיזבון.");
      rest = F(0);
    }
  }

  if (rest.n) {
    if (lines > 0) {
      steps.push(`${i.spouse ? "חלק הילדים" : "כל העיזבון"} (${txt(rest)}) מתחלק בשווה בין ענפי הילדים (מספר הענפים: ${lines}). ילד שנפטר לפני המנוח והשאיר ילדים, ילדיו באים במקומו ומחלקים את חלקו בשווה.`);
      for (let k = 0; k < i.kids; k++) heirs.push({ heir: `ילד/ה ${k + 1}`, share: div(rest, lines) });
      for (let k = 0; k < i.deadKids; k++) heirs.push({ heir: `צאצאי ילד/ה שנפטר/ה ${k + 1}`, share: div(rest, lines) });
    } else if (!i.spouse && hasParentsTier) {
      steps.push("אין בן זוג ואין ילדים: העיזבון עובר להורים ולצאצאיהם. כל הורה מקבל מחצית, והורה שנפטר, ילדיו (אחי המנוח) באים במקומו.");
      splitParentsLine(F(1), i, heirs, steps, true);
    } else if (!i.spouse && i.grand) {
      steps.push("אין בן זוג, ילדים, הורים או אחים: העיזבון עובר להורי ההורים ולצאצאיהם (דודים ובני דודים). החלוקה המדויקת לא מחושבת כאן.");
      heirs.push({ heir: "סבים וסבתות וצאצאיהם", share: F(1) });
    } else if (!i.spouse) {
      steps.push("לא נמצא יורש על פי דין: לפי סעיף 17 המדינה יורשת. מומלץ לבדוק שוב את פרטי המשפחה.");
      heirs.push({ heir: "המדינה", share: F(1) });
    }
  }

  const sum = heirs.reduce((a, h) => add(a, h.share), F(0));
  const shares = heirs.map((h) => ({
    heir: h.heir,
    fraction: txt(h.share),
    percent: pct(h.share),
    amount: estate === null ? null : Math.round(estate * (h.share.n / h.share.d) * 100) / 100,
  }));
  if (i.spouse) notes.push("סכומים שמגיעים לבן הזוג מכוח הנישואין (למשל כתובה) מנוכים מחלקו בעיזבון, אבל זכויות לפי חוק יחסי ממון או הסכם ממון אינן מנוכות.");
  notes.push("החישוב מניח שאין צוואה. אם יש צוואה, היא קובעת את החלוקה בכפוף לדין.");

  return {
    outputs: {
      shares,
      total_check: txt(sum),
      notes: notes.join(" "),
    },
    steps,
  };
}
