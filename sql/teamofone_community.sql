-- Team of One: community feed, live sessions, free challenge.
-- Members (too_has_access) read and write the community; everyone signed in sees the challenge;
-- live room links are only handed out through too_event_join, never selectable directly.

create table if not exists public.too_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text,
  kind text not null default 'post' check (kind in ('post','question','win','announce')),
  title text check (title is null or char_length(title) <= 140),
  body text not null check (char_length(body) between 2 and 5000),
  pinned boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.too_comments (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.too_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  author_name text,
  body text not null check (char_length(body) between 1 and 2000),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists public.too_likes (
  post_id bigint not null references public.too_posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);
create index if not exists too_posts_created on public.too_posts (pinned desc, created_at desc);
create index if not exists too_comments_post on public.too_comments (post_id, created_at);

-- author name comes from the profile, never from the client; simple flood limit
create or replace function public.too_post_stamp() returns trigger
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'not_signed_in'; end if;
  if not (public.too_has_access(new.user_id) or public.too_is_admin()) then raise exception 'no_access'; end if;
  if exists (select 1 from public.too_profiles where id = new.user_id and blocked) then raise exception 'blocked'; end if;
  select coalesce(nullif(split_part(full_name,' ',1),''),'חבר בקהילה') into new.author_name from public.too_profiles where id = new.user_id;
  if new.author_name is null then new.author_name := 'צוות Team of One'; end if;
  if tg_table_name = 'too_posts' then
    select count(*) into n from public.too_posts where user_id = new.user_id and created_at > now() - interval '1 hour';
    if n >= 8 then raise exception 'rate'; end if;
    if new.kind = 'announce' and not public.too_is_admin() then new.kind := 'post'; end if;
    if not public.too_is_admin() then new.pinned := false; end if;
    new.hidden := false; new.created_at := now();
  else
    select count(*) into n from public.too_comments where user_id = new.user_id and created_at > now() - interval '1 hour';
    if n >= 30 then raise exception 'rate'; end if;
    new.hidden := false; new.created_at := now();
  end if;
  return new;
end $$;
drop trigger if exists too_posts_stamp on public.too_posts;
create trigger too_posts_stamp before insert on public.too_posts for each row execute function public.too_post_stamp();
drop trigger if exists too_comments_stamp on public.too_comments;
create trigger too_comments_stamp before insert on public.too_comments for each row execute function public.too_post_stamp();

alter table public.too_posts enable row level security;
alter table public.too_comments enable row level security;
alter table public.too_likes enable row level security;

drop policy if exists too_posts_read on public.too_posts;
create policy too_posts_read on public.too_posts for select to authenticated
  using (public.too_is_admin() or (public.too_has_access(auth.uid()) and (not hidden or user_id = auth.uid())));
drop policy if exists too_posts_insert on public.too_posts;
create policy too_posts_insert on public.too_posts for insert to authenticated
  with check (public.too_has_access(auth.uid()) or public.too_is_admin());
drop policy if exists too_posts_own_delete on public.too_posts;
create policy too_posts_own_delete on public.too_posts for delete to authenticated
  using (user_id = auth.uid() or public.too_is_admin());
drop policy if exists too_posts_admin_update on public.too_posts;
create policy too_posts_admin_update on public.too_posts for update to authenticated
  using (public.too_is_admin()) with check (public.too_is_admin());

drop policy if exists too_comments_read on public.too_comments;
create policy too_comments_read on public.too_comments for select to authenticated
  using (public.too_is_admin() or (public.too_has_access(auth.uid()) and (not hidden or user_id = auth.uid())));
drop policy if exists too_comments_insert on public.too_comments;
create policy too_comments_insert on public.too_comments for insert to authenticated
  with check (public.too_has_access(auth.uid()) or public.too_is_admin());
drop policy if exists too_comments_own_delete on public.too_comments;
create policy too_comments_own_delete on public.too_comments for delete to authenticated
  using (user_id = auth.uid() or public.too_is_admin());
drop policy if exists too_comments_admin_update on public.too_comments;
create policy too_comments_admin_update on public.too_comments for update to authenticated
  using (public.too_is_admin()) with check (public.too_is_admin());

drop policy if exists too_likes_read on public.too_likes;
create policy too_likes_read on public.too_likes for select to authenticated
  using (public.too_has_access(auth.uid()) or public.too_is_admin());
drop policy if exists too_likes_write on public.too_likes;
create policy too_likes_write on public.too_likes for insert to authenticated
  with check (user_id = auth.uid() and (public.too_has_access(auth.uid()) or public.too_is_admin()));
drop policy if exists too_likes_delete on public.too_likes;
create policy too_likes_delete on public.too_likes for delete to authenticated using (user_id = auth.uid());

-- live sessions
create table if not exists public.too_events (
  id bigint generated always as identity primary key,
  title text not null check (char_length(title) <= 160),
  description text check (description is null or char_length(description) <= 3000),
  starts_at timestamptz not null,
  duration_min int not null default 60 check (duration_min between 10 and 300),
  audience text not null default 'members' check (audience in ('members','public')),
  room text,
  recording_url text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.too_events enable row level security;
drop policy if exists too_events_read on public.too_events;
create policy too_events_read on public.too_events for select to anon, authenticated
  using (public.too_is_admin() or (published and (audience = 'public' or public.too_has_access(auth.uid()))));
drop policy if exists too_events_admin on public.too_events;
create policy too_events_admin on public.too_events for all to authenticated
  using (public.too_is_admin()) with check (public.too_is_admin());
-- the room link and the recording are not selectable; they come from too_event_join
revoke select on public.too_events from anon, authenticated;
grant select (id, title, description, starts_at, duration_min, audience, published, created_at) on public.too_events to anon, authenticated;
grant insert, update, delete on public.too_events to authenticated;

create or replace function public.too_event_join(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.too_events; uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_signed_in'; end if;
  select * into e from public.too_events where id = p_id and published;
  if not found then raise exception 'not_found'; end if;
  if not (public.too_is_admin() or e.audience = 'public' or public.too_has_access(uid)) then raise exception 'no_access'; end if;
  return jsonb_build_object(
    'room', case when now() > e.starts_at - interval '15 minutes' and now() < e.starts_at + make_interval(mins => e.duration_min + 30) then e.room else null end,
    'opens_at', e.starts_at - interval '15 minutes',
    'recording', e.recording_url);
end $$;
revoke all on function public.too_event_join(bigint) from public, anon;
grant execute on function public.too_event_join(bigint) to authenticated;

-- admin needs the room/recording columns: read them through a function
create or replace function public.too_admin_events() returns setof public.too_events
language sql security definer set search_path = public as $$
  select * from public.too_events where public.too_is_admin() order by starts_at desc
$$;
revoke all on function public.too_admin_events() from public, anon;
grant execute on function public.too_admin_events() to authenticated;
