# בלי חובות (sites/blihovot)

A separate information site about debt in Israel: insolvency (חדלות פירעון), enforcement (הוצאה לפועל), debt settlements,
self-employed debt, and healthy money habits. **It is not the law office site and must never be mixed with it**:
no links to dabullaw.co.il from content, no posting to the office's social accounts, no use of the office's WordPress,
snippets or Supabase collections other than `hublead` (this site's leads) and `hubreport` (this site's reports).
The owner's name appears only in `src/data/lawyers.json` (the paid lawyer list).

- Static site (Astro). `npm ci && npm run build` builds to `dist/` (pages, share images, search index).
- Every push to `main` that touches `sites/blihovot/**` runs `.github/workflows/blihovot.yml`, which publishes `dist/`
  to `bli-hovot/` (preview at https://dabullaw-glitch.github.io/dabul-office/bli-hovot/, hidden from search engines).
- Production (when the domain exists): `SITE_URL=https://<domain> BASE=/ PREVIEW=0 npm run build`, hosted on Cloudflare Pages.

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

## Videos

`node scripts/video.mjs videos/<id>.json` renders a silent vertical explainer (1080x1920, captions included) into
`public/video/` and registers it in `src/data/videos.json`. Attach it with `video: <id>` in a guide's frontmatter or
`"lesson": "<lesson id>"` in the video script. Keep each video 25 to 45 seconds, 5 to 7 scenes, one idea per scene.
