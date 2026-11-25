-- Lawyers directory (working name, temporary brand): commerce and operations layer (25.11.2026).
-- Applied on top of sql/folivus_v2.sql. Everything here is prefixed fol_. public.docs is not touched.
-- Rules: RLS on every table; anon/authenticated get NO direct table access to anything new. The site reads public
-- data only through security definer functions (fol_public_slots, fol_public_sponsored) and writes only through the
-- edge function fol-api (service role, validated, rate limited). Payment fulfillment (fol_fulfill) is service role only.
-- TEST MODE: fol_settings.test_mode = true until the owner approves launch (no real charges, mail only to test addresses).

-- ---------- settings ----------
insert into public.fol_settings(key, value) values
  ('test_mode', 'true'::jsonb),
  ('launch', '{"domain":"","live":false,"pages":""}'::jsonb),
  -- from: the sender (set at launch, after the domain is verified in Resend). test_to: the only addresses that may get
  -- real mail while test_mode is on. admin_to: where admin notifications go.
  ('mail', '{"from":"","reply_to":"","test_to":[],"admin_to":[]}'::jsonb),
  ('pay', '{"vat_rate":0.18,"max_installments":12,"provider":"morning"}'::jsonb),
  ('limits', '{"listing_per_page":6,"home_slots":6,"court_firms":3,"court_providers":4,"tool_sponsors":1}'::jsonb),
  ('notify', '{"telegram":false}'::jsonb)
on conflict (key) do nothing;
-- settings hold private values now (test addresses): the public may read only the switches the site needs
drop policy if exists fol_read on public.fol_settings;
create policy fol_read on public.fol_settings for select to anon, authenticated using (key in ('show_google_ratings', 'test_mode'));

