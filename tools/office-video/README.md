# סרטוני שאלות ליוטיוב

סרטונים קצרים (1080x1920, קריינות בעברית, כתוביות) שעונים על שאלה אחת לפי מאמר מהאתר, בצבעי המשרד.
הם ממלאים את משבצות היוטיוב "סרטון שאלה" בלוח הפרסום (שני 17:00 ושישי 10:00).

איך זה עובד:
1. המשימה השבועית "לוח פרסום שבועי" כותבת תסריט לכל משבצת (Supabase, docs coll `ytscript`).
2. הפונקציה `ytvideo?a=next` מכינה את הקריינות (Google Text-to-Speech, הקול he-IL-Chirp3-HD-Charon) ומחזירה את התסריט.
3. ה-GitHub Action "office videos" רץ כל שעה, מרנדר עם `render.mjs` ושומר ב-`media/yt/<id>.mp4`.
4. `ytvideo?step=attach` (pg_cron, כל רבע שעה) מצרף את הקובץ לשורה בלוח ושולח ליקיר בטלגרם צפייה וכפתור "לא לפרסם".
5. מי מעלה ליוטיוב: גרוק, לפי הלוח. כש-`settings/pub.ytDirect` = true, המערכת מעלה בעצמה דרך הפונקציה `ytup` (YouTube Data API).

בדיקת עיצוב מקומית (תמונה אחת לכל סצנה, בלי קריינות):
`STILLS=/tmp/out node tools/office-video/render.mjs script.json`

## הסרטון השבועי "השבוע בנתניה" (אתר החדשות nws.co.il)

אותו מנוע ואותו קול, בעיצוב של חדשות נתניה והשרון (כחול כהה ולבן, 1920x1080, כ-3 דקות). לא קשור למשרד.
1. משימה שבועית (שישי 12:00) בוחרת 6 עד 8 ידיעות מהשבוע מ-`hns_stories` וכותבת תסריט ב-Supabase, docs coll `nwsvideo`, id `w-YYYY-MM-DD`, סטטוס `new`.
2. הפונקציה `ytvideo?a=nwsnext` מכינה את הקריינות ומחזירה את התסריט (עד שהחלק הזה נפרס: הקריינות דרך הפונקציה `tts`, והתסריט נשמר בקובץ `media/nwsv/<id>.json`).
3. ה-GitHub Action "nws weekly video" (`.github/workflows/nws-video.yml`) מרנדר עם `news.mjs` ושומר `media/nwsv/<id>.mp4`, תמונת שער `<id>.jpg`, זמני הסצנות `<id>.times.json` ו-4 תמונות בדיקה ב-`media/nwsv/check/`.
4. `ytvideo?step=attach` מסמן את השורה `ready` ושולח ליקיר בטלגרם קישור צפייה. שום דבר לא עולה ליוטיוב עד שערוץ האתר יחובר.

בדיקת עיצוב מקומית: `STILLS=/tmp/out node tools/office-video/news.mjs media/nwsv/<id>.json`
