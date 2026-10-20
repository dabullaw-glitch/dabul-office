# Dropped pages, item ב: what was done on 20.10.2026

Approved by Yakir (item ב). Every post was backed up to Supabase `docs` coll `sitebak` before it was edited (INSERT only). Text edits went through `/dabul/v1/textfix`, one call at a time, after a dry run. The cache was purged twice (`/dabul/v1/copyfix {"items":[]}`), and the result was checked live through pg_net.

## 1. Merge: the 2026 kablan guide into "קניה מקבלן"

**Choosing the main page (GSC, 20.9 to 17.10, queries about buying from a kablan):**

| Page | Impressions | Position |
| --- | --- | --- |
| /קניה-מקבלן/ (3364) | 424 | 9.3 |
| /המדריך-המלא-לרכישת-דירה-מקבלן-2026/ (3292) | 135 | 38.5 |
| /קבלת-מפתח-דירה-מקבלן/ (3685) | 182 | 71.6 |

Main page: 3364.

**Content of 3364**
- Backups: `post-3364-before-kablan-merge-20261020` and `post-3292-before-kablan-merge-20261020`.
- Only `content` was sent. The title, the Yoast title and the Yoast description were not touched, because the title fork owns them.
- All of the original 3364 text was kept.
- The last paragraph used to link to the 2026 guide. It now says, in one sentence, that the full guide follows on the same page.
- Then an H2 "המדריך המלא לרכישת דירה מקבלן, שלב אחר שלב", followed by the full body of 3292 (163 sections). No text was removed.
- Links in the moved part:
  - 1 self link to /קניה-מקבלן/ was unwrapped: "קניית דירה על הנייר".
  - 6 links that repeated a URL already used on the page were unwrapped:
    - 4 to the home page
    - 1 to the late delivery page
    - 1 to the Netanya page
  - The words stay. Only the `<a>` was removed.
- Checks:
  - The text grew by 146 characters (bridge sentence plus H2).
  - The md5 built server side matched the local merge.
  - The page now has 16 links and no repeated anchor text.

**Redirects (Redirection plugin)**
- Backup: `redirection-kablan-before-merge-20261020`.
- New 301 (id 377): /המדריך-המלא-לרכישת-דירה-מקבלן-2026/ to /קניה-מקבלן/.
- Old redirects that pointed at the 2026 guide now point straight to /קניה-מקבלן/, so there are no chains:
  - 30
  - 60
  - 61 (/קניית-דירה-מוכנה-מקבלן/)
  - 87 (/post/המדריך-לרכישת-דירה-מקבלן-2025)

**Internal links to the old URL**
- Backups: `post-<id>-before-kablan-linkfix-20261020`.
- The URL was replaced with /קניה-מקבלן/ in these posts:
  - 3636 בדק בית
  - 3760 עורך דין נדל"ן (2 links)
  - 3909 עסקה בזמן מלחמה
  - 6821 עו"ד יקיר דבול
  - 2950 מדד תשומות
  - 2982 הלוואת קבלן
  - 3685 קבלת מפתח
  - 3715 עורך דין מקרקעין בנתניה (2)
- In two posts the link was unwrapped instead of replaced, because each already links to /קניה-מקבלן/ and must not link to it twice:
  - 962 מחיר עורך דין מקרקעין
  - 4894 קניית דירה מקבלן ללא עו"ד
- Not touched, because they are on the do-not-touch list. Their links still work through the 301:
  - 3540
  - 3011 (חישוב שטח דירה מקבלן)
- The decoded text "המדריך-המלא-לרכישת-דירה-מקבלן-2026" matched only image file names in 3292, 3364 and attachment 4595. It was deliberately not replaced, because replacing it would break images.

**Code snippets and menu**
- Backup: `snippets-65-66-70-and-menu-6803-7087-before-kablan-merge-20261020`.
- The URL was replaced in these snippets:
  - 65 (structured data)
  - 66 (llms.txt)
  - 70 (home page section)
- Menu items 6803 (menu 1028) and 7087 (menu 1033, the live menu) now point to post 3364. Their label is unchanged.
- Snippet 63 was not touched.
- Snippet 24 / footer 622 was not touched. The footer already links to /קניה-מקבלן/, so pointing the second footer link there would duplicate it. This is an open question for Yakir, listed in the approval file.
- Post 3292 stays published in WordPress, served by the 301. Nothing was deleted.
- Follow-up: 3292 is probably still in the Yoast sitemap. Setting noindex or draft is optional and was not done.

## 2. Reciprocal links between competing pages

Backups: `post-<id>-before-pair-links-20261020`. Each change is one sentence, placed before an existing heading. Every anchor is different, and no page links to the same URL twice.

