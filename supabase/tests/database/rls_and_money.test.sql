-- Run with: supabase test db
-- Verifies business data isolation (RLS), role restrictions and money guards.
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Two owners in two separate businesses, plus a staff member of business A.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'owner.a@test.dev', '{"full_name":"Owner A"}'),
  ('00000000-0000-0000-0000-00000000000b', 'owner.b@test.dev', '{"full_name":"Owner B"}'),
  ('00000000-0000-0000-0000-00000000000c', 'staff.a@test.dev', '{"full_name":"Staff A"}');

-- Act as owner A.
set local role authenticated;
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
select lives_ok($$ select public.create_business('Biz A', 'laundry', 'USD') $$, 'owner A creates a business');
select is((select count(*)::int from public.services), 4, 'laundry presets are seeded');

create temp table ids as select id as business_id from public.businesses limit 1;
grant select on ids to authenticated;

insert into public.customers (business_id, full_name) select business_id, 'Cust A' from ids;
select lives_ok($$
  select public.save_order(
    (select business_id from ids),
    null,
    (select id from public.customers limit 1),
    now() + interval '1 day', 'pickup', '', '',
    '[{"name":"Wash & fold","unit":"kg","quantity":5,"unitPriceCents":300}]'::jsonb)
$$, 'save_order creates an order');
select is((select total_cents from public.orders limit 1), 1500::bigint, 'order total is derived from items');
select is((select number from public.orders limit 1), 1001, 'first order number is 1001');

select throws_like($$
  insert into public.payments (business_id, order_id, amount_cents, method)
  select business_id, id, 1600, 'cash' from public.orders limit 1
$$, '%PAYMENT_EXCEEDS_BALANCE%', 'payment above the balance is rejected');
select lives_ok($$
  insert into public.payments (business_id, order_id, amount_cents, method)
  select business_id, id, 1500, 'card' from public.orders limit 1
$$, 'payment equal to the balance is accepted');

select public.invite_member((select business_id from ids), 'staff.a@test.dev', 'Staff A', 'staff');

-- Act as owner B: sees nothing from business A.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
select is((select count(*)::int from public.customers), 0, 'other business cannot read customers');
select is((select count(*)::int from public.orders), 0, 'other business cannot read orders');
select throws_ok($$
  insert into public.customers (business_id, full_name) select business_id, 'Intruder' from ids
$$, '42501', null, 'other business cannot insert customers');

-- Act as staff A: can read orders, cannot record expenses.
set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-00000000000c","role":"authenticated"}';
select is((select count(*)::int from public.orders), 1, 'staff can read their business orders');
select throws_ok($$
  insert into public.expenses (business_id, amount_cents, category, description)
  select business_id, 1000, 'supplies', 'Soap' from ids
$$, '42501', null, 'staff cannot record expenses');

select * from finish();
rollback;
