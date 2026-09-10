-- =====================================================================
-- STEP 19 — Property Inventory & Real-Time Availability Management
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTE: `properties` (STEP 4) already tracks a simple
-- Available/Reserved/Sold/Inactive status for standalone listings, and
-- STEP 18 already syncs that from deals. This migration adds a
-- genuinely new, finer-grained layer — `property_inventory` — for
-- individual sellable UNITS inside a project (or, optionally, inside a
-- single property), each with its own richer status lifecycle
-- (AVAILABLE/RESERVED/BOOKED/SOLD/RENTED/UNDER_CONSTRUCTION/
-- COMING_SOON/BLOCKED), reservation holder, price history and status
-- history. `properties`/`deals` are extended additively, never changed.
-- =====================================================================

-- ---------------------------------------------------------------------
-- property_inventory
-- ---------------------------------------------------------------------
create table if not exists public.property_inventory (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  unit_number text not null,
  block text,
  building text,
  floor text,
  unit_type text not null check (
    unit_type in ('House', 'Apartment', 'Flat', 'Residential Plot', 'Commercial Plot', 'Shop', 'Office', 'Commercial Unit', 'Building', 'Other')
  ),
  status text not null default 'AVAILABLE' check (
    status in ('AVAILABLE', 'RESERVED', 'BOOKED', 'SOLD', 'RENTED', 'UNDER_CONSTRUCTION', 'COMING_SOON', 'BLOCKED')
  ),
  price numeric check (price is null or price >= 0),
  area numeric check (area is null or area >= 0),
  area_unit text default 'Sq Ft' check (area_unit is null or area_unit in ('Sq Ft', 'Sq Yd', 'Marla', 'Kanal', 'Acre')),
  bedrooms integer check (bedrooms is null or bedrooms >= 0),
  bathrooms integer check (bathrooms is null or bathrooms >= 0),
  orientation text,
  facing text,
  parking text,
  availability_date date,
  reserved_at timestamptz,
  reserved_until timestamptz,
  booked_at timestamptz,
  sold_at timestamptz,
  rented_at timestamptz,
  -- Reservation/sale holder — set when a unit is reserved/booked, kept
  -- even after sale as the transaction record. Not necessarily the same
  -- as the linked deal's own customer if the deal hasn't been created
  -- yet (section 55: reserve first, create deal after).
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  block_reason text,
  archived boolean not null default false,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists property_inventory_set_updated_at on public.property_inventory;
create trigger property_inventory_set_updated_at before update on public.property_inventory for each row execute function public.set_updated_at();

-- Unique unit number within its project/property + block + building
-- scope (section 6) — coalesced so "no project/property" units still
-- share one uniqueness scope rather than each being trivially unique.
create unique index if not exists property_inventory_unit_scope_unique_idx
  on public.property_inventory (
    coalesce(project_id::text, property_id::text, 'none'),
    coalesce(block, ''),
    coalesce(building, ''),
    unit_number
  );

create index if not exists property_inventory_project_idx on public.property_inventory (project_id);
create index if not exists property_inventory_property_idx on public.property_inventory (property_id);
create index if not exists property_inventory_status_idx on public.property_inventory (status);
create index if not exists property_inventory_block_idx on public.property_inventory (block);
create index if not exists property_inventory_building_idx on public.property_inventory (building);
create index if not exists property_inventory_floor_idx on public.property_inventory (floor);
create index if not exists property_inventory_price_idx on public.property_inventory (price);
create index if not exists property_inventory_created_at_idx on public.property_inventory (created_at);
create index if not exists property_inventory_updated_at_idx on public.property_inventory (updated_at);
create index if not exists property_inventory_agent_idx on public.property_inventory (agent_id);
create index if not exists property_inventory_customer_idx on public.property_inventory (customer_id);
create index if not exists property_inventory_deal_idx on public.property_inventory (deal_id);
create index if not exists property_inventory_archived_idx on public.property_inventory (archived);

alter table public.property_inventory enable row level security;

drop policy if exists "property_inventory_admin_all" on public.property_inventory;
create policy "property_inventory_admin_all"
  on public.property_inventory for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "property_inventory_agent_read" on public.property_inventory;
create policy "property_inventory_agent_read"
  on public.property_inventory for select
  to authenticated
  using (agent_id = auth.uid());

-- Agents may act on their own assigned unit (reserve/release/etc. go
-- through this) but never reassign identity/financial fields — enforced
-- below by protect_inventory_fields_for_agent().
drop policy if exists "property_inventory_agent_update" on public.property_inventory;
create policy "property_inventory_agent_update"
  on public.property_inventory for update
  to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop policy if exists "property_inventory_customer_read" on public.property_inventory;
create policy "property_inventory_customer_read"
  on public.property_inventory for select
  to authenticated
  using (customer_id = auth.uid());

-- No anon/public policy on the base table at all — public access is
-- served only through the restricted view below (section 16/17), never
-- the raw table (which carries customer_id/agent_id/deal_id).
create or replace function public.protect_inventory_fields_for_agent()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.property_id := old.property_id;
    new.project_id := old.project_id;
    new.unit_number := old.unit_number;
    new.block := old.block;
    new.building := old.building;
    new.floor := old.floor;
    new.unit_type := old.unit_type;
    new.price := old.price;
    new.agent_id := old.agent_id;
    new.deal_id := old.deal_id;
    new.archived := old.archived;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists property_inventory_protect_agent_fields on public.property_inventory;
create trigger property_inventory_protect_agent_fields before update on public.property_inventory
  for each row execute function public.protect_inventory_fields_for_agent();

-- ---------------------------------------------------------------------
-- Public availability view (sections 16/17) — only ever exposes safe,
-- non-archived, aggregate-friendly columns. Never customer_id/agent_id/
-- deal_id/block_reason/lead_id. Views run with the owning role's
-- privileges by default, so this deliberately bypasses the RLS above
-- (which has no anon policy) while still only ever returning the
-- limited column list below.
-- ---------------------------------------------------------------------
create or replace view public.property_inventory_public
with (security_barrier = true)
as
select
  id, property_id, project_id, unit_number, block, building, floor,
  unit_type, status, price, area, area_unit, bedrooms, bathrooms,
  availability_date
from public.property_inventory
where archived = false;

grant select on public.property_inventory_public to anon, authenticated;

-- Realtime (sections 45/46) — UI sync only; the conditional UPDATE
-- guards in the service layer (not this) are the actual booking-safety
-- mechanism. Safe to re-run — guarded against "already a member".
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'property_inventory'
  ) then
    alter publication supabase_realtime add table public.property_inventory;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- inventory_status_history (section 9)
