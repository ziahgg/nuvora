-- Nuvora — initial schema
-- Money is stored as bigint minor units (cents). Never floats.
-- Every table holding business data has RLS enabled and is scoped to
-- members of the owning business.

create extension if not exists pgcrypto with schema extensions;

-- ───────────────────────────── Types ─────────────────────────────
create type public.member_role as enum ('owner', 'manager', 'staff');
create type public.member_status as enum ('active', 'pending');
create type public.business_category as enum ('laundry', 'salon', 'repair', 'services', 'retail', 'other');
create type public.service_unit as enum ('kg', 'item', 'flat', 'shirt', 'set');
create type public.order_status as enum ('in_progress', 'completed', 'cancelled');
create type public.handover_type as enum ('pickup', 'delivery');
create type public.payment_method as enum ('cash', 'card', 'bank_transfer');
create type public.expense_category as enum ('supplies', 'rent', 'utilities', 'equipment', 'wages', 'other');
create type public.appointment_type as enum ('pickup', 'delivery', 'in_store');
create type public.appointment_status as enum ('scheduled', 'completed', 'cancelled');
create type public.notification_kind as enum ('payment', 'overdue', 'order', 'schedule', 'summary', 'team');

-- ───────────────────────────── Tables ─────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  preferences jsonb not null default jsonb_build_object(
    'notifyPayments', true,
    'notifyOverdue', true,
    'notifyAppointments', true,
    'notifyWeeklySummary', false,
    'reminderSms', true
  ),
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  category public.business_category not null default 'other',
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  opening_hours text not null default '',
  receipt_footer text not null default '',
  next_order_number integer not null default 1001,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null check (email = lower(email)),
  role public.member_role not null,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now(),
  unique (business_id, email),
  unique (business_id, user_id),
  check (status = 'pending' or user_id is not null)
);
create index business_members_user_idx on public.business_members (user_id);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  unit public.service_unit not null default 'item',
  price_cents bigint not null check (price_cents >= 0),
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index services_business_idx on public.services (business_id, sort_order);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 1 and 120),
  phone text not null default '',
  email text not null default '',
  address text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (business_id, id)
);
create index customers_business_name_idx on public.customers (business_id, full_name) where deleted_at is null;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  number integer not null,
  customer_id uuid not null,
  status public.order_status not null default 'in_progress',
  due_at timestamptz not null,
  handover public.handover_type not null default 'pickup',
  handover_time text not null default '',
  notes text not null default '',
  total_cents bigint not null default 0 check (total_cents >= 0),
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default '',
  created_at timestamptz not null default now(),
  started_at timestamptz default now(),
  completed_at timestamptz,
  cancelled_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (business_id, number),
  unique (business_id, id),
  foreign key (business_id, customer_id) references public.customers (business_id, id)
);
create index orders_business_created_idx on public.orders (business_id, created_at desc);
create index orders_customer_idx on public.orders (customer_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  service_id uuid references public.services (id) on delete set null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  unit public.service_unit not null default 'item',
  quantity integer not null check (quantity > 0 and quantity <= 10000),
  unit_price_cents bigint not null check (unit_price_cents >= 0),
  line_total_cents bigint generated always as (quantity * unit_price_cents) stored,
  position integer not null default 0,
  foreign key (business_id, order_id) references public.orders (business_id, id) on delete cascade
);
create index order_items_order_idx on public.order_items (order_id, position);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  order_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  method public.payment_method not null,
  paid_at timestamptz not null default now(),
  reference text not null default '',
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_by_name text not null default '',
  created_at timestamptz not null default now(),
  foreign key (business_id, order_id) references public.orders (business_id, id) on delete restrict
);
create index payments_business_paid_idx on public.payments (business_id, paid_at desc);
create index payments_order_idx on public.payments (order_id);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  category public.expense_category not null,
  description text not null check (char_length(btrim(description)) between 1 and 160),
  spent_at timestamptz not null default now(),
  paid_with public.payment_method not null default 'cash',
  receipt_path text,
  recorded_by uuid references auth.users (id) on delete set null,
  recorded_by_name text not null default '',
  created_at timestamptz not null default now()
);
create index expenses_business_spent_idx on public.expenses (business_id, spent_at desc);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null,
  type public.appointment_type not null,
  customer_id uuid not null,
  order_id uuid,
  starts_at timestamptz not null,
  duration_min integer not null default 15 check (duration_min between 5 and 600),
  location text not null default '',
  status public.appointment_status not null default 'scheduled',
  remind boolean not null default true,
  assigned_to_name text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  foreign key (business_id, customer_id) references public.customers (business_id, id),
  foreign key (business_id, order_id) references public.orders (business_id, id) on delete set null (order_id)
);
create index appointments_business_start_idx on public.appointments (business_id, starts_at);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind public.notification_kind not null,
  title text not null,
  body text not null default '',
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_business_created_idx on public.notifications (business_id, created_at desc);

