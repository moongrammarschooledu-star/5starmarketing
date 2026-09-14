-- =====================================================================
-- STEP 27 — Complete Rental & Property Management System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTES (disclosed up front, not buried):
--   - No "rental_units" table. `property_inventory` (STEP 17) already
--     models a unit (house/apartment/shop/plot within a project or
--     standalone property) and already has a 'RENTED' status — a rental
--     unit is simply a property_inventory row (or, for a standalone
--     rental house, the property itself). `rental_properties` below
--     extends whichever one applies with rental-only fields, exactly
--     the same "thin extension, never duplicate the entity" pattern
--     STEP 26 used for contractors-over-maintenance_vendors.
--   - No separate "rent_invoices" table. `rent_schedules` below IS the
--     invoice — it already carries every field the spec's invoice
--     section lists (period, base rent, charges, discount, tax, late
--     fee, total, due date, status) plus its own server-generated
--     RENT-YYYY-NNNNN number. Two near-identical tables where one
--     always has exactly one row per the other would only add join
--     overhead, not a real distinction — the same reasoning STEP 26
--     applied to fold 8 approval tables into one.
--   - amount_paid/outstanding are NEVER stored on rent_schedules —
--     always derived live from real, CONFIRMED rent_payments rows (the
--     same "never store a number that can drift" rule STEP 26 applied
--     to construction_budgets' committed/actual/remaining/variance).
--   - No "management_fees" table. A management fee is a plain
--     percentage-or-fixed rule (on `landlords`, optionally overridden
--     per `leases`) applied live when a landlord statement is
--     generated — there is no real money movement to log beyond what
--     the statement already shows (the fee is simply the portion of
--     collected rent the agency keeps rather than remits).
--   - No "rental_expenses" table (explicitly asked not to duplicate
--     accounting transactions). Rental property expenses reuse the
--     EXISTING `expenses` table exactly like STEP 26 did for
--     construction — `expenses.property_id` already exists — via the
--     same expenseService Draft→Submitted→Approved→Paid workflow,
--     posting to the existing '5090 Maintenance' account for
--     maintenance-tagged costs or the new '5200 Rental Property
--     Expenses' account for everything else (repairs/insurance/other).
--   - No "tenant_statements" table. Unlike a landlord statement (which
--     carries a real opening-balance-forward), a tenant statement has
--     nothing to snapshot — rent charged/paid/outstanding/deposit are
--     always assembled live from real rent_schedules/rent_payments/
--     security_deposits rows for the lease, so a stored copy could only
--     ever go stale.
--   - No "rental_events" table for the calendar (section 45). Every
--     event type it lists already lives in a real table (lease
--     start/end on `leases`, rent due dates on `rent_schedules`,
--     inspections on the EXISTING `property_inspections`, maintenance
--     on the EXISTING `maintenance_requests`, move-in/out on
--     `rental_move_records`, renewals on `lease_renewals`, notices on
--     `rental_notices`) — the calendar is assembled live by the report
--     service from those, never a denormalized copy that could drift.
--   - Rental inspections (section 25) reuse the EXISTING
--     `property_inspections` table from STEP 25 — it already has
--     PRE_RENTAL/MOVE_IN/MOVE_OUT/ROUTINE inspection types. It gains
--     two additive, nullable columns (`unit_id`, `lease_id`) so a
--     rental inspection can be tied to the exact unit/lease, never a
--     duplicate inspection table.
--   - Rental maintenance (section 26) reuses the EXISTING
--     `maintenance_requests`/`maintenance_work_orders` tables from
--     STEP 25 unchanged — both already carry property_id/unit_id/
--     customer_id, so a tenant's maintenance request is just a normal
--     maintenance request with their own customer_id. Landlord approval
--     (section 27) is three additive, nullable columns on
--     `maintenance_work_orders` (never a new approval table).
--   - Rental documents (sections 9, 22, 43) reuse the EXISTING
--     `documents` vault from STEP 20 — 'RENTAL_AGREEMENT' is already a
--     seeded document type; this migration adds the handful that are
--     missing (addendum, move-in/move-out reports, notice, renewal
--     agreement, application document) plus one additive, nullable
--     `documents.lease_id` column so any of them can be filed directly
--     against a lease, exactly the `construction_project_id` pattern
--     STEP 26 used.
--   - Rental leads (section 42) reuse the EXISTING `leads` table
--     unchanged — `purpose` already includes 'rent' and budget_min/max/
--     preferred_location/preferred_property_type/preferred_bedrooms
--     already exist from STEP 16/17. No new columns needed.
--   - Rent collected posts as a real INCOME `financial_transactions`
--     row against the EXISTING seeded '4020 Property Rentals' account
--     the moment a rent_payment is marked CONFIRMED — via the same
--     financialTransactionService already used by the rest of
--     accounting, never a parallel ledger.
--   - Landlords/tenants are customer_profiles (the SAME Supabase Auth
--     customer login used everywhere else in this app) — never a
--     separate auth type. `landlords`/`tenants` are thin directories
--     keyed by an optional customer_id, exactly like
--     `construction_projects.customer_id` already works.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Server-side, never-frontend-generated reference numbers.
-- ---------------------------------------------------------------------
create sequence if not exists public.rental_application_seq;
create sequence if not exists public.lease_seq;
create sequence if not exists public.rent_invoice_seq;
create sequence if not exists public.rent_payment_seq;
create sequence if not exists public.rental_notice_seq;
create sequence if not exists public.landlord_statement_seq;

create or replace function public.next_rental_application_number()
returns text language sql volatile as $$
  select 'RAPP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rental_application_seq')::text, 5, '0');
$$;

create or replace function public.next_lease_number()
returns text language sql volatile as $$
  select 'LEASE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.lease_seq')::text, 5, '0');
