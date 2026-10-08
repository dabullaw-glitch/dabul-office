// Courses. The original course ("yotzim") keeps its lessons at kurs/<lesson>/; the others live at kurs/<course>/<lesson>/.
export const COURSES = [
  { id: 'yotzim', title: 'יוצאים מחובות, צעד אחר צעד', short: 'יוצאים מחובות', blurb: 'מתמונת מצב ועד הפטר: הסדר, הוצאה לפועל, איחוד תיקים, חדלות פירעון והחיים אחרי.', icon: 'cap' },
  { id: 'kalkala', title: 'התנהלות כלכלית נכונה', short: 'התנהלות כלכלית', blurb: 'ריבית, אשראי, קרן חירום ומיצוי זכויות: הבסיס שכל משק בית צריך.', icon: 'leaf' },
  { id: 'taktziv', title: 'ניהול תקציב שעובד', short: 'ניהול תקציב', blurb: 'מעקב, בניית תקציב, הוצאות שנתיות, שיטת המעטפות ושגרה שמחזיקה לאורך זמן.', icon: 'file' },
  { id: 'hesder', title: 'הסדר נושים נכון', short: 'הסדר נושים', blurb: 'איך בונים הצעה שנושה יגיד לה כן, מה כותבים במכתב, ומה חייב להיות בהסכם.', icon: 'hands' },
] as const;
export type CourseId = (typeof COURSES)[number]['id'];
export const lessonUrl = (l: { id: string }) => `kurs/${l.id}/`;
