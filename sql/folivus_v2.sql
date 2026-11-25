-- Lawyers directory data model, phase 1 (25.11.2026; the brand name is temporary).
-- NOT APPLIED YET: applying it was stopped by the permission system on 25.11.2026; it waits for approval. Shared Supabase project mgjmnvpnovkewvqevjmz.
-- Rules: every object is prefixed fol_; RLS on every table; the public (anon) role can only READ published rows and
-- only the columns listed below; all writes from the site go through public.fol_submit (security definer, validated,
-- rate limited). Admin edits are done with the service role (dashboard / server tasks), never from the browser.
-- public.docs is not touched by this file.

-- ---------- reference tables ----------
create table if not exists public.fol_areas (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,                 -- "מקרקעין ונדל""ן"
  lawyer_title text not null,         -- "עורך דין מקרקעין" (used in titles and H1)
  grp text not null,                  -- group shown on the areas index
  sort int not null default 100,
  intro text,                         -- 1 to 2 sentence summary
  guide_md text,                      -- the long guide on the area page (markdown, our own text)
  faq jsonb not null default '[]'::jsonb,   -- [{q,a}]
  published boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.fol_cities (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  region text not null,
  sort int not null default 100,
  published boolean not null default true
);

create table if not exists public.fol_plans (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  tier int not null default 0,
  price_year int,                     -- ILS per year before VAT; null = not published yet
  price_note text,
  features jsonb not null default '[]'::jsonb,
  is_final boolean not null default false,   -- false = placeholder, waiting for the owner's approval
  sort int not null default 100,
  active boolean not null default true
);

create table if not exists public.fol_authors (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  role text,                          -- "עורכת דין, חברת לשכת עורכי הדין משנת 2012"
  bio text,
  photo_url text,
  same_as jsonb not null default '[]'::jsonb,  -- public profile links (LinkedIn etc.)
  is_sample boolean not null default false
);

-- ---------- firms ----------
create table if not exists public.fol_firms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,80}$'),
  name text not null,
  city_slug text references public.fol_cities(slug),
  address text,
  phone text,
  website text,
  areas text[] not null default '{}',
  hours jsonb,                        -- {"sun":"09:00-18:00",...}; null = unknown
  source text not null default 'public' check (source in ('public','self','claimed','sample')),
  source_url text,
  collected_at timestamptz,
  is_sample boolean not null default false,
  claimed boolean not null default false,
  claimed_at timestamptz,
  plan text not null default 'free' references public.fol_plans(id),
  plan_until date,
  featured_areas text[] not null default '{}',
  featured_cities text[] not null default '{}',
  extended jsonb not null default '{}'::jsonb,  -- paid/claimed profile: description, logo, photos, video, cases, whatsapp, languages, founded
  -- Google rating fields (owner decision 25.11.2026). Shown only when the site switch show_google_ratings is on
  -- (OFF by default), with "דירוג מגוגל" attribution. No API calls or billing until the owner approves the cost.
  -- NOTE: the legal research found that Google Maps Platform terms restrict storing ratings/review counts and using
  -- Places data in a directory; check the terms (or a licensed source) before turning the switch on.
  google_place_id text,
  google_rating numeric(2,1),
  google_reviews_count int,
  google_checked_at timestamptz,
  status text not null default 'published' check (status in ('published','hidden','removed')),
  removal_requested_at timestamptz,
  removed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fol_firms_city on public.fol_firms(city_slug);
create index if not exists fol_firms_areas on public.fol_firms using gin(areas);

