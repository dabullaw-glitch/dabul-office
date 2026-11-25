// מחולל הסכם גישור (הסכם פתיחת הליך) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// עקרונות לפי נוסח הסכם הגישור של מחלקת הגישור ברשות השופטת (gov.il). נבדק 25.11.2026.

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
  if (!inputs.mediator_name) warnings.push("חסר שם המגשר.");
  if (!inputs.party_a_name || !inputs.party_b_name) warnings.push("חסרים שמות הצדדים.");
  if (!inputs.subject) warnings.push("חסר נושא הסכסוך.");
  if (!(Number(inputs.fee) > 0)) warnings.push("לא הוזן שכר המגשר. סכמו אותו מראש ובכתב.");
  if (isTrue(inputs.court_referral) && !inputs.case_number) warnings.push("הגישור בהפניה מבית משפט, אבל לא הוזן מספר ההליך.");
  const A = blank(inputs.party_a_name), B = blank(inputs.party_b_name);
  const split = { equal: "בחלקים שווים בין הצדדים", a: `על ידי ${A}`, b: `על ידי ${B}` }[inputs.fee_split] || "בחלקים שווים בין הצדדים";
  const unit = inputs.fee_unit === "hour" ? "לשעה" : "לפגישה";

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם גישור</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${A} (להלן: "צד א'") <strong>לבין:</strong> ${B} (להלן: "צד ב'") <strong>ובין:</strong> ${blank(inputs.mediator_name)}, ${blank(inputs.mediator_details, "________")} (להלן: "המגשר")</p>`);
  p.push(sec("נושא הגישור", `<p>הצדדים פונים לגישור בעניין: ${blank(inputs.subject)}.${isTrue(inputs.court_referral) ? ` הגישור נעשה בהפניה מבית המשפט, בהליך ${blank(inputs.case_number)}.` : ""}</p>`));
  p.push(sec("רצון חופשי ותום לב", `<p>הצדדים משתתפים בגישור מרצונם החופשי, ומתחייבים לנהל אותו בתום לב ולמסור את המידע הדרוש ליישוב הסכסוך.</p>`));
  p.push(sec("תפקיד המגשר", `<p>המגשר יפעל בתום לב ובמקצועיות כדי לסייע לצדדים להגיע להסכמה, ואין לו סמכות להכריע בסכסוך. המגשר מצהיר שגילה לצדדים כל קשר מקצועי או אישי קודם עם מי מהם, ויפסיק את הגישור אם ייווצר ניגוד עניינים. המגשר רשאי לקיים פגישות נפרדות עם כל צד, ומה שנאמר לו בפגישה נפרדת לא יועבר לצד השני בלי הסכמה.</p>`));
  p.push(sec("סודיות", `<p>המגשר ישמור בסוד את עצם קיום הגישור ואת המידע שקיבל בו, למעט דיווח שהוא חייב בו לפי דין. הצדדים מתחייבים לא למסור לבית המשפט או לגוף אחר דברים שנאמרו בהליך הגישור ומסמכים שנוצרו בו ושלא ניתן היה להשיגם בדרך אחרת, ולא לזמן את המגשר לעדות או לדרוש ממנו מסמכים. רשימות המגשר נועדו לו בלבד.</p>`));
  p.push(sec("הפסקת הגישור", `<p>כל צד רשאי להפסיק את השתתפותו בגישור בכל עת, בהודעה בכתב לצד האחר ולמגשר. המגשר רשאי להפסיק את הגישור לפי שיקול דעתו המקצועי.</p>`));
  p.push(sec("הסכמות", `<p>הסכמה בגישור תחייב את הצדדים רק אם נוסחה בכתב ונחתמה על ידם. ${isTrue(inputs.court_referral) ? "הצדדים רשאים לבקש מבית המשפט לתת להסכם שיושג תוקף של פסק דין." : "אם יש הליך משפטי, הצדדים רשאים לבקש לתת להסכם תוקף של פסק דין."}</p>`));
  p.push(sec("ייעוץ משפטי", `<p>${flag(inputs.lawyers_allowed, true) ? "כל צד רשאי להגיע לפגישות עם עורך דין או להתייעץ איתו בין הפגישות." : "הפגישות יתקיימו בלי עורכי דין, וכל צד רשאי להתייעץ עם עורך דין בין הפגישות ולפני חתימה על הסכם."}</p>`));
  p.push(sec("מקום ושכר", `<p>הפגישות יתקיימו ב${blank(inputs.place, "________")}. שכר המגשר הוא ${money(inputs.fee)} ${unit}, בתוספת מע"מ אם חל, וישולם ${split}, בסוף כל פגישה או לפי חשבון חודשי.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "צד א'", name: inputs.party_a_name }, { role: "צד ב'", name: inputs.party_b_name }, { role: "המגשר", name: inputs.mediator_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם גישור", html: p.join("\n"), warnings };
}
