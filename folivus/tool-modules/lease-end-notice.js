// Draft letter: notice of ending a residential lease. Pure function, no network.
const d = (s) => { if (!s) return '______'; const x = new Date(s); return isNaN(+x) ? String(s) : x.toLocaleDateString('he-IL'); };
const v = (s) => (String(s || '').trim() || '______');
export function generate(i) {
  const tenant = i.sender_role !== 'landlord';
  const today = new Date().toLocaleDateString('he-IL');
  const clause = String(i.clause || '').trim();
  const lines = [];
  lines.push(`תאריך: ${today}`, '', `לכבוד`, `${v(i.other_name)}`, '', `הנדון: הודעה על סיום השכירות בדירה ב${v(i.address)}`, '');
  lines.push(`1. בינינו נחתם הסכם שכירות מיום ${d(i.contract_date)} לגבי הדירה שבנדון (להלן: "ההסכם").`);
  if (i.reason === 'early_exit') {
    lines.push(`2. בהתאם ${clause ? `לסעיף ${clause} ` : ''}להסכם, אני מודיע/ה בזאת על סיום השכירות לפני תום תקופת השכירות.`);
  } else {
    lines.push(`2. אני מודיע/ה בזאת שלא אאריך את השכירות, והיא תסתיים בתום התקופה${clause ? `, בהתאם לסעיף ${clause} להסכם` : ''}.`);
  }
  lines.push(tenant
    ? `3. הדירה תפונה ותימסר לך ביום ${d(i.end_date)}, כשהיא נקייה ובמצב שבו קיבלתי אותה, למעט בלאי סביר.`
    : `3. אבקש לפנות את הדירה ולמסור אותה לידיי ביום ${d(i.end_date)}, במצב שבו נמסרה, למעט בלאי סביר.`);
  lines.push(`4. אבקש לתאם מועד למסירת הדירה ולבדיקה משותפת של מצבה${i.phone ? `, בטלפון ${String(i.phone).trim()}` : ''}.`);
  if (i.deposit) {
    lines.push(tenant
      ? '5. לאחר מסירת הדירה ותשלום החשבונות עד מועד הפינוי, אבקש להשיב לי את הביטחונות שנמסרו לפי ההסכם (פיקדון, ערבות או שטר חוב).'
      : '5. הביטחונות שנמסרו לפי ההסכם יוחזרו לאחר מסירת הדירה, הצגת אישורים על תשלום החשבונות ובדיקה שאין נזק מעבר לבלאי סביר, הכול לפי ההסכם.');
  }
  lines.push('', 'בכבוד רב,', `${v(i.sender_name)}`, tenant ? '(השוכר/ת)' : '(המשכיר/ה)');
  return { title: 'הודעה על סיום שכירות', text: lines.join('\n'), notes: ['בדקו בהסכם את תקופת ההודעה המוקדמת ואת הדרך שבה צריך למסור הודעה.', 'שמרו עותק ואישור שליחה.'] };
}
