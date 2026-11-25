// מחולל נוהל עבודה מהבית לעובדים - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// אין חוק כולל לעבודה מהבית. הודעה על שינוי תנאים בתוך 30 ימים (כל זכות). תיקון 13 לחוק הגנת הפרטיות בתוקף מ-14.8.2025.

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
  if (!inputs.company_name) warnings.push("חסר שם המעסיק.");
  if (!parseDate(inputs.effective_date)) warnings.push("חסר תאריך תחילת הנוהל.");
  const days = Math.min(5, Math.max(0, Math.round(numOr(inputs.days_per_week, 2))));
  if (isTrue(inputs.monitoring)) warnings.push("סומן ניטור מערכות. ניטור עובדים מעורר שאלות של פרטיות, ותיקון 13 לחוק הגנת הפרטיות (בתוקף מ-14.8.2025) חידד את חובות היידוע. בדקו את ההסדר לפני הפעלתו.");
  if (inputs.equipment_by === "employee") warnings.push("העובד משתמש בציוד שלו. קבעו כללי אבטחת מידע ברורים לציוד אישי, ושקלו השתתפות בעלויות.");
  const revoke = inputs.revoke_notice_days === undefined || inputs.revoke_notice_days === "" ? 14 : Math.max(0, Math.round(Number(inputs.revoke_notice_days)) || 0);
  const allowance = Number(inputs.monthly_allowance) > 0 ? Number(inputs.monthly_allowance) : 0;

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>נוהל עבודה מהבית</h1>`, `<p>${blank(inputs.company_name)}. בתוקף מיום ${heDate(inputs.effective_date)}</p>`);
  p.push(sec("מטרה ותחולה", `<p>הנוהל קובע את הכללים לעבודה מהבית. הוא חל על ${blank(inputs.eligible)}. עבודה מהבית היא אפשרות שניתנת לפי צורכי העבודה, ואינה משנה את שאר תנאי ההעסקה. אם הנוהל משנה פרט שמופיע בהודעה לעובד על תנאי העסקתו, תימסר לעובד הודעה בכתב על השינוי.</p>`));
  p.push(sec("אישור והיקף", `<p>עבודה מהבית טעונה אישור של ${blank(inputs.approver, "הממונה הישיר")}, עד ${days} ימים בשבוע. הממונה רשאי לדרוש הגעה למשרד בימים מסוימים לפי צורכי העבודה, בהודעה סבירה מראש.</p>`));
  p.push(sec("זמינות ושעות עבודה", `<p>בימי עבודה מהבית העובד יהיה זמין בטלפון ובכלי התקשורת של החברה, לפחות בשעות ${blank(inputs.core_hours, "10:00 עד 15:00")}. דיני שעות העבודה והמנוחה חלים גם בעבודה מהבית. עבודה בשעות נוספות תיעשה רק באישור מראש, ותשולם לפי הדין.</p>`));
  p.push(sec("דיווח שעות", `<p>העובד ידווח על שעות עבודתו ${inputs.time_reporting === "manual" ? "בדיווח יומי לממונה, הכולל שעת התחלה וסיום" : "במערכת הנוכחות הדיגיטלית של החברה"}, באותו אופן כמו בעבודה מהמשרד.</p>`));
  p.push(sec("ציוד והוצאות", `<p>${inputs.equipment_by === "employee" ? "העובד ישתמש בציוד שלו, בכפוף לדרישות אבטחת המידע שבנוהל." : "המעסיק יספק לעובד מחשב וציוד נלווה. הציוד שייך למעסיק, ישמש לעבודה בלבד ויוחזר בסיום העבודה."} ${allowance > 0 ? `המעסיק ישתתף בהוצאות העבודה מהבית בסך ${money(allowance)} לחודש.` : "השתתפות בהוצאות תיקבע בהסכמה, אם תיקבע."}</p>`));
  p.push(sec("אבטחת מידע", `<ul><li>עבודה רק דרך חיבור מאובטח ומערכות שהחברה אישרה.</li><li>נעילת המחשב בכל עזיבה של עמדת העבודה, וסיסמה שאינה משותפת לבני הבית.</li><li>אין לשמור מידע של החברה או של לקוחות על התקנים אישיים או בשירותי ענן פרטיים.</li><li>שיחות עבודה רגישות יתקיימו במקום שאחרים אינם שומעים.</li><li>אובדן ציוד או חשד לדליפת מידע ידווחו מיד.</li></ul>`));
  p.push(sec("פרטיות", `<p>${isTrue(inputs.monitoring) ? "החברה מנטרת את השימוש במערכות ובחשבונות של החברה לצורכי אבטחת מידע ותפעול. הניטור נעשה לפי מדיניות שפורסמה לעובדים, למטרות אלה בלבד ובמידה הנדרשת. החברה אינה מנטרת מכשירים, חשבונות או תכתובות פרטיים של העובד." : "החברה אינה מנטרת את פעילות העובד במחשב. אם תוחלט מדיניות ניטור, היא תפורסם מראש לעובדים."}</p>`));
  p.push(sec("בטיחות", `<p>העובד יעבוד בעמדה נוחה ובטוחה, ויודיע לממונה מיד על כל פגיעה שאירעה במהלך העבודה.</p>`));
  p.push(sec("שינוי וביטול", `<p>החברה רשאית לשנות את הנוהל או לבטל אישור לעבודה מהבית, בהודעה של ${revoke} ימים מראש, אלא אם עבודה מהבית נקבעה בחוזה העבודה האישי.</p>`));
  p.push(`<p>קראתי את הנוהל ואני מתחייב לפעול לפיו. שם העובד: __________ חתימה: __________ תאריך: ________</p>`, DISCLAIMER, `</div>`);
  return { title: "נוהל עבודה מהבית", html: p.join("\n"), warnings };
}
