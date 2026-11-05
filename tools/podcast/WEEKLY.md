# פודקאסט שבועי "נדל״ן בגובה העיניים": כתיבת הפרק ושליחה לאישור

Read by the scheduled task "פודקאסט שבועי: תסריט לאישור" (every Thursday morning) and by the HeyGen task when Yakir asks
for a fix (status 'script-fix', tools/heygen-edit/TASK.md section 6b).

Yakir 5.11.2026: "משימה קבועה אחת לשבוע לשלוח אליי תוכן לאישור ואחרי שאני מאשר להעביר את זה לעריכה ואז לפרסום של פרק
פודקאסט שבועי. כל פעם על נושא אחר."

This task only WRITES the episode and sends it to Yakir for approval. It never creates HeyGen media, never mixes, never
publishes. After Yakir presses the approve button, the scheduled task "סרטוני הייגן" does the voice, the edit, the final
approval and the publishing (TASK.md section 6b).

## Infrastructure

Supabase project mgjmnvpnovkewvqevjmz (execute_sql). Table docs(coll,id,data). Write only with INSERT or
`select docs_merge(coll,id,patch::jsonb)`. Never UPDATE or DELETE. Never print secrets: read them only inside SQL,
for example (select v from app_secrets where k='CRON_SECRET').
Read first: `docs podcast/show` (rules, topics, releaseSlot, clipSlot) and `docs podcast/ep01` (the model episode: the
shape of every field and the spoken style of the script).

## Steps

1. **Is there room for a new episode?** List `docs podcast` rows with id like 'ep%'. If an episode is still waiting for
   Yakir's script approval (status 'draft', 'script-wait' or 'script-fix'), do not write another one: log it and stop
   (the daily reminder already reminds him). Otherwise the new id is epNN = the highest number + 1 (two digits: ep02).
2. **Release date**: the first Wednesday at least 5 days from today that no other episode has as releaseDate (episode 1
   is on YouTube on 11.11.2026, so the first weekly episode, written 12.11.2026, gets 18.11.2026).
3. **Topic, every week a different one**: take the first item of podcast/show.topics that no episode used (compare with
   the topic of every epNN row, by meaning, not only by words). When the list is used up, choose a new real estate topic
   that is useful to many people now: current affairs first (a new law, a tax change, a Bank of Israel decision, a court
   ruling, Netanya and the Sharon), then evergreen subjects (rent, inheritance of an apartment, buying from a contractor,
   pinui binui, mas shevach, warning notes, mortgages, splitting property in a divorce, neighbors and the shared house).
   Never the same topic as an earlier episode. Append a new topic to show.topics (read, append, merge the whole array).
   Real estate only, never insolvency or debts.
4. **Research**: open at least 3 reliable sources this run (WebSearch, WebFetch: Kol Zchut, gov.il, the Tax Authority,
   Bank of Israel, court rulings, Bizportal, Nadlancenter, Globes, TheMarker). Every number and fact in the episode comes
   from a page you opened this run; keep {url, what} for each. A fact you cannot verify is left out.
5. **Write the episode** in Yakir's spoken style, exactly like ep01:
   - script: 1,450 to 1,650 words (10 to 12 minutes; his voice speaks about 2.4 words a second), in sections, each starting
     with a header line in square brackets: [פתיח] (a hook from a concrete moment, 30 to 40 s), [הצגת התוכנית] (the show,
     "אני יקיר דבול, עורך דין" once, what this episode covers), 4 to 5 parts [חלק 1: ...], a short [תזכורת באמצע הפרק]
     (share, follow), [מה עושים השבוע] (3 to 4 concrete steps for this week), [סיום] (a bridge to next week without
     naming a date, "המידע כללי ואינו ייעוץ משפטי"). Short spoken lines, numbers in words ("שני מיליון ומאה אלף"),
     "עורך דין" not "עו״ד" in the spoken text.
   - clip: {title, sec 60, words about 130, script: the strongest idea of the episode as a stand-alone 1-minute video for
     the networks, ending with "את הפרק המלא ... תמצאו בפודקאסט נדל״ן בגובה העיניים", caption (with the office phone line
     "לשאלות ותיאום פגישה: 09-8613413 או בוואטסאפ 050-5580189.", "המידע כללי ואינו ייעוץ משפטי." and 3 to 5 hashtags),
     status 'draft'}.
   - description for Spotify and Apple in the shape of ep01.description (2 lines, 3 to 5 bullets "•", the show line, the
     office line, the phone line, dabullaw.co.il, "המידע כללי ואינו ייעוץ משפטי." last).
   - title "פרק <n>: <topic>", youtubeTitle "<topic> | נדל״ן בגובה העיניים, פרק <n>",
     cover {episode: {kicker: "פרק <n>", line1, line2 (two short lines of the topic), line3: "נדל״ן בגובה העיניים · עו״ד יקיר דבול"}}.
   RULES (never break): Hebrew only, simple words, no English words, never em dash or en dash. Israel Bar rules: no "הכי"
   or other superlatives, never "מומחה", no promises, no prices for services, no "חינם", no testimonials. Examples are
   invented and framed as examples ("תחשבו על זוג ש...", "נניח ש..."), never "לקוח שלי", "היה לי תיק", "קרה לי". Nothing
   invented about Yakir's own life. Avoid settings/heygen.avoidWords. Never reuse a published reel script word for word
   (docs prompt). Read the whole script once more out loud in your head: does it flow, does the listener leave with
   something concrete to do?
6. **Save**: INSERT docs podcast epNN {n, by:'weekly-task', title, topic, script, clip, description, cover, youtubeTitle,
   sources:[{url, what}], words, sec (words / 2.4), releaseDate 'YYYY-MM-DD', rules (copy of ep01.rules), status 'draft',
   created: now()}.
7. **Send to Yakir**: POST https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/reels?vr=podscript with body {"id":"epNN"}
   and the header x-cron-secret = (select v from app_secrets where k='CRON_SECRET'), with net.http_post; after pg_sleep(4)
   read net._http_response for that id: it must be {"ok":true,...,"telegram":{"sent":true}}. The function sends ONE Telegram
   message with "קריאה ואישור" and "צריך שינוי" buttons; Yakir reads the whole script, the clip and the description on that
   page and approves with one press. Do not send any other message about it.
   If the call failed, send Yakir one short Telegram line that the podcast episode of this week is late and why
   (net.http_post to 'https://api.telegram.org/bot'||(select v from app_secrets where k='TELEGRAM_BOT_TOKEN')||'/sendMessage'
   with chat_id (select v from app_secrets where k='TELEGRAM_CHAT_ID')).
8. **Log**: docs_merge('agents','podcast-weekly-'||current_date, {episode, topic, releaseDate, words, sources: count,
   telegram}). Finish with a two-line Hebrew summary.
