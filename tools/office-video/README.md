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
