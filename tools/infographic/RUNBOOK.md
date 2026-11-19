# Article infographics (dabullaw.co.il)

Approved by Yakir on 19.11.2026:
- Every article gets ONE infographic image that explains and shows the article, with the diagrams and labels it needs.
- LANDSCAPE ONLY, on desktop AND on phones. Never a portrait image and never a separate phone version ("חייב תמיד להיות לרוחב").
- Placement: toward the END of the article, right above the closing section (for example above "מה הצעד הבא שלכם?").
  If there is no such section: above the last summary heading (סיכום / לסיכום / בשורה התחתונה); if none, right above
  the questions-and-answers section at the end.
- Existing articles: 3 a week, no more (task `tools/infographic/TASK.md`), only articles that have NO infographic yet.
  An article that already has an HTML diagram or a small tool still gets an infographic (Yakir: "עדיין להוסיף").
- New articles: part of the normal procedure, every new article gets one before it is uploaded (docs artcfg/writer.infographicRule).
- Design: the approved sample is `examples/mutual-will.html`. Do not change colors, fonts, footer or sizes in `base.html`.

## 1. Content
- Read the whole article. Pick the ONE thing a reader should remember and the shape that shows it best:
  `flow` (steps, 2 to 4 cards with arrows), `cmp` (X vs Y, two columns), `nums` (2 to 4 key numbers), `chk`
  (checklist, 4 to 6 items). Add one `warn` line only when there is a real trap. See `base.html` for the classes.
- Few words, big text, so it can be read on a phone: header kicker up to ~45 characters, H1 up to ~32 characters,
  card titles 2 to 5 words, labels up to ~20 characters. No paragraphs inside the image.
- Every fact, number, section and date comes from the article itself AND was checked against its source
  (law text on Hebrew Wikisource via SQL, gov.il, kolzchut). If a number changes every year and you cannot verify
  the current value, leave it out. Never cite or copy another law firm.
- Hebrew only, no English words except the site address in the footer. No em dash or en dash.
  Israel Bar rules: no "הכי", never "מומחה", no promises, no prices of the office, no "חינם".
- Check that colons, question marks and numbers sit in the right place in the Hebrew (Yakir asked for this on 11.11.2026).

## 2. Render
```
cd <repo> && python3 tools/infographic/render.py /tmp/ig-<postid>.html media/infographics/<postid>
```
- The body file holds only `<div class="top">…</div><div class="mid">…</div>` (see examples).
- render.py fails if the card is taller than 760 px or anything overflows: shorten the text and render again.
- LOOK at the PNG yourself (Read the file). Also make a 360 px wide copy (PIL resize) and look at it: the card titles
  must still be readable at phone width. Fix until clean.
- Keep the .webp (usually 30 to 80 KB) and delete the .png before committing.

## 3. Upload
1. Commit and push `media/infographics/<postid>.webp`, wait for the Pages deploy (`gh run list -L 1`), check
   `https://dabullaw-glitch.github.io/dabul-office/media/infographics/<postid>.webp` returns 200 (net.http_get).
2. Upload to WordPress: `net.http_post` to `https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/wpmedia` with header
   `x-cron-secret` = (select v from app_secrets where k='CRON_SECRET'), body
   `{"items":[{"url":"<pages url>","filename":"infographic-<slug-ascii>-<postid>.webp","title":"<H1 text>","alt":"<alt>"}]}`.
   Read the WordPress URL from net._http_response. alt = one Hebrew sentence that says what the image shows.

## 4. Insert into the article (existing articles)
The figure (one line, inline styles only, the marker class `dbl-info` is how we know an article already has one):
```
<figure class="dbl-info" style="margin:32px 0;text-align:center"><a href="<wp url>" target="_blank" rel="noopener"><img src="<wp url>" alt="<alt>" width="1200" height="<h>" loading="lazy" decoding="async" style="width:100%;max-width:1200px;height:auto;border-radius:14px;border:1px solid #e4dfd3"></a><figcaption style="font-size:14px;color:#5b6478;margin-top:6px">לחצו על התמונה להגדלה</figcaption></figure>
```
- Find the exact opening tag of the closing section's heading in the RAW content
  (GET /wp-json/wp/v2/posts/<id>?context=edit, Basic auth from app_secrets WP_USER / WP_APP_PASSWORD), e.g.
  `<h2 ...>מה הצעד הבא שלכם?</h2>`, and use it as `find` (it must be unique).
- POST /wp-json/dabul/v1/textfix `{"find": <heading>, "replace": <figure> + <heading>, "ids": [<id>], "dry": true}` first;
  it must report n = 1 in post_content only. Then the same without dry (textfix keeps a backup).
- Never touch anything else in the article. If the article is built with Elementor (textfix reports an _elementor_data
  field), skip it, mark it `skipped-elementor` and take the next one.
- Verify: GET the live article with `?nc=<epoch>`: status 200, `dbl-info` appears once, the image URL answers 200.
  Cloudflare may show the old copy to visitors for up to about 2 hours; that is fine.

## 5. New articles
The writer puts the same figure into the article body, above the closing section, BEFORE the article is sent to Yakir
for approval, so the preview shows it. Steps 1 to 3 the same; the file name uses the artjob id instead of the post id.

## Already-done check
An article already has an infographic if its content has `dbl-info`, or an image whose file name, alt or caption says
אינפוגרפיקה / infographic. Old regular photos do not count.
