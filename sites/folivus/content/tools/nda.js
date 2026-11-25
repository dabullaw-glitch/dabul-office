// מחולל הסכם סודיות (NDA) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק עוולות מסחריות, התשנ"ט-1999: סעיפים 5 (סוד מסחרי), 6 (גזל), 13 (פיצוי בלי הוכחת נזק). אומת 25.11.2026 מול רשומות.

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const blank = (s, w = "____________") => (s !== undefined && s !== null && String(s).trim() ? esc(String(s).trim()) : w);
const lines = (s) => String(s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
const isTrue = (v) => v === true || v === "true";
const flag = (v, d = false) => (v === undefined || v === null || v === "" ? d : isTrue(v));
const numOr = (v, d) => (v === undefined || v === null || v === "" || !Number.isFinite(Number(v)) ? d : Number(v));
function parseDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return dt;
}
const fmtDate = (d) => `${d.getUTCDate()}.${d.getUTCMonth() + 1}.${d.getUTCFullYear()}`;
const heDate = (s) => (parseDate(s) ? fmtDate(parseDate(s)) : "____________");
const money = (x) => (Number(x) > 0 ? Number(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪" : "____________ ₪");
const ul = (arr) => `<ul>${arr.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>`;
const warnBox = (w) => (w.length ? `<div class="warnings"><h3>לבדיקה לפני חתימה או משלוח</h3><ul>${w.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : "");
const signTable = (parties) => `<table><tr>${parties.map((p) => `<th>${p.role}</th>`).join("")}</tr><tr>${parties.map((p) => `<td>${blank(p.name)}<br>חתימה: __________</td>`).join("")}</tr></table>`;
const DISCLAIMER = `<p class="disclaimer"><strong>טיוטה כללית, מומלץ להתייעץ עם עורך דין.</strong> המסמך הופק אוטומטית בכלי של פוליבוס לפי הפרטים שהוזנו, ואינו ייעוץ משפטי. כל מקרה שונה, ולכן כדאי שעורך דין יבדוק את הנוסח לפני חתימה או משלוח.</p>`;

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.party_a_name || !inputs.party_b_name) warnings.push("חסרים שמות הצדדים.");
  if (!inputs.purpose) warnings.push("לא הוגדרה מטרת מסירת המידע. בלי מטרה מוגדרת קשה לקבוע מהו שימוש אסור.");
  const years = Math.max(1, Math.round(Number(inputs.term_years)) || 5);
  if (years > 10) warnings.push(`תקופת סודיות של ${years} שנים ארוכה מהמקובל. שקלו תקופה קצרה יותר, וחובה מתמשכת רק לסודות מסחריים מובהקים.`);
  if (isTrue(inputs.non_solicit)) warnings.push("איסור שידול עובדים מגביל את חופש העיסוק ונבחן בזהירות. ודאו שהוא סביר בהיקפו ובמשכו.");
  const ret = Math.max(1, Math.round(Number(inputs.return_days)) || 14);
  const mutual = inputs.nda_type !== "one_way";
  const A = blank(inputs.party_a_name), B = blank(inputs.party_b_name);
  const discl = mutual ? "הצד המוסר" : A, recv = mutual ? "הצד המקבל" : B;

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם סודיות${mutual ? " הדדי" : ""}</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${A}, ${blank(inputs.party_a_id)} (להלן: "צד א'")</p><p><strong>לבין:</strong> ${B}, ${blank(inputs.party_b_id)} (להלן: "צד ב'")</p>`);
  p.push(`<p>${mutual ? "הצדדים מעוניינים למסור זה לזה מידע" : "צד א' מעוניין למסור לצד ב' מידע"} לצורך ${blank(inputs.purpose)} (להלן: "המטרה"), ולכן הוסכם כך:</p>`);
  p.push(sec("הגדרות", `<p>"מידע סודי": כל מידע עסקי, טכני, מסחרי או פיננסי, בכל צורה, שנמסר ${mutual ? "על ידי צד (\"הצד המוסר\") לצד האחר (\"הצד המקבל\")" : "על ידי צד א' לצד ב'"} בקשר למטרה${inputs.extra_definition ? `, לרבות ${esc(String(inputs.extra_definition).trim())}` : ""}.</p><p>מידע סודי אינו כולל מידע שהיה ידוע ל${recv} כדין לפני המסירה; שהפך לנחלת הכלל שלא בעקבות הפרת הסכם זה; שהתקבל כדין מצד שלישי בלי חובת סודיות; או שפותח באופן עצמאי בלי שימוש במידע הסודי. נטל ההוכחה לחריג על ${recv}.</p>`));
  p.push(sec("חובות הסודיות", `<p>${recv} ישמור את המידע הסודי בסוד, ישתמש בו רק לצורך המטרה, ינקוט אמצעי זהירות סבירים, ולפחות כמו לגבי מידע סודי שלו, ולא יעתיק אותו אלא לצורך המטרה.</p>`));
  p.push(sec("מסירה לגורמים מטעם הצד המקבל", `<p>${recv} רשאי למסור מידע סודי לעובדיו ויועציו שזקוקים לו לצורך המטרה, ובלבד שהם חבים בחובת סודיות דומה. ${recv} אחראי להפרה של מי מטעמו.</p>`));
  p.push(sec("גילוי לפי דין", `<p>נדרש ${recv} לגלות מידע סודי לפי דין או צו, יודיע על כך מראש ל${discl}, אם הדבר מותר, כדי לאפשר לו לבקש הגנה, ויגלה רק את המידע הנדרש.</p>`));
  p.push(sec("תקופה", `<p>חובת הסודיות תחול במשך ${years} שנים מהמסירה האחרונה של מידע סודי, ולגבי מידע שהוא סוד מסחרי, כל עוד הוא סוד מסחרי.</p>`));
  p.push(sec("החזרת המידע", `<p>לפי דרישה בכתב של ${discl}, או בסיום ההתקשרות, יחזיר ${recv} את המידע הסודי או ישמיד אותו בתוך ${ret} ימים, ויאשר זאת בכתב. מותר לשמור עותק שנדרש לפי דין, והוא יישאר כפוף לחובת הסודיות.</p>`));
  p.push(sec("אין העברת זכויות", `<p>מסירת המידע אינה מעניקה זכות או רישיון במידע, בפטנט, בזכות יוצרים או בסימן מסחר, ואינה מחייבת להתקשר בעסקה. המידע נמסר כפי שהוא.</p>`));
  if (isTrue(inputs.non_solicit)) p.push(sec("איסור שידול עובדים", `<p>במשך תקופת ההתקשרות ושנה לאחריה, צד לא ישדל עובד של הצד האחר שהכיר במסגרת המטרה לעזוב את עבודתו. פרסום משרה כללי אינו שידול.</p>`));
  p.push(sec("תרופות", `<p>הפרת ההסכם עלולה לגרום נזק שקשה להעריך, ולכן הצד הנפגע רשאי לבקש צו מניעה, בנוסף לכל סעד אחר לפי דין, לרבות לפי חוק עוולות מסחריות, התשנ"ט-1999.</p>`));
  p.push(sec("שונות", `<p>שינוי בהסכם ייעשה בכתב. סמכות השיפוט הייחודית נתונה לבתי המשפט המוסמכים ב${blank(inputs.court_city, "________")}.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "צד א'", name: inputs.party_a_name }, { role: "צד ב'", name: inputs.party_b_name }]), DISCLAIMER, `</div>`);
  return { title: mutual ? "הסכם סודיות הדדי" : "הסכם סודיות", html: p.join("\n"), warnings };
}
