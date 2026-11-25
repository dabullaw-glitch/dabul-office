# Team of One: content upgrade runbook (approved by Yakir 25.11.2026: "מאשר הכל")

Goal: every course lesson and every members-library item meets the new standard, approved in the doc
https://claude.ai/artifact/TzTzfdgKdxnATQ4XR4KTux (Claude Docs project da93a2c6-98b3-42d6-99c3-857ce55118a7).

## The standard (each lesson)
1. "> **מה תצאו איתו:** ... **זמן:** ..." box at the top.
2. Existing body kept (light edits only; no "הכי", never "מומחה", no promises).
3. "## מהשטח: איך זה עובד אצלי" - a TRUE example from Yakir's own office system (only facts he stated; no client details).
4. "## לפני ואחרי" - a real worked example (instruction actually run, or a real correction).
5. "## קובץ עבודה" - one downloadable file per lesson (docx/xlsx), house style: black #0B0B0C header, cream, lime accents; footer line "נכתב, נבדק ואושר על ידי עו״ד יקיר דבול. לשימוש אישי של חברי הקהילה."; xlsx: RTL sheet, yellow input cells, formulas, recalculated with no errors.
6. "**הצלחתם כש:** ..." clear success criterion.
7. "## בדיקה עצמית" - 3 short questions.
8. Last line: "---\n*נכתב, נבדק ואושר על ידי עו״ד יקיר דבול.*"
Every number / date / tool price is checked against an official source the same day.

## Done
- Lessons 1-8 (modules 1-2): body_md upgraded (pre + existing + post), attachments set, duration_min set.
- Files in private bucket `too`: lessons/m1-l1-task-map.xlsx, m1-l2-privacy-rules.docx, m1-l3-fact-check.docx,
  m1-l4-instruction-template.docx, m2-leads-table.xlsx, m2-l6-secretary-test.xlsx, m2-l7-approval-card.docx.
- Lessons 9-15 (modules 3-4), 25.11.2026: same standard. Files: m3-l9-template-library.docx, m3-l10-time-log.xlsx,
  m3-l11-send-checklist.docx, m4-l12-homepage-brief.docx, m4-l13-domain-card.docx, m4-l14-weekly-numbers.xlsx,
  m4-l15-form-pay-access.docx. Durations 40/35/25/60/40/35/45. Lesson 13 DNS line corrected (usually hours, up to 48h).
  Build scripts (local, not in repo): /home/claude/too-files/build_p3.py, build_p4.py; texts in too-files/md/.
- Google sign-in on: provider enabled in Supabase (client "Team of One site login"), too_settings google_login=true, public=true.
- Live event placeholder: 3.12.2026 20:30 (too_events id 1). Yakir may change the day later.

## How files reach private storage (paid material never stays in this public repo)
1. Build the file locally. 2. Encrypt with AES-GCM (12-byte nonce + ciphertext), key = app_secrets.TOO_FILEKEY (hex; never print it).
3. Commit to tmp/too-enc/<ascii-name>.bin, push, note the commit sha.
4. SQL: net.http_post to functions/v1/tooput with x-cron-secret from app_secrets.CRON_SECRET and body
   {path:'lessons/<ascii-name>', src:'https://raw.githubusercontent.com/dabullaw-glitch/dabul-office/<sha>/tmp/too-enc/<name>.bin'}.
5. Check net._http_response = 200 ok, then git rm tmp/too-enc and push.
6. Lesson attachments: [{"title":"<Hebrew name> (וורד|אקסל)","path":"lessons/<ascii-name>"}].

## Next (in order)
- Modules 5-10 (lessons 16-37), same standard, module by module.
- Members library items 38-50: same standard (shorter), file only where it adds real value.
- Four new paid courses: chapter outlines for Yakir's approval (site from Google, videos without camera, automations, affiliate marketing with AI).
- The automatic content task (trig_01Mc8EeZ9nQsnwTisL9wwgSQ) stays paused until Yakir says otherwise; when re-enabled, every item goes to him for approval first.