| Pair | Added |
| --- | --- |
| בדיקת רישום (2953) ↔ טאבו ורישום זכויות (6816) | 2953 → 6816 "מדריך הכללי על הטאבו והזכויות במקרקעין". 6816 → 2953 already existed ("בדיקת רישום דירה בטאבו"). The generic words "רישום בטאבו" were not used. |
| קבלת מפתח (3685) ↔ קניה מקבלן (3364) | 3364 → 3685 "מה לבדוק כשמקבלים מפתח מהקבלן". 3685 → 3364 exists through the URL update ("המדריך המלא לרכישת דירה מקבלן"). |
| הערת אזהרה (2988) ↔ ביטול הערת אזהרה (6630) | 2988 → 6630 "מדריך למחיקת הערת אזהרה מהטאבו". 6630 → 2988 "מה זו הערת אזהרה ומתי רושמים אותה". |
| סכסוכי שכנים (3651) ↔ 6536, 6534, 6544, 6547 | 3651 gets one sentence with 4 links: "מטרד רעש, ריח או עשן מדירה סמוכה", "שכן שבנה על הרכוש המשותף", "דייר שמסרב לשלם ועד בית", "פלישה של שכן לשטח שלכם". Links back: 6536 "ליווי משפטי בסכסוכי שכנים", 6534 "עורך דין סכסוכי שכנים", 6544 "איך מטפלים בסכסוך עם שכנים", 6547 "המדריך לסכסוכי שכנים". |
| מכירת דירה בירושה (4868) ↔ 5313, 6151, 2681, 7590 | 4868 gets one sentence with 4 links: "דירת ירושה בפרויקט פינוי בינוי", "מס שבח על דירה שירשתם", "תשובות לשאלות נפוצות של יורשים", "מה בודק מי שקונה דירה מיורשים". Links back: 5313 "למכירת דירה שקיבלתם בירושה", 2681 "מדריך מכירת דירה שהתקבלה בירושה". 6151 and 7590 already linked to 4868. |
| בטחונות לשכירות (2947) ↔ כתב ערבות (6935) | Both directions already existed. The 2947 anchor was moved from the misleading "תלושי שכר ותעודות זהות של הערבים" to "כתב ערבות לשכירות בנוסח מסודר". The original words were kept. |

## 3. For approval (not applied)

`dropped-fixes-for-approval.md` holds the new titles, descriptions and content additions for the 10 pages, plus the footer question.

## Live verification (pg_net, after purge)

- The old URL and /קניית-דירה-מוכנה-מקבלן/ redirect to /%D7%A7%D7%A0%D7%99%D7%94-%D7%9E%D7%A7%D7%91%D7%9C%D7%9F/.
- /קניה-מקבלן/ returns 200. It contains the new H2 and 1 link to קבלת מפתח.
- Each of the 15 checked pages returns 200 and contains its new anchor.
- The home page returns 200 with no fatal error and has schema. llms.txt has 0 links to the old URL.
- Only 1 link to the old URL is left on any page: the footer (see above).

---

# Round 2 (20.10.2026): approved titles, descriptions and content additions applied

Yakir approved dropped-fixes-for-approval.md for items 1 to 7, 9 and 10.

## Backups (Supabase docs, coll sitebak, INSERT only)

- `post-<id>-before-dropped-upgrades-20261020` for 2953, 3685, 3611, 2988, 4658, 4868, 2603, 2947 and 3651.
  - Each one holds the full edit context: content.raw, all registered meta (Yoast, _elementor_data) and acf.
- The same backup kind for the linked pages 3629, 4881, 6127, 5347, 7322 and 7501. None of them was edited (see below).
- `seometa-dropped-9-pages-before-20261020` holds the old Yoast titles and descriptions, taken from the seometa dry run. seometa also keeps its own `_dabul_seobak`.
- Right before writing, every post was read again. The md5 of each post was identical to the snapshot, so nothing had changed in between.
- Each write was guarded: every anchor had to appear exactly once, and the md5 of the result had to match the version built locally. Otherwise nothing was posted.

## Titles and descriptions

All 9 were set through `/dabul/v1/seometa`, exactly as written in the approval file. A dry run came first, and all paths resolved. Live `<title>` and meta description match on all 9 pages.

## Content added (inserted only, no existing text removed or changed)

**2953, בדיקת רישום בטאבו**
- A "בקצרה" paragraph under the opening paragraph.
- H2 "איך בודקים רישום דירה בטאבו: 5 שלבים".
- H3 with a table "מה עושים כשמוצאים בעיה בנסח" (4 rows).
- H2 "שאלות נפוצות על בדיקת רישום בטאבו" with 3 questions.

