// מחולל תקנון אתר ותנאי שימוש - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// ביטול עסקת מכר מרחוק לפי כל זכות (נבדק 25.11.2026): 14 ימים, דמי ביטול 5% או 100 ₪ לפי הנמוך, החזר בתוך 14 ימים, 4 חודשים לזכאים.

export const CONFIG = {
  year: 2026,
  cancelDays: 14,
  feePercent: 5,
  feeCap: 100,
  refundDays: 14,
  extendedMonths: 4,
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

export function generate(inputs = {}) {
  const warnings = [];
  for (const [k, l] of [["business_name", "שם העסק"], ["business_id", "מספר מזהה של העסק"], ["address", "כתובת העסק"], ["email", "דוא\"ל"]]) if (!inputs[k]) warnings.push(`חסר ${l}. בעסקה מרחוק חובה לגלות לצרכן את פרטי העסק.`);
  if (!parseDate(inputs.effective_date)) warnings.push("חסר תאריך עדכון התקנון.");
  const type = ["info", "services", "shop"].includes(inputs.site_type) ? inputs.site_type : "shop";
  const sells = type !== "info";
  const minAge = Math.max(0, Math.round(Number(inputs.min_age)) || 18);
  const ship = Number(inputs.shipping_cost) > 0 ? money(inputs.shipping_cost) : "ללא עלות";

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>תקנון ותנאי שימוש: ${blank(inputs.site_name)}</h1>`, `<p>עודכן לאחרונה: ${heDate(inputs.effective_date)}</p>`);
  p.push(sec("פרטי העסק", `<p>האתר מופעל בידי ${blank(inputs.business_name)}, ${blank(inputs.business_id)}, ${blank(inputs.address)}. טלפון: ${blank(inputs.phone, "________")}. דוא"ל: ${blank(inputs.email)}.</p>`));
  p.push(sec("כללי", `<p>השימוש באתר כפוף לתקנון זה. התקנון מנוסח בלשון רבים ופונה לכל המגדרים. אם הוראה בתקנון סותרת זכות שהדין מקנה לצרכן, תגבר הוראת הדין.</p>`));
  if (sells) {
    p.push(sec("הזמנות ותשלום", `<p>הזמנה יכולה לבצע מי שמלאו לו ${minAge} ומחזיק באמצעי תשלום תקף. אמצעי התשלום: ${blank(inputs.payment_methods, "כרטיס אשראי")}. המחירים באתר כוללים מע"מ. ההזמנה תאושר בהודעה שתישלח לאחר קליטתה, והעסקה נכרתת עם אישור זה. אם מוצר או שירות אינו זמין, נודיע על כך ונחזיר כל תשלום.</p>`));
    if (type === "shop") p.push(sec("אספקה", `<p>מוצרים יסופקו בתוך ${Math.max(0, Math.round(numOr(inputs.delivery_days, 7)))} ימי עסקים מאישור ההזמנה, לכתובת שנמסרה. דמי משלוח: ${ship}. עיכוב באספקה יימסר לכם מיד, עם מועד מעודכן.</p>`));
    p.push(sec("ביטול עסקה", `<ul><li>אפשר לבטל עסקה בתוך ${CONFIG.cancelDays} ימים מקבלת ${type === "shop" ? "המוצר" : "השירות"} או מקבלת פרטי העסקה, לפי המאוחר.</li><li>אנשים עם מוגבלות, בני 65 ומעלה ועולים חדשים רשאים לבטל בתוך ${CONFIG.extendedMonths} חודשים, אם העסקה כללה שיחה בינם לבין העסק.</li><li>בביטול שלא בשל פגם או אי התאמה ייגבו דמי ביטול של ${CONFIG.feePercent}% ממחיר העסקה או ${CONFIG.feeCap} ₪, לפי הנמוך.</li><li>ההחזר יבוצע בתוך ${CONFIG.refundDays} ימים מקבלת הודעת הביטול.</li><li>אפשר להודיע על ביטול בטלפון, בדואר רשום, בדוא"ל ${blank(inputs.email)} או בקישור הביטול באתר.</li><li>חלק מהמוצרים אינם ניתנים לביטול לפי הדין, למשל מוצרים פסידים ומוצרים שיוצרו במיוחד בעבורכם. הפירוט המלא במדיניות הביטול.</li></ul>`));
  }
  p.push(sec("אחריות", `<p>אנחנו משתדלים שהמידע באתר יהיה נכון ומעודכן, אך ייתכנו טעויות. ${sells ? "אחריות למוצרים ולשירותים ניתנת לפי הדין ולפי תעודת האחריות, אם יש. " : ""}אין בתקנון כדי לגרוע מאחריות שאי אפשר להגביל לפי דין.</p>`));
  p.push(sec("קניין רוחני", `<p>התוכן באתר, לרבות טקסט, תמונות, עיצוב וקוד, שייך לעסק או לבעלי הזכויות בו. אין להעתיק, להפיץ או לעשות בו שימוש מסחרי בלי הסכמה בכתב, למעט שימוש שהדין מתיר.</p>`));
  if (isTrue(inputs.user_content)) p.push(sec("תוכן גולשים", `<p>מי שמפרסם תוכן באתר אחראי לו, ומתחייב שאינו פוגע בזכויות של אחרים, אינו מטעה ואינו פוגעני. אנחנו רשאים להסיר תוכן שמפר את התקנון או את הדין. ביקורות יפורסמו בלי סינון לפי עמדתן.</p>`));
  p.push(sec("פרטיות", `<p>השימוש במידע אישי נעשה לפי מדיניות הפרטיות של האתר, שמהווה חלק מתקנון זה.</p>`));
  p.push(sec("נגישות", `<p>אנחנו פועלים להנגשת האתר. לפניות בנושא נגישות: ${blank(inputs.email)}.</p>`));
  p.push(sec("דין ושיפוט", `<p>על התקנון חלים דיני מדינת ישראל. סמכות השיפוט נתונה לבתי המשפט המוסמכים ב${blank(inputs.court_city, "________")}, בלי לגרוע מזכות צרכן להגיש תביעה בבית המשפט המוסמך לפי הדין.</p>`));
  p.push(DISCLAIMER, `</div>`);
  return { title: `תקנון ותנאי שימוש: ${inputs.site_name ? String(inputs.site_name).trim() : "אתר"}`, html: p.join("\n"), warnings };
}
