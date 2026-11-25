// מחולל הסכם בוררות - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק הבוררות, התשכ"ח-1968: סעיפים 1, 2, 20, 21, 23, 24, 27 והתוספת. אומת 25.11.2026 מול רשומות (מאגר הכנסת).

export const CONFIG = {
  scheduleAwardMonths: 3, // התוספת לחוק הבוררות: פסק בתוך 3 חודשים
  scheduleExtensionMonths: 3, // הארכה עד 3 חודשים נוספים
  annulmentDays: 45, // סעיף 27: בקשת ביטול ככלל בתוך 45 ימים
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
  if (!inputs.party_a_name || !inputs.party_b_name) warnings.push("חסרים שמות הצדדים.");
  if (!inputs.dispute) warnings.push("חסר תיאור הסכסוך או החוזה.");
  if (!inputs.arbitrator_name && !inputs.appointment) warnings.push("לא נקבע בורר ולא נקבעה דרך למנותו. בלי מנגנון מינוי עלולה להידרש פנייה לבית המשפט.");
  const count = Math.max(1, Math.round(Number(inputs.arbitrators_count)) || 1);
  if (count % 2 === 0) warnings.push("נקבע מספר זוגי של בוררים. לפי התוספת לחוק הבוררות, בורר רשאי לבקש מינוי בורר נוסף כיושב ראש. שקלו בורר יחיד או שלושה.");
  const months = Math.max(1, Math.round(Number(inputs.award_months)) || CONFIG.scheduleAwardMonths);
  const A = blank(inputs.party_a_name), B = blank(inputs.party_b_name);

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם בוררות</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${A}, ת"ז/ח.פ. ${blank(inputs.party_a_id)} (להלן: "צד א'")</p><p><strong>לבין:</strong> ${B}, ת"ז/ח.פ. ${blank(inputs.party_b_id)} (להלן: "צד ב'")</p>`);
  p.push(sec("ההסכמה לבוררות", `<p>${inputs.scope === "future" ? `כל סכסוך שיתגלע בין הצדדים בקשר ל${blank(inputs.dispute)}, לרבות בעניין תוקפו, פרשנותו, קיומו או הפרתו, יוכרע בבוררות לפי הסכם זה ולא בבית המשפט.` : `הצדדים מוסרים להכרעה בבוררות את הסכסוך שנתגלע ביניהם בעניין: ${blank(inputs.dispute)}.`}</p>`));
  p.push(sec("הבורר", `<p>${inputs.arbitrator_name ? `הבורר${count > 1 ? " הראשון" : ""} יהיה ${esc(String(inputs.arbitrator_name).trim())}.` : `הבורר ימונה כך: ${blank(inputs.appointment)}.`} מספר הבוררים: ${count === 1 ? "בורר יחיד" : count}. הבורר יגלה לצדדים, לפני תחילת הבוררות, כל קשר לצדדים או לעניין שעלול ליצור ניגוד עניינים.</p>`));
  p.push(sec("הדין וסדרי הדין", `<p>${flag(inputs.bound_by_law, true) ? "הבורר יכריע לפי הדין המהותי החל בישראל." : "הבורר לא יהיה קשור לדין המהותי, ויכריע לפי מיטב שיקול דעתו, כאמור בתוספת לחוק הבוררות."} ${isTrue(inputs.bound_by_procedure) ? "הבורר יהיה כפוף לסדרי הדין ולדיני הראיות הנוהגים בבתי המשפט." : "הבורר לא יהיה קשור לסדרי הדין ולדיני הראיות, ויקבע את סדרי הבוררות כפי שייראה לו צודק ויעיל, תוך מתן הזדמנות נאותה לכל צד לטעון ולהביא ראיות."}</p>`));
  p.push(sec("פסק הבוררות", `<p>פסק הבוררות יינתן בכתב, ייחתם בידי הבורר בציון תאריך החתימה${flag(inputs.reasoned_award, true) ? " ויהיה מנומק" : ""}. הפסק יינתן בתוך ${months} חודשים מתחילת הדיון הראשון, והבורר רשאי להאריך את המועד ב-${CONFIG.scheduleExtensionMonths} חודשים נוספים בהחלטה מנומקת, או יותר בהסכמת הצדדים.</p>`));
  p.push(sec("שכר הבורר והוצאות", `<p>${inputs.fee_split === "loser" ? "שכר הבורר וההוצאות ייפסקו לפי שיקול דעת הבורר בפסק." : "הצדדים יישאו בשכר הבורר בחלקים שווים במהלך ההליך, והבורר רשאי לפסוק בפסק את חלוקת ההוצאות בין הצדדים."} שכר הבורר ייקבע בהסכם נפרד עם הבורר לפני תחילת הבוררות.</p>`));
  if (flag(inputs.confidential, true)) p.push(sec("סודיות", `<p>הבוררות, הכתבים, הראיות והפסק יישמרו בסוד, למעט הגשתם לבית המשפט לצורך אישור הפסק, ביטולו או אכיפתו.</p>`));
  p.push(sec("מקום וסמכות", `<p>הבוררות תתקיים ב${blank(inputs.seat, "________")}. כל צד רשאי לבקש מבית המשפט המוסמך לאשר את פסק הבוררות לפי חוק הבוררות, התשכ"ח-1968. בכל עניין שלא נקבע בהסכם זה יחולו הוראות החוק והתוספת לו.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "צד א'", name: inputs.party_a_name }, { role: "צד ב'", name: inputs.party_b_name }]));
  p.push(`<h2>מה חשוב לדעת</h2><ul><li>הסכם בוררות חייב להיות בכתב.</li><li>כשההסכם שותק, חלות הוראות התוספת לחוק: בורר יחיד, פסק בתוך ${CONFIG.scheduleAwardMonths} חודשים, והבורר אינו קשור לדין המהותי ולסדרי הדין.</li><li>בקשה לביטול פסק בוררות מוגשת ככלל בתוך ${CONFIG.annulmentDays} ימים מיום שהפסק נמסר.</li></ul>`, DISCLAIMER, `</div>`);
  return { title: "הסכם בוררות", html: p.join("\n"), warnings };
}
