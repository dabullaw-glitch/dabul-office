// מחולל הסכם שכירות מסחרית (נכס לעסק) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק השכירות והשאילה, התשל"א-1971: סעיפים 2, 7, 22. אומת 25.11.2026 מול רשומות (מאגר הכנסת).

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
  if (!inputs.landlord_name) warnings.push("חסר שם המשכיר.");
  if (!inputs.tenant_name) warnings.push("חסר שם השוכר.");
  if (!inputs.property_address) warnings.push("חסרה כתובת הנכס.");
  if (!inputs.use) warnings.push("לא הוגדרה מטרת השימוש. בשכירות עסקית זה סעיף מרכזי, וגם רישוי העסק תלוי בו.");
  if (!(Number(inputs.monthly_rent) > 0)) warnings.push("חסרים דמי השכירות.");
  const s = parseDate(inputs.start_date), e = parseDate(inputs.end_date);
  if (!s || !e) warnings.push("חסרים מועדי תחילה או סיום.");
  if (s && e && e <= s) warnings.push("מועד הסיום חייב להיות אחרי מועד ההתחלה.");
  if (!(Number(inputs.bank_guarantee) > 0)) warnings.push("לא נקבעה ערבות. בשכירות עסקית מקובל לדרוש ערבות בנקאית או ערובה אחרת.");
  const opt = Math.max(0, Math.round(Number(inputs.option_months)) || 0);
  const fit = Math.max(0, Math.round(Number(inputs.fitout_months)) || 0);
  const freq = inputs.payment_frequency === "quarterly" ? "מראש לכל רבעון, ביום הראשון של הרבעון" : "מראש לכל חודש, עד היום ה-1 בחודש";

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם שכירות בלתי מוגנת לנכס מסחרי</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.landlord_name)}, ת"ז/ח.פ. ${blank(inputs.landlord_id)} (להלן: "המשכיר")</p><p><strong>לבין:</strong> ${blank(inputs.tenant_name)}, ת"ז/ח.פ. ${blank(inputs.tenant_id)} (להלן: "השוכר")</p>`);
  p.push(sec("המושכר ומטרת השימוש", `<p>המשכיר משכיר לשוכר את הנכס ברחוב ${blank(inputs.property_address)}, בשטח של כ-${Number(inputs.area_sqm) > 0 ? Number(inputs.area_sqm) : "____"} מ"ר (להלן: "המושכר"), לשימוש כ${blank(inputs.use)} בלבד. שינוי מטרת השימוש טעון הסכמת המשכיר בכתב.</p>`));
  p.push(sec("שכירות בלתי מוגנת", `<p>השוכר מצהיר שלא שילם דמי מפתח, וכי השכירות אינה מוגנת לפי חוק הגנת הדייר [נוסח משולב], התשל"ב-1972.</p>`));
  p.push(sec("רישוי עסק", `<p>השוכר אחראי להשגת רישיון עסק והיתרים לפעילותו, על חשבונו. המשכיר מצהיר שידוע לו שהשוכר מתכוון לפעול במושכר כאמור, ויחתום על מסמכים סבירים שיידרשו לשם כך. לא ניתן רישיון בשל מגבלה תכנונית בנכס שאינה תלויה בשוכר, בתוך ____ חודשים, רשאי השוכר לבטל את ההסכם בהודעה בכתב.</p>`));
  p.push(sec("תקופה ואופציה", `<p>השכירות תחל ביום ${heDate(inputs.start_date)} ותסתיים ביום ${heDate(inputs.end_date)}.${opt > 0 ? ` לשוכר אופציה להאריך את השכירות ב-${opt} חודשים נוספים, בהודעה בכתב לפחות 90 ימים לפני תום התקופה, ובלבד שקיים את התחייבויותיו. בתקופת האופציה יעלו דמי השכירות ב-${Number(inputs.option_increase) > 0 ? Number(inputs.option_increase) : 0}%.` : ""}${fit > 0 ? ` בתקופת התארגנות של ${fit} חודשים מתחילת השכירות השוכר פטור מדמי שכירות, אך יישא בתשלומים השוטפים.` : ""}</p>`));
  p.push(sec("דמי שכירות", `<p>השוכר ישלם ${money(inputs.monthly_rent)} לחודש בתוספת מע"מ כדין, ${freq}. ${flag(inputs.index_linked, true) ? "דמי השכירות צמודים למדד המחירים לצרכן. מדד הבסיס הוא המדד הידוע ביום החתימה, והם לא יפחתו מהסכום הנקוב." : "דמי השכירות אינם צמודים."}</p>`));
  p.push(sec("תשלומים שוטפים ודמי ניהול", `<p>השוכר ישלם ארנונה, מים, חשמל ותשלומים שוטפים הנובעים מהשימוש במושכר${Number(inputs.management_fee) > 0 ? `, וכן דמי ניהול של ${money(inputs.management_fee)} לחודש בתוספת מע"מ` : ""}. המשכיר יישא במסים ובתשלומים החלים על בעל הנכס.</p>`));
  p.push(sec("התאמות ושינויים", `<p>השוכר רשאי לבצע התאמות פנימיות לצורך עסקו, לאחר אישור המשכיר בכתב לתוכנית, ובלי לפגוע במבנה ובמערכות המשותפות. בתום השכירות יחליט המשכיר אם ההתאמות יישארו בלי תמורה או יפורקו והמושכר יוחזר למצבו.</p>`));
  p.push(sec("תיקונים", `<p>המשכיר יתקן בתוך זמן סביר ליקויים במבנה ובמערכות הקבועות ששוללים או מגבילים באופן ממשי את השימוש במושכר, למעט ליקויים שנגרמו בשימוש בלתי סביר של השוכר. השוכר יתחזק את המושכר ואת ההתאמות שביצע.</p>`));
  p.push(sec("ביטוחים", `<p>השוכר יבטח את תכולת העסק, את ההתאמות ואת אחריותו כלפי צד שלישי ועובדים. המשכיר יבטח את המבנה. כל צד ימציא אישור על קיום הביטוחים לפי דרישה.</p>`));
  p.push(sec("ערובה", `<p>להבטחת התחייבויותיו ימסור השוכר במעמד החתימה ערבות בנקאית אוטונומית צמודה בסך ${money(inputs.bank_guarantee)}, בתוקף עד 90 ימים לאחר תום השכירות. המשכיר יממש את הערבות רק לאחר התראה בכתב של 14 ימים.</p>`));
  p.push(sec("העברת זכויות", `<p>השוכר לא יעביר את זכויותיו ולא ישכיר בשכירות משנה בלי הסכמת המשכיר בכתב. המשכיר לא יסרב מטעמים בלתי סבירים להעברה לקונה של העסק שאיתנותו דומה.</p>`));
  p.push(sec("פינוי", `<p>בתום השכירות יפנה השוכר את המושכר וימסור אותו במצב טוב, למעט בלאי סביר והתאמות שהמשכיר החליט להשאיר. על כל יום איחור בפינוי ישלם השוכר דמי שימוש בגובה כפל דמי השכירות היומיים, כפיצוי מוסכם.</p>`));
  p.push(sec("שונות", `<p>שינוי בהסכם ייעשה בכתב בלבד. הודעות יישלחו לכתובות הצדדים או בדואר אלקטרוני שהוסכם.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "המשכיר", name: inputs.landlord_name }, { role: "השוכר", name: inputs.tenant_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם שכירות לנכס מסחרי", html: p.join("\n"), warnings };
}
