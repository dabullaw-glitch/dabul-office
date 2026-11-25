// מחולל הסכם שכירות משנה - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// סעיף 22 לחוק השכירות והשאילה, התשל"א-1971: העברת זכות השכירות טעונה הסכמת המשכיר. אומת 25.11.2026.

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

const BILLS = {
  subtenant: "שוכר המשנה ישלם בתקופת שכירות המשנה את הארנונה, המים, החשמל, הגז ודמי ועד הבית השוטפים.",
  included: "דמי השכירות כוללים את התשלומים השוטפים (ארנונה, מים, חשמל, גז וועד בית), בשימוש סביר.",
  split: "התשלומים השוטפים יחולקו לפי חלקו היחסי של שוכר המשנה בתקופה, לפי החשבונות בפועל.",
};

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.tenant_name) warnings.push("חסר שם השוכר הראשי.");
  if (!inputs.subtenant_name) warnings.push("חסר שם שוכר המשנה.");
  if (!inputs.property_address) warnings.push("חסרה כתובת הדירה.");
  if (!(Number(inputs.monthly_rent) > 0)) warnings.push("חסרים דמי השכירות.");
  if (!isTrue(inputs.landlord_consent)) warnings.push("לא סומנה הסכמה בכתב של בעל הדירה. לפי סעיף 22 לחוק השכירות והשאילה, שכירות משנה טעונה את הסכמת המשכיר.");
  const s = parseDate(inputs.start_date), e = parseDate(inputs.end_date), me = parseDate(inputs.main_lease_end);
  if (s && e && e <= s) warnings.push("מועד הסיום חייב להיות אחרי מועד ההתחלה.");
  if (e && me && e > me) warnings.push("שכירות המשנה מסתיימת אחרי סיום השכירות הראשית. אי אפשר להשכיר לתקופה שבה לשוכר הראשי אין זכות בדירה.");
  const day = Math.min(28, Math.max(1, Math.round(Number(inputs.payment_day)) || 1));
  const furniture = lines(inputs.furniture);

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם שכירות משנה</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.tenant_name)}, ת"ז ${blank(inputs.tenant_id)} (להלן: "השוכר הראשי")</p><p><strong>לבין:</strong> ${blank(inputs.subtenant_name)}, ת"ז ${blank(inputs.subtenant_id)} (להלן: "שוכר המשנה")</p>`);
  p.push(sec("הצהרות השוכר הראשי", `<p>השוכר הראשי שוכר את הדירה ברחוב ${blank(inputs.property_address)} מאת ${blank(inputs.landlord_name)} (להלן: "בעל הדירה"), לפי הסכם שכירות שתקופתו מסתיימת ביום ${heDate(inputs.main_lease_end)} (להלן: "ההסכם הראשי"). ${isTrue(inputs.landlord_consent) ? `בעל הדירה נתן הסכמתו בכתב לשכירות המשנה ביום ${heDate(inputs.consent_date)}, והעתק ההסכמה מצורף.` : "השוכר הראשי מתחייב להשיג את הסכמת בעל הדירה בכתב לפני מסירת החזקה, והסכם זה מותנה בהסכמה זו."}</p>`));
  p.push(sec("המושכר", `<p>השוכר הראשי משכיר לשוכר המשנה ${blank(inputs.part, "את כל הדירה")} (להלן: "המושכר"), לרבות הציוד המפורט בנספח.</p>`));
  p.push(sec("תקופת שכירות המשנה", `<p>מיום ${heDate(inputs.start_date)} ועד יום ${heDate(inputs.end_date)}. בכל מקרה שכירות המשנה תסתיים לא יאוחר ממועד סיום ההסכם הראשי.</p>`));
  p.push(sec("דמי השכירות", `<p>שוכר המשנה ישלם לשוכר הראשי ${money(inputs.monthly_rent)} לחודש, עד היום ה-${day} בכל חודש, בהעברה בנקאית.</p>`));
  p.push(sec("תשלומים שוטפים", `<p>${BILLS[inputs.bills] || BILLS.subtenant}</p>`));
  p.push(sec("שמירה על תנאי ההסכם הראשי", `<p>שוכר המשנה ישתמש במושכר למגורים בלבד, ישמור עליו ויקיים את הוראות ההסכם הראשי הנוגעות לשימוש במושכר. שוכר המשנה לא ישכיר את המושכר לאחר. השוכר הראשי נשאר אחראי כלפי בעל הדירה לכל התחייבויותיו לפי ההסכם הראשי.</p>`));
  p.push(sec("תיקונים ונזקים", `<p>שוכר המשנה יודיע מיד לשוכר הראשי על כל ליקוי. נזק שנגרם בשימוש בלתי סביר של שוכר המשנה יתוקן על חשבונו. בלאי סביר לא ייחשב לנזק.</p>`));
  if (Number(inputs.deposit) > 0) p.push(sec("פיקדון", `<p>שוכר המשנה ימסור במעמד החתימה פיקדון של ${money(inputs.deposit)}. הפיקדון יוחזר בתוך 30 ימים מסיום התקופה ומהחזרת המושכר, בניכוי חובות ונזקים שהוכחו ושנמסרה עליהם הודעה בכתב.</p>`));
  p.push(sec("פינוי", `<p>בתום התקופה ישיב שוכר המשנה את המושכר נקי ופנוי, במצב שבו קיבל אותו, למעט בלאי סביר.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "השוכר הראשי", name: inputs.tenant_name }, { role: "שוכר המשנה", name: inputs.subtenant_name }]));
  p.push(`<h2>נספח: ציוד ומצב המושכר</h2>`, furniture.length ? ul(furniture) : `<p>____________</p>`, DISCLAIMER, `</div>`);
  return { title: "הסכם שכירות משנה", html: p.join("\n"), warnings };
}
