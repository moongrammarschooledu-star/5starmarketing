-- =====================================================================
-- STEP 16 — Advanced Property Search + Smart Filters + Map-Based Search
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- properties — new search/map fields. Every one is nullable and never
-- backfilled with invented values; existing rows simply don't match a
-- filter on a field an admin hasn't filled in yet.
-- ---------------------------------------------------------------------
alter table public.properties
  add column if not exists city text not null default 'Lahore',
  add column if not exists bedrooms integer,
  add column if not exists bathrooms integer,
  -- Normalized size in square feet — the only field size range filters
  -- are ever compared against. The existing free-text `size`/
  -- `size_category` stay display-only and are never parsed as numbers.
  add column if not exists size_sqft numeric,
  add column if not exists latitude numeric check (latitude is null or (latitude between -90 and 90)),
  add column if not exists longitude numeric check (longitude is null or (longitude between -180 and 180));

-- ---------------------------------------------------------------------
-- Indexes for the new filterable/sortable fields (section 19). Reuses
-- whatever already exists (status/featured/property_type/project_id) —
-- only adding what's genuinely new.
-- ---------------------------------------------------------------------
create index if not exists properties_purpose_idx on public.properties (purpose);
create index if not exists properties_city_idx on public.properties (city);
create index if not exists properties_price_value_idx on public.properties (price_value);
create index if not exists properties_size_sqft_idx on public.properties (size_sqft);
create index if not exists properties_bedrooms_idx on public.properties (bedrooms);
create index if not exists properties_bathrooms_idx on public.properties (bathrooms);
create index if not exists properties_created_at_idx on public.properties (created_at);
-- Coordinate range queries (map bounds search) — a plain btree pair is
-- enough at this catalog size; PostGIS/GiST would be the next step if
-- the listing count grows into the tens of thousands.
create index if not exists properties_lat_lng_idx on public.properties (latitude, longitude);

-- ---------------------------------------------------------------------
-- Trigram search (section 2/19) — efficient ILIKE '%term%' search
-- server-side across title/description/location, backed by real
-- indexes instead of a full table scan per keystroke.
-- ---------------------------------------------------------------------
create extension if not exists pg_trgm;

create index if not exists properties_title_trgm_idx on public.properties using gin (title gin_trgm_ops);
create index if not exists properties_description_trgm_idx on public.properties using gin (description gin_trgm_ops);
create index if not exists properties_location_trgm_idx on public.properties using gin (location gin_trgm_ops);

-- ---------------------------------------------------------------------
-- property_popularity — real view/inquiry counts per property, from
-- the STEP 9 `property_views` table and the `leads` table's
-- `property_id`. Powers "Most Viewed"/"Most Inquired" sort with zero
-- invented numbers; a property with no tracked activity is 0, not
-- omitted.
-- ---------------------------------------------------------------------
create or replace view public.property_popularity as
select
  p.id as property_id,
  coalesce(pv.view_count, 0) as view_count,
  coalesce(l.inquiry_count, 0) as inquiry_count
from public.properties p
left join (
  select property_id, count(*) as view_count
  from public.property_views
  group by property_id
) pv on pv.property_id = p.id
left join (
  select property_id, count(*) as inquiry_count
  from public.leads
  where property_id is not null
  group by property_id
) l on l.property_id = p.id;

-- ---------------------------------------------------------------------
-- search_events — dedicated search/map UX analytics (section 41/42),
-- kept separate from website_events and campaign_events since those
-- two have closed CHECK-constraint enums for a different purpose
-- (lead-generation clicks / UTM campaign attribution) and mixing in 11
-- more generic search-UX event types would blur both. Public
-- insert-only (mirrors property_views / website_events /
-- campaign_events), admin/manager read-only.
-- ---------------------------------------------------------------------
create table if not exists public.search_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (
    event_type in (
      'property_search', 'filter_applied', 'filter_removed', 'sort_changed',
      'map_opened', 'map_marker_clicked', 'search_area_clicked',
      'property_result_clicked', 'favorite_from_search', 'compare_from_search',
      'saved_search_created'
    )
  ),
  session_id text,
  -- The signed-in customer, if any — never required, never exposed to
  -- other customers (RLS below is admin/manager read-only).
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  query text,
  -- A compact snapshot of the filters active at the time of the event
  -- (e.g. {"purpose":"sale","type":"house","city":"Lahore"}) — never
  -- personal data, only search criteria.
  filters jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists search_events_type_idx on public.search_events (event_type);
create index if not exists search_events_created_idx on public.search_events (created_at);
create index if not exists search_events_property_idx on public.search_events (property_id);

alter table public.search_events enable row level security;

drop policy if exists "search_events_public_insert" on public.search_events;
create policy "search_events_public_insert"
  on public.search_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "search_events_admin_read" on public.search_events;
create policy "search_events_admin_read"
  on public.search_events for select
  to authenticated
  using (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- saved_searches (STEP 10, extended) — a jsonb snapshot of the full
-- STEP 16 filter set, alongside (not replacing) the original loose
-- text columns so anything already reading those keeps working.
-- ---------------------------------------------------------------------
alter table public.saved_searches
  add column if not exists filters_json jsonb;

-- ---------------------------------------------------------------------
-- property_alerts (STEP 10, extended) — the architecture for future
-- "notify me" automation (section 37). No notification sending is
-- implemented here — only the schema a future scheduled job would read
-- (last_checked_at lets it pick up only what's new since it last ran).
-- ---------------------------------------------------------------------
alter table public.property_alerts
  add column if not exists saved_search_id uuid references public.saved_searches (id) on delete set null,
  add column if not exists filters_json jsonb,
  add column if not exists last_checked_at timestamptz;
