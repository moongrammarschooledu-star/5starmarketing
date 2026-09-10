-- =====================================================================
-- STEP 12 — Property Payment Plan & Investment Calculator
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- This is a NEW, richer payment-plan system alongside the simple inline
-- payment_* columns already on `properties` (from STEP 7) — those keep
-- working exactly as before. A property only gets a row here once an
-- admin explicitly builds one via /admin/properties/[id]/edit.
-- =====================================================================

create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties (id) on delete cascade,
  payment_option text not null default 'Installments' check (
    payment_option in ('Cash', 'Installments', 'Both')
  ),
  calculation_type text not null default 'Automatic' check (
    calculation_type in ('Automatic', 'Custom')
  ),
  property_price numeric not null,
  down_payment numeric not null default 0,
  booking_fee numeric,
  confirmation_fee numeric,
  processing_fee numeric,
  additional_charges numeric,
  additional_charges_description text,
  installment_frequency text not null default 'Monthly' check (
    installment_frequency in ('Monthly', 'Quarterly', 'Yearly')
  ),
  duration integer not null default 12,
  installment_amount numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_plans_property_idx on public.payment_plans (property_id);
create index if not exists payment_plans_enabled_idx on public.payment_plans (enabled);

drop trigger if exists set_updated_at on public.payment_plans;
create trigger set_updated_at before update on public.payment_plans
  for each row execute function public.set_updated_at();

create table if not exists public.payment_schedule_items (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid not null references public.payment_plans (id) on delete cascade,
  installment_number integer not null,
  due_date date,
  amount numeric not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payment_schedule_items_plan_idx on public.payment_schedule_items (payment_plan_id);

-- ---------------------------------------------------------------------
-- RLS — public (including anonymous visitors) can read an enabled plan
-- so the property page / calculator can show it; only admins can write.
-- ---------------------------------------------------------------------
alter table public.payment_plans enable row level security;
alter table public.payment_schedule_items enable row level security;

drop policy if exists "payment_plans_public_read" on public.payment_plans;
create policy "payment_plans_public_read"
  on public.payment_plans for select
  to anon, authenticated
  using (enabled = true);

drop policy if exists "payment_plans_admin_all" on public.payment_plans;
create policy "payment_plans_admin_all"
  on public.payment_plans for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "payment_schedule_items_public_read" on public.payment_schedule_items;
create policy "payment_schedule_items_public_read"
  on public.payment_schedule_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.payment_plans pp
      where pp.id = payment_schedule_items.payment_plan_id and pp.enabled = true
    )
  );

drop policy if exists "payment_schedule_items_admin_all" on public.payment_schedule_items;
create policy "payment_schedule_items_admin_all"
  on public.payment_schedule_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
