# פודקאסט שבועי "נדל״ן בגובה העיניים": כתיבת הפרק ושליחה לאישור

Read by the scheduled task "פודקאסט שבועי: תסריט לאישור" (every Thursday morning) and by the HeyGen task when Yakir asks
for a fix (status 'script-fix', tools/heygen-edit/TASK.md section 6b).

PAUSE LIFTED 25.11.2026 by Yakir ("אחרי שנאשר את הקול אז נעשה את הפודקאסט באופן קבוע"): his own ElevenLabs voice
clone was approved that day, docs podcast/show.paused is false again and the weekly cycle runs as usual (ep04 goes out
2.12.2026, so this task's next run writes ep05 for the next free Wednesday). History: paused 22.11.2026 ("תשהה את
הפודקאסט") because the HeyGen voice read Hebrew badly. The guard stays: if show.paused is ever true again, do NOT write
an episode, do not send anything to Yakir; only write the log row (docs agents podcast-weekly-YYYY-MM-DD
{skipped:'paused'}) and stop.

Yakir 5.11.2026: "משימה קבועה אחת לשבוע לשלוח אליי תוכן לאישור ואחרי שאני מאשר להעביר את זה לעריכה ואז לפרסום של פרק
פודקאסט שבועי. כל פעם על נושא אחר."

This task only WRITES the episode and sends it to Yakir for approval. It never creates HeyGen media, never voices, never
mixes, never publishes. After Yakir presses the approve button, the scheduled task "סרטוני הייגן" does the voice (since
25.11.2026 his own ElevenLabs clone through the edge function `voice`, not HeyGen), the edit, the final approval and the
publishing (TASK.md section 6b).

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
   CATCH-UP (Yakir approved 11.11.2026 09:33): episode 1 went to Spotify and Apple on 5.11 and no episode went up in the week
   of 8.11, so ep02 is written on 11.11.2026 by a manual run and gets releaseDate 2026-11-12 (a Thursday, the one exception;
   its clip goes up Friday 13.11 at 13:00, see tools/heygen-edit/TASK.md 6b). The run of 12.11.2026 writes ep03 for
   18.11.2026, and from then on the rule above as usual. In the Telegram text for ep02 say it goes up "מחר, חמישי, ב-19:00".
3. **Topic, every week a different one**: take the first item of podcast/show.topics that no episode used (compare with
   the topic of every epNN row, by meaning, not only by words). When the list is used up, choose a new real estate topic
   that is useful to many people now: current affairs first (a new law, a tax change, a Bank of Israel decision, a court
   ruling, Netanya and the Sharon), then evergreen subjects (rent, inheritance of an apartment, buying from a contractor,
   pinui binui, mas shevach, warning notes, mortgages, splitting property in a divorce, neighbors and the shared house).
   Never the same topic as an earlier episode. Append a new topic to show.topics (read, append, merge the whole array).
   Real estate only, never insolvency or debts.
   TOPIC LIST RULE (Yakir 25.11.2026, saved in podcast/show.topicRule; it overrides the "choose a new topic" fallback
   above): show.topics holds only topics Yakir approved (19 on 25.11.2026: ep05 to ep07 take the 3 remaining older ones,
   then the 12 approved on 25.11.2026 in order, from the episode of 30.12.2026). Every run, after choosing this week's
   topic, count the unused topics left in show.topics. When 3 or fewer remain, propose to Yakir 12 NEW real estate topics
   never discussed before (compare by meaning with every epNN topic and every item of show.topics), in ONE Telegram message
   in simple Hebrew only (numbered list, one short line each; the Telegram line of step 7's fallback shows how to send),
   and save them as show.topicProposal {at, items, status 'wait'} (do not send again while a proposal waits). Only topics
   Yakir approves enter show.topics; never write an unapproved topic into the list and never use one for an episode.
   HOT CHANGE: if this week brings a real change in law or tax in real estate (a new law, a tax change, a Bank of Israel
   decision, a key ruling), that topic jumps to the front of the queue this week (it still needs Yakir's script approval
   like every episode); the rest of the list moves back by one. If no approved unused topic is left (and no hot change),
   do not write an episode this week: log {skipped:'no-approved-topic'} and make sure the proposal above was sent.
4. **Research**: open at least 3 reliable sources this run (WebSearch, WebFetch: Kol Zchut, gov.il, the Tax Authority,
   Bank of Israel, court rulings, Bizportal, Nadlancenter, Globes, TheMarker). Every number and fact in the episode comes
   from a page you opened this run; keep {url, what} for each. A fact you cannot verify is left out.
5. **Write the episode** in Yakir's spoken style, exactly like ep01:
   - script: 1,450 to 1,650 words (10 to 12 minutes; his voice speaks about 2.4 words a second; the ElevenLabs voice of
     25.11.2026 read ep04's 1,481 words in about 10 minutes), in sections, each starting
     with a header line in square brackets: [פתיח] (a hook from a concrete moment, 30 to 40 s), [הצגת התוכנית] (the show,
     "אני יקיר דבול, עורך דין" once, what this episode covers), 4 to 5 parts [חלק 1: ...], a short [תזכורת באמצע הפרק]
     (share, follow), [מה עושים השבוע] (3 to 4 concrete steps for this week), [סיום] (a bridge to next week without
     naming a date, "המידע כללי ואינו ייעוץ משפטי", and the goodbye "ונשתמע בשבוע הבא", never "ונשמע": Yakir 5.11.2026). Short spoken lines, numbers in words ("שני מיליון ומאה אלף"),
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

## Opening web sources in an unattended run (9.11.2026, Yakir approved)
Never WebFetch a URL written from memory or built by hand: in a scheduled run such a call waits for an approval nobody gives, and fails (on 9.11.2026 the article task wrote nothing because of this). First run WebSearch, and WebFetch only URLs that appeared in its results in this run. If a page is still blocked or WebFetch fails, open it through the database instead (Supabase project mgjmnvpnovkewvqevjmz): `select r.status, r.content from extensions.http(('GET','<url>',ARRAY[extensions.http_header('User-Agent','Mozilla/5.0')],null,null)::extensions.http_request) r` and read the text from the HTML. Tested 9.11.2026: Wikisource, Wikipedia and Nevo work this way; kolzchut and gov.il refuse it (403), so open those only via WebSearch then WebFetch. Never stop a run only because one source is blocked: use another reliable source.
