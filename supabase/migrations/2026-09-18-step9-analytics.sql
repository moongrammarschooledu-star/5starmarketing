-- =====================================================================
-- STEP 9 — Super Admin Dashboard, Business Analytics & Reporting
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- property_views — one row per property-page view. No personal data:
-- session_id is a random id generated in the visitor's browser
-- (localStorage), never an IP address or anything identifying.
-- ---------------------------------------------------------------------
create table if not exists public.property_views (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists property_views_property_idx on public.property_views (property_id);
create index if not exists property_views_created_idx on public.property_views (created_at);

-- ---------------------------------------------------------------------
-- website_events — lightweight event log for everything besides a
-- property-page view: whatsapp_click, phone_click, contact_form_submit,
-- project_view. (property_view has its own table above; property_inquiry
-- is already captured as a row in `leads`, so it is not duplicated here.)
-- ---------------------------------------------------------------------
create table if not exists public.website_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in ('whatsapp_click', 'phone_click', 'contact_form_submit', 'project_view')
  ),
  property_id uuid references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists website_events_type_idx on public.website_events (event_type);
create index if not exists website_events_property_idx on public.website_events (property_id);
create index if not exists website_events_project_idx on public.website_events (project_id);
create index if not exists website_events_created_idx on public.website_events (created_at);

-- ---------------------------------------------------------------------
-- activity_logs — admin action history ("Recent Activity" / Activity Log).
-- Written only by authenticated admin actions, never by public visitors.
-- ---------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_profiles (id) on delete set null,
  admin_name text,
  action text not null,
  entity_type text,
  entity_id uuid,
  description text not null,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_idx on public.activity_logs (created_at);
create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- admin_profiles.role — role architecture (super_admin / admin / editor /
-- sales_agent). Every existing admin becomes super_admin (there has only
-- ever been the one director account so far); new accounts default to
-- 'admin' and can be changed later directly in the Supabase table editor
-- (no staff-invite UI exists yet — see the STEP 9 report).
-- ---------------------------------------------------------------------
alter table public.admin_profiles
  add column if not exists role text not null default 'admin' check (
    role in ('super_admin', 'admin', 'editor', 'sales_agent')
  );

update public.admin_profiles set role = 'super_admin';

create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.admin_profiles (id, name, title, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Admin'), 'Director', 'admin')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.property_views enable row level security;
alter table public.website_events enable row level security;
alter table public.activity_logs enable row level security;

-- property_views: anyone (including anonymous visitors) can log a view;
-- only authenticated admins can read them back for analytics.
drop policy if exists "property_views_public_insert" on public.property_views;
create policy "property_views_public_insert"
  on public.property_views for insert
  to anon, authenticated
  with check (true);

drop policy if exists "property_views_admin_read" on public.property_views;
create policy "property_views_admin_read"
  on public.property_views for select
  to authenticated
  using (true);

-- website_events: same shape — public insert-only, admin read-only.
drop policy if exists "website_events_public_insert" on public.website_events;
create policy "website_events_public_insert"
  on public.website_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "website_events_admin_read" on public.website_events;
create policy "website_events_admin_read"
  on public.website_events for select
  to authenticated
  using (true);

-- activity_logs: admin-only end to end — no anonymous access at all.
drop policy if exists "activity_logs_admin_all" on public.activity_logs;
create policy "activity_logs_admin_all"
  on public.activity_logs for all
  to authenticated
  using (true)
  with check (true);
