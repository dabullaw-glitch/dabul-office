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
