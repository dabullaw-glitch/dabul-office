// מחולל ייפוי כוח כללי (שליחות) - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק השליחות, התשכ"ה-1965: סעיפים 1, 3, 8, 14, 15. אומת 25.11.2026 מול רשומות (מאגר הכנסת).

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

const REAL_ESTATE = /(דירה|מקרקעין|טאבו|נכס|קרקע|משכנתה|משכנתא|רשם המקרקעין|רמ"י)/;

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.principal_name) warnings.push("חסר שם נותן ייפוי הכוח.");
  if (!inputs.agent_name) warnings.push("חסר שם מיופה הכוח.");
  const acts = lines(inputs.acts);
  if (!acts.length) warnings.push("לא פורטו פעולות. ייפוי כוח בלי פעולות מוגדרות מסוכן לנותן, וגופים רבים לא יקבלו אותו.");
  if (acts.some((a) => REAL_ESTATE.test(a))) warnings.push("נראה שחלק מהפעולות נוגעות למקרקעין. עסקאות במקרקעין דורשות בדרך כלל ייפוי כוח בנוסח מיוחד וחתימה בפני עורך דין או נוטריון.");
  if (!parseDate(inputs.valid_until)) warnings.push("לא נקבע מועד סיום. מומלץ להגביל את תוקף ייפוי הכוח בזמן.");
  const two = Boolean(inputs.agent2_name && String(inputs.agent2_name).trim());

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>ייפוי כוח</h1>`);
  p.push(`<p>אני החתום/ה מטה, ${blank(inputs.principal_name)}, ת"ז ${blank(inputs.principal_id)}, מכתובת ${blank(inputs.principal_address)}, ממנה בזה את ${blank(inputs.agent_name)}, ת"ז ${blank(inputs.agent_id)}${two ? ` ואת ${esc(String(inputs.agent2_name).trim())}, ת"ז ${blank(inputs.agent2_id)}` : ""} (להלן: "מיופה הכוח"), להיות ${two ? "מיופי כוחי" : "מיופה כוחי"}, ולפעול בשמי ובמקומי בפעולות הבאות בלבד:</p>`);
  p.push(acts.length ? `<ol>${acts.map((a) => `<li>${esc(a)}</li>`).join("")}</ol>` : "<p>____________</p>");
  p.push(sec("היקף", `<p>מיופה הכוח רשאי לחתום על מסמכים, למסור ולקבל מסמכים ומידע ולעשות כל פעולה הדרושה לביצוע הפעולות המפורטות לעיל בלבד. ייפוי כוח זה אינו מתיר פעולות אחרות.${two ? (inputs.joint === "together" ? " מיופי הכוח יפעלו יחד בלבד, וכל פעולה טעונה את חתימת שניהם." : " כל אחד ממיופי הכוח רשאי לפעול לבדו.") : ""}</p>`));
  p.push(sec("תוקף", `<p>ייפוי כוח זה בתוקף ${parseDate(inputs.valid_until) ? `עד יום ${heDate(inputs.valid_until)}` : "עד לביטולו"}. אני רשאי/ת לבטלו בכל עת בהודעה בכתב. ייפוי הכוח מסתיים גם במקרים הקבועים בחוק השליחות, התשכ"ה-1965, לרבות במותי או בגריעת כשרותי.</p>`));
  p.push(sec("חובות מיופה הכוח", `<p>מיופה הכוח יפעל בנאמנות ולפי הוראותיי, ימסור לי מידע על הפעולות שביצע, לא יפעל בניגוד עניינים, ויעביר אליי כל כסף או נכס שיקבל בשמי.</p>`));
  p.push(`<p>ולראיה באתי על החתום ב${blank(inputs.signing_city, "________")}, ביום ${heDate(inputs.signing_date)}.</p><p>חתימת נותן ייפוי הכוח: __________</p>`);
  p.push(`<p>אני מסכים/ה לשמש מיופה כוח לפי ייפוי כוח זה. חתימת מיופה הכוח: __________${two ? " &nbsp; חתימת מיופה הכוח השני: __________" : ""}</p>`.replace(" &nbsp;", ""));
  p.push(`<h2>חשוב לדעת</h2><ul><li>ייפוי כוח רגיל מסתיים כשהנותן מאבד את כשרותו. למקרה כזה נועד ייפוי כוח מתמשך, שנערך בהליך נפרד.</li><li>בנקים, רשויות וגופים בחו"ל דורשים לעיתים נוסח משלהם או אימות חתימה בפני עורך דין או נוטריון.</li><li>בביטול ייפוי הכוח, הודיעו על כך בכתב גם לגורמים שקיבלו אותו.</li></ul>`, DISCLAIMER, `</div>`);
  return { title: "ייפוי כוח", html: p.join("\n"), warnings };
}
