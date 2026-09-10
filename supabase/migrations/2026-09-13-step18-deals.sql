-- =====================================================================
-- STEP 18 — Deals + Sales + Property Transaction Management System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTE: this project already has real property/customer/agent/
-- lead/payment-plan systems (STEPs 4-17). This migration adds the one
-- genuinely missing piece — actual transaction/sale tracking — as five
-- new tables (deals, deal_payments, deal_payment_refunds,
-- deal_documents, deal_notes) that reference the existing
-- properties/projects/leads/admin_profiles/auth.users tables, plus one
-- additive column on the existing activity_logs table. Nothing existing
-- is renamed, dropped, or replaced.
-- =====================================================================

-- ---------------------------------------------------------------------
-- activity_logs — add structured metadata so deal/payment/commission
-- events can carry machine-readable detail (old/new values, amounts)
-- alongside the existing human-readable description. Nullable, so every
-- existing row and every existing activityService.log() call keeps
-- working unchanged.
-- ---------------------------------------------------------------------
alter table public.activity_logs add column if not exists metadata jsonb;

-- ---------------------------------------------------------------------
-- website_settings — a single, admin-configurable default commission
-- rate (section 33/34: "if no commission configuration exists, provide
-- admin configuration instead of hardcoding a rate"). Nullable — until
-- an admin sets it, deals simply have no suggested rate and commission
-- fields are left blank rather than guessed.
-- ---------------------------------------------------------------------
alter table public.website_settings add column if not exists default_commission_rate numeric;

-- ---------------------------------------------------------------------
-- Deal number sequence — the reliable, server-side, race-condition-free
-- mechanism behind DEAL-2026-00001 style references (section 4).
-- ---------------------------------------------------------------------
create sequence if not exists public.deals_number_seq;

-- ---------------------------------------------------------------------
-- deals — the core transaction record. Mirrors the established
-- appointments/leads pattern: required property link is actually
-- nullable here (a deal can start before a specific unit is finalized,
-- e.g. an "Investment"/"Other" deal type), nullable customer_id (FK to
-- auth.users, matching how leads.customer_id/appointments.customer_id
-- already work), nullable lead_id back-reference to the CRM inquiry
-- that originated the sale, nullable agent_id for the assigned
-- salesperson.
--
-- seller_name/seller_phone/seller_notes: this codebase has no
-- owner/seller entity at all (confirmed — no owner_id anywhere). Rather
-- than invent a fake "owner" record, these are plain optional text
-- fields an admin can fill in for a resale deal; a normalized
-- property_owners table can be added later without touching this shape.
--
-- final_amount / outstanding_amount are DB-generated columns (never
-- drift from negotiated_price/discount_amount/received_amount, and
-- clamped at 0 so a bad discount can never produce a negative deal
-- value or a negative outstanding balance — section 12/60).
-- received_amount itself is trigger-maintained from deal_payments
-- below (see recalc_deal_received_amount()), never edited directly, so
-- it always reflects real, verified payments only.
-- ---------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  deal_number text unique,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  seller_name text,
  seller_phone text,
  seller_notes text,
  deal_type text not null check (
    deal_type in ('Property Sale', 'Property Purchase', 'Property Rent', 'Project Booking', 'Investment', 'Other')
  ),
  status text not null default 'New' check (
    status in ('New', 'Negotiation', 'Booking Pending', 'Booked', 'Documentation', 'Payment In Progress', 'Completed', 'Cancelled')
  ),
  property_price numeric,
  negotiated_price numeric not null default 0 check (negotiated_price >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  discount_reason text,
  final_amount numeric generated always as (greatest(coalesce(negotiated_price, 0) - coalesce(discount_amount, 0), 0)) stored,
  booking_amount numeric not null default 0 check (booking_amount >= 0),
  booking_date date,
  booking_status text not null default 'Pending' check (booking_status in ('Pending', 'Received', 'Refunded', 'Adjusted')),
  received_amount numeric not null default 0 check (received_amount >= 0),
  outstanding_amount numeric generated always as (
    greatest(greatest(coalesce(negotiated_price, 0) - coalesce(discount_amount, 0), 0) - received_amount, 0)
  ) stored,
  commission_rate numeric check (commission_rate is null or commission_rate >= 0),
  commission_amount numeric check (commission_amount is null or commission_amount >= 0),
  commission_override_reason text,
  commission_status text not null default 'Pending' check (commission_status in ('Pending', 'Approved', 'Partially Paid', 'Paid')),
  commission_paid_amount numeric not null default 0 check (commission_paid_amount >= 0),
  commission_paid_at timestamptz,
  expected_completion_date date,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text check (
    cancellation_reason is null or cancellation_reason in ('Customer Cancelled', 'Payment Issue', 'Property Unavailable', 'Documentation Issue', 'Other')
  ),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_deal_number()
returns trigger
language plpgsql
as $$
begin
  if new.deal_number is null then
    new.deal_number := 'DEAL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.deals_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_deal_number on public.deals;
create trigger set_deal_number before insert on public.deals for each row execute function public.generate_deal_number();

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at before update on public.deals for each row execute function public.set_updated_at();

create index if not exists deals_deal_number_idx on public.deals (deal_number);
create index if not exists deals_lead_idx on public.deals (lead_id);
create index if not exists deals_customer_idx on public.deals (customer_id);
create index if not exists deals_property_idx on public.deals (property_id);
create index if not exists deals_project_idx on public.deals (project_id);
create index if not exists deals_agent_idx on public.deals (agent_id);
create index if not exists deals_status_idx on public.deals (status);
create index if not exists deals_created_at_idx on public.deals (created_at);
create index if not exists deals_booking_date_idx on public.deals (booking_date);
create index if not exists deals_commission_status_idx on public.deals (commission_status);

-- Concurrency protection (sections 47/48): once a deal actually reaches
-- a confirmed-booking-or-later stage, no other deal on the same
-- property may also be in a confirmed stage at the same time. A second
-- concurrent "confirm booking" attempt hits this unique index and fails
-- with a clear 23505 error, which the service layer turns into "Another
-- transaction has already reserved this property." Cancelled/completed
-- history is excluded on the Cancelled side only (Completed deals must
-- keep blocking the slot — a re-sale needs a fresh property record or
-- an explicit reopen, not a second concurrent deal).
create unique index if not exists deals_property_confirmed_unique_idx
  on public.deals (property_id)
  where property_id is not null and status in ('Booked', 'Documentation', 'Payment In Progress', 'Completed');

alter table public.deals enable row level security;

drop policy if exists "deals_admin_all" on public.deals;
create policy "deals_admin_all"
  on public.deals for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deals_agent_read" on public.deals;
create policy "deals_agent_read"
  on public.deals for select
  to authenticated
  using (agent_id = auth.uid());

-- Agents may progress a deal (status/dates) but never its financial or
-- identity fields — enforced below by protect_deal_fields_for_agent(),
-- the same pattern already used for leads/appointments.
drop policy if exists "deals_agent_update" on public.deals;
create policy "deals_agent_update"
  on public.deals for update
  to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop policy if exists "deals_customer_read" on public.deals;
create policy "deals_customer_read"
  on public.deals for select
  to authenticated
  using (customer_id = auth.uid());

create or replace function public.protect_deal_fields_for_agent()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.deal_number := old.deal_number;
    new.lead_id := old.lead_id;
    new.customer_id := old.customer_id;
    new.property_id := old.property_id;
    new.project_id := old.project_id;
    new.agent_id := old.agent_id;
    new.seller_name := old.seller_name;
    new.seller_phone := old.seller_phone;
    new.seller_notes := old.seller_notes;
    new.deal_type := old.deal_type;
    new.property_price := old.property_price;
    new.negotiated_price := old.negotiated_price;
    new.discount_amount := old.discount_amount;
    new.discount_reason := old.discount_reason;
    new.booking_amount := old.booking_amount;
    new.booking_status := old.booking_status;
    new.received_amount := old.received_amount;
    new.commission_rate := old.commission_rate;
    new.commission_amount := old.commission_amount;
    new.commission_override_reason := old.commission_override_reason;
    new.commission_status := old.commission_status;
    new.commission_paid_amount := old.commission_paid_amount;
    new.commission_paid_at := old.commission_paid_at;
    new.cancellation_reason := old.cancellation_reason;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists deals_protect_agent_fields on public.deals;
create trigger deals_protect_agent_fields before update on public.deals
  for each row execute function public.protect_deal_fields_for_agent();

-- ---------------------------------------------------------------------
-- deal_payments — every real payment recorded against a deal. Never
-- edited after verification (section 29) — corrections go through
-- deal_payment_refunds below, never a silent UPDATE of amount/status
-- from Verified.
--
-- schedule_item_id optionally ties a payment to a specific planned
-- installment from the EXISTING STEP 12 payment_schedule_items table
-- (section 20) — connects to the real installment plan rather than
-- duplicating it. Left null for payments not tied to a specific
-- installment (e.g. a booking amount, or a lump sum).
-- ---------------------------------------------------------------------
create table if not exists public.deal_payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  schedule_item_id uuid references public.payment_schedule_items (id) on delete set null,
  amount numeric not null check (amount > 0),
  payment_type text not null check (payment_type in ('Booking', 'Installment', 'Down Payment', 'Full Payment', 'Other')),
  payment_method text not null check (payment_method in ('Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'Other')),
  reference text,
  payment_date date not null default current_date,
  status text not null default 'Received' check (status in ('Pending', 'Received', 'Verified', 'Rejected', 'Refunded')),
  notes text,
  recorded_by uuid references public.admin_profiles (id) on delete set null,
  verified_by uuid references public.admin_profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists deal_payments_set_updated_at on public.deal_payments;
create trigger deal_payments_set_updated_at before update on public.deal_payments for each row execute function public.set_updated_at();

create index if not exists deal_payments_deal_idx on public.deal_payments (deal_id);
create index if not exists deal_payments_schedule_item_idx on public.deal_payments (schedule_item_id);
create index if not exists deal_payments_status_idx on public.deal_payments (status);
create index if not exists deal_payments_payment_date_idx on public.deal_payments (payment_date);

alter table public.deal_payments enable row level security;

drop policy if exists "deal_payments_admin_all" on public.deal_payments;
create policy "deal_payments_admin_all"
  on public.deal_payments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent may log a payment they personally collected for their own
-- deal (status starts at 'Received') but can never mark one 'Verified'
-- themselves — no agent UPDATE policy exists below, so RLS blocks that
-- regardless of what the application layer does (section 17).
drop policy if exists "deal_payments_agent_insert" on public.deal_payments;
create policy "deal_payments_agent_insert"
  on public.deal_payments for insert
  to authenticated
  with check (
    status = 'Received'
    and exists (select 1 from public.deals d where d.id = deal_payments.deal_id and d.agent_id = auth.uid())
  );

drop policy if exists "deal_payments_agent_read" on public.deal_payments;
create policy "deal_payments_agent_read"
  on public.deal_payments for select
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_payments.deal_id and d.agent_id = auth.uid()));

drop policy if exists "deal_payments_customer_read" on public.deal_payments;
create policy "deal_payments_customer_read"
  on public.deal_payments for select
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_payments.deal_id and d.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- deal_payment_refunds — a linked reversal record (section 32). The
-- original deal_payments row is never deleted or silently changed.
-- ---------------------------------------------------------------------
create table if not exists public.deal_payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.deal_payments (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  amount numeric not null check (amount > 0),
  refund_date date not null default current_date,
  reason text,
  reference text,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Rejected')),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists deal_payment_refunds_payment_idx on public.deal_payment_refunds (payment_id);
create index if not exists deal_payment_refunds_deal_idx on public.deal_payment_refunds (deal_id);

alter table public.deal_payment_refunds enable row level security;

drop policy if exists "deal_payment_refunds_admin_all" on public.deal_payment_refunds;
create policy "deal_payment_refunds_admin_all"
  on public.deal_payment_refunds for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deal_payment_refunds_read" on public.deal_payment_refunds;
create policy "deal_payment_refunds_read"
  on public.deal_payment_refunds for select
  to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_payment_refunds.deal_id
        and (d.agent_id = auth.uid() or d.customer_id = auth.uid())
    )
  );

-- Recalculates deals.received_amount from verified, non-refunded
-- payments only — the single source of truth for "real money received"
-- that the generated outstanding_amount column then derives from.
create or replace function public.recalc_deal_received_amount(p_deal_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.deals
  set received_amount = greatest(
    coalesce((select sum(amount) from public.deal_payments where deal_id = p_deal_id and status = 'Verified'), 0)
    - coalesce(
        (select sum(r.amount) from public.deal_payment_refunds r
           join public.deal_payments p on p.id = r.payment_id
           where p.deal_id = p_deal_id and r.status = 'Completed'),
        0
      ),
    0
  )
  where id = p_deal_id;
end;
$$;

create or replace function public.on_deal_payment_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_deal_received_amount(old.deal_id);
    return old;
  end if;
  perform public.recalc_deal_received_amount(new.deal_id);
  return new;
end;
$$;

drop trigger if exists deal_payments_recalc on public.deal_payments;
create trigger deal_payments_recalc
  after insert or update of amount, status or delete on public.deal_payments
  for each row execute function public.on_deal_payment_change();

create or replace function public.on_deal_refund_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_deal_received_amount(old.deal_id);
    return old;
  end if;
  perform public.recalc_deal_received_amount(new.deal_id);
  return new;
end;
$$;

drop trigger if exists deal_payment_refunds_recalc on public.deal_payment_refunds;
create trigger deal_payment_refunds_recalc
  after insert or update of amount, status or delete on public.deal_payment_refunds
  for each row execute function public.on_deal_refund_change();

-- ---------------------------------------------------------------------
-- deal_documents — reuses the existing "documents" Storage bucket and
-- resolveStorageDocuments()/deleteStorageDocuments() helper (already
-- used by properties/projects); this table just gives each file a row
-- with a category/status/uploader instead of an untyped jsonb array,
-- since a real transaction-document checklist needs per-file status
-- (section 24/25).
-- ---------------------------------------------------------------------
create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  name text not null,
  url text not null,
  document_type text not null default 'Other' check (
    document_type in ('Booking Form', 'Agreement', 'Payment Receipt', 'CNIC/Customer Document Reference', 'Property Document', 'NOC', 'Transfer Document', 'Other')
  ),
  status text not null default 'Submitted' check (status in ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists deal_documents_set_updated_at on public.deal_documents;
create trigger deal_documents_set_updated_at before update on public.deal_documents for each row execute function public.set_updated_at();

create index if not exists deal_documents_deal_idx on public.deal_documents (deal_id);

alter table public.deal_documents enable row level security;

drop policy if exists "deal_documents_admin_all" on public.deal_documents;
create policy "deal_documents_admin_all"
  on public.deal_documents for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deal_documents_agent_all" on public.deal_documents;
create policy "deal_documents_agent_all"
  on public.deal_documents for all
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_documents.deal_id and d.agent_id = auth.uid()))
  with check (exists (select 1 from public.deals d where d.id = deal_documents.deal_id and d.agent_id = auth.uid()));

-- Customers only ever see documents an admin/manager has approved —
-- never a raw upload pending review.
drop policy if exists "deal_documents_customer_read" on public.deal_documents;
create policy "deal_documents_customer_read"
  on public.deal_documents for select
  to authenticated
  using (
    status = 'Approved'
    and exists (select 1 from public.deals d where d.id = deal_documents.deal_id and d.customer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- deal_notes — private, CRM-staff-only notes. Mirrors lead_notes
-- exactly (section 26). Never exposed to customers — no customer
-- policy exists on this table at all.
-- ---------------------------------------------------------------------
create table if not exists public.deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  note text not null,
  created_by text,
  user_id uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists deal_notes_deal_idx on public.deal_notes (deal_id);

alter table public.deal_notes enable row level security;

drop policy if exists "deal_notes_admin_all" on public.deal_notes;
create policy "deal_notes_admin_all"
  on public.deal_notes for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deal_notes_agent_all" on public.deal_notes;
create policy "deal_notes_agent_all"
  on public.deal_notes for all
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id and d.agent_id = auth.uid()))
  with check (exists (select 1 from public.deals d where d.id = deal_notes.deal_id and d.agent_id = auth.uid()));
