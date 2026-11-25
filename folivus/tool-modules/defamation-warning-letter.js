// מחולל מכתב התראה בגין פרסום לשון הרע - פוליבוס. מודול טהור.
// לפי חוק איסור לשון הרע, התשכ"ה-1965.

export const CONFIG = {
  defaultDeadlineDays: 7,
  // תקרת הפיצוי ללא הוכחת נזק לפי סעיף 7א צמודה למדד; הסכום העדכני לא אומת ולכן אינו מוצג
  noProofCompensationCap: null,
};

const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const val = (v) => (v === undefined || v === null || String(v).trim() === "" ? "__________" : esc(String(v).trim()));
const date = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s.split("-").reverse().join(".") : "__________");
const lines = (t) => String(t ?? "").split(/\n+/).map((x) => x.trim()).filter(Boolean);
const MEDIA = { facebook: "בפייסבוק", whatsapp: "בקבוצת וואטסאפ", website: "באתר אינטרנט", review: "בביקורת גולשים", print: "בעיתון", email: "בדואר אלקטרוני", other: "" };

export function generate(inputs = {}) {
  const warnings = [];
  if (!inputs.recipient_name) warnings.push("חסר שם המפרסם.");
  if (!inputs.statement) warnings.push("צטטו במדויק את הדברים שפורסמו.");
  const media = MEDIA[inputs.medium] !== undefined ? inputs.medium : "other";
  const mediaText = media === "other" ? val(inputs.medium_other) : MEDIA[media];
  const why = lines(inputs.why_false);
  const days = Number(inputs.deadline_days) > 0 ? Math.round(Number(inputs.deadline_days)) : CONFIG.defaultDeadlineDays;
  const wantApology = !(inputs.demand_apology === false || inputs.demand_apology === "false");
  const wantComp = inputs.demand_compensation === true || inputs.demand_compensation === "true";
  let n = 0;
  const p = (t) => `<p>${++n}. ${t}</p>`;

  const html = `<div dir="rtl" lang="he">
<p>תאריך: ${date(inputs.letter_date)}</p>
<p>לכבוד<br>${val(inputs.recipient_name)}<br>${val(inputs.recipient_address)}</p>
<h1>הנדון: פרסום לשון הרע. התראה ודרישה להסרה ${wantApology ? "ולהתנצלות" : ""}</h1>
${p(`ביום ${date(inputs.publication_date)} פרסמת ${mediaText} את הדברים הבאים עליי:`)}
<blockquote>${val(inputs.statement)}</blockquote>
${inputs.link ? p(`קישור או מיקום הפרסום: ${esc(inputs.link)}.`) : ""}
${p("הדברים אינם נכונים:")}
${why.length ? `<ul>${why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : "<p>__________</p>"}
${p("לפי סעיף 1 לחוק איסור לשון הרע, התשכ\"ה-1965, לשון הרע היא דבר שפרסומו עלול, בין השאר, להשפיל אדם בעיני הבריות, לבזותו בשל מעשים או תכונות, או לפגוע בו במשרתו, בעסקו או במקצועו. הפרסום שלך פוגע בי באופן זה.")}
${p(`לכן אני דורש/ת ממך, בתוך ${days} ימים ממועד קבלת מכתב זה: (א) להסיר את הפרסום מכל מקום שבו פורסם; (ב) להימנע מפרסומים נוספים בעניין${wantApology ? `; (ג) לפרסם התנצלות ותיקון, באותו מקום ובאותה בולטות שבה פורסם הפרסום המקורי, בנוסח שיתואם איתי מראש` : ""}.`)}
${wantComp ? p("אני שומר/ת על זכותי לתבוע פיצוי בשל הנזק שנגרם לי, לרבות פיצוי ללא הוכחת נזק לפי סעיף 7א לחוק, שתקרתו גבוהה יותר כשהפרסום נעשה בכוונה לפגוע.") : ""}
${p("אם הדרישות לא ימולאו, אשקול להגיש נגדך תביעה בלי הודעה נוספת. אין במכתב זה כדי לגרוע מכל זכות או טענה שלי.")}
<p>בכבוד רב,<br>${val(inputs.sender_name)}<br>${val(inputs.sender_address)}<br>${val(inputs.sender_phone)}</p>
<p><em>טיוטה כללית שהופקה בכלי של פוליבוס. היא אינה ייעוץ משפטי ואינה מחליפה התייעצות עם עורך דין.</em></p>
</div>`;
  warnings.push("שמרו תיעוד של הפרסום לפני שליחת המכתב: צילום מסך עם תאריך, קישור ושמות של מי שראו אותו.");
  warnings.push("החוק כולל הגנות, למשל אמת בפרסום ועניין ציבורי, או הבעת דעה בתום לב. כדאי לבדוק עם עורך דין אם הן עשויות לחול לפני שמגישים תביעה.");
  warnings.push("כדאי לפעול מהר: ראיות ברשת נמחקות, והשהיה ארוכה עלולה להשפיע על הפיצוי. מכתב התראה אינו עוצר את מרוץ ההתיישנות.");
  return { title: "מכתב התראה בגין לשון הרע", html, warnings };
}
