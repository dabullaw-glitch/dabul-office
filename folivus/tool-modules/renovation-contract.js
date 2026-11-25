// מחולל הסכם עם קבלן שיפוצים - פוליבוס. מודול טהור, ללא תלויות וללא רשת. נכון ל-2026.
// חוק רישום קבלנים לעבודות הנדסה בנאיות, התשכ"ט-1969 (מקור משני, ראו JSON). חוק החוזים (חלק כללי), סעיף 39.

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

const MATERIALS = { contractor: "הקבלן יספק את כל החומרים, לפי המפרט, והם כלולים במחיר.", client: "המזמין יספק את החומרים לפי המפרט, והקבלן יודיע לו מראש ובכתב על הכמויות ועל מועדי האספקה.", mixed: "החומרים יסופקו לפי החלוקה שבמפרט." };
const PERMITS = { not_required: "הצדדים מעריכים שהעבודות אינן טעונות היתר. התברר שנדרש היתר או אישור, תיפסק העבודה הטעונה היתר עד לקבלתו.", contractor: "הקבלן אחראי להשגת ההיתרים והאישורים הנדרשים לפני תחילת העבודה הטעונה היתר.", client: "המזמין אחראי להשגת ההיתרים והאישורים הנדרשים, והקבלן לא יתחיל עבודה הטעונה היתר לפני קבלתו." };

