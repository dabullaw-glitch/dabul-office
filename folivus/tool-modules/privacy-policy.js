// מחולל מדיניות פרטיות לאתר - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// סעיף 11 לחוק הגנת הפרטיות לפי הנחיית הרשות להגנת הפרטיות (gov.il). תיקון 13 בתוקף מ-14.8.2025. נבדק 25.11.2026.

export const CONFIG = {
  amendment13Effective: "14.8.2025",
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
  if (!inputs.business_name) warnings.push("חסר שם העסק. חובת היידוע כוללת את שם בעל השליטה במידע.");
  if (!inputs.contact_email) warnings.push("חסרה כתובת לפניות. חובת היידוע כוללת את דרכי ההתקשרות.");
  const data = lines(inputs.data_collected), purposes = lines(inputs.purposes), recips = lines(inputs.recipients);
  if (!data.length) warnings.push("לא פורט איזה מידע נאסף.");
  if (!purposes.length) warnings.push("לא פורטו מטרות השימוש. המטרה היא פרט חובה בהודעה לפי סעיף 11.");
  if (isTrue(inputs.marketing)) warnings.push("דיוור שיווקי דורש הסכמה מפורשת מראש ואפשרות הסרה. ודאו שבטופס יש תיבת הסכמה נפרדת שאינה מסומנת מראש.");
  if (isTrue(inputs.storage_abroad)) warnings.push("המידע נשמר מחוץ לישראל. העברת מידע לחו\"ל כפופה לכללים מיוחדים, ומומלץ לבדוק אותם.");
  if (!parseDate(inputs.effective_date)) warnings.push("חסר תאריך עדכון המדיניות.");
  const BN = blank(inputs.business_name);

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>מדיניות פרטיות: ${blank(inputs.site_name)}</h1>`, `<p>עודכן לאחרונה: ${heDate(inputs.effective_date)}</p>`);
  p.push(sec("מי אנחנו", `<p>${BN}${inputs.business_id ? `, ${esc(String(inputs.business_id).trim())}` : ""} (להלן: "אנחנו") מפעיל את ${blank(inputs.site_name)} ואחראי למידע האישי שנאסף בו. לפניות בנושא פרטיות: ${blank(inputs.contact_email)}${inputs.contact_address ? `, או בדואר: ${esc(String(inputs.contact_address).trim())}` : ""}.</p>`));
  p.push(sec("איזה מידע אנחנו אוספים", data.length ? ul(data) : "<p>____________</p>"));
  p.push(sec("האם חובה למסור את המידע", `<p>${isTrue(inputs.legal_obligation) ? "חלה עליכם חובה חוקית למסור חלק מהמידע, כמפורט בטופס הרלוונטי." : "לא חלה עליכם חובה חוקית למסור לנו מידע. המסירה תלויה ברצונכם ובהסכמתכם."} אם לא תמסרו מידע שמסומן כנדרש, ייתכן שלא נוכל לתת לכם את השירות המבוקש, למשל לחזור אליכם.</p>`));
  p.push(sec("למה אנחנו משתמשים במידע", purposes.length ? ul(purposes) : "<p>____________</p>"));
  p.push(sec("למי אנחנו מעבירים מידע", `${recips.length ? `<p>אנחנו מעבירים מידע רק לגורמים הבאים, ורק למטרות המפורטות:</p>${ul(recips)}` : "<p>איננו מעבירים מידע אישי לאחרים."}</p><p>בנוסף, נמסור מידע אם נידרש לכך לפי דין או צו. איננו מוכרים מידע אישי.</p>`));
  if (flag(inputs.cookies, true)) p.push(sec("עוגיות וכלי מדידה", `<p>האתר משתמש בעוגיות (קבצים קטנים שנשמרים בדפדפן) כדי שיפעל כראוי ולמדידת השימוש בו${inputs.analytics ? `, לרבות באמצעות: ${esc(String(inputs.analytics).trim())}` : ""}. אפשר לחסום או למחוק עוגיות בהגדרות הדפדפן, אך חלק מהשירותים עלולים לא לפעול.</p>`));
  p.push(sec("דיוור", `<p>${isTrue(inputs.marketing) ? "נשלח אליכם דיוור שיווקי רק אם הסכמתם לכך במפורש. אפשר להסיר את עצמכם בכל עת בקישור שבכל הודעה או בפנייה אלינו." : "איננו שולחים דיוור שיווקי."}</p>`));
  p.push(sec("אבטחה ושמירה", `<p>אנחנו נוקטים אמצעים סבירים לאבטחת המידע, בהתאם לרגישותו. המידע נשמר ${blank(inputs.retention, "כל עוד הוא נדרש למטרות שלשמן נאסף")}${isTrue(inputs.storage_abroad) ? ", בשרתים שחלקם מחוץ לישראל" : ""}.</p>`));
  p.push(sec("הזכויות שלכם", `<p>אתם רשאים לעיין במידע האישי שלכם שנשמר אצלנו, ולבקש לתקן מידע שאינו נכון, שלם, ברור או מעודכן. פנו אלינו בכתובת ${blank(inputs.contact_email)}, ונשיב בהקדם ובתוך המועדים שבדין.</p>`));
  p.push(sec("שינויים במדיניות", `<p>נעדכן את המדיניות מעת לעת. תאריך העדכון האחרון מופיע בראש העמוד, ושינוי מהותי יפורסם באתר.</p>`));
  p.push(`<p>המדיניות נכתבה לפי חובת היידוע שבסעיף 11 לחוק הגנת הפרטיות, התשמ"א-1981, כפי שתוקן בתיקון 13 (בתוקף מ-${CONFIG.amendment13Effective}).</p>`, DISCLAIMER, `</div>`);
  return { title: `מדיניות פרטיות: ${inputs.site_name ? String(inputs.site_name).trim() : "אתר"}`, html: p.join("\n"), warnings };
}
