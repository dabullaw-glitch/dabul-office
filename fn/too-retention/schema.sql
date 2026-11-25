-- Reference copy of the Team of One retention schema (25.11.2026). Applied as Supabase migrations too_retention_tables,
-- too_retention_recordings_to_library, too_posts_system_author, too_retention_functions, too_retention_thread_title,
-- too_post_stamp_no_rpc, too_renew_again. The database is the source of truth; content (path tasks, drops, mail texts) lives there.
-- Team of One retention (25.11.2026): 30-day path, weekly drops, streaks, badges, hours saved, recap,
-- fair cancel with optional pause, re-engagement mail log (sending off while mail_ready is false), admin dashboard.
-- Every table has RLS. Members see only their own rows. Writes that need checks go through SECURITY DEFINER functions.

-- Sunday-based week start (Israel), for a date.
create or replace function public.too_wkd(d date) returns date language sql immutable set search_path = public as $$
  select d - extract(dow from d)::int;
$$;
-- Israel calendar day of a timestamp.
create or replace function public.too_ild(t timestamptz) returns date language sql stable set search_path = public as $$
  select (t at time zone 'Asia/Jerusalem')::date;
$$;

-- ---------- onboarding questionnaire ----------
create table if not exists public.too_onboarding (
  user_id uuid primary key references public.too_profiles(id) on delete cascade,
  biz text not null check (biz in ('service','shop','freelance','clinic','creator','other')),
  biz_note text check (biz_note is null or char_length(biz_note) <= 200),
  goal text not null check (goal in ('leads','time','content','sales')),
  hours int not null check (hours between 1 and 40),
  pace text not null default 'daily' check (pace in ('daily','light')),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.too_onboarding enable row level security;
create policy too_onboarding_read on public.too_onboarding for select to authenticated using (user_id = auth.uid() or public.too_is_admin());

-- ---------- 30-day path: tasks (content) and what each member finished ----------
create table if not exists public.too_path_tasks (
  id serial primary key,
  day int not null check (day between 1 and 30),
  goal text check (goal is null or goal in ('leads','time','content','sales')),
  core boolean not null default false,
  title text not null check (char_length(title) <= 140),
  body_md text not null,
  minutes int not null default 15 check (minutes between 5 and 120),
  lesson_id int references public.too_lessons(id) on delete set null,
  link text check (link is null or link ~ '^[a-z0-9/_?=&.-]*$'),
  badge text,
  updated_at timestamptz not null default now()
);
create unique index if not exists too_path_tasks_day_goal on public.too_path_tasks (day, coalesce(goal, ''));
alter table public.too_path_tasks enable row level security;
create policy too_path_tasks_read on public.too_path_tasks for select to authenticated using (public.too_has_access(auth.uid()) or public.too_is_admin());
create policy too_path_tasks_admin on public.too_path_tasks for all to authenticated using (public.too_is_admin()) with check (public.too_is_admin());

create table if not exists public.too_path_done (
  user_id uuid not null references public.too_profiles(id) on delete cascade,
  day int not null check (day between 1 and 30),
  done_at timestamptz not null default now(),
  primary key (user_id, day)
);
alter table public.too_path_done enable row level security;
create policy too_path_done_read on public.too_path_done for select to authenticated using (user_id = auth.uid() or public.too_is_admin());

-- ---------- weekly drops ("השבוע בצוות") ----------
create table if not exists public.too_drops (
  id serial primary key,
  publish_at timestamptz not null,
  kind text not null check (kind in ('skill','template','guide','news','challenge')),
  title text not null check (char_length(title) between 2 and 140),
  teaser text not null check (char_length(teaser) between 2 and 300),
  body_md text not null default '',
  challenge text check (challenge is null or char_length(challenge) <= 1500),
  minutes int check (minutes is null or minutes between 1 and 240),
  published boolean not null default true,
  thread_id bigint references public.too_posts(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists too_drops_pub on public.too_drops (publish_at desc);
alter table public.too_drops enable row level security;
create policy too_drops_read on public.too_drops for select to authenticated
  using (public.too_is_admin() or (published and publish_at <= now() and public.too_has_access(auth.uid())));
create policy too_drops_admin on public.too_drops for all to authenticated using (public.too_is_admin()) with check (public.too_is_admin());

create table if not exists public.too_drop_done (
  user_id uuid not null references public.too_profiles(id) on delete cascade,
  drop_id int not null references public.too_drops(id) on delete cascade,
  done_at timestamptz not null default now(),
  primary key (user_id, drop_id)
);
alter table public.too_drop_done enable row level security;
create policy too_drop_done_read on public.too_drop_done for select to authenticated using (user_id = auth.uid() or public.too_is_admin());

-- ---------- hours saved (self report) ----------
create table if not exists public.too_time_saved (
  id bigserial primary key,
  user_id uuid not null references public.too_profiles(id) on delete cascade,
  task text not null check (char_length(task) between 2 and 120),
  minutes int not null check (minutes between 5 and 2400),
  created_at timestamptz not null default now()
);
create index if not exists too_time_saved_user on public.too_time_saved (user_id, created_at desc);
alter table public.too_time_saved enable row level security;
create policy too_time_saved_read on public.too_time_saved for select to authenticated using (user_id = auth.uid() or public.too_is_admin());
create policy too_time_saved_del on public.too_time_saved for delete to authenticated using (user_id = auth.uid());

-- ---------- activity days (for last seen and at-risk), badges ----------
create table if not exists public.too_activity (
  user_id uuid not null references public.too_profiles(id) on delete cascade,
  day date not null,
  hits int not null default 1,
  primary key (user_id, day)
);
alter table public.too_activity enable row level security;
create policy too_activity_read on public.too_activity for select to authenticated using (user_id = auth.uid() or public.too_is_admin());

create table if not exists public.too_badges (
  user_id uuid not null references public.too_profiles(id) on delete cascade,
  code text not null check (code ~ '^[a-z0-9_]{2,30}$'),
  earned_at timestamptz not null default now(),
  primary key (user_id, code)
);
alter table public.too_badges enable row level security;
create policy too_badges_read on public.too_badges for select to authenticated using (user_id = auth.uid() or public.too_is_admin());

-- ---------- cancel feedback and pauses ----------
create table if not exists public.too_cancel_feedback (
  id bigserial primary key,
  user_id uuid references public.too_profiles(id) on delete set null,
  action text not null check (action in ('cancel','pause','resume')),
  reason text check (reason is null or reason in ('no_time','price','not_needed','hard','content','tech','temporary','other')),
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);
alter table public.too_cancel_feedback enable row level security;
create policy too_cancel_feedback_admin on public.too_cancel_feedback for select to authenticated using (public.too_is_admin());

-- A pause = the next monthly renewal is skipped (auto_renew off, so no payment link is sent), progress stays, and on
-- resume_at the member gets one reminder. There is no automatic charging in this site (renewal is a payment link sent by
-- too-pay only while auto_renew is on), so a pause never charges and never blocks anything.
create table if not exists public.too_pauses (
  id bigserial primary key,
  user_id uuid not null references public.too_profiles(id) on delete cascade,
  paid_until timestamptz not null,
  resume_at timestamptz not null,
  status text not null default 'active' check (status in ('active','resumed','ended','cancelled')),
  created_at timestamptz not null default now(),
  ended_at timestamptz
);
create unique index if not exists too_pauses_one_active on public.too_pauses (user_id) where status = 'active';
alter table public.too_pauses enable row level security;
create policy too_pauses_read on public.too_pauses for select to authenticated using (user_id = auth.uid() or public.too_is_admin());

-- ---------- member spotlight (admin picks) ----------
create table if not exists public.too_spotlight (
  id serial primary key,
  week_start date not null default public.too_wkd(public.too_ild(now())),
  name text not null check (char_length(name) between 1 and 80),
  body text not null check (char_length(body) between 2 and 1200),
  post_id bigint references public.too_posts(id) on delete set null,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.too_spotlight enable row level security;
create policy too_spotlight_read on public.too_spotlight for select to authenticated using (public.too_is_admin() or (published and public.too_has_access(auth.uid())));
create policy too_spotlight_admin on public.too_spotlight for all to authenticated using (public.too_is_admin()) with check (public.too_is_admin());

-- ---------- re-engagement mail: templates and log (sending only when mail_ready is true) ----------
create table if not exists public.too_mail_templates (
  kind text primary key check (kind ~ '^[a-z0-9_]{2,30}$'),
  label text not null,
  subject text not null check (char_length(subject) between 2 and 160),
  body_md text not null,
  cta_text text,
  cta_path text check (cta_path is null or cta_path ~ '^[a-z0-9/_?=&.-]*$'),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);
alter table public.too_mail_templates enable row level security;
create policy too_mail_templates_admin on public.too_mail_templates for all to authenticated using (public.too_is_admin()) with check (public.too_is_admin());

create table if not exists public.too_mail_log (
  id bigserial primary key,
  user_id uuid references public.too_profiles(id) on delete cascade,
  kind text not null,
  ref text not null,
  vars jsonb not null default '{}'::jsonb,
  status text not null check (status in ('logged','queued','sent','failed','skipped')),
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, kind, ref)
);
create index if not exists too_mail_log_at on public.too_mail_log (created_at desc);
alter table public.too_mail_log enable row level security;
create policy too_mail_log_admin on public.too_mail_log for select to authenticated using (public.too_is_admin());

-- Team of One retention functions (25.11.2026).

-- Last time a member did anything (visit, lesson, path task, report, post).
create or replace function public.too_last_act(p_uid uuid) returns timestamptz language sql stable security definer set search_path = public as $$
  select greatest(
    (select last_seen from public.too_profiles where id = p_uid),
    (select (max(day)::timestamp at time zone 'Asia/Jerusalem') from public.too_activity where user_id = p_uid),
    (select max(done_at) from public.too_progress where user_id = p_uid),
    (select max(done_at) from public.too_path_done where user_id = p_uid));
$$;

-- Weeks (Sunday start) in which the member did something real: a lesson, a path task, a weekly drop, an hours report, a post.
create or replace function public.too_streak(p_uid uuid) returns int language plpgsql stable security definer set search_path = public as $$
declare wk date[]; cur date := public.too_wkd(public.too_ild(now())); w date; n int := 0;
begin
  select array_agg(distinct public.too_wkd(public.too_ild(t))) into wk from (
    select done_at t from public.too_progress where user_id = p_uid
    union all select done_at from public.too_path_done where user_id = p_uid
    union all select done_at from public.too_drop_done where user_id = p_uid
    union all select created_at from public.too_time_saved where user_id = p_uid
    union all select created_at from public.too_posts where user_id = p_uid
    union all select created_at from public.too_comments where user_id = p_uid) x;
  if wk is null then return 0; end if;
  w := case when cur = any(wk) then cur else cur - 7 end;
  while w = any(wk) loop n := n + 1; w := w - 7; end loop;
  return n;
end $$;

-- Award badges whose condition is now true (never removes one).
create or replace function public.too_badges_sync(p_uid uuid, p_streak int) returns void language plpgsql security definer set search_path = public as $$
declare mods int[]; codes text[] := '{}'; ob public.too_onboarding; pdone int; need int; mins int;
begin
  select array_agg(m.n) into mods from (
    select mo.n from public.too_modules mo join public.too_lessons l on l.module_id = mo.id and l.kind = 'lesson' and l.published
    left join public.too_progress g on g.lesson_id = l.id and g.user_id = p_uid
    where mo.published group by mo.n having count(*) > 0 and count(*) = count(g.lesson_id)) m;
  mods := coalesce(mods, '{}');
  select * into ob from public.too_onboarding where user_id = p_uid;
  select count(*) into pdone from public.too_path_done where user_id = p_uid;
  select coalesce(sum(minutes), 0) into mins from public.too_time_saved where user_id = p_uid;
  if ob.user_id is not null then codes := codes || 'start'::text; end if;
  if exists (select 1 from public.too_progress g join public.too_lessons l on l.id = g.lesson_id and l.kind = 'lesson' where g.user_id = p_uid) then codes := codes || 'first_lesson'::text; end if;
  if mods && array[2,3,4,5,6,7,8,9,10] or exists (select 1 from public.too_path_done d join public.too_path_tasks t on t.day = d.day and t.badge = 'first_employee' where d.user_id = p_uid) then codes := codes || 'first_employee'::text; end if;
  if cardinality(mods) > 0 then codes := codes || 'chapter'::text; end if;
  if mods @> array[1,2,3,4,5,6,7,8,9,10] then codes := codes || 'course'::text; end if;
  if mods && array[11,12,13,14] then codes := codes || 'extra_course'::text; end if;
  if pdone >= 7 then codes := codes || 'path_week'::text; end if;
  if ob.user_id is not null then
    select count(distinct day) into need from public.too_path_tasks where ob.pace = 'daily' or core;
    if need > 0 and (select count(*) from public.too_path_done d where d.user_id = p_uid and d.day in (select day from public.too_path_tasks where ob.pace = 'daily' or core)) >= need then codes := codes || 'path'::text; end if;
  end if;
  if p_streak >= 4 then codes := codes || 'streak4'::text; end if;
  if mins >= 600 then codes := codes || 'hours10'::text; end if;
  if exists (select 1 from public.too_posts where user_id = p_uid) or exists (select 1 from public.too_comments where user_id = p_uid) then codes := codes || 'community'::text; end if;
  insert into public.too_badges (user_id, code) select p_uid, c from unnest(codes) c on conflict do nothing;
end $$;

-- Billing month of a member: the current monthly subscription period, else 30-day cycles from the day they joined.
create or replace function public.too_cycle(p_uid uuid) returns table (c_start timestamptz, c_end timestamptz, sub boolean) language plpgsql stable security definer set search_path = public as $$
declare s timestamptz; e timestamptz; j timestamptz;
begin
  select a.starts_at, a.ends_at into s, e from public.too_access a where a.user_id = p_uid and a.kind = 'subscription' and not a.revoked
    and a.starts_at <= now() and a.ends_at > now() order by a.starts_at desc limit 1;
  if s is not null then return query select s, e, true; return; end if;
  select created_at into j from public.too_profiles where id = p_uid;
  j := coalesce(j, now());
  s := j + (floor(extract(epoch from now() - j) / (30 * 86400)) * interval '30 days');
  return query select s, s + interval '30 days', false;
end $$;

-- Everything the retention screens need for the signed-in member, in one call. Also records today's visit and awards badges.
create or replace function public.too_ret_me() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.too_profiles; ob public.too_onboarding; acc boolean; st int; cy record; today date := public.too_ild(now());
  r jsonb; pday int; nxt jsonb; ev jsonb; certs jsonb; pause jsonb; mins_total int; mins_cycle int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  select * into p from public.too_profiles where id = uid;
  if not found then return jsonb_build_object('profile', false); end if;
  acc := public.too_has_access(uid) or public.too_is_admin();
  insert into public.too_activity (user_id, day) values (uid, today) on conflict (user_id, day) do update set hits = public.too_activity.hits + 1;
  st := public.too_streak(uid);
  perform public.too_badges_sync(uid, st);
  select * into ob from public.too_onboarding where user_id = uid;
  select * into cy from public.too_cycle(uid);
  pday := case when ob.user_id is null then null else least(30, greatest(1, today - public.too_ild(ob.started_at) + 1)) end;
  select coalesce(sum(minutes), 0) into mins_total from public.too_time_saved where user_id = uid;
  select coalesce(sum(minutes), 0) into mins_cycle from public.too_time_saved where user_id = uid and created_at >= cy.c_start;
  nxt := case when acc then coalesce((select jsonb_agg(jsonb_build_object('title', d.title, 'kind', d.kind, 'teaser', d.teaser, 'at', d.publish_at) order by d.publish_at)
    from public.too_drops d where d.published and d.publish_at > now() and d.publish_at <= now() + interval '35 days'), '[]'::jsonb) else '[]'::jsonb end;
  ev := (select jsonb_build_object('id', e.id, 'title', e.title, 'starts_at', e.starts_at) from public.too_events e
    where e.published and e.starts_at > now() - interval '1 hour' and (e.audience = 'public' or acc) order by e.starts_at limit 1);
  certs := coalesce((select jsonb_agg(jsonb_build_object('module_id', x.id, 'n', x.n, 'title', x.title, 'done_at', x.done_at) order by x.n) from (
    select mo.id, mo.n, mo.title, max(g.done_at) done_at from public.too_modules mo
    join public.too_lessons l on l.module_id = mo.id and l.kind = 'lesson' and l.published
    left join public.too_progress g on g.lesson_id = l.id and g.user_id = uid
    where mo.published group by mo.id, mo.n, mo.title having count(*) > 0 and count(*) = count(g.lesson_id)) x), '[]'::jsonb);
  pause := (select jsonb_build_object('id', id, 'paid_until', paid_until, 'resume_at', resume_at) from public.too_pauses where user_id = uid and status = 'active' limit 1);
  r := jsonb_build_object(
    'name', p.full_name, 'joined', p.created_at, 'access', acc,
    'onboarding', case when ob.user_id is null then null else jsonb_build_object('biz', ob.biz, 'biz_note', ob.biz_note, 'goal', ob.goal, 'hours', ob.hours, 'pace', ob.pace, 'started_at', ob.started_at) end,
    'path_day', pday,
    'path_done', coalesce((select jsonb_agg(day order by day) from public.too_path_done where user_id = uid), '[]'::jsonb),
    'streak', st,
    'weeks', coalesce((select jsonb_agg(w order by w) from (select distinct public.too_wkd(public.too_ild(t)) w from (
        select done_at t from public.too_progress where user_id = uid union all select done_at from public.too_path_done where user_id = uid
        union all select done_at from public.too_drop_done where user_id = uid union all select created_at from public.too_time_saved where user_id = uid
        union all select created_at from public.too_posts where user_id = uid union all select created_at from public.too_comments where user_id = uid) a
      where t > now() - interval '70 days') b), '[]'::jsonb),
    'badges', coalesce((select jsonb_agg(jsonb_build_object('code', code, 'at', earned_at) order by earned_at) from public.too_badges where user_id = uid), '[]'::jsonb),
    'minutes_total', mins_total,
    'drops_done', coalesce((select jsonb_agg(drop_id) from public.too_drop_done where user_id = uid), '[]'::jsonb),
    'cycle', jsonb_build_object('start', cy.c_start, 'end', cy.c_end, 'sub', cy.sub, 'day', greatest(1, (now()::date - cy.c_start::date) + 1),
      'lessons', (select count(*) from public.too_progress where user_id = uid and done_at >= cy.c_start),
      'path', (select count(*) from public.too_path_done where user_id = uid and done_at >= cy.c_start),
      'drops', (select count(*) from public.too_drop_done where user_id = uid and done_at >= cy.c_start),
      'posts', (select count(*) from public.too_posts where user_id = uid and created_at >= cy.c_start) + (select count(*) from public.too_comments where user_id = uid and created_at >= cy.c_start),
      'minutes', mins_cycle,
      'badges', coalesce((select jsonb_agg(code) from public.too_badges where user_id = uid and earned_at >= cy.c_start), '[]'::jsonb),
      'new_drops', (select count(*) from public.too_drops where published and publish_at >= cy.c_start and publish_at <= now())),
    'next_drops', nxt,
    'next_event', ev,
    'certs', certs,
    'sub_ends', (select max(ends_at) from public.too_access a where a.user_id = uid and a.kind = 'subscription' and not a.revoked and a.ends_at > now()),
    'sub_renew', coalesce((select bool_or(auto_renew) from public.too_access a where a.user_id = uid and a.kind = 'subscription' and not a.revoked and a.ends_at > now()), false),
    'course', exists (select 1 from public.too_access a where a.user_id = uid and a.kind = 'course' and not a.revoked and (a.ends_at is null or a.ends_at > now())),
    'pause', pause);
  return r;
end $$;

-- Welcome questionnaire. p_restart starts the 30 days again from today (finished days are cleared).
create or replace function public.too_onboarding_save(p_biz text, p_goal text, p_hours int, p_note text, p_restart boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); pace text;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not (public.too_has_access(uid) or public.too_is_admin()) then raise exception 'no_access'; end if;
  if not exists (select 1 from public.too_profiles where id = uid) then raise exception 'no_profile'; end if;
  if p_biz not in ('service','shop','freelance','clinic','creator','other') or p_goal not in ('leads','time','content','sales') then raise exception 'bad_input'; end if;
  p_hours := least(40, greatest(1, coalesce(p_hours, 3)));
  pace := case when p_hours < 3 then 'light' else 'daily' end;
  insert into public.too_onboarding (user_id, biz, biz_note, goal, hours, pace) values (uid, p_biz, nullif(left(btrim(coalesce(p_note, '')), 200), ''), p_goal, p_hours, pace)
  on conflict (user_id) do update set biz = excluded.biz, biz_note = excluded.biz_note, goal = excluded.goal, hours = excluded.hours, pace = excluded.pace,
    updated_at = now(), started_at = case when p_restart then now() else public.too_onboarding.started_at end;
  if p_restart then delete from public.too_path_done where user_id = uid; end if;
  return jsonb_build_object('ok', true, 'pace', pace);
end $$;

-- Mark a path day done or not done. Only days that are already open (day <= today's day).
create or replace function public.too_path_mark(p_day int, p_done boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); ob public.too_onboarding; today int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not (public.too_has_access(uid) or public.too_is_admin()) then raise exception 'no_access'; end if;
  select * into ob from public.too_onboarding where user_id = uid;
  if not found then raise exception 'no_onboarding'; end if;
  today := least(30, greatest(1, public.too_ild(now()) - public.too_ild(ob.started_at) + 1));
  if p_day is null or p_day < 1 or p_day > today then raise exception 'day_locked'; end if;
  if p_done then insert into public.too_path_done (user_id, day) values (uid, p_day) on conflict do nothing;
  else delete from public.too_path_done where user_id = uid and day = p_day; end if;
  return jsonb_build_object('ok', true);
end $$;

-- "I used it" on a weekly drop that is already out.
create or replace function public.too_drop_mark(p_drop int, p_done boolean) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not (public.too_has_access(uid) or public.too_is_admin()) then raise exception 'no_access'; end if;
  if not exists (select 1 from public.too_drops where id = p_drop and published and publish_at <= now()) then raise exception 'not_found'; end if;
  if p_done then insert into public.too_drop_done (user_id, drop_id) values (uid, p_drop) on conflict do nothing;
  else delete from public.too_drop_done where user_id = uid and drop_id = p_drop; end if;
  return jsonb_build_object('ok', true);
end $$;

-- Hours saved: one line per report ("this task saved me N minutes this week").
create or replace function public.too_time_add(p_task text, p_minutes int) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not (public.too_has_access(uid) or public.too_is_admin()) then raise exception 'no_access'; end if;
  if not exists (select 1 from public.too_profiles where id = uid) then raise exception 'no_profile'; end if;
  p_task := btrim(coalesce(p_task, ''));
  if char_length(p_task) < 2 or char_length(p_task) > 120 or p_minutes is null or p_minutes < 5 or p_minutes > 2400 then raise exception 'bad_input'; end if;
  select count(*) into n from public.too_time_saved where user_id = uid and created_at > now() - interval '7 days';
  if n >= 40 then raise exception 'rate'; end if;
  insert into public.too_time_saved (user_id, task, minutes) values (uid, p_task, p_minutes);
  return jsonb_build_object('ok', true);
end $$;

-- ---------- fair cancel: one click, always available; optional reason; optional pause instead ----------
create or replace function public.too_cancel_reasoned(p_reason text, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r jsonb;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if p_reason is not null and p_reason not in ('no_time','price','not_needed','hard','content','tech','temporary','other') then p_reason := 'other'; end if;
  r := public.too_cancel_subscription();
  update public.too_pauses set status = 'cancelled', ended_at = now() where user_id = uid and status = 'active';
  insert into public.too_cancel_feedback (user_id, action, reason, note) values (uid, 'cancel', p_reason, nullif(left(btrim(coalesce(p_note, '')), 500), ''));
  return r;
end $$;

create or replace function public.too_pause(p_reason text, p_note text) returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e timestamptz; rs timestamptz;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if exists (select 1 from public.too_pauses where user_id = uid and status = 'active') then raise exception 'already_paused'; end if;
  select max(ends_at) into e from public.too_access where user_id = uid and kind = 'subscription' and not revoked and ends_at > now() and auto_renew;
  if e is null then raise exception 'no_renewing_sub'; end if;
  if p_reason is not null and p_reason not in ('no_time','price','not_needed','hard','content','tech','temporary','other') then p_reason := 'other'; end if;
  rs := e + interval '1 month';
  update public.too_access set auto_renew = false where user_id = uid and kind = 'subscription' and not revoked and ends_at > now();
  insert into public.too_pauses (user_id, paid_until, resume_at) values (uid, e, rs);
  insert into public.too_cancel_feedback (user_id, action, reason, note) values (uid, 'pause', p_reason, nullif(left(btrim(coalesce(p_note, '')), 500), ''));
  perform public.too_log('pause_subscription', jsonb_build_object('until', e, 'resume_at', rs));
  return jsonb_build_object('until', e, 'resume_at', rs);
end $$;

create or replace function public.too_resume() returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); e timestamptz;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not exists (select 1 from public.too_pauses where user_id = uid and status = 'active') then raise exception 'no_pause'; end if;
  update public.too_pauses set status = 'resumed', ended_at = now() where user_id = uid and status = 'active';
  select max(ends_at) into e from public.too_access where user_id = uid and kind = 'subscription' and not revoked and ends_at > now();
  if e is not null then update public.too_access set auto_renew = true where user_id = uid and kind = 'subscription' and not revoked and ends_at > now(); end if;
  insert into public.too_cancel_feedback (user_id, action) values (uid, 'resume');
  perform public.too_log('resume_subscription', jsonb_build_object('until', e));
  return jsonb_build_object('renewing', e is not null, 'until', e);
end $$;

-- ---------- scheduled job: weekly challenge thread + re-engagement mail log ----------
-- Mail rows are 'logged' (what would be sent) while too_settings.mail_ready is not true; 'queued' (to be sent by the
-- too-retention function) once it is. Each mail is written once per user and occasion (unique user, kind, ref).
create or replace function public.too_retention_run() returns jsonb language plpgsql security definer set search_path = public as $$
declare ready boolean; st text; d record; m record; pid bigint; n_thread int := 0; n_mail int := 0; k int;
  il timestamp := now() at time zone 'Asia/Jerusalem'; wk date := public.too_wkd((now() at time zone 'Asia/Jerusalem')::date);
  drops_week jsonb; next_drops jsonb;
begin
  ready := coalesce((select value = 'true'::jsonb from public.too_settings where key = 'mail_ready'), false);
  st := case when ready then 'queued' else 'logged' end;

  -- 1. the weekly challenge thread in the community, once per weekly drop that has a challenge
  for d in select * from public.too_drops where published and publish_at <= now() and publish_at > now() - interval '7 days'
           and thread_id is null and challenge is not null and btrim(challenge) <> '' order by publish_at loop
    perform set_config('too.system_post', 'on', true);
    update public.too_posts set pinned = false where pinned and user_id is null and kind = 'announce' and title like 'אתגר השבוע:%';
    insert into public.too_posts (user_id, kind, title, body, pinned)
    values (null, 'announce', left('אתגר השבוע: ' || d.title, 140),
      left(d.challenge || E'\n\nמשתפים כאן בתגובה מה עשיתם, גם אם זה קטן. בלי פרטים של לקוחות. ההצלחות של השבוע מופיעות בעמוד "השבוע בצוות".', 5000), true)
    returning id into pid;
    perform set_config('too.system_post', 'off', true);
    update public.too_drops set thread_id = pid where id = d.id;
    n_thread := n_thread + 1;
  end loop;

  next_drops := coalesce((select jsonb_agg(title order by publish_at) from (select title, publish_at from public.too_drops where published and publish_at > now() order by publish_at limit 3) x), '[]'::jsonb);

  -- 2. paused members whose month off is over: one reminder, then the pause ends
  for m in select ps.* , pr.full_name from public.too_pauses ps join public.too_profiles pr on pr.id = ps.user_id
           where ps.status = 'active' and ps.resume_at <= now() and not pr.blocked loop
    insert into public.too_mail_log (user_id, kind, ref, vars, status)
    values (m.user_id, 'pause_resume', 'pause-' || m.id, jsonb_build_object('first', split_part(coalesce(m.full_name, ''), ' ', 1), 'next', next_drops), st)
    on conflict do nothing;
    get diagnostics k = row_count; n_mail := n_mail + k;
    update public.too_pauses set status = 'ended', ended_at = now() where id = m.id;
  end loop;

  -- 3. members with access and no activity for 7 days (once per quiet spell; not after 45 days)
  for m in select p.id, p.full_name, public.too_last_act(p.id) la from public.too_profiles p
           where not p.blocked and public.too_has_access(p.id) loop
    if m.la is not null and m.la < now() - interval '7 days' and m.la > now() - interval '45 days' then
      insert into public.too_mail_log (user_id, kind, ref, vars, status)
      values (m.id, 'inactive7', 'since-' || public.too_ild(m.la), jsonb_build_object('first', split_part(coalesce(m.full_name, ''), ' ', 1),
        'days', extract(day from now() - m.la)::int, 'next', next_drops,
        'lesson', (select l.title from public.too_lessons l join public.too_modules mo on mo.id = l.module_id where l.kind = 'lesson' and l.published and mo.published
                   and mo.n <= 10 and not exists (select 1 from public.too_progress g where g.user_id = m.id and g.lesson_id = l.id) order by mo.n, l.n limit 1)), st)
      on conflict do nothing;
      get diagnostics k = row_count; n_mail := n_mail + k;
    end if;
  end loop;

  -- 4. monthly members on day 25 to 27 of their month: the personal recap ("מה עשיתם החודש")
  for m in select a.user_id, a.starts_at, a.ends_at, p.full_name from public.too_access a join public.too_profiles p on p.id = a.user_id
           where a.kind = 'subscription' and not a.revoked and not p.blocked and a.starts_at <= now() and a.ends_at > now()
             and now() >= a.starts_at + interval '24 days' and now() < a.starts_at + interval '27 days' loop
    insert into public.too_mail_log (user_id, kind, ref, vars, status)
    values (m.user_id, 'recap25', 'cycle-' || public.too_ild(m.starts_at), jsonb_build_object(
      'first', split_part(coalesce(m.full_name, ''), ' ', 1),
      'lessons', (select count(*) from public.too_progress where user_id = m.user_id and done_at >= m.starts_at),
      'path', (select count(*) from public.too_path_done where user_id = m.user_id and done_at >= m.starts_at),
      'hours', round(coalesce((select sum(minutes) from public.too_time_saved where user_id = m.user_id and created_at >= m.starts_at), 0) / 60.0, 1),
      'badges', (select count(*) from public.too_badges where user_id = m.user_id and earned_at >= m.starts_at),
      'next', next_drops), st)
    on conflict do nothing;
    get diagnostics k = row_count; n_mail := n_mail + k;
  end loop;

  -- 5. renewing monthly members 4 to 6 days before the month ends: what is waiting next month (the payment link itself is too-pay's renew mail)
  for m in select a.id, a.user_id, a.ends_at, p.full_name from public.too_access a join public.too_profiles p on p.id = a.user_id
           where a.kind = 'subscription' and not a.revoked and a.auto_renew and not p.blocked
             and a.ends_at > now() + interval '4 days' and a.ends_at <= now() + interval '6 days'
             and not exists (select 1 from public.too_access b where b.user_id = a.user_id and b.kind = 'subscription' and not b.revoked and b.ends_at > a.ends_at) loop
    insert into public.too_mail_log (user_id, kind, ref, vars, status)
    values (m.user_id, 'renew_value', 'acc-' || m.id, jsonb_build_object('first', split_part(coalesce(m.full_name, ''), ' ', 1),
      'until', to_char(m.ends_at at time zone 'Asia/Jerusalem', 'DD.MM.YYYY'), 'next', next_drops,
      'event', (select title from public.too_events where published and starts_at > now() and starts_at < m.ends_at + interval '31 days' order by starts_at limit 1)), st)
    on conflict do nothing;
    get diagnostics k = row_count; n_mail := n_mail + k;
  end loop;

  -- 6. Sunday digest of the drops that came out in the last 7 days
  if extract(dow from il) = 0 then
    drops_week := (select jsonb_agg(title order by publish_at) from public.too_drops where published and publish_at <= now() and publish_at > now() - interval '7 days');
    if drops_week is not null then
      for m in select p.id, p.full_name from public.too_profiles p where not p.blocked and public.too_has_access(p.id) loop
        insert into public.too_mail_log (user_id, kind, ref, vars, status)
        values (m.id, 'weekly_digest', 'week-' || wk, jsonb_build_object('first', split_part(coalesce(m.full_name, ''), ' ', 1), 'drops', drops_week, 'next', next_drops), st)
        on conflict do nothing;
        get diagnostics k = row_count; n_mail := n_mail + k;
      end loop;
    end if;
  end if;

  return jsonb_build_object('threads', n_thread, 'mails', n_mail, 'mail_status', st, 'at', now());
end $$;

-- ---------- admin ----------
create or replace function public.too_ret_admin() returns jsonb language plpgsql security definer set search_path = public as $$
declare members jsonb; churned int; active int;
begin
  perform public.too_admin_check();
  select coalesce(jsonb_agg(x order by (x->>'last_act') nulls first), '[]'::jsonb) into members from (
    select jsonb_build_object('id', p.id, 'name', p.full_name, 'email', p.email, 'joined', p.created_at, 'last_act', public.too_last_act(p.id),
      'access', public.too_has_access(p.id),
      'course', exists (select 1 from public.too_access a where a.user_id = p.id and a.kind = 'course' and not a.revoked and (a.ends_at is null or a.ends_at > now())),
      'sub_ends', (select max(ends_at) from public.too_access a where a.user_id = p.id and a.kind = 'subscription' and not a.revoked and a.ends_at > now()),
      'sub_renew', coalesce((select bool_or(auto_renew) from public.too_access a where a.user_id = p.id and a.kind = 'subscription' and not a.revoked and a.ends_at > now()), false),
      'paused', exists (select 1 from public.too_pauses s where s.user_id = p.id and s.status = 'active'),
      'onboarded', exists (select 1 from public.too_onboarding o where o.user_id = p.id),
      'lessons', (select count(*) from public.too_progress g where g.user_id = p.id),
      'path', (select count(*) from public.too_path_done d where d.user_id = p.id),
      'minutes', coalesce((select sum(minutes) from public.too_time_saved t where t.user_id = p.id), 0),
      'badges', (select count(*) from public.too_badges b where b.user_id = p.id),
      'streak', public.too_streak(p.id)) x
    from public.too_profiles p where not p.blocked and p.role <> 'admin') m;
  select count(*) into active from jsonb_array_elements(members) e where (e->>'access')::boolean;
  -- churned in 30 days: a monthly subscription ended in the last 30 days, and no access now
  select count(distinct a.user_id) into churned from public.too_access a where a.kind = 'subscription' and not a.revoked
    and a.ends_at between now() - interval '30 days' and now() and not public.too_has_access(a.user_id);
  return jsonb_build_object(
    'members', members, 'active', active,
    'active7', (select count(*) from jsonb_array_elements(members) e where (e->>'access')::boolean and (e->>'last_act')::timestamptz > now() - interval '7 days'),
    'at_risk', (select count(*) from jsonb_array_elements(members) e where (e->>'access')::boolean and ((e->>'last_act') is null or (e->>'last_act')::timestamptz <= now() - interval '7 days')),
    'renewing', (select count(distinct user_id) from public.too_access where kind = 'subscription' and not revoked and auto_renew and ends_at > now()),
    'ending', (select count(distinct a.user_id) from public.too_access a where a.kind = 'subscription' and not a.revoked and a.ends_at > now()
               and not exists (select 1 from public.too_access b where b.user_id = a.user_id and b.kind = 'subscription' and not b.revoked and b.auto_renew and b.ends_at > now())),
    'churned30', churned,
    'churn_rate', case when active + churned > 0 then round(churned * 100.0 / (active + churned), 1) else 0 end,
    'paused', (select count(*) from public.too_pauses where status = 'active'),
    'reasons', coalesce((select jsonb_agg(jsonb_build_object('action', action, 'reason', coalesce(reason, 'none'), 'n', n)) from (
      select action, reason, count(*) n from public.too_cancel_feedback where created_at > now() - interval '90 days' group by action, reason order by count(*) desc) r), '[]'::jsonb),
    'notes', coalesce((select jsonb_agg(jsonb_build_object('at', created_at, 'action', action, 'reason', reason, 'note', note) order by created_at desc) from (
      select * from public.too_cancel_feedback where note is not null order by created_at desc limit 20) n), '[]'::jsonb),
    'onboarded', (select count(*) from public.too_onboarding),
    'hours_total', round(coalesce((select sum(minutes) from public.too_time_saved), 0) / 60.0, 1),
    'mail', coalesce((select jsonb_agg(jsonb_build_object('kind', kind, 'status', status, 'n', n)) from (
      select kind, status, count(*) n from public.too_mail_log where created_at > now() - interval '30 days' group by kind, status) q), '[]'::jsonb),
    'mail_ready', coalesce((select value = 'true'::jsonb from public.too_settings where key = 'mail_ready'), false));
end $$;

create or replace function public.too_ret_admin_mail_log() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.too_admin_check();
  return coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'at', l.created_at, 'kind', l.kind, 'status', l.status, 'ref', l.ref, 'vars', l.vars,
      'name', p.full_name, 'email', p.email) order by l.created_at desc)
    from (select * from public.too_mail_log order by created_at desc limit 150) l left join public.too_profiles p on p.id = l.user_id), '[]'::jsonb);
end $$;

-- "Run now" from the admin panel (same job as the daily schedule).
create or replace function public.too_ret_admin_run() returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.too_admin_check();
  return public.too_retention_run();
end $$;

-- Who may call what: members call only the functions that check auth.uid() themselves; the job and helpers are internal.
revoke execute on function public.too_last_act(uuid), public.too_streak(uuid), public.too_badges_sync(uuid, int), public.too_cycle(uuid),
  public.too_retention_run() from public, anon, authenticated;
revoke execute on function public.too_ret_me(), public.too_onboarding_save(text, text, int, text, boolean), public.too_path_mark(int, boolean),
  public.too_drop_mark(int, boolean), public.too_time_add(text, int), public.too_cancel_reasoned(text, text), public.too_pause(text, text),
  public.too_resume(), public.too_ret_admin(), public.too_ret_admin_mail_log(), public.too_ret_admin_run() from public, anon;
grant execute on function public.too_ret_me(), public.too_onboarding_save(text, text, int, text, boolean), public.too_path_mark(int, boolean),
  public.too_drop_mark(int, boolean), public.too_time_add(text, int), public.too_cancel_reasoned(text, text), public.too_pause(text, text),
  public.too_resume(), public.too_ret_admin(), public.too_ret_admin_mail_log(), public.too_ret_admin_run() to authenticated;
