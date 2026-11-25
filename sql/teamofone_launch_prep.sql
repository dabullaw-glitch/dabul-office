-- Team of One launch prep, applied 25.11.2026 as migrations too_launch_prep_payments and too_intro_price_ignore_unpaid.
-- Nothing here turns anything on. See tools/teamofone-launch/LAUNCH.md.
alter table public.too_orders add column if not exists pay_key_hash text;
alter table public.too_orders add column if not exists paid_at timestamptz;
alter table public.too_orders drop constraint if exists too_orders_status_check;
alter table public.too_orders add constraint too_orders_status_check
  check (status = any (array['test','pending','paid','review','refunded','failed','cancelled']));
-- too_pay_grant(p_order uuid, p_amount int, p_ref text): opens access for a 'pending' order after the payment callback;
-- amount lower than the price -> 'review'; idempotent. EXECUTE only for service_role (revoked from public, anon, authenticated).
-- too_intro_price: only paid / test / review / refunded orders use up the launch offer (an abandoned payment page does not).
insert into public.too_settings(key, value, public) values
  ('launch', '{"domain": "", "live": false}'::jsonb, false),
  ('mail', '{"from": "", "reply_to": "", "verify_signup": false}'::jsonb, false),
  ('mail_ready', 'false'::jsonb, true)
on conflict (key) do nothing;