-- ─────────────────────── Authorization helpers ───────────────────────
-- SECURITY DEFINER so policies can consult memberships without recursion.
create or replace function public.has_role(p_business uuid, p_roles public.member_role[])
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.business_members m
    where m.business_id = p_business
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.role = any (p_roles)
  );
$$;

create or replace function public.is_member(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(p_business, array['owner', 'manager', 'staff']::public.member_role[]);
$$;

create or replace function public.is_finance(p_business uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.has_role(p_business, array['owner', 'manager']::public.member_role[]);
$$;

create or replace function public.current_member_name(p_business uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(nullif(m.full_name, ''), m.email)
  from public.business_members m
  where m.business_id = p_business and m.user_id = (select auth.uid())
  limit 1;
$$;

create or replace function public.fmt_money(p_cents bigint, p_currency text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_currency
           when 'USD' then '$' when 'EUR' then '€' when 'GBP' then '£'
           when 'IDR' then 'Rp' when 'SGD' then 'S$' when 'AUD' then 'A$'
           else p_currency || ' ' end
         || to_char(p_cents / 100.0, 'FM999,999,999,990.00');
$$;

-- ─────────────────────────── Triggers ───────────────────────────
-- Profile row for every auth user; link pending team invites by email.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', '');
  v_member record;
begin
  insert into public.profiles (id, full_name, email) values (new.id, v_name, lower(new.email));

  for v_member in
    update public.business_members
       set user_id = new.id, status = 'active', full_name = coalesce(nullif(v_name, ''), full_name)
     where email = lower(new.email) and status = 'pending'
    returning business_id, full_name, role
  loop
    insert into public.notifications (business_id, kind, title, body)
    values (v_member.business_id, 'team', v_member.full_name || ' joined your team',
            'Role: ' || initcap(v_member.role::text));
  end loop;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sequential, per-business order numbers (#NV-1001, #NV-1002 …), allocated atomically.
create or replace function public.assign_order_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.businesses
     set next_order_number = next_order_number + 1
   where id = new.business_id
  returning next_order_number - 1 into new.number;
  new.created_by := (select auth.uid());
  new.created_by_name := coalesce(public.current_member_name(new.business_id), '');
  new.total_cents := 0;
  return new;
end;
$$;

create trigger orders_assign_number
  before insert on public.orders
  for each row execute function public.assign_order_number();

create or replace function public.orders_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.number := old.number;            -- immutable
  new.business_id := old.business_id;  -- immutable
  new.created_at := old.created_at;
  if new.status is distinct from old.status then
    new.completed_at := case when new.status = 'completed' then now() else null end;
    new.cancelled_at := case when new.status = 'cancelled' then now() else null end;
  end if;
  return new;
end;
$$;

create trigger orders_touch
  before update on public.orders
  for each row execute function public.orders_touch();

-- Order total is always derived from its items; it may never drop below what was paid.
create or replace function public.recompute_order_total()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order uuid := coalesce(new.order_id, old.order_id);
  v_total bigint;
  v_paid bigint;
begin
  select coalesce(sum(line_total_cents), 0) into v_total from public.order_items where order_id = v_order;
  select coalesce(sum(amount_cents), 0) into v_paid from public.payments where order_id = v_order;
  if v_total < v_paid then
    raise exception 'TOTAL_BELOW_PAID: order total % is less than the % already paid', v_total, v_paid
      using errcode = 'P0001';
  end if;
  update public.orders set total_cents = v_total where id = v_order;
  return null;
end;
$$;

create constraint trigger order_items_total
  after insert or update or delete on public.order_items
  deferrable initially deferred
  for each row execute function public.recompute_order_total();

-- Server-side guard: a payment can never exceed the order's remaining balance,
-- and cancelled orders can't take new payments. The order row is locked so two
-- devices recording at once can't both succeed.
create or replace function public.guard_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_total bigint;
  v_status public.order_status;
  v_paid bigint;
begin
  select total_cents, status into v_total, v_status
    from public.orders where id = new.order_id and business_id = new.business_id
    for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_status = 'cancelled' then
    raise exception 'ORDER_CANCELLED: payments cannot be added to a cancelled order' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_cents), 0) into v_paid
    from public.payments where order_id = new.order_id and id <> new.id;
  if v_paid + new.amount_cents > v_total then
    raise exception 'PAYMENT_EXCEEDS_BALANCE: balance due is %', v_total - v_paid using errcode = 'P0001';
  end if;

  if tg_op = 'INSERT' then
    new.recorded_by := (select auth.uid());
    new.recorded_by_name := coalesce(public.current_member_name(new.business_id), '');
    new.reference := 'PAY-' || to_char(new.paid_at, 'YYYYMMDD') || '-' ||
      lpad((select count(*) + 1 from public.payments p
             where p.business_id = new.business_id
               and p.paid_at::date = new.paid_at::date)::text, 4, '0');
  end if;
  return new;
end;
$$;

create trigger payments_guard
  before insert or update on public.payments
  for each row execute function public.guard_payment();

create or replace function public.notify_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_order record;
  v_paid bigint;
  v_currency text;
begin
  select o.number, o.total_cents, c.full_name into v_order
    from public.orders o join public.customers c on c.id = o.customer_id
   where o.id = new.order_id;
  select coalesce(sum(amount_cents), 0) into v_paid from public.payments where order_id = new.order_id;
  select currency into v_currency from public.businesses where id = new.business_id;
  insert into public.notifications (business_id, kind, title, body)
  values (
    new.business_id, 'payment',
    'Payment received · ' || public.fmt_money(new.amount_cents, v_currency),
    v_order.full_name || ' paid by ' || replace(new.method::text, '_', ' ') || ' for #NV-' || v_order.number || '. ' ||
      case when v_order.total_cents - v_paid > 0
           then public.fmt_money(v_order.total_cents - v_paid, v_currency) || ' still due.'
           else 'Paid in full.' end
  );
  return null;
end;
$$;

create trigger payments_notify
  after insert on public.payments
  for each row execute function public.notify_payment();

create or replace function public.expenses_stamp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.recorded_by := (select auth.uid());
  new.recorded_by_name := coalesce(public.current_member_name(new.business_id), '');
  return new;
end;
$$;

create trigger expenses_stamp
  before insert on public.expenses
  for each row execute function public.expenses_stamp();

create or replace function public.customers_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.business_id := old.business_id;
  return new;
end;
$$;

create trigger customers_touch
  before update on public.customers
  for each row execute function public.customers_touch();

-- ───────────────────────────── RPCs ─────────────────────────────
-- Creates a business, makes the caller its owner and seeds service presets.
create or replace function public.create_business(
  p_name text,
  p_category public.business_category,
  p_currency text,
  p_phone text default '',
  p_email text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_business uuid;
  v_profile record;
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = '42501';
  end if;
  select full_name, email into v_profile from public.profiles where id = v_uid;

  insert into public.businesses (name, category, currency, phone, email, created_by)
  values (btrim(p_name), p_category, upper(p_currency), btrim(p_phone), lower(btrim(p_email)), v_uid)
  returning id into v_business;

  insert into public.business_members (business_id, user_id, full_name, email, role, status)
  values (v_business, v_uid, coalesce(v_profile.full_name, ''), coalesce(v_profile.email, ''), 'owner', 'active');

  if p_category = 'laundry' then
    insert into public.services (business_id, name, unit, price_cents, sort_order) values
      (v_business, 'Wash & fold', 'kg', 300, 1),
      (v_business, 'Express same-day', 'flat', 500, 2),
      (v_business, 'Ironing', 'shirt', 200, 3),
      (v_business, 'Dry cleaning', 'item', 1600, 4);
  end if;
  return v_business;
end;
$$;

-- Owner invites a teammate; they become active when they sign up with that email.
create or replace function public.invite_member(
  p_business uuid,
  p_email text,
  p_full_name text,
  p_role public.member_role
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_existing uuid;
begin
  if not public.has_role(p_business, array['owner']::public.member_role[]) then
    raise exception 'FORBIDDEN: only the owner can invite team members' using errcode = '42501';
  end if;
  if p_role = 'owner' then
    raise exception 'INVALID_ROLE' using errcode = 'P0001';
  end if;
  select id into v_existing from auth.users where email = lower(btrim(p_email));
  insert into public.business_members (business_id, user_id, full_name, email, role, status)
  values (p_business, v_existing, btrim(p_full_name), lower(btrim(p_email)), p_role,
          case when v_existing is null then 'pending' else 'active' end::public.member_status)
  returning id into v_id;
  return v_id;
end;
$$;

-- Creates or edits an order and replaces its items in ONE transaction (the
-- deferred total trigger validates the final state). Runs as the caller, so
-- RLS applies. An optional drop-off payment is recorded in the same transaction.
create or replace function public.save_order(
  p_business uuid,
  p_order uuid,
  p_customer uuid,
  p_due_at timestamptz,
  p_handover public.handover_type,
  p_handover_time text,
  p_notes text,
  p_items jsonb,
  p_payment jsonb default null
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_order uuid := p_order;
  v_item jsonb;
  v_pos integer := 0;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'ORDER_EMPTY: add at least one service' using errcode = 'P0001';
  end if;

  if v_order is null then
    insert into public.orders (business_id, number, customer_id, due_at, handover, handover_time, notes)
    values (p_business, 0, p_customer, p_due_at, p_handover, coalesce(p_handover_time, ''), coalesce(p_notes, ''))
    returning id into v_order;
  else
    update public.orders
       set customer_id = p_customer, due_at = p_due_at, handover = p_handover,
           handover_time = coalesce(p_handover_time, ''), notes = coalesce(p_notes, '')
     where id = v_order and business_id = p_business and status <> 'cancelled';
    if not found then
      raise exception 'ORDER_NOT_EDITABLE' using errcode = 'P0001';
    end if;
    delete from public.order_items where order_id = v_order;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_pos := v_pos + 1;
    insert into public.order_items (business_id, order_id, service_id, name, unit, quantity, unit_price_cents, position)
    values (
      p_business, v_order, nullif(v_item ->> 'serviceId', '')::uuid, v_item ->> 'name',
      (v_item ->> 'unit')::public.service_unit, (v_item ->> 'quantity')::integer,
      (v_item ->> 'unitPriceCents')::bigint, v_pos
    );
  end loop;

  -- Bring the stored total up to date before any payment is checked against it.
  update public.orders o
     set total_cents = (select coalesce(sum(line_total_cents), 0) from public.order_items where order_id = v_order)
   where o.id = v_order;

  if p_payment is not null then
    insert into public.payments (business_id, order_id, amount_cents, method)
    values (p_business, v_order, (p_payment ->> 'amountCents')::bigint, (p_payment ->> 'method')::public.payment_method);
  end if;
  return v_order;
end;
$$;

revoke execute on function public.save_order(uuid, uuid, uuid, timestamptz, public.handover_type, text, text, jsonb, jsonb) from public, anon;
grant execute on function public.save_order(uuid, uuid, uuid, timestamptz, public.handover_type, text, text, jsonb, jsonb) to authenticated;

-- ───────────────────────── Row Level Security ─────────────────────────
alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.services enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.appointments enable row level security;
alter table public.notifications enable row level security;

create policy profiles_self_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy profiles_self_update on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy businesses_member_select on public.businesses for select to authenticated using (public.is_member(id));
create policy businesses_owner_update on public.businesses for update to authenticated
  using (public.has_role(id, array['owner']::public.member_role[]))
  with check (public.has_role(id, array['owner']::public.member_role[]));

create policy members_select on public.business_members for select to authenticated using (public.is_member(business_id));
create policy members_owner_update on public.business_members for update to authenticated
  using (public.has_role(business_id, array['owner']::public.member_role[]))
  with check (public.has_role(business_id, array['owner']::public.member_role[]));
create policy members_owner_delete on public.business_members for delete to authenticated
  using (public.has_role(business_id, array['owner']::public.member_role[]) and role <> 'owner');

create policy services_select on public.services for select to authenticated using (public.is_member(business_id));
create policy services_write on public.services for all to authenticated
  using (public.is_finance(business_id)) with check (public.is_finance(business_id));

create policy customers_select on public.customers for select to authenticated using (public.is_member(business_id));
create policy customers_insert on public.customers for insert to authenticated with check (public.is_member(business_id));
create policy customers_update on public.customers for update to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));
-- Customers are soft-deleted (deleted_at) so their orders stay in reports; no hard delete policy.

create policy orders_select on public.orders for select to authenticated using (public.is_member(business_id));
create policy orders_insert on public.orders for insert to authenticated with check (public.is_member(business_id));
create policy orders_update on public.orders for update to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

create policy order_items_select on public.order_items for select to authenticated using (public.is_member(business_id));
create policy order_items_write on public.order_items for all to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

-- All members can see payments (order balances depend on them); only owners/managers record or delete them.
create policy payments_select on public.payments for select to authenticated using (public.is_member(business_id));
create policy payments_insert on public.payments for insert to authenticated with check (public.is_finance(business_id));
create policy payments_delete on public.payments for delete to authenticated using (public.is_finance(business_id));

create policy expenses_all on public.expenses for all to authenticated
  using (public.is_finance(business_id)) with check (public.is_finance(business_id));

create policy appointments_select on public.appointments for select to authenticated using (public.is_member(business_id));
create policy appointments_insert on public.appointments for insert to authenticated with check (public.is_member(business_id));
create policy appointments_update on public.appointments for update to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

create policy notifications_select on public.notifications for select to authenticated using (public.is_member(business_id));
create policy notifications_update on public.notifications for update to authenticated
  using (public.is_member(business_id)) with check (public.is_member(business_id));

-- RPC execution: authenticated users only.
revoke execute on function public.create_business(text, public.business_category, text, text, text) from public, anon;
revoke execute on function public.invite_member(uuid, text, text, public.member_role) from public, anon;
grant execute on function public.create_business(text, public.business_category, text, text, text) to authenticated;
grant execute on function public.invite_member(uuid, text, text, public.member_role) to authenticated;

-- ───────────────────────── Storage (receipts) ─────────────────────────
-- Objects live at receipts/<business_id>/<uuid>.<ext>; only owners/managers of that business can read or write.
insert into storage.buckets (id, name, public) values ('receipts', 'receipts', false)
on conflict (id) do nothing;

create policy receipts_read on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and public.is_finance(((storage.foldername(name))[1])::uuid));
create policy receipts_write on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_finance(((storage.foldername(name))[1])::uuid));
create policy receipts_delete on storage.objects for delete to authenticated
  using (bucket_id = 'receipts' and public.is_finance(((storage.foldername(name))[1])::uuid));
