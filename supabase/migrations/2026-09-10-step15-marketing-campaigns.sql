-- =====================================================================
-- STEP 15 — Marketing Campaign Management & Lead Source Tracking
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- campaigns
-- ---------------------------------------------------------------------
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  platform text not null check (
    platform in ('Facebook', 'Instagram', 'TikTok', 'Google Ads', 'YouTube', 'WhatsApp', 'Website', 'Other')
  ),
  campaign_type text not null check (
    campaign_type in (
      'Property Promotion', 'Project Promotion', 'Brand Awareness', 'Lead Generation',
      'Site Visit', 'WhatsApp Campaign', 'Investment Campaign', 'Other'
    )
  ),
  status text not null default 'Draft' check (status in ('Draft', 'Active', 'Paused', 'Completed', 'Archived')),
  start_date date,
  end_date date,
  planned_budget numeric(12, 2),
  actual_spend numeric(12, 2),
  -- Only ever populated from real, admin-verified revenue. The app never
  -- estimates this from a property's asking price.
  revenue_generated numeric(12, 2),
  target_audience text,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  landing_page text,
  utm_source text,
  utm_medium text,
  -- The slug incoming visitor traffic is matched against for
  -- attribution — unique so two campaigns never silently share credit.
  utm_campaign text not null unique,
  utm_content text,
  utm_term text,
  description text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists campaigns_status_idx on public.campaigns (status);
create index if not exists campaigns_platform_idx on public.campaigns (platform);

drop trigger if exists set_updated_at on public.campaigns;
create trigger set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- campaign_events — anonymous, campaign-attributed tracking. Public
-- insert-only (mirrors property_views / website_events from STEP 9),
-- admin/manager read-only. No personal data of any kind — just what
-- happened, where, and which campaign it's attributed to.
-- ---------------------------------------------------------------------
create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.campaigns (id) on delete set null,
  event_type text not null check (
    event_type in ('page_view', 'property_view', 'project_view', 'whatsapp_click', 'phone_click', 'inquiry_submit', 'qr_scan')
  ),
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  session_id text,
  landing_page text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz not null default now()
);

create index if not exists campaign_events_campaign_idx on public.campaign_events (campaign_id);
create index if not exists campaign_events_type_idx on public.campaign_events (event_type);
create index if not exists campaign_events_created_idx on public.campaign_events (created_at);
create index if not exists campaign_events_utm_campaign_idx on public.campaign_events (utm_campaign);

alter table public.campaigns enable row level security;
alter table public.campaign_events enable row level security;

-- Campaign management (create/edit/pause/archive/delete + reading costs
-- and budgets) is admin/sales_manager only — a sales_agent sees
-- attribution on their OWN leads (via the leads columns below, already
-- covered by leads_agent_read) but never browses the campaigns table
-- directly or sees spend/budget figures.
drop policy if exists "campaigns_admin_manage" on public.campaigns;
create policy "campaigns_admin_manage"
  on public.campaigns for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "campaign_events_public_insert" on public.campaign_events;
create policy "campaign_events_public_insert"
  on public.campaign_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "campaign_events_admin_read" on public.campaign_events;
create policy "campaign_events_admin_read"
  on public.campaign_events for select
  to authenticated
  using (public.is_admin_or_manager());

-- Same reasoning as leads: an anonymous visitor's client can never read
-- campaigns directly, so campaign_id is resolved here from whatever
-- utm_campaign was submitted with the event.
create or replace function public.resolve_campaign_event_campaign_id()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_campaign_id uuid;
begin
  if new.campaign_id is not null or new.utm_campaign is null then
    return new;
  end if;
  select id into v_campaign_id from public.campaigns where utm_campaign = new.utm_campaign limit 1;
  if v_campaign_id is not null then
    new.campaign_id := v_campaign_id;
  end if;
  return new;
end;
$$;

drop trigger if exists resolve_campaign_event_campaign_id on public.campaign_events;
create trigger resolve_campaign_event_campaign_id before insert on public.campaign_events
  for each row execute function public.resolve_campaign_event_campaign_id();

