# מגזין הנדל״ן (weekly carousel)
Yakir asked 23.10.2026 for a weekly designed "magazine" carousel on his fields (real estate, tax, urban renewal, mortgages, inheritance):
10 slides 1080x1350: cover, 4 stories (opener + "מה קרה / מה זה אומר לכם" article), one merged data slide, closing.
Brand: navy #17253F, gold #C6A03C, Karantina 700 headlines, Heebo body, Frank Ruhl 900 masthead. No dashes in text, Bar ad rules.
Build: copy template/issue.html, replace the content, then `NODE_PATH=$(npm root -g) node render.js issue.html out`
(render.js uses the Playwright headless shell under /opt/pw-browsers).
issue-01: trial issue 17-23.10.2026 (not published).
