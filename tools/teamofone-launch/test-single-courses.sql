-- Team of One: who can read which lessons (single courses, 25.11.2026). Runs inside ONE transaction that always ends in an
-- error, so everything it does is rolled back (test students, access rows, the simulated publishing). Nothing stays.
-- Run with execute_sql; the result is the error message: TOO_TEST {"ok":true|false, "checks":[...]}.
-- It simulates: module 11 published with 5 of its 6 lessons published (one stays unpublished), module 12 unpublished.
-- Students: buyer (single course 11 only), member (full course), none (signed in, no access), anon, admin (role admin).
do $t$
declare
  r jsonb := '[]'::jsonb;
  ub uuid := gen_random_uuid(); um uuid := gen_random_uuid(); un uuid := gen_random_uuid(); ua uuid := gen_random_uuid();
  m11 int; m12 int; hidden11 int; vid11 int; vid12 int; cnt int; exp int; who text; u uuid; free_pub int; pub_all int; pub11 int;
  me jsonb;
  procedure_ok boolean;
begin
  select id into m11 from public.too_modules where n = 11;
  select id into m12 from public.too_modules where n = 12;
  -- simulate publishing module 11 (inside this transaction only)
  update public.too_modules set published = true where id = m11;
  update public.too_lessons set published = true where module_id = m11;
  select id into hidden11 from public.too_lessons where module_id = m11 order by n desc limit 1;
  update public.too_lessons set published = false where id = hidden11;           -- one lesson of 11 stays unpublished
  select id into vid11 from public.too_lessons where module_id = m11 and published order by n limit 1;
  select id into vid12 from public.too_lessons where module_id = m12 order by n limit 1;
  update public.too_lesson_content set video_url = 'too:videos/test-single/m11.mp4' where lesson_id = vid11;
  update public.too_lesson_content set video_url = 'too:videos/test-single/m12.mp4' where lesson_id = vid12;

  -- test students
  insert into auth.users (id, email, aud, role) values
    (ub, 'test-buyer@example.invalid', 'authenticated', 'authenticated'), (um, 'test-member@example.invalid', 'authenticated', 'authenticated'),
    (un, 'test-none@example.invalid', 'authenticated', 'authenticated'), (ua, 'test-admin@example.invalid', 'authenticated', 'authenticated');
  insert into public.too_profiles (id, email, full_name, role) values
    (ub, 'test-buyer@example.invalid', 'בדיקה', 'student'), (um, 'test-member@example.invalid', 'בדיקה', 'student'),
    (un, 'test-none@example.invalid', 'בדיקה', 'student'), (ua, 'test-admin@example.invalid', 'בדיקה', 'admin')
    on conflict (id) do update set role = excluded.role, blocked = false;
  insert into public.too_access (user_id, kind, module_id, note) values (ub, 'module', m11, 'בדיקה');
  insert into public.too_access (user_id, kind, note) values (um, 'course', 'בדיקה');

  -- expected numbers, counted as the database owner
  select count(*) into free_pub from public.too_lessons l join public.too_lesson_content c on c.lesson_id = l.id left join public.too_modules m on m.id = l.module_id
    where l.published and (l.module_id is null or m.published) and l.free_preview;
  select count(*) into pub_all from public.too_lessons l join public.too_lesson_content c on c.lesson_id = l.id left join public.too_modules m on m.id = l.module_id
    where l.published and (l.module_id is null or m.published);
  select count(*) into pub11 from public.too_lessons l join public.too_lesson_content c on c.lesson_id = l.id where l.module_id = m11 and l.published;

  foreach who in array array['buyer','member','none','anon','admin'] loop
    u := case who when 'buyer' then ub when 'member' then um when 'none' then un when 'admin' then ua else null end;
    if who = 'anon' then
      perform set_config('request.jwt.claims', '{"role":"anon"}', true); execute 'set local role anon';
    else
      perform set_config('request.jwt.claims', json_build_object('sub', u, 'role', 'authenticated')::text, true); execute 'set local role authenticated';
    end if;

    -- 0. visitors who are not signed in have no read grant on lesson texts at all (the site shows them nothing)
    if who = 'anon' then
      select count(*) into cnt from public.too_lessons where id = hidden11 or module_id = m12;
      r := r || jsonb_build_object('who', who, 'check', 'unpublished lessons (rows)', 'got', cnt, 'want', 0, 'pass', cnt = 0);
      select count(*) into cnt from public.too_modules where id = m12;
      r := r || jsonb_build_object('who', who, 'check', 'unpublished module 12 row', 'got', cnt, 'want', 0, 'pass', cnt = 0);
      r := r || jsonb_build_object('who', who, 'check', 'no read grant on lesson texts', 'got', has_table_privilege('anon', 'public.too_lesson_content', 'select'), 'want', false,
                                   'pass', not has_table_privilege('anon', 'public.too_lesson_content', 'select'));
      execute 'reset role';
      continue;
    end if;
    -- 1. lesson texts of module 11 (published lessons only, the hidden one never)
    select count(*) into cnt from public.too_lesson_content c join public.too_lessons l on l.id = c.lesson_id where l.module_id = m11 and l.id <> hidden11;
    exp := case who when 'buyer' then pub11 when 'member' then pub11 when 'admin' then pub11 else 0 end;
    r := r || jsonb_build_object('who', who, 'check', 'module 11 lesson texts', 'got', cnt, 'want', exp, 'pass', cnt = exp);
    -- 2. the unpublished lesson inside published module 11
    select count(*) into cnt from public.too_lesson_content where lesson_id = hidden11;
    exp := case who when 'admin' then 1 else 0 end;
    r := r || jsonb_build_object('who', who, 'check', 'unpublished lesson in module 11 (text)', 'got', cnt, 'want', exp, 'pass', cnt = exp);
    select count(*) into cnt from public.too_lessons where id = hidden11;
    r := r || jsonb_build_object('who', who, 'check', 'unpublished lesson in module 11 (row)', 'got', cnt, 'want', exp, 'pass', cnt = exp);
    -- 3. unpublished module 12: lessons, texts, module row
    select count(*) into cnt from public.too_lesson_content c join public.too_lessons l on l.id = c.lesson_id where l.module_id = m12;
    exp := case who when 'admin' then (select count(*) from public.too_lesson_content c2 join public.too_lessons l2 on l2.id = c2.lesson_id where l2.module_id = m12) else 0 end;
    r := r || jsonb_build_object('who', who, 'check', 'unpublished module 12 texts', 'got', cnt, 'want', exp, 'pass', cnt = exp);
    select count(*) into cnt from public.too_modules where id = m12;
    exp := case who when 'admin' then 1 else 0 end;
    r := r || jsonb_build_object('who', who, 'check', 'unpublished module 12 row', 'got', cnt, 'want', exp, 'pass', cnt = exp);
    -- 4. everything readable that is published (members: all; buyer: module 11 + free previews; no access: free previews only)
    select count(*) into cnt from public.too_lesson_content c join public.too_lessons l on l.id = c.lesson_id left join public.too_modules m on m.id = l.module_id
      where l.published and (l.module_id is null or m.published);
    exp := case who when 'member' then pub_all when 'admin' then pub_all when 'buyer' then pub11 + free_pub when 'none' then free_pub else 0 end;
    r := r || jsonb_build_object('who', who, 'check', 'all published lesson texts', 'got', cnt, 'want', exp, 'pass', cnt = exp);
    -- 5. members library (no module): members only
    select count(*) into cnt from public.too_lesson_content c join public.too_lessons l on l.id = c.lesson_id where l.module_id is null and l.published and not l.free_preview;
    exp := case who when 'member' then (select count(*) from public.too_lessons where module_id is null and published and not free_preview) when 'admin' then (select count(*) from public.too_lessons where module_id is null and published and not free_preview) else 0 end;
    r := r || jsonb_build_object('who', who, 'check', 'members library texts', 'got', cnt, 'want', exp, 'pass', cnt = exp);
    -- 6. private videos: module 11 video signable by its owner; module 12 (unpublished) by nobody through too_file_ok
    -- (the admin is let in by the storage rule itself through too_is_admin, not through too_file_ok)
    procedure_ok := case when who = 'admin' then public.too_is_admin() else public.too_file_ok('videos/test-single/m11.mp4') end;
    r := r || jsonb_build_object('who', who, 'check', 'video of module 11 (too_file_ok, admin: too_is_admin)', 'got', procedure_ok, 'want', who in ('buyer','member','admin'), 'pass', procedure_ok = (who in ('buyer','member','admin')));
    procedure_ok := public.too_file_ok('videos/test-single/m12.mp4');
    r := r || jsonb_build_object('who', who, 'check', 'video of unpublished module 12 (too_file_ok)', 'got', procedure_ok, 'want', false, 'pass', procedure_ok = false);
    me := public.too_me();
    r := r || jsonb_build_object('who', who, 'check', 'too_me modules', 'got', me->'modules', 'want', case when who = 'buyer' then jsonb_build_array(m11) else '[]'::jsonb end,
                                 'pass', (me->'modules') = case when who = 'buyer' then jsonb_build_array(m11) else '[]'::jsonb end);
    r := r || jsonb_build_object('who', who, 'check', 'too_me access (membership)', 'got', me->'access', 'want', who in ('member'), 'pass', (me->>'access')::boolean = (who in ('member')) or who = 'admin');
    execute 'reset role';
  end loop;

  raise exception 'TOO_TEST %', jsonb_build_object('ok', not exists (select 1 from jsonb_array_elements(r) x where not (x->>'pass')::boolean),
    'failed', (select coalesce(jsonb_agg(x), '[]'::jsonb) from jsonb_array_elements(r) x where not (x->>'pass')::boolean),
    'checks', jsonb_array_length(r), 'numbers', jsonb_build_object('published_all', pub_all, 'module11_published', pub11, 'free_previews', free_pub));
end $t$;
