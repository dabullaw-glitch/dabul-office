// מחולל הסכם שותפים לדירה - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// סעיף 55 לחוק החוזים (חלק כללי), התשל"ג-1973: חייבים יחד ולחוד. אומת 25.11.2026.

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

export function parseRoommates(text) {
  return lines(text).map((l) => {
    const parts = l.split(/[,،]/).map((x) => x.trim());
    const lastRaw = parts.length > 1 ? String(parts[parts.length - 1]) : "";
    const last = Number(lastRaw.replace("%", ""));
    const hasPct = lastRaw !== "" && Number.isFinite(last) && last <= 100 && (parts.length >= 3 || lastRaw.endsWith("%"));
    const core = hasPct ? parts.slice(0, -1) : parts;
    return { name: core[0] || "", id: core[1] || "", pct: hasPct ? last : NaN };
  });
}

export function generate(inputs = {}) {
  const warnings = [];
  const rm = parseRoommates(inputs.roommates);
  if (rm.length < 2) warnings.push("הזינו לפחות שני שותפים, כל אחד בשורה נפרדת.");
  const rent = Number(inputs.monthly_rent);
  if (!(rent > 0)) warnings.push("חסר שכר הדירה החודשי.");
  if (!inputs.property_address) warnings.push("חסרה כתובת הדירה.");
  const anyPct = rm.some((r) => Number.isFinite(r.pct));
  if (anyPct && rm.some((r) => !Number.isFinite(r.pct))) warnings.push("לחלק מהשותפים לא הוזן אחוז. הזינו אחוז לכל השותפים או לאף אחד.");
  if (rm.length) {
    if (!anyPct || rm.some((r) => !Number.isFinite(r.pct))) rm.forEach((r) => { r.pct = Math.round(10000 / rm.length) / 100; r.equal = true; });
    const sum = rm.reduce((a, r) => a + r.pct, 0);
    if (anyPct && Math.abs(sum - 100) > 0.5) warnings.push(`סכום האחוזים הוא ${sum}%, ולא 100%.`);
  }
  const notice = inputs.leave_notice_days === undefined || inputs.leave_notice_days === "" ? 60 : Math.max(0, Math.round(Number(inputs.leave_notice_days)) || 0);
  const bySharebills = inputs.bills_split === "by_share";

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם שותפים לדירה</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)} בין השותפים המפורטים להלן (להלן יחד: "השותפים"):</p>`);
  p.push(`<table><tr><th>שם</th><th>ת"ז</th><th>חלק בשכר הדירה</th><th>סכום חודשי</th></tr>${rm.map((r) => `<tr><td>${blank(r.name)}</td><td>${blank(r.id)}</td><td>${r.pct}%</td><td>${rent > 0 ? money(Math.round((r.equal ? rent / rm.length : (rent * r.pct) / 100) * 100) / 100) : "____________"}</td></tr>`).join("")}</table>`);
  p.push(sec("מטרת ההסכם", `<p>השותפים שוכרים יחד את הדירה ברחוב ${blank(inputs.property_address)} מאת ${blank(inputs.landlord_name)} (להלן: "בעל הדירה"), לפי הסכם שכירות שמסתיים ביום ${heDate(inputs.lease_end)}. הסכם זה מסדיר את היחסים בין השותפים בלבד, ואינו משנה את התחייבויותיהם כלפי בעל הדירה.</p>`));
  p.push(sec("שכר הדירה", `<p>שכר הדירה הכולל הוא ${money(rent)} לחודש, וכל שותף יישא בחלקו לפי הטבלה. כל שותף יעביר את חלקו במועד, כך ששכר הדירה ישולם במלואו. שותף ששילם לבעל הדירה יותר מחלקו זכאי להחזר מהשותף שלא שילם.</p>`));
  p.push(sec("חשבונות שוטפים", `<p>הארנונה, המים, החשמל, הגז, האינטרנט ודמי ועד הבית יחולקו ${bySharebills ? "לפי אחוזי שכר הדירה" : "שווה בשווה"}. אחד השותפים ירכז את החשבונות, וכל שותף יעביר את חלקו בתוך 7 ימים מקבלת פירוט.</p>`));
  if (Number(inputs.deposit_total) > 0) p.push(sec("ערובה", `<p>הערובה לבעל הדירה, ${money(inputs.deposit_total)}, ניתנה בחלקים לפי אחוזי שכר הדירה. ניכוי מהערובה בגין נזק יחול על השותף שגרם לו, ואם לא ידוע מי גרם, לפי האחוזים.</p>`));
  const rooms = lines(inputs.rooms);
  p.push(sec("חדרים ושטחים משותפים", `${rooms.length ? ul(rooms) : "<p>חלוקת החדרים: ____________</p>"}<p>המטבח, הסלון, השירותים והמרפסות משותפים לכל השותפים.</p>`));
  p.push(sec("ניקיון, שקט ואורחים", `<ul><li>ניקיון: ${blank(inputs.cleaning, "בתורנות שבועית לפי סבב")}.</li><li>שעות שקט: ${blank(inputs.quiet_hours, "23:00 עד 07:00")}.</li><li>אורחים: ${blank(inputs.guests, "בתיאום מראש עם השותפים")}.</li><li>חיות מחמד: ${isTrue(inputs.pets) ? "מותרות, בכפוף להסכם השכירות ובאחריות בעל החיה לכל נזק" : "לא יוחזקו בלי הסכמת כל השותפים ובעל הדירה"}.</li></ul>`));
  p.push(sec("נזקים", `<p>שותף שגרם נזק לדירה או לציוד יישא בתיקונו. בלאי סביר לא ייחשב לנזק.</p>`));
  p.push(sec("עזיבת שותף", `<p>שותף המבקש לעזוב לפני תום השכירות יודיע לשותפים בכתב לפחות ${notice} ימים מראש, וימשיך לשאת בחלקו עד המאוחר מבין תום תקופת ההודעה וכניסת שותף מחליף. שותף מחליף ייכנס רק בהסכמת השותפים האחרים, שלא יסרבו בלי סיבה סבירה, ובהסכמת בעל הדירה אם היא נדרשת. השותף המחליף ישלם לשותף העוזב את חלקו בערובה.</p>`));
  p.push(sec("יישוב מחלוקות", `<p>מחלוקת תידון קודם בשיחה בתום לב. לא נפתרה, ינסו השותפים גישור לפני פנייה לבית המשפט.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable(rm.length ? rm.map((r, i) => ({ role: `שותף ${i + 1}`, name: r.name })) : [{ role: "שותף 1", name: "" }, { role: "שותף 2", name: "" }]), DISCLAIMER, `</div>`);
  return { title: "הסכם שותפים לדירה", html: p.join("\n"), warnings };
}
