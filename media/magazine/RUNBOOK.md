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
2. Copy `template/issue.html` to `template/issue-NN.html` (it must sit in the template folder so fonts/ and img/
   resolve), edit the texts, render:
   `cd media/magazine/template && NODE_PATH=$(npm root -g) node render.js issue-NN.html ../issue-NN/out`
   (render.js uses /opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell). Look at every slide
   (no text overflow, footer visible, nothing cut). Fix and re-render until clean.
3. Make: `issue-NN/slides/01.jpg..10.jpg` (quality 93), `web/real-estate-magazine-NN.pdf` (Pillow, title/author metadata),
   `web/real-estate-magazine-NN-cover.jpg` (800x1000).
4. Add the issue at the TOP of `issues.json` (same fields as issue 1: dates, date, updated, title, blurb, heads, intro,
   slug "issue-N", page "https://dabullaw.co.il/magazine/issue-N/", seoTitle (max ~65 chars, ends "| עו״ד יקיר דבול"),
   seoDesc (max ~155 chars), stories [{h, what, means, sources [[name, url]], body: 3 paragraphs}], faq [[q, a]] x3).
   EVERY ISSUE HAS ITS OWN PAGE (Yakir, 23.10.2026, for Google): body = 3 paragraphs per story, about 600 to 900 words
   in the whole page, simple Hebrew, facts only from the opened sources.
   LINKS (Yakir, 23.10.2026): NEVER a link to an outside site on the pages. The source is shown by NAME only (the page
   builder prints "מקור: <name>" from sources). Internal links go inside the text as [anchor](https://dabullaw.co.il/...):
   at most 6 in the page, each to a real published page of the site (check it in docs siteindex or WP REST), varied anchors.
   No "להרחבה" lines. pdf/cover = the WordPress URLs (https://dabullaw.co.il/wp-content/uploads/YYYY/MM/<file>);
   fill them after step 6.
5. git add/commit/push (repo dabullaw-glitch/dabul-office). Wait for the Pages deploy (`gh run list -L 1`).
6. Upload the PDF and cover to WordPress: POST https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/wpmedia with
   header x-cron-secret = (select v from app_secrets where k='CRON_SECRET') via net.http_post in SQL, body
   {items:[{url:<github pages url>, filename, title, alt}]}. Read the WordPress URLs from net._http_response.
7. Update issues.json with those URLs, then build BOTH pages:
   `python3 build_page.py issues.json > web/page.html` (the main page; its archive links to the issue pages) and
   `python3 build_page.py issues.json --issue N > web/issue-N.html`. Render both at 390px and 1280px and look at them.
   Write `web/page-body-NN.json` = {"content": "<!-- wp:html -->\n" + page.html + "\n<!-- /wp:html -->"} and
   `web/issue-N-body.json` = {"title": "מגזין הנדל״ן גיליון N", "slug": "issue-N", "status": "publish", "parent": 7776,
   "template": "elementor_header_footer", "content": "<!-- wp:html -->\n" + issue-N.html + "\n<!-- /wp:html -->"}.
   Commit, push, wait deploy. Do NOT post them to WordPress: the magazine function does it on Friday after approval.
8. Insert the issue (SQL INSERT into docs, coll 'magazine', id 'issue-NNN' zero-padded):
   {no, dates, title, pdf, cover, slides: [github pages URLs of slides/01.jpg..10.jpg], waText, social,
    pageBody: github pages URL of web/page-body-NN.json, issueBody: github pages URL of web/issue-N-body.json,
    seoTitle, seoDesc, waAt: '<Thursday>T10:00', siteAt: '<Friday>T10:00',
    token: md5(random()::text), state: 'draft', sent: {}}
   waText = the approved WhatsApp format: "*מגזין הנדל״ן | גיליון #N*", "החדשות של השבוע, ומה הן אומרות לכם 👇",
   5 lines "🔹 *topic:* one or two sentences", "📎 המגזין המלא בקובץ המצורף.", "כל הגיליונות: https://dabullaw.co.il/magazine/",
   "_המידע כללי ואינו ייעוץ משפטי._" (WhatsApp bold = *x*, italic = _x_). social = similar text for the networks.
9. Ask for approval: net.http_post to .../functions/v1/magazine body {action:'request', id:'issue-NNN'} with the
   x-cron-secret header. Yakir gets the cover + text + "✅ מאשר" button in Telegram. Cron "office-magazine" (every 10 min)
   does the rest after approval.
10. Update the site's own articles from the news (Yakir approved 23.10.2026): for each story that changes a fact in an
   existing article of the site (a rate, a tax step, a deadline, a new rule), INSERT one upq note item:
   id 'up-magN-<targetId>', {targetId, title, link, prio 1 or 2, status 'queued', source 'magazine', created, topQueries [],
   reason: what changed, the exact new fact with its date, "להוסיף קישור לעמוד הגיליון <page>", and the source URL for
   checking only (never linked on the site)}. Skip a target that already has a queued upq item from 'magazine'.
   The existing-pages task sends each update to Yakir for approval, as always. At most 2 a week.
