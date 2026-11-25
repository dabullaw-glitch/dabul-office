# Team of One: automatic AI content (guides, news, member tutorials)

Yakir approved on 24.11.2026: a scanner of new AI content on the web that writes and publishes guides, courses and
tutorials for the Team of One site on a regular, automatic schedule ("סורק תוכן באינטרנט חדש על ai ושיפרסם מדריכים
וקורסים הדרכות באופן קבוע על אוטומט"). Runs publish by themselves; Yakir gets one short Telegram line afterwards.
Same day he added: the guides, short courses, ideas, new tools and their reviews are FOR COMMUNITY MEMBERS ONLY and keep
updating ("שהמדריכים לקהילה, הקורסים, הרעיונות והכלים החדשים והסקירה עליהם וכל הדברים יהיו לחברי הקהילה ויתעדכן כל
הזמן"). So the valuable content goes to the members library (too_lessons kind 'update', readable only by members).
Public articles stay only as short promotional SEO articles that bring people to the site (he also asked for articles
that promote the site), never a copy of the member content.

Site: https://dabullaw-glitch.github.io/dabul-office/teamofone/ (Astro, sites/teamofone). Articles live in Supabase table
public.too_articles (project mgjmnvpnovkewvqevjmz) and the site rebuilds twice a day (workflow teamofone.yml), so a new
row with status 'published' becomes its own page within 12 hours. Member tutorials live in too_lessons (kind 'update')
+ too_lesson_content and show at once in the member area under "חדש במנוי".

## Each run

1. State: `select data from docs where coll='too' and id='content-log'` (may be missing; treat as {"items":[]}).
   Also `select slug,title,category,published_at from too_articles order by published_at desc limit 40`.
2. Decide what this run makes (by Israel weekday):
   - Sunday run: ONE members library item with topic 'כלי חדש' or 'סקירה' or 'חדשות' (what came out this week in AI
     tools that a small business owner can use, how to try it, what it costs, is it worth it), AND ONE short public SEO
     article (600 to 900 words) on an evergreen question people search for (step 5 rules), which ends with an invitation
     to the free challenge and to the membership. The public article must not give away the member item.
   - Wednesday run: ONE members library item with topic 'מדריך' or 'קורס קצר' or 'רעיון' (alternate between them;
     check content-log). A 'קורס קצר' is 3 to 5 short parts inside one item, each with a task.
3. Scan: WebSearch (several queries in the same turn, standard mode; extended only if thin) for AI news of the last
   7 days that matter to small businesses and solo professionals: new features in Claude, ChatGPT, Gemini, Copilot,
   image/video/voice tools, automation tools, pricing or plan changes, privacy/regulation (Israel and EU), practical
   use cases. Prefer official announcements (company blogs, release notes, docs) and solid tech press. Pick the topic
   with the most practical value that is NOT already in content-log or too_articles (no duplicate topics, ever).
4. Verify: WebFetch the official source page(s) for every fact, date, plan name, price and limit you will write.
   A search snippet is not a source. If you cannot open an official source for a claim, leave the claim out.
5. Write in Hebrew (the article text is public):
   - 900 to 1500 words. Title that contains the question or the news in plain words. First paragraph answers it.
   - 4 to 6 `##` sections in the words people search with, short paragraphs, one table when it helps
     (markdown pipe table), a practical "how to try it today" numbered list.
   - Tool and company names in Hebrew letters where natural (קלוד, צ'אט GPT, ג'מיני), English only inside a link label
     when unavoidable. Simple words. NEVER em dash or en dash (use a comma or a period). No "הכי", no "מומחה",
     no promises of results, no "מהפכה" hype, no invented numbers.
   - A short "מקורות" section at the end: markdown links to the official pages you opened this run.
   - Do not copy sentences from sources; write it yourself. No quotes longer than 15 words.
   - faq: 4 to 5 objects {"q": "...", "a": "..."} with 2 to 3 sentence answers.
   - One internal link to an existing Team of One article or tool when relevant
     (tools: /dabul-office/teamofone/kelim/sifriyat-horaot/, /kelim/machshevon-zman/, /kelim/bdikat-uvdot/,
     challenge: /dabul-office/teamofone/etgar/). Never the same link twice in one article.
   - Close with one line inviting readers to the free 5-day challenge (link to /dabul-office/teamofone/etgar/).
6. (Sunday only) Publish the public SEO article with ONE INSERT (never UPDATE or DELETE rows of other articles):
   insert into too_articles (slug,title,seo_title,description,category,cover_url,body_md,faq,status,published_at,updated_at,author)
   values (<latin-kebab-slug, unique, <=60 chars>, <title>, <seo title <=60 chars>, <meta description 140-160 chars>,
   <category from: 'חדשות','מדריכים','השוואות כלים','מהשטח','קידום בגוגל'>, null, <body_md>, <faq jsonb>,
   'published', now(), now(), 'יקיר דבול') returning id, slug;
   Use dollar quoting ($TOO$ ... $TOO$) for text values.
7. Members library item (every run): practical and specific, 900 to 1800 words (a 'קורס קצר' up to 3000): what it is,
   why it matters for a small business, step by step, a copy-ready work instruction, what it costs (verified this run),
   a short "בדיקה" checklist, and the sources. Same writing rules. Insert:
   insert into too_lessons (module_id,n,title,summary,duration_min,kind,topic,free_preview,published,published_at)
   values (null, (select coalesce(max(n),0)+1 from too_lessons where kind='update'), <title>, <one-line summary>, <minutes>,
   'update', <topic: 'מדריך','קורס קצר','רעיון','כלי חדש','סקירה','חדשות'>, false, true, now()) returning id;
   then insert into too_lesson_content (lesson_id, body_md, updated_at) values (<id>, <body>, now());
   If the insert fails (for example module_id may not be null), log the error and skip the tutorial; never change the schema.
8. Log: select docs_merge('too','content-log', jsonb_build_object('items', coalesce((select data->'items' from docs where
   coll='too' and id='content-log'),'[]'::jsonb) || jsonb_build_array(jsonb_build_object('at',now(),'kind',<'article'|'tutorial'>,
   'slug',<slug or lesson id>,'title',<title>,'topic',<3-6 word topic key>,'sources',<array of urls>))));
   (if the row does not exist yet, docs_merge creates it.)
9. Telegram to Yakir (one message, Hebrew only, simple words, no English words, no em or en dash): what went up in the
   members library (title and topic), and on Sunday also the public article link
   https://dabullaw-glitch.github.io/dabul-office/teamofone/maamarim/<slug>/ (it appears after the next site build,
   within 12 hours). net.http_post to 'https://api.telegram.org/bot'||(select v from app_secrets where
   k='TELEGRAM_BOT_TOKEN')||'/sendMessage' with body jsonb_build_object('chat_id',(select v from app_secrets where
   k='TELEGRAM_CHAT_ID'),'text',<line>).

## Hard rules
- Supabase: never UPDATE or DELETE rows (INSERT, or select docs_merge for docs). Never print or select secrets except
  inside the Telegram SQL call.
- Never touch dabullaw.co.il or any law office content. This is the Team of One brand only.
- No spending (no paid APIs, no ads, no image generation that costs credits).
- If nothing new and useful happened this week, write an evergreen practical guide instead (from course.json topics),
  still verified against official docs.
- On any blocking error: log docs_merge('agents','too-content-last', {at, ok:false, error}) and send Yakir one short
  Telegram line that this time the article did not go up and why.

## Cover image rule (Yakir, 25.11.2026)
Every article gets its own cover that matches the article (its title, its topic, a real chart or diagram of its content), in the site style
(black background, cream text, lime accent; see /home/claude/too-files/covers.py pattern: 1600x900 webp in sites/teamofone/public/img/covers/<slug>.webp).
Never use a photo or graphic from the law office that is not about the article.
