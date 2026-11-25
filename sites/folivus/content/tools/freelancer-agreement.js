// מחולל הסכם עם פרילנסר (נותן שירותים עצמאי) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// יחסי עובד ומעסיק נקבעים לפי מבחני הפסיקה ולא לפי כותרת ההסכם (כל זכות, נבדק 25.11.2026).

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

const FEE = { fixed: (f) => `מחיר קבוע של ${f} לכל הפרויקט`, hourly: (f) => `${f} לכל שעת עבודה, לפי דיווח שעות חודשי מפורט`, monthly: (f) => `${f} לחודש (ריטיינר)` };

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.client_name) warnings.push("חסר שם המזמין.");
  if (!inputs.freelancer_name) warnings.push("חסר שם הפרילנסר.");
  const services = lines(inputs.services);
  if (!services.length) warnings.push("לא פורטו השירותים או התוצרים.");
  if (!(Number(inputs.fee) > 0)) warnings.push("חסר סכום התמורה.");
  if (isTrue(inputs.fixed_hours)) warnings.push("שעות קבועות שהמזמין קובע הן סימן להשתלבות בארגון, ועלולות להצביע על יחסי עובד ומעסיק.");
  if (isTrue(inputs.exclusive)) warnings.push("בלעדיות מלאה למזמין מחלישה את עצמאות הפרילנסר ועלולה להצביע על יחסי עובד ומעסיק.");
  if (isTrue(inputs.fixed_hours) && isTrue(inputs.exclusive) && inputs.fee_type === "monthly") warnings.push("השילוב של שעות קבועות, בלעדיות ותשלום חודשי דומה מאוד להעסקת עובד. שקלו העסקה כעובד, או התייעצו עם עורך דין.");
  const fee = (FEE[inputs.fee_type] || FEE.fixed)(money(inputs.fee));
  const terms = inputs.payment_terms === undefined || inputs.payment_terms === "" ? 30 : Math.max(0, Math.round(Number(inputs.payment_terms)) || 0);
  const term = inputs.termination_days === undefined || inputs.termination_days === "" ? 14 : Math.max(0, Math.round(Number(inputs.termination_days)) || 0);

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם למתן שירותים</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.client_name)}, ת"ז/ח.פ. ${blank(inputs.client_id)} (להלן: "המזמין")</p><p><strong>לבין:</strong> ${blank(inputs.freelancer_name)}, ת"ז/מספר עוסק ${blank(inputs.freelancer_id)} (להלן: "נותן השירותים")</p>`);
  p.push(sec("השירותים", `<p>נותן השירותים יספק למזמין את השירותים והתוצרים הבאים:</p>${services.length ? ul(services) : "<p>____________</p>"}${parseDate(inputs.deadline) ? `<p>מועד האספקה: ${heDate(inputs.deadline)}.</p>` : ""}`));
  p.push(sec("עצמאות", `<p>נותן השירותים פועל כעסק עצמאי. הוא קובע את שעות עבודתו ואת דרכי ביצוע השירותים, משתמש בכלים שלו, ורשאי לתת שירותים גם ללקוחות אחרים${isTrue(inputs.exclusive) ? ", בכפוף להתחייבות הבלעדיות שבהסכם זה" : ""}. נותן השירותים אחראי לרישום כעוסק ולתשלום המסים ודמי הביטוח הלאומי החלים עליו.</p>`));
  p.push(sec("התמורה", `<p>המזמין ישלם לנותן השירותים ${fee}, בתוספת מע"מ כדין, בתוך ${terms} ימים מקבלת חשבונית מס כדין. התמורה כוללת את כל הוצאות נותן השירותים, אלא אם הוסכם אחרת בכתב.</p>`));
  if (flag(inputs.ip_to_client, true)) p.push(sec("קניין רוחני", `<p>עם תשלום התמורה, כל הזכויות בתוצרים שנוצרו במיוחד למזמין, לרבות זכויות יוצרים, יעברו למזמין. נותן השירותים רשאי להציג את העבודה בתיק העבודות שלו, אלא אם המזמין ביקש אחרת בכתב. ידע כללי, כלים ותבניות שהיו לנותן השירותים לפני ההסכם יישארו שלו.</p>`));
  if (flag(inputs.confidentiality, true)) p.push(sec("סודיות", `<p>נותן השירותים ישמור בסוד מידע עסקי של המזמין שאינו נחלת הכלל ושהגיע אליו במסגרת השירותים, ולא ישתמש בו אלא לצורך ההסכם. החובה נמשכת גם אחרי סיום ההתקשרות.</p>`));
  p.push(sec("סיום ההתקשרות", `<p>כל צד רשאי לסיים את ההסכם בהודעה בכתב של ${term} ימים מראש. במקרה כזה ישולם לנותן השירותים בעבור השירותים שסופקו עד מועד הסיום. הפרה יסודית מאפשרת ביטול מיידי.</p>`));
  p.push(sec("היעדר יחסי עובד ומעסיק", `<p>הצדדים מסכימים שאין ביניהם יחסי עובד ומעסיק. התמורה נקבעה בהתחשב בכך שנותן השירותים עצמאי ואינו מקבל זכויות של עובד. אם ייקבע בעתיד שהתקיימו יחסי עובד ומעסיק, יבחנו הצדדים את ההשבה והקיזוז לפי הדין והפסיקה.</p>`));
  p.push(sec("שונות", `<p>הסכם זה ממצה את המוסכם. שינוי ייעשה בכתב. נותן השירותים לא יעביר את ביצוע השירותים לאחר בלי הסכמת המזמין.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "המזמין", name: inputs.client_name }, { role: "נותן השירותים", name: inputs.freelancer_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם למתן שירותים", html: p.join("\n"), warnings };
}
