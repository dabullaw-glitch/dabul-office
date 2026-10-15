# Style "cinematic-gold" (Yakir, 12.10.2026)

Yakir sent a screen recording of another lawyer's reels and asked for this style in our videos too ("שיהיה גם סטייל כזה").
It joins the rotation as one more look; it does not replace the other themes. Build it in build.py as a mode
(`"style": "cinematic"` in the plan, or picked by the theme rotation), not as a copy of anyone's content or branding.
Our own rules still hold: no music, graphics never on his face, Bar Association wording rules, the end card.

## What makes the look
1. **Palette:** near black and charcoal (#111214 to #2A2B2E), one warm gold accent (#C9A961 to #D4AF64), white text.
   No other colours. Thin gold lines (2-3 px), gold circles and outlines; fills are dark glass (rgba(20,20,22,.75)).
2. **Speaker shots:** medium shot, slightly desaturated, cooler and darker grade with a soft vignette (cinematic, not bright).
3. **Opening hook:** the question in huge bold white type (3 short lines, about 150-190 px) set beside his head,
   on the free side of the frame, revealed word by word with a soft blur-in. One word may be gold.
4. **Captions:** small and quiet, NOT the big karaoke captions: one short phrase at a time, white, about 52-60 px,
   one line, around 62-66% of the height (chest level), soft fade between phrases; the key word of a phrase in gold.
   (Our big gold karaoke captions stay for the other themes.)
5. **Full-screen explainer cutaways** (the heart of the style): every 6-10 seconds the picture cuts from him to a
   full-screen dark motion-graphic scene for 2-5 seconds while his voice continues, then back to him. Scenes:
   - **stepper:** 2-3 numbered gold circles joined by a line ("לצלם · לשמור · לתעד"), the active step fills gold;
   - **checklist cards:** dark rounded rows with a gold outline icon and a label, ticking one by one (✓ in gold);
   - **framing brackets:** gold corner marks closing in around a picture or a blurred photo of the subject (a crack, a document);
   - **gold line drawing:** a crack or path drawn in gold across the screen, with two labels on its sides ("אתם" / "הקבלן")
     and one big gold word under it ("מחלוקת");
   - **icon in a ring:** a thin gold circle drawing itself, an outline icon inside (shield, document, scale), a word under it;
   - **slider / timeline:** a gold line with ticks and a moving dot (before / after, stages);
   - **pills:** rounded gold-outline buttons popping in ("פנייה ✓", "תגובה ✓").
   Background of a cutaway: a darkened, blurred texture or a frame of his own footage (not stock video of strangers),
   grain 3-4%, vignette.
6. **Lower name tag:** small, just "עו״ד יקיר דבול" in white beside him, no box.
7. **Motion:** slow and smooth (0.5-0.8 s eases), blur dissolves between him and the cutaways, gold lines draw on
   (stroke-dashoffset), nothing bouncy, no fast whooshes. Sound effects very soft (a low tick when a step fills).
8. **Ending:** the CTA as a gold-outline pill with an arrow ("פנו אלינו ←") above a short checklist of what we check
   together, then the shield icon with "זכויותיכם", fading to black; then our usual end card (name, phone, site,
   "המידע כללי ואינו ייעוץ משפטי").

## How it maps onto build.py (to build on Friday 16.10 together with the picture-fix work on branch wip/video-friday)
- New beat kinds for the plan: `cut-steps`, `cut-checks`, `cut-frame`, `cut-line`, `cut-ring`, `cut-slider`, `cut-pills`
  (full screen, the video layer is hidden or blurred under them, audio continues), plus `hook-big` for the opening.
- A caption mode `quiet` (one phrase, small, gold key word) used only in this style.
- Grade preset `cinematic` (contrast 1.08, saturation 0.82, slight cool shadows, vignette .45).
- Theme entry `cinematic-gold` in themes.py so the rotation and themeHistory include it.
