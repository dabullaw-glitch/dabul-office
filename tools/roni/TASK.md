# Scheduled task "רוני הרוכש: פרק חדש לאישור" (every Wednesday 12:13 Israel time)

Fresh session, no memory. You prepare the next episode of the comic "רוני הרוכש" for עו"ד יקיר דבול and send it to
him for approval. You never publish anything. Read `tools/roni/README.md` first (format, drawing, text rules).

## Hard rules
- Supabase project mgjmnvpnovkewvqevjmz (execute_sql). Table docs(coll,id,data). Write ONLY with INSERT or
  `select docs_merge(coll,id,patch::jsonb)` (shallow merge: to change the `episodes` array, read it, change it, merge the
  whole array). Never UPDATE or DELETE. Never print secrets.
- Everything Yakir or the public sees: Hebrew only, simple words, no English words, never em dash or en dash.
  Israel Bar rules: no "הכי", never "מומחה", no promises, no prices, no "חינם", no testimonials, never other law firms.
  Real estate only. Every legal point must be correct and general; when in doubt, keep it simpler.
- An episode is scheduled ONLY after Yakir approves it. Never publish the same episode twice.
- HeyGen budget: at most 12 credits per episode (about 2 per image). Check the balance first
  (mcp__heygen__get_current_user); if under 10 credits, send Yakir one line that the episode is waiting for credits and stop.
- Telegram to Yakir: `select net.http_post(url:='https://api.telegram.org/bot'||(select v from app_secrets where k='TELEGRAM_BOT_TOKEN')||'/<method>', body:=<jsonb>, headers:='{"Content-Type":"application/json"}'::jsonb)`
  with chat_id `(select v from app_secrets where k='TELEGRAM_CHAT_ID')`. Check net._http_response after a short pg_sleep.

## Steps
1. Repo: if /home/claude/dabul-office is missing, `gh repo clone dabullaw-glitch/dabul-office /home/claude/dabul-office`,
   else `git pull -q --rebase --autostash origin main`. Today = Israel date.
2. Read docs roni/series (`episodes`, `nextNo`, `nextAt`, `howToApprove`, `rules`).
3. Housekeeping for every episode:
   - status 'scheduled' and its pub row (docs pub/<pub>) is 'published': set the episode to 'published'.
   - status 'sent' (waiting for approval): if the pub row status is now 'planned' (Yakir approved in a chat), set the
     episode to 'scheduled'. If still 'draft' and its date is less than 4 days away and `remindedAt` is empty, send ONE
     reminder (sendPhoto again, short caption "תזכורת: רוני פרק N מחכה לאישור שלך") and set remindedAt. If its date has
     passed without approval: move the episode and its pub row 14 days later (merge `at` on both), set nextAt to the new
     date, and tell Yakir in one line.
4. New episode only if NO episode has status 'drawing' or 'sent', and nextAt is 13 days away or less. Take episode nextNo
   from the list (status 'idea'). If the list ran out, write a new topic: a different deal mistake that was never used
   (check every title and topic in `episodes`), and append it.
   Set the episode status 'drawing' first (merge the whole array).
5. Script: 4 panels in RTL reading order (1 top right, 2 top left, 3 bottom right, 4 bottom left): Roni rushes in,
   makes the mistake, finds out the problem, the lawyer (Yakir) explains what to do. Noa is the voice of caution.
   Short bubbles (at most about 10 words), a funny moment, then the tip box "מה היה צריך לעשות?" with 1 to 2 short
   sentences. Same title style as episode 1 ("פרק N: <title>").
6. Drawing: mcp__heygen__create_image, model gpt-image-2.6, aspectRatio 1:1, numImages 1, a new UUID idempotencyKey per
   panel, referenceImages = the two public refs from docs roni/series.refs (type url). Prompt: same clean colorful
   comic style as the references, the same faces and clothes, the scene of the panel, empty space at the top for speech
   bubbles, NO text, letters or numbers anywhere in the image. At most one redraw per panel.
