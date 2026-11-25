// מחולל הסכם מכר רכב משומש - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק החוזים (חלק כללי), התשל"ג-1973: סעיף 15 (הטעיה, כולל אי גילוי), סעיף 39 (תום לב). אומת 25.11.2026.

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

const PAY = { transfer: "העברה בנקאית לחשבון שהמוכר יודיע עליו בכתב", bank_check: "המחאה בנקאית", cash: "מזומן" };

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.seller_name) warnings.push("חסר שם המוכר.");
  if (!inputs.buyer_name) warnings.push("חסר שם הקונה.");
  if (!inputs.license_plate) warnings.push("חסר מספר הרישוי של הרכב.");
  const price = Number(inputs.price);
  const deposit = Number(inputs.deposit) || 0;
  if (!(price > 0)) warnings.push("חסר מחיר הרכב.");
  if (price > 0 && deposit > price) warnings.push("המקדמה גבוהה ממחיר הרכב. בדקו את הסכומים.");
  if (!parseDate(inputs.handover_date)) warnings.push("חסר מועד מסירה. מועד המסירה קובע מי אחראי לדוחות ולתשלומים.");
  if (!isTrue(inputs.inspected)) warnings.push("הקונה לא בדק את הרכב במכון בדיקה. מומלץ לבדוק לפני החתימה.");
  const pay = PAY[inputs.payment_method] || PAY.transfer;
  const defects = lines(inputs.known_defects);
  const balance = price > 0 ? price - deposit : 0;

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם מכר רכב משומש</h1>`);
  p.push(`<p>שנערך ונחתם ב${blank(inputs.signing_city, "________")} ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.seller_name)}, ת"ז ${blank(inputs.seller_id)}, מכתובת ${blank(inputs.seller_address)}, טלפון ${blank(inputs.seller_phone)} (להלן: "המוכר")</p>`);
  p.push(`<p><strong>לבין:</strong> ${blank(inputs.buyer_name)}, ת"ז ${blank(inputs.buyer_id)}, מכתובת ${blank(inputs.buyer_address)}, טלפון ${blank(inputs.buyer_phone)} (להלן: "הקונה")</p>`);
  p.push(sec("הרכב", `<p>המוכר מוכר לקונה רכב מסוג ${blank(inputs.car_model)}, שנת ייצור ${blank(inputs.car_year)}, מספר רישוי ${blank(inputs.license_plate)}, עם ${Number(inputs.mileage) > 0 ? Number(inputs.mileage).toLocaleString("en-US") : "________"} ק"מ במועד החתימה (להלן: "הרכב").</p>`));
  p.push(sec("הצהרות המוכר", `<ul><li>הרכב רשום על שם המוכר, והוא רשאי למכור אותו.</li><li>על הרכב אין שעבוד, עיקול, חוב אגרות או מגבלה אחרת שמונעת את העברת הבעלות, והמוכר יסיר כל מגבלה כזו על חשבונו לפני המסירה.</li><li>הקילומטראז' הרשום בהסכם הוא הקילומטראז' האמיתי, ולידיעת המוכר מד המרחק לא שונה.</li><li>תאונות ותיקונים מהותיים ידועים: ${blank(inputs.accidents, "לא ידוע למוכר על תאונה או תיקון מהותי")}.</li></ul>`));
  p.push(sec("מצב הרכב", `<p>הליקויים הידועים למוכר: ${defects.length ? "" : "אין ליקויים ידועים."}</p>${defects.length ? ul(defects) : ""}<p>הקונה ${isTrue(inputs.inspected) ? "בדק את הרכב במכון בדיקה" : "קיבל הזדמנות לבדוק את הרכב, לרבות במכון בדיקה"}, והוא רוכש אותו במצבו כפי שהוא במועד החתימה, בכפוף להצהרות המוכר בהסכם זה. אין בסעיף זה כדי לפטור את המוכר מאחריות לליקוי שהיה ידוע לו ולא גילה אותו.</p>`));
  p.push(sec("התמורה ותשלומה", `<p>הקונה ישלם למוכר ${money(price)} בעבור הרכב, כך: ${deposit > 0 ? `${money(deposit)} במעמד החתימה, והיתרה בסך ${money(balance)} ` : "מלוא הסכום "}במועד המסירה, באמצעות ${pay}. המוכר ימסור לקונה אישור בכתב על כל תשלום.</p>`));
  p.push(sec("מסירה והעברת בעלות", `<p>הרכב ימסר לקונה ביום ${heDate(inputs.handover_date)}, בשעה ______, יחד עם רישיון הרכב, המפתחות וכל מסמכי הרכב, ובמקביל לתשלום היתרה. באותו יום יבצעו הצדדים יחד את העברת הבעלות בסניף דואר או באזור האישי באתר הממשלתי. אגרת ההעברה תשולם בידי ________.</p>`));
  p.push(sec("דוחות, תשלומים וביטוח", `<p>דוחות, קנסות, אגרות ותשלומים בגין הרכב עד מועד המסירה יחולו על המוכר, ומאותו מועד על הקונה. הקונה לא ינהג ברכב לפני שיסדיר על שמו ביטוח חובה תקף.</p>`));
  p.push(sec("הפרה", `<p>הפר צד את ההסכם, רשאי הצד האחר לבטלו לאחר שנתן התראה בכתב ותקופה סבירה לתיקון ההפרה, וכן לתבוע את נזקיו לפי כל דין. לא הועברה הבעלות בשל מגבלה על הרכב, ישיב המוכר לקונה כל סכום ששולם, בתוך 7 ימים.</p>`));
  p.push(sec("שונות", `<p>הסכם זה ממצה את המוסכם בין הצדדים. שינוי ייעשה בכתב בלבד ובחתימת שני הצדדים.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "המוכר", name: inputs.seller_name }, { role: "הקונה", name: inputs.buyer_name }]));
  p.push(`<h2>לבדיקה לפני החתימה</h2><ul><li>בדקו ברשם המשכונות או במשרד הרישוי שאין על הרכב שעבוד או עיקול.</li><li>השוו את פרטי הרכב בהסכם לרישיון הרכב ולמספר השלדה.</li><li>בדקו את הרכב במכון בדיקה ובקשו היסטוריית טיפולים.</li><li>תאמו את העברת הבעלות ליום המסירה, ואל תמסרו רכב בלי העברה.</li></ul>`);
  p.push(DISCLAIMER, `</div>`);
  return { title: inputs.license_plate ? `הסכם מכר רכב ${String(inputs.license_plate).trim()}` : "הסכם מכר רכב משומש", html: p.join("\n"), warnings };
}