export function parseMilestones(text) {
  return lines(text).map((l) => {
    const m = l.match(/^(.*?)[:\s]+(\d+(?:\.\d+)?)\s*%?$/);
    return m ? { label: m[1].trim(), pct: Number(m[2]) } : { label: l, pct: NaN };
  });
}

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.client_name) warnings.push("חסר שם המזמין.");
  if (!inputs.contractor_name) warnings.push("חסר שם הקבלן.");
  const scope = lines(inputs.scope);
  if (!scope.length) warnings.push("לא פורטו העבודות. מפרט מדויק הוא הבסיס לכל מחלוקת עתידית.");
  const total = Number(inputs.total_price);
  if (!(total > 0)) warnings.push("חסר המחיר הכולל.");
  if (!inputs.contractor_registry) warnings.push("לא הוזן מספר רישום בפנקס הקבלנים. בעבודות מעל היקף מסוים החוק מחייב קבלן רשום. בדקו את הקבלן במאגר רשם הקבלנים.");
  const ms = parseMilestones(inputs.milestones);
  const sum = ms.reduce((a, m) => a + (Number.isFinite(m.pct) ? m.pct : 0), 0);
  if (ms.length && ms.some((m) => !Number.isFinite(m.pct))) warnings.push("חלק משלבי התשלום לא כוללים אחוז. כתבו כל שלב בפורמט: תיאור: אחוז.");
  if (ms.length && Math.abs(sum - 100) > 0.01) warnings.push(`סכום האחוזים בשלבי התשלום הוא ${sum}%, ולא 100%.`);
  if (ms.length && Number.isFinite(ms[0].pct) && ms[0].pct > 30) warnings.push(`התשלום הראשון (${ms[0].pct}%) גבוה. מקדמה גבוהה מגדילה את הסיכון אם העבודה לא תושלם.`);
  const s = parseDate(inputs.start_date), e = parseDate(inputs.end_date);
  if (s && e && e <= s) warnings.push("מועד הסיום חייב להיות אחרי מועד ההתחלה.");
  const warranty = Number(inputs.warranty_months) >= 0 && inputs.warranty_months !== undefined && inputs.warranty_months !== "" ? Math.round(Number(inputs.warranty_months)) : 12;

  let n = 0;
  const sec = (t, b) => `<h2>${++n}. ${t}</h2>${b}`;
  const p = [`<div dir="rtl" lang="he">`, warnBox(warnings)];
  p.push(`<h1>הסכם לביצוע עבודות שיפוץ</h1>`, `<p>שנחתם ביום ${heDate(inputs.signing_date)}</p>`);
  p.push(`<p><strong>בין:</strong> ${blank(inputs.client_name)}, ת"ז ${blank(inputs.client_id)} (להלן: "המזמין")</p><p><strong>לבין:</strong> ${blank(inputs.contractor_name)}, מספר מזהה ${blank(inputs.contractor_id)}, מספר רישום בפנקס הקבלנים ${blank(inputs.contractor_registry, "________")} (להלן: "הקבלן")</p>`);
  p.push(sec("העבודות", `<p>הקבלן יבצע בנכס ברחוב ${blank(inputs.property_address)} את העבודות הבאות, ברמה מקצועית טובה, לפי כל דין ולפי התקנים החלים:</p>${scope.length ? ul(scope) : "<p>____________</p>"}<p>עבודה שאינה מפורטת כאן אינה כלולה במחיר.</p>`));
  p.push(sec("חומרים", `<p>${MATERIALS[inputs.materials_by] || MATERIALS.contractor}</p>`));
  p.push(sec("לוח זמנים", `<p>העבודות יחלו ביום ${heDate(inputs.start_date)} ויסתיימו עד יום ${heDate(inputs.end_date)}. ${Number(inputs.delay_per_day) > 0 ? `על כל יום איחור בסיום שאינו נובע מהמזמין, משינויים שהמזמין ביקש או מכוח עליון, ישלם הקבלן פיצוי מוסכם של ${money(inputs.delay_per_day)}, שיקוזז מהתשלום האחרון.` : "איחור שאינו נובע מהמזמין או מכוח עליון ייחשב להפרת ההסכם."}</p>`));
  const rows = ms.map((m) => `<tr><td>${esc(m.label)}</td><td>${Number.isFinite(m.pct) ? m.pct + "%" : "____"}</td><td>${Number.isFinite(m.pct) && total > 0 ? money((total * m.pct) / 100) : "____________"}</td></tr>`).join("");
  p.push(sec("המחיר והתשלומים", `<p>המחיר הכולל הוא ${money(total)}, ${flag(inputs.vat_included, true) ? "כולל מע\"מ" : "בתוספת מע\"מ כדין"}. המחיר סופי, ואינו משתנה אלא לפי סעיף השינויים. התשלומים ישולמו לפי השלבים הבאים, לאחר שהשלב הושלם בפועל וכנגד חשבונית מס:</p>${ms.length ? `<table><tr><th>שלב</th><th>אחוז</th><th>סכום</th></tr>${rows}</table>` : "<p>____________</p>"}`));
  p.push(sec("שינויים ותוספות", `<p>שינוי או תוספת לעבודות יבוצעו רק לאחר שהצדדים הסכימו בכתב על תיאור השינוי, מחירו והשפעתו על לוח הזמנים. עבודה נוספת שבוצעה בלי הסכמה כזו לא תזכה בתשלום.</p>`));
  p.push(sec("בטיחות, ניקיון ופסולת", `<p>הקבלן אחראי לבטיחות באתר, לשמירה על הנכס ועל הרכוש המשותף, ולפינוי פסולת לאתר מורשה על חשבונו. הקבלן יעבוד בשעות המותרות לפי הדין ותקנון הבית המשותף.</p>`));
  p.push(sec("היתרים", `<p>${PERMITS[inputs.permits_by] || PERMITS.not_required}</p>`));
  p.push(sec("ביטוח ואחריות לנזקים", `<p>הקבלן אחראי לכל נזק לגוף או לרכוש שנגרם בקשר לעבודות, ויחזיק ביטוח צד שלישי וביטוח עבודות קבלניות בתוקף לכל תקופת העבודה.</p>`));
  p.push(sec("מסירה ואחריות לליקויים", `<p>בסיום העבודות ייערך סיור מסירה ופרוטוקול בחתימת הצדדים. הקבלן יתקן על חשבונו, בתוך זמן סביר מהודעה בכתב, כל ליקוי בעבודתו שיתגלה במסירה או בתוך ${warranty} חודשים ממנה. אין בכך כדי לגרוע מכל זכות של המזמין לפי דין.</p>`));
  p.push(sec("הפרה וביטול", `<p>הפר צד את ההסכם ולא תיקן את ההפרה בתוך 7 ימים מקבלת התראה בכתב, רשאי הצד האחר לבטל את ההסכם. בוטל ההסכם, ישולם לקבלן רק בעבור עבודה שבוצעה כראוי עד הביטול, בניכוי נזקי המזמין.</p>`));
  p.push(`<h2>חתימות</h2>`, signTable([{ role: "המזמין", name: inputs.client_name }, { role: "הקבלן", name: inputs.contractor_name }]), DISCLAIMER, `</div>`);
  return { title: "הסכם לביצוע עבודות שיפוץ", html: p.join("\n"), warnings };
}
