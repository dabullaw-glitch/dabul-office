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
- Lessons 16-19 (module 5), 25.11.2026: files m5-l16-question-bank.xlsx, m5-l17-article-writer.docx, m5-l18-faq-template.docx,
  m5-l19-image-spec.docx. Durations 40/50/30/40. Script: /home/claude/too-files/build_p5.py.
- Lessons 20-24 (module 6), 25.11.2026: files m6-l20-keywords.xlsx, m6-l21-link-map.xlsx, m6-l22-index-check.docx,
  m6-l23-monthly-report.xlsx, m6-l24-ai-mentions.xlsx. Durations 45/40/35/30/40. Script: /home/claude/too-files/build_p6.py.
- Lessons 25-28 (module 7), 25.11.2026: files m7-l25-content-calendar.xlsx, m7-l26-post-per-network.docx,
  m7-l27-publish-log.xlsx, m7-l28-google-business.docx. Durations 45/40/40/40. Script: /home/claude/too-files/build_p7.py.
- Lessons 29-31 (module 8), 25.11.2026: files m8-l29-avatar-voice-check.docx, m8-l30-script-bank.xlsx,
  m8-l31-edit-check.docx. Durations 45/40/40. Script: /home/claude/too-files/build_p8.py. Facts only from Yakir's own HeyGen,
  voice and editing decisions; every avatar video goes to him for approval before publishing.
- Lessons 32-37 (modules 9-10), 25.11.2026: files m9-l32-campaign-plan.xlsx, m9-l33-ad-landing-check.docx,
  m9-l34-campaign-results.xlsx, m10-l35-weekly-task.docx, m10-l36-weekly-report.xlsx, m10-l37-team-map.xlsx.
  Durations 40/45/35/40/35/45. Script: /home/claude/too-files/build_p9.py. ALL 37 COURSE LESSONS ARE NOW UPGRADED.
- Google sign-in on: provider enabled in Supabase (client "Team of One site login"), too_settings google_login=true, public=true.
- Live event placeholder: 3.12.2026 20:30 (too_events id 1). Yakir may change the day later.

- Members library items 38-50 ("ספריית החברים"), 25.11.2026: shorter standard. Every item: "מה תצאו איתו" box, existing
  body (fixed: three "הכי" in 38, 41, 46; 38 no longer promises "twice a week" updates, since the content task is paused),
  concrete additions (a true "מהשטח" from Yakir's own lessons where one fits, a worked "לפני ואחרי" example), "הצלחתם כש",
  signature line. Work files only where they add value: lib-40-meeting-summary.docx, lib-42-intake-form.docx,
  lib-43-email-tracker.xlsx (TODAY-based follow-up flags, recalculated, 0 errors), lib-45-procedure.docx, lib-46-quote.docx
  (bucket too, lessons/). Items 41, 47, 48, 49, 50 point to the matching course lesson file instead (26, 25, 3, 18, 2).
  Durations 38-50: 15/30/15/40/20/30/15/60/15/60/15/30/15. Script: /home/claude/too-files/build_lib.py.

## Lesson videos in Yakir's voice (PILOT, waiting for his approval; do not make more until he approves)
- Lesson 1 pilot, 25.11.2026: narration script (2,604 chars, about 3:17) written only from lesson 1 facts, voiced with the
  function `voice` (ElevenLabs professional clone) to files/too/videos/l01/narration.mp3. Credits used: 2,606 characters.
- Pipeline: tools/too-video (slides.html in the site's brand, render.py, job.py) + workflow too-video.yml (manual, input job)
  + function toovid (GitHub OIDC; reads the job from docs toovideo/<job>, gives a signed audio link and a signed upload
  link). The finished mp4 goes straight to the private bucket: files/too/videos/<job>/lesson.mp4. Nothing from the lesson is
  in the repo or the public run log. This workspace cannot reach Supabase storage directly, so the render runs in CI.
- Review link for Yakir: toovid ?sign=<job>&days=N with x-cron-secret. Approval doc: docs agents/too-video-pilot.
- After approval only: set too_lesson_content.video_url for the lesson (the player in src/lib/video.js must support a
  private signed link first; check before publishing), then the next lessons one by one.

## How files reach private storage (paid material never stays in this public repo)
1. Build the file locally. 2. Encrypt with AES-GCM (12-byte nonce + ciphertext), key = app_secrets.TOO_FILEKEY (hex; never print it).
3. Commit to tmp/too-enc/<ascii-name>.bin, push, note the commit sha.
4. SQL: net.http_post to functions/v1/tooput with x-cron-secret from app_secrets.CRON_SECRET and body
   {path:'lessons/<ascii-name>', src:'https://raw.githubusercontent.com/dabullaw-glitch/dabul-office/<sha>/tmp/too-enc/<name>.bin'}.
5. Check net._http_response = 200 ok, then git rm tmp/too-enc and push.
6. Lesson attachments: [{"title":"<Hebrew name> (וורד|אקסל)","path":"lessons/<ascii-name>"}].

## Next (in order)
- Members library items 38-50: same standard (shorter), file only where it adds real value.
- Four new paid courses: chapter outlines for Yakir's approval (site from Google, videos without camera, automations, affiliate marketing with AI).
- The automatic content task (trig_01Mc8EeZ9nQsnwTisL9wwgSQ) stays paused until Yakir says otherwise; when re-enabled, every item goes to him for approval first.
