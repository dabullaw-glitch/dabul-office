// Team of One emails, in simple Hebrew, in the site's look (black, cream, lime). Right to left.
// Rules: no em or en dashes, no "הכי", never "מומחה", no promises.
import { esc } from './common.ts';

function frame(title: string, inner: string, site: string) {
  return `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title></head>
<body style="margin:0;background:#F4F1EA;font-family:Arial,Helvetica,sans-serif;color:#0B0B0C">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F1EA"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden" dir="rtl">
<tr><td style="background:#0B0B0C;padding:22px 26px;text-align:right"><span style="display:inline-block;background:#D7FF3B;color:#0B0B0C;font-weight:bold;border-radius:8px;padding:4px 10px;font-size:14px">Team of One</span>
<div style="color:#F4F1EA;font-size:22px;font-weight:bold;margin-top:12px;line-height:1.3">${esc(title)}</div></td></tr>
<tr><td style="padding:24px 26px;font-size:16px;line-height:1.7;text-align:right">${inner}</td></tr>
<tr><td style="padding:16px 26px;border-top:1px solid #ECE7DC;font-size:13px;color:#6B6B6B;text-align:right">קיבלתם את המייל הזה כי נרשמתם לאתר <a href="${esc(site)}" style="color:#0B0B0C">Team of One</a>. אפשר לענות למייל הזה בכל שאלה.</td></tr>
</table></td></tr></table></body></html>`;
}
const btn = (href: string, text: string) => `<p style="margin:22px 0"><a href="${esc(href)}" style="display:inline-block;background:#0B0B0C;color:#D7FF3B;text-decoration:none;font-weight:bold;border-radius:12px;padding:13px 22px">${esc(text)}</a></p>`;
const hi = (name: string) => `<p style="margin:0 0 12px">שלום${name ? ' ' + esc(name.split(' ')[0]) : ''},</p>`;
const backup = (href: string) => `<p style="font-size:13px;color:#6B6B6B;margin:0">אם הכפתור לא נפתח, מעתיקים את הקישור הזה לדפדפן:<br><span dir="ltr" style="word-break:break-all">${esc(href)}</span></p>`;

export const tpl = {
  verify: (name: string, link: string, site: string) => ({
    subject: 'אישור המייל שלכם ב-Team of One',
    html: frame('עוד צעד אחד וסיימתם', `${hi(name)}<p style="margin:0">כדי לסיים את ההרשמה, לוחצים על הכפתור ומאשרים שהמייל הזה שלכם.</p>${btn(link, 'אישור המייל')}<p style="margin:0 0 12px">הקישור תקף לזמן מוגבל. אם לא נרשמתם לאתר, אפשר פשוט להתעלם מהמייל.</p>${backup(link)}`, site),
  }),
  reset: (name: string, link: string, site: string) => ({
    subject: 'בחירת סיסמה חדשה ב-Team of One',
    html: frame('בחירת סיסמה חדשה', `${hi(name)}<p style="margin:0">ביקשתם לבחור סיסמה חדשה. לוחצים על הכפתור, ובדף שנפתח כותבים סיסמה חדשה.</p>${btn(link, 'בחירת סיסמה חדשה')}<p style="margin:0 0 12px">הקישור תקף לזמן מוגבל ופועל פעם אחת. אם לא ביקשתם, אפשר להתעלם מהמייל, והסיסמה הקיימת נשארת.</p>${backup(link)}`, site),
  }),
  paidCourse: (name: string, planName: string, amount: string, site: string) => ({
    subject: 'התשלום התקבל, הגישה שלכם פתוחה',
    html: frame('ברוכים הבאים לצוות', `${hi(name)}<p style="margin:0">התשלום על <b>${esc(planName)}</b> (${esc(amount)}) התקבל, והגישה שלכם פתוחה.</p>${btn(site + 'ezor-ishi/', 'לאזור האישי')}<p style="margin:0">נכנסים עם אותו מייל שנרשמתם איתו. קבלה על התשלום נשלחת אליכם בנפרד.</p>`, site),
  }),
  paidMonthly: (name: string, amount: string, until: string, site: string) => ({
    subject: 'התשלום התקבל, המנוי שלכם פעיל',
    html: frame('המנוי פעיל', `${hi(name)}<p style="margin:0">התשלום על המנוי החודשי (${esc(amount)}) התקבל. המנוי פעיל עד <b>${esc(until)}</b>.</p>${btn(site + 'ezor-ishi/', 'לאזור האישי')}<p style="margin:0">כמה ימים לפני סוף החודש נשלח לכם קישור לתשלום על החודש הבא. אם לא תשלמו, המנוי פשוט ייגמר, בלי חיוב. קבלה על התשלום נשלחת אליכם בנפרד.</p>`, site),
  }),
  renew: (name: string, until: string, amount: string, payUrl: string, site: string) => ({
    subject: 'המנוי שלכם ב-Team of One מסתיים בקרוב',
    html: frame('המנוי מסתיים בקרוב', `${hi(name)}<p style="margin:0">המנוי שלכם פעיל עד <b>${esc(until)}</b>. כדי להמשיך עוד חודש (${esc(amount)}), משלמים בקישור:</p>${btn(payUrl, 'תשלום לחודש הבא')}<p style="margin:0">לא רוצים להמשיך? לא צריך לעשות כלום. המנוי ייגמר בתאריך הזה, בלי חיוב.</p>`, site),
  }),
};
