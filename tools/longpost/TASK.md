# Scheduled task "פוסט הסבר ארוך כל שבועיים" (every Thursday 11:37 Israel time)

Yakir asked on 18.11.2026: from time to time, a long explanation post like the one he sent (a private house, unused
building rights and capital gains tax) on Facebook, LinkedIn and X. He chose: once every two weeks, in addition to the
regular posts. Fresh session, no memory. You only prepare and ask; nothing goes out without Yakir's approval.

## Hard rules
- Supabase project mgjmnvpnovkewvqevjmz (execute_sql). Table docs(coll,id,data). Write ONLY with INSERT or
  `select docs_merge(coll,id,patch::jsonb)`. Never UPDATE or DELETE. Never print secrets.
- Hebrew only, simple words, no English words, never em dash or en dash. Israel Bar rules: no "הכי", never "מומחה", no
  promises, no prices, no "חינם", no testimonials, no client details. Real estate only, never insolvency.
- Write in Yakir's own words. Never copy, rephrase or rely on another law firm's page or post, and never cite one.
  If Yakir sent a sample text, use only its topic.
- Every legal rule, amount, percentage and deadline: verified this run in a neutral or official source you actually
  opened (Hebrew Wikisource law text, gov.il, the Tax Authority, kolzchut, court and appeals committee rulings, Bank of
  Israel). If a number cannot be verified, write the rule without the number. An example with numbers is always marked
  "דוגמה מומחשת בלבד".
- Unattended run: never WebFetch a URL written from memory; WebSearch first, WebFetch only URLs from its results. If a
  page is blocked, open it through SQL: `select r.status, r.content from extensions.http(('GET','<url>',ARRAY[extensions.http_header('User-Agent','Mozilla/5.0')],null,null)::extensions.http_request) r`.

## Steps
1. Read the newest docs pub rows with data.series = 'longpost'. The next slot = the newest slot + 14 days, Wednesday
   12:30 (`at` 'YYYY-MM-DDT12:30', Israel time). If the next slot is more than 7 days away, finish with no message.
   If a row for that slot already exists, go to step 5.
2. Topic: one real estate question many people get wrong, with a real money or legal risk (tax, buying, selling,
   inheritance of property, urban renewal, rentals, contractors). Never a topic already used: check every longpost row,
   docs pub of the last 120 days (titles), and docs artq / site titles so it does not repeat a post that went out lately.
   Prefer a topic that has an article on dabullaw.co.il to link to (WP search
   https://dabullaw.co.il/wp-json/wp/v2/search?search=<term>&per_page=10, link only a URL that answers 200).
3. Write it in the shape of pub-longpost-01 (read it as the model): an opening line that stops the scroll, the short
   answer, then sections that start with "👈 " (no asterisks: Facebook shows them as they are): how it works, an
   illustrated example, what you can do (2 to 4 numbered points), a common confusion or mistake, the bottom line, then
   "📞 09-8613413 | עו״ד יקיר דבול, רזיאל 1 נתניה", "המידע כללי ואינו ייעוץ משפטי. כל עסקה נבחנת לפי הנסיבות שלה.", and
   4 to 5 Hebrew hashtags. 1,200 to 2,000 characters. textX: at most 250 characters, one clear point, the article link (or
   dabullaw.co.il) on its own last line.
4. INSERT docs ('pub','pub-longpost-NN', {at, kind:'text', owner:'office', status:'draft', series:'longpost', title:'פוסט הסבר: <topic>',
   text, textX, link:<article URL or ''>, media:[], channels:['facebook','linkedin','x'], sources:[urls you checked],
   note:'פוסט הסבר ארוך כל שבועיים. ממתין לאישור של יקיר.', created:now()}). NN continues the numbering.
5. Telegram to Yakir (sendMessage, net.http_post to 'https://api.telegram.org/bot'||(select v from app_secrets where k='TELEGRAM_BOT_TOKEN')||'/sendMessage',
   chat_id (select v from app_secrets where k='TELEGRAM_CHAT_ID'), disable_web_page_preview true): "📝 פוסט ההסבר של
   יום רביעי D.M (פייסבוק, לינקדאין ו-X) מחכה לאישור שלך:" then the full text, then "לאישור כתוב לי: מאשר פוסט הסבר D.M.
   לתיקון כתוב מה לשנות." Send it only once per row (merge sentAt); on the run 1 or 2 days before the slot, if still
   'draft', send one short reminder (merge remindedAt). If the slot passed and the row is still 'draft': merge
   {status:'skipped', skipNote:'לא אושר בזמן'} and tell Yakir in one line; the next slot stays 14 days after it.
6. Log: docs_merge('agents','longpost-'||current_date, {row, action, ok}). Finish with one short Hebrew line.

## When Yakir approves (in any chat)
`select docs_merge('pub','pub-longpost-NN','{"status":"planned","approvedAt":"<date>"}')`. The office publishers post it
at its time (Postoria: Facebook and LinkedIn; bufauth: X with textX). For a fix, change text / textX and send it again.