create table if not exists public.fol_reviews (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.fol_firms(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  title text,
  body text not null,
  author_display text not null,       -- first name + initial
  area_slug text,
  verified_method text check (verified_method in ('phone_otp','invite','document')),
  verified_at timestamptz,
  phone_hash text,                    -- never exposed
  firm_reply text,
  status text not null default 'pending' check (status in ('pending','published','rejected')),
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  published_at timestamptz
);
create index if not exists fol_reviews_firm on public.fol_reviews(firm_id);

-- ---------- content ----------
create table if not exists public.fol_articles (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,90}$'),
  title text not null,
  description text not null,
  kind text not null default 'article' check (kind in ('article','guide')),
  area_slug text references public.fol_areas(slug),
  author_slug text not null references public.fol_authors(slug),
  reviewer_slug text references public.fol_authors(slug),
  body_md text not null,
  sources jsonb not null default '[]'::jsonb,   -- [{title,url}]
  faq jsonb not null default '[]'::jsonb,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  is_sample boolean not null default false,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.fol_tools (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  category text not null,
  kind text not null check (kind in ('calculator','generator')),
  description text not null,
  area_slug text references public.fol_areas(slug),
  status text not null default 'planned' check (status in ('live','planned')),
  sources jsonb not null default '[]'::jsonb,
  sort int not null default 100,
  updated_at timestamptz not null default now()
);

create table if not exists public.fol_settings (
  key text primary key, value jsonb not null, updated_at timestamptz not null default now()
);
-- seeded: ('show_google_ratings', 'false')

create table if not exists public.fol_courts (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  name text not null,
  kind text not null check (kind in ('magistrate','district','family','labor','other')),
  city_slug text references public.fol_cities(slug),
  address text,
  source_url text,                    -- official page the details were checked against
  notes text,
  verified_at date,
  sponsor_firm_ids uuid[] not null default '{}',
  published boolean not null default true
);

-- ---------- private inboxes (no public read) ----------
-- fol_leads = the site's own contact form only. The site is a directory: it never routes inquiries to a chosen
-- firm and never charges per inquiry; visitors contact firms directly with the firm's public details.
create table if not exists public.fol_leads (
  id uuid primary key default gen_random_uuid(),
  topic text,
  name text not null, phone text not null, email text, message text,
  consent boolean not null default false,
  page text, ip_hash text,
  status text not null default 'new' check (status in ('new','sent','closed','spam')),
  created_at timestamptz not null default now()
);
create table if not exists public.fol_removals (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.fol_firms(id) on delete set null,
  firm_slug text, kind text not null check (kind in ('remove','fix')),
  requester_name text not null, role text, email text, phone text, details text,
  ip_hash text,
  status text not null default 'new' check (status in ('new','done','rejected')),
  created_at timestamptz not null default now(), handled_at timestamptz
);
create table if not exists public.fol_claims (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid references public.fol_firms(id) on delete set null,
  firm_slug text, name text not null, email text not null, phone text, license_no text,
  method text check (method in ('email_domain','phone_call','document')),
  ip_hash text,
  status text not null default 'new' check (status in ('new','approved','rejected')),
  created_at timestamptz not null default now(), handled_at timestamptz
);
create table if not exists public.fol_orders (
  id uuid primary key default gen_random_uuid(),
  plan_id text references public.fol_plans(id),
  firm_id uuid references public.fol_firms(id) on delete set null,
  firm_name text not null, contact_name text not null, email text not null, phone text not null,
  areas text[] not null default '{}', cities text[] not null default '{}',
  note text, amount int, installments int,
  ip_hash text,
  status text not null default 'new' check (status in ('new','contacted','paid','cancelled')),
  created_at timestamptz not null default now()
);

-- ---------- row level security ----------
do $$ declare t text; begin
  foreach t in array array['fol_settings','fol_areas','fol_cities','fol_plans','fol_authors','fol_firms','fol_reviews','fol_articles',
                           'fol_tools','fol_courts','fol_leads','fol_removals','fol_claims','fol_orders'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- public read, published rows only, listed columns only
grant select on public.fol_settings, public.fol_areas, public.fol_cities, public.fol_plans, public.fol_authors, public.fol_tools, public.fol_courts
  to anon, authenticated;
grant select (slug, title, description, kind, area_slug, author_slug, reviewer_slug, body_md, sources, faq, cover_url,
              is_sample, published_at, updated_at) on public.fol_articles to anon, authenticated;
grant select (id, slug, name, city_slug, address, phone, website, areas, hours, source, source_url, collected_at, is_sample,
              claimed, plan, plan_until, featured_areas, featured_cities, extended, google_place_id, google_rating, google_reviews_count, google_checked_at, updated_at) on public.fol_firms to anon, authenticated;
grant select (id, firm_id, rating, title, body, author_display, area_slug, verified_method, verified_at, firm_reply,
              is_sample, published_at) on public.fol_reviews to anon, authenticated;

drop policy if exists fol_read on public.fol_settings; create policy fol_read on public.fol_settings for select to anon, authenticated using (true);
insert into public.fol_settings(key, value) values ('show_google_ratings', 'false'::jsonb) on conflict (key) do nothing;
drop policy if exists fol_read on public.fol_areas;    create policy fol_read on public.fol_areas    for select to anon, authenticated using (published);
drop policy if exists fol_read on public.fol_cities;   create policy fol_read on public.fol_cities   for select to anon, authenticated using (published);
drop policy if exists fol_read on public.fol_plans;    create policy fol_read on public.fol_plans    for select to anon, authenticated using (active);
drop policy if exists fol_read on public.fol_authors;  create policy fol_read on public.fol_authors  for select to anon, authenticated using (true);
drop policy if exists fol_read on public.fol_tools;    create policy fol_read on public.fol_tools    for select to anon, authenticated using (true);
drop policy if exists fol_read on public.fol_courts;   create policy fol_read on public.fol_courts   for select to anon, authenticated using (published);
drop policy if exists fol_read on public.fol_articles; create policy fol_read on public.fol_articles for select to anon, authenticated using (status = 'published');
drop policy if exists fol_read on public.fol_firms;    create policy fol_read on public.fol_firms    for select to anon, authenticated using (status = 'published');
drop policy if exists fol_read on public.fol_reviews;  create policy fol_read on public.fol_reviews  for select to anon, authenticated using (status = 'published' and verified_at is not null);
-- fol_leads, fol_removals, fol_claims, fol_orders: no policy at all = no access for anon/authenticated.

-- ---------- the one write path ----------
create or replace function public.fol_clean(x text, n int) returns text language sql immutable set search_path = pg_catalog as $$
  select nullif(left(btrim(regexp_replace(coalesce(x, ''), E'[\\x01-\\x09\\x0b-\\x1f\\x7f]', ' ', 'g')), n), '') $$;

create or replace function public.fol_submit(kind text, p jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions, pg_temp as $$
declare
  hdr jsonb := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb);
  ip text := coalesce(hdr->>'cf-connecting-ip', split_part(coalesce(hdr->>'x-forwarded-for', ''), ',', 1), 'none');
  iph text := encode(extensions.digest(ip || ':fol:' || to_char(now(), 'YYYY-MM-DD'), 'sha256'), 'hex');
  nm text := public.fol_clean(p->>'name', 80);
  ph text := regexp_replace(coalesce(p->>'phone', ''), '[^0-9+]', '', 'g');
  em text := lower(public.fol_clean(p->>'email', 120));
  fid uuid; fslug text := public.fol_clean(p->>'firm', 80); recent int; newid uuid;
begin
  -- honeypot: bots fill the hidden field; answer ok and store nothing
  if coalesce(p->>'website_hp', '') <> '' then return jsonb_build_object('ok', true); end if;
  if kind not in ('lead','removal','claim','order') then return jsonb_build_object('ok', false, 'error', 'kind'); end if;

  -- rate limits: 5 per hour per visitor and kind, 300 per hour overall
  select count(*) into recent from (
    select created_at, ip_hash from public.fol_leads union all select created_at, ip_hash from public.fol_removals
    union all select created_at, ip_hash from public.fol_claims union all select created_at, ip_hash from public.fol_orders) x
    where x.created_at > now() - interval '1 hour' and x.ip_hash = iph;
  if recent >= 5 then return jsonb_build_object('ok', false, 'error', 'rate'); end if;
  select count(*) into recent from public.fol_leads where created_at > now() - interval '1 hour';
  if recent >= 300 then return jsonb_build_object('ok', false, 'error', 'busy'); end if;

  if nm is null or length(nm) < 2 then return jsonb_build_object('ok', false, 'error', 'name'); end if;
  if ph <> '' and ph !~ '^(\+?972|0)[2-9][0-9]{7,8}$' then return jsonb_build_object('ok', false, 'error', 'phone'); end if;
  if em is not null and em !~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$' then return jsonb_build_object('ok', false, 'error', 'email'); end if;
  if fslug is not null then select id into fid from public.fol_firms where slug = fslug; end if;

  if kind = 'lead' then
    if ph = '' then return jsonb_build_object('ok', false, 'error', 'phone'); end if;
    if coalesce((p->>'consent')::boolean, false) is not true then return jsonb_build_object('ok', false, 'error', 'consent'); end if;
    insert into public.fol_leads(topic, name, phone, email, message, consent, page, ip_hash)
    values (public.fol_clean(p->>'topic', 60), nm, ph, em,
            public.fol_clean(p->>'message', 1500), true, public.fol_clean(p->>'page', 200), iph) returning id into newid;
  elsif kind = 'removal' then
    if em is null and ph = '' then return jsonb_build_object('ok', false, 'error', 'contact'); end if;
    insert into public.fol_removals(firm_id, firm_slug, kind, requester_name, role, email, phone, details, ip_hash)
    values (fid, fslug, case when p->>'type' = 'fix' then 'fix' else 'remove' end, nm, public.fol_clean(p->>'role', 60), em,
            nullif(ph, ''), public.fol_clean(p->>'details', 1500), iph) returning id into newid;
  elsif kind = 'claim' then
    if em is null then return jsonb_build_object('ok', false, 'error', 'email'); end if;
    insert into public.fol_claims(firm_id, firm_slug, name, email, phone, license_no, method, ip_hash)
    values (fid, fslug, nm, em, nullif(ph, ''), public.fol_clean(p->>'license', 20),
            case when p->>'method' in ('email_domain','phone_call','document') then p->>'method' else 'phone_call' end, iph)
    returning id into newid;
  elsif kind = 'order' then
    if em is null or ph = '' then return jsonb_build_object('ok', false, 'error', 'contact'); end if;
    insert into public.fol_orders(plan_id, firm_id, firm_name, contact_name, email, phone, note, ip_hash)
    values ((select id from public.fol_plans where id = p->>'plan' and active), fid,
            coalesce(public.fol_clean(p->>'firmName', 120), nm), nm, em, ph, public.fol_clean(p->>'note', 1000), iph)
    returning id into newid;
  end if;
  return jsonb_build_object('ok', true, 'id', newid);
end $$;

revoke all on function public.fol_submit(text, jsonb) from public;
grant execute on function public.fol_submit(text, jsonb) to anon, authenticated;
revoke all on function public.fol_clean(text, int) from public, anon, authenticated;
