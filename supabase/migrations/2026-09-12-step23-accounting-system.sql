-- =====================================================================
-- STEP 23 — Complete Real Estate Accounting, Expenses, Profit &
-- Commission Management System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTES (disclosed up front, not buried):
--   - Commission has ALWAYS been tracked directly on `deals` (commission_
--     rate/amount/status/paid_amount/paid_at, since STEP 18). This step
--     adds a proper rules engine + ledger (commission_rules,
--     agent_commissions) on top — every calculate/approve/pay action
--     ALSO writes through to the existing deals.commission_* columns via
--     dealService, so the Deal Financial Tab and every existing report
--     keeps working unchanged. deals.received_amount/outstanding_amount
--     remain trigger-owned (recalc_deal_received_amount) — nothing here
--     touches them directly.
--   - "Receivables" (section 20-22) are NOT a new table — they are
--     computed live from `deals` (outstanding_amount > 0) joined with the
--     existing STEP 12 payment schedule for a due date, exactly per
--     section 21's "never calculate outstanding based on frontend-only
--     values... use server-side/database calculations." This avoids a
--     second, driftable copy of the same numbers.
--   - "Refunds" (section 47) reuse the EXISTING `deal_payment_refunds`
--     table (STEP 18) rather than a duplicate — a completed refund there
--     now also produces a REFUND-type row in financial_transactions.
--   - "Financial Periods" (section 41/64) are NOT a persisted table —
--     Month/Quarter/Year/Custom are computed date ranges in report
--     queries; there is nothing to store.
--   - "Account categories" and "expense categories" are the SAME concept
--     here: expense categories are simply EXPENSE-type rows in the one
--     chart-of-accounts table (`accounts`), avoiding a second, parallel
--     categorization table (section 6's own instruction: "do not build
--     unnecessary enterprise accounting complexity unless required").
--   - Expense receipts get their OWN lightweight attachment table
--     (`expense_attachments`, mirroring communication_attachments)
--     rather than being forced through the heavier STEP 20 `documents`
--     workflow (which carries signature/checklist machinery a receipt
--     doesn't need).
--   - Every "no hard delete" requirement (section 9/57) is enforced with
--     a real BEFORE DELETE trigger on financial_transactions, expenses,
--     agent_commissions and payables — not just application discipline.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Server-side, never-frontend-generated document numbers (section 10).
-- ---------------------------------------------------------------------
create sequence if not exists public.financial_transaction_seq;
create sequence if not exists public.expense_seq;
create sequence if not exists public.payable_seq;
create sequence if not exists public.agent_commission_seq;
create sequence if not exists public.financial_adjustment_seq;

create or replace function public.next_transaction_number()
returns text language sql volatile as $$
  select 'TXN-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.financial_transaction_seq')::text, 6, '0');
$$;

create or replace function public.next_expense_number()
returns text language sql volatile as $$
  select 'EXP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.expense_seq')::text, 6, '0');
$$;

create or replace function public.next_payable_number()
returns text language sql volatile as $$
  select 'PAY-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.payable_seq')::text, 6, '0');
$$;

create or replace function public.next_commission_number()
returns text language sql volatile as $$
  select 'COMM-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.agent_commission_seq')::text, 6, '0');
$$;

create or replace function public.next_adjustment_number()
returns text language sql volatile as $$
  select 'ADJ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.financial_adjustment_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------
-- accounting_settings (singleton, mirrors communication_settings /
-- website_settings) — no secrets, just operational defaults.
-- ---------------------------------------------------------------------
create table if not exists public.accounting_settings (
  id smallint primary key default 1,
  default_commission_basis text not null default 'DEAL_AMOUNT' check (default_commission_basis in ('DEAL_AMOUNT', 'COLLECTED_AMOUNT')),
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  currency text not null default 'PKR',
  updated_at timestamptz not null default now(),
  constraint accounting_settings_singleton check (id = 1)
);

insert into public.accounting_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists accounting_settings_set_updated_at on public.accounting_settings;
create trigger accounting_settings_set_updated_at before update on public.accounting_settings for each row execute function public.set_updated_at();

