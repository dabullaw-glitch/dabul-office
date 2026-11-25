// מחולל טיוטת תקנון עמותה (בסיסי) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק העמותות, התש"ם-1980: סעיפים 1, 9, 10, 15, 19, 20, 33, 34ג. אומת 25.11.2026 מול הנוסח באתר המוסד לביטוח לאומי.

export const CONFIG = {
  minFounders: 2, // סעיף 1: שני בני אדם או יותר, בגירים
  minMemberAge: 17, // סעיף 15
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
  if (!inputs.name) warnings.push("חסר שם העמותה.");
  const purposes = lines(inputs.purposes);
  if (!purposes.length) warnings.push("לא פורטו מטרות. עמותה מוקמת למטרה חוקית שאינה חלוקת רווחים.");
  const founders = lines(inputs.founders).map((l) => { const [nm, id] = l.split(",").map((x) => x.trim()); return { name: nm || "", id: id || "" }; });
  if (founders.length < CONFIG.minFounders) warnings.push(`לפי סעיף 1 לחוק העמותות נדרשים לפחות ${CONFIG.minFounders} מייסדים בגירים.`);
  const size = Math.max(1, Math.round(Number(inputs.committee_size)) || 3);
  if (size < 2) warnings.push("ועד של חבר אחד אינו מקובל. בדקו את הדרישות לגבי מספר חברי הוועד.");
  const auditText = inputs.audit === "body" ? "גוף מבקר, כפי שתמנה האסיפה הכללית ובכפוף לדין" : "ועדת ביקורת שתיבחר באסיפה הכללית";

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>תקנון העמותה: ${blank(inputs.name)} (ע"ר)</h1>`);
  p.push(sec("שם ומען", `<p>שם העמותה: ${blank(inputs.name)}. מען העמותה: ${blank(inputs.address)}.</p>`));
  p.push(sec("מטרות", purposes.length ? ul(purposes) : "<p>____________</p>"));
  p.push(sec("איסור חלוקת רווחים", `<p>נכסי העמותה והכנסותיה ישמשו רק להגשמת מטרותיה. חלוקת רווחים או טובות הנאה בין החברים, במישרין או בעקיפין, אסורה.</p>`));
  p.push(sec("חברות", `<p>חבר בעמותה יכול להיות כל אדם שמלאו לו ${CONFIG.minMemberAge} שנים וכל תאגיד, ובלבד ש${blank(inputs.membership)}. בקשה להתקבל כחבר תוגש לוועד בכתב, והוועד יחליט עליה. ${isTrue(inputs.membership_fee) ? "החברים ישלמו דמי חבר בסכום שתקבע האסיפה הכללית." : "החברות אינה כרוכה בדמי חבר."} החברות אישית ואינה ניתנת להעברה. היא פוקעת במות החבר, בפרישה בהודעה בכתב לוועד, או בהוצאה בהחלטת האסיפה הכללית לאחר שניתנה לחבר הזדמנות להשמיע את טענותיו.</p>`));
  p.push(sec("אסיפה כללית", `<p>האסיפה הכללית הרגילה תתכנס לפחות פעם בשנה, במקום ובמועד שיקבע הוועד, בהודעה מוקדמת לחברים. באסיפה ידונו בדוחות הוועד וועדת הביקורת ובדוח הכספי, ויבחרו את הוועד ואת גוף הביקורת. מניין חוקי: ${blank(inputs.assembly_quorum)}. החלטות יתקבלו ברוב רגיל, אלא אם הדין קובע אחרת.</p>`));
  p.push(sec("הוועד", `<p>הוועד ימנה ${size} חברים, שייבחרו באסיפה הכללית מבין חברי העמותה. קטין לא יכהן כחבר הוועד. הוועד ינהל את ענייני העמותה, יקבע את מורשי החתימה ויפעל לפי החלטות האסיפה הכללית.</p>`));
  p.push(sec("ביקורת", `<p>הביקורת בעמותה תיעשה בידי ${auditText}. חבר ועד לא יכהן בגוף הביקורת, וקטין לא יכהן כחבר ועדת הביקורת. גוף הביקורת יבדוק את תקינות פעולות העמותה ומוסדותיה ואת ניהול חשבונותיה, וידווח לאסיפה הכללית.</p>`));
  p.push(sec("פירוק", `<p>בפירוק העמותה, הנכסים שיוותרו לאחר סילוק חובותיה לא יחולקו בין החברים, ויועברו ל${blank(inputs.dissolution_to)}.</p>`));
  p.push(`<h2>המייסדים</h2><table><tr><th>שם</th><th>ת"ז</th><th>חתימה</th></tr>${(founders.length ? founders : [{ name: "", id: "" }, { name: "", id: "" }]).map((f) => `<tr><td>${blank(f.name)}</td><td>${blank(f.id)}</td><td>__________</td></tr>`).join("")}</table>`);
  p.push(`<p>הערה: אם לא יוגש תקנון, יחול התקנון המצוי שבתוספת הראשונה לחוק העמותות, התש"ם-1980.</p>`, DISCLAIMER, `</div>`);
  return { title: inputs.name ? `תקנון העמותה: ${String(inputs.name).trim()}` : "תקנון עמותה", html: p.join("\n"), warnings };
}
