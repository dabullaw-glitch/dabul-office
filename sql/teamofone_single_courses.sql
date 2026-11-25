-- Team of One: single courses (Yakir 25.11.2026). The 4 new courses (too_modules n 11-14) are BOTH included in the
-- membership AND sold separately. A single-course buyer gets lifetime access to that module only (its published lessons,
-- their videos and files). Members (kind 'course' or 'subscription') keep access to everything. Price per course is not
-- decided yet: too_plans.price_ils stays NULL (placeholder) and every checkout refuses while it is empty, while test_mode
-- is on, or while the module is not published. Modules 11-14 are NOT published here.
-- Also (Yakir approved): lesson content of unpublished lessons / modules is readable only by the admin.
-- STATUS 25.11.2026: Yakir approved in chat 20:25 ("מאשר"); price 249 ILS per single course (his 17:18 "לפי מה שאתה חושב").

-- 1. products: one plan per sellable module ------------------------------------------------------------------------
alter table public.too_plans add column if not exists module_id integer references public.too_modules(id) on delete restrict;
alter table public.too_plans alter column price_ils drop not null;
alter table public.too_plans drop constraint if exists too_plans_kind_check;
alter table public.too_plans add constraint too_plans_kind_check check (kind = any (array['one_time','monthly','module']));
alter table public.too_plans drop constraint if exists too_plans_module_check;
alter table public.too_plans add constraint too_plans_module_check check ((kind = 'module') = (module_id is not null));
create unique index if not exists too_plans_module_uq on public.too_plans(module_id) where module_id is not null;

insert into public.too_plans(code, name, kind, price_ils, module_id, bonus_sub_months, perks, active, sort)
select 'module-' || m.n, regexp_replace(m.title, '^קורס:\s*', ''), 'module', 249, m.id, 0,
       '["גישה לכל החיים לקורס הזה","כל השיעורים, הסרטונים והקבצים של הקורס"]'::jsonb, true, 10 + m.n
from public.too_modules m where m.n between 11 and 14
on conflict (code) do nothing;

-- 2. access rows for one module --------------------------------------------------------------------------------------
alter table public.too_access add column if not exists module_id integer references public.too_modules(id) on delete cascade;
alter table public.too_access drop constraint if exists too_access_kind_check;
alter table public.too_access add constraint too_access_kind_check check (kind = any (array['course','subscription','module']));
alter table public.too_access drop constraint if exists too_access_module_check;
alter table public.too_access add constraint too_access_module_check check ((kind = 'module') = (module_id is not null));
create index if not exists too_access_module_idx on public.too_access(user_id, module_id) where kind = 'module';

-- 3. membership stays membership: a single course never opens the community, live events or the whole course -------
create or replace function public.too_has_access(uid uuid) returns boolean
language sql stable security definer set search_path to 'public' as $function$
  select uid is not null
     and exists (select 1 from public.too_profiles p where p.id = uid and not p.blocked)
     and exists (select 1 from public.too_access a where a.user_id = uid and a.kind in ('course','subscription')
                 and not a.revoked and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now()));
$function$;

-- member, or owns this module
create or replace function public.too_has_module(uid uuid, p_module integer) returns boolean
language sql stable security definer set search_path to 'public' as $function$
  select uid is not null and p_module is not null
     and exists (select 1 from public.too_profiles p where p.id = uid and not p.blocked)
     and (public.too_has_access(uid)
          or exists (select 1 from public.too_access a where a.user_id = uid and a.kind = 'module' and a.module_id = p_module
                     and not a.revoked and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())));
$function$;
revoke all on function public.too_has_module(uuid, integer) from public, anon;
grant execute on function public.too_has_module(uuid, integer) to authenticated, service_role;

-- 4. lesson content: published lesson in a published module (library items have no module), and access to that module
drop policy if exists too_content_read on public.too_lesson_content;
create policy too_content_read on public.too_lesson_content for select to authenticated using (
  public.too_is_admin()
  or exists (
    select 1 from public.too_lessons l left join public.too_modules m on m.id = l.module_id
    where l.id = too_lesson_content.lesson_id and l.published and (l.module_id is null or m.published)
      and (l.free_preview
           or case when l.module_id is null then public.too_has_access(auth.uid())
                   else public.too_has_module(auth.uid(), l.module_id) end)));