-- ---------- products ----------
alter table public.fol_plans add column if not exists kind text not null default 'listing';
alter table public.fol_plans add column if not exists unit text not null default 'year';
alter table public.fol_plans add column if not exists unit_price int;          -- ILS before VAT per unit
alter table public.fol_plans add column if not exists period_months int not null default 12;
alter table public.fol_plans add column if not exists limits jsonb not null default '{}'::jsonb;
do $$ begin
  alter table public.fol_plans add constraint fol_plans_kind_check check (kind in ('free','listing','court','tool','article','provider'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.fol_plans add constraint fol_plans_unit_check check (unit in ('year','month','item'));
exception when duplicate_object then null; end $$;
-- local = 1 area in 1 city; regional = up to 3 area+city pairs; national = 1 area on the nationwide area page + home page
update public.fol_plans set kind = 'free', unit = 'year', unit_price = 0, limits = '{}'::jsonb where id = 'free';
update public.fol_plans set kind = 'listing', unit = 'year', unit_price = price_year, period_months = 12,
  limits = '{"slots":1,"scope":"city"}'::jsonb where id = 'local';
update public.fol_plans set kind = 'listing', unit = 'year', unit_price = price_year, period_months = 12,
  limits = '{"slots":3,"scope":"city"}'::jsonb where id = 'regional';
update public.fol_plans set kind = 'listing', unit = 'year', unit_price = price_year, period_months = 12,
  limits = '{"slots":1,"scope":"nationwide","home":true}'::jsonb where id = 'national';
update public.fol_plans set kind = 'court', unit = 'year', unit_price = price_year, period_months = 12,
  limits = '{"per_target":3}'::jsonb where id = 'court-page';
update public.fol_plans set kind = 'tool', unit = 'year', unit_price = price_year, period_months = 12,
  limits = '{"per_target":1}'::jsonb where id = 'tool-sponsor';
update public.fol_plans set kind = 'article', unit = 'item', unit_price = price_year, period_months = 12,
  limits = '{}'::jsonb where id = 'sponsored-article';
update public.fol_plans set kind = 'provider', unit = 'month', unit_price = 350, period_months = 1,
  limits = '{"per_target":4,"months":[1,3,6,12]}'::jsonb where id = 'service-provider';

-- ---------- firms: extra columns ----------
alter table public.fol_firms add column if not exists extended_enabled boolean not null default false;
alter table public.fol_firms add column if not exists featured_slots jsonb not null default '[]'::jsonb; -- [{"area":"x","city":"y"|null,"home":bool}]
alter table public.fol_firms add column if not exists review_avg numeric(2,1);
alter table public.fol_firms add column if not exists review_count int not null default 0;
alter table public.fol_firms add column if not exists rank_score numeric(6,4);
alter table public.fol_firms add column if not exists hidden_reason text;
alter table public.fol_firms add column if not exists is_test boolean not null default false;
grant select (extended_enabled, featured_slots, review_avg, review_count, rank_score) on public.fol_firms to anon, authenticated;

-- ---------- orders ----------
alter table public.fol_orders drop constraint if exists fol_orders_status_check;
alter table public.fol_orders add constraint fol_orders_status_check
  check (status in ('new','contacted','pending','paid','review','failed','cancelled'));
alter table public.fol_orders add column if not exists kind text;
alter table public.fol_orders add column if not exists target text;                 -- court / tool slug
alter table public.fol_orders add column if not exists slots jsonb not null default '[]'::jsonb; -- listing: [{"area","city"}]
alter table public.fol_orders add column if not exists months int;
alter table public.fol_orders add column if not exists net_ils numeric(10,2);
alter table public.fol_orders add column if not exists vat_ils numeric(10,2);
alter table public.fol_orders add column if not exists total_ils numeric(10,2);
alter table public.fol_orders add column if not exists user_id uuid;
alter table public.fol_orders add column if not exists pay_key_hash text;
alter table public.fol_orders add column if not exists provider text;                -- 'morning' | 'test' | 'manual'
alter table public.fol_orders add column if not exists provider_ref text;
alter table public.fol_orders add column if not exists provider_doc text;
alter table public.fol_orders add column if not exists paid_amount numeric(10,2);
alter table public.fol_orders add column if not exists paid_at timestamptz;
alter table public.fol_orders add column if not exists renewal_of uuid;
alter table public.fol_orders add column if not exists details jsonb not null default '{}'::jsonb; -- firm details for a new firm
alter table public.fol_orders add column if not exists advertiser jsonb not null default '{}'::jsonb; -- service provider ad
alter table public.fol_orders add column if not exists brief jsonb not null default '{}'::jsonb;     -- sponsored article brief
alter table public.fol_orders add column if not exists result jsonb not null default '{}'::jsonb;
alter table public.fol_orders add column if not exists is_test boolean not null default false;
alter table public.fol_orders add column if not exists updated_at timestamptz not null default now();
create index if not exists fol_orders_status on public.fol_orders(status, created_at);

-- ---------- placements: every paid slot, with its own end date ----------
create table if not exists public.fol_placements (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.fol_orders(id) on delete set null,
  firm_id uuid references public.fol_firms(id) on delete cascade,
  plan_id text not null references public.fol_plans(id),
  kind text not null check (kind in ('listing','court','tool','article','provider')),
  target text,
  area_slug text,
  city_slug text,                        -- listing: null = the nationwide area page
  home boolean not null default false,   -- national: also on the home page
  advertiser jsonb not null default '{}'::jsonb,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  status text not null default 'active' check (status in ('active','expired','cancelled')),
  reminders jsonb not null default '{}'::jsonb,   -- {"30": ts, "7": ts, "1": ts}
  renew_token_hash text,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists fol_placements_active on public.fol_placements(kind, target, area_slug, city_slug) where status = 'active';
create index if not exists fol_placements_firm on public.fol_placements(firm_id);
create index if not exists fol_placements_end on public.fol_placements(ends_at) where status = 'active';

-- ---------- owners, admins ----------
create table if not exists public.fol_firm_users (
  firm_id uuid not null references public.fol_firms(id) on delete cascade,
  user_id uuid not null,
  email text,
  role text not null default 'owner' check (role in ('owner','editor')),
  created_at timestamptz not null default now(),
  primary key (firm_id, user_id)
);
create index if not exists fol_firm_users_user on public.fol_firm_users(user_id);
create table if not exists public.fol_admins (
  user_id uuid primary key,
  email text,
  created_at timestamptz not null default now()
);

-- ---------- one-time codes (claims, reviews, removal requests) ----------
create table if not exists public.fol_codes (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('claim','review','removal')),
  ref_id uuid not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists fol_codes_ref on public.fol_codes(purpose, ref_id);

-- ---------- claims ----------
alter table public.fol_claims drop constraint if exists fol_claims_method_check;
alter table public.fol_claims add constraint fol_claims_method_check check (method in ('email_domain','email_code','phone_call','document'));
alter table public.fol_claims drop constraint if exists fol_claims_status_check;
alter table public.fol_claims add constraint fol_claims_status_check check (status in ('new','verified','approved','rejected'));
alter table public.fol_claims add column if not exists user_id uuid;
alter table public.fol_claims add column if not exists verified_at timestamptz;
alter table public.fol_claims add column if not exists domain_match boolean not null default false;
alter table public.fol_claims add column if not exists admin_note text;
alter table public.fol_claims add column if not exists is_test boolean not null default false;

-- ---------- profile drafts (firm edits before the automatic checks) ----------
create table if not exists public.fol_profile_drafts (
  firm_id uuid primary key references public.fol_firms(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft','rejected','published')),
  issues jsonb not null default '[]'::jsonb,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

-- ---------- reviews ----------
alter table public.fol_reviews drop constraint if exists fol_reviews_status_check;
alter table public.fol_reviews add constraint fol_reviews_status_check check (status in ('unverified','pending','held','published','rejected','hidden'));
alter table public.fol_reviews drop constraint if exists fol_reviews_verified_method_check;
alter table public.fol_reviews add constraint fol_reviews_verified_method_check check (verified_method in ('phone_otp','invite','document','email_code'));
alter table public.fol_reviews add column if not exists email_hash text;
alter table public.fol_reviews add column if not exists ip_hash text;
alter table public.fol_reviews add column if not exists invite_id uuid;
alter table public.fol_reviews add column if not exists moderation jsonb not null default '[]'::jsonb;
alter table public.fol_reviews add column if not exists reply_at timestamptz;
alter table public.fol_reviews add column if not exists is_test boolean not null default false;
create table if not exists public.fol_review_invites (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.fol_firms(id) on delete cascade,
  token_hash text not null unique,
  created_by uuid,
  expires_at timestamptz not null,
  used_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- removal / fix requests ----------
alter table public.fol_removals drop constraint if exists fol_removals_status_check;
alter table public.fol_removals add constraint fol_removals_status_check check (status in ('new','verified','hidden','done','rejected'));
alter table public.fol_removals add column if not exists verified_at timestamptz;
alter table public.fol_removals add column if not exists owner_verified boolean not null default false;
alter table public.fol_removals add column if not exists due_at timestamptz;
alter table public.fol_removals add column if not exists ack_at timestamptz;
alter table public.fol_removals add column if not exists admin_note text;
alter table public.fol_removals add column if not exists is_test boolean not null default false;

-- ---------- sponsored articles ----------
create table if not exists public.fol_sponsored (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.fol_orders(id) on delete set null,
  placement_id uuid references public.fol_placements(id) on delete set null,
  firm_id uuid references public.fol_firms(id) on delete cascade,
  slug text unique check (slug ~ '^[a-z0-9-]{2,90}$'),
  title text,
  brief jsonb not null default '{}'::jsonb,
  body_md text,
  status text not null default 'brief' check (status in ('brief','awaiting_firm','changes','approved','published','expired','rejected')),
  approve_token_hash text,
  firm_note text,
  approved_at timestamptz,
  published_at timestamptz,
  ends_at timestamptz,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- mail log / outbox, audit ----------
create table if not exists public.fol_mail_log (
  id uuid primary key default gen_random_uuid(),
  at timestamptz not null default now(),
  template text not null,
  to_hash text not null,
  to_masked text,
  subject text,
  html text,                 -- kept only while test mode is on (the outbox the owner can read in the admin page)
  status text not null check (status in ('sent','outbox','failed')),
  ref text,
  is_test boolean not null default false
);
create index if not exists fol_mail_log_at on public.fol_mail_log(at desc);
create table if not exists public.fol_audit (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid,
  action text not null,
  key text,                  -- hashed rate-limit key (ip / email), never the raw value
  detail jsonb not null default '{}'::jsonb
);
create index if not exists fol_audit_rate on public.fol_audit(action, key, at desc);

-- ---------- RLS on everything new; no direct access for anon/authenticated ----------
do $$ declare t text; begin
  foreach t in array array['fol_placements','fol_firm_users','fol_admins','fol_codes','fol_profile_drafts','fol_review_invites',
                           'fol_sponsored','fol_mail_log','fol_audit'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

-- ---------- functions ----------
create or replace function public.fol_is_admin(uid uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select uid is not null and exists (select 1 from public.fol_admins a where a.user_id = uid) $$;

create or replace function public.fol_setting(k text) returns jsonb
language sql stable security definer set search_path = public as $$ select value from public.fol_settings where key = k $$;

-- review score (published on the method page): Bayesian average with recency weight.
--   w = max(0.25, 0.5 ^ (age_days / 730))      (a review loses half its weight every two years, never below a quarter)
--   score = (3 x 4.0 + sum(w x rating)) / (3 + sum(w))
-- Only verified, published reviews count. Plans, payments and placements are not inputs.
create or replace function public.fol_score_refresh(p_firm uuid) returns jsonb
language plpgsql security definer set search_path = public as $$
declare sw numeric; swr numeric; n int; av numeric; sc numeric;
begin
  select coalesce(sum(w), 0), coalesce(sum(w * rating), 0), count(*), avg(rating)
    into sw, swr, n, av
    from (select rating, greatest(0.25, power(0.5, extract(epoch from (now() - coalesce(published_at, created_at))) / 86400.0 / 730.0)) w
            from public.fol_reviews where firm_id = p_firm and status = 'published' and verified_at is not null) x;
  sc := case when n = 0 then null else round((3 * 4.0 + swr) / (3 + sw), 4) end;
  update public.fol_firms set review_count = n, review_avg = case when n = 0 then null else round(av, 1) end, rank_score = sc
    where id = p_firm;
  return jsonb_build_object('count', n, 'avg', round(coalesce(av, 0), 1), 'score', sc);
end $$;

-- plan, plan_until, featured fields of a firm, from its active listing placements
create or replace function public.fol_firm_refresh(p_firm uuid) returns void
language plpgsql security definer set search_path = public as $$
declare best text; until_d date; fa text[]; fc text[]; fs jsonb; cl boolean; hc boolean;
begin
  select p.plan_id into best from public.fol_placements p join public.fol_plans pl on pl.id = p.plan_id
    where p.firm_id = p_firm and p.kind = 'listing' and p.target is distinct from 'card' and p.status = 'active' and p.ends_at > now()
    order by pl.tier desc limit 1;
  select max(ends_at)::date, coalesce(array_agg(distinct area_slug) filter (where area_slug is not null), '{}'),
         coalesce(array_agg(distinct city_slug) filter (where city_slug is not null), '{}'),
         coalesce(jsonb_agg(jsonb_build_object('area', area_slug, 'city', city_slug, 'home', home)), '[]'::jsonb)
    into until_d, fa, fc, fs
    from public.fol_placements where firm_id = p_firm and kind = 'listing' and target is distinct from 'card' and status = 'active' and ends_at > now();
  select claimed into cl from public.fol_firms where id = p_firm;
  select exists (select 1 from public.fol_placements where firm_id = p_firm and kind = 'listing' and target = 'card' and status = 'active' and ends_at > now()) into hc;
  update public.fol_firms set plan = coalesce(best, 'free'), plan_until = until_d, featured_areas = fa, featured_cities = fc,
    featured_slots = fs, extended_enabled = (best is not null) or hc or coalesce(cl, false), hide_others = hc, updated_at = now()
    where id = p_firm;
end $$;

-- is there room for one more placement in this slot (sold-out check, at checkout and again at payment)
create or replace function public.fol_slot_free(p_kind text, p_target text, p_area text, p_city text, p_home boolean, p_firm uuid)
returns text language plpgsql stable security definer set search_path = public as $$
declare lim jsonb := coalesce(public.fol_setting('limits'), '{}'::jsonb); n int; cap int;
begin
  if p_kind = 'listing' then
    if p_firm is not null and exists (select 1 from public.fol_placements where status = 'active' and kind = 'listing' and firm_id = p_firm
        and area_slug = p_area and city_slug is not distinct from p_city) then return 'own'; end if;
    select count(*) into n from public.fol_placements where status = 'active' and kind = 'listing' and area_slug = p_area
      and city_slug is not distinct from p_city;
    cap := coalesce((lim->>'listing_per_page')::int, 6);
    if n >= cap then return 'full'; end if;
    if p_home then
      select count(*) into n from public.fol_placements where status = 'active' and kind = 'listing' and home;
      if n >= coalesce((lim->>'home_slots')::int, 6) then return 'full'; end if;
    end if;
    return '';
  elsif p_kind in ('court','provider','tool') then
    if p_kind <> 'provider' and p_firm is not null and exists (select 1 from public.fol_placements where status = 'active' and kind = p_kind
        and target = p_target and firm_id = p_firm) then return 'own'; end if;
    select count(*) into n from public.fol_placements where status = 'active' and kind = p_kind and target = p_target;
    cap := case p_kind when 'court' then coalesce((lim->>'court_firms')::int, 3) when 'provider' then coalesce((lim->>'court_providers')::int, 4)
                       else coalesce((lim->>'tool_sponsors')::int, 1) end;
    return case when n >= cap then 'full' else '' end;
  end if;
  return '';
end $$;

-- AUTOMATIC FULFILLMENT after payment (or a no-charge test purchase). Service role only. Idempotent: a second call for
-- the same order changes nothing. A lower amount, or a slot that sold out meanwhile, sends the order to review.
create or replace function public.fol_fulfill(p_order uuid, p_amount numeric, p_ref text, p_doc text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare o public.fol_orders; pl public.fol_plans; fid uuid; f jsonb; st timestamptz; en timestamptz; mon int;
        s jsonb; why text; pid uuid; ids uuid[] := '{}'; prev public.fol_placements; sp uuid; isnat boolean;
begin
  select * into o from public.fol_orders where id = p_order for update;
  if not found then raise exception 'no_order'; end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', true, 'again', true, 'status', o.status); end if;
  select * into pl from public.fol_plans where id = o.plan_id;
  if not found then raise exception 'no_plan'; end if;
  if p_amount is not null and p_amount + 0.009 < o.total_ils then
    update public.fol_orders set status = 'review', paid_amount = p_amount, provider_ref = left(p_ref, 120), provider_doc = left(p_doc, 120),
      note = coalesce(note || ' | ', '') || 'שולם סכום נמוך מהמחיר', updated_at = now() where id = o.id;
    insert into public.fol_audit(action, detail) values ('pay_amount_mismatch', jsonb_build_object('order', o.id, 'paid', p_amount, 'price', o.total_ils));
    return jsonb_build_object('ok', false, 'review', true, 'why', 'amount');
  end if;
  perform pg_advisory_xact_lock(hashtext('fol_slots'));
  mon := case when pl.unit = 'month' then greatest(1, coalesce(o.months, 1)) else pl.period_months end;

  -- renewal: extend the same placement from its current end (or from today if it already ended)
  if o.renewal_of is not null then
    select * into prev from public.fol_placements where id = o.renewal_of for update;
    if not found then raise exception 'no_placement'; end if;
    if prev.status <> 'active' then
      why := public.fol_slot_free(prev.kind, prev.target, prev.area_slug, prev.city_slug, prev.home, null);
      if why = 'full' then
        update public.fol_orders set status = 'review', note = coalesce(note || ' | ', '') || 'המקום כבר תפוס', paid_amount = p_amount,
          provider_ref = left(p_ref, 120), updated_at = now() where id = o.id;
        return jsonb_build_object('ok', false, 'review', true, 'why', 'full');
      end if;
    end if;
    st := greatest(now(), prev.ends_at); en := st + make_interval(months => mon);
    update public.fol_placements set ends_at = en, status = 'active', reminders = '{}'::jsonb, renew_token_hash = null, updated_at = now()
      where id = prev.id;
    update public.fol_sponsored set ends_at = en, status = case when status = 'expired' then 'published' else status end, updated_at = now()
      where placement_id = prev.id;
    fid := prev.firm_id; ids := array[prev.id];
  else
    -- a new firm (bought without an existing listing): created from the order details, owned by the buyer
    fid := o.firm_id;
    if fid is null and pl.kind <> 'provider' then
      f := coalesce(o.details->'firm', '{}'::jsonb);
      insert into public.fol_firms(slug, name, city_slug, address, phone, website, areas, source, claimed, claimed_at, status, is_test)
      values ('firm-' || substr(md5(gen_random_uuid()::text), 1, 10), coalesce(nullif(f->>'name', ''), o.firm_name),
              nullif(f->>'city', ''), nullif(f->>'address', ''), coalesce(nullif(f->>'phone', ''), o.phone), nullif(f->>'website', ''),
              coalesce(array(select jsonb_array_elements_text(coalesce(f->'areas', '[]'::jsonb))), '{}'),
              'self', true, now(), 'published', o.is_test)
      returning id into fid;
      update public.fol_orders set firm_id = fid where id = o.id;
    end if;
    st := now(); en := st + make_interval(months => mon);
    -- every slot must still be free before anything is written
    if coalesce((pl.limits->>'card')::boolean, false) then
      select id into pid from public.fol_placements where status = 'active' and kind = 'listing' and target = 'card' and firm_id = fid limit 1;
      if pid is not null then
        update public.fol_placements set ends_at = ends_at + make_interval(months => mon), auto_renew = o.auto_renew,
          auto_renew_consent_at = o.auto_renew_consent_at, updated_at = now() where id = pid;
      else
        insert into public.fol_placements(order_id, firm_id, plan_id, kind, target, starts_at, ends_at, is_test, auto_renew, auto_renew_consent_at)
        values (o.id, fid, pl.id, 'listing', 'card', st, en, o.is_test, o.auto_renew, o.auto_renew_consent_at) returning id into pid;
      end if;
      ids := array[pid];
    elsif pl.kind = 'listing' then
      isnat := coalesce(pl.limits->>'scope', '') = 'nationwide';
      for s in select * from jsonb_array_elements(o.slots) loop
        why := public.fol_slot_free('listing', null, s->>'area', case when isnat then null else s->>'city' end, isnat and coalesce((pl.limits->>'home')::boolean, false), fid);
        if why = 'full' then
          update public.fol_orders set status = 'review', note = coalesce(note || ' | ', '') || 'מקום נתפס לפני התשלום', paid_amount = p_amount,
            provider_ref = left(p_ref, 120), updated_at = now() where id = o.id;
          return jsonb_build_object('ok', false, 'review', true, 'why', 'full');
        end if;
      end loop;
      for s in select * from jsonb_array_elements(o.slots) loop
        select id into pid from public.fol_placements where status = 'active' and kind = 'listing' and firm_id = fid
          and area_slug = s->>'area' and city_slug is not distinct from (case when isnat then null else s->>'city' end) limit 1;
        if pid is not null then   -- the firm already has this slot: extend it
          update public.fol_placements set ends_at = ends_at + make_interval(months => mon), plan_id = case when (select tier from public.fol_plans where id = plan_id) < pl.tier then pl.id else plan_id end,
            home = home or (isnat and coalesce((pl.limits->>'home')::boolean, false)), updated_at = now() where id = pid;
        else
          insert into public.fol_placements(order_id, firm_id, plan_id, kind, area_slug, city_slug, home, starts_at, ends_at, is_test)
          values (o.id, fid, pl.id, 'listing', s->>'area', case when isnat then null else s->>'city' end,
                  isnat and coalesce((pl.limits->>'home')::boolean, false), st, en, o.is_test) returning id into pid;
        end if;
        ids := ids || pid; pid := null;
      end loop;
    elsif pl.kind in ('court','tool','provider') then
      why := public.fol_slot_free(pl.kind, o.target, null, null, false, case when pl.kind = 'provider' then null else fid end);
      if why = 'full' then
        update public.fol_orders set status = 'review', note = coalesce(note || ' | ', '') || 'המקום נתפס לפני התשלום', paid_amount = p_amount,
          provider_ref = left(p_ref, 120), updated_at = now() where id = o.id;
        return jsonb_build_object('ok', false, 'review', true, 'why', 'full');
      elsif why = 'own' then
        select id into pid from public.fol_placements where status = 'active' and kind = pl.kind and target = o.target and firm_id = fid limit 1;
        update public.fol_placements set ends_at = ends_at + make_interval(months => mon), auto_renew = o.auto_renew,
          auto_renew_consent_at = o.auto_renew_consent_at, updated_at = now() where id = pid;
      else
        insert into public.fol_placements(order_id, firm_id, plan_id, kind, target, advertiser, starts_at, ends_at, is_test, auto_renew, auto_renew_consent_at)
        values (o.id, case when pl.kind = 'provider' then null else fid end, pl.id, pl.kind, o.target,
                case when pl.kind = 'provider' then o.advertiser else '{}'::jsonb end, st, en, o.is_test, o.auto_renew, o.auto_renew_consent_at) returning id into pid;
      end if;
      ids := array[pid];
    elsif pl.kind = 'article' then
      insert into public.fol_placements(order_id, firm_id, plan_id, kind, target, starts_at, ends_at, is_test)
      values (o.id, fid, pl.id, 'article', null, st, en, o.is_test) returning id into pid;
      insert into public.fol_sponsored(order_id, placement_id, firm_id, brief, status, ends_at, is_test)
      values (o.id, pid, fid, o.brief, 'brief', en, o.is_test) returning id into sp;
      update public.fol_placements set target = sp::text where id = pid;
      ids := array[pid];
    end if;
  end if;

  update public.fol_orders set status = 'paid', paid_at = now(), paid_amount = coalesce(p_amount, o.total_ils),
    provider_ref = left(p_ref, 120), provider_doc = left(p_doc, 120),
    result = jsonb_build_object('placements', to_jsonb(ids), 'ends_at', en, 'firm', fid), updated_at = now() where id = o.id;
  if fid is not null then perform public.fol_firm_refresh(fid); end if;
  insert into public.fol_audit(action, detail) values ('order_paid', jsonb_build_object('order', o.id, 'plan', o.plan_id, 'amount', o.total_ils, 'test', o.is_test));
  return jsonb_build_object('ok', true, 'firm', fid, 'placements', to_jsonb(ids), 'ends_at', en, 'kind', pl.kind, 'sponsored', sp);
end $$;

-- daily: end placements whose time is up and update their firms
create or replace function public.fol_expire() returns jsonb
language plpgsql security definer set search_path = public as $$
declare n int := 0; fid uuid; fids uuid[];
begin
  with x as (update public.fol_placements set status = 'expired', updated_at = now()
             where status = 'active' and ends_at <= now() returning id, firm_id)
  select count(*), array_agg(distinct firm_id) filter (where firm_id is not null) into n, fids from x;
  foreach fid in array coalesce(fids, '{}'::uuid[]) loop
    perform public.fol_firm_refresh(fid);
  end loop;
  update public.fol_sponsored s set status = 'expired', updated_at = now() from public.fol_placements p
    where s.placement_id = p.id and p.status = 'expired' and s.status = 'published';
  return jsonb_build_object('expired', n);
end $$;

-- PUBLIC: paid slots for one page (always labelled by the site). Daily rotation among equals; no ranking by money.
create or replace function public.fol_public_slots(p_kind text, p_target text default null, p_area text default null,
                                                    p_city text default null, p_test boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  with tm as (select coalesce((public.fol_setting('test_mode'))::text::boolean, false) on_)
  select coalesce(jsonb_agg(x order by x->>'rot'), '[]'::jsonb) from (
    select jsonb_build_object(
      'rot', md5(p.id::text || current_date::text),
      'label', case when p.kind = 'listing' then 'משרד מקודם' else 'מודעה' end,
      'test', p.is_test,
      'firm', case when f.id is null then null else jsonb_build_object('slug', f.slug, 'name', f.name, 'city', f.city_slug, 'phone', f.phone,
               'website', f.website, 'logo', f.extended->>'logo', 'review_avg', f.review_avg, 'review_count', f.review_count) end,
      'ad', case when p.kind = 'provider' then jsonb_build_object('name', p.advertiser->>'name', 'category', p.advertiser->>'category',
               'phone', p.advertiser->>'phone', 'website', p.advertiser->>'website', 'text', p.advertiser->>'text') else null end) x
    from public.fol_placements p left join public.fol_firms f on f.id = p.firm_id
    where p.status = 'active' and p.ends_at > now()
      and (not p.is_test or (p_test and (select on_ from tm)))
      and (p.firm_id is null or f.status = 'published')
      and case p_kind
        when 'listing' then p.kind = 'listing' and p.area_slug = p_area and p.city_slug is not distinct from p_city
        when 'home' then p.kind = 'listing' and p.home
        when 'court' then p.kind = 'court' and p.target = p_target
        when 'provider' then p.kind = 'provider' and p.target = p_target
        when 'tool' then p.kind = 'tool' and p.target = p_target
        else false end
  ) q $$;

create or replace function public.fol_public_sponsored(p_slug text default null, p_test boolean default false)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('slug', s.slug, 'title', s.title, 'body_md', case when p_slug is null then null else s.body_md end,
           'published_at', s.published_at, 'label', 'תוכן ממומן', 'test', s.is_test,
           'firm', jsonb_build_object('slug', f.slug, 'name', f.name, 'phone', f.phone, 'website', f.website)) order by s.published_at desc), '[]'::jsonb)
  from public.fol_sponsored s join public.fol_firms f on f.id = s.firm_id
  where s.status = 'published' and (s.ends_at is null or s.ends_at > now()) and f.status = 'published'
    and (p_slug is null or s.slug = p_slug)
    and (not s.is_test or (p_test and coalesce((public.fol_setting('test_mode'))::text::boolean, false))) $$;

-- grants: public functions to anon; everything else service role only
revoke all on function public.fol_is_admin(uuid) from public, anon, authenticated;
revoke all on function public.fol_setting(text) from public, anon, authenticated;
revoke all on function public.fol_score_refresh(uuid) from public, anon, authenticated;
revoke all on function public.fol_firm_refresh(uuid) from public, anon, authenticated;
revoke all on function public.fol_slot_free(text, text, text, text, boolean, uuid) from public, anon, authenticated;
revoke all on function public.fol_fulfill(uuid, numeric, text, text) from public, anon, authenticated;
revoke all on function public.fol_expire() from public, anon, authenticated;
revoke all on function public.fol_public_slots(text, text, text, text, boolean) from public;
revoke all on function public.fol_public_sponsored(text, boolean) from public;
grant execute on function public.fol_public_slots(text, text, text, text, boolean) to anon, authenticated;
grant execute on function public.fol_public_sponsored(text, boolean) to anon, authenticated;
grant execute on function public.fol_is_admin(uuid), public.fol_setting(text), public.fol_score_refresh(uuid), public.fol_firm_refresh(uuid),
  public.fol_slot_free(text, text, text, text, boolean, uuid), public.fol_fulfill(uuid, numeric, text, text), public.fol_expire() to service_role;

-- ---------- storage: logos and photos (public read by URL, no listing, writes only by the server after checks) ----------
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('fol-public', 'fol-public', true, 1572864, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 1572864, allowed_mime_types = array['image/png','image/jpeg','image/webp'];
-- no storage.objects policy for fol-public: anon/authenticated cannot upload, change, delete or list. The edge function
-- (service role) uploads after checking size, type and the file's first bytes.

-- ======================= part 2 (25.11.2026, after the competitor audit) =======================
-- card-upgrade product (extended profile without top placement; hides the "other firms" block on the firm's own page).
-- Owner approved 790 ILS per year before VAT (25.11.2026 21:56). Widening the kind constraints needs DROP CONSTRAINT,
-- which the permission system stopped, so the card is stored without a new kind: plan limits {"card":true}, and its
-- placement is kind 'listing' with target 'card' and no area/city (so it never takes a listing slot or a top position).
update public.fol_plans set unit_price = 790, unit = 'year', period_months = 12, limits = '{"card":true}'::jsonb where id = 'card-upgrade';
alter table public.fol_firms add column if not exists hide_others boolean not null default false;
grant select (hide_others) on public.fol_firms to anon, authenticated;

-- add-on yearly auto-renewal: only with an explicit consent checkbox at checkout; cancel any time in the firm dashboard
alter table public.fol_orders add column if not exists auto_renew boolean not null default false;
alter table public.fol_orders add column if not exists auto_renew_consent_at timestamptz;
alter table public.fol_placements add column if not exists auto_renew boolean not null default false;
alter table public.fol_placements add column if not exists auto_renew_consent_at timestamptz;
alter table public.fol_placements add column if not exists auto_renew_cancelled_at timestamptz;

-- sales contact (WhatsApp number shown next to each product; empty = hidden)
insert into public.fol_settings(key, value) values ('sales', '{"whatsapp":""}'::jsonb) on conflict (key) do nothing;
insert into public.fol_settings(key, value) values ('brand', '{"name":"פוליבוס"}'::jsonb) on conflict (key) do nothing;
-- an extra read policy (policies add up), so the public can read the sales contact too
create policy fol_read_sales on public.fol_settings for select to anon, authenticated using (key = 'sales');

-- privacy-safe counters: daily totals per firm, no IP, no visitor id, nothing personal
create table if not exists public.fol_stats_daily (
  firm_id uuid not null references public.fol_firms(id) on delete cascade,
  day date not null,
  views int not null default 0, phone int not null default 0, website int not null default 0, whatsapp int not null default 0,
  primary key (firm_id, day)
);
alter table public.fol_stats_daily enable row level security;
revoke all on public.fol_stats_daily from anon, authenticated;
create or replace function public.fol_track(p_slug text, p_event text) returns void
language plpgsql security definer set search_path = public as $$
declare fid uuid; d date := (now() at time zone 'Asia/Jerusalem')::date;
begin
  if p_event not in ('views','phone','website','whatsapp') then return; end if;
  select id into fid from public.fol_firms where slug = left(p_slug, 80) and status = 'published';
  if fid is null then return; end if;
  insert into public.fol_stats_daily(firm_id, day) values (fid, d) on conflict do nothing;
  -- a ceiling per firm and day keeps a script from inflating the numbers
  execute format('update public.fol_stats_daily set %I = %I + 1 where firm_id = $1 and day = $2 and %I < 20000', p_event, p_event, p_event) using fid, d;
end $$;
revoke all on function public.fol_track(text, text) from public;
grant execute on function public.fol_track(text, text) to anon, authenticated;

-- website health (daily job; no phone calls)
alter table public.fol_firms add column if not exists site_status int;
alter table public.fol_firms add column if not exists site_ok boolean;
alter table public.fol_firms add column if not exists site_checked_at timestamptz;

-- live slot inventory for the checkout (counts only)
create or replace function public.fol_inventory(p_kind text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(target, n), '{}'::jsonb) from (
    select target, count(*) n from public.fol_placements
    where status = 'active' and ends_at > now() and kind = p_kind and target is not null and p_kind in ('court','provider','tool')
    group by target) x $$;
revoke all on function public.fol_inventory(text) from public;
grant execute on function public.fol_inventory(text) to anon, authenticated;

-- ======================= daily job (applied 25.11.2026 with cron.schedule, job 'folivus-daily') =======================
-- select cron.schedule('folivus-daily', '23 3 * * *', $$ select net.http_post(
--   url := 'https://mgjmnvpnovkewvqevjmz.supabase.co/functions/v1/fol-api?step=daily',
--   headers := jsonb_build_object('content-type','application/json','x-cron-secret', (select v from public.app_secrets where k='CRON_SECRET')),
--   body := '{}'::jsonb, timeout_milliseconds := 150000) $$);
-- Reference data: fol_cities was filled from sites/folivus/src/data/cities.json (60 cities) so new firms keep their city.
