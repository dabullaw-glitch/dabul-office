// מחולל הסכם שכירות דירה למגורים - פוליבוס
// טיוטה כללית שנכתבה ברוח פרק ב1 לחוק השכירות והשאילה, התשל"א-1971 (שכירות דירה למגורים).
// ברירות המחדל לימי הודעה ולהשבת ערובה מסומנות לאימות (todo_verify בקובץ ה-JSON).

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const parse = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : NaN);
const date = (s) => (Number.isNaN(parse(s)) ? "__________" : s.split("-").reverse().join("."));
const money = (n) => (Number(n) > 0 ? Math.round(Number(n)).toLocaleString("he-IL") + " ₪" : "__________ ₪");
const num = (n, d) => (Number(n) > 0 ? Math.round(Number(n)) : d);
const lines = (t) => String(t ?? "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

const SECURITY = {
  none: "",
  deposit: "פיקדון כספי",
  bank_guarantee: "ערבות בנקאית אוטונומית",
  promissory_note: "שטר חוב",
  guarantor: "כתב ערבות של ערב",
};
const PAYMENT = {
  transfer: "העברה בנקאית לחשבון שהמשכיר יודיע עליו בכתב",
  checks: "המחאות דחויות שימסרו במעמד החתימה",
  standing_order: "הוראת קבע",
};

export function generate(inputs = {}) {
  const warnings = [];
  for (const [k, label] of [["landlord_name", "שם המשכיר"], ["tenant_name", "שם השוכר"], ["property_address", "כתובת הדירה"], ["monthly_rent", "דמי השכירות"]]) {
    if (!inputs[k]) warnings.push(`חסר שדה: ${label}.`);
  }
  const s = parse(inputs.start_date);
  const e = parse(inputs.end_date);
  if (!Number.isNaN(s) && !Number.isNaN(e) && e <= s) warnings.push("תאריך סיום השכירות חייב להיות אחרי תאריך התחלתה.");

  const rent = Number(inputs.monthly_rent) || 0;
  const secType = SECURITY[inputs.security_type] !== undefined ? inputs.security_type : "none";
  const secAmount = Number(inputs.security_amount) || 0;
  if (secType !== "none" && rent > 0 && secAmount > 0 && !Number.isNaN(s) && !Number.isNaN(e) && e > s) {
    const months = Math.max(1, Math.round((e - s) / (86400000 * (365.25 / 12))));
    const cap = Math.min(rent * 3, (rent * months) / 3);
    if (secAmount > cap) {
      warnings.push(`סכום הערובה (${money(secAmount)}) עשוי לחרוג מהתקרה שבחוק השכירות והשאילה. בדקו את התקרה לפני החתימה.`);
    }
  }
  const payDay = Math.min(28, Math.max(1, num(inputs.payment_day, 1)));
  const landlordNotice = num(inputs.landlord_notice_days, 90);
  const tenantNotice = num(inputs.tenant_notice_days, 60);
  const returnDays = num(inputs.security_return_days, 60);
  const payment = PAYMENT[inputs.payment_method] || PAYMENT.transfer;

  let n = 0;
  const sec = () => `<h2>${++n}. `;
  const parts = [];
  parts.push(`<div dir="rtl" lang="he">
<h1>הסכם שכירות דירה למגורים</h1>
<p>שנערך ונחתם ב${val(inputs.signing_city)} ביום ${date(inputs.signing_date)}</p>
<p><strong>בין:</strong> ${val(inputs.landlord_name)}, ת"ז ${val(inputs.landlord_id)}, מכתובת ${val(inputs.landlord_address)} (להלן: "המשכיר")</p>
<p><strong>לבין:</strong> ${val(inputs.tenant_name)}, ת"ז ${val(inputs.tenant_id)}, מכתובת ${val(inputs.tenant_address)} (להלן: "השוכר")</p>`);

  parts.push(`${sec()}המושכר</h2>
<p>המשכיר משכיר לשוכר את הדירה ברחוב ${val(inputs.property_address)}, בת ${val(inputs.rooms)} חדרים (להלן: "המושכר"), לרבות: ${val(inputs.includes)}. המיטלטלין שבמושכר מפורטים בנספח א.</p>
<p>המשכיר מצהיר כי המושכר ראוי למגורים, כי מערכות המים, החשמל והביוב פועלות, וכי אין בידיעתו ליקוי שיש בו כדי לפגוע בשימוש סביר במושכר, למעט: ${lines(inputs.known_defects).map(esc).join("; ") || "אין"}.</p>`);

  parts.push(`${sec()}תקופת השכירות</h2>
<p>תקופת השכירות תחל ביום ${date(inputs.start_date)} ותסתיים ביום ${date(inputs.end_date)}.</p>`);

  if (inputs.option === true) {
    parts.push(`${sec()}תקופת אופציה</h2>
<p>לשוכר נתונה אפשרות להאריך את השכירות לתקופה נוספת של ${val(inputs.option_months)} חודשים, בדמי שכירות גבוהים ב-${val(inputs.option_increase_percent)}% מדמי השכירות בתקופה הראשונה. השוכר יודיע על מימוש האפשרות בכתב, לפחות ${tenantNotice} ימים לפני תום תקופת השכירות.</p>`);
  }

  parts.push(`${sec()}דמי השכירות</h2>
<p>השוכר ישלם למשכיר דמי שכירות של ${money(inputs.monthly_rent)} לחודש, עד היום ה-${payDay} בכל חודש, באמצעות ${payment}.</p>
${inputs.index_linked === true ? `<p>דמי השכירות יוצמדו למדד המחירים לצרכן שמפרסמת הלשכה המרכזית לסטטיסטיקה. מדד הבסיס: ${val(inputs.base_index_desc)}. העדכון ייעשה ${val(inputs.index_update)}. ${inputs.index_floor === true ? "דמי השכירות לא יפחתו מהסכום הנקוב בסעיף זה." : ""}</p>` : `<p>דמי השכירות אינם צמודים למדד.</p>`}`);

  parts.push(`${sec()}תשלומים שוטפים והוצאות</h2>
<p>בתקופת השכירות ישלם השוכר את התשלומים השוטפים הנובעים מהשימוש במושכר: ארנונה, מים, חשמל, גז ודמי ועד בית שוטפים. השוכר יעביר את החשבונות לשמו בתחילת השכירות, ככל שהדבר אפשרי.</p>
<p>המשכיר יישא בהוצאות שאינן נובעות מהשימוש השוטף, ובהן: ביטוח מבנה הדירה, תיקונים במבנה ובמערכות הקבועות שאינם נובעים משימוש בלתי סביר של השוכר, תשלומים חריגים לוועד הבית או לנציגות הבית המשותף (כגון שיפוץ חזיתות או החלפת מעלית), ודמי תיווך שהמשכיר הזמין.</p>`);

  parts.push(`${sec()}תיקונים ותחזוקה</h2>
<p>השוכר יודיע למשכיר בכתב על כל ליקוי במושכר. המשכיר יתקן, על חשבונו, ליקוי שאינו נובע משימוש בלתי סביר של השוכר, בתוך זמן סביר ולא יאוחר מהמועד שקובע החוק. ליקוי דחוף שאינו מאפשר מגורים סבירים יתוקן בהקדם האפשרי.</p>
<p>השוכר ישמור על המושכר ויישא בתיקון נזק שנגרם בשל שימוש בלתי סביר שלו או של מי מטעמו. בלאי סביר לא ייחשב לנזק.</p>`);

  parts.push(`${sec()}השימוש במושכר</h2>
<p>המושכר ישמש למגורי השוכר ובני ביתו בלבד. השוכר לא ישכיר את המושכר בשכירות משנה ולא יעביר את זכויותיו בלי הסכמת המשכיר בכתב. ${inputs.pets === true ? "החזקת חיית מחמד במושכר מותרת, והשוכר יישא בכל נזק שתגרום." : "החזקת חיית מחמד במושכר טעונה הסכמת המשכיר מראש ובכתב."}</p>
<p>המשכיר רשאי לבקר במושכר בתיאום מראש עם השוכר, בשעות סבירות ובתדירות סבירה.</p>
<p>השוכר לא יבצע שינויים במושכר בלי הסכמת המשכיר בכתב.</p>`);

  if (secType !== "none") {
    parts.push(`${sec()}ערובה</h2>
<p>להבטחת התחייבויותיו ימסור השוכר למשכיר במעמד החתימה ${SECURITY[secType]} בסך ${money(secAmount)}. סכום הערובה לא יעלה על הסכום המרבי המותר לפי חוק השכירות והשאילה, התשל"א-1971.</p>
<p>המשכיר יהיה רשאי להשתמש בערובה רק לכיסוי חוב או נזק שהשוכר אחראי להם לפי הסכם זה, ורק לאחר שנתן לשוכר הודעה מוקדמת בכתב ואפשרות סבירה לתקן את ההפרה.</p>
<p>המשכיר ישיב לשוכר את הערובה, או את יתרתה, בתוך ${returnDays} ימים מתום השכירות ומהחזרת החזקה במושכר, ובלבד שהשוכר הציג אישורים על תשלום החשבונות השוטפים עד מועד הפינוי.</p>`);
  }

  parts.push(`${sec()}סיום השכירות ופינוי</h2>
<p>משכיר שאינו מעוניין להאריך את השכירות, או המבקש לשנות את תנאיה לתקופה הבאה, יודיע על כך לשוכר בכתב לפחות ${landlordNotice} ימים לפני תום התקופה. שוכר שאינו מעוניין להאריך יודיע על כך למשכיר בכתב לפחות ${tenantNotice} ימים לפני תום התקופה.</p>
<p>בתום השכירות ישיב השוכר את המושכר כשהוא פנוי ונקי, במצב שבו קיבל אותו, למעט בלאי סביר.</p>
${inputs.replacement_tenant === true ? `<p>השוכר רשאי לסיים את השכירות לפני תום התקופה אם יציע שוכר חלופי מתאים, שיחתום על הסכם בתנאים דומים. המשכיר לא יסרב לשוכר חלופי מטעמים בלתי סבירים.</p>` : ""}`);

  parts.push(`${sec()}שונות</h2>
<p>כל שינוי בהסכם זה ייעשה בכתב ובחתימת שני הצדדים. הודעות לפי הסכם זה יישלחו לכתובות הצדדים שבראש ההסכם או בדואר אלקטרוני שהצדדים הסכימו עליו.</p>`);

  const furniture = lines(inputs.furniture);
  parts.push(`<h2>חתימות</h2>
<table>
<tr><th>המשכיר</th><th>השוכר</th></tr>
<tr><td>${val(inputs.landlord_name)}<br>חתימה: __________</td><td>${val(inputs.tenant_name)}<br>חתימה: __________</td></tr>
</table>
<h2>נספח א: מיטלטלין ומצב המושכר במסירה</h2>
${furniture.length ? `<ul>${furniture.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : "<p>אין מיטלטלין.</p>"}
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי. מומלץ שעורך דין יבדוק את ההסכם לפני החתימה.</em></p>
</div>`);

  return { title: "הסכם שכירות דירה למגורים", html: parts.join("\n"), warnings };
}