7. Download the panels (the workspace cannot reach HeyGen directly): use the helper branch `tools/fetch-media`:
   `git fetch origin tools/fetch-media && git worktree add /tmp/fm origin/tools/fetch-media`, write `fetch-list.txt`
   with lines `roni-epNN-p1.png <url>` ... `p4`, commit, `git push origin HEAD:tools/fetch-media`, wait for the
   "fetch media (internal)" run (`gh run list -R dabullaw-glitch/dabul-office -L 3`), pull, and copy
   `fetched/roni-epNN-p*.png` to `tools/roni/epNN/p1.png` ... `p4.png`. Look at every panel yourself (Read the image):
   the faces must match the references, no text in the drawing, nothing strange (hands, extra people).
8. Compose: add a function `epNN(out)` to `tools/roni/compose.py` in the same shape as `ep01` (bubble boxes placed in
   the empty areas, tails pointing at the speaker's mouth), build to `media/roni/epNN.jpg`, then Read the result and
   fix until clean: no text cut or overflowing, bubbles do not cover faces, Hebrew punctuation in the right place, the
   tip box text fits above the footer. Commit `tools/roni` and `media/roni/epNN.jpg` and push main (end the commit
   message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`). Wait for the "pages build and deployment"
   run and check the image URL returns 200 with net.http_get.
9. Caption in the approved pattern (README.md). INSERT docs ('pub','pub-roni-NN', {at:<nextAt>, kind:'image',
   owner:'office', status:'draft', series:'roni', title:'רוני הרוכש | פרק N: <title>', media:[<public url>],
   channels:['facebook','linkedin'], text:<caption>, note:'ממתין לאישור של יקיר', created:now()}). If that id exists, stop.
   Status 'draft' is never published by the system; only Yakir's approval changes it to 'planned'.
10. Telegram sendPhoto: {chat_id, photo:<public url>, caption:<"🦸 רוני הרוכש, פרק N לאישור" / the date and time it will go
    out (יום שני D.M ב-10:00, פייסבוק ולינקדאין) / the caption text / "לאישור כתוב לי: מאשר את רוני פרק N. לתיקון כתוב מה לשנות.">}
    (keep the caption under 1000 characters; if longer, send the post text in a second sendMessage).
11. Merge the episode: status 'sent', pub 'pub-roni-NN', at, sentAt. Set nextNo N+1 and nextAt = at + 14 days.
12. Teaser line: every episode in `episodes` has `nlText`, one short sentence for the newsletter and WhatsApp (what Roni
    did, no legal advice in it, e.g. "רוני השאיר צ׳ק של 50 אלף, ורק בבית בדק את הנסח."). Write it with the episode.
13. WhatsApp, once a month (Yakir: inside the weekly Sunday message, never an extra message). If docs roni/series
    `wa.<YYYY-MM>` (this Israel month) is empty: take the coming Sunday's group row, docs coll 'community' with
    data.week = that Sunday's date, status 'scheduled', in this same month. Only if its kind is 'tip' or 'qa' (a poll cannot
    carry an image; then wait for the next week) and the new text stays under 1000 characters: the newest episode whose
    pub row is 'published' (or 'planned' with `at` before that Sunday) and that has no `wa` yet. docs_merge the community
    row {image:<the episode's public jpg URL>, textBefore:<the old text>, text:"*רוני של החודש* 😅\n<nlText>\n\n"+<old text>,
    roniNo:N}, then merge `wa.<YYYY-MM>` = N on the series and `wa` = the community id on the episode. The function
    `social` (step publish) sends a row with `image` as one image message with that caption. If the month ends without a
    fitting Sunday, skip that month and log it.
14. Newsletter and magazine need nothing from this task: the newsletter (function growth, nl-notify) puts the newest
    episode that already went out and was not in a newsletter at the top as "רוני של החודש" by itself, and the weekly
    magazine task puts a new episode as slide 10 (media/magazine/RUNBOOK.md step 2b). They mark the episode with `nl` / `mag`.
15. Log: docs_merge('agents','roni-'||current_date, {episode, action, credits, ok}). Finish with one short Hebrew line.

If anything fails before step 10, set the episode back to 'idea', log the error, and send Yakir one short line that this
episode is late and why.

## When Yakir approves (in any chat)
`select docs_merge('pub','pub-roni-NN','{"status":"planned","approvedAt":"<date>"}')` and set the episode to 'scheduled'.
For a fix: change the text or the bubbles, build it under a new file name (`media/roni/epNN-b.jpg`, then `-c`) so no
cache shows the old image, push, merge the new URL into the pub row `media`, and send him the new image for approval again.
