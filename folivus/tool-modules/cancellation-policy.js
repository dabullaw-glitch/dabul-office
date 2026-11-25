// מחולל מדיניות ביטול עסקה לעסק - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// כללי ביטול עסקת מכר מרחוק לפי כל זכות (נבדק 25.11.2026).

export const CONFIG = {
  year: 2026,
  cancelDays: 14,
  feePercent: 5,
  feeCap: 100,
  refundDays: 14,
  extendedMonths: 4,
  extendedAge: 65,
  tourismBusinessDays: 7,
  otherServiceBusinessDays: 2,
};

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

export function cancellationFee(price) {
  const pr = Number(price);
  if (!(pr > 0)) return null;
  return Math.round(Math.min((pr * CONFIG.feePercent) / 100, CONFIG.feeCap) * 100) / 100;
}

export function generate(inputs = {}) {
  const warnings = [];
  for (const [k, l] of [["business_name", "שם העסק"], ["phone", "טלפון"], ["email", "דוא\"ל"], ["address", "כתובת לדואר רשום"]]) if (!inputs[k]) warnings.push(`חסר ${l}. הלקוח צריך לדעת לאן למסור הודעת ביטול.`);
  const excluded = lines(inputs.excluded);
  const sells = ["products", "services", "both"].includes(inputs.sells) ? inputs.sells : "products";
  const prod = sells !== "services", serv = sells !== "products";
  const fee = cancellationFee(inputs.example_price);
  if (isTrue(inputs.tourism) && !serv) warnings.push("סומנו שירותי אירוח או נופש, אבל נבחר שהעסק מוכר מוצרים בלבד.");

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>מדיניות ביטול עסקה: ${blank(inputs.business_name)}</h1>`, `<p>עודכן: ${heDate(inputs.effective_date)}. המדיניות חלה על עסקאות שנעשו מרחוק (באתר, בטלפון או בדרך אחרת שאינה במפגש פנים אל פנים).</p>`);
  p.push(sec("מתי אפשר לבטל", `<ul>${prod ? `<li>מוצרים: בתוך ${CONFIG.cancelDays} ימים מיום קבלת המוצר או מיום קבלת מסמך פרטי העסקה, לפי המאוחר.</li>` : ""}${serv ? `<li>שירותים: בתוך ${CONFIG.cancelDays} ימים מיום העסקה או מיום קבלת מסמך פרטי העסקה, לפי המאוחר${isTrue(inputs.tourism) ? `. בשירותי אירוח, נסיעה ונופש, ובלבד שהביטול נמסר לפחות ${CONFIG.tourismBusinessDays} ימי עסקים לפני מועד השירות` : `, ובלבד שהביטול נמסר לפחות ${CONFIG.otherServiceBusinessDays} ימי עסקים לפני תחילת השירות`}.</li>` : ""}<li>אדם עם מוגבלות, אדם בן ${CONFIG.extendedAge} ומעלה ועולה חדש רשאים לבטל בתוך ${CONFIG.extendedMonths} חודשים, אם העסקה כללה שיחה בינם לבין העסק.</li></ul>`));
  p.push(sec("איך מודיעים על ביטול", `<ul><li>בטלפון: ${blank(inputs.phone)}.</li><li>בדוא"ל: ${blank(inputs.email)}.</li><li>בדואר רשום: ${blank(inputs.address)}.</li>${flag(inputs.has_website, true) ? "<li>באתר: בקישור \"ביטול עסקה\" שבדף הבית.</li>" : ""}</ul><p>בהודעה ציינו שם, מספר זהות ומספר הזמנה או פרטי העסקה.</p>`));
  p.push(sec("דמי ביטול", `<p>בביטול שאינו בשל פגם, אי התאמה או הפרה מצד העסק, ייגבו דמי ביטול של ${CONFIG.feePercent}% ממחיר העסקה או ${CONFIG.feeCap} ₪, לפי הנמוך.${fee !== null ? ` לדוגמה, בעסקה של ${money(inputs.example_price)} דמי הביטול יהיו ${fee > 0 ? money(fee) : "0 ₪"}.` : ""} בביטול בשל פגם, אי התאמה או הפרה לא ייגבו דמי ביטול.</p>`));
  p.push(sec("החזר כספי", `<p>נחזיר את התשלום, בניכוי דמי ביטול אם חלים, בתוך ${CONFIG.refundDays} ימים מיום קבלת הודעת הביטול, באמצעי התשלום שבו שולם. דמי משלוח ששולמו יוחזרו גם הם.</p>`));
  if (prod) p.push(sec("החזרת המוצר", `<p>${blank(inputs.return_method, "נתאם עם הלקוח את דרך החזרת המוצר")}. מומלץ להחזיר את המוצר באריזתו, ככל האפשר.</p>`));
  if (prod) p.push(sec("מוצרים שאינם ניתנים לביטול", excluded.length ? ul(excluded) : `<ul><li>מוצרים פסידים, כמו מזון.</li><li>מוצרים שיוצרו במיוחד בעבור הלקוח.</li><li>מדיה שניתנת להעתקה (כמו תקליטורים ותוכנה), לאחר שהאריזה המקורית נפתחה.</li></ul>`));
  p.push(`<p>אין במדיניות זו כדי לגרוע מזכויות הצרכן לפי חוק הגנת הצרכן, התשמ"א-1981.</p>`, DISCLAIMER, `</div>`);
  return { title: "מדיניות ביטול עסקה", html: p.join("\n"), warnings };
}