$$;

create or replace function public.next_rent_invoice_number()
returns text language sql volatile as $$
  select 'RENT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rent_invoice_seq')::text, 5, '0');
$$;

create or replace function public.next_rent_payment_number()
returns text language sql volatile as $$
  select 'RPAY-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rent_payment_seq')::text, 5, '0');
$$;

create or replace function public.next_rental_notice_number()
returns text language sql volatile as $$
  select 'NOTICE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.rental_notice_seq')::text, 5, '0');
$$;

create or replace function public.next_landlord_statement_number()
returns text language sql volatile as $$
  select 'STMT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.landlord_statement_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------
-- landlords (section 4) — a thin directory over the SAME customer login
-- used everywhere else; never a separate auth type.
-- ---------------------------------------------------------------------
create table if not exists public.landlords (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone text,
  email text,
  address text,
  -- Free-text payment reference (e.g. "Bank Alfalah — Title: M. Munawar")
  -- — never a full account/IBAN number (section 4's own caution against
  -- storing sensitive financial credentials unnecessarily).
  payment_reference text,
  management_agreement_document_id uuid references public.documents (id) on delete set null,
  management_fee_type text not null default 'NONE' check (management_fee_type in ('NONE', 'PERCENTAGE', 'FIXED')),
  management_fee_value numeric(10, 2) not null default 0 check (management_fee_value >= 0),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists landlords_customer_unique_idx on public.landlords (customer_id) where customer_id is not null;
create index if not exists landlords_status_idx on public.landlords (status);

drop trigger if exists landlords_set_updated_at on public.landlords;
create trigger landlords_set_updated_at before update on public.landlords for each row execute function public.set_updated_at();

alter table public.landlords enable row level security;

drop policy if exists "landlords_manage_all" on public.landlords;
create policy "landlords_manage_all"
  on public.landlords for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "landlords_self_read" on public.landlords;
create policy "landlords_self_read"
  on public.landlords for select
  to authenticated
  using (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- tenants (section 5) — same pattern as landlords above.
-- ---------------------------------------------------------------------
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users (id) on delete set null,
  name text not null,
  phone text,
  email text,
  current_property_id uuid references public.properties (id) on delete set null,
  current_unit_id uuid references public.property_inventory (id) on delete set null,
  status text not null default 'PROSPECT' check (status in ('PROSPECT', 'APPLICANT', 'ACTIVE', 'NOTICE_GIVEN', 'EXPIRED', 'MOVED_OUT', 'BLACKLISTED')),
  emergency_contact_name text,
  emergency_contact_phone text,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists tenants_customer_unique_idx on public.tenants (customer_id) where customer_id is not null;
create index if not exists tenants_status_idx on public.tenants (status);
create index if not exists tenants_current_property_idx on public.tenants (current_property_id);

drop trigger if exists tenants_set_updated_at on public.tenants;
create trigger tenants_set_updated_at before update on public.tenants for each row execute function public.set_updated_at();

alter table public.tenants enable row level security;

drop policy if exists "tenants_manage_all" on public.tenants;
create policy "tenants_manage_all"
  on public.tenants for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "tenants_self_read" on public.tenants;
create policy "tenants_self_read"
  on public.tenants for select
  to authenticated
  using (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- rental_properties (section 3) — extends an EXISTING property/unit
-- with rental-only fields; never a duplicate property entity.
-- ---------------------------------------------------------------------
create table if not exists public.rental_properties (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  unit_id uuid references public.property_inventory (id) on delete set null,
  landlord_id uuid references public.landlords (id) on delete set null,
  property_manager_id uuid references public.admin_profiles (id) on delete set null,
  rental_status text not null default 'VACANT' check (rental_status in ('AVAILABLE', 'VACANT', 'OCCUPIED', 'RESERVED', 'UNDER_MAINTENANCE', 'UNAVAILABLE')),
  monthly_rent numeric(12, 2) check (monthly_rent is null or monthly_rent >= 0),
  security_deposit_amount numeric(12, 2) check (security_deposit_amount is null or security_deposit_amount >= 0),
  available_date date,
  furnished_status text not null default 'UNFURNISHED' check (furnished_status in ('UNFURNISHED', 'SEMI_FURNISHED', 'FURNISHED')),
  utilities_responsibility text not null default 'TENANT' check (utilities_responsibility in ('TENANT', 'LANDLORD', 'SHARED')),
  maintenance_responsibility text not null default 'LANDLORD' check (maintenance_responsibility in ('TENANT', 'LANDLORD', 'SHARED')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists rental_properties_property_unit_unique_idx
  on public.rental_properties (property_id, coalesce(unit_id::text, 'none'));
create index if not exists rental_properties_unit_idx on public.rental_properties (unit_id);
create index if not exists rental_properties_landlord_idx on public.rental_properties (landlord_id);
create index if not exists rental_properties_manager_idx on public.rental_properties (property_manager_id);
create index if not exists rental_properties_status_idx on public.rental_properties (rental_status);

drop trigger if exists rental_properties_set_updated_at on public.rental_properties;
create trigger rental_properties_set_updated_at before update on public.rental_properties for each row execute function public.set_updated_at();

alter table public.rental_properties enable row level security;

drop policy if exists "rental_properties_manage_all" on public.rental_properties;
create policy "rental_properties_manage_all"
  on public.rental_properties for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "rental_properties_manager_read" on public.rental_properties;
create policy "rental_properties_manager_read"
  on public.rental_properties for select
  to authenticated
  using (property_manager_id = auth.uid());

drop policy if exists "rental_properties_landlord_read" on public.rental_properties;
create policy "rental_properties_landlord_read"
  on public.rental_properties for select
  to authenticated
  using (exists (select 1 from public.landlords l where l.id = rental_properties.landlord_id and l.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- rental_applications (section 6)
-- ---------------------------------------------------------------------
create table if not exists public.rental_applications (
  id uuid primary key default gen_random_uuid(),
  application_number text not null unique default public.next_rental_application_number(),
  rental_property_id uuid not null references public.rental_properties (id) on delete cascade,
  applicant_customer_id uuid references auth.users (id) on delete set null,
  applicant_name text not null,
  applicant_phone text,
  applicant_email text,
  requested_move_in_date date,
  proposed_rent numeric(12, 2) check (proposed_rent is null or proposed_rent >= 0),
  occupants integer check (occupants is null or occupants >= 0),
  employment_info text,
  monthly_income numeric(12, 2) check (monthly_income is null or monthly_income >= 0),
  notes text,
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN')),
  reviewed_by uuid references public.admin_profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rental_applications_property_idx on public.rental_applications (rental_property_id);
create index if not exists rental_applications_applicant_idx on public.rental_applications (applicant_customer_id);
create index if not exists rental_applications_status_idx on public.rental_applications (status);

drop trigger if exists rental_applications_set_updated_at on public.rental_applications;
create trigger rental_applications_set_updated_at before update on public.rental_applications for each row execute function public.set_updated_at();

alter table public.rental_applications enable row level security;

drop policy if exists "rental_applications_manage_all" on public.rental_applications;
create policy "rental_applications_manage_all"
  on public.rental_applications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "rental_applications_applicant_read" on public.rental_applications;
create policy "rental_applications_applicant_read"
  on public.rental_applications for select
  to authenticated
  using (applicant_customer_id = auth.uid());

drop policy if exists "rental_applications_applicant_insert" on public.rental_applications;
create policy "rental_applications_applicant_insert"
  on public.rental_applications for insert
  to authenticated
  with check (applicant_customer_id = auth.uid() and status = 'SUBMITTED');

drop policy if exists "rental_applications_applicant_withdraw" on public.rental_applications;
create policy "rental_applications_applicant_withdraw"
  on public.rental_applications for update
  to authenticated
  using (applicant_customer_id = auth.uid())
  with check (applicant_customer_id = auth.uid() and status = 'WITHDRAWN');

-- ---------------------------------------------------------------------
-- leases (sections 7-8) — the central record. Only one ACTIVE/EXPIRING
-- lease may exist per rental property at a time (section 48).
-- ---------------------------------------------------------------------
create table if not exists public.leases (
  id uuid primary key default gen_random_uuid(),
  lease_number text not null unique default public.next_lease_number(),
  rental_property_id uuid not null references public.rental_properties (id) on delete restrict,
  landlord_id uuid not null references public.landlords (id) on delete restrict,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  deal_id uuid references public.deals (id) on delete set null,
  start_date date not null,
  end_date date not null,
  monthly_rent numeric(12, 2) not null check (monthly_rent >= 0),
  security_deposit numeric(12, 2) not null default 0 check (security_deposit >= 0),
  payment_due_day smallint not null default 1 check (payment_due_day between 1 and 31),
  grace_period_days integer not null default 0 check (grace_period_days >= 0),
  late_fee_type text not null default 'NONE' check (late_fee_type in ('NONE', 'FIXED', 'PERCENTAGE', 'DAILY')),
  late_fee_value numeric(10, 2) not null default 0 check (late_fee_value >= 0),
  utilities_responsibility text not null default 'TENANT' check (utilities_responsibility in ('TENANT', 'LANDLORD', 'SHARED')),
  maintenance_responsibility text not null default 'LANDLORD' check (maintenance_responsibility in ('TENANT', 'LANDLORD', 'SHARED')),
  management_fee_type text check (management_fee_type in ('NONE', 'PERCENTAGE', 'FIXED')),
  management_fee_value numeric(10, 2) check (management_fee_value is null or management_fee_value >= 0),
  renewal_terms text,
  notice_period_days integer not null default 30 check (notice_period_days >= 0),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'EXPIRING', 'EXPIRED', 'TERMINATED', 'CANCELLED')),
  terminated_at timestamptz,
  termination_reason text,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint leases_dates_check check (end_date > start_date)
);

create unique index if not exists leases_active_unique_idx
  on public.leases (rental_property_id)
  where status in ('ACTIVE', 'EXPIRING');

create index if not exists leases_rental_property_idx on public.leases (rental_property_id);
create index if not exists leases_landlord_idx on public.leases (landlord_id);
create index if not exists leases_tenant_idx on public.leases (tenant_id);
create index if not exists leases_deal_idx on public.leases (deal_id);
create index if not exists leases_status_idx on public.leases (status);
create index if not exists leases_end_date_idx on public.leases (end_date);

drop trigger if exists leases_set_updated_at on public.leases;
create trigger leases_set_updated_at before update on public.leases for each row execute function public.set_updated_at();

alter table public.leases enable row level security;

drop policy if exists "leases_manage_all" on public.leases;
create policy "leases_manage_all"
  on public.leases for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "leases_staff_read" on public.leases;
create policy "leases_staff_read"
  on public.leases for select
  to authenticated
  using (public.is_admin());

drop policy if exists "leases_tenant_read" on public.leases;
create policy "leases_tenant_read"
  on public.leases for select
  to authenticated
  using (exists (select 1 from public.tenants t where t.id = leases.tenant_id and t.customer_id = auth.uid()));

drop policy if exists "leases_landlord_read" on public.leases;
create policy "leases_landlord_read"
  on public.leases for select
  to authenticated
  using (exists (select 1 from public.landlords l where l.id = leases.landlord_id and l.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- rent_schedules (sections 10-11) — the rent period AND its invoice,
-- one row each (see DESIGN NOTES). amount_paid/outstanding are always
-- derived live from rent_payments, never stored here.
-- ---------------------------------------------------------------------
create table if not exists public.rent_schedules (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique default public.next_rent_invoice_number(),
  lease_id uuid not null references public.leases (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  due_date date not null,
  rent_amount numeric(12, 2) not null check (rent_amount >= 0),
  additional_charges numeric(12, 2) not null default 0 check (additional_charges >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  late_fee_amount numeric(12, 2) not null default 0 check (late_fee_amount >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  total_due numeric(14, 2) generated always as (
    greatest(rent_amount + additional_charges + late_fee_amount + tax_amount - discount_amount, 0)
  ) stored,
  status text not null default 'UPCOMING' check (status in ('UPCOMING', 'DUE', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'WAIVED', 'CANCELLED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rent_schedules_period_check check (period_end >= period_start),
  constraint rent_schedules_unique_period unique (lease_id, period_start, period_end)
);

create index if not exists rent_schedules_lease_idx on public.rent_schedules (lease_id);
create index if not exists rent_schedules_due_date_idx on public.rent_schedules (due_date);
create index if not exists rent_schedules_status_idx on public.rent_schedules (status);

drop trigger if exists rent_schedules_set_updated_at on public.rent_schedules;
create trigger rent_schedules_set_updated_at before update on public.rent_schedules for each row execute function public.set_updated_at();

alter table public.rent_schedules enable row level security;

drop policy if exists "rent_schedules_manage_all" on public.rent_schedules;
create policy "rent_schedules_manage_all"
  on public.rent_schedules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "rent_schedules_staff_read" on public.rent_schedules;
create policy "rent_schedules_staff_read"
  on public.rent_schedules for select
  to authenticated
  using (public.is_admin());

drop policy if exists "rent_schedules_tenant_read" on public.rent_schedules;
create policy "rent_schedules_tenant_read"
  on public.rent_schedules for select
  to authenticated
  using (exists (select 1 from public.leases ls join public.tenants t on t.id = ls.tenant_id where ls.id = rent_schedules.lease_id and t.customer_id = auth.uid()));

drop policy if exists "rent_schedules_landlord_read" on public.rent_schedules;
create policy "rent_schedules_landlord_read"
  on public.rent_schedules for select
  to authenticated
  using (exists (select 1 from public.leases ls join public.landlords l on l.id = ls.landlord_id where ls.id = rent_schedules.lease_id and l.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- rent_payments (sections 12-14) — only CONFIRMED rows count as
-- collected rent (enforced in the service layer, never trusted from
-- the client).
-- ---------------------------------------------------------------------
create table if not exists public.rent_payments (
  id uuid primary key default gen_random_uuid(),
  payment_number text not null unique default public.next_rent_payment_number(),
  lease_id uuid not null references public.leases (id) on delete restrict,
  rent_schedule_id uuid references public.rent_schedules (id) on delete set null,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  rental_property_id uuid not null references public.rental_properties (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null check (payment_method in ('Cash', 'Bank Transfer', 'Cheque', 'Online Payment', 'Other')),
  reference_number text,
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED', 'REVERSED')),
  transaction_id uuid references public.financial_transactions (id) on delete set null,
  notes text,
  recorded_by uuid references public.admin_profiles (id) on delete set null,
  confirmed_by uuid references public.admin_profiles (id) on delete set null,
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rent_payments_lease_idx on public.rent_payments (lease_id);
create index if not exists rent_payments_schedule_idx on public.rent_payments (rent_schedule_id);
create index if not exists rent_payments_tenant_idx on public.rent_payments (tenant_id);
create index if not exists rent_payments_property_idx on public.rent_payments (rental_property_id);
create index if not exists rent_payments_status_idx on public.rent_payments (status);
create index if not exists rent_payments_date_idx on public.rent_payments (payment_date);

drop trigger if exists rent_payments_set_updated_at on public.rent_payments;
create trigger rent_payments_set_updated_at before update on public.rent_payments for each row execute function public.set_updated_at();

alter table public.rent_payments enable row level security;

drop policy if exists "rent_payments_manage_all" on public.rent_payments;
create policy "rent_payments_manage_all"
  on public.rent_payments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "rent_payments_staff_read" on public.rent_payments;
create policy "rent_payments_staff_read"
  on public.rent_payments for select
  to authenticated
  using (public.is_admin());

drop policy if exists "rent_payments_tenant_read" on public.rent_payments;
create policy "rent_payments_tenant_read"
  on public.rent_payments for select
  to authenticated
  using (exists (select 1 from public.tenants t where t.id = rent_payments.tenant_id and t.customer_id = auth.uid()));

drop policy if exists "rent_payments_landlord_read" on public.rent_payments;
create policy "rent_payments_landlord_read"
  on public.rent_payments for select
  to authenticated
  using (exists (select 1 from public.rental_properties rp join public.landlords l on l.id = rp.landlord_id where rp.id = rent_payments.rental_property_id and l.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- security_deposits + deposit_transactions (sections 15-16) — deposit
-- deductions require an authorized approval and evidence document,
-- never an automatic deduction (section 15's own instruction).
-- ---------------------------------------------------------------------
create table if not exists public.security_deposits (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null unique references public.leases (id) on delete cascade,
  tenant_id uuid not null references public.tenants (id) on delete restrict,
  rental_property_id uuid not null references public.rental_properties (id) on delete restrict,
  amount numeric(12, 2) not null check (amount >= 0),
  received_date date,
  status text not null default 'EXPECTED' check (status in ('EXPECTED', 'RECEIVED', 'HELD', 'PARTIALLY_REFUNDED', 'REFUNDED', 'FORFEITED')),
  refund_amount numeric(12, 2) check (refund_amount is null or refund_amount >= 0),
  refund_date date,
  refund_reason text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists security_deposits_tenant_idx on public.security_deposits (tenant_id);
create index if not exists security_deposits_property_idx on public.security_deposits (rental_property_id);
create index if not exists security_deposits_status_idx on public.security_deposits (status);

drop trigger if exists security_deposits_set_updated_at on public.security_deposits;
create trigger security_deposits_set_updated_at before update on public.security_deposits for each row execute function public.set_updated_at();

alter table public.security_deposits enable row level security;

drop policy if exists "security_deposits_manage_all" on public.security_deposits;
create policy "security_deposits_manage_all"
  on public.security_deposits for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "security_deposits_staff_read" on public.security_deposits;
create policy "security_deposits_staff_read"
  on public.security_deposits for select
  to authenticated
  using (public.is_admin());

drop policy if exists "security_deposits_tenant_read" on public.security_deposits;
create policy "security_deposits_tenant_read"
  on public.security_deposits for select
  to authenticated
  using (exists (select 1 from public.tenants t where t.id = security_deposits.tenant_id and t.customer_id = auth.uid()));

drop policy if exists "security_deposits_landlord_read" on public.security_deposits;
create policy "security_deposits_landlord_read"
  on public.security_deposits for select
  to authenticated
  using (exists (select 1 from public.rental_properties rp join public.landlords l on l.id = rp.landlord_id where rp.id = security_deposits.rental_property_id and l.customer_id = auth.uid()));

create table if not exists public.deposit_transactions (
  id uuid primary key default gen_random_uuid(),
  security_deposit_id uuid not null references public.security_deposits (id) on delete cascade,
  transaction_type text not null check (transaction_type in ('RECEIVED', 'DEDUCTION', 'REFUND')),
  amount numeric(12, 2) not null check (amount > 0),
  reason text,
  evidence_document_id uuid references public.documents (id) on delete set null,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  transaction_date date not null default current_date,
  created_at timestamptz not null default now()
);

create index if not exists deposit_transactions_deposit_idx on public.deposit_transactions (security_deposit_id, created_at desc);

alter table public.deposit_transactions enable row level security;

drop policy if exists "deposit_transactions_manage_all" on public.deposit_transactions;
create policy "deposit_transactions_manage_all"
  on public.deposit_transactions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deposit_transactions_involved_read" on public.deposit_transactions;
create policy "deposit_transactions_involved_read"
  on public.deposit_transactions for select
  to authenticated
  using (
    exists (
      select 1 from public.security_deposits sd
      left join public.tenants t on t.id = sd.tenant_id
      left join public.rental_properties rp on rp.id = sd.rental_property_id
      left join public.landlords l on l.id = rp.landlord_id
      where sd.id = deposit_transactions.security_deposit_id
        and (t.customer_id = auth.uid() or l.customer_id = auth.uid() or public.is_admin())
    )
  );

-- ---------------------------------------------------------------------
-- rental_notices (section 22)
-- ---------------------------------------------------------------------
create table if not exists public.rental_notices (
  id uuid primary key default gen_random_uuid(),
  notice_number text not null unique default public.next_rental_notice_number(),
  lease_id uuid references public.leases (id) on delete set null,
  rental_property_id uuid references public.rental_properties (id) on delete set null,
  recipient_customer_id uuid references auth.users (id) on delete set null,
  recipient_type text not null default 'TENANT' check (recipient_type in ('TENANT', 'LANDLORD')),
  notice_type text not null check (notice_type in ('RENT_NOTICE', 'LEASE_EXPIRY_NOTICE', 'RENEWAL_NOTICE', 'MAINTENANCE_NOTICE', 'INSPECTION_NOTICE', 'MOVE_OUT_NOTICE', 'GENERAL_NOTICE')),
  issue_date date not null default current_date,
  effective_date date,
  content text not null,
  document_id uuid references public.documents (id) on delete set null,
  status text not null default 'ISSUED' check (status in ('DRAFT', 'ISSUED', 'ACKNOWLEDGED', 'CANCELLED')),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rental_notices_lease_idx on public.rental_notices (lease_id);
create index if not exists rental_notices_property_idx on public.rental_notices (rental_property_id);
create index if not exists rental_notices_recipient_idx on public.rental_notices (recipient_customer_id);
create index if not exists rental_notices_type_idx on public.rental_notices (notice_type);
create index if not exists rental_notices_status_idx on public.rental_notices (status);

drop trigger if exists rental_notices_set_updated_at on public.rental_notices;
create trigger rental_notices_set_updated_at before update on public.rental_notices for each row execute function public.set_updated_at();

alter table public.rental_notices enable row level security;

drop policy if exists "rental_notices_manage_all" on public.rental_notices;
create policy "rental_notices_manage_all"
  on public.rental_notices for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "rental_notices_recipient_read" on public.rental_notices;
create policy "rental_notices_recipient_read"
  on public.rental_notices for select
  to authenticated
  using (recipient_customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- lease_renewals (section 21) — never auto-increases rent; the lease's
-- own monthly_rent/end_date are only updated by the service layer once
-- a renewal reaches SIGNED.
-- ---------------------------------------------------------------------
create table if not exists public.lease_renewals (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases (id) on delete cascade,
  old_rent numeric(12, 2) not null check (old_rent >= 0),
  new_rent numeric(12, 2) not null check (new_rent >= 0),
  old_end_date date not null,
  new_end_date date not null,
  change_percent numeric(6, 2),
  effective_date date not null,
  status text not null default 'REQUESTED' check (status in ('REQUESTED', 'TERMS_PROPOSED', 'APPROVED', 'SIGNED', 'REJECTED', 'CANCELLED')),
  requested_by uuid references public.admin_profiles (id) on delete set null,
  requested_by_customer_id uuid references auth.users (id) on delete set null,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  approved_at timestamptz,
  new_lease_document_id uuid references public.documents (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lease_renewals_new_end_check check (new_end_date > old_end_date)
);

create index if not exists lease_renewals_lease_idx on public.lease_renewals (lease_id);
create index if not exists lease_renewals_status_idx on public.lease_renewals (status);

drop trigger if exists lease_renewals_set_updated_at on public.lease_renewals;
create trigger lease_renewals_set_updated_at before update on public.lease_renewals for each row execute function public.set_updated_at();

alter table public.lease_renewals enable row level security;

drop policy if exists "lease_renewals_manage_all" on public.lease_renewals;
create policy "lease_renewals_manage_all"
  on public.lease_renewals for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lease_renewals_staff_read" on public.lease_renewals;
create policy "lease_renewals_staff_read"
  on public.lease_renewals for select
  to authenticated
  using (public.is_admin());

drop policy if exists "lease_renewals_tenant_all" on public.lease_renewals;
create policy "lease_renewals_tenant_all"
  on public.lease_renewals for all
  to authenticated
  using (exists (select 1 from public.leases ls join public.tenants t on t.id = ls.tenant_id where ls.id = lease_renewals.lease_id and t.customer_id = auth.uid()))
  with check (exists (select 1 from public.leases ls join public.tenants t on t.id = ls.tenant_id where ls.id = lease_renewals.lease_id and t.customer_id = auth.uid()) and status = 'REQUESTED');

drop policy if exists "lease_renewals_landlord_read" on public.lease_renewals;
create policy "lease_renewals_landlord_read"
  on public.lease_renewals for select
  to authenticated
  using (exists (select 1 from public.leases ls join public.landlords l on l.id = ls.landlord_id where ls.id = lease_renewals.lease_id and l.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- rental_move_records (sections 23-24) — unifies move-in and move-out
-- into one polymorphic table (record_type), the same reasoning STEP 26
-- used for construction_approvals. A property is never auto-marked
-- vacant — that's a separate, explicit rentalPropertyService call once
-- this record's status reaches COMPLETED.
-- ---------------------------------------------------------------------
create table if not exists public.rental_move_records (
  id uuid primary key default gen_random_uuid(),
  lease_id uuid not null references public.leases (id) on delete cascade,
  record_type text not null check (record_type in ('MOVE_IN', 'MOVE_OUT')),
  scheduled_date date,
  completed_date date,
  inspection_id uuid references public.property_inspections (id) on delete set null,
  deposit_received boolean not null default false,
  documents_completed boolean not null default false,
  keys_handed_over boolean not null default false,
  tenant_confirmed boolean not null default false,
  tenant_confirmed_at timestamptz,
  outstanding_rent_cleared boolean not null default false,
  utilities_settled boolean not null default false,
  notice_id uuid references public.rental_notices (id) on delete set null,
  status text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rental_move_records_unique unique (lease_id, record_type)
);

create index if not exists rental_move_records_lease_idx on public.rental_move_records (lease_id);
create index if not exists rental_move_records_status_idx on public.rental_move_records (status);

drop trigger if exists rental_move_records_set_updated_at on public.rental_move_records;
create trigger rental_move_records_set_updated_at before update on public.rental_move_records for each row execute function public.set_updated_at();

alter table public.rental_move_records enable row level security;

drop policy if exists "rental_move_records_manage_all" on public.rental_move_records;
create policy "rental_move_records_manage_all"
  on public.rental_move_records for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "rental_move_records_tenant_read" on public.rental_move_records;
create policy "rental_move_records_tenant_read"
  on public.rental_move_records for select
  to authenticated
  using (exists (select 1 from public.leases ls join public.tenants t on t.id = ls.tenant_id where ls.id = rental_move_records.lease_id and t.customer_id = auth.uid()));

drop policy if exists "rental_move_records_tenant_confirm" on public.rental_move_records;
create policy "rental_move_records_tenant_confirm"
  on public.rental_move_records for update
  to authenticated
  using (exists (select 1 from public.leases ls join public.tenants t on t.id = ls.tenant_id where ls.id = rental_move_records.lease_id and t.customer_id = auth.uid()))
  with check (exists (select 1 from public.leases ls join public.tenants t on t.id = ls.tenant_id where ls.id = rental_move_records.lease_id and t.customer_id = auth.uid()));

create or replace function public.protect_move_record_fields_for_tenant()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.lease_id is distinct from old.lease_id
    or new.record_type is distinct from old.record_type
    or new.scheduled_date is distinct from old.scheduled_date
    or new.completed_date is distinct from old.completed_date
    or new.inspection_id is distinct from old.inspection_id
    or new.deposit_received is distinct from old.deposit_received
    or new.documents_completed is distinct from old.documents_completed
    or new.keys_handed_over is distinct from old.keys_handed_over
    or new.outstanding_rent_cleared is distinct from old.outstanding_rent_cleared
    or new.utilities_settled is distinct from old.utilities_settled
    or new.notice_id is distinct from old.notice_id
    or new.status is distinct from old.status
  then
    raise exception 'You may only confirm your own move-in/move-out record.';
  end if;
  return new;
end;
$$;

drop trigger if exists rental_move_records_protect_tenant on public.rental_move_records;
create trigger rental_move_records_protect_tenant before update on public.rental_move_records
  for each row execute function public.protect_move_record_fields_for_tenant();

drop policy if exists "rental_move_records_landlord_read" on public.rental_move_records;
create policy "rental_move_records_landlord_read"
  on public.rental_move_records for select
  to authenticated
  using (exists (select 1 from public.leases ls join public.landlords l on l.id = ls.landlord_id where ls.id = rental_move_records.lease_id and l.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- landlord_statements (section 30) — a real, immutable-once-finalized
-- snapshot (like a financial statement), not a purely live report,
-- since it carries an opening balance forward from the prior period.
-- ---------------------------------------------------------------------
create table if not exists public.landlord_statements (
  id uuid primary key default gen_random_uuid(),
  statement_number text not null unique default public.next_landlord_statement_number(),
  landlord_id uuid not null references public.landlords (id) on delete cascade,
  period_start date not null,
  period_end date not null,
  opening_balance numeric(14, 2) not null default 0,
  rent_collected numeric(14, 2) not null default 0 check (rent_collected >= 0),
  other_income numeric(14, 2) not null default 0 check (other_income >= 0),
  maintenance_expenses numeric(14, 2) not null default 0 check (maintenance_expenses >= 0),
  management_fees numeric(14, 2) not null default 0 check (management_fees >= 0),
  other_expenses numeric(14, 2) not null default 0 check (other_expenses >= 0),
  adjustments numeric(14, 2) not null default 0,
  net_amount numeric(14, 2) generated always as (
    rent_collected + other_income - maintenance_expenses - management_fees - other_expenses + adjustments
  ) stored,
  closing_balance numeric(14, 2) generated always as (
    opening_balance + rent_collected + other_income - maintenance_expenses - management_fees - other_expenses + adjustments
  ) stored,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'FINALIZED')),
  generated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landlord_statements_period_check check (period_end >= period_start),
  constraint landlord_statements_unique_period unique (landlord_id, period_start, period_end)
);

create index if not exists landlord_statements_landlord_idx on public.landlord_statements (landlord_id);
create index if not exists landlord_statements_period_idx on public.landlord_statements (period_start, period_end);

drop trigger if exists landlord_statements_set_updated_at on public.landlord_statements;
create trigger landlord_statements_set_updated_at before update on public.landlord_statements for each row execute function public.set_updated_at();

create or replace function public.prevent_finalized_statement_edit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'FINALIZED' then
    raise exception 'A finalized landlord statement cannot be edited.';
  end if;
  return new;
end;
$$;

drop trigger if exists landlord_statements_protect_finalized on public.landlord_statements;
create trigger landlord_statements_protect_finalized before update on public.landlord_statements
  for each row execute function public.prevent_finalized_statement_edit();

alter table public.landlord_statements enable row level security;

drop policy if exists "landlord_statements_manage_all" on public.landlord_statements;
create policy "landlord_statements_manage_all"
  on public.landlord_statements for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "landlord_statements_landlord_read" on public.landlord_statements;
create policy "landlord_statements_landlord_read"
  on public.landlord_statements for select
  to authenticated
  using (exists (select 1 from public.landlords l where l.id = landlord_statements.landlord_id and l.customer_id = auth.uid()) and status = 'FINALIZED');

-- ---------------------------------------------------------------------
-- rental_audit_logs (section 51) — mirrors construction_audit_logs/
-- maintenance_audit_logs exactly.
-- ---------------------------------------------------------------------
create table if not exists public.rental_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references public.admin_profiles (id) on delete set null,
  actor_name text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists rental_audit_logs_entity_idx on public.rental_audit_logs (entity_type, entity_id);
create index if not exists rental_audit_logs_created_idx on public.rental_audit_logs (created_at);

alter table public.rental_audit_logs enable row level security;

drop policy if exists "rental_audit_logs_manage_all" on public.rental_audit_logs;
create policy "rental_audit_logs_manage_all"
  on public.rental_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- rental_settings (singleton, sections 18-20) — configurable defaults;
-- never a hardcoded late-fee/reminder rule.
-- ---------------------------------------------------------------------
create table if not exists public.rental_settings (
  id smallint primary key default 1,
  default_grace_period_days integer not null default 5 check (default_grace_period_days >= 0),
  default_late_fee_type text not null default 'NONE' check (default_late_fee_type in ('NONE', 'FIXED', 'PERCENTAGE', 'DAILY')),
  default_late_fee_value numeric(10, 2) not null default 0 check (default_late_fee_value >= 0),
  lease_expiry_reminder_days integer[] not null default array[60, 30, 7],
  rent_due_reminder_days_before integer not null default 3 check (rent_due_reminder_days_before >= 0),
  currency text not null default 'PKR',
  updated_at timestamptz not null default now(),
  constraint rental_settings_singleton check (id = 1)
);

insert into public.rental_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists rental_settings_set_updated_at on public.rental_settings;
create trigger rental_settings_set_updated_at before update on public.rental_settings for each row execute function public.set_updated_at();

alter table public.rental_settings enable row level security;

drop policy if exists "rental_settings_public_read" on public.rental_settings;
create policy "rental_settings_public_read"
  on public.rental_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "rental_settings_admin_write" on public.rental_settings;
create policy "rental_settings_admin_write"
  on public.rental_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- =====================================================================
-- Additive columns on EXISTING tables — never a duplicate table.
-- =====================================================================

-- property_inspections (STEP 25) — rental inspections (section 25) tie
-- to the exact unit/lease, reusing this table unchanged otherwise.
alter table public.property_inspections add column if not exists unit_id uuid references public.property_inventory (id) on delete set null;
alter table public.property_inspections add column if not exists lease_id uuid references public.leases (id) on delete set null;
create index if not exists property_inspections_unit_idx on public.property_inspections (unit_id);
create index if not exists property_inspections_lease_idx on public.property_inspections (lease_id);

-- maintenance_work_orders (STEP 25) — optional landlord approval
-- (section 27); NOT_REQUIRED by default so every existing/new
-- non-rental work order is completely unaffected.
alter table public.maintenance_work_orders add column if not exists landlord_approval_status text not null default 'NOT_REQUIRED' check (landlord_approval_status in ('NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED'));
alter table public.maintenance_work_orders add column if not exists landlord_approved_by uuid references auth.users (id) on delete set null;
alter table public.maintenance_work_orders add column if not exists landlord_approved_at timestamptz;

drop policy if exists "maintenance_work_orders_landlord_read" on public.maintenance_work_orders;
create policy "maintenance_work_orders_landlord_read"
  on public.maintenance_work_orders for select
  to authenticated
  using (exists (select 1 from public.rental_properties rp join public.landlords l on l.id = rp.landlord_id where rp.property_id = maintenance_work_orders.property_id and l.customer_id = auth.uid()));

create or replace function public.protect_work_order_fields_for_landlord()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.landlord_approval_status is distinct from old.landlord_approval_status and old.landlord_approval_status = 'PENDING' and new.landlord_approval_status in ('APPROVED', 'REJECTED') then
    -- allowed: a landlord may only move PENDING -> APPROVED/REJECTED, nothing else on the row.
    if new.work_order_number is distinct from old.work_order_number
      or new.maintenance_request_id is distinct from old.maintenance_request_id
      or new.property_id is distinct from old.property_id
      or new.unit_id is distinct from old.unit_id
      or new.estimated_cost is distinct from old.estimated_cost
      or new.approved_cost is distinct from old.approved_cost
      or new.actual_cost is distinct from old.actual_cost
      or new.status is distinct from old.status
    then
      raise exception 'You may only approve or reject this work order''s cost.';
    end if;
    return new;
  end if;
  raise exception 'You are not authorized to modify this work order.';
end;
$$;

drop trigger if exists maintenance_work_orders_landlord_protect on public.maintenance_work_orders;
create trigger maintenance_work_orders_landlord_protect before update on public.maintenance_work_orders
  for each row execute function public.protect_work_order_fields_for_landlord();

drop policy if exists "maintenance_work_orders_landlord_approve" on public.maintenance_work_orders;
create policy "maintenance_work_orders_landlord_approve"
  on public.maintenance_work_orders for update
  to authenticated
  using (exists (select 1 from public.rental_properties rp join public.landlords l on l.id = rp.landlord_id where rp.property_id = maintenance_work_orders.property_id and l.customer_id = auth.uid()))
  with check (exists (select 1 from public.rental_properties rp join public.landlords l on l.id = rp.landlord_id where rp.property_id = maintenance_work_orders.property_id and l.customer_id = auth.uid()));

drop policy if exists "property_inspections_landlord_read" on public.property_inspections;
create policy "property_inspections_landlord_read"
  on public.property_inspections for select
  to authenticated
  using (exists (select 1 from public.rental_properties rp join public.landlords l on l.id = rp.landlord_id where rp.property_id = property_inspections.property_id and l.customer_id = auth.uid()));

-- documents (STEP 20) — file rental documents (agreement/addendum/
-- move-in/move-out reports/notices/renewal) directly against a lease,
-- the exact `construction_project_id` pattern from STEP 26.
alter table public.documents add column if not exists lease_id uuid references public.leases (id) on delete set null;
create index if not exists idx_documents_lease on public.documents (lease_id);

drop policy if exists "documents_lease_tenant_read" on public.documents;
create policy "documents_lease_tenant_read"
  on public.documents for select
  to authenticated
  using (
    visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED')
    and lease_id is not null
    and exists (select 1 from public.leases ls join public.tenants t on t.id = ls.tenant_id where ls.id = documents.lease_id and t.customer_id = auth.uid())
  );

drop policy if exists "documents_lease_landlord_read" on public.documents;
create policy "documents_lease_landlord_read"
  on public.documents for select
  to authenticated
  using (
    visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED')
    and lease_id is not null
    and exists (select 1 from public.leases ls join public.landlords l on l.id = ls.landlord_id where ls.id = documents.lease_id and l.customer_id = auth.uid())
  );

drop policy if exists "documents_property_landlord_read" on public.documents;
create policy "documents_property_landlord_read"
  on public.documents for select
  to authenticated
  using (
    visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED')
    and property_id is not null
    and exists (select 1 from public.rental_properties rp join public.landlords l on l.id = rp.landlord_id where rp.property_id = documents.property_id and l.customer_id = auth.uid())
  );

-- New expense account for rental property costs that don't already fit
-- an existing category (repairs/insurance/external property management)
-- — maintenance-tagged rental costs still use the EXISTING '5090
-- Maintenance' account, never a duplicate.
insert into public.accounts (account_code, name, account_type, parent_id)
select '5200', 'Rental Property Expenses', 'EXPENSE', a.id from public.accounts a where a.account_code = '5000'
on conflict (account_code) do nothing;

-- New document_types (sections 9, 22, 43) — 'RENTAL_AGREEMENT' already
-- exists from STEP 20; only the missing ones are added here.
insert into public.document_types (code, label, category, requires_expiry, sort_order) values
  ('LEASE_ADDENDUM', 'Lease Addendum', 'Legal Agreement', false, 340),
  ('LEASE_RENEWAL_AGREEMENT', 'Lease Renewal Agreement', 'Legal Agreement', false, 350),
  ('MOVE_IN_REPORT', 'Move-In Report', 'Property', false, 360),
  ('MOVE_OUT_REPORT', 'Move-Out Report', 'Property', false, 370),
  ('RENTAL_NOTICE_DOCUMENT', 'Rental Notice', 'Legal Agreement', false, 380),
  ('RENTAL_APPLICATION_DOCUMENT', 'Rental Application Document', 'Other', false, 390)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- New AdminSection "rentals" nav/permission gate — mirrors STEP
-- 23-26's additions (code-level in permissions.ts, no DB change needed
-- since section gating isn't stored in the database).
-- ---------------------------------------------------------------------