-- 5. private files (bucket 'too'): a single-course buyer may sign the videos and files of that module's published lessons
create or replace function public.too_file_ok(p_path text) returns boolean
language sql stable security definer set search_path to 'public' as $function$
  select auth.uid() is not null and exists (
    select 1 from public.too_lesson_content c join public.too_lessons l on l.id = c.lesson_id join public.too_modules m on m.id = l.module_id
    where l.published and m.published
      and (c.video_url = 'too:' || p_path or c.attachments @> jsonb_build_array(jsonb_build_object('path', p_path)))
      and public.too_has_module(auth.uid(), l.module_id));
$function$;
revoke all on function public.too_file_ok(text) from public, anon;
grant execute on function public.too_file_ok(text) to authenticated, service_role;

drop policy if exists too_files_read on storage.objects;
create policy too_files_read on storage.objects for select to authenticated using (
  bucket_id = 'too' and (public.too_is_admin() or public.too_has_access(auth.uid()) or public.too_file_ok(name)));

-- 6. what the site needs to know: which modules this user owns ---------------------------------------------------------
create or replace function public.too_me() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare uid uuid := auth.uid(); p public.too_profiles; r jsonb; acc boolean;
begin
  if uid is null then return null; end if;
  select * into p from public.too_profiles where id = uid;
  if not found then
    return jsonb_build_object('profile', null, 'admin', public.too_is_admin(), 'access', public.too_is_admin(), 'modules', '[]'::jsonb, 'done', '[]'::jsonb);
  end if;
  update public.too_profiles set last_seen = now() where id = uid;
  acc := public.too_has_access(uid);
  select jsonb_build_object(
    'profile', jsonb_build_object('email', p.email, 'full_name', p.full_name, 'phone', p.phone, 'blocked', p.blocked, 'created_at', p.created_at),
    'admin', public.too_is_admin(),
    'access', acc,
    'course', exists (select 1 from public.too_access a where a.user_id = uid and a.kind='course' and not a.revoked and (a.ends_at is null or a.ends_at > now())),
    'modules', case when p.blocked then '[]'::jsonb else coalesce((select jsonb_agg(distinct a.module_id) from public.too_access a where a.user_id = uid and a.kind='module' and not a.revoked and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())), '[]'::jsonb) end,
    'sub_ends', (select max(ends_at) from public.too_access a where a.user_id = uid and a.kind='subscription' and not a.revoked and a.ends_at > now()),
    'sub_renew', coalesce((select bool_or(auto_renew) from public.too_access a where a.user_id = uid and a.kind='subscription' and not a.revoked and a.ends_at > now()), false),
    'done', coalesce((select jsonb_agg(lesson_id) from public.too_progress where user_id = uid), '[]'::jsonb),
    'wa', case when acc then (select value #>> '{}' from public.too_settings where key = 'whatsapp_link') else null end
  ) into r;
  return r;
end $function$;