**3685, קבלת מפתח**
- H2 "רשימת בדיקה ליום המסירה" (9 points).
- H3 "מה רושמים בפרוטוקול ומה לא חותמים".
- H2 "מתי אפשר לסרב לקבל את המפתח".
- H2 "אחרי המסירה: איך מודיעים לקבלן על ליקוי" (5 steps).

**3611, פירוק שיתוף**
- H2 "שותף גר בדירה המשותפת: מה אפשר לדרוש?".
- FAQ items 6 and 7, also added to the page's own FAQPage schema.
- The rest of the approved list was already on the page (updated 15.10), so it was not duplicated: עיקרי הדברים, שלבים, כמה זמן, כמה עולה, ירושה, בני זוג.

**2988, הערת אזהרה**
- H2 "איך רושמים הערת אזהרה בפועל?" with a בקצרה box and 5 steps.
- H2 "מצאתם הערת אזהרה בנסח: מה זה אומר?" (4 types).

**4658, איחור במסירה**
- H3 "קיבלתם מכתב "כוח עליון" מהקבלן? מה עושים" (5 steps), under the existing force majeure section.
- H2 "שאלות נפוצות על איחור במסירה" with 3 questions.
- The calculator box was already at the top of the page, so it was not added again, because that would be the same link twice.
- The worked example was NOT published. The draft is in late-delivery-calc-example-for-approval.md.

**4868, מכירת דירת ירושה**
- A "בקצרה" paragraph under the opening paragraph.
- H3 "מה עושים כשאחד היורשים מסרב למכור" (4 steps, plus a link to the sibling-refuses video page).
- H2 "שאלות נפוצות על מכירת דירת ירושה" with 3 questions.
- "אפשר למכור לפני רישום" already exists on the page as the "טיפ זהב" box.

**2603, הדייר הסרבן**
- H2 "הצד של הדייר: מה מותר לבקש לפני שחותמים", with a link to /developer-guarantees-tenant-urban-renewal/.
- "מתי נחשב סרבן", "איך מתנהל ההליך" and the elderly section already existed.

**2947, בטחונות לשכירות**
- A "בקצרה" list at the top, in place of a second table, because the page already has the same comparison table lower down.
- A numbers example for the legal cap (6,000 ₪: 18,000 for a 12 month lease, 12,000 for a 6 month lease).
- H2 "איך מממשים ערבות בנקאית או שטר חוב".

**3651, סכסוכי שכנים**
- H2 "לאן פונים? תשובה קצרה לפי סוג הסכסוך" with a 3 row table.
- H2 "מה כדאי לנסות קודם, ומה משפיע על העלות?".
- FAQ items 6 to 8, also added to the page's FAQPage schema.

## FAQ schema

- 3611 and 3651 have an in-content FAQPage, so the new questions were added to it. The JSON was checked as valid.
- 2953, 3685, 4658, 4868, 2603 and 2947 output FAQPage from ACF (snippet 5, up to 5 questions). All 5 slots are already used on each of them. So the new visible questions on 2953, 4658 and 4868 have no schema, and no second block was added.
- Already like this before today: 2988 and 3651 each have two FAQPage blocks (ACF plus in-content).

## Links that were already in place, so nothing was added

| Link | Already linked from |
| --- | --- |
| Into 3611 | 3629 (פירוק בהסכמה) and 4881 (בני זוג) |
| Into 2603 | 6127 (רוב מיוחס) and 5347 (גיל שלישי) |
| Back to 4658 | The calculator page 7322 |

## Footer (not changed)

The footer link to the old guide is in snippet 24. Its anchor text is "קניית דירה מוכנה מקבלן", not "רכישת דירה מקבלן".

The same footer column already has "איחור במסירת דירה מקבלן" → /איחור-במסירת-דירה-מקבלן/, right before it.

Repointing it as instructed would put the same link twice next to each other. It was left as it is (it still works through the 301) and is waiting for a decision.

## Cache, indexing and verification

- Cache: copyfix purge done.
- IndexNow: 10 URLs sent (the 9 pages plus /קניה-מקבלן/), response 200.
- Live check on all 9 pages:
  - status 200;
  - new title and description;
  - new sections present;
  - a sample of the original text still present.

## Deferred, for later

- 2988 / 6630: shortening general paragraphs on the cancellation page.
- 3685: moving out general "buying from a contractor" text.
- 6935: a bigger download button and a "what to fill in each field" line.
- 4658: the worked calculation example, waiting for Yakir to approve the numbers.
- 4658: the "before and after" table has inconsistent rows for old contracts.
- Merging the ACF FAQ and the new visible FAQ sections on 2953, 4658 and 4868 into one place.
