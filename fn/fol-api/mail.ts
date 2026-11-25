// Emails of the lawyers directory, in simple Hebrew, right to left. Transactional only (no marketing).
// Rules: no em or en dashes, never the superlative word, never the word for "expert", no promises.
// The brand name comes from fol_settings.brand (temporary name), never hardcoded in the text.
import { esc } from './common.ts';

type M = { subject: string; html: string; template: string };
function frame(brand: string, title: string, inner: string, site: string, test: boolean): string {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F3F1EC;font-family:Arial,Helvetica,sans-serif;color:#1B2B2A">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3F1EC"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:12px;overflow:hidden">
<tr><td style="background:#1F3B38;color:#FFFFFF;padding:18px 24px;font-size:20px;font-weight:bold;text-align:right">${esc(brand)}</td></tr>
${test ? `<tr><td style="background:#FFF4D6;color:#6B4E00;padding:8px 24px;font-size:13px;text-align:right">מצב בדיקה: לא בוצע חיוב אמיתי.</td></tr>` : ''}
<tr><td style="padding:24px;font-size:16px;line-height:1.6;text-align:right">${inner}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #E6E2D8;font-size:12px;color:#6B7570;text-align:right">
${esc(brand)} הוא מדריך משרדי עורכי דין ואתר מידע משפטי כללי. זו הודעה על פעולה שביצעתם באתר.<br><a href="${esc(site)}" style="color:#1F3B38">${esc(site)}</a></td></tr>
</table></td></tr></table></body></html>`;
}
const btn = (href: string, text: string) => `<p style="margin:22px 0"><a href="${esc(href)}" style="background:#1F3B38;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:bold">${esc(text)}</a></p>`;
const codeBox = (c: string) => `<p style="font-size:30px;letter-spacing:6px;font-weight:bold;margin:18px 0;direction:ltr;text-align:right">${esc(c)}</p>`;
const rows = (r: [string, string][]) => `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:12px 0;font-size:15px">${r.map(([k, v]) => `<tr><td style="padding:4px 0;color:#6B7570;width:40%">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`).join('')}</table>`;

export function makeTpl(brand: string, site: string, test: boolean) {
  const f = (title: string, inner: string) => frame(brand, title, inner, site, test);
  const m = (template: string, subject: string, inner: string): M => ({ template, subject: (test ? '[בדיקה] ' : '') + subject, html: f(subject, inner) });
  return {
    login: (code: string, link: string) => m('login', `קוד כניסה לאזור המשרדים ב${brand}`,
      `<p>שלום,</p><p>ביקשתם להיכנס לאזור המשרדים. אפשר ללחוץ על הכפתור, או להקליד את הקוד:</p>${codeBox(code)}${btn(link, 'כניסה לאזור המשרדים')}<p style="font-size:13px;color:#6B7570">הקוד והקישור תקפים לשעה ולשימוש אחד. לא ביקשתם? אפשר להתעלם מההודעה.</p>`),
    claimCode: (code: string, firm: string) => m('claim_code', `קוד אימות לפרופיל של ${firm}`,
      `<p>שלום,</p><p>קיבלנו בקשה לאשר בעלות על הפרופיל של <strong>${esc(firm)}</strong>. זה הקוד להשלמת האימות:</p>${codeBox(code)}<p style="font-size:13px;color:#6B7570">הקוד תקף ל־30 דקות. לא ביקשתם? אפשר להתעלם מההודעה.</p>`),
    claimApproved: (firm: string, link: string) => m('claim_ok', `הבעלות על הפרופיל של ${firm} אושרה`,
      `<p>שלום,</p><p>הבעלות על הפרופיל של <strong>${esc(firm)}</strong> אושרה. מעכשיו אפשר לעדכן פרטים, להוסיף תיאור ולוגו ולהגיב לחוות דעת.</p>${btn(link, 'כניסה לאזור המשרדים')}`),
    reviewCode: (code: string, firm: string) => m('review_code', `קוד אימות לחוות הדעת על ${firm}`,
      `<p>שלום,</p><p>תודה שכתבתם חוות דעת על <strong>${esc(firm)}</strong>. כדי שנפרסם אותה, הקלידו את הקוד:</p>${codeBox(code)}<p style="font-size:13px;color:#6B7570">הקוד תקף ל־30 דקות. כתובת המייל לא מתפרסמת באתר.</p>`),
    removalAck: (code: string, firm: string, kind: string) => m('removal_ack', `קיבלנו את הבקשה ל${kind === 'fix' ? 'תיקון' : 'הסרה'} (${firm})`,
      `<p>שלום,</p><p>קיבלנו את הבקשה ל${kind === 'fix' ? 'תיקון פרטים' : 'הסרת הפרופיל'} של <strong>${esc(firm)}</strong>. נטפל בה תוך 48 שעות לכל היותר.</p><p>כדי לאמת שהבקשה נשלחה מכם, הקלידו את הקוד בעמוד הבקשה:</p>${codeBox(code)}<p style="font-size:13px;color:#6B7570">כשהבקשה נשלחת ממייל בדומיין של אתר המשרד, הפרופיל מוסתר מיד אחרי האימות.</p>`),
    removalDone: (firm: string, hidden: boolean) => m('removal_done', `עדכון על הבקשה שלכם (${firm})`,
      `<p>שלום,</p><p>${hidden ? `הפרופיל של <strong>${esc(firm)}</strong> הוסתר מהאתר.` : `הבקשה שלכם על <strong>${esc(firm)}</strong> טופלה.`}</p><p>אם משהו לא מסתדר, אפשר להשיב למייל הזה.</p>`),
    orderPaid: (o: { firm: string; product: string; items: string[]; until: string; net: string; vat: string; total: string; portal: string; extra?: string }) =>
      m('order_paid', `ההזמנה הופעלה: ${o.product}`,
        `<p>שלום,</p><p>התשלום התקבל וההזמנה הופעלה. הקבלה נשלחת אליכם בנפרד ממערכת החשבוניות.</p>${rows([['משרד', o.firm], ['מוצר', o.product], ...o.items.map((x) => ['מיקום', x] as [string, string]), ['בתוקף עד', o.until], ['לפני מע"מ', o.net], ['מע"מ', o.vat], ['סך הכול', o.total]])}${o.extra ? `<p>${esc(o.extra)}</p>` : ''}<p>כל מיקום בתשלום מסומן באתר "משרד מקודם" או "מודעה". התשלום לא משפיע על הדירוג ועל חוות הדעת.</p>${btn(o.portal, 'לאזור המשרדים')}`),
    renew: (o: { firm: string; product: string; item: string; until: string; days: number; total: string; link: string; auto: boolean }) =>
      m('renew_' + o.days, o.days <= 0 ? `המיקום הסתיים: ${o.product}` : `תזכורת: ${o.product} מסתיים בעוד ${o.days === 1 ? 'יום אחד' : o.days + ' ימים'}`,
        `<p>שלום,</p><p>${o.days <= 0 ? 'התקופה של המיקום הסתיימה והוא כבר לא מוצג באתר.' : `התקופה של המיקום מסתיימת ב־${esc(o.until)}.`}</p>${rows([['משרד', o.firm], ['מוצר', o.product], ['מיקום', o.item], ['חידוש לתקופה נוספת', o.total + ' כולל מע"מ']])}${o.auto ? '<p>ביקשתם חידוש אוטומטי. אפשר לבטל אותו בכל רגע באזור המשרדים.</p>' : ''}${btn(o.link, 'חידוש עכשיו')}<p style="font-size:13px;color:#6B7570">החידוש ממשיך מהתאריך שבו התקופה הנוכחית מסתיימת, כך שלא מפסידים ימים.</p>`),
    articleApproval: (firm: string, title: string, link: string) => m('article_approval', `טיוטת התוכן הממומן מוכנה לאישור`,
      `<p>שלום,</p><p>הטיוטה של התוכן הממומן של <strong>${esc(firm)}</strong> מוכנה: "${esc(title)}".</p><p>אפשר לאשר אותה לפרסום, או לבקש שינויים.</p>${btn(link, 'לקריאה ואישור')}<p style="font-size:13px;color:#6B7570">התוכן יתפרסם עם התווית "תוכן ממומן".</p>`),
    profileResult: (firm: string, ok: boolean, issues: string[], link: string) => m('profile_' + (ok ? 'ok' : 'fix'), ok ? `הפרופיל של ${firm} עודכן` : `צריך לתקן כמה דברים בפרופיל של ${firm}`,
      ok ? `<p>שלום,</p><p>השינויים בפרופיל עברו את הבדיקות ופורסמו. הם יופיעו באתר בעדכון הקרוב.</p>${btn(link, 'לאזור המשרדים')}`
         : `<p>שלום,</p><p>השינויים לא פורסמו, כי:</p><ul>${issues.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>${btn(link, 'לתיקון')}`),
    monthly: (firm: string, month: string, s: { views: number; phone: number; website: number; whatsapp: number }, link: string) => m('monthly', `הנתונים של ${firm} בחודש ${month}`,
      `<p>שלום,</p><p>אלה הנתונים של הפרופיל בחודש ${esc(month)}:</p>${rows([['צפיות בפרופיל', String(s.views)], ['לחיצות על הטלפון', String(s.phone)], ['לחיצות על האתר', String(s.website)], ['לחיצות על וואטסאפ', String(s.whatsapp)]])}<p style="font-size:13px;color:#6B7570">הספירה כללית בלבד: לא נשמרים פרטים על המבקרים.</p>${btn(link, 'לאזור המשרדים')}`),
    admin: (title: string, lines: string[]) => m('admin', title, `<p><strong>${esc(title)}</strong></p><ul>${lines.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>`),
  };
}
