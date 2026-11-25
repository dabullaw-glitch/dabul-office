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

- Four new courses (outlines from the plan doc https://claude.ai/artifact/Vwnp5Xzpsx6QDK9FqbH7PS, section "ראשי פרקים
  לאישורך"; Yakir told Claude to do all the launch-plan work, and on 25.11.2026 "תטפל בזה"), written 25.11.2026 at the
  full lesson standard. Stored as UNPUBLISHED modules (published=false, lessons published=false), so members do not see them:
  module 11 "קורס: אתר שמביא פניות מגוגל" (6 lessons, 265 min), 12 "קורס: סרטונים בלי מצלמה" (5, 190),
  13 "קורס: אוטומציות לעסק" (5, 230), 14 "קורס: שיווק שותפים עם בינה מלאכותית" (5, 230). 20 new files in bucket too,
  lessons/c<course>-l<lesson>-*.docx|xlsx (xlsx recalculated in LibreOffice, 0 errors); course 2 lesson 4 reuses
  lessons/m8-l31-edit-check.docx. Texts and script local only: /home/claude/too-new (md/, build_new.py).
  PUBLISHED 25.11.2026 (Yakir approved 20:59): modules 11-14 and all 21 lessons published=true. Sold one by one at 249 ₪
  each (plans module-11..module-14) and included in the monthly membership, which now covers all 5 courses (the full
  course of 10 chapters / 37 lessons + these 4). The full course alone (one payment) is the 10 chapters only.

## Lesson videos in Yakir's voice (pilot approved 25.11.2026; every new lesson video still needs his approval)
- Lesson 1 pilot, 25.11.2026: narration script (2,604 chars, about 3:17) written only from lesson 1 facts, voiced with the
  function `voice` (ElevenLabs professional clone) to files/too/videos/l01/narration.mp3. Credits used: 2,606 characters.
- Pipeline: tools/too-video (slides.html in the site's brand, render.py, job.py) + workflow too-video.yml (manual, input job)
  + function toovid (GitHub OIDC; reads the job from docs toovideo/<job>, gives a signed audio link and a signed upload
  link). The finished mp4 goes straight to the private bucket: files/too/videos/<job>/lesson.mp4. Nothing from the lesson is
  in the repo or the public run log. This workspace cannot reach Supabase storage directly, so the render runs in CI.
- Slide timing: the run log prints pause times (numbers only). Paragraph breaks do not always leave a clear pause, so for
  l01 the slide start times are fixed in docs toovideo/l01 deck.bounds (snapped to the nearest short pause). Result:
  3:18, 11 slides, 6.5 MB, rendered 25.11.2026 (third run; re-running costs no voice credits).
- Review link for Yakir: toovid ?sign=<job>&days=N with x-cron-secret. Approval doc: docs agents/too-video-pilot
  (14-day private link, Hebrew description, status "ממתין לאישור של יקיר").
- After approval only: set too_lesson_content.video_url for the lesson (the player in src/lib/video.js must support a
  private signed link first; check before publishing), then the next lessons one by one.
- 25.11.2026: lesson 1 APPROVED (Yakir 15:32 "מאשר") and ATTACHED. Members player: video_url "too:<path>" in the private
  bucket `too` is signed for 2 hours in the browser (src/lib/video.js videoSrc); storage rule too_files_read signs it only for
  logged-in members with access or the admin. Checked: member with access sees the object, logged in without access and
  anonymous do not (rolled-back test), anonymous sign / public / direct requests all refused. Free-preview visitors of
  lesson 1 without access see the text and a join message instead of the video.
  Attach after approval: toovid GET ?attach=<job> (x-cron-secret) copies files/too/videos/<job>/lesson.mp4 to
  too/videos/<job>/lesson.mp4 (size checked), then set too_lesson_content.video_url = 'too:videos/<job>/lesson.mp4'.
  (&drop=1 would remove the review copy; not used yet, the l01 review copy is still in files/.)
- Lessons 2 and 3 videos made 25.11.2026 (3:01 and 3:07, 12 and 11 slides), APPROVED by Yakir and ATTACHED 25.11.2026
  (too_lesson_content.video_url = too:videos/<job>/lesson.mp4 for lessons 1, 2 and 3; checked in the database). Voice: 2,413 + 2,446 characters.
  ElevenLabs budget for Team of One: 8,000 a month; used in November 7,465 (l01 2,606 + l02 2,413 + l03 2,446), logged in
  settings/voice.charLog. Lesson 4 waits for the next month's characters (about 2,450 needed).
- Script rules used: only that lesson's text; one paragraph per slide; numbers and years spoken in words; vowel marks on
  words the voice may misread (הוּסַר, הוּקְפָּא); no "ת.ז." style abbreviations in the narration.
- Render fix 25.11.2026: render.py now measures the narration from decoded audio (WAV). A narration joined from two parts
  was reported 8 s too short and the end of the video was cut (lesson 2 first run). Slide starts: after a first run, put
  deck.bounds (pauses from the run log, close to the text-length estimate) and render again; re-runs cost no voice.
- Slide types added in tools/too-video/slides.html: levels (green/yellow/red), ba (before/after), prompt text from the deck.

## How files reach private storage (paid material never stays in this public repo)
1. Build the file locally. 2. Encrypt with AES-GCM (12-byte nonce + ciphertext), key = app_secrets.TOO_FILEKEY (hex; never print it).
3. Commit to tmp/too-enc/<ascii-name>.bin, push, note the commit sha.
4. SQL: net.http_post to functions/v1/tooput with x-cron-secret from app_secrets.CRON_SECRET and body
   {path:'lessons/<ascii-name>', src:'https://raw.githubusercontent.com/dabullaw-glitch/dabul-office/<sha>/tmp/too-enc/<name>.bin'}.
5. Check net._http_response = 200 ok, then git rm tmp/too-enc and push.
6. Lesson attachments: [{"title":"<Hebrew name> (וורד|אקסל)","path":"lessons/<ascii-name>"}].

## Next (in order)
- Members library items 38-50: DONE 25.11.2026 (see Done).
- Four new paid courses: DONE and PUBLISHED 25.11.2026 (see Done, modules 11-14); single-course access built (LAUNCH.md).
- Lesson videos: 1-3 approved and attached; lesson 4 next, when the next month's voice characters are available.
- The automatic content task (trig_01Mc8EeZ9nQsnwTisL9wwgSQ) stays paused until Yakir says otherwise; when re-enabled, every item goes to him for approval first.
