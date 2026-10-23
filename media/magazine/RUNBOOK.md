# מגזין הנדל״ן: the weekly run (every Wednesday)

Yakir approved (23.10.2026) a weekly 10-slide carousel magazine about real estate law, tax, urban renewal and mortgages.
Wednesday: build the issue and ask Yakir to approve. Thursday 10:00: one WhatsApp message to the office group
(the PDF + main points + link). Friday 10:00: carousel on Facebook, Instagram, LinkedIn + the site page
https://dabullaw.co.il/magazine/ (page id 7776). NOTHING goes out without Yakir's approval tap in Telegram.

## Hard rules (Yakir)
- Hebrew only. No em dash and no en dash anywhere (a regular hyphen in dates/numbers is fine). Simple Hebrew.
- Israel Bar advertising rules: no "הכי", no "מומחה", no promises, no prices for services, no "חינם".
- Every fact from a page you actually opened this week; each story names its source (outlet + date) and the PDF/page link it.
- Do NOT write "עורך דין מקרקעין, נתניה" on the slides (removed 23.10.2026). The cover byline is just "עו״ד יקיר דבול".
- Keep the approved design: copy `template/issue.html` (navy #17253F, gold #C6A03C, Karantina headlines, Heebo body).
  Same 10-slide structure: 01 cover, 02 story-1 article, 03/04 story 2 opener+article, 05/06 story 3, 07/08 story 4,
  09 story 5 data slide (chart), 10 closing. Change only the texts, numbers, dates, issue number and sources.

## Steps
1. Research the week's (Thu to Wed) real estate news in Israel: tax, interest/mortgages, contractors/new apartments,
   urban renewal, land registry, rulings, Netanya and the Sharon. Pick 5 stories that are new and useful to the public.
   Open each source page (WebFetch) and take numbers only from there.
2. Build `issue-NN/issue.html` from the template (fonts/img paths relative to template), render:
   `cd media/magazine/template && NODE_PATH=$(npm root -g) node render.js ../issue-NN/issue.html ../issue-NN/out`
   (render.js uses /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell). Look at every slide
   (no text overflow, footer visible, nothing cut). Fix and re-render until clean.
3. Make: `issue-NN/slides/01.jpg..10.jpg` (quality 93), `web/real-estate-magazine-NN.pdf` (Pillow, title/author metadata),
   `web/real-estate-magazine-NN-cover.jpg` (800x1000).
4. Add the issue at the TOP of `issues.json` (same fields as issue 1: dates, date, updated, title, blurb, heads, stories
   with sources and an internal "more" link to a relevant dabullaw.co.il article). pdf/cover = the WordPress URLs
   (https://dabullaw.co.il/wp-content/uploads/YYYY/MM/<file>); fill them after step 6.
5. git add/commit/push (repo dabullaw-glitch/dabul-office). Wait for the Pages deploy (`gh run list -L 1`).
6. Upload the PDF and cover to WordPress: POST https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/wpmedia with
   header x-cron-secret = (select v from app_secrets where k='CRON_SECRET') via net.http_post in SQL, body
   {items:[{url:<github pages url>, filename, title, alt}]}. Read the WordPress URLs from net._http_response.
7. Update issues.json with those URLs, `python3 build_page.py issues.json > web/page.html`, write
   `web/page-body-NN.json` = {"content": "<!-- wp:html -->\n" + html + "\n<!-- /wp:html -->"}, commit, push, wait deploy.
8. Insert the issue (SQL INSERT into docs, coll 'magazine', id 'issue-NNN' zero-padded):
   {no, dates, title, pdf, cover, slides: [github pages URLs of slides/01.jpg..10.jpg], waText, social,
    pageBody: github pages URL of web/page-body-NN.json, waAt: '<Thursday>T10:00', siteAt: '<Friday>T10:00',
    token: md5(random()::text), state: 'draft', sent: {}}
   waText = the approved WhatsApp format: "*מגזין הנדל״ן | גיליון #N*", "החדשות של השבוע, ומה הן אומרות לכם 👇",
   5 lines "🔹 *topic:* one or two sentences", "📎 המגזין המלא בקובץ המצורף.", "כל הגיליונות: https://dabullaw.co.il/magazine/",
   "_המידע כללי ואינו ייעוץ משפטי._" (WhatsApp bold = *x*, italic = _x_). social = similar text for the networks.
9. Ask for approval: net.http_post to .../functions/v1/magazine body {action:'request', id:'issue-NNN'} with the
   x-cron-secret header. Yakir gets the cover + text + "✅ מאשר" button in Telegram. Cron "office-magazine" (every 10 min)
   does the rest after approval.