-- ---------------------------------------------------------------------
-- leads — attribution columns, captured once at creation from the
-- visitor's client-side first/last-touch record. campaign_id is
-- resolved server-side by matching utm_campaign against campaigns.
-- ---------------------------------------------------------------------
alter table public.leads
  add column if not exists campaign_id uuid references public.campaigns (id) on delete set null,
  add column if not exists first_touch_source text,
  add column if not exists first_touch_medium text,
  add column if not exists first_touch_campaign text,
  add column if not exists first_touch_content text,
  add column if not exists first_touch_term text,
  add column if not exists first_touch_landing_page text,
  add column if not exists last_touch_source text,
  add column if not exists last_touch_medium text,
  add column if not exists last_touch_campaign text,
  add column if not exists last_touch_content text,
  add column if not exists last_touch_term text,
  add column if not exists last_touch_landing_page text;

create index if not exists leads_campaign_idx on public.leads (campaign_id);

-- Attribution is set once, at insert time, from the visitor's own
-- browser-side attribution record — never edited afterward by anyone,
-- admins included. This is what makes "first touch" actually mean
-- first touch. (protect_lead_fields_for_agent, from STEP 14, is a
-- separate, narrower trigger that only restricts non-admin/manager
-- actors on different columns — this one is unconditional.)
create or replace function public.protect_lead_attribution_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  new.campaign_id := old.campaign_id;
  new.first_touch_source := old.first_touch_source;
  new.first_touch_medium := old.first_touch_medium;
  new.first_touch_campaign := old.first_touch_campaign;
  new.first_touch_content := old.first_touch_content;
  new.first_touch_term := old.first_touch_term;
  new.first_touch_landing_page := old.first_touch_landing_page;
  new.last_touch_source := old.last_touch_source;
  new.last_touch_medium := old.last_touch_medium;
  new.last_touch_campaign := old.last_touch_campaign;
  new.last_touch_content := old.last_touch_content;
  new.last_touch_term := old.last_touch_term;
  new.last_touch_landing_page := old.last_touch_landing_page;
  return new;
end;
$$;

drop trigger if exists protect_lead_attribution_fields on public.leads;
create trigger protect_lead_attribution_fields before update on public.leads
  for each row execute function public.protect_lead_attribution_fields();

-- Resolves campaign_id server-side (an anonymous visitor's client can
-- never read the campaigns table directly — its RLS is admin/manager
-- only). Matches last-touch utm_campaign first (standard
-- conversion-credit default), falling back to first-touch. A slug with
-- no matching campaign (e.g. an ad-hoc UTM link) simply leaves
-- campaign_id null; the raw utm_* strings are stored either way.
create or replace function public.resolve_lead_campaign_attribution()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_campaign_id uuid;
  v_slug text;
begin
  if new.campaign_id is not null then
    return new;
  end if;
  v_slug := coalesce(new.last_touch_campaign, new.first_touch_campaign);
  if v_slug is null then
    return new;
  end if;
  select id into v_campaign_id from public.campaigns where utm_campaign = v_slug limit 1;
  if v_campaign_id is not null then
    new.campaign_id := v_campaign_id;
  end if;
  return new;
end;
$$;

drop trigger if exists resolve_lead_campaign_attribution on public.leads;
create trigger resolve_lead_campaign_attribution before insert on public.leads
  for each row execute function public.resolve_lead_campaign_attribution();

-- ---------------------------------------------------------------------
-- website_settings — marketing defaults + attribution window. The
-- marketing WhatsApp number deliberately reuses the existing `whatsapp`
-- column rather than duplicating it.
-- ---------------------------------------------------------------------
alter table public.website_settings
  add column if not exists marketing_default_utm_source text,
  add column if not exists marketing_default_utm_medium text,
  add column if not exists marketing_default_campaign text,
  add column if not exists marketing_attribution_window_days integer not null default 30,
  add column if not exists marketing_default_landing_page text;
