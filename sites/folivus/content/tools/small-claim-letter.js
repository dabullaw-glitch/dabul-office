// מחולל טיוטת כתב תביעה לבית המשפט לתביעות קטנות - מודול טהור.
// תקרת הסכום מתעדכנת בכל ינואר. ל-2026: 39,900 ש"ח מ-1.1.2026, לפי הודעת מנהל בתי המשפט מ-22.12.2025 (ראו sources ב-JSON).

export const CONFIG = {
  ceilingYear: 2026,
  ceiling: 39900, // אומת 25.11.2026: צו בתי המשפט (שינוי סכום התביעה בבית משפט לתביעות קטנות), הודעה מ-22.12.2025
};

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const blank = (s, w = "____________") => (s !== undefined && s !== null && String(s).trim() ? esc(String(s).trim()) : w);
const paras = (s) => String(s ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
function heDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) return null;
  return `${d}.${m}.${y}`;
}
const money = (x) => Number(x).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " ₪";

export function generate(inputs = {}) {
  const warnings = [];
  const amount = Number(inputs.claim_amount);
  const facts = paras(inputs.facts);
  const evidence = paras(inputs.evidence_list);
  const damages = paras(inputs.damages_breakdown);
  const demandSent = inputs.demand_letter_sent === true || inputs.demand_letter_sent === "true";
  const demandDate = heDate(inputs.demand_letter_date);
  const filingDate = heDate(inputs.filing_date);

  if (!inputs.plaintiff_name) warnings.push("חסר שם התובע.");
  if (!inputs.defendant_name) warnings.push("חסר שם הנתבע. בתביעה נגד חברה יש לציין את שמה הרשמי ומספר החברה.");
  if (!Number.isFinite(amount) || amount <= 0) warnings.push("סכום התביעה חסר או אינו תקין.");
  if (Number.isFinite(amount) && amount > 0 && CONFIG.ceiling && amount > CONFIG.ceiling) warnings.push(`סכום התביעה עולה על התקרה לתביעות קטנות ל-${CONFIG.ceilingYear} (${money(CONFIG.ceiling)}). אפשר להפחית את הסכום (ולוותר על היתרה) או להגיש לבית משפט השלום.`);
  if (!CONFIG.ceiling) warnings.push(`לפני ההגשה בדקו באתר הרשות השופטת שהסכום אינו עולה על תקרת התביעות הקטנות המעודכנת ל-${CONFIG.ceilingYear}.`);
  if (!facts.length) warnings.push("לא תוארו העובדות. בלי תיאור ברור של מה שקרה קשה לבית המשפט להבין את התביעה.");
  if (!demandSent) warnings.push("מומלץ לשלוח לנתבע מכתב דרישה לפני הגשת התביעה ולצרף אותו.");

  let n = 0;
  const sec = (title, body) => `<h2>${++n}. ${title}</h2>${body}`;
  const p = [];
  p.push(`<div dir="rtl" lang="he">`);
  if (warnings.length) p.push(`<div class="warnings"><h3>לבדיקה לפני הגשה</h3><ul>${warnings.map((w) => `<li>${esc(w)}</li>`).join("")}</ul></div>`);
  p.push(`<p>בבית המשפט לתביעות קטנות ב${blank(inputs.court_city, "________")}</p>`);
  p.push(`<table>`);
  p.push(`<tr><th>התובע/ת</th><td>${blank(inputs.plaintiff_name)}, ת.ז. ${blank(inputs.plaintiff_id)}<br>כתובת: ${blank(inputs.plaintiff_address)}<br>טלפון: ${blank(inputs.plaintiff_phone)}, דוא"ל: ${blank(inputs.plaintiff_email)}</td></tr>`);
  p.push(`<tr><th>נגד</th><td></td></tr>`);
  p.push(`<tr><th>הנתבע/ת</th><td>${blank(inputs.defendant_name)}, ת.ז. או ח.פ. ${blank(inputs.defendant_id)}<br>כתובת: ${blank(inputs.defendant_address)}</td></tr>`);
  p.push(`</table>`);
  p.push(`<h1>כתב תביעה</h1>`);
  p.push(`<p><strong>מהות התביעה:</strong> ${blank(inputs.claim_subject, "תביעה כספית")}. <strong>סכום התביעה:</strong> ${Number.isFinite(amount) && amount > 0 ? money(amount) : "____________"}.</p>`);
  p.push(sec("הצדדים", `<p>התובע/ת: ${blank(inputs.plaintiff_name)}. הנתבע/ת: ${blank(inputs.defendant_name)}${inputs.relationship ? `. הקשר בין הצדדים: ${esc(inputs.relationship)}` : ""}.</p>`));
  p.push(sec("העובדות", facts.length ? `<ol>${facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ol>` : `<p>____________</p>`));
  if (demandSent) p.push(sec("פנייה מוקדמת לנתבע", `<p>ביום ${demandDate || "________"} פנה/תה התובע/ת לנתבע/ת בכתב ודרש/ה את תיקון הנזק או את תשלומו, אך הדרישה לא נענתה במלואה. העתק הפנייה מצורף.</p>`));
  p.push(sec("הנזק וסכום התביעה", damages.length ? `<ul>${damages.map((d) => `<li>${esc(d)}</li>`).join("")}</ul><p>סך הכול: ${Number.isFinite(amount) && amount > 0 ? money(amount) : "____________"}.</p>` : `<p>התובע/ת מעמיד/ה את תביעתו/ה על סך ${Number.isFinite(amount) && amount > 0 ? money(amount) : "____________"}.</p>`));
  p.push(sec("הסעד המבוקש", `<p>בית המשפט הנכבד מתבקש לחייב את הנתבע/ת לשלם לתובע/ת ${Number.isFinite(amount) && amount > 0 ? money(amount) : "____________"}, וכן הוצאות משפט.</p>`));
  p.push(sec("מסמכים מצורפים", evidence.length ? `<ol>${evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ol>` : `<p>____________</p>`));
  p.push(`<p>תאריך: ${filingDate || "____________"}</p><p>חתימת התובע/ת: ______________________</p>`);
  p.push(`<h2>לפני ההגשה</h2><ul>`);
  p.push(`<li>בתביעות קטנות מגישים בלי עורך דין, ובדרך כלל גם הצד השני מופיע בלי ייצוג.</li>`);
  p.push(`<li>מגישים לבית המשפט לתביעות קטנות שבאזור מגורי הנתבע, מקום האירוע או מקום ההתקשרות, לפי הכללים. אפשר להגיש גם באופן מקוון באתר הרשות השופטת.</li>`);
  p.push(`<li>משלמים אגרה בשיעור 1% מסכום התביעה, ולא פחות מאגרת מינימום שמתעדכנת מעת לעת.</li>`);
  p.push(`<li>צרפו את כל המסמכים: חשבוניות, הסכמים, תמונות, התכתבויות ומכתב הדרישה.</li>`);
  p.push(`<li>הקפידו על תיאור עובדתי וקצר. אין צורך בציטוט סעיפי חוק.</li>`);
  p.push(`</ul>`);
  p.push(`<p class="disclaimer"><strong>חשוב:</strong> זוהי טיוטה כללית שנוצרה אוטומטית, ואינה מחליפה ייעוץ משפטי. בית המשפט מספק טופס תביעה רשמי, ויש לוודא שהמסמך עומד בדרישות הטופס והתקנות במועד ההגשה.</p>`);
  p.push(`</div>`);

  return {
    title: inputs.plaintiff_name && inputs.defendant_name ? `כתב תביעה קטנה: ${String(inputs.plaintiff_name).trim()} נגד ${String(inputs.defendant_name).trim()}` : "כתב תביעה קטנה",
    html: p.join("\n"),
    warnings,
  };
}
