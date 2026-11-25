// מחולל הסכם מייסדים לסטארטאפ או חברה - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק החברות, התשנ"ט-1999: סעיפים 2, 17, 20. אומת 25.11.2026 מול רשומות.

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

export function parseFounders(text) {
  return lines(text).map((l) => {
    const parts = l.split(",").map((x) => x.trim());
    return { name: parts[0] || "", id: parts[1] || "", pct: Number(String(parts[2] || "").replace("%", "")), role: parts.slice(3).join(", ") };
  });
}

export function vestingSummary(months, cliff) {
  const V = Math.max(0, Math.round(Number(months)) || 0), C = Math.max(0, Math.round(Number(cliff)) || 0);
  if (!V) return null;
  const atCliff = C > 0 ? Math.round((Math.min(C, V) / V) * 10000) / 100 : 0;
  const monthly = Math.round((100 / V) * 100) / 100;
  return { months: V, cliff: Math.min(C, V), atCliff, monthly };
}

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.company_name) warnings.push("חסר שם החברה.");
  const fs = parseFounders(inputs.founders);
  if (fs.length < 2) warnings.push("הזינו לפחות שני מייסדים, כל אחד בשורה נפרדת.");
  if (fs.some((f) => !Number.isFinite(f.pct))) warnings.push("לחלק מהמייסדים לא הוזן אחוז. פורמט: שם, ת\"ז, אחוז, תפקיד.");
  const sum = fs.reduce((a, f) => a + (Number.isFinite(f.pct) ? f.pct : 0), 0);
  if (fs.length && Math.abs(sum - 100) > 0.01) warnings.push(`סכום האחוזים הוא ${sum}%, ולא 100%.`);
  const vm = numOr(inputs.vesting_months, 48), cm = numOr(inputs.cliff_months, 12);
  const vs = vestingSummary(vm, cm);
  if (!vs) warnings.push("לא נקבעה תקופת הבשלה. בלי הבשלה, מייסד שעוזב מוקדם נשאר עם כל מניותיו.");
  if (cm > vm && vm > 0) warnings.push("הצוק ארוך מתקופת ההבשלה.");
  if (!flag(inputs.ip_assignment, true)) warnings.push("לא סומנה הקצאת קניין רוחני לחברה. משקיעים בודקים שהחברה מחזיקה בזכויות.");
  const dec = { majority: "ברוב רגיל של המייסדים", special: "ברוב של 75% מהמניות שבידי המייסדים", unanimous: "פה אחד" }[inputs.key_decisions] || "ברוב של 75% מהמניות שבידי המייסדים";

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם מייסדים</h1>`, `<p>${blank(inputs.company_name)}. נחתם ביום ${heDate(inputs.signing_date)}, בין המייסדים המפורטים להלן (להלן: "המייסדים"):</p>`);
  p.push(`<table><tr><th>שם</th><th>ת"ז</th><th>החזקה</th><th>תפקיד</th></tr>${fs.map((f) => `<tr><td>${blank(f.name)}</td><td>${blank(f.id)}</td><td>${Number.isFinite(f.pct) ? f.pct + "%" : "____"}</td><td>${blank(f.role)}</td></tr>`).join("")}</table>`);
  p.push(sec("החברה והמניות", `<p>המייסדים יחזיקו במניות ${blank(inputs.company_name)} (להלן: "החברה") לפי הטבלה. המייסדים יפעלו לכך שתקנון החברה ישקף את הוראות הסכם זה, ובכל מקרה ינהגו זה כלפי זה לפיו.</p>`));
  p.push(sec("הבשלה", vs ? `<p>המניות של כל מייסד יבשילו במשך ${vs.months} חודשים מיום החתימה.${vs.cliff ? ` בתום ${vs.cliff} חודשים (הצוק) יבשילו ${vs.atCliff}% מהמניות,` : ""} ומשם יבשילו כ-${vs.monthly}% בכל חודש, עד הבשלה מלאה.${isTrue(inputs.acceleration) ? " במכירת החברה או מיזוג שבו השליטה עוברת, יבשילו כל המניות שטרם הבשילו." : ""}</p>` : `<p>____________</p>`));
  p.push(sec("עזיבת מייסד", `<p>הפסיק מייסד לפעול בחברה, מכל סיבה, רשאים החברה או המייסדים האחרים, לפי בחירתם, לרכוש ממנו את המניות שטרם הבשילו בערכן הנקוב. המניות שהבשילו יישארו בידיו, בכפוף לזכות סירוב ראשונה כמפורט להלן.</p>`));
  p.push(sec("תפקידים ומחויבות", `<p>כל מייסד ימלא את תפקידו שבטבלה. מחויבות הזמן: ${blank(inputs.time_commitment, "משרה מלאה בחברה")}. מייסד יגלה לאחרים כל עניין אישי שעלול ליצור ניגוד עניינים.</p>`));
  if (flag(inputs.ip_assignment, true)) p.push(sec("קניין רוחני", `<p>כל הזכויות בקניין רוחני שמייסד יצר או יוצר בקשר לפעילות החברה, לרבות לפני הקמתה, מוקצות לחברה, והמייסד יחתום על כל מסמך הדרוש לרישומן על שמה.</p>`));
  p.push(sec("קבלת החלטות", `<p>החלטות מהותיות, כמו גיוס הון, הקצאת מניות, מכירת החברה או רוב נכסיה, נטילת חוב מהותי ושינוי תחום הפעילות, יתקבלו ${dec}.</p>`));
  p.push(sec("העברת מניות", `<p>מייסד לא יעביר מניות בלי לתת קודם לשאר המייסדים זכות סירוב ראשונה לרכוש אותן באותם תנאים, בתוך 30 ימים מהודעה.</p>`));
  p.push(sec("סודיות", `<p>המייסדים ישמרו בסוד את המידע העסקי של החברה, גם לאחר שיפסיקו לפעול בה.</p>`));
  p.push(sec("יישוב מחלוקות", `<p>${inputs.dispute === "court" ? "מחלוקת תידון קודם במשא ומתן בתום לב, ואם לא תיפתר בתוך 30 ימים, בבית המשפט המוסמך." : "מחלוקת תידון קודם במשא ומתן בתום לב, אחר כך בגישור, ואם לא תיפתר בתוך 60 ימים, בבוררות לפי חוק הבוררות, התשכ\"ח-1968, לפני בורר יחיד."}</p>`));
  p.push(`<h2>חתימות</h2>`, signTable(fs.length ? fs.map((f, i) => ({ role: `מייסד ${i + 1}`, name: f.name })) : [{ role: "מייסד 1", name: "" }, { role: "מייסד 2", name: "" }]), DISCLAIMER, `</div>`);
  return { title: "הסכם מייסדים", html: p.join("\n"), warnings };
}