-- 7. opening access after payment (service role only, unchanged for the existing plans) --------------------------------
create or replace function public.too_pay_grant(p_order uuid, p_amount integer, p_ref text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare o public.too_orders; pl public.too_plans;
begin
  select * into o from public.too_orders where id = p_order for update;
  if not found then raise exception 'no_order'; end if;
  if o.status <> 'pending' then return jsonb_build_object('ok', true, 'again', true, 'status', o.status); end if;
  select * into pl from public.too_plans where code = o.plan_code;
  if not found then raise exception 'no_plan'; end if;
  if p_amount is not null and p_amount < o.amount_ils then
    update public.too_orders set status = 'review', provider_ref = left(p_ref, 120),
      note = coalesce(note, '') || ' | סכום ששולם נמוך מהמחיר: ' || p_amount where id = o.id;
    insert into public.too_audit(actor, action, detail) values (o.user_id, 'pay_amount_mismatch', jsonb_build_object('order', o.id, 'paid', p_amount, 'price', o.amount_ils));
    return jsonb_build_object('ok', false, 'review', true);
  end if;
  update public.too_orders set status = 'paid', paid_at = now(), provider_ref = left(p_ref, 120) where id = o.id;
  if pl.kind = 'one_time' then
    if not exists (select 1 from public.too_access where user_id = o.user_id and kind = 'course' and not revoked and ends_at is null) then
      insert into public.too_access(user_id, kind, order_id, note) values (o.user_id, 'course', o.id, 'רכישת הקורס');
    end if;
    if pl.bonus_sub_months > 0 then perform public.too_sub_extend(o.user_id, pl.bonus_sub_months, o.id, 'חודשי מנוי במתנה עם הקורס', false); end if;
  elsif pl.kind = 'module' then
    if not exists (select 1 from public.too_access where user_id = o.user_id and kind = 'module' and module_id = pl.module_id and not revoked and ends_at is null) then
      insert into public.too_access(user_id, kind, module_id, order_id, note) values (o.user_id, 'module', pl.module_id, o.id, 'רכישת קורס בודד');
    end if;
  else
    perform public.too_sub_extend(o.user_id, 1, o.id, 'מנוי חודשי', true);
  end if;
  insert into public.too_audit(actor, action, detail) values (o.user_id, 'pay_paid', jsonb_build_object('order', o.id, 'plan', o.plan_code, 'amount', o.amount_ils));
  return jsonb_build_object('ok', true, 'plan', o.plan_code, 'kind', pl.kind, 'user', o.user_id);
end $function$;
revoke all on function public.too_pay_grant(uuid, integer, text) from public, anon, authenticated;
grant execute on function public.too_pay_grant(uuid, integer, text) to service_role;

-- 8. the no-charge test purchase (test mode only): a single course needs a price and a published module ----------------
create or replace function public.too_checkout_test(p_plan text) returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
declare uid uuid := auth.uid(); pl public.too_plans; oid uuid; tm boolean; amt int; intro int;
begin
  if uid is null then raise exception 'not_logged_in'; end if;
  if not exists (select 1 from public.too_profiles where id = uid and not blocked) then raise exception 'no_profile'; end if;
  select coalesce((value)::text::boolean, false) into tm from public.too_settings where key = 'test_mode';
  if not coalesce(tm, false) then raise exception 'test_mode_off'; end if;
  select * into pl from public.too_plans where code = p_plan and active;
  if not found then raise exception 'no_plan'; end if;
  if pl.kind = 'module' then
    if coalesce(pl.price_ils, 0) <= 0 then raise exception 'no_price'; end if;
    if not exists (select 1 from public.too_modules where id = pl.module_id and published) then raise exception 'not_open'; end if;
  end if;
  intro := public.too_intro_price(uid, pl.code);
  amt := coalesce(intro, pl.price_ils);
  insert into public.too_orders(user_id, plan_code, amount_ils, status, provider, note)
    values (uid, pl.code, amt, 'test', 'test', case when intro is not null then 'רכישת בדיקה, מבצע חודש ראשון, בלי חיוב' else 'רכישת בדיקה, בלי חיוב' end) returning id into oid;
  if pl.kind = 'one_time' then
    if not exists (select 1 from public.too_access where user_id = uid and kind = 'course' and not revoked and ends_at is null) then
      insert into public.too_access(user_id, kind, order_id, note) values (uid, 'course', oid, 'רכישת הקורס');
    end if;
    if pl.bonus_sub_months > 0 then perform public.too_sub_extend(uid, pl.bonus_sub_months, oid, 'חודשי מנוי במתנה עם הקורס', false); end if;
  elsif pl.kind = 'module' then
    if not exists (select 1 from public.too_access where user_id = uid and kind = 'module' and module_id = pl.module_id and not revoked and ends_at is null) then
      insert into public.too_access(user_id, kind, module_id, order_id, note) values (uid, 'module', pl.module_id, oid, 'רכישת קורס בודד');
    end if;
  else
    perform public.too_sub_extend(uid, 1, oid, case when intro is not null then 'מנוי חודשי, חודש ראשון במבצע' else 'מנוי חודשי' end, true);
  end if;
  perform public.too_log('checkout_test', jsonb_build_object('plan', pl.code, 'order', oid, 'amount', amt, 'intro', intro is not null));
  return jsonb_build_object('order', oid, 'plan', pl.code, 'amount', amt);
end $function$;

-- 9. admin: record a payment taken by hand for a single course too ------------------------------------------------------
create or replace function public.too_admin_record_payment(p_user uuid, p_plan text, p_amount integer, p_note text) returns uuid
language plpgsql security definer set search_path to 'public' as $function$
declare pl public.too_plans; oid uuid;
begin
  perform public.too_admin_check();
  select * into pl from public.too_plans where code = p_plan;
  if not found then raise exception 'no_plan'; end if;
  insert into public.too_orders(user_id, plan_code, amount_ils, status, provider, note) values (p_user, pl.code, coalesce(p_amount, pl.price_ils), 'paid', 'manual', coalesce(p_note, 'תשלום שנרשם ידנית')) returning id into oid;
  if pl.kind = 'one_time' then
    insert into public.too_access(user_id, kind, order_id, note, granted_by) values (p_user, 'course', oid, 'רכישת הקורס', auth.uid());
    if pl.bonus_sub_months > 0 then perform public.too_sub_extend(p_user, pl.bonus_sub_months, oid, 'חודשי מנוי במתנה עם הקורס', false); end if;
  elsif pl.kind = 'module' then
    insert into public.too_access(user_id, kind, module_id, order_id, note, granted_by) values (p_user, 'module', pl.module_id, oid, 'רכישת קורס בודד', auth.uid());
  else
    perform public.too_sub_extend(p_user, 1, oid, 'מנוי חודשי', true);
  end if;
  perform public.too_log('admin_record_payment', jsonb_build_object('user', p_user, 'plan', p_plan, 'amount', p_amount, 'order', oid));
  return oid;
end $function$;

-- 10. admin users list: show which module a single-course access is for --------------------------------------------------
create or replace function public.too_admin_users() returns jsonb
language plpgsql security definer set search_path to 'public' as $function$
begin
  perform public.too_admin_check();
  return coalesce((select jsonb_agg(x order by x->>'created_at' desc) from (
    select jsonb_build_object('id', p.id, 'email', p.email, 'full_name', p.full_name, 'phone', p.phone, 'role', p.role, 'blocked', p.blocked,
      'created_at', p.created_at, 'last_seen', p.last_seen,
      'course', exists (select 1 from public.too_access a where a.user_id = p.id and a.kind='course' and not a.revoked and (a.ends_at is null or a.ends_at > now())),
      'modules', coalesce((select jsonb_agg(distinct a.module_id) from public.too_access a where a.user_id = p.id and a.kind='module' and not a.revoked and (a.ends_at is null or a.ends_at > now())), '[]'::jsonb),
      'sub_ends', (select max(ends_at) from public.too_access a where a.user_id = p.id and a.kind='subscription' and not a.revoked and a.ends_at > now()),
      'sub_renew', coalesce((select bool_or(auto_renew) from public.too_access a where a.user_id = p.id and a.kind='subscription' and not a.revoked and a.ends_at > now()), false),
      'paid', coalesce((select sum(amount_ils) from public.too_orders o where o.user_id = p.id and o.status='paid'), 0),
      'done', (select count(*) from public.too_progress g where g.user_id = p.id),
      'access', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'kind', a.kind, 'module_id', a.module_id, 'starts_at', a.starts_at, 'ends_at', a.ends_at, 'revoked', a.revoked, 'auto_renew', a.auto_renew, 'note', a.note) order by a.created_at desc) from public.too_access a where a.user_id = p.id), '[]'::jsonb)
    ) x from public.too_profiles p) t), '[]'::jsonb);
end $function$;
