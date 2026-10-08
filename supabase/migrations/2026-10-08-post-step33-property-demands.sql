-- =====================================================================
-- Client demands: what a customer who came to the office (or called) is
-- looking for, so the admin panel can match each demand with the
-- available properties - and warn the team when a new property fits a
-- demand that is already waiting.
--
-- Private staff data: any signed-in staff member may read and write it,
-- and the public (anonymous) role has no access at all.
-- =====================================================================

create table if not exists public.property_demands (
  id uuid primary key default gen_random_uuid(),
  client_name text not null,
  client_phone text not null,
  client_whatsapp text,
  purpose text not null default 'sale' check (purpose in ('sale', 'rent')),
  -- house / flat / residential_plot / commercial; empty array = any type
  property_types text[] not null default '{}',
  -- areas the client would accept, free text; empty array = anywhere
  locations text[] not null default '{}',
  budget_min numeric,
  budget_max numeric,
  -- in Marla (1 Kanal = 20 Marla, 1 Marla = 225 sq ft)
  size_min_marla numeric,
  size_max_marla numeric,
  min_bedrooms integer,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  status text not null default 'open' check (status in ('open', 'matched', 'closed', 'lost')),
  notes text,
  assigned_to uuid references public.admin_profiles (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint property_demands_budget_range check (budget_min is null or budget_max is null or budget_min <= budget_max),
  constraint property_demands_size_range check (size_min_marla is null or size_max_marla is null or size_min_marla <= size_max_marla)
);

create index if not exists property_demands_status_idx on public.property_demands (status);
create index if not exists property_demands_assigned_idx on public.property_demands (assigned_to);
create index if not exists property_demands_created_idx on public.property_demands (created_at desc);

-- Which matching properties were already sent to the client for a demand.
create table if not exists public.demand_shared_properties (
  id uuid primary key default gen_random_uuid(),
  demand_id uuid not null references public.property_demands (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  shared_by uuid references public.admin_profiles (id) on delete set null,
  shared_at timestamptz not null default now(),
  unique (demand_id, property_id)
);

alter table public.property_demands enable row level security;
alter table public.demand_shared_properties enable row level security;

drop policy if exists property_demands_staff_all on public.property_demands;
create policy property_demands_staff_all on public.property_demands
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists demand_shared_properties_staff_all on public.demand_shared_properties;
create policy demand_shared_properties_staff_all on public.demand_shared_properties
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Belt and braces: the public (anonymous) role gets no access at all.
revoke all on public.property_demands from anon;
revoke all on public.demand_shared_properties from anon;

drop trigger if exists set_updated_at on public.property_demands;
create trigger set_updated_at before update on public.property_demands
  for each row execute function public.set_updated_at();