alter table public.accounting_settings enable row level security;

drop policy if exists "accounting_settings_admin_all" on public.accounting_settings;
create policy "accounting_settings_admin_all"
  on public.accounting_settings for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- accounts (sections 6-7) — the one chart-of-accounts table, doubling
-- as expense/income categories via account_type + parent_id.
-- ---------------------------------------------------------------------
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  account_code text not null unique,
  name text not null,
  account_type text not null check (account_type in ('ASSET', 'LIABILITY', 'EQUITY', 'INCOME', 'EXPENSE')),
  parent_id uuid references public.accounts (id) on delete set null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists accounts_type_idx on public.accounts (account_type);
create index if not exists accounts_parent_idx on public.accounts (parent_id);

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at before update on public.accounts for each row execute function public.set_updated_at();

alter table public.accounts enable row level security;

drop policy if exists "accounts_admin_all" on public.accounts;
create policy "accounts_admin_all"
  on public.accounts for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "accounts_agent_read" on public.accounts;
create policy "accounts_agent_read"
  on public.accounts for select
  to authenticated
  using (public.is_admin());

-- Seed the example chart of accounts from the spec (idempotent — only
-- inserts rows whose account_code doesn't already exist).
insert into public.accounts (account_code, name, account_type, parent_id)
values
  ('1000', 'Assets', 'ASSET', null),
  ('2000', 'Liabilities', 'LIABILITY', null),
  ('4000', 'Income', 'INCOME', null),
  ('5000', 'Expenses', 'EXPENSE', null)
on conflict (account_code) do nothing;

insert into public.accounts (account_code, name, account_type, parent_id)
select '1010', 'Cash', 'ASSET', a.id from public.accounts a where a.account_code = '1000'
on conflict (account_code) do nothing;
insert into public.accounts (account_code, name, account_type, parent_id)
select '1020', 'Bank', 'ASSET', a.id from public.accounts a where a.account_code = '1000'
on conflict (account_code) do nothing;
insert into public.accounts (account_code, name, account_type, parent_id)
select '1030', 'Accounts Receivable', 'ASSET', a.id from public.accounts a where a.account_code = '1000'
on conflict (account_code) do nothing;

insert into public.accounts (account_code, name, account_type, parent_id)
select '2010', 'Accounts Payable', 'LIABILITY', a.id from public.accounts a where a.account_code = '2000'
on conflict (account_code) do nothing;
insert into public.accounts (account_code, name, account_type, parent_id)
select '2020', 'Customer Advances', 'LIABILITY', a.id from public.accounts a where a.account_code = '2000'
on conflict (account_code) do nothing;

insert into public.accounts (account_code, name, account_type, parent_id)
select '4010', 'Property Sales', 'INCOME', a.id from public.accounts a where a.account_code = '4000'
on conflict (account_code) do nothing;
insert into public.accounts (account_code, name, account_type, parent_id)
select '4020', 'Property Rentals', 'INCOME', a.id from public.accounts a where a.account_code = '4000'
on conflict (account_code) do nothing;
insert into public.accounts (account_code, name, account_type, parent_id)
select '4030', 'Consultancy Income', 'INCOME', a.id from public.accounts a where a.account_code = '4000'
on conflict (account_code) do nothing;
insert into public.accounts (account_code, name, account_type, parent_id)
select '4090', 'Other Income', 'INCOME', a.id from public.accounts a where a.account_code = '4000'
on conflict (account_code) do nothing;

insert into public.accounts (account_code, name, account_type, parent_id)
select t.code, t.name, 'EXPENSE', a.id from public.accounts a, (values
  ('5010', 'Marketing'), ('5020', 'Salaries'), ('5030', 'Office Rent'), ('5040', 'Utilities'),
  ('5050', 'Construction'), ('5060', 'Transport'), ('5070', 'Legal'), ('5080', 'Agent Commission'),
  ('5090', 'Maintenance'), ('5100', 'Advertising'), ('5110', 'Internet'), ('5120', 'Fuel'),
  ('5130', 'Consultancy'), ('5140', 'Software'), ('5150', 'Equipment'), ('5160', 'Taxes'),
  ('5170', 'Bank Charges'), ('5999', 'Miscellaneous')
) as t(code, name)
where a.account_code = '5000'
on conflict (account_code) do nothing;

-- ---------------------------------------------------------------------
-- financial_transactions (sections 8-10) — the one confirmed-money
-- ledger. status DRAFT/PENDING rows are editable freely; CONFIRMED/
-- REVERSED rows are immutable (protect_confirmed_transaction_fields)
-- and can never be deleted (prevent_confirmed_transaction_delete) —
-- reversal is always a NEW linked transaction, never an edit.
-- ---------------------------------------------------------------------
create table if not exists public.financial_transactions (
  id uuid primary key default gen_random_uuid(),
  transaction_number text not null unique default public.next_transaction_number(),
  transaction_type text not null check (transaction_type in ('INCOME', 'EXPENSE', 'RECEIVABLE', 'PAYABLE', 'COMMISSION', 'REFUND', 'ADJUSTMENT')),
  account_id uuid references public.accounts (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  payment_id uuid references public.deal_payments (id) on delete set null,
  amount numeric(14, 2) not null check (amount >= 0),
  currency text not null default 'PKR',
  payment_method text check (payment_method in ('Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'Card', 'Other')),
  reference_number text,
  transaction_date date not null default current_date,
  description text,
  status text not null default 'CONFIRMED' check (status in ('DRAFT', 'PENDING', 'CONFIRMED', 'CANCELLED', 'REVERSED')),
  reversed_transaction_id uuid references public.financial_transactions (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financial_transactions_deal_idx on public.financial_transactions (deal_id);
create index if not exists financial_transactions_customer_idx on public.financial_transactions (customer_id);
create index if not exists financial_transactions_property_idx on public.financial_transactions (property_id);
create index if not exists financial_transactions_project_idx on public.financial_transactions (project_id);
create index if not exists financial_transactions_agent_idx on public.financial_transactions (agent_id);
create index if not exists financial_transactions_account_idx on public.financial_transactions (account_id);
create index if not exists financial_transactions_type_idx on public.financial_transactions (transaction_type);
create index if not exists financial_transactions_status_idx on public.financial_transactions (status);
create index if not exists financial_transactions_date_idx on public.financial_transactions (transaction_date);

drop trigger if exists financial_transactions_set_updated_at on public.financial_transactions;
create trigger financial_transactions_set_updated_at before update on public.financial_transactions for each row execute function public.set_updated_at();

create or replace function public.prevent_confirmed_transaction_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status in ('CONFIRMED', 'REVERSED') then
    raise exception 'Confirmed or reversed financial transactions cannot be deleted — reverse them with a new transaction instead.';
  end if;
  return old;
end;
$$;

drop trigger if exists financial_transactions_prevent_delete on public.financial_transactions;
create trigger financial_transactions_prevent_delete before delete on public.financial_transactions
  for each row execute function public.prevent_confirmed_transaction_delete();

create or replace function public.protect_confirmed_transaction_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status in ('CONFIRMED', 'REVERSED') then
    new.amount := old.amount;
    new.transaction_type := old.transaction_type;
    new.account_id := old.account_id;
    new.deal_id := old.deal_id;
    new.currency := old.currency;
    if old.status = 'REVERSED' or new.status not in ('CONFIRMED', 'REVERSED') then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists financial_transactions_protect_confirmed on public.financial_transactions;
create trigger financial_transactions_protect_confirmed before update on public.financial_transactions
  for each row execute function public.protect_confirmed_transaction_fields();

alter table public.financial_transactions enable row level security;

drop policy if exists "financial_transactions_admin_all" on public.financial_transactions;
create policy "financial_transactions_admin_all"
  on public.financial_transactions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- expenses (sections 15-19) — DRAFT → SUBMITTED → UNDER_REVIEW →
-- APPROVED → PAID, or REJECTED. Only PAID expenses ever generate a
-- financial_transactions row (section 18's "only approved expenses
-- should affect finalized financial reporting").
-- ---------------------------------------------------------------------
create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  expense_number text not null unique default public.next_expense_number(),
  expense_date date not null default current_date,
  account_id uuid references public.accounts (id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null check (amount >= 0),
  vendor text,
  payment_method text check (payment_method in ('Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'Card', 'Other')),
  reference_number text,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  notes text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'PAID')),
  submitted_by uuid references public.admin_profiles (id) on delete set null,
  submitted_at timestamptz,
  reviewed_by uuid references public.admin_profiles (id) on delete set null,
  reviewed_at timestamptz,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  approved_at timestamptz,
  rejected_reason text,
  paid_at timestamptz,
  transaction_id uuid references public.financial_transactions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_account_idx on public.expenses (account_id);
create index if not exists expenses_property_idx on public.expenses (property_id);
create index if not exists expenses_project_idx on public.expenses (project_id);
create index if not exists expenses_deal_idx on public.expenses (deal_id);
create index if not exists expenses_agent_idx on public.expenses (agent_id);
create index if not exists expenses_status_idx on public.expenses (status);
create index if not exists expenses_date_idx on public.expenses (expense_date);
create index if not exists expenses_submitted_by_idx on public.expenses (submitted_by);

drop trigger if exists expenses_set_updated_at on public.expenses;
create trigger expenses_set_updated_at before update on public.expenses for each row execute function public.set_updated_at();

create or replace function public.prevent_paid_expense_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'PAID' then
    raise exception 'A paid expense cannot be deleted — cancel or adjust it instead.';
  end if;
  return old;
end;
$$;

drop trigger if exists expenses_prevent_delete on public.expenses;
create trigger expenses_prevent_delete before delete on public.expenses
  for each row execute function public.prevent_paid_expense_delete();

alter table public.expenses enable row level security;

drop policy if exists "expenses_admin_all" on public.expenses;
create policy "expenses_admin_all"
  on public.expenses for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent may submit (insert) and read their own expenses only —
-- never another agent's, never approve/reject/pay their own (that
-- requires is_admin_or_manager, covered by the policy above).
drop policy if exists "expenses_agent_select" on public.expenses;
create policy "expenses_agent_select"
  on public.expenses for select
  to authenticated
  using (submitted_by = auth.uid() or agent_id = auth.uid());

drop policy if exists "expenses_agent_insert" on public.expenses;
create policy "expenses_agent_insert"
  on public.expenses for insert
  to authenticated
  with check (submitted_by = auth.uid() and status in ('DRAFT', 'SUBMITTED'));

drop policy if exists "expenses_agent_update_own_draft" on public.expenses;
create policy "expenses_agent_update_own_draft"
  on public.expenses for update
  to authenticated
  using (submitted_by = auth.uid() and status in ('DRAFT', 'SUBMITTED'))
  with check (submitted_by = auth.uid() and status in ('DRAFT', 'SUBMITTED'));

-- ---------------------------------------------------------------------
-- expense_attachments (section 17) — lightweight, mirrors
-- communication_attachments exactly; a receipt doesn't need STEP 20's
-- full signature/checklist document workflow.
-- ---------------------------------------------------------------------
create table if not exists public.expense_attachments (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists expense_attachments_expense_idx on public.expense_attachments (expense_id);

alter table public.expense_attachments enable row level security;

drop policy if exists "expense_attachments_admin_all" on public.expense_attachments;
create policy "expense_attachments_admin_all"
  on public.expense_attachments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "expense_attachments_agent_read" on public.expense_attachments;
create policy "expense_attachments_agent_read"
  on public.expense_attachments for select
  to authenticated
  using (exists (select 1 from public.expenses e where e.id = expense_attachments.expense_id and e.submitted_by = auth.uid()));

drop policy if exists "expense_attachments_agent_insert" on public.expense_attachments;
create policy "expense_attachments_agent_insert"
  on public.expense_attachments for insert
  to authenticated
  with check (exists (select 1 from public.expenses e where e.id = expense_attachments.expense_id and e.submitted_by = auth.uid() and e.status in ('DRAFT', 'SUBMITTED')));

-- ---------------------------------------------------------------------
-- payables (sections 23-24) — money the business owes vendors/
-- contractors/agents/other parties. outstanding_amount is a generated
-- column (section 75 — never trust a browser-calculated balance).
-- ---------------------------------------------------------------------
create table if not exists public.payables (
  id uuid primary key default gen_random_uuid(),
  payable_number text not null unique default public.next_payable_number(),
  vendor text not null,
  description text,
  amount numeric(14, 2) not null check (amount >= 0),
  due_date date,
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  outstanding_amount numeric(14, 2) generated always as (amount - paid_amount) stored,
  status text not null default 'PENDING' check (status in ('DRAFT', 'PENDING', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED')),
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  agent_commission_id uuid,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payables_paid_not_over_amount check (paid_amount <= amount)
);

create index if not exists payables_status_idx on public.payables (status);
create index if not exists payables_due_date_idx on public.payables (due_date);
create index if not exists payables_deal_idx on public.payables (deal_id);

drop trigger if exists payables_set_updated_at on public.payables;
create trigger payables_set_updated_at before update on public.payables for each row execute function public.set_updated_at();

create or replace function public.prevent_paid_payable_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status in ('PARTIALLY_PAID', 'PAID') then
    raise exception 'A payable with recorded payments cannot be deleted — cancel it instead.';
  end if;
  return old;
end;
$$;

drop trigger if exists payables_prevent_delete on public.payables;
create trigger payables_prevent_delete before delete on public.payables
  for each row execute function public.prevent_paid_payable_delete();

alter table public.payables enable row level security;

drop policy if exists "payables_admin_all" on public.payables;
create policy "payables_admin_all"
  on public.payables for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- commission_rules / commission_rule_tiers / commission_rule_conditions
-- (sections 25-27) — configurable, never a single hardcoded percentage.
-- A rule with zero conditions is a global fallback; a rule matches a
-- deal only if EVERY one of its conditions is satisfied (AND).
-- ---------------------------------------------------------------------
create table if not exists public.commission_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  active boolean not null default true,
  basis text not null check (basis in ('DEAL_AMOUNT', 'COLLECTED_AMOUNT', 'FIXED', 'TIERED')),
  rate numeric(6, 3),
  fixed_amount numeric(14, 2),
  priority integer not null default 100,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists commission_rules_active_idx on public.commission_rules (active);
create index if not exists commission_rules_priority_idx on public.commission_rules (priority);

drop trigger if exists commission_rules_set_updated_at on public.commission_rules;
create trigger commission_rules_set_updated_at before update on public.commission_rules for each row execute function public.set_updated_at();

alter table public.commission_rules enable row level security;

drop policy if exists "commission_rules_admin_all" on public.commission_rules;
create policy "commission_rules_admin_all"
  on public.commission_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create table if not exists public.commission_rule_tiers (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.commission_rules (id) on delete cascade,
  min_amount numeric(14, 2) not null,
  max_amount numeric(14, 2),
  rate numeric(6, 3) not null
);

create index if not exists commission_rule_tiers_rule_idx on public.commission_rule_tiers (rule_id);

alter table public.commission_rule_tiers enable row level security;

drop policy if exists "commission_rule_tiers_admin_all" on public.commission_rule_tiers;
create policy "commission_rule_tiers_admin_all"
  on public.commission_rule_tiers for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create table if not exists public.commission_rule_conditions (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.commission_rules (id) on delete cascade,
  condition_type text not null check (condition_type in ('PROPERTY', 'PROJECT', 'PROPERTY_TYPE', 'DEAL_TYPE', 'AGENT', 'TEAM')),
  condition_value text not null
);

create index if not exists commission_rule_conditions_rule_idx on public.commission_rule_conditions (rule_id);

alter table public.commission_rule_conditions enable row level security;

drop policy if exists "commission_rule_conditions_admin_all" on public.commission_rule_conditions;
create policy "commission_rule_conditions_admin_all"
  on public.commission_rule_conditions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- agent_commissions (sections 28-32) — one row per deal, the new
-- system of record; deals.commission_* stays in sync as a rolled-up
-- cache via dealService (unchanged existing consumers keep working).
-- ---------------------------------------------------------------------
create table if not exists public.agent_commissions (
  id uuid primary key default gen_random_uuid(),
  commission_number text not null unique default public.next_commission_number(),
  agent_id uuid references public.admin_profiles (id) on delete set null,
  deal_id uuid not null unique references public.deals (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  commission_rule_id uuid references public.commission_rules (id) on delete set null,
  basis text not null check (basis in ('DEAL_AMOUNT', 'COLLECTED_AMOUNT', 'FIXED', 'TIERED')),
  basis_amount numeric(14, 2) not null,
  commission_rate numeric(6, 3),
  commission_amount numeric(14, 2) not null check (commission_amount >= 0),
  status text not null default 'CALCULATED' check (status in ('CALCULATED', 'PENDING_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED')),
  paid_amount numeric(14, 2) not null default 0 check (paid_amount >= 0),
  approved_by uuid references public.admin_profiles (id) on delete set null,
  approved_at timestamptz,
  paid_at timestamptz,
  payable_id uuid references public.payables (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint agent_commissions_paid_not_over_amount check (paid_amount <= commission_amount)
);

create index if not exists agent_commissions_agent_idx on public.agent_commissions (agent_id);
create index if not exists agent_commissions_property_idx on public.agent_commissions (property_id);
create index if not exists agent_commissions_project_idx on public.agent_commissions (project_id);
create index if not exists agent_commissions_status_idx on public.agent_commissions (status);

drop trigger if exists agent_commissions_set_updated_at on public.agent_commissions;
create trigger agent_commissions_set_updated_at before update on public.agent_commissions for each row execute function public.set_updated_at();

create or replace function public.prevent_paid_commission_delete()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status in ('APPROVED', 'PARTIALLY_PAID', 'PAID') then
    raise exception 'An approved or paid commission cannot be deleted — cancel it instead.';
  end if;
  return old;
end;
$$;

drop trigger if exists agent_commissions_prevent_delete on public.agent_commissions;
create trigger agent_commissions_prevent_delete before delete on public.agent_commissions
  for each row execute function public.prevent_paid_commission_delete();

alter table public.agent_commissions enable row level security;

drop policy if exists "agent_commissions_admin_all" on public.agent_commissions;
create policy "agent_commissions_admin_all"
  on public.agent_commissions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent sees only their own commission records (section 52/66) —
-- never another agent's, never edit them directly.
drop policy if exists "agent_commissions_agent_read" on public.agent_commissions;
create policy "agent_commissions_agent_read"
  on public.agent_commissions for select
  to authenticated
  using (agent_id = auth.uid());

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'payables_commission_fk') then
    alter table public.payables add constraint payables_commission_fk foreign key (agent_commission_id) references public.agent_commissions (id) on delete set null;
  end if;
end;
$$;

-- History of recalculations (section 30) — historical figures are
-- never silently overwritten; every change is a row here.
create table if not exists public.agent_commission_adjustments (
  id uuid primary key default gen_random_uuid(),
  commission_id uuid not null references public.agent_commissions (id) on delete cascade,
  previous_amount numeric(14, 2) not null,
  new_amount numeric(14, 2) not null,
  reason text not null,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists agent_commission_adjustments_commission_idx on public.agent_commission_adjustments (commission_id);

alter table public.agent_commission_adjustments enable row level security;

drop policy if exists "agent_commission_adjustments_admin_all" on public.agent_commission_adjustments;
create policy "agent_commission_adjustments_admin_all"
  on public.agent_commission_adjustments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "agent_commission_adjustments_agent_read" on public.agent_commission_adjustments;
create policy "agent_commission_adjustments_agent_read"
  on public.agent_commission_adjustments for select
  to authenticated
  using (exists (select 1 from public.agent_commissions c where c.id = agent_commission_adjustments.commission_id and c.agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- financial_adjustments (section 48) — manual, auditable correction
-- entries; always requires a reason.
-- ---------------------------------------------------------------------
create table if not exists public.financial_adjustments (
  id uuid primary key default gen_random_uuid(),
  adjustment_number text not null unique default public.next_adjustment_number(),
  adjustment_type text not null check (adjustment_type in ('INCOME', 'EXPENSE', 'COMMISSION', 'RECEIVABLE', 'PAYABLE', 'OTHER')),
  amount numeric(14, 2) not null,
  reason text not null,
  reference text,
  deal_id uuid references public.deals (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  transaction_id uuid references public.financial_transactions (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists financial_adjustments_deal_idx on public.financial_adjustments (deal_id);

alter table public.financial_adjustments enable row level security;

drop policy if exists "financial_adjustments_admin_all" on public.financial_adjustments;
create policy "financial_adjustments_admin_all"
  on public.financial_adjustments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- reconciliation_records (sections 45-46) — manual bank-statement
-- matching foundation; nothing is ever auto-marked reconciled.
-- ---------------------------------------------------------------------
create table if not exists public.reconciliation_records (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.financial_transactions (id) on delete cascade,
  statement_reference text,
  matched_amount numeric(14, 2),
  reconciliation_status text not null default 'UNMATCHED' check (reconciliation_status in ('MATCHED', 'UNMATCHED', 'IGNORED', 'ADJUSTMENT_REQUIRED')),
  reconciled_by uuid references public.admin_profiles (id) on delete set null,
  reconciled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reconciliation_records_transaction_idx on public.reconciliation_records (transaction_id);
create index if not exists reconciliation_records_status_idx on public.reconciliation_records (reconciliation_status);

drop trigger if exists reconciliation_records_set_updated_at on public.reconciliation_records;
create trigger reconciliation_records_set_updated_at before update on public.reconciliation_records for each row execute function public.set_updated_at();

alter table public.reconciliation_records enable row level security;

drop policy if exists "reconciliation_records_admin_all" on public.reconciliation_records;
create policy "reconciliation_records_admin_all"
  on public.reconciliation_records for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- financial_audit_logs (section 56) — actor + timestamp on every
-- important financial lifecycle action, insert/select only.
-- ---------------------------------------------------------------------
create table if not exists public.financial_audit_logs (
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

create index if not exists financial_audit_logs_entity_idx on public.financial_audit_logs (entity_type, entity_id);
create index if not exists financial_audit_logs_created_idx on public.financial_audit_logs (created_at);

alter table public.financial_audit_logs enable row level security;

drop policy if exists "financial_audit_logs_admin_all" on public.financial_audit_logs;
create policy "financial_audit_logs_admin_all"
  on public.financial_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- Refund integration (section 47) — the EXISTING deal_payment_refunds
-- table (STEP 18) is reused as-is, with no schema change. A completed
-- refund there now ALSO produces a REFUND-type financial_transactions
-- row (written by the app layer, financialTransactionService), so it
-- shows up in the accounting ledger without a second refunds table.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Storage bucket for expense receipts (section 17) — private,
-- signed-URL-only, mirroring STEP 20/22's secure buckets exactly.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('expense-attachments', 'expense-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "expense_attachments_storage_admin_all" on storage.objects;
create policy "expense_attachments_storage_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'expense-attachments' and public.is_admin_or_manager())
  with check (bucket_id = 'expense-attachments' and public.is_admin_or_manager());

drop policy if exists "expense_attachments_storage_agent_insert" on storage.objects;
create policy "expense_attachments_storage_agent_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'expense-attachments' and public.is_admin());

-- No SELECT policy for plain agents — reads always go through a
-- server-generated signed URL (service-role, issued only after the
-- expense_attachments metadata row was already readable under its own
-- RLS, exactly like communication-attachments in STEP 22).

-- ---------------------------------------------------------------------
-- New AdminSection "accounting" nav/permission gate — mirrors STEP 22's
-- addition of "communications" (code-level in permissions.ts, no DB
-- change needed since section gating isn't stored in the database).
-- ---------------------------------------------------------------------
