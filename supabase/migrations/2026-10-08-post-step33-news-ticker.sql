-- =====================================================================
-- Public news bar: a scrolling strip at the top of the public website.
-- It shows (1) news the admin types in, and (2) the clients' demands -
-- but ONLY the safe facts (type, size, area, budget). The client's name,
-- phone and notes are never exposed.
-- =====================================================================

-- 1) Each demand can be kept off the public news bar (default: shown).
alter table public.property_demands
  add column if not exists show_on_site boolean not null default true;

-- 2) News written by the admin team.
create table if not exists public.site_news (
  id uuid primary key default gen_random_uuid(),
  message text not null check (char_length(message) between 3 and 220),
  -- optional: an internal path ("/properties") or an https:// address
  link_url text,
  is_active boolean not null default true,
  -- optional: the news disappears from the website after this moment
  expires_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_news_active_idx on public.site_news (is_active, created_at desc);

alter table public.site_news enable row level security;

-- Visitors (and signed-in customers) can read only live news.
drop policy if exists site_news_public_read on public.site_news;
create policy site_news_public_read on public.site_news
  for select
  to anon, authenticated
  using (is_active and (expires_at is null or expires_at > now()));

-- Staff can see and change everything, including hidden and expired news.
drop policy if exists site_news_staff_all on public.site_news;
create policy site_news_staff_all on public.site_news
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_updated_at on public.site_news;
create trigger set_updated_at before update on public.site_news
  for each row execute function public.set_updated_at();

-- 3) The public face of the demands: a view that contains ONLY the safe
-- columns, only for demands that are still waiting, switched on for the
-- website, and no older than 60 days. The base table stays private - the
-- anonymous role has no access to it - the view reads it with its owner's
-- rights.
create or replace view public.public_demand_board as
select
  purpose,
  property_types,
  locations,
  budget_min,
  budget_max,
  size_min_marla,
  size_max_marla,
  min_bedrooms,
  created_at
from public.property_demands
where show_on_site
  and status in ('open', 'matched')
  and created_at > now() - interval '60 days'
order by created_at desc
limit 20;

grant select on public.public_demand_board to anon, authenticated;
