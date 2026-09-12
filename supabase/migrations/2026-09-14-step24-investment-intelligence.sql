-- =====================================================================
-- STEP 24 — Property Valuation & Investment Intelligence System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTES (disclosed up front, not buried):
--   - "valuation_versions" is NOT a separate table. `property_valuations`
--     is itself append-only and versioned (never updated after
--     creation, version increments per property) — every row already
--     IS one immutable historical version, so a second table holding
--     the same history would only risk drifting out of sync.
--   - "market_data_sources" is NOT a separate table. `market_data.
--     data_source`/`source_url` are simple text fields — a full
--     normalized sources table would add nothing beyond what those two
--     columns already record for each entry.
--   - "saved_investments" is NOT a separate table from
--     "investment_analyses". Both would hold identical columns
--     (property/project, inputs, results, owner, timestamps) — a
--     customer's saved analysis IS an investment_analyses row with
--     customer_id set; an ephemeral, unsaved calculator run never
--     reaches the database at all (it's client-side state until the
--     user chooses to save it).
--   - Reuses existing infrastructure rather than duplicating it:
--     `properties`/`deals` for comparables (never invented data),
--     `property_inventory`'s own project-level aggregation
--     (inventoryService.projectSummaries/dashboardStats) for Project
--     Investment Analysis, `leads` for CRM integration, `financial_
--     transactions`-style NUMERIC(14,2) precision throughout, and the
--     existing `communication_settings`/`accounting_settings` singleton
--     pattern for `valuation_settings`.
--   - Every projected figure is an ESTIMATE; every comparable is
--     explicitly ASKING or CONFIRMED TRANSACTION (is_transaction flag)
--     — never blended silently, per the spec's own repeated warning.
-- =====================================================================

-- ---------------------------------------------------------------------
-- valuation_settings (singleton, mirrors accounting_settings/
-- communication_settings exactly) — public-read, since default
-- horizon/currency/disclaimer feed the PUBLIC property investment page.
-- ---------------------------------------------------------------------
create table if not exists public.valuation_settings (
  id smallint primary key default 1,
  sqft_per_sqyd numeric(10, 4) not null default 9.0,
  sqft_per_marla numeric(10, 4) not null default 272.25,
  sqft_per_kanal numeric(10, 4) not null default 5445.0,
  sqft_per_acre numeric(10, 4) not null default 43560.0,
  min_comparables_for_high smallint not null default 3,
  min_comparables_for_medium smallint not null default 1,
  max_market_data_age_months_for_high smallint not null default 6,
  default_vacancy_rate numeric(5, 2) not null default 5.0,
  default_maintenance_rate numeric(5, 2) not null default 5.0,
  default_management_fee_rate numeric(5, 2) not null default 8.0,
  default_investment_horizon_years smallint not null default 5,
  currency text not null default 'PKR',
  disclaimer_text text not null default 'Investment calculations, valuations, market comparisons and projected returns are estimates based on the information and assumptions provided. They are not guarantees of future performance and do not constitute financial, legal, tax or professional valuation advice. Actual property values, rental income, expenses, market conditions and investment returns may differ. Users should obtain appropriate professional advice before making investment decisions.',
  updated_at timestamptz not null default now(),
  constraint valuation_settings_singleton check (id = 1)
);

insert into public.valuation_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists valuation_settings_set_updated_at on public.valuation_settings;
create trigger valuation_settings_set_updated_at before update on public.valuation_settings for each row execute function public.set_updated_at();

alter table public.valuation_settings enable row level security;

drop policy if exists "valuation_settings_public_read" on public.valuation_settings;
create policy "valuation_settings_public_read"
  on public.valuation_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "valuation_settings_admin_write" on public.valuation_settings;
create policy "valuation_settings_admin_write"
  on public.valuation_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- investment_scenarios (section 27) — admin-configurable Conservative/
