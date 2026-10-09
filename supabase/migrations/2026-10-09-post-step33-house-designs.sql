-- =====================================================================
-- House designer: floor plans (naqsha), 3D models and elevations that the
-- team draws in the admin panel for construction.
--
-- The drawing itself is stored as JSON (rooms in feet, doors, windows,
-- floors). Staff only: any signed-in staff member may read and write, the
-- public (anonymous) role has no access.
-- =====================================================================

create table if not exists public.house_designs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  client_name text,
  notes text,
  plot_width numeric not null check (plot_width between 10 and 400),
  plot_length numeric not null check (plot_length between 10 and 400),
  floors_count integer not null default 1 check (floors_count between 1 and 4),
  -- { version, plot, floorHeight, floors: [{ id, name, rooms: [...] }] }
  data jsonb not null,
  -- optional: the construction project this drawing belongs to
  construction_project_id uuid references public.construction_projects (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists house_designs_updated_idx on public.house_designs (updated_at desc);
create index if not exists house_designs_project_idx on public.house_designs (construction_project_id);

alter table public.house_designs enable row level security;

drop policy if exists house_designs_staff_all on public.house_designs;
create policy house_designs_staff_all on public.house_designs
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Belt and braces: the public (anonymous) role gets no access at all.
revoke all on public.house_designs from anon;

drop trigger if exists set_updated_at on public.house_designs;
create trigger set_updated_at before update on public.house_designs
  for each row execute function public.set_updated_at();
