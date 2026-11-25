// מחולל הסכם עבודה אישי - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// פרטי חוק הודעה לעובד ו-30 ימים (כל זכות); אי ויתור על זכויות מגן (כל זכות); הודעה מוקדמת בכתב (כל זכות). נבדק 25.11.2026.

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

const REST = { saturday: "שבת", friday: "שישי", sunday: "ראשון" };

export function generate(inputs = {}) {
  const warnings = [];
  for (const [k, l] of [["employer_name", "שם המעסיק"], ["employee_name", "שם העובד"], ["role", "התפקיד"], ["manager", "הממונה הישיר"], ["hours", "שעות העבודה"]]) if (!inputs[k]) warnings.push(`חסר פרט שחוק הודעה לעובד מחייב: ${l}.`);
  if (!(Number(inputs.monthly_salary) > 0)) warnings.push("חסר השכר החודשי.");
  if (!parseDate(inputs.start_date)) warnings.push("חסר תאריך תחילת העבודה.");
  if (!inputs.pension_fund) warnings.push("לא צוינה קרן הפנסיה. החוק מחייב לציין את הגופים שאליהם מועברות ההפרשות.");
  const trial = Math.max(0, Math.round(Number(inputs.trial_months)) || 0);
  if (trial > 6) warnings.push(`תקופת ניסיון של ${trial} חודשים ארוכה מהמקובל. תקופת ניסיון אינה מבטלת זכויות ואינה פוטרת משימוע.`);
  const extras = lines(inputs.extras);

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם עבודה אישי</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.employer_name)}, ח.פ./ת"ז ${blank(inputs.employer_id)} (להלן: "המעסיק")</p><p><strong>לבין:</strong> ${blank(inputs.employee_name)}, ת"ז ${blank(inputs.employee_id)}, מכתובת ${blank(inputs.employee_address)} (להלן: "העובד")</p>`);
  p.push(sec("תחילת העבודה ותקופתה", `<p>העובד יחל לעבוד ביום ${heDate(inputs.start_date)}, לתקופה בלתי קצובה.${trial > 0 ? ` ${trial} החודשים הראשונים הם תקופת ניסיון, ובה יחולו כל זכויות העובד לפי דין.` : ""}</p>`));
  p.push(sec("התפקיד", `<p>העובד יועסק בתפקיד ${blank(inputs.role)}, ויהיה כפוף ל${blank(inputs.manager)}. העובד יבצע את תפקידו במסירות ובנאמנות, ויודיע למעסיק על כל עניין שבו עלול להיות לו ניגוד עניינים.</p>`));
  p.push(sec("היקף המשרה ושעות העבודה", `<p>${inputs.scope === "partial" ? "משרה חלקית" : "משרה מלאה"}: ${blank(inputs.hours)}. יום המנוחה השבועי: ${REST[inputs.rest_day] || "שבת"}. עבודה בשעות נוספות תיעשה לפי הצורך ובאישור הממונה, ותשולם לפי חוק שעות עבודה ומנוחה.</p>`));
  p.push(sec("השכר", `<p>שכר חודשי ברוטו: ${money(inputs.monthly_salary)}. השכר ישולם לא יאוחר מה-9 בחודש שלאחר חודש העבודה.${extras.length ? " רכיבים נוספים:" : ""}</p>${extras.length ? ul(extras) : ""}<p>החזר הוצאות נסיעה ישולם לפי הדין וצו ההרחבה החל.</p>`));
  p.push(sec("פנסיה והפרשות", `<p>המעסיק יבטח את העובד בביטוח פנסיוני ב${blank(inputs.pension_fund)}, בשיעורי ההפקדה לפי הדין וצו ההרחבה החל, או בשיעורים גבוהים יותר שיוסכמו בכתב.${flag(inputs.section14, true) ? " על ההפקדות לרכיב הפיצויים יחול הסדר לפי סעיף 14 לחוק פיצויי פיטורים, התשכ\"ג-1963, כך שהן יבואו במקום פיצויי הפיטורים בגין התקופה והשכר שבעדם הופקדו, לפי האישור הכללי החל." : ""}${isTrue(inputs.study_fund) ? " המעסיק יפריש לקרן השתלמות בשיעורים שיוסכמו בכתב." : ""}</p>`));
  p.push(sec("חופשה, מחלה והבראה", `<p>העובד יהיה זכאי לחופשה שנתית, דמי מחלה ודמי הבראה לפי הדין, ולא פחות מכך.</p>`));
  if (flag(inputs.confidentiality, true)) p.push(sec("סודיות", `<p>העובד ישמור בסוד מידע עסקי של המעסיק שאינו נחלת הכלל ושהגיע אליו במסגרת עבודתו, גם לאחר סיום העבודה. אין בסעיף זה כדי למנוע מהעובד להשתמש בידע ובניסיון הכללי שרכש.</p>`));
  if (isTrue(inputs.ip_clause)) p.push(sec("קניין רוחני", `<p>זכויות בתוצרים ובהמצאות שהעובד יצר במסגרת עבודתו ובקשר אליה שייכות למעסיק, בכפוף לדין.</p>`));
  p.push(sec("סיום העבודה", `<p>כל צד רשאי לסיים את העבודה בהודעה מוקדמת בכתב, לפי חוק הודעה מוקדמת לפיטורים ולהתפטרות. לפני החלטה על פיטורים יוזמן העובד לשימוע. המעסיק רשאי לוותר על עבודת העובד בתקופת ההודעה ולשלם לו חלף הודעה מוקדמת. בסיום העבודה יימסר לעובד אישור על תקופת העבודה.</p>`));
  p.push(sec("שונות", `<p>הסכם זה כולל את הפרטים הנדרשים לפי חוק הודעה לעובד, ובא במקום הודעה נפרדת. שינוי בתנאים יימסר לעובד בכתב בתוך 30 ימים. בכל מקרה של סתירה בין הסכם זה לבין זכות שמוקנית לעובד בחוק, בצו הרחבה או בהסכם קיבוצי, תחול ההוראה המיטיבה עם העובד.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "המעסיק", name: inputs.employer_name }, { role: "העובד", name: inputs.employee_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם עבודה אישי", html: p.join("\n"), warnings };
}
