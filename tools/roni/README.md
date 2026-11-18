# רוני הרוכש (Roni the buyer) - comic series

Approved by Yakir 18.11.2026. One 4-panel comic every two weeks, Monday 10:00 (Israel), Facebook + LinkedIn.
Comic only (the video version was rejected). No music, no image posts on Instagram (Instagram is reels only).
Every episode goes to Yakir for approval before it is scheduled. Never publish the same episode twice.

## Files
- `compose.py` - builds the 1080x1350 page (navy header, 2x2 panels in RTL order, speech bubbles, tip box, footer).
  Bubbles are placed by hand per episode: `(box x0,y0,x1,y1 in 1014px panel coords, text, tail point[, size])`.
  `ep01()` is the worked example. Run with python3 from anywhere (fonts are in `fonts/`).
- `ep01/` - the four panel images of episode 1.
- Public copies (GitHub Pages): `media/roni/ep01.jpg`, character references `media/roni/ref/roni-noa.jpg`
  (Roni and his partner Noa) and `media/roni/ref/lawyer.jpg` (the lawyer, drawn from Yakir's photo on the site:
  https://dabullaw.co.il/wp-content/uploads/2026/10/yakir-dabul-lawyer.webp).
  Public URL base: https://dabullaw-glitch.github.io/dabul-office/media/roni/

## Drawing a new episode
- HeyGen `create_image`, about 2 credits per image, 4 panels per episode. Always pass the two reference images so
  Roni, Noa and the lawyer look the same in every episode. Same style as episode 1: clean colorful comic, no text
  inside the drawing (all text is added by compose.py).
- Panel 4 is usually the lawyer explaining. The lawyer must look like the reference (Yakir).
- Check every panel by eye before composing. Hebrew in bubbles: short lines, punctuation in the right place.

## Rules for the text (Israel Bar advertising rules)
- No "הכי", never "מומחה", no promises, no prices, no testimonials, no other law firms.
- No em dash or en dash anywhere. Firm name: "יקיר דבול - משרד עורכי דין".
- Caption pattern (episode 1, approved):
  `רוני הרוכש | פרק N: <title> 😅` / two lines of the story / `מה היה צריך לעשות? ...` /
  `מכירים מישהו שקצת רוני? תייגו אותו 👇` / `המידע כללי ואינו ייעוץ משפטי.`

## State
docs coll `roni`, id `series` (read it first; change it only with `select docs_merge('roni','series', patch)`).