-- Base/Optimistic presets; a variable-length list, so it can't live on
-- the settings singleton. Public-read (feeds the public property
-- investment page's scenario comparison).
-- ---------------------------------------------------------------------
create table if not exists public.investment_scenarios (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  annual_appreciation_rate numeric(6, 3) not null,
  is_default boolean not null default false,
  sort_order integer not null default 100,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investment_scenarios_active_idx on public.investment_scenarios (active);

drop trigger if exists investment_scenarios_set_updated_at on public.investment_scenarios;
create trigger investment_scenarios_set_updated_at before update on public.investment_scenarios for each row execute function public.set_updated_at();

alter table public.investment_scenarios enable row level security;

drop policy if exists "investment_scenarios_public_read" on public.investment_scenarios;
create policy "investment_scenarios_public_read"
  on public.investment_scenarios for select
  to anon, authenticated
  using (active = true);

drop policy if exists "investment_scenarios_admin_all" on public.investment_scenarios;
create policy "investment_scenarios_admin_all"
  on public.investment_scenarios for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

insert into public.investment_scenarios (name, annual_appreciation_rate, is_default, sort_order)
select 'Conservative', 5.0, false, 10
where not exists (select 1 from public.investment_scenarios where name = 'Conservative');
insert into public.investment_scenarios (name, annual_appreciation_rate, is_default, sort_order)
select 'Base', 8.0, true, 20
where not exists (select 1 from public.investment_scenarios where name = 'Base');
insert into public.investment_scenarios (name, annual_appreciation_rate, is_default, sort_order)
select 'Optimistic', 12.0, false, 30
where not exists (select 1 from public.investment_scenarios where name = 'Optimistic');

-- ---------------------------------------------------------------------
-- property_valuations (sections 3, 21) — append-only + versioned per
-- property (see DESIGN NOTES above). Public-read: the whole point of
-- this module is to show investment intelligence to site visitors on
-- /properties/[id]/investment, exactly like `properties` itself is
-- public-read.
-- ---------------------------------------------------------------------
create table if not exists public.property_valuations (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  valuation_method text not null check (valuation_method in ('COMPARABLE_SALES', 'INCOME_APPROACH', 'COST_APPROACH', 'MANUAL', 'DCF')),
  base_price numeric(14, 2) not null check (base_price >= 0),
  area numeric(12, 2) not null check (area > 0),
  area_unit text not null check (area_unit in ('Sq Ft', 'Sq Yd', 'Marla', 'Kanal', 'Acre')),
  normalized_area_sqft numeric(14, 2) not null check (normalized_area_sqft > 0),
  location text,
  property_type text,
  condition text,
  age_years smallint,
  bedrooms smallint,
  bathrooms smallint,
  floor smallint,
  amenities jsonb,
  rental_estimate_monthly numeric(14, 2),
  occupancy_rate numeric(5, 2),
  expense_assumptions jsonb,
  market_adjustment_percent numeric(6, 3),
  final_estimated_value numeric(14, 2) not null check (final_estimated_value >= 0),
  confidence_score text not null check (confidence_score in ('HIGH', 'MEDIUM', 'LOW')),
  confidence_factors jsonb,
  assumptions text,
  valuation_date date not null default current_date,
  created_by uuid references public.admin_profiles (id) on delete set null,
  version integer not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists property_valuations_property_idx on public.property_valuations (property_id, version desc);
create index if not exists property_valuations_project_idx on public.property_valuations (project_id);
create index if not exists property_valuations_date_idx on public.property_valuations (valuation_date);
create index if not exists property_valuations_created_by_idx on public.property_valuations (created_by);
create unique index if not exists property_valuations_property_version_idx on public.property_valuations (property_id, version);

-- Never overwrite historical valuation records (section 21).
create or replace function public.prevent_valuation_modify()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  raise exception 'A valuation record is immutable once created — create a new version instead.';
  return old;
end;
$$;

drop trigger if exists property_valuations_prevent_update on public.property_valuations;
create trigger property_valuations_prevent_update before update on public.property_valuations
  for each row execute function public.prevent_valuation_modify();

drop trigger if exists property_valuations_prevent_delete on public.property_valuations;
create trigger property_valuations_prevent_delete before delete on public.property_valuations
  for each row execute function public.prevent_valuation_modify();

alter table public.property_valuations enable row level security;

drop policy if exists "property_valuations_public_read" on public.property_valuations;
create policy "property_valuations_public_read"
  on public.property_valuations for select
  to anon, authenticated
  using (true);

drop policy if exists "property_valuations_admin_insert" on public.property_valuations;
create policy "property_valuations_admin_insert"
  on public.property_valuations for insert
  to authenticated
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- valuation_comparables (section 6) — sourced only from real
-- properties (asking) or real completed deals (confirmed transaction);
-- an admin must explicitly approve a row before it is shown anywhere,
-- including publicly.
-- ---------------------------------------------------------------------
create table if not exists public.valuation_comparables (
  id uuid primary key default gen_random_uuid(),
  valuation_id uuid not null references public.property_valuations (id) on delete cascade,
  comparable_property_id uuid references public.properties (id) on delete set null,
  comparable_deal_id uuid references public.deals (id) on delete set null,
  is_transaction boolean not null default false,
  title text,
  location text,
  price numeric(14, 2) not null check (price >= 0),
  area_sqft numeric(12, 2),
  price_per_sqft numeric(14, 2),
  property_type text,
  bedrooms smallint,
  transaction_date date,
  similarity_score numeric(5, 2),
  approved boolean not null default false,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint valuation_comparables_source_check check (comparable_property_id is not null or comparable_deal_id is not null)
);

create index if not exists valuation_comparables_valuation_idx on public.valuation_comparables (valuation_id);
create index if not exists valuation_comparables_approved_idx on public.valuation_comparables (approved);

alter table public.valuation_comparables enable row level security;

drop policy if exists "valuation_comparables_public_read" on public.valuation_comparables;
create policy "valuation_comparables_public_read"
  on public.valuation_comparables for select
  to anon, authenticated
  using (approved = true);

drop policy if exists "valuation_comparables_admin_all" on public.valuation_comparables;
create policy "valuation_comparables_admin_all"
  on public.valuation_comparables for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- market_data (section 7) — admin-managed; internal (never exposed
-- raw to the public — only VERIFIED rows' aggregate figures feed
-- public-facing computed metrics, via server-side code, never a public
-- RLS policy on this table itself).
-- ---------------------------------------------------------------------
create table if not exists public.market_data (
  id uuid primary key default gen_random_uuid(),
  location text not null,
  property_type text,
  period_start date,
  period_end date,
  average_price numeric(14, 2),
  min_price numeric(14, 2),
  max_price numeric(14, 2),
  price_per_marla numeric(14, 2),
  price_per_sqft numeric(14, 2),
  average_rent numeric(14, 2),
  rental_yield numeric(6, 3),
  appreciation_rate numeric(6, 3),
  data_source text,
  source_url text,
  data_date date not null default current_date,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'VERIFIED', 'ARCHIVED')),
  confidence_level text check (confidence_level in ('HIGH', 'MEDIUM', 'LOW')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  updated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_data_location_idx on public.market_data (location);
create index if not exists market_data_type_idx on public.market_data (property_type);
create index if not exists market_data_date_idx on public.market_data (data_date);
create index if not exists market_data_status_idx on public.market_data (status);

drop trigger if exists market_data_set_updated_at on public.market_data;
create trigger market_data_set_updated_at before update on public.market_data for each row execute function public.set_updated_at();

alter table public.market_data enable row level security;

drop policy if exists "market_data_admin_all" on public.market_data;
create policy "market_data_admin_all"
  on public.market_data for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- investment_analyses (sections 9-14, 18) — a saved/computed analysis;
-- see DESIGN NOTES above for why this also serves as "saved_
-- investments". customer_id identifies a customer's own saved
-- analysis; created_by identifies an admin/agent-run one.
-- ---------------------------------------------------------------------
create table if not exists public.investment_analyses (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  customer_id uuid references auth.users (id) on delete cascade,
  created_by uuid references public.admin_profiles (id) on delete set null,
  name text not null,
  scenario_name text,
  inputs jsonb not null,
  results jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investment_analyses_property_idx on public.investment_analyses (property_id);
create index if not exists investment_analyses_project_idx on public.investment_analyses (project_id);
create index if not exists investment_analyses_customer_idx on public.investment_analyses (customer_id);

drop trigger if exists investment_analyses_set_updated_at on public.investment_analyses;
create trigger investment_analyses_set_updated_at before update on public.investment_analyses for each row execute function public.set_updated_at();

alter table public.investment_analyses enable row level security;

drop policy if exists "investment_analyses_admin_all" on public.investment_analyses;
create policy "investment_analyses_admin_all"
  on public.investment_analyses for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "investment_analyses_customer_all" on public.investment_analyses;
create policy "investment_analyses_customer_all"
  on public.investment_analyses for all
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- investment_cash_flows (section 11) — per-year projection rows for an
-- investment_analyses record.
-- ---------------------------------------------------------------------
create table if not exists public.investment_cash_flows (
  id uuid primary key default gen_random_uuid(),
  investment_analysis_id uuid not null references public.investment_analyses (id) on delete cascade,
  year_number smallint not null,
  gross_rental_income numeric(14, 2) not null default 0,
  expenses numeric(14, 2) not null default 0,
  net_cash_flow numeric(14, 2) not null default 0,
  cumulative_cash_flow numeric(14, 2) not null default 0,
  projected_property_value numeric(14, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists investment_cash_flows_analysis_idx on public.investment_cash_flows (investment_analysis_id, year_number);

alter table public.investment_cash_flows enable row level security;

drop policy if exists "investment_cash_flows_admin_all" on public.investment_cash_flows;
create policy "investment_cash_flows_admin_all"
  on public.investment_cash_flows for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "investment_cash_flows_customer_all" on public.investment_cash_flows;
create policy "investment_cash_flows_customer_all"
  on public.investment_cash_flows for all
  to authenticated
  using (exists (select 1 from public.investment_analyses a where a.id = investment_cash_flows.investment_analysis_id and a.customer_id = auth.uid()))
  with check (exists (select 1 from public.investment_analyses a where a.id = investment_cash_flows.investment_analysis_id and a.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- investment_alerts (section 23) — customer-owned thresholds; only
-- ever triggered from real events (checked opportunistically, no
-- background job runner in this deployment — same established pattern
-- as followUpService.markOverdue/payableService.markOverdue).
-- ---------------------------------------------------------------------
create table if not exists public.investment_alerts (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  alert_type text not null check (alert_type in ('PRICE_BELOW', 'YIELD_ABOVE', 'ROI_ABOVE', 'AVAILABILITY', 'INVENTORY_CHANGE', 'PRICE_CHANGE')),
  threshold_value numeric(14, 2),
  active boolean not null default true,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists investment_alerts_customer_idx on public.investment_alerts (customer_id);
create index if not exists investment_alerts_property_idx on public.investment_alerts (property_id);
create index if not exists investment_alerts_active_idx on public.investment_alerts (active);

drop trigger if exists investment_alerts_set_updated_at on public.investment_alerts;
create trigger investment_alerts_set_updated_at before update on public.investment_alerts for each row execute function public.set_updated_at();

alter table public.investment_alerts enable row level security;

drop policy if exists "investment_alerts_admin_all" on public.investment_alerts;
create policy "investment_alerts_admin_all"
  on public.investment_alerts for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "investment_alerts_customer_all" on public.investment_alerts;
create policy "investment_alerts_customer_all"
  on public.investment_alerts for all
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- property_price_history (section 22) — distinct from STEP19's unit-
-- level inventory_price_history. Admin-only: booking/transaction
-- prices reveal real deal amounts, kept internal even though approved,
-- anonymized comparables derived from it can be shown publicly via
-- valuation_comparables.
-- ---------------------------------------------------------------------
create table if not exists public.property_price_history (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  price_type text not null check (price_type in ('LISTING', 'UPDATED', 'BOOKING', 'TRANSACTION')),
  price numeric(14, 2) not null check (price >= 0),
  source text,
  deal_id uuid references public.deals (id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_by uuid references public.admin_profiles (id) on delete set null
);

create index if not exists property_price_history_property_idx on public.property_price_history (property_id, recorded_at desc);
create index if not exists property_price_history_deal_idx on public.property_price_history (deal_id);

alter table public.property_price_history enable row level security;

drop policy if exists "property_price_history_admin_all" on public.property_price_history;
create policy "property_price_history_admin_all"
  on public.property_price_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- investment_events (section 35) — mirrors search_events' dedicated,
-- closed-enum-per-feature convention (not a shared generic table).
-- ---------------------------------------------------------------------
create table if not exists public.investment_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('page_view', 'calculator_used', 'valuation_requested', 'report_downloaded', 'property_compared', 'investment_lead_created', 'analysis_saved', 'consultation_requested')),
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  session_id text,
  customer_id uuid references auth.users (id) on delete set null,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists investment_events_type_idx on public.investment_events (event_type);
create index if not exists investment_events_property_idx on public.investment_events (property_id);
create index if not exists investment_events_created_idx on public.investment_events (created_at);

alter table public.investment_events enable row level security;

drop policy if exists "investment_events_public_insert" on public.investment_events;
create policy "investment_events_public_insert"
  on public.investment_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "investment_events_admin_read" on public.investment_events;
create policy "investment_events_admin_read"
  on public.investment_events for select
  to authenticated
  using (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- investment_audit_logs (section 36) — mirrors financial_audit_logs
-- exactly.
-- ---------------------------------------------------------------------
create table if not exists public.investment_audit_logs (
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

create index if not exists investment_audit_logs_entity_idx on public.investment_audit_logs (entity_type, entity_id);
create index if not exists investment_audit_logs_created_idx on public.investment_audit_logs (created_at);

alter table public.investment_audit_logs enable row level security;

drop policy if exists "investment_audit_logs_admin_all" on public.investment_audit_logs;
create policy "investment_audit_logs_admin_all"
  on public.investment_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- New AdminSection "investment" nav/permission gate — mirrors STEP 23's
-- addition of "accounting" (code-level in permissions.ts, no DB change
-- needed since section gating isn't stored in the database).
-- ---------------------------------------------------------------------
