-- =====================================================================
-- Private owner details for properties and projects.
--
-- Deliberately a SEPARATE table, not columns on properties/projects:
-- those two tables are publicly readable (the public website, search and
-- map read them with the public API key), so any column added there
-- would be readable by anyone. This table has no public policy at all -
-- only these staff roles can read or write it. Brochures, Facebook posts,
-- structured data and the public AI assistant never read it.
-- =====================================================================

create table if not exists public.owner_private_details (
  id uuid primary key default gen_random_uuid(),
  property_id uuid unique references public.properties (id) on delete cascade,
  project_id uuid unique references public.projects (id) on delete cascade,
  owner_name text,
  owner_phone text,
  owner_alt_phone text,
  owner_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint owner_private_details_one_target check (num_nonnulls(property_id, project_id) = 1)
);

alter table public.owner_private_details enable row level security;

-- Only the roles that can manage properties/projects in the admin panel.
drop policy if exists owner_private_details_staff_all on public.owner_private_details;
create policy owner_private_details_staff_all on public.owner_private_details
  for all
  to authenticated
  using (public.current_admin_role() in ('super_admin', 'admin', 'editor'))
  with check (public.current_admin_role() in ('super_admin', 'admin', 'editor'));

-- Belt and braces: the public (anonymous) role gets no access at all.
revoke all on public.owner_private_details from anon;

drop trigger if exists set_updated_at on public.owner_private_details;
create trigger set_updated_at before update on public.owner_private_details
  for each row execute function public.set_updated_at();