-- ---------------------------------------------------------------------
create table if not exists public.inventory_status_history (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.property_inventory (id) on delete cascade,
  previous_status text,
  new_status text not null,
  reason text,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_status_history_inventory_idx on public.inventory_status_history (inventory_id);

alter table public.inventory_status_history enable row level security;

drop policy if exists "inventory_status_history_admin_all" on public.inventory_status_history;
create policy "inventory_status_history_admin_all"
  on public.inventory_status_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "inventory_status_history_agent_read" on public.inventory_status_history;
create policy "inventory_status_history_agent_read"
  on public.inventory_status_history for select
  to authenticated
  using (exists (select 1 from public.property_inventory i where i.id = inventory_status_history.inventory_id and i.agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- inventory_price_history (sections 35/36) — the price is never
-- silently overwritten; every change is recorded here first.
-- ---------------------------------------------------------------------
create table if not exists public.inventory_price_history (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.property_inventory (id) on delete cascade,
  previous_price numeric,
  new_price numeric not null,
  reason text,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_price_history_inventory_idx on public.inventory_price_history (inventory_id);

alter table public.inventory_price_history enable row level security;

drop policy if exists "inventory_price_history_admin_all" on public.inventory_price_history;
create policy "inventory_price_history_admin_all"
  on public.inventory_price_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "inventory_price_history_agent_read" on public.inventory_price_history;
create policy "inventory_price_history_agent_read"
  on public.inventory_price_history for select
  to authenticated
  using (exists (select 1 from public.property_inventory i where i.id = inventory_price_history.inventory_id and i.agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- inventory_notes (section 37) — private, CRM-staff-only. Mirrors
-- deal_notes/lead_notes exactly. No customer policy exists at all.
-- ---------------------------------------------------------------------
create table if not exists public.inventory_notes (
  id uuid primary key default gen_random_uuid(),
  inventory_id uuid not null references public.property_inventory (id) on delete cascade,
  note text not null,
  created_by text,
  user_id uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inventory_notes_inventory_idx on public.inventory_notes (inventory_id);

alter table public.inventory_notes enable row level security;

drop policy if exists "inventory_notes_admin_all" on public.inventory_notes;
create policy "inventory_notes_admin_all"
  on public.inventory_notes for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "inventory_notes_agent_all" on public.inventory_notes;
create policy "inventory_notes_agent_all"
  on public.inventory_notes for all
  to authenticated
  using (exists (select 1 from public.property_inventory i where i.id = inventory_notes.inventory_id and i.agent_id = auth.uid()))
  with check (exists (select 1 from public.property_inventory i where i.id = inventory_notes.inventory_id and i.agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- deals — additive link to a specific inventory unit (section 14/56).
-- deals.property_id continues to work exactly as before for standalone
-- (non-project-unit) properties; this is purely additive.
-- ---------------------------------------------------------------------
alter table public.deals add column if not exists inventory_id uuid references public.property_inventory (id) on delete set null;
create index if not exists deals_inventory_idx on public.deals (inventory_id);
