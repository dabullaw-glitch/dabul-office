// מחולל הסכם עיבוד מידע עם ספק (גורם חיצוני) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// תקנה 15 לתקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017, לפי מדריך יישום (ראו JSON). נבדק 25.11.2026.

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
  if (!inputs.owner_name) warnings.push("חסר שם המזמין.");
  if (!inputs.provider_name) warnings.push("חסר שם הספק.");
  const data = lines(inputs.data_types), purposes = lines(inputs.purposes), systems = lines(inputs.systems);
  if (!data.length) warnings.push("לא פורטו סוגי המידע. זה פרט חובה לפי תקנה 15.");
  if (!purposes.length) warnings.push("לא פורטו מטרות העיבוד. זה פרט חובה לפי תקנה 15.");
  if (!isTrue(inputs.risk_assessed)) warnings.push("לא סומן שבוצעה הערכת סיכוני אבטחה. לפי תקנה 15 יש לבחון את הסיכונים לפני ההתקשרות.");
  if (isTrue(inputs.storage_abroad)) warnings.push("המידע יישמר מחוץ לישראל. העברת מידע לחו\"ל כפופה לכללים מיוחדים.");
  if (isTrue(inputs.subcontractors)) warnings.push("הותר קבלן משנה. הספק חייב לחתום איתו על הסכם שכולל את כל אותם נושאים.");
  const term = Math.max(1, Math.round(Number(inputs.term_months)) || 12);
  const hours = Math.max(1, Math.round(Number(inputs.incident_hours)) || 24);

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם עיבוד מידע ואבטחת מידע</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.owner_name)}, ${blank(inputs.owner_id)} (להלן: "המזמין")</p><p><strong>לבין:</strong> ${blank(inputs.provider_name)}, ${blank(inputs.provider_id)} (להלן: "הספק")</p>`);
  p.push(sec("השירות", `<p>הספק נותן למזמין את השירות הבא: ${blank(inputs.service)}. הסכם זה קובע את התנאים לעיבוד מידע אישי במסגרת השירות, והוא גובר על כל הסכם אחר בעניין זה.</p>`));
  p.push(sec("המידע ומטרות העיבוד", `<p>הספק רשאי לעבד רק את סוגי המידע הבאים:</p>${data.length ? ul(data) : "<p>____________</p>"}<p>ורק למטרות הבאות:</p>${purposes.length ? ul(purposes) : "<p>____________</p>"}<p>הספק לא ישתמש במידע לכל מטרה אחרת, לרבות לצרכיו שלו.</p>`));
  p.push(sec("מערכות והרשאות", `<p>הספק רשאי לגשת למערכות הבאות: ${systems.length ? "" : "____________"}</p>${systems.length ? ul(systems) : ""}<p>סוג הגישה: ${inputs.access === "write" ? "צפייה, הזנה ושינוי" : "צפייה בלבד"}. הגישה תינתן רק לעובדי הספק שזקוקים לה לצורך השירות, והספק ינהל רשימה עדכנית שלהם.</p>`));
  p.push(sec("אבטחת מידע", `<p>הספק ינקוט אמצעי אבטחה המתאימים לרגישות המידע ולפחות כנדרש בתקנות הגנת הפרטיות (אבטחת מידע), התשע"ז-2017, ויפעל לפי הוראות האבטחה שיעביר לו המזמין.${isTrue(inputs.storage_abroad) ? " המידע יישמר מחוץ לישראל רק לאחר שהמזמין אישר זאת בכתב ובכפוף לדין." : " המידע יישמר בישראל בלבד, אלא אם המזמין אישר אחרת בכתב."}</p>`));
  p.push(sec("סודיות", `<p>הספק יחתים כל עובד או גורם מטעמו שמקבל הרשאה למידע על התחייבות לשמור על סודיות המידע, ויישא באחריות להפרה שלו.</p>`));
  p.push(sec("קבלני משנה", `<p>${isTrue(inputs.subcontractors) ? "הספק רשאי להיעזר בקבלן משנה רק לאחר הודעה מראש למזמין, ובתנאי שיחתום איתו על הסכם שכולל את כל הנושאים שבהסכם זה. הספק אחראי לפעולות קבלן המשנה." : "הספק לא יעביר מידע לקבלן משנה ולא ייתן את השירות באמצעותו בלי הסכמת המזמין מראש ובכתב."}</p>`));
  p.push(sec("דיווח ופיקוח", `<p>הספק ידווח למזמין על אירוע אבטחה שנוגע למידע מיד, ולא יאוחר מ-${hours} שעות מגילויו, וישתף פעולה בטיפול בו. בנוסף, הספק ידווח למזמין לפחות אחת לשנה על אופן קיום התחייבויותיו לפי הסכם זה. המזמין רשאי לבצע בקרה סבירה על קיום ההתחייבויות.</p>`));
  p.push(sec("תקופה וסיום", `<p>ההסכם בתוקף ${term} חודשים מיום החתימה, ובכל מקרה כל עוד הספק מחזיק במידע. בסיום ההתקשרות ${inputs.end_action === "delete" ? "ימחק הספק את המידע מכל מערכותיו" : "יחזיר הספק את המידע למזמין וימחק כל עותק שנותר אצלו"} בתוך 30 ימים, וימסור אישור בכתב על כך.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "המזמין", name: inputs.owner_name }, { role: "הספק", name: inputs.provider_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם עיבוד מידע ואבטחת מידע", html: p.join("\n"), warnings };
}
