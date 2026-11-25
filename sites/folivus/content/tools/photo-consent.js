// מחולל טופס הסכמה לצילום ופרסום תמונות - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// הסכמה לשימוש בתמונה אינה מתרחבת מעבר להיקפה (פסק דין שסוכם בכל זכות, נבדק 25.11.2026).

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
  if (!inputs.organization) warnings.push("חסר שם הארגון המצלם.");
  if (!inputs.subject_name) warnings.push("חסר שם המצולם.");
  if (!inputs.occasion) warnings.push("חסר תיאור האירוע או מטרת הצילום.");
  if (!inputs.contact) warnings.push("חסרים פרטי קשר לחזרה מהסכמה.");
  const minor = isTrue(inputs.minor);
  if (minor && !inputs.guardian_name) warnings.push("המצולם קטין. נדרשת חתימת הורה או אפוטרופוס, והזינו את שמו.");
  const uses = [];
  if (flag(inputs.use_website, true)) uses.push("פרסום באתר האינטרנט של הארגון");
  if (flag(inputs.use_social, true)) uses.push("פרסום בחשבונות הרשתות החברתיות של הארגון");
  if (isTrue(inputs.use_print)) uses.push("פרסום בדפוס, כמו עלונים ושלטים");
  if (isTrue(inputs.use_ads)) uses.push("שימוש בפרסומת ממומנת ובקמפיינים");
  if (!uses.length) warnings.push("לא סומן אף שימוש. סמנו כל שימוש מבוקש בנפרד.");
  if (isTrue(inputs.use_ads)) warnings.push("שימוש בפרסומת דורש הסכמה נפרדת ומפורשת. ודאו שהמצולם סימן אותו בעצמו והבין את היקף הקמפיין.");
  const months = Math.max(0, Math.round(numOr(inputs.duration_months, 24)));
  const pay = Number(inputs.payment) > 0 ? Number(inputs.payment) : 0;

  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכמה לצילום ולפרסום</h1>`, `<p>תאריך: ${heDate(inputs.date)}</p>`);
  p.push(`<p>אני, ${minor ? `${blank(inputs.guardian_name)}, הורה או אפוטרופוס של הקטין/ה ${blank(inputs.subject_name)}` : `${blank(inputs.subject_name)}, ת"ז ${blank(inputs.subject_id)}`}, מסכים/ה ש${blank(inputs.organization)} (להלן: "הארגון") יצלם ${minor ? "את הקטין/ה" : "אותי"} בתמונות ובסרטונים במסגרת: ${blank(inputs.occasion)}.</p>`);
  p.push(`<h2>השימושים שאני מסכים/ה להם (רק המסומנים)</h2>${uses.length ? ul(uses) : "<p>לא סומן שימוש.</p>"}<p>הארגון לא ישתמש בצילומים לכל מטרה אחרת בלי הסכמה נוספת בכתב.</p>`);
  p.push(`<h2>תנאים</h2><ul><li>שם המצולם ${isTrue(inputs.show_name) ? "יכול להתפרסם לצד הצילומים" : "לא יתפרסם"}.</li><li>משך השימוש: ${months ? `${months} חודשים מיום הצילום` : "ללא הגבלת זמן, עד חזרה מההסכמה"}.</li><li>תמורה: ${pay ? money(pay) : "ללא תמורה"}.</li><li>הצילומים לא ישמשו באופן שעלול להשפיל, להטעות או לפגוע בשמו הטוב של המצולם.</li><li>אפשר לחזור מההסכמה לגבי פרסומים עתידיים בהודעה בכתב ל: ${blank(inputs.contact)}. הארגון יסיר את הצילומים מהאתר ומהרשתות שבשליטתו בתוך זמן סביר. פרסום שכבר הודפס או הופץ לא ניתן להחזיר.</li></ul>`);
  p.push(`<p>חתימת ${minor ? "ההורה או האפוטרופוס" : "המצולם/ת"}: __________</p>`);
  p.push(DISCLAIMER, `</div>`);
  return { title: "הסכמה לצילום ולפרסום", html: p.join("\n"), warnings };
}
