# Scheduled task: infographic for one existing article (Sunday, Tuesday, Thursday)

Yakir approved on 19.11.2026: add an infographic to existing articles, 3 a week and no more, only to articles that
have none yet, starting with the articles that bring the most visitors from Google. He approved the design and this
flow, so each run publishes its one image without asking again, and then shows it to him in Telegram.
Read RUNBOOK.md in this folder first; it holds all the rules (content, design, render, upload, placement, checks).

DATA: Supabase project mgjmnvpnovkewvqevjmz. Table docs: write ONLY with INSERT or select docs_merge(coll,id,patch::jsonb)
(shallow merge: to change items, send the whole items array). Never UPDATE or DELETE. Never print secrets.
Queue: docs infographic/queue {items:[{id,title,link,clicks,impr,status}], log:[...]}, ordered by Google clicks.

STEPS
1. Week limit: count log entries with status 'done' in the current Israel week (Sunday to Saturday). If 3 or more, stop
   (log a skip and finish).
2. Take the first item with status 'queued'. Get its raw content (RUNBOOK section 4). If it already has an infographic
   (RUNBOOK "Already-done check"), mark it 'has-infographic' and take the next one (do not count it in the week).
   If it is an Elementor post, mark 'skipped-elementor' and take the next one. If the post is gone (404 or not publish),
   mark 'gone' and take the next one.
3. Build the infographic (RUNBOOK 1 and 2), verify every fact against its source this run, look at it full size and at
   360 px. Upload it (RUNBOOK 3). Insert it above the closing section (RUNBOOK 4, dry run first). Verify live.
4. Save: docs_merge the whole items array with this item {status:'done', at, wpMedia, img, placedBefore:<heading text>},
   and append to log {id, at, status:'done'}.
5. Telegram to Yakir (one message): sendPhoto with photo = the WordPress image URL and caption:
   "🖼️ נוספה אינפוגרפיקה למאמר: <title>\n<link>\nאם משהו לא נראה לך, כתוב לי ואתקן." 
   (net.http_post to 'https://api.telegram.org/bot'||(select v from app_secrets where k='TELEGRAM_BOT_TOKEN')||'/sendPhoto'
   with chat_id (select v from app_secrets where k='TELEGRAM_CHAT_ID')).
6. Log: docs_merge('agents','infographic-'||current_date, {post, ok, note}). Finish with a short Hebrew summary.

If something blocks the run (render fails, upload fails, no unique heading to place it), leave the item 'queued' with a
note, try the next item once, and if that also fails send Yakir one short Telegram line that this time the infographic
did not go up and why. Never change anything else in an article, never publish anything else, never spend money.
Hebrew only in anything Yakir or the public sees, simple words, no English words, never em dash or en dash.
