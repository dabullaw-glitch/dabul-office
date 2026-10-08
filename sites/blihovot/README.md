# בלי חובות (sites/blihovot)

A separate information site about debt in Israel: insolvency (חדלות פירעון), enforcement (הוצאה לפועל), debt settlements,
self-employed debt, and healthy money habits. **It is not the law office site and must never be mixed with it**:
no links to dabullaw.co.il from content, no posting to the office's social accounts, no use of the office's WordPress,
snippets or Supabase collections other than `hublead` (this site's leads) and `hubreport` (this site's reports).
The owner's name appears only in `src/data/lawyers.json` (the paid lawyer list).

- Static site (Astro). `npm ci && npm run build` builds to `dist/` (pages, share images, search index).
- Every push to `main` that touches `sites/blihovot/**` runs `.github/workflows/blihovot.yml`, which publishes `dist/`
  to `bli-hovot/` (preview at https://dabullaw-glitch.github.io/dabul-office/bli-hovot/, hidden from search engines).
- Production domain: **blihovot.co.il** (chosen 8.10.2026, to be bought by Yakir). Build: `SITE_URL=https://blihovot.co.il BASE=/ PREVIEW=0 npm run build`, hosted on Cloudflare Pages.

## Writing rules (for every guide, lesson and video)

1. Hebrew, plain language, short paragraphs. Answer first (the `summary` lines are what AI assistants quote).
2. **No em dash or en dash characters** anywhere. Use a colon, a comma, or a regular hyphen.
3. Facts only from official or reliable sources (kolzchut.org.il, gov.il, the insolvency and enforcement authorities,
   Bank of Israel, laws). Every guide lists its `sources`. If a fact cannot be verified, write it generally, never invent
   numbers. Numbers that repeat across the site live in `src/data/site.ts` (FACTS).
4. No promises ("מחיקת חובות מובטחת"), no superlatives, no prices of legal services. Always end with the general-information note
   (the layout adds it) and, where relevant, suggest checking the specific case with a professional.
5. Frontmatter must match `src/content.config.ts`. `description` 140 to 160 characters, `seoTitle` up to about 60.
6. Internal links: relative links like `../other-slug/` (guide to guide) or `../../kli/<tool>/` (guide to tool).
   Key terms link automatically through `src/data/terms.json`; add the new guide's main terms there.
7. After adding a guide, add its slug to `related` of 1 or 2 close existing guides.
8. New topics come from `src/data/backlog.json` (remove the item once published).
9. **Length (SEO and GEO): every guide, article, explainer and checklist is at least 1,000 words of body text.**
   Guides aim for 1,200 to 2,500 (never under 1,000), articles 1,000 to 2,000, explainers and checklists 1,000 to 1,500. A hub's main "super guide"
   (`pillar: true` in the frontmatter) is 2,500 words or more. Check with `node scripts/words.mjs <slug>` (it exits with an
   error when an item is too short). Length comes from real value, never filler: a direct answer in the first paragraph,
   H2 headings phrased as the questions people search, a table, numbered steps, a worked example with made-up numbers
   (say so), common mistakes, a "what to do this week" checklist, 4 to 6 FAQ items, and 5 to 10 internal links.

## Numbers, monthly check and "מה השתנה" (ma-hishtana/)

- `src/data/numbers.json`: every important number the site quotes (amounts, thresholds, deadlines), each with its official
  source and the date it was last checked. Shown on `ma-hishtana/` and in `llms.txt`. `FACTS` in `src/data/site.ts` holds
  the numbers the calculators use; keep both in sync.
- `src/data/updates.json`: the monthly log (kinds: `law`, `numbers`, `check`, `site`). Only verified, sourced changes.
- A scheduled task checks all numbers on the 1st of every month, updates them everywhere (numbers.json, FACTS, guides,
  src/lib/bakashot.ts), and adds the month's entry, even when nothing changed ("בדקנו, לא נמצאו שינויים").

## Sharing and embedding

- Every guide and tool has a share box (`ShareBar.astro`: WhatsApp, the phone's share sheet, copy link).
- Checklists in guides (`- [ ]` lists) get a "save as picture" button (`ChecklistImage.astro`, drawn in the browser).
- Calculators listed in `EMBEDDABLE` (`src/data/tools.ts`) can be embedded by other sites: `kli/<id>/?embed=1` shows only the
  tool and a credit line; the code is on `hatmaa/`; `public/embed.js` adjusts the iframe height.
  A new calculator: add its id to `EMBEDDABLE` and a height in `hatmaa.astro`.

## Videos

`node scripts/video.mjs videos/<id>.json` renders a silent vertical explainer (1080x1920, captions included) into
`public/video/` and registers it in `src/data/videos.json`. Attach it with `video: <id>` in a guide's frontmatter or
`"lesson": "<lesson id>"` in the video script. Keep each video 25 to 45 seconds, 5 to 7 scenes, one idea per scene.

## Content types (rotate them, not only guides)

- `kind: guide` (default): a full how-to guide.
- `kind: article`: an article with an angle (common mistakes, myths and facts, a real-life scenario walk-through, a comparison).
- `kind: explainer`: a focused explanation of one term or one rule (1,000 to 1,500 words).
- `kind: checklist`: a practical checklist or template (documents to prepare, a letter to a creditor, questions to ask a bank).
- **Calculators and tools**: a page in `src/pages/kli/<id>.astro` using `src/layouts/Tool.astro` (see the existing tools),
  vanilla JavaScript only, all math in the browser, no data sent anywhere; register it in `src/data/tools.ts`, link it from
  1 or 2 related guides (`tool: <id>` in their frontmatter) and add it to the glossary/terms if it has a name people search.
  Every rule a calculator uses must come from an official source listed on its page.
