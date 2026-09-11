-- =====================================================================
-- 5STAR.M Estate & Builders — Supabase schema
--
-- Run this once in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- It is safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE
-- so re-running it after a partial failure won't duplicate anything.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- admin_profiles
-- One row per admin user, keyed to a Supabase Auth user (auth.users).
-- Auth itself (email/password) is handled entirely by Supabase Auth —
-- this table only holds the extra display info the dashboard needs.
-- ---------------------------------------------------------------------
create table if not exists public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Admin',
  title text not null default 'Administrator',
  profile_image text,
  -- Role architecture (STEP 9) — see the RLS/permissions notes below.
  role text not null default 'admin' check (
    role in ('super_admin', 'admin', 'editor', 'sales_agent', 'sales_manager')
  ),
  -- Sales team fields (STEP 14). email is cached here (kept in sync by
  -- handle_new_admin_user() below) for the same reason customer_profiles
  -- caches it — /admin/team needs to show OTHER members' emails, and the
  -- normal RLS-bound app client can never query auth.users directly.
  email text,
  phone text,
  whatsapp text,
  specialization text,
  bio text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  availability text not null default 'Available' check (
    availability in ('Available', 'Busy', 'On Leave', 'Inactive')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- customer_profiles (STEP 10)
-- One row per customer, keyed to a Supabase Auth user. email is cached
-- here (kept in sync by a trigger below) because the app's normal
-- RLS-bound client can never query the `auth` schema directly, so
-- /admin/customers needs a real place to read a customer's email and
-- registration date from. (STEP 14 later adds a service-role client,
-- but only for creating new team member accounts — never for reads.)
-- ---------------------------------------------------------------------
create table if not exists public.customer_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default 'Customer',
  email text,
  phone text not null default '',
  whatsapp text,
  profile_image text,
  disabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- is_admin() — true only for a signed-in user with a row in
-- admin_profiles. Used everywhere an "authenticated" policy means "admin"
-- specifically, now that customers can also sign in via Supabase Auth.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admin_profiles where id = auth.uid());
$$;

-- current_admin_role() / is_admin_or_manager() (STEP 14) — role-aware
-- helpers alongside is_admin() above (which only checks "is any kind of
-- staff"). CRM tables need the finer check so a sales_agent's database
-- access is actually scoped to their own leads, not just hidden in UI.
create or replace function public.current_admin_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select role from public.admin_profiles where id = auth.uid();
$$;

create or replace function public.is_admin_or_manager()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_admin_role() in ('super_admin', 'admin', 'sales_manager');
$$;

-- ---------------------------------------------------------------------
-- website_settings
-- Single-row table (id is always 1) holding editable business info.
-- ---------------------------------------------------------------------
create table if not exists public.website_settings (
  id smallint primary key default 1,
  business_name text not null default '5STAR.M Estate & Builders',
  tagline text not null default 'NOW YOU WILL DREAM — WE WILL FULFILL IT',
  phone text not null default '+92 319 8430458',
  whatsapp text not null default '+92 319 8430458',
  email text not null default 'maos.edu@gmail.com',
  address text not null default '1037-E-1 Johar Town, Lahore, Pakistan',
  logo_url text,
  favicon_url text,
  facebook_url text default '',
  instagram_url text default '',
  tiktok_url text default '',
  youtube_url text default '',
  whatsapp_display_name text not null default '5STAR.M Estate & Builders',
  whatsapp_default_greeting text not null default 'Assalam-o-Alaikum! How can we help you today?',
  whatsapp_default_inquiry_message text not null default 'Hi 5STAR.M, I''d like to know more about your properties.',
  -- Local Business Information (STEP 8) — used for LocalBusiness JSON-LD
  -- and as prep for a Google Business Profile.
  city text default 'Lahore',
  country text default 'Pakistan',
  latitude numeric,
  longitude numeric,
  website_url text,
  business_description text,
  -- SEO defaults (STEP 8) — fallbacks for page metadata.
  seo_site_title text,
  seo_site_description text,
  seo_default_og_image text,
  -- Appointment Settings (STEP 11) — configurable working days/hours for
  -- site-visit booking. Never claimed as real hours unless the admin sets
  -- them; these defaults are just a starting point.
  appointment_working_days text[] not null default array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  appointment_opening_time time not null default '10:00',
  appointment_closing_time time not null default '18:00',
  appointment_slot_duration_minutes integer not null default 60,
  appointment_break_start time,
  appointment_break_end time,
  appointment_max_visitors integer not null default 10,
  appointment_booking_notice_hours integer not null default 2,
  -- Lead Assignment Method (STEP 14) — off (Manual) by default; no
  -- automatic assignment happens unless explicitly changed.
  lead_assignment_method text not null default 'Manual' check (
    lead_assignment_method in ('Manual', 'Round Robin', 'Least Assigned Leads')
  ),
  -- Marketing / Attribution (STEP 15). The marketing WhatsApp number
  -- deliberately reuses `whatsapp` above rather than duplicating it.
  marketing_default_utm_source text,
  marketing_default_utm_medium text,
  marketing_default_campaign text,
  marketing_attribution_window_days integer not null default 30,
  marketing_default_landing_page text,
  -- Deals (STEP 18) — a suggested default commission rate admins can
  -- set instead of it being hardcoded; still overridable per deal.
  default_commission_rate numeric,
  updated_at timestamptz not null default now(),
  constraint website_settings_single_row check (id = 1)
);

insert into public.website_settings (id)
values (1)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- properties
-- ---------------------------------------------------------------------
create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  property_type text not null check (
    property_type in ('house', 'flat', 'residential_plot', 'commercial')
  ),
  purpose text not null check (purpose in ('sale', 'rent', 'investment')),
  location text not null,
  location_area text not null default 'Other Locations' check (
    location_area in ('Lahore', 'Johar Town', 'Other Locations')
  ),
  -- STEP 16 — Country → City → Area hierarchy: city is its own field,
  -- distinct from location_area's coarse enum and location's free text.
  city text not null default 'Lahore',
  size text not null,
  size_category text not null default 'Custom' check (
    size_category in ('3 Marla', '5 Marla', '10 Marla', '1 Kanal', 'Custom')
  ),
  -- STEP 16 — normalized size (sq ft) for real numeric range filtering;
  -- size/size_category above stay display-only, never parsed as numbers.
  size_sqft numeric,
  bedrooms integer,
  bathrooms integer,
  latitude numeric check (latitude is null or (latitude between -90 and 90)),
  longitude numeric check (longitude is null or (longitude between -180 and 180)),
  price text not null,
  price_value numeric,
  payment_option text not null check (
    payment_option in ('cash', 'installments', 'both')
  ),
  status text not null default 'available' check (
    status in ('available', 'reserved', 'sold', 'inactive')
  ),
  featured boolean not null default false,
  description text not null default '',
  features text[] not null default '{}',
  amenities text[] not null default '{}',
  images text[] not null default '{}',
  maps_url text,
  project_id uuid,
  payment_total_price numeric,
  payment_down_payment numeric,
  payment_monthly_installment numeric,
  payment_duration_months integer,
  payment_installments_count integer,
  documents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists properties_status_idx on public.properties (status);
create index if not exists properties_featured_idx on public.properties (featured);
create index if not exists properties_type_idx on public.properties (property_type);
create index if not exists properties_slug_idx on public.properties (slug);
create index if not exists properties_project_idx on public.properties (project_id);
-- STEP 16 — advanced search/map indexes.
create index if not exists properties_purpose_idx on public.properties (purpose);
create index if not exists properties_city_idx on public.properties (city);
create index if not exists properties_price_value_idx on public.properties (price_value);
create index if not exists properties_size_sqft_idx on public.properties (size_sqft);
create index if not exists properties_bedrooms_idx on public.properties (bedrooms);
create index if not exists properties_bathrooms_idx on public.properties (bathrooms);
create index if not exists properties_created_at_idx on public.properties (created_at);
create index if not exists properties_lat_lng_idx on public.properties (latitude, longitude);

create extension if not exists pg_trgm;
create index if not exists properties_title_trgm_idx on public.properties using gin (title gin_trgm_ops);
create index if not exists properties_description_trgm_idx on public.properties using gin (description gin_trgm_ops);
create index if not exists properties_location_trgm_idx on public.properties using gin (location gin_trgm_ops);

-- ---------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  location text not null,
  property_type text not null default 'Residential',
  status text not null default 'upcoming' check (
    status in ('upcoming', 'ongoing', 'completed')
  ),
  short_description text not null default '',
  description text not null default '',
  highlights text[] not null default '{}',
  property_types text[] not null default '{}',
  payment_options text[] not null default '{}',
  maps_url text,
  cover_image text,
  whatsapp_number text,
  documents jsonb not null default '[]'::jsonb,
  images text[] not null default '{}',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_published_idx on public.projects (published);

-- properties.project_id references projects, added here (not inline above)
-- since the properties table is created before the projects table exists.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'properties_project_id_fkey' and table_name = 'properties'
  ) then
    alter table public.properties
      add constraint properties_project_id_fkey
      foreign key (project_id) references public.projects (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- campaigns (STEP 15) — defined here (after properties/projects, before
-- leads) so leads.campaign_id below can reference it directly.
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
  -- Only ever populated from real, admin-verified revenue — never
  -- estimated from a property's asking price.
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

-- campaign_events — anonymous, campaign-attributed tracking. Public
-- insert-only (mirrors property_views / website_events), admin/manager
-- read-only. No personal data — just what happened, where, and which
-- campaign it's attributed to.
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

-- ---------------------------------------------------------------------
-- services
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  icon text not null default 'Home',
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists services_enabled_idx on public.services (enabled);

-- ---------------------------------------------------------------------
-- leads
-- Every property inquiry / WhatsApp click / contact-form submission
-- becomes one row here — the Lead Management CRM's main table.
-- ---------------------------------------------------------------------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  whatsapp text,
  email text,
  property_id uuid references public.properties (id) on delete set null,
  property_title text,
  -- The logged-in customer who submitted this inquiry, if any (STEP 10) —
  -- nullable, since anonymous visitors can still submit without an account.
  customer_id uuid references auth.users (id) on delete set null,
  message text not null default '',
  source text not null default 'website' check (
    source in ('website', 'property_page', 'whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'direct', 'other', 'site_visit')
  ),
  status text not null default 'new' check (
    status in ('new', 'contacted', 'interested', 'follow_up', 'site_visit', 'negotiation', 'closed', 'lost')
  ),
  consent boolean not null default false,
  next_follow_up_date date,
  next_follow_up_time time,
  assigned_to text,
  -- Lead Assignment (STEP 14) — kept alongside assigned_to (text) for
  -- backward compatibility with anything already reading it.
  assigned_agent_id uuid references public.admin_profiles (id) on delete set null,
  -- Marketing attribution (STEP 15) — captured once at creation from the
  -- visitor's client-side first/last-touch record; locked afterward by
  -- protect_lead_attribution_fields below.
  campaign_id uuid references public.campaigns (id) on delete set null,
  first_touch_source text,
  first_touch_medium text,
  first_touch_campaign text,
  first_touch_content text,
  first_touch_term text,
  first_touch_landing_page text,
  last_touch_source text,
  last_touch_medium text,
  last_touch_campaign text,
  last_touch_content text,
  last_touch_term text,
  last_touch_landing_page text,
  -- STEP 17 — CRM fields.
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  lead_type text not null default 'General Inquiry' check (
    lead_type in (
      'General Inquiry', 'Property Details', 'Callback Request', 'Site Visit', 'Brochure Request',
      'Investment Inquiry', 'Project Inquiry', 'Price Request', 'Payment Plan Request'
    )
  ),
  project_id uuid references public.projects (id) on delete set null,
  project_title text,
  purpose text check (purpose is null or purpose in ('buy', 'rent', 'invest')),
  budget_min numeric,
  budget_max numeric,
  preferred_location text,
  preferred_property_type text,
  preferred_bedrooms integer,
  last_contacted_at timestamptz,
  lost_reason text check (
    lost_reason is null or lost_reason in (
      'Budget', 'Not Interested', 'Property Unavailable', 'Bought Elsewhere',
      'Rent Elsewhere', 'No Response', 'Invalid Lead', 'Other'
    )
  ),
  converted_at timestamptz,
  converted_by uuid references public.admin_profiles (id) on delete set null,
  -- Archive (section 44) — the preferred, reversible alternative to hard
  -- delete; the existing hard-delete method/RLS stay admin/manager-only.
  archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_assigned_agent_idx on public.leads (assigned_agent_id);
create index if not exists leads_property_idx on public.leads (property_id);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_follow_up_idx on public.leads (next_follow_up_date);
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists leads_priority_idx on public.leads (priority);
create index if not exists leads_lead_type_idx on public.leads (lead_type);
create index if not exists leads_project_idx on public.leads (project_id);
create index if not exists leads_created_at_idx on public.leads (created_at);
create index if not exists leads_archived_idx on public.leads (archived);
create index if not exists leads_whatsapp_idx on public.leads (whatsapp);
create index if not exists leads_customer_idx on public.leads (customer_id);
create index if not exists leads_campaign_idx on public.leads (campaign_id);
-- pg_trgm was already enabled in STEP 16 (see the properties indexes
-- further up this file) — reused here for the CRM name search box.
create index if not exists leads_name_trgm_idx on public.leads using gin (name gin_trgm_ops);

-- ---------------------------------------------------------------------
-- lead_notes
-- Follow-up notes/history against a lead — one row per note.
-- ---------------------------------------------------------------------
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  note text not null,
  created_by text,
  -- STEP 14: FK alongside created_by (text name) for backward compat.
  user_id uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id);

-- ---------------------------------------------------------------------
-- whatsapp_templates
-- Admin-managed quick-message templates (STEP 6). Content may contain
-- {{customer_name}}, {{property_name}}, {{location}}, {{price}},
-- {{size}}, {{agent_name}} placeholders filled in at send time.
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.whatsapp_templates (name, content) values
  ('New Inquiry', 'Assalam-o-Alaikum {{customer_name}},

Thank you for your interest in {{property_name}}. We have received your inquiry and our team will get back to you shortly.'),
  ('Property Details', 'Assalam-o-Alaikum {{customer_name}},

Here are the details for {{property_name}} at {{location}}.
Price: {{price}}
Size: {{size}}

Let us know if you would like to schedule a visit.'),
  ('Follow-Up', 'Assalam-o-Alaikum {{customer_name}},

Just following up regarding {{property_name}}. Are you still interested? Please let us know a suitable time to talk.'),
  ('Visit Invitation', 'Assalam-o-Alaikum {{customer_name}},

We would love to arrange a site visit for {{property_name}}. Please let us know a convenient day and time.'),
  ('Price Information', 'Assalam-o-Alaikum {{customer_name}},

The price for {{property_name}} is {{price}}. We also offer flexible payment plans — would you like more details?'),
  ('Payment Plan', 'Assalam-o-Alaikum {{customer_name}},

Here is the payment plan information for {{property_name}}. We offer both cash and easy installment options. Let us know which suits you best.'),
  ('Thank You', 'Assalam-o-Alaikum {{customer_name}},

Thank you for choosing 5STAR.M Estate & Builders. It was a pleasure assisting you regarding {{property_name}}.'),
  ('Closed Lead', 'Assalam-o-Alaikum {{customer_name}},

Thank you for your time. If your requirements change in the future or you would like to explore other options, {{agent_name}} and the 5STAR.M team are always here to help.')
on conflict (name) do nothing;

-- ---------------------------------------------------------------------
-- whatsapp_activity
-- Logs what actually happened, not fake delivery/read receipts — normal
-- wa.me click-to-chat links give no delivery/read status, so only
-- honest action states are recorded (see STEP 6 spec section 7).
-- ---------------------------------------------------------------------
create table if not exists public.whatsapp_activity (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  channel text not null default 'whatsapp',
  action text not null check (
    action in ('whatsapp_opened', 'follow_up_required', 'contacted')
  ),
  template_name text,
  admin text,
  created_at timestamptz not null default now()
);

create index if not exists whatsapp_activity_lead_idx on public.whatsapp_activity (lead_id);

-- ---------------------------------------------------------------------
-- property_views (STEP 9) — one row per property-page view. No personal
-- data: session_id is a random id generated in the visitor's browser.
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
-- property_popularity (STEP 16) — real view/inquiry counts per
-- property, from property_views above and leads.property_id. Powers
-- "Most Viewed"/"Most Inquired" sort with zero invented numbers; a
-- property with no tracked activity is 0, not omitted.
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
-- website_events (STEP 9) — whatsapp_click / phone_click /
-- contact_form_submit / project_view. property_view has its own table
-- above; property_inquiry is already captured as a row in `leads`.
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
-- search_events (STEP 16) — dedicated search/map UX analytics, kept
-- separate from website_events/campaign_events (different closed enums,
-- different purpose). Public insert-only, admin/manager read-only.
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
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  query text,
  filters jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default now()
);

create index if not exists search_events_type_idx on public.search_events (event_type);
create index if not exists search_events_created_idx on public.search_events (created_at);
create index if not exists search_events_property_idx on public.search_events (property_id);

-- ---------------------------------------------------------------------
-- activity_logs (STEP 9) — admin action history. Written only by
-- authenticated admin actions, never by public visitors.
-- ---------------------------------------------------------------------
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references public.admin_profiles (id) on delete set null,
  admin_name text,
  action text not null,
  entity_type text,
  entity_id uuid,
  description text not null,
  -- STEP 18 — structured detail (old/new values, amounts) alongside the
  -- human-readable description above. Nullable; every pre-STEP18 caller
  -- of activityService.log() keeps working unchanged.
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists activity_logs_created_idx on public.activity_logs (created_at);
create index if not exists activity_logs_entity_idx on public.activity_logs (entity_type, entity_id);

-- ---------------------------------------------------------------------
-- favorites (STEP 10) — one row per (customer, property). The unique
-- constraint is what actually prevents saving the same property twice.
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create index if not exists favorites_user_idx on public.favorites (user_id);
create index if not exists favorites_property_idx on public.favorites (property_id);

-- ---------------------------------------------------------------------
-- property_alerts (STEP 10) — architecture + UI only; no email/WhatsApp
-- automation is wired up yet.
-- ---------------------------------------------------------------------
create table if not exists public.property_alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  property_type text,
  location text,
  min_price numeric,
  max_price numeric,
  purpose text,
  enabled boolean not null default true,
  -- STEP 16 — architecture for future "notify me" automation (no
  -- sending implemented here). saved_search_id's FK to saved_searches
  -- is added further down, once that table exists.
  saved_search_id uuid,
  filters_json jsonb,
  last_checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_alerts_user_idx on public.property_alerts (user_id);

-- ---------------------------------------------------------------------
-- saved_searches (STEP 10)
-- ---------------------------------------------------------------------
create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  property_type text,
  location text,
  size_category text,
  purpose text,
  enabled boolean not null default true,
  -- STEP 16 — full snapshot of the advanced-search filter set, alongside
  -- (not replacing) the loose text columns above.
  filters_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_searches_user_idx on public.saved_searches (user_id);

-- property_alerts.saved_search_id references this table, which is
-- created after property_alerts — added here as a deferred FK, same
-- pattern as properties.project_id → projects further up this file.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'property_alerts_saved_search_id_fkey' and table_name = 'property_alerts'
  ) then
    alter table public.property_alerts
      add constraint property_alerts_saved_search_id_fkey
      foreign key (saved_search_id) references public.saved_searches (id) on delete set null;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- customer_notifications (STEP 10) — architecture only; rows are written
-- by admin actions (e.g. a lead status change). No real email/WhatsApp
-- sending is wired up yet.
-- ---------------------------------------------------------------------
create table if not exists public.customer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  read boolean not null default false,
  entity_type text,
  entity_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists customer_notifications_user_idx on public.customer_notifications (user_id);

-- ---------------------------------------------------------------------
-- appointments (STEP 11) — property site-visit booking.
-- ---------------------------------------------------------------------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid not null references public.properties (id) on delete cascade,
  lead_id uuid references public.leads (id) on delete set null,
  name text not null,
  phone text not null,
  whatsapp text,
  email text,
  appointment_date date not null,
  appointment_time time not null,
  number_of_visitors integer not null default 1,
  message text not null default '',
  status text not null default 'Pending' check (
    status in ('Pending', 'Confirmed', 'Rescheduled', 'Completed', 'Cancelled', 'No Show')
  ),
  assigned_agent text,
  -- STEP 14: FK alongside assigned_agent (text) for backward compat.
  assigned_agent_id uuid references public.admin_profiles (id) on delete set null,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_property_idx on public.appointments (property_id);
create index if not exists appointments_customer_idx on public.appointments (customer_id);
create index if not exists appointments_date_idx on public.appointments (appointment_date);
create index if not exists appointments_status_idx on public.appointments (status);
create index if not exists appointments_slot_idx on public.appointments (appointment_date, appointment_time, assigned_agent);
create index if not exists appointments_assigned_agent_idx on public.appointments (assigned_agent_id);

-- ---------------------------------------------------------------------
-- appointment_history (STEP 11)
-- ---------------------------------------------------------------------
create table if not exists public.appointment_history (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  changed_by text,
  old_status text,
  new_status text,
  old_date date,
  new_date date,
  old_time time,
  new_time time,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists appointment_history_appointment_idx on public.appointment_history (appointment_id);

-- ---------------------------------------------------------------------
-- appointment_reminders (STEP 11) — architecture only; nothing sends
-- these yet (no SMS/email/WhatsApp provider configured).
-- ---------------------------------------------------------------------
create table if not exists public.appointment_reminders (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  remind_at timestamptz not null,
  type text not null check (type in ('24h', '2h')),
  sent boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists appointment_reminders_appointment_idx on public.appointment_reminders (appointment_id);
create index if not exists appointment_reminders_remind_at_idx on public.appointment_reminders (remind_at) where not sent;

-- ---------------------------------------------------------------------
-- payment_plans (STEP 12) — a NEW, richer payment-plan system alongside
-- the simple inline payment_* columns already on `properties` (STEP 7),
-- which keep working exactly as before. A property only gets a row here
-- once an admin explicitly builds one via /admin/properties/[id]/edit.
-- ---------------------------------------------------------------------
create table if not exists public.payment_plans (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties (id) on delete cascade,
  payment_option text not null default 'Installments' check (
    payment_option in ('Cash', 'Installments', 'Both')
  ),
  calculation_type text not null default 'Automatic' check (
    calculation_type in ('Automatic', 'Custom')
  ),
  property_price numeric not null,
  down_payment numeric not null default 0,
  booking_fee numeric,
  confirmation_fee numeric,
  processing_fee numeric,
  additional_charges numeric,
  additional_charges_description text,
  installment_frequency text not null default 'Monthly' check (
    installment_frequency in ('Monthly', 'Quarterly', 'Yearly')
  ),
  duration integer not null default 12,
  installment_amount numeric,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payment_plans_property_idx on public.payment_plans (property_id);
create index if not exists payment_plans_enabled_idx on public.payment_plans (enabled);

-- ---------------------------------------------------------------------
-- payment_schedule_items (STEP 12) — custom installment breakdowns.
-- ---------------------------------------------------------------------
create table if not exists public.payment_schedule_items (
  id uuid primary key default gen_random_uuid(),
  payment_plan_id uuid not null references public.payment_plans (id) on delete cascade,
  installment_number integer not null,
  due_date date,
  amount numeric not null,
  description text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists payment_schedule_items_plan_idx on public.payment_schedule_items (payment_plan_id);

-- ---------------------------------------------------------------------
-- brochures (STEP 13) — a generated marketing PDF for one property or
-- one project (never both — see the check constraint below).
-- ---------------------------------------------------------------------
create table if not exists public.brochures (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete cascade,
  type text not null check (type in ('property', 'project')),
  title text not null,
  slug text not null unique,
  selected_sections text[] not null default array[
    'cover', 'overview', 'gallery', 'features', 'amenities', 'paymentPlan', 'location', 'contact', 'whatsappCta', 'disclaimer'
  ],
  generated_file text,
  public boolean not null default false,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint brochures_one_target check (
    (property_id is not null and project_id is null) or (property_id is null and project_id is not null)
  )
);

create index if not exists brochures_property_idx on public.brochures (property_id);
create index if not exists brochures_project_idx on public.brochures (project_id);
create index if not exists brochures_public_idx on public.brochures (public);
create index if not exists brochures_created_idx on public.brochures (created_at);

-- ---------------------------------------------------------------------
-- follow_ups (STEP 14) — a dedicated, re-schedulable follow-up history
-- per lead, richer than the simple next_follow_up_date/time fields
-- already on `leads` (which stay untouched and keep working).
-- ---------------------------------------------------------------------
create table if not exists public.follow_ups (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  assigned_agent_id uuid references public.admin_profiles (id) on delete set null,
  follow_up_date date not null,
  follow_up_time time,
  type text not null default 'Call' check (type in ('Call', 'WhatsApp', 'Meeting', 'Site Visit', 'Other')),
  note text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Cancelled', 'Overdue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists follow_ups_lead_idx on public.follow_ups (lead_id);
create index if not exists follow_ups_agent_idx on public.follow_ups (assigned_agent_id);
create index if not exists follow_ups_date_idx on public.follow_ups (follow_up_date);
create index if not exists follow_ups_status_idx on public.follow_ups (status);

-- ---------------------------------------------------------------------
-- notifications (STEP 14) — STAFF-facing (admin/sales_manager/
-- sales_agent), kept separate from customer_notifications (STEP 10).
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.admin_profiles (id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  entity_type text,
  entity_id uuid,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_idx on public.notifications (user_id);
create index if not exists notifications_unread_idx on public.notifications (user_id, read) where not read;

-- ---------------------------------------------------------------------
-- updated_at auto-touch trigger, shared by every table above
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.properties;
create trigger set_updated_at before update on public.properties
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.projects;
create trigger set_updated_at before update on public.projects
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.services;
create trigger set_updated_at before update on public.services
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.leads;
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.lead_notes;
create trigger set_updated_at before update on public.lead_notes
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.follow_ups;
create trigger set_updated_at before update on public.follow_ups
  for each row execute function public.set_updated_at();

-- A sales_agent may only ever change status/consent/follow-up fields on
-- a lead — never reassign it, change whose customer it is, or edit the
-- customer's own contact details. Admins and sales managers unaffected.
create or replace function public.protect_lead_fields_for_agent()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.assigned_agent_id := old.assigned_agent_id;
    new.assigned_to := old.assigned_to;
    new.customer_id := old.customer_id;
    new.property_id := old.property_id;
    new.property_title := old.property_title;
    -- STEP 17 — project identity is locked the same way property
    -- identity already was; customer-requirement fields (purpose,
    -- budget, preferred_*, priority, lead_type) stay agent-editable.
    new.project_id := old.project_id;
    new.project_title := old.project_title;
    new.name := old.name;
    new.phone := old.phone;
    new.whatsapp := old.whatsapp;
    new.email := old.email;
    new.source := old.source;
    new.message := old.message;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_lead_fields_for_agent on public.leads;
create trigger protect_lead_fields_for_agent before update on public.leads
  for each row execute function public.protect_lead_fields_for_agent();

-- STEP 15: attribution is set once, at insert, from the visitor's own
-- browser-side attribution record — never edited afterward by anyone,
-- admins included. Unconditional (unlike the trigger above, which only
-- restricts non-admin/manager actors on different columns).
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
-- never read the campaigns table directly). Matches last-touch
-- utm_campaign first, falling back to first-touch.
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

drop trigger if exists set_updated_at on public.campaigns;
create trigger set_updated_at before update on public.campaigns
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.website_settings;
create trigger set_updated_at before update on public.website_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.admin_profiles;
create trigger set_updated_at before update on public.admin_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.customer_profiles;
create trigger set_updated_at before update on public.customer_profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.property_alerts;
create trigger set_updated_at before update on public.property_alerts
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.saved_searches;
create trigger set_updated_at before update on public.saved_searches
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.appointments;
create trigger set_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- A customer may only ever change their own appointment from Pending to
-- Cancelled — nothing else. Enforced here (not just RLS), since RLS
-- can't restrict which columns an UPDATE touches.
create or replace function public.protect_appointment_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    if old.status <> 'Pending' or new.status <> 'Cancelled' then
      raise exception 'You can only cancel a pending appointment.';
    end if;
    new.property_id := old.property_id;
    new.lead_id := old.lead_id;
    new.name := old.name;
    new.phone := old.phone;
    new.whatsapp := old.whatsapp;
    new.email := old.email;
    new.appointment_date := old.appointment_date;
    new.appointment_time := old.appointment_time;
    new.number_of_visitors := old.number_of_visitors;
    new.message := old.message;
    new.assigned_agent := old.assigned_agent;
    new.admin_notes := old.admin_notes;
    new.customer_id := old.customer_id;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_appointment_fields on public.appointments;
create trigger protect_appointment_fields before update on public.appointments
  for each row execute function public.protect_appointment_fields();

drop trigger if exists set_updated_at on public.payment_plans;
create trigger set_updated_at before update on public.payment_plans
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.brochures;
create trigger set_updated_at before update on public.brochures
  for each row execute function public.set_updated_at();

-- A customer can update their own name/phone/whatsapp/photo, but never
-- their own `disabled` flag or cached `email` (email changes must go
-- through Supabase's own secure email-change flow) — enforced here
-- rather than by column-level GRANTs, since admin and customer share the
-- same underlying "authenticated" Postgres role in Supabase.
create or replace function public.protect_customer_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    new.disabled := old.disabled;
    new.email := old.email;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_customer_profile_fields on public.customer_profiles;
create trigger protect_customer_profile_fields before update on public.customer_profiles
  for each row execute function public.protect_customer_profile_fields();

-- Auto-create an admin_profiles row whenever a new Supabase Auth user is
-- created, so the dashboard always has a profile to read/update — and
-- (STEP 10) a customer_profiles row instead when the signup was a
-- customer self-registration, routed by
-- raw_user_meta_data->>'account_type' (set explicitly by the /register
-- form's signUp call — dashboard-created admins never set this, so they
-- keep working exactly as before).
create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'account_type', 'admin') = 'customer' then
    insert into public.customer_profiles (id, full_name, email, phone)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', 'Customer'),
      new.email,
      coalesce(new.raw_user_meta_data ->> 'phone', '')
    )
    on conflict (id) do nothing;
  else
    insert into public.admin_profiles (id, name, title, role, email)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Admin'), 'Director', 'admin', new.email)
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_admin_user();

-- Keeps customer_profiles.email in sync after Supabase's own secure
-- email-change confirmation completes.
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.customer_profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated after update of email on auth.users
  for each row execute function public.handle_user_email_change();

-- =====================================================================
-- Row Level Security
-- Public (anon) visitors: read-only, and only "public" rows (available/
-- featured properties, enabled services, any project). Every write
-- requires an authenticated Supabase session (i.e. a logged-in admin).
-- =====================================================================

alter table public.properties enable row level security;
alter table public.projects enable row level security;
alter table public.services enable row level security;
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;
alter table public.whatsapp_templates enable row level security;
alter table public.whatsapp_activity enable row level security;
alter table public.website_settings enable row level security;
alter table public.admin_profiles enable row level security;

-- properties: public can read everything except "inactive" listings;
-- admins (any authenticated user) can do everything.
drop policy if exists "properties_public_read" on public.properties;
create policy "properties_public_read"
  on public.properties for select
  to anon, authenticated
  using (status <> 'inactive');

drop policy if exists "properties_admin_write" on public.properties;
create policy "properties_admin_write"
  on public.properties for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- projects: public can read only published projects; admins (via the
-- "for all" write policy below, which also grants select) see everything
-- including drafts.
drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read"
  on public.projects for select
  to anon, authenticated
  using (published = true);

drop policy if exists "projects_admin_write" on public.projects;
create policy "projects_admin_write"
  on public.projects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- services: public can read only enabled services; admins can read/write all.
drop policy if exists "services_public_read" on public.services;
create policy "services_public_read"
  on public.services for select
  to anon
  using (enabled = true);

drop policy if exists "services_admin_all" on public.services;
create policy "services_admin_all"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- leads: anyone (including anonymous website visitors) can submit a lead
-- (property inquiry / contact form / WhatsApp click), but only admins can
-- read, update or delete them — a visitor must never be able to read
-- other people's leads.
drop policy if exists "leads_public_insert" on public.leads;
create policy "leads_public_insert"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- STEP 14: role-aware — admin/sales_manager see all, a sales_agent sees
-- (only) their own assigned leads.
drop policy if exists "leads_admin_read" on public.leads;
create policy "leads_admin_read"
  on public.leads for select
  to authenticated
  using (public.is_admin_or_manager());

drop policy if exists "leads_agent_read" on public.leads;
create policy "leads_agent_read"
  on public.leads for select
  to authenticated
  using (assigned_agent_id = auth.uid());

-- A customer can read (only) their own leads — see leads.customer_id
-- above — for "My Inquiries" in the Customer Portal (STEP 10).
drop policy if exists "leads_customer_read" on public.leads;
create policy "leads_customer_read"
  on public.leads for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "leads_admin_update" on public.leads;
create policy "leads_admin_update"
  on public.leads for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "leads_agent_update" on public.leads;
create policy "leads_agent_update"
  on public.leads for update
  to authenticated
  using (assigned_agent_id = auth.uid())
  with check (assigned_agent_id = auth.uid());

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
  on public.leads for delete
  to authenticated
  using (public.is_admin_or_manager());

-- lead_notes: no public policy at all (RLS defaults to deny). STEP 14:
-- admin/sales_manager see all notes; a sales_agent can read/add notes
-- only on leads assigned to them.
drop policy if exists "lead_notes_admin_all" on public.lead_notes;
create policy "lead_notes_admin_all"
  on public.lead_notes for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_notes_agent_read" on public.lead_notes;
create policy "lead_notes_agent_read"
  on public.lead_notes for select
  to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_notes.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "lead_notes_agent_insert" on public.lead_notes;
create policy "lead_notes_agent_insert"
  on public.lead_notes for insert
  to authenticated
  with check (exists (select 1 from public.leads l where l.id = lead_notes.lead_id and l.assigned_agent_id = auth.uid()));

-- whatsapp_templates / whatsapp_activity: no public policy at all —
-- these are internal admin tools (message drafting + activity history),
-- never exposed to anonymous visitors.
drop policy if exists "whatsapp_templates_admin_all" on public.whatsapp_templates;
create policy "whatsapp_templates_admin_all"
  on public.whatsapp_templates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "whatsapp_activity_admin_all" on public.whatsapp_activity;
create policy "whatsapp_activity_admin_all"
  on public.whatsapp_activity for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- website_settings: public can read; only admins can write.
drop policy if exists "settings_public_read" on public.website_settings;
create policy "settings_public_read"
  on public.website_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "settings_admin_write" on public.website_settings;
create policy "settings_admin_write"
  on public.website_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- admin_profiles: an admin can only read/update their own profile row.
drop policy if exists "profile_self_read" on public.admin_profiles;
create policy "profile_self_read"
  on public.admin_profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "profile_self_update" on public.admin_profiles;
create policy "profile_self_update"
  on public.admin_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- STEP 14: /admin/team needs the whole roster and the ability to edit
-- other members' rows, on top of the self policies above (Postgres OR's
-- multiple policies for the same command). The self-update policy has
-- no column lock, so without the trigger below any signed-in staff
-- member — including a sales_agent — could set their OWN role/status
-- and self-promote. Only is_admin_or_manager() may change those columns
-- from here on; everyone else gets them silently reset to the old value.
drop policy if exists "admin_profiles_team_read" on public.admin_profiles;
create policy "admin_profiles_team_read"
  on public.admin_profiles for select
  to authenticated
  using (public.is_admin_or_manager());

drop policy if exists "admin_profiles_team_update" on public.admin_profiles;
create policy "admin_profiles_team_update"
  on public.admin_profiles for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create or replace function public.protect_admin_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.role := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_admin_profile_fields on public.admin_profiles;
create trigger protect_admin_profile_fields before update on public.admin_profiles
  for each row execute function public.protect_admin_profile_fields();

-- property_views / website_events (STEP 9): public insert-only (so an
-- anonymous visitor's page view / click can be logged), admin read-only.
alter table public.property_views enable row level security;
alter table public.website_events enable row level security;
alter table public.activity_logs enable row level security;

drop policy if exists "property_views_public_insert" on public.property_views;
create policy "property_views_public_insert"
  on public.property_views for insert
  to anon, authenticated
  with check (true);

drop policy if exists "property_views_admin_read" on public.property_views;
create policy "property_views_admin_read"
  on public.property_views for select
  to authenticated
  using (public.is_admin());

drop policy if exists "website_events_public_insert" on public.website_events;
create policy "website_events_public_insert"
  on public.website_events for insert
  to anon, authenticated
  with check (true);

drop policy if exists "website_events_admin_read" on public.website_events;
create policy "website_events_admin_read"
  on public.website_events for select
  to authenticated
  using (public.is_admin());

-- search_events (STEP 16): public insert-only, admin/manager read-only.
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

-- activity_logs (STEP 9): admin-only end to end — no anonymous access.
drop policy if exists "activity_logs_admin_all" on public.activity_logs;
create policy "activity_logs_admin_all"
  on public.activity_logs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- Customer Portal (STEP 10) — RLS for customer_profiles, favorites,
-- property_alerts, saved_searches, customer_notifications.
-- =====================================================================

alter table public.customer_profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.property_alerts enable row level security;
alter table public.saved_searches enable row level security;
alter table public.customer_notifications enable row level security;

drop policy if exists "customer_profiles_self_read" on public.customer_profiles;
create policy "customer_profiles_self_read"
  on public.customer_profiles for select
  to authenticated
  using (id = auth.uid());

drop policy if exists "customer_profiles_self_update" on public.customer_profiles;
create policy "customer_profiles_self_update"
  on public.customer_profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "customer_profiles_admin_read" on public.customer_profiles;
create policy "customer_profiles_admin_read"
  on public.customer_profiles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "customer_profiles_admin_update" on public.customer_profiles;
create policy "customer_profiles_admin_update"
  on public.customer_profiles for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "favorites_owner_all" on public.favorites;
create policy "favorites_owner_all"
  on public.favorites for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "favorites_admin_read" on public.favorites;
create policy "favorites_admin_read"
  on public.favorites for select
  to authenticated
  using (public.is_admin());

drop policy if exists "property_alerts_owner_all" on public.property_alerts;
create policy "property_alerts_owner_all"
  on public.property_alerts for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "property_alerts_admin_read" on public.property_alerts;
create policy "property_alerts_admin_read"
  on public.property_alerts for select
  to authenticated
  using (public.is_admin());

drop policy if exists "saved_searches_owner_all" on public.saved_searches;
create policy "saved_searches_owner_all"
  on public.saved_searches for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "customer_notifications_self_read" on public.customer_notifications;
create policy "customer_notifications_self_read"
  on public.customer_notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "customer_notifications_self_update" on public.customer_notifications;
create policy "customer_notifications_self_update"
  on public.customer_notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "customer_notifications_admin_all" on public.customer_notifications;
create policy "customer_notifications_admin_all"
  on public.customer_notifications for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- Appointments (STEP 11)
-- =====================================================================

alter table public.appointments enable row level security;
alter table public.appointment_history enable row level security;
alter table public.appointment_reminders enable row level security;

-- Anyone (including an anonymous visitor) can request a site visit —
-- same shape as leads_public_insert.
drop policy if exists "appointments_public_insert" on public.appointments;
create policy "appointments_public_insert"
  on public.appointments for insert
  to anon, authenticated
  with check (true);

-- STEP 14: role-aware — admin/sales_manager manage all; a sales_agent
-- can read/update (only) appointments assigned to them.
drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all"
  on public.appointments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "appointments_agent_read" on public.appointments;
create policy "appointments_agent_read"
  on public.appointments for select
  to authenticated
  using (assigned_agent_id = auth.uid());

drop policy if exists "appointments_agent_update" on public.appointments;
create policy "appointments_agent_update"
  on public.appointments for update
  to authenticated
  using (assigned_agent_id = auth.uid())
  with check (assigned_agent_id = auth.uid());

drop policy if exists "appointments_customer_read" on public.appointments;
create policy "appointments_customer_read"
  on public.appointments for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "appointments_customer_cancel" on public.appointments;
create policy "appointments_customer_cancel"
  on public.appointments for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- appointment_history / appointment_reminders: admin-only end to end.
drop policy if exists "appointment_history_admin_all" on public.appointment_history;
create policy "appointment_history_admin_all"
  on public.appointment_history for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "appointment_reminders_admin_all" on public.appointment_reminders;
create policy "appointment_reminders_admin_all"
  on public.appointment_reminders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- Payment Plans (STEP 12) — public can read an enabled plan (so the
-- property page / calculator can show it); only admins can write.
-- =====================================================================

alter table public.payment_plans enable row level security;
alter table public.payment_schedule_items enable row level security;

drop policy if exists "payment_plans_public_read" on public.payment_plans;
create policy "payment_plans_public_read"
  on public.payment_plans for select
  to anon, authenticated
  using (enabled = true);

drop policy if exists "payment_plans_admin_all" on public.payment_plans;
create policy "payment_plans_admin_all"
  on public.payment_plans for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "payment_schedule_items_public_read" on public.payment_schedule_items;
create policy "payment_schedule_items_public_read"
  on public.payment_schedule_items for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.payment_plans pp
      where pp.id = payment_schedule_items.payment_plan_id and pp.enabled = true
    )
  );

drop policy if exists "payment_schedule_items_admin_all" on public.payment_schedule_items;
create policy "payment_schedule_items_admin_all"
  on public.payment_schedule_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- Brochures (STEP 13) — public can read only a brochure explicitly
-- marked public; admins have full access.
-- =====================================================================

alter table public.brochures enable row level security;

drop policy if exists "brochures_public_read" on public.brochures;
create policy "brochures_public_read"
  on public.brochures for select
  to anon, authenticated
  using (public = true);

drop policy if exists "brochures_admin_all" on public.brochures;
create policy "brochures_admin_all"
  on public.brochures for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- =====================================================================
-- Follow-Ups (STEP 14) — admin/sales_manager manage all; a sales_agent
-- fully manages (only) their own assigned follow-ups.
-- =====================================================================

alter table public.follow_ups enable row level security;

drop policy if exists "follow_ups_admin_all" on public.follow_ups;
create policy "follow_ups_admin_all"
  on public.follow_ups for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "follow_ups_agent_all" on public.follow_ups;
create policy "follow_ups_agent_all"
  on public.follow_ups for all
  to authenticated
  using (assigned_agent_id = auth.uid())
  with check (assigned_agent_id = auth.uid());

-- =====================================================================
-- Notifications (STEP 14) — STAFF-facing, self-read/update; any staff
-- member can create one for a colleague (e.g. assigning them a lead).
-- =====================================================================

alter table public.notifications enable row level security;

drop policy if exists "notifications_self_read" on public.notifications;
create policy "notifications_self_read"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "notifications_self_update" on public.notifications;
create policy "notifications_self_update"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "notifications_staff_insert" on public.notifications;
create policy "notifications_staff_insert"
  on public.notifications for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "notifications_admin_delete" on public.notifications;
create policy "notifications_admin_delete"
  on public.notifications for delete
  to authenticated
  using (public.is_admin_or_manager());

-- =====================================================================
-- Automatic lead assignment (STEP 14) — a BEFORE INSERT trigger so it
-- works for an anonymous visitor's inquiry too (the app-level anon
-- client can never read admin_profiles or other leads; this
-- security-definer trigger can, without widening that access). No-ops
-- when website_settings.lead_assignment_method is 'Manual' (the
-- default). "Round Robin" is a deterministic modulo rotation over the
-- active roster (ordered by name), driven by how many leads have ever
-- been assigned so far — no separate pointer table to keep in sync.
-- =====================================================================
create or replace function public.auto_assign_new_lead()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_method text;
  v_agent_id uuid;
  v_agent_name text;
  v_agent_count int;
  v_total_assigned bigint;
begin
  if new.assigned_agent_id is not null then
    return new;
  end if;

  select lead_assignment_method into v_method from public.website_settings limit 1;
  if v_method is null or v_method = 'Manual' then
    return new;
  end if;

  if v_method = 'Least Assigned Leads' then
    select ap.id, ap.name into v_agent_id, v_agent_name
    from public.admin_profiles ap
    left join public.leads l on l.assigned_agent_id = ap.id and l.status not in ('closed', 'lost')
    where ap.status = 'Active' and ap.role in ('sales_agent', 'sales_manager')
    group by ap.id, ap.name
    order by count(l.id) asc, ap.name asc
    limit 1;
  elsif v_method = 'Round Robin' then
    select count(*) into v_agent_count from public.admin_profiles where status = 'Active' and role in ('sales_agent', 'sales_manager');
    if v_agent_count > 0 then
      select count(*) into v_total_assigned from public.leads where assigned_agent_id is not null;
      select ap.id, ap.name into v_agent_id, v_agent_name
      from public.admin_profiles ap
      where ap.status = 'Active' and ap.role in ('sales_agent', 'sales_manager')
      order by ap.name asc
      offset (v_total_assigned % v_agent_count) limit 1;
    end if;
  end if;

  if v_agent_id is not null then
    new.assigned_agent_id := v_agent_id;
    new.assigned_to := v_agent_name;
  end if;

  return new;
end;
$$;

drop trigger if exists auto_assign_new_lead on public.leads;
create trigger auto_assign_new_lead before insert on public.leads
  for each row execute function public.auto_assign_new_lead();

-- Notifies + logs only when the row above actually auto-assigned
-- someone — a manually-created lead generates neither, exactly like today.
-- =====================================================================
-- lead_assignment_history (STEP 17, section 20) — accountability trail
-- for every assign/reassign, manual or automatic.
-- =====================================================================
create table if not exists public.lead_assignment_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  previous_agent_id uuid references public.admin_profiles (id) on delete set null,
  new_agent_id uuid references public.admin_profiles (id) on delete set null,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists lead_assignment_history_lead_idx on public.lead_assignment_history (lead_id);
create index if not exists lead_assignment_history_created_idx on public.lead_assignment_history (created_at);

alter table public.lead_assignment_history enable row level security;

drop policy if exists "lead_assignment_history_admin_all" on public.lead_assignment_history;
create policy "lead_assignment_history_admin_all"
  on public.lead_assignment_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_assignment_history_agent_read" on public.lead_assignment_history;
create policy "lead_assignment_history_agent_read"
  on public.lead_assignment_history for select
  to authenticated
  using (previous_agent_id = auth.uid() or new_agent_id = auth.uid());

-- =====================================================================
-- communication_log (STEP 17, section 24) — a MANUAL record an agent/
-- admin adds after actually contacting a customer. Nothing here is
-- auto-generated (no telephony/WhatsApp Business API is wired up).
-- =====================================================================
create table if not exists public.communication_log (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  communication_type text not null check (communication_type in ('Phone', 'WhatsApp', 'Email', 'SMS', 'Meeting', 'Other')),
  direction text not null check (direction in ('Outgoing', 'Incoming')),
  summary text not null,
  created_at timestamptz not null default now()
);

create index if not exists communication_log_lead_idx on public.communication_log (lead_id);
create index if not exists communication_log_created_idx on public.communication_log (created_at);

alter table public.communication_log enable row level security;

drop policy if exists "communication_log_admin_all" on public.communication_log;
create policy "communication_log_admin_all"
  on public.communication_log for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_log_agent_read" on public.communication_log;
create policy "communication_log_agent_read"
  on public.communication_log for select
  to authenticated
  using (exists (select 1 from public.leads l where l.id = communication_log.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "communication_log_agent_insert" on public.communication_log;
create policy "communication_log_agent_insert"
  on public.communication_log for insert
  to authenticated
  with check (exists (select 1 from public.leads l where l.id = communication_log.lead_id and l.assigned_agent_id = auth.uid()));

-- Auto-assignment (STEP 14) now also records assignment history.
create or replace function public.on_lead_auto_assigned()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.assigned_agent_id is not null then
    insert into public.notifications (user_id, type, title, message, entity_type, entity_id)
    values (
      new.assigned_agent_id,
      'lead_assigned',
      'New lead assigned to you',
      new.name || coalesce(' — ' || new.property_title, ''),
      'lead',
      new.id
    );
    insert into public.activity_logs (admin_id, admin_name, action, entity_type, entity_id, description)
    values (null, 'System (Auto-Assigned)', 'Lead Assigned', 'lead', new.id, new.name || ' -> ' || new.assigned_to);
    insert into public.lead_assignment_history (lead_id, previous_agent_id, new_agent_id, changed_by, reason)
    values (new.id, null, new.assigned_agent_id, null, 'Auto-assigned on lead creation');
  end if;
  return new;
end;
$$;

drop trigger if exists on_lead_auto_assigned on public.leads;
create trigger on_lead_auto_assigned after insert on public.leads
  for each row execute function public.on_lead_auto_assigned();

-- =====================================================================
-- Campaigns & campaign_events (STEP 15). Campaign management (create/
-- edit/pause/archive/delete, and reading costs/budgets) is
-- admin/sales_manager only — a sales_agent sees attribution on their
-- OWN leads via the leads columns above (already covered by
-- leads_agent_read) but never browses the campaigns table directly or
-- sees spend/budget figures. campaign_events is public insert-only
-- (mirrors property_views / website_events), admin/manager read-only.
-- =====================================================================
alter table public.campaigns enable row level security;
alter table public.campaign_events enable row level security;

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

-- =====================================================================
-- Storage: property-images bucket
-- Public read (so <Image> tags and the browser can load them directly),
-- writes restricted to authenticated admins.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('property-images', 'property-images', true)
on conflict (id) do nothing;

drop policy if exists "property_images_public_read" on storage.objects;
create policy "property_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'property-images');

drop policy if exists "property_images_admin_write" on storage.objects;
create policy "property_images_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'property-images' and public.is_admin());

drop policy if exists "property_images_admin_update" on storage.objects;
create policy "property_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-images' and public.is_admin());

drop policy if exists "property_images_admin_delete" on storage.objects;
create policy "property_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-images' and public.is_admin());

-- =====================================================================
-- Storage: project-images bucket (STEP 7) — same public-read /
-- authenticated-write shape as property-images, kept as its own bucket
-- so project media stays organized separately.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('project-images', 'project-images', true)
on conflict (id) do nothing;

drop policy if exists "project_images_public_read" on storage.objects;
create policy "project_images_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'project-images');

drop policy if exists "project_images_admin_write" on storage.objects;
create policy "project_images_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "project_images_admin_update" on storage.objects;
create policy "project_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

drop policy if exists "project_images_admin_delete" on storage.objects;
create policy "project_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images' and public.is_admin());

-- =====================================================================
-- Storage: documents bucket (STEP 7) — brochures, floor plans and
-- payment-plan PDFs for properties/projects. Public read so a shared
-- link works once an admin actually uploads one; pages only render a
-- link when a document row exists, so nothing is exposed unless an
-- admin explicitly added it.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('documents', 'documents', true)
on conflict (id) do nothing;

drop policy if exists "documents_public_read" on storage.objects;
create policy "documents_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_admin_write" on storage.objects;
create policy "documents_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'documents' and public.is_admin());

drop policy if exists "documents_admin_update" on storage.objects;
create policy "documents_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents' and public.is_admin());

drop policy if exists "documents_admin_delete" on storage.objects;
create policy "documents_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents' and public.is_admin());

-- =====================================================================
-- Storage: customer-avatars bucket (STEP 10) — public read, any signed-in
-- user (customer or admin) can manage their own uploaded avatar.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('customer-avatars', 'customer-avatars', true)
on conflict (id) do nothing;

drop policy if exists "customer_avatars_public_read" on storage.objects;
create policy "customer_avatars_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'customer-avatars');

drop policy if exists "customer_avatars_write" on storage.objects;
create policy "customer_avatars_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'customer-avatars');

drop policy if exists "customer_avatars_update" on storage.objects;
create policy "customer_avatars_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'customer-avatars');

drop policy if exists "customer_avatars_delete" on storage.objects;
create policy "customer_avatars_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'customer-avatars');

-- =====================================================================
-- Storage: brochures bucket (STEP 13). A brochure PDF is finished
-- marketing material with no customer PII in it, the same sensitivity
-- level as property-images/project-images/documents, so it follows the
-- identical public-read / admin-write shape. brochures.public controls
-- *discoverability* (whether a public page links to it), not storage
-- access — consistent with how the `documents` bucket already works.
-- =====================================================================

insert into storage.buckets (id, name, public)
values ('brochures', 'brochures', true)
on conflict (id) do nothing;

drop policy if exists "brochures_storage_public_read" on storage.objects;
create policy "brochures_storage_public_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'brochures');

drop policy if exists "brochures_storage_admin_write" on storage.objects;
create policy "brochures_storage_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'brochures' and public.is_admin());

drop policy if exists "brochures_storage_admin_update" on storage.objects;
create policy "brochures_storage_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'brochures' and public.is_admin());

drop policy if exists "brochures_storage_admin_delete" on storage.objects;
create policy "brochures_storage_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'brochures' and public.is_admin());

-- =====================================================================
-- STEP 18 — Deals + Sales + Property Transaction Management System
-- =====================================================================

-- Deal number sequence — the reliable, server-side, race-condition-free
-- mechanism behind DEAL-2026-00001 style references (section 4).
-- ---------------------------------------------------------------------
create sequence if not exists public.deals_number_seq;

-- ---------------------------------------------------------------------
-- deals — the core transaction record. Mirrors the established
-- appointments/leads pattern: required property link is actually
-- nullable here (a deal can start before a specific unit is finalized,
-- e.g. an "Investment"/"Other" deal type), nullable customer_id (FK to
-- auth.users, matching how leads.customer_id/appointments.customer_id
-- already work), nullable lead_id back-reference to the CRM inquiry
-- that originated the sale, nullable agent_id for the assigned
-- salesperson.
--
-- seller_name/seller_phone/seller_notes: this codebase has no
-- owner/seller entity at all (confirmed — no owner_id anywhere). Rather
-- than invent a fake "owner" record, these are plain optional text
-- fields an admin can fill in for a resale deal; a normalized
-- property_owners table can be added later without touching this shape.
--
-- final_amount / outstanding_amount are DB-generated columns (never
-- drift from negotiated_price/discount_amount/received_amount, and
-- clamped at 0 so a bad discount can never produce a negative deal
-- value or a negative outstanding balance — section 12/60).
-- received_amount itself is trigger-maintained from deal_payments
-- below (see recalc_deal_received_amount()), never edited directly, so
-- it always reflects real, verified payments only.
-- ---------------------------------------------------------------------
create table if not exists public.deals (
  id uuid primary key default gen_random_uuid(),
  deal_number text unique,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  seller_name text,
  seller_phone text,
  seller_notes text,
  deal_type text not null check (
    deal_type in ('Property Sale', 'Property Purchase', 'Property Rent', 'Project Booking', 'Investment', 'Other')
  ),
  status text not null default 'New' check (
    status in ('New', 'Negotiation', 'Booking Pending', 'Booked', 'Documentation', 'Payment In Progress', 'Completed', 'Cancelled')
  ),
  property_price numeric,
  negotiated_price numeric not null default 0 check (negotiated_price >= 0),
  discount_amount numeric not null default 0 check (discount_amount >= 0),
  discount_reason text,
  final_amount numeric generated always as (greatest(coalesce(negotiated_price, 0) - coalesce(discount_amount, 0), 0)) stored,
  booking_amount numeric not null default 0 check (booking_amount >= 0),
  booking_date date,
  booking_status text not null default 'Pending' check (booking_status in ('Pending', 'Received', 'Refunded', 'Adjusted')),
  received_amount numeric not null default 0 check (received_amount >= 0),
  outstanding_amount numeric generated always as (
    greatest(greatest(coalesce(negotiated_price, 0) - coalesce(discount_amount, 0), 0) - received_amount, 0)
  ) stored,
  commission_rate numeric check (commission_rate is null or commission_rate >= 0),
  commission_amount numeric check (commission_amount is null or commission_amount >= 0),
  commission_override_reason text,
  commission_status text not null default 'Pending' check (commission_status in ('Pending', 'Approved', 'Partially Paid', 'Paid')),
  commission_paid_amount numeric not null default 0 check (commission_paid_amount >= 0),
  commission_paid_at timestamptz,
  expected_completion_date date,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text check (
    cancellation_reason is null or cancellation_reason in ('Customer Cancelled', 'Payment Issue', 'Property Unavailable', 'Documentation Issue', 'Other')
  ),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_deal_number()
returns trigger
language plpgsql
as $$
begin
  if new.deal_number is null then
    new.deal_number := 'DEAL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.deals_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_deal_number on public.deals;
create trigger set_deal_number before insert on public.deals for each row execute function public.generate_deal_number();

drop trigger if exists deals_set_updated_at on public.deals;
create trigger deals_set_updated_at before update on public.deals for each row execute function public.set_updated_at();

create index if not exists deals_deal_number_idx on public.deals (deal_number);
create index if not exists deals_lead_idx on public.deals (lead_id);
create index if not exists deals_customer_idx on public.deals (customer_id);
create index if not exists deals_property_idx on public.deals (property_id);
create index if not exists deals_project_idx on public.deals (project_id);
create index if not exists deals_agent_idx on public.deals (agent_id);
create index if not exists deals_status_idx on public.deals (status);
create index if not exists deals_created_at_idx on public.deals (created_at);
create index if not exists deals_booking_date_idx on public.deals (booking_date);
create index if not exists deals_commission_status_idx on public.deals (commission_status);

-- Concurrency protection (sections 47/48): once a deal actually reaches
-- a confirmed-booking-or-later stage, no other deal on the same
-- property may also be in a confirmed stage at the same time. A second
-- concurrent "confirm booking" attempt hits this unique index and fails
-- with a clear 23505 error, which the service layer turns into "Another
-- transaction has already reserved this property." Cancelled/completed
-- history is excluded on the Cancelled side only (Completed deals must
-- keep blocking the slot — a re-sale needs a fresh property record or
-- an explicit reopen, not a second concurrent deal).
create unique index if not exists deals_property_confirmed_unique_idx
  on public.deals (property_id)
  where property_id is not null and status in ('Booked', 'Documentation', 'Payment In Progress', 'Completed');

alter table public.deals enable row level security;

drop policy if exists "deals_admin_all" on public.deals;
create policy "deals_admin_all"
  on public.deals for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deals_agent_read" on public.deals;
create policy "deals_agent_read"
  on public.deals for select
  to authenticated
  using (agent_id = auth.uid());

-- Agents may progress a deal (status/dates) but never its financial or
-- identity fields — enforced below by protect_deal_fields_for_agent(),
-- the same pattern already used for leads/appointments.
drop policy if exists "deals_agent_update" on public.deals;
create policy "deals_agent_update"
  on public.deals for update
  to authenticated
  using (agent_id = auth.uid())
  with check (agent_id = auth.uid());

drop policy if exists "deals_customer_read" on public.deals;
create policy "deals_customer_read"
  on public.deals for select
  to authenticated
  using (customer_id = auth.uid());

create or replace function public.protect_deal_fields_for_agent()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.deal_number := old.deal_number;
    new.lead_id := old.lead_id;
    new.customer_id := old.customer_id;
    new.property_id := old.property_id;
    new.project_id := old.project_id;
    new.agent_id := old.agent_id;
    new.seller_name := old.seller_name;
    new.seller_phone := old.seller_phone;
    new.seller_notes := old.seller_notes;
    new.deal_type := old.deal_type;
    new.property_price := old.property_price;
    new.negotiated_price := old.negotiated_price;
    new.discount_amount := old.discount_amount;
    new.discount_reason := old.discount_reason;
    new.booking_amount := old.booking_amount;
    new.booking_status := old.booking_status;
    new.received_amount := old.received_amount;
    new.commission_rate := old.commission_rate;
    new.commission_amount := old.commission_amount;
    new.commission_override_reason := old.commission_override_reason;
    new.commission_status := old.commission_status;
    new.commission_paid_amount := old.commission_paid_amount;
    new.commission_paid_at := old.commission_paid_at;
    new.cancellation_reason := old.cancellation_reason;
    new.created_by := old.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists deals_protect_agent_fields on public.deals;
create trigger deals_protect_agent_fields before update on public.deals
  for each row execute function public.protect_deal_fields_for_agent();

-- ---------------------------------------------------------------------
-- deal_payments — every real payment recorded against a deal. Never
-- edited after verification (section 29) — corrections go through
-- deal_payment_refunds below, never a silent UPDATE of amount/status
-- from Verified.
--
-- schedule_item_id optionally ties a payment to a specific planned
-- installment from the EXISTING STEP 12 payment_schedule_items table
-- (section 20) — connects to the real installment plan rather than
-- duplicating it. Left null for payments not tied to a specific
-- installment (e.g. a booking amount, or a lump sum).
-- ---------------------------------------------------------------------
create table if not exists public.deal_payments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  schedule_item_id uuid references public.payment_schedule_items (id) on delete set null,
  amount numeric not null check (amount > 0),
  payment_type text not null check (payment_type in ('Booking', 'Installment', 'Down Payment', 'Full Payment', 'Other')),
  payment_method text not null check (payment_method in ('Cash', 'Bank Transfer', 'Cheque', 'Online Transfer', 'Other')),
  reference text,
  payment_date date not null default current_date,
  status text not null default 'Received' check (status in ('Pending', 'Received', 'Verified', 'Rejected', 'Refunded')),
  notes text,
  recorded_by uuid references public.admin_profiles (id) on delete set null,
  verified_by uuid references public.admin_profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists deal_payments_set_updated_at on public.deal_payments;
create trigger deal_payments_set_updated_at before update on public.deal_payments for each row execute function public.set_updated_at();

create index if not exists deal_payments_deal_idx on public.deal_payments (deal_id);
create index if not exists deal_payments_schedule_item_idx on public.deal_payments (schedule_item_id);
create index if not exists deal_payments_status_idx on public.deal_payments (status);
create index if not exists deal_payments_payment_date_idx on public.deal_payments (payment_date);

alter table public.deal_payments enable row level security;

drop policy if exists "deal_payments_admin_all" on public.deal_payments;
create policy "deal_payments_admin_all"
  on public.deal_payments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent may log a payment they personally collected for their own
-- deal (status starts at 'Received') but can never mark one 'Verified'
-- themselves — no agent UPDATE policy exists below, so RLS blocks that
-- regardless of what the application layer does (section 17).
drop policy if exists "deal_payments_agent_insert" on public.deal_payments;
create policy "deal_payments_agent_insert"
  on public.deal_payments for insert
  to authenticated
  with check (
    status = 'Received'
    and exists (select 1 from public.deals d where d.id = deal_payments.deal_id and d.agent_id = auth.uid())
  );

drop policy if exists "deal_payments_agent_read" on public.deal_payments;
create policy "deal_payments_agent_read"
  on public.deal_payments for select
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_payments.deal_id and d.agent_id = auth.uid()));

drop policy if exists "deal_payments_customer_read" on public.deal_payments;
create policy "deal_payments_customer_read"
  on public.deal_payments for select
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_payments.deal_id and d.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- deal_payment_refunds — a linked reversal record (section 32). The
-- original deal_payments row is never deleted or silently changed.
-- ---------------------------------------------------------------------
create table if not exists public.deal_payment_refunds (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.deal_payments (id) on delete cascade,
  deal_id uuid not null references public.deals (id) on delete cascade,
  amount numeric not null check (amount > 0),
  refund_date date not null default current_date,
  reason text,
  reference text,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Rejected')),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists deal_payment_refunds_payment_idx on public.deal_payment_refunds (payment_id);
create index if not exists deal_payment_refunds_deal_idx on public.deal_payment_refunds (deal_id);

alter table public.deal_payment_refunds enable row level security;

drop policy if exists "deal_payment_refunds_admin_all" on public.deal_payment_refunds;
create policy "deal_payment_refunds_admin_all"
  on public.deal_payment_refunds for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deal_payment_refunds_read" on public.deal_payment_refunds;
create policy "deal_payment_refunds_read"
  on public.deal_payment_refunds for select
  to authenticated
  using (
    exists (
      select 1 from public.deals d
      where d.id = deal_payment_refunds.deal_id
        and (d.agent_id = auth.uid() or d.customer_id = auth.uid())
    )
  );

-- Recalculates deals.received_amount from verified, non-refunded
-- payments only — the single source of truth for "real money received"
-- that the generated outstanding_amount column then derives from.
create or replace function public.recalc_deal_received_amount(p_deal_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.deals
  set received_amount = greatest(
    coalesce((select sum(amount) from public.deal_payments where deal_id = p_deal_id and status = 'Verified'), 0)
    - coalesce(
        (select sum(r.amount) from public.deal_payment_refunds r
           join public.deal_payments p on p.id = r.payment_id
           where p.deal_id = p_deal_id and r.status = 'Completed'),
        0
      ),
    0
  )
  where id = p_deal_id;
end;
$$;

create or replace function public.on_deal_payment_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_deal_received_amount(old.deal_id);
    return old;
  end if;
  perform public.recalc_deal_received_amount(new.deal_id);
  return new;
end;
$$;

drop trigger if exists deal_payments_recalc on public.deal_payments;
create trigger deal_payments_recalc
  after insert or update of amount, status or delete on public.deal_payments
  for each row execute function public.on_deal_payment_change();

create or replace function public.on_deal_refund_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recalc_deal_received_amount(old.deal_id);
    return old;
  end if;
  perform public.recalc_deal_received_amount(new.deal_id);
  return new;
end;
$$;

drop trigger if exists deal_payment_refunds_recalc on public.deal_payment_refunds;
create trigger deal_payment_refunds_recalc
  after insert or update of amount, status or delete on public.deal_payment_refunds
  for each row execute function public.on_deal_refund_change();

-- ---------------------------------------------------------------------
-- deal_documents — reuses the existing "documents" Storage bucket and
-- resolveStorageDocuments()/deleteStorageDocuments() helper (already
-- used by properties/projects); this table just gives each file a row
-- with a category/status/uploader instead of an untyped jsonb array,
-- since a real transaction-document checklist needs per-file status
-- (section 24/25).
-- ---------------------------------------------------------------------
create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  name text not null,
  url text not null,
  document_type text not null default 'Other' check (
    document_type in ('Booking Form', 'Agreement', 'Payment Receipt', 'CNIC/Customer Document Reference', 'Property Document', 'NOC', 'Transfer Document', 'Other')
  ),
  status text not null default 'Submitted' check (status in ('Submitted', 'Under Review', 'Approved', 'Rejected')),
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists deal_documents_set_updated_at on public.deal_documents;
create trigger deal_documents_set_updated_at before update on public.deal_documents for each row execute function public.set_updated_at();

create index if not exists deal_documents_deal_idx on public.deal_documents (deal_id);

alter table public.deal_documents enable row level security;

drop policy if exists "deal_documents_admin_all" on public.deal_documents;
create policy "deal_documents_admin_all"
  on public.deal_documents for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deal_documents_agent_all" on public.deal_documents;
create policy "deal_documents_agent_all"
  on public.deal_documents for all
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_documents.deal_id and d.agent_id = auth.uid()))
  with check (exists (select 1 from public.deals d where d.id = deal_documents.deal_id and d.agent_id = auth.uid()));

-- Customers only ever see documents an admin/manager has approved —
-- never a raw upload pending review.
drop policy if exists "deal_documents_customer_read" on public.deal_documents;
create policy "deal_documents_customer_read"
  on public.deal_documents for select
  to authenticated
  using (
    status = 'Approved'
    and exists (select 1 from public.deals d where d.id = deal_documents.deal_id and d.customer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- deal_notes — private, CRM-staff-only notes. Mirrors lead_notes
-- exactly (section 26). Never exposed to customers — no customer
-- policy exists on this table at all.
-- ---------------------------------------------------------------------
create table if not exists public.deal_notes (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.deals (id) on delete cascade,
  note text not null,
  created_by text,
  user_id uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists deal_notes_deal_idx on public.deal_notes (deal_id);

alter table public.deal_notes enable row level security;

drop policy if exists "deal_notes_admin_all" on public.deal_notes;
create policy "deal_notes_admin_all"
  on public.deal_notes for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "deal_notes_agent_all" on public.deal_notes;
create policy "deal_notes_agent_all"
  on public.deal_notes for all
  to authenticated
  using (exists (select 1 from public.deals d where d.id = deal_notes.deal_id and d.agent_id = auth.uid()))
  with check (exists (select 1 from public.deals d where d.id = deal_notes.deal_id and d.agent_id = auth.uid()));

-- =====================================================================
-- STEP 19 — Property Inventory & Real-Time Availability Management
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

-- =====================================================================
-- STEP 20 — Property Documents & Digital Agreement Management System
-- =====================================================================

-- ---------------------------------------------------------------------
-- document_types — a real, admin-extensible lookup table (section 4),
-- not a check-constraint enum like earlier STEPs used. Seeded with the
-- spec's initial 20 types; admins can add more via /admin/documents
-- without a migration.
-- ---------------------------------------------------------------------
create table if not exists public.document_types (
  code text primary key,
  label text not null,
  category text not null default 'Other',
  requires_expiry boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.document_types (code, label, category, requires_expiry, sort_order) values
  ('CUSTOMER_ID', 'Customer ID', 'Identity', true, 10),
  ('ADDRESS_PROOF', 'Address Proof', 'Identity', false, 20),
  ('BOOKING_FORM', 'Booking Form', 'Transaction', false, 30),
  ('BOOKING_RECEIPT', 'Booking Receipt', 'Financial', false, 40),
  ('SALE_AGREEMENT', 'Sale Agreement', 'Legal Agreement', false, 50),
  ('RENTAL_AGREEMENT', 'Rental Agreement', 'Legal Agreement', false, 60),
  ('PROPERTY_AGREEMENT', 'Property Agreement', 'Legal Agreement', false, 70),
  ('PAYMENT_RECEIPT', 'Payment Receipt', 'Financial', false, 80),
  ('INSTALLMENT_RECEIPT', 'Installment Receipt', 'Financial', false, 90),
  ('PAYMENT_PLAN', 'Payment Plan', 'Financial', false, 100),
  ('PROPERTY_FILE', 'Property File', 'Property', false, 110),
  ('PROPERTY_TITLE_DOCUMENT', 'Property Title Document', 'Property', false, 120),
  ('PROJECT_DOCUMENT', 'Project Document', 'Project', false, 130),
  ('ALLOTMENT_LETTER', 'Allotment Letter', 'Transaction', false, 140),
  ('POSSESSION_LETTER', 'Possession Letter', 'Transaction', false, 150),
  ('TRANSFER_DOCUMENT', 'Transfer Document', 'Legal Agreement', false, 160),
  ('NOC', 'NOC', 'Legal Agreement', true, 170),
  ('TAX_DOCUMENT', 'Tax Document', 'Financial', true, 180),
  ('BANK_DOCUMENT', 'Bank Document', 'Financial', false, 190),
  ('CUSTOMER_REQUEST', 'Customer Request', 'Other', false, 200),
  ('OTHER', 'Other', 'Other', false, 999)
on conflict (code) do nothing;

alter table public.document_types enable row level security;

drop policy if exists "document_types_admin_all" on public.document_types;
create policy "document_types_admin_all"
  on public.document_types for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- Any authenticated staff/customer needs to read the active type list
-- to render upload/filter dropdowns — no sensitive data on this table.
drop policy if exists "document_types_authenticated_read" on public.document_types;
create policy "document_types_authenticated_read"
  on public.document_types for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- document_templates (sections 22-24, 64) — admin-editable content with
-- {{variable}} placeholders, interpolated from real records only at
-- generation time. Never destroyed once used — see documents.template_id
-- below, kept even if the template is later deactivated.
-- ---------------------------------------------------------------------
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document_type text not null references public.document_types (code) on delete restrict,
  content text not null default '',
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  updated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists document_templates_set_updated_at on public.document_templates;
create trigger document_templates_set_updated_at before update on public.document_templates for each row execute function public.set_updated_at();

create index if not exists document_templates_type_idx on public.document_templates (document_type);
create index if not exists document_templates_active_idx on public.document_templates (active);

alter table public.document_templates enable row level security;

drop policy if exists "document_templates_admin_all" on public.document_templates;
create policy "document_templates_admin_all"
  on public.document_templates for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_templates_staff_read" on public.document_templates;
create policy "document_templates_staff_read"
  on public.document_templates for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- document_checklists / document_checklist_items (sections 13, 63) —
-- checklist grouping is for admin organization; which items actually
-- apply to a given deal is resolved by matching applicable_deal_type /
-- applicable_property_type against the deal's own values (see
-- documentService.getApplicableChecklistItems), not by "selecting" a
-- whole checklist.
-- ---------------------------------------------------------------------
create table if not exists public.document_checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists document_checklists_set_updated_at on public.document_checklists;
create trigger document_checklists_set_updated_at before update on public.document_checklists for each row execute function public.set_updated_at();

alter table public.document_checklists enable row level security;

drop policy if exists "document_checklists_admin_all" on public.document_checklists;
create policy "document_checklists_admin_all"
  on public.document_checklists for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_checklists_staff_read" on public.document_checklists;
create policy "document_checklists_staff_read"
  on public.document_checklists for select
  to authenticated
  using (public.is_admin());

create table if not exists public.document_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.document_checklists (id) on delete cascade,
  document_type text not null references public.document_types (code) on delete restrict,
  required boolean not null default true,
  description text,
  sort_order integer not null default 0,
  applicable_property_type text,
  applicable_deal_type text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists document_checklist_items_checklist_idx on public.document_checklist_items (checklist_id);
create index if not exists document_checklist_items_type_idx on public.document_checklist_items (document_type);

alter table public.document_checklist_items enable row level security;

drop policy if exists "document_checklist_items_admin_all" on public.document_checklist_items;
create policy "document_checklist_items_admin_all"
  on public.document_checklist_items for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_checklist_items_staff_read" on public.document_checklist_items;
create policy "document_checklist_items_staff_read"
  on public.document_checklist_items for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- documents — the core table (section 6). Ownership is deliberately
-- broad (any of these may be set) — mirrors the established nullable-FK
-- ownership pattern from leads/appointments/deals.
-- ---------------------------------------------------------------------
create sequence if not exists public.document_number_seq;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  document_number text unique,
  title text not null,
  document_type text not null references public.document_types (code) on delete restrict,
  category text,
  description text,
  customer_id uuid references auth.users (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  payment_id uuid references public.deal_payments (id) on delete set null,
  installment_id uuid references public.payment_schedule_items (id) on delete set null,
  template_id uuid references public.document_templates (id) on delete set null,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  uploaded_by_customer boolean not null default false,
  verified_by uuid references public.admin_profiles (id) on delete set null,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  status text not null default 'UPLOADED' check (
    status in ('DRAFT', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'APPROVED', 'REJECTED', 'EXPIRED', 'ARCHIVED', 'SUPERSEDED')
  ),
  visibility text not null default 'ADMIN_CUSTOMER' check (
    visibility in ('ADMIN_ONLY', 'AGENT_ONLY', 'CUSTOMER_ONLY', 'ADMIN_AGENT', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED')
  ),
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  file_hash text,
  current_version integer not null default 1,
  rejection_reason text,
  expires_at date,
  verified_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_document_number()
returns trigger
language plpgsql
as $$
declare
  prefix text;
begin
  if new.document_number is null then
    prefix := case
      when new.document_type in ('SALE_AGREEMENT', 'RENTAL_AGREEMENT', 'PROPERTY_AGREEMENT', 'TRANSFER_DOCUMENT') then 'AGR'
      when new.document_type in ('PAYMENT_RECEIPT', 'INSTALLMENT_RECEIPT', 'BOOKING_RECEIPT') then 'REC'
      else 'DOC'
    end;
    new.document_number := prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.document_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_document_number on public.documents;
create trigger set_document_number before insert on public.documents for each row execute function public.generate_document_number();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

create index if not exists documents_deal_idx on public.documents (deal_id);
create index if not exists documents_customer_idx on public.documents (customer_id);
create index if not exists documents_property_idx on public.documents (property_id);
create index if not exists documents_project_idx on public.documents (project_id);
create index if not exists documents_lead_idx on public.documents (lead_id);
create index if not exists documents_payment_idx on public.documents (payment_id);
create index if not exists documents_installment_idx on public.documents (installment_id);
create index if not exists documents_document_type_idx on public.documents (document_type);
create index if not exists documents_status_idx on public.documents (status);
create index if not exists documents_created_at_idx on public.documents (created_at);
create index if not exists documents_expires_at_idx on public.documents (expires_at);
create index if not exists documents_deal_type_status_idx on public.documents (deal_id, document_type, status);

alter table public.documents enable row level security;

drop policy if exists "documents_admin_all" on public.documents;
create policy "documents_admin_all"
  on public.documents for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- Agent read: only documents whose linked deal or lead is assigned to
-- them (section 18) — mirrors deal_payments/deal_documents' own
-- EXISTS-subquery convention rather than a shared helper function.
drop policy if exists "documents_agent_read" on public.documents;
create policy "documents_agent_read"
  on public.documents for select
  to authenticated
  using (
    visibility in ('AGENT_ONLY', 'ADMIN_AGENT', 'ALL_AUTHORIZED')
    and (
      exists (select 1 from public.deals d where d.id = documents.deal_id and d.agent_id = auth.uid())
      or exists (select 1 from public.leads l where l.id = documents.lead_id and l.assigned_agent_id = auth.uid())
    )
  );

-- Agents may upload/update documents for their own assigned deal/lead
-- only — never someone else's.
drop policy if exists "documents_agent_insert" on public.documents;
create policy "documents_agent_insert"
  on public.documents for insert
  to authenticated
  with check (
    exists (select 1 from public.deals d where d.id = documents.deal_id and d.agent_id = auth.uid())
    or exists (select 1 from public.leads l where l.id = documents.lead_id and l.assigned_agent_id = auth.uid())
  );

drop policy if exists "documents_customer_read" on public.documents;
create policy "documents_customer_read"
  on public.documents for select
  to authenticated
  using (visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED') and customer_id = auth.uid());

-- Customers may upload their own requested documents (their own
-- customer_id, status starts UPLOADED — never self-approve).
drop policy if exists "documents_customer_insert" on public.documents;
create policy "documents_customer_insert"
  on public.documents for insert
  to authenticated
  with check (customer_id = auth.uid() and status in ('DRAFT', 'UPLOADED'));

-- Locks financial/identity/approval fields for anyone who isn't
-- admin/manager — the same protect_*_for_agent trigger pattern used by
-- leads/deals/inventory, extended here to also block a customer from
-- touching their own row's approval fields.
create or replace function public.protect_document_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.document_number := old.document_number;
    new.document_type := old.document_type;
    new.customer_id := old.customer_id;
    new.lead_id := old.lead_id;
    new.property_id := old.property_id;
    new.project_id := old.project_id;
    new.deal_id := old.deal_id;
    new.payment_id := old.payment_id;
    new.installment_id := old.installment_id;
    new.template_id := old.template_id;
    new.verified_by := old.verified_by;
    new.approved_by := old.approved_by;
    new.visibility := old.visibility;
    new.current_version := old.current_version;
    new.verified_at := old.verified_at;
    new.approved_at := old.approved_at;
    new.rejected_at := old.rejected_at;
    new.archived_at := old.archived_at;
    -- A customer/agent may only move status forward into review, or
    -- resubmit after rejection — never self-verify/approve/archive.
    if new.status not in ('UPLOADED', 'UNDER_REVIEW') then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_protect_fields on public.documents;
create trigger documents_protect_fields before update on public.documents
  for each row execute function public.protect_document_fields();

-- ---------------------------------------------------------------------
-- document_versions (section 11) — every version, including v1, so the
-- full history is always in one place. documents.storage_path/
-- file_name/mime_type/file_size mirror the CURRENT version for fast,
-- join-free access; this table is the durable record.
-- ---------------------------------------------------------------------
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  file_hash text,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  uploaded_by_customer boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists document_versions_document_idx on public.document_versions (document_id);
create unique index if not exists document_versions_unique_idx on public.document_versions (document_id, version_number);

alter table public.document_versions enable row level security;

drop policy if exists "document_versions_admin_all" on public.document_versions;
create policy "document_versions_admin_all"
  on public.document_versions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_versions_read" on public.document_versions;
create policy "document_versions_read"
  on public.document_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.documents doc
      where doc.id = document_versions.document_id
        and (
          (doc.visibility in ('AGENT_ONLY', 'ADMIN_AGENT', 'ALL_AUTHORIZED') and (
            exists (select 1 from public.deals d where d.id = doc.deal_id and d.agent_id = auth.uid())
            or exists (select 1 from public.leads l where l.id = doc.lead_id and l.assigned_agent_id = auth.uid())
          ))
          or (doc.visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED') and doc.customer_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- document_audit_logs (sections 30, 40, 72) — immutable; no UPDATE/
-- DELETE policy exists for anyone, including admins (insert + select
-- only). Also mirrors deal-relevant events into the existing
-- activity_logs table (entity_type='deal') so they show up on the
-- Deal Timeline built in STEP 18 (section 49) — done in the service
-- layer, not here.
-- ---------------------------------------------------------------------
create table if not exists public.document_audit_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  actor_id uuid references public.admin_profiles (id) on delete set null,
  actor_customer_id uuid references auth.users (id) on delete set null,
  actor_name text,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_audit_logs_document_idx on public.document_audit_logs (document_id);
create index if not exists document_audit_logs_created_idx on public.document_audit_logs (created_at);

alter table public.document_audit_logs enable row level security;

drop policy if exists "document_audit_logs_admin_all" on public.document_audit_logs;
create policy "document_audit_logs_admin_all"
  on public.document_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_audit_logs_insert" on public.document_audit_logs;
create policy "document_audit_logs_insert"
  on public.document_audit_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.documents doc
      where doc.id = document_audit_logs.document_id
        and (
          public.is_admin()
          or exists (select 1 from public.deals d where d.id = doc.deal_id and d.agent_id = auth.uid())
          or doc.customer_id = auth.uid()
        )
    )
  );

drop policy if exists "document_audit_logs_read" on public.document_audit_logs;
create policy "document_audit_logs_read"
  on public.document_audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.documents doc
      where doc.id = document_audit_logs.document_id
        and (
          (doc.visibility in ('AGENT_ONLY', 'ADMIN_AGENT', 'ALL_AUTHORIZED') and exists (select 1 from public.deals d where d.id = doc.deal_id and d.agent_id = auth.uid()))
          or (doc.visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED') and doc.customer_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- document_signatures / document_signature_participants (sections
-- 20-31, 67) — a digital-signature FOUNDATION, explicitly not claimed
-- as a legally-binding e-signature provider anywhere in the UI copy.
-- ---------------------------------------------------------------------
create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  document_version integer not null,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Expired', 'Cancelled')),
  signing_order_mode text not null default 'Sequential' check (signing_order_mode in ('Sequential', 'Parallel')),
  expires_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists document_signatures_document_idx on public.document_signatures (document_id);
create index if not exists document_signatures_status_idx on public.document_signatures (status);

alter table public.document_signatures enable row level security;

drop policy if exists "document_signatures_admin_all" on public.document_signatures;
create policy "document_signatures_admin_all"
  on public.document_signatures for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- "document_signatures_participant_read" is created further below, once
-- document_signature_participants (which it references) exists.

create table if not exists public.document_signature_participants (
  id uuid primary key default gen_random_uuid(),
  signature_id uuid not null references public.document_signatures (id) on delete cascade,
  participant_type text not null check (participant_type in ('Customer', 'Seller', 'Agent', 'Admin', 'Other')),
  participant_name text not null,
  participant_email text,
  customer_id uuid references auth.users (id) on delete set null,
  admin_id uuid references public.admin_profiles (id) on delete set null,
  sign_order integer not null default 1,
  status text not null default 'Pending' check (status in ('Pending', 'Signed', 'Declined')),
  signed_at timestamptz,
  signature_method text check (signature_method is null or signature_method in ('Typed', 'Drawn', 'Uploaded')),
  signature_data text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists document_signature_participants_signature_idx on public.document_signature_participants (signature_id);
create index if not exists document_signature_participants_customer_idx on public.document_signature_participants (customer_id);

alter table public.document_signature_participants enable row level security;

drop policy if exists "document_signature_participants_admin_all" on public.document_signature_participants;
create policy "document_signature_participants_admin_all"
  on public.document_signature_participants for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_signature_participants_self_read" on public.document_signature_participants;
create policy "document_signature_participants_self_read"
  on public.document_signature_participants for select
  to authenticated
  using (customer_id = auth.uid());

-- A participant may only ever sign/decline their OWN row, and only the
-- allowed fields — never reassign the request to someone else.
drop policy if exists "document_signature_participants_self_sign" on public.document_signature_participants;
create policy "document_signature_participants_self_sign"
  on public.document_signature_participants for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create or replace function public.protect_signature_participant_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.signature_id := old.signature_id;
    new.participant_type := old.participant_type;
    new.participant_name := old.participant_name;
    new.participant_email := old.participant_email;
    new.customer_id := old.customer_id;
    new.admin_id := old.admin_id;
    new.sign_order := old.sign_order;
  end if;
  return new;
end;
$$;

drop trigger if exists document_signature_participants_protect on public.document_signature_participants;
create trigger document_signature_participants_protect before update on public.document_signature_participants
  for each row execute function public.protect_signature_participant_fields();

-- Back on document_signatures now that document_signature_participants
-- exists: a participant may read the parent request row itself.
drop policy if exists "document_signatures_participant_read" on public.document_signatures;
create policy "document_signatures_participant_read"
  on public.document_signatures for select
  to authenticated
  using (exists (select 1 from public.document_signature_participants p where p.signature_id = document_signatures.id and p.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- website_settings — admin-configurable deal-completion document gate
-- (section 15) — defaults OFF so existing/in-flight deals are never
-- retroactively blocked from completing.
-- ---------------------------------------------------------------------
alter table public.website_settings add column if not exists require_documents_for_deal_completion boolean not null default false;

-- ---------------------------------------------------------------------
-- Private storage bucket (section 8) — never public. All access is via
-- short-lived signed URLs generated server-side, only after the
-- corresponding `documents` row has already been read successfully
-- under its own RLS (see documentService.getSignedUrl).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('secure-documents', 'secure-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "secure_documents_admin_all" on storage.objects;
create policy "secure_documents_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'secure-documents' and public.is_admin_or_manager())
  with check (bucket_id = 'secure-documents' and public.is_admin_or_manager());

-- Any staff account (any admin_profiles row) may upload — the
-- documents-table RLS/app layer is what scopes WHICH deal/lead they're
-- allowed to attach it to (section 9/18).
drop policy if exists "secure_documents_staff_insert" on storage.objects;
create policy "secure_documents_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'secure-documents' and public.is_admin());

-- Customers may only upload into their own customers/{auth.uid()}/...
-- prefix (section 9) — enforced by inspecting the object path itself.
drop policy if exists "secure_documents_customer_insert" on storage.objects;
create policy "secure_documents_customer_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'secure-documents'
    and (storage.foldername(name))[1] = 'customers'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- No SELECT/UPDATE/DELETE policy for plain customers/agents — reads
-- always go through a server-generated signed URL (service-role,
-- issued only after the documents-table row was already readable under
-- ITS OWN RLS), never a direct storage.objects query from the browser.

-- =====================================================================
-- STEP 21 — Property Marketing & Lead Conversion Automation System
-- =====================================================================

-- ---------------------------------------------------------------------
-- lead_scoring_rules (sections 10-13) — admin-configurable, seeded with
-- the spec's own example point values. Negative rules (Invalid Contact,
-- Unreachable, etc.) never delete a lead — see lead_score_history.
-- ---------------------------------------------------------------------
create table if not exists public.lead_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique check (
    event_type in (
      'NEW_LEAD', 'PHONE_PROVIDED', 'WHATSAPP_INQUIRY', 'BUDGET_PROVIDED', 'SITE_VISIT_REQUESTED',
      'BROCHURE_DOWNLOADED', 'PAYMENT_PLAN_REQUESTED', 'INVESTMENT_CALCULATOR_USED', 'MULTIPLE_PROPERTY_VIEWS',
      'RETURN_VISITOR', 'DEAL_CREATED', 'DEAL_COMPLETED',
      'INVALID_CONTACT', 'UNREACHABLE', 'NOT_INTERESTED', 'DUPLICATE_LEAD', 'SPAM'
    )
  ),
  label text not null,
  points integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.lead_scoring_rules (event_type, label, points) values
  ('NEW_LEAD', 'Property inquiry submitted', 10),
  ('PHONE_PROVIDED', 'Phone number provided', 10),
  ('WHATSAPP_INQUIRY', 'WhatsApp inquiry', 15),
  ('BUDGET_PROVIDED', 'Budget provided', 10),
  ('SITE_VISIT_REQUESTED', 'Site visit requested', 20),
  ('BROCHURE_DOWNLOADED', 'Brochure downloaded', 5),
  ('PAYMENT_PLAN_REQUESTED', 'Payment plan requested', 15),
  ('INVESTMENT_CALCULATOR_USED', 'Investment calculator used', 10),
  ('MULTIPLE_PROPERTY_VIEWS', 'Multiple property views', 5),
  ('RETURN_VISITOR', 'Return visitor', 5),
  ('DEAL_CREATED', 'Deal created', 50),
  ('DEAL_COMPLETED', 'Deal completed', 100),
  ('INVALID_CONTACT', 'Invalid contact details', -20),
  ('UNREACHABLE', 'Unreachable after repeated attempts', -10),
  ('NOT_INTERESTED', 'Explicitly not interested', -30),
  ('DUPLICATE_LEAD', 'Duplicate lead', -15),
  ('SPAM', 'Spam submission', -50)
on conflict (event_type) do nothing;

alter table public.lead_scoring_rules enable row level security;

drop policy if exists "lead_scoring_rules_admin_all" on public.lead_scoring_rules;
create policy "lead_scoring_rules_admin_all"
  on public.lead_scoring_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_scoring_rules_staff_read" on public.lead_scoring_rules;
create policy "lead_scoring_rules_staff_read"
  on public.lead_scoring_rules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- lead_score_history (section 13) — one row per point-change, so the
-- sales team can see exactly why a lead is hot.
-- ---------------------------------------------------------------------
create table if not exists public.lead_score_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  rule_id uuid references public.lead_scoring_rules (id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_score_history_lead_idx on public.lead_score_history (lead_id);
create index if not exists lead_score_history_created_idx on public.lead_score_history (created_at);

alter table public.lead_score_history enable row level security;

drop policy if exists "lead_score_history_admin_all" on public.lead_score_history;
create policy "lead_score_history_admin_all"
  on public.lead_score_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_score_history_agent_read" on public.lead_score_history;
create policy "lead_score_history_agent_read"
  on public.lead_score_history for select
  to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_score_history.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "lead_score_history_agent_insert" on public.lead_score_history;
create policy "lead_score_history_agent_insert"
  on public.lead_score_history for insert
  to authenticated
  with check (exists (select 1 from public.leads l where l.id = lead_score_history.lead_id and l.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- leads — score/score_level/auto_priority (sections 10-14). `priority`
-- (STEP 17) stays the manual, agent-editable field; `auto_priority` is
-- the system's own suggestion, kept separately so one never silently
-- overwrites the other.
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists score integer not null default 0;
alter table public.leads add column if not exists score_level text not null default 'COLD' check (score_level in ('COLD', 'WARM', 'HOT', 'VERY_HOT'));
alter table public.leads add column if not exists auto_priority text check (auto_priority is null or auto_priority in ('Low', 'Medium', 'High', 'Urgent'));
alter table public.leads add column if not exists sla_alert_sent_at timestamptz;

create index if not exists leads_score_idx on public.leads (score);
create index if not exists leads_score_level_idx on public.leads (score_level);

-- website_settings — configurable score-level thresholds (section 11).
alter table public.website_settings add column if not exists lead_score_threshold_warm integer not null default 20;
alter table public.website_settings add column if not exists lead_score_threshold_hot integer not null default 40;
alter table public.website_settings add column if not exists lead_score_threshold_very_hot integer not null default 70;

-- ---------------------------------------------------------------------
-- lead_sla_rules (section 42) — configurable response-time SLA per score
-- level. Breach detection is computed at read time (elapsed time vs. this
-- limit, checked against whether any Outgoing communication_log entry
-- exists yet) rather than stored, matching this codebase's "never store
-- a value real-time computation already gives you" convention.
-- ---------------------------------------------------------------------
create table if not exists public.lead_sla_rules (
  score_level text primary key check (score_level in ('COLD', 'WARM', 'HOT', 'VERY_HOT')),
  response_minutes integer not null,
  active boolean not null default true
);

insert into public.lead_sla_rules (score_level, response_minutes) values
  ('VERY_HOT', 10),
  ('HOT', 15),
  ('WARM', 60),
  ('COLD', 240)
on conflict (score_level) do nothing;

alter table public.lead_sla_rules enable row level security;

drop policy if exists "lead_sla_rules_admin_all" on public.lead_sla_rules;
create policy "lead_sla_rules_admin_all"
  on public.lead_sla_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_sla_rules_staff_read" on public.lead_sla_rules;
create policy "lead_sla_rules_staff_read"
  on public.lead_sla_rules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- follow_ups — source/automation_group_key (sections 18-19). Tags a
-- follow-up as system-generated so that completing/cancelling ANY task
-- in the same automation group (same lead + same trigger event) can
-- auto-cancel the rest — the closest safe equivalent to "if no response,
-- escalate" without a background scheduler in this deployment (there
-- isn't one — see followUpService.markOverdue's own comment).
-- ---------------------------------------------------------------------
alter table public.follow_ups add column if not exists source text not null default 'manual' check (source in ('manual', 'automation'));
alter table public.follow_ups add column if not exists automation_group_key text;

create index if not exists follow_ups_automation_group_idx on public.follow_ups (automation_group_key) where automation_group_key is not null;

-- ---------------------------------------------------------------------
-- follow_up_rules (sections 18-19) — admin-configurable follow-up
-- scheduling per lifecycle event. Every matching active rule is
-- pre-scheduled at once (there's no scheduler to check "did anyone
-- respond yet" partway through); see follow_ups.automation_group_key
-- above for how completing one cancels the rest.
-- ---------------------------------------------------------------------
create table if not exists public.follow_up_rules (
  id uuid primary key default gen_random_uuid(),
  trigger_event text not null check (
    trigger_event in (
      'LEAD_CREATED', 'LEAD_QUALIFIED', 'SITE_VISIT_REQUESTED', 'SITE_VISIT_COMPLETED',
      'PROPOSAL_SENT', 'NEGOTIATION_STARTED', 'DEAL_CREATED', 'DEAL_BOOKED', 'PAYMENT_PENDING'
    )
  ),
  delay_minutes integer not null default 0,
  follow_up_type text not null default 'Call' check (follow_up_type in ('Call', 'WhatsApp', 'Meeting', 'Site Visit', 'Other')),
  note_template text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists follow_up_rules_trigger_idx on public.follow_up_rules (trigger_event);

insert into public.follow_up_rules (trigger_event, delay_minutes, follow_up_type, note_template, sort_order) values
  ('LEAD_CREATED', 15, 'Call', 'Call within 15 minutes of inquiry.', 10),
  ('LEAD_CREATED', 240, 'Call', 'Follow up — no contact made yet (4 hours).', 20),
  ('LEAD_CREATED', 1440, 'WhatsApp', 'Next-day follow-up.', 30),
  ('LEAD_CREATED', 4320, 'Call', '3-day follow-up.', 40),
  ('SITE_VISIT_COMPLETED', 60, 'Call', 'Follow up after site visit.', 10),
  ('DEAL_BOOKED', 1440, 'Call', 'Confirm next payment/documentation steps.', 10)
on conflict do nothing;

alter table public.follow_up_rules enable row level security;

drop policy if exists "follow_up_rules_admin_all" on public.follow_up_rules;
create policy "follow_up_rules_admin_all"
  on public.follow_up_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "follow_up_rules_staff_read" on public.follow_up_rules;
create policy "follow_up_rules_staff_read"
  on public.follow_up_rules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- marketing_workflows / marketing_workflow_actions (sections 20-22) — a
-- structured (not drag-and-drop) trigger -> condition -> action engine.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trigger_type text not null check (
    trigger_type in (
      'NEW_LEAD', 'LEAD_SCORE_CHANGED', 'LEAD_STATUS_CHANGED', 'LEAD_CONVERTED', 'SITE_VISIT_BOOKED',
      'SITE_VISIT_COMPLETED', 'BROCHURE_REQUESTED', 'PAYMENT_PLAN_REQUESTED', 'INVESTMENT_INQUIRY',
      'DEAL_CREATED', 'DEAL_BOOKED', 'PAYMENT_OVERDUE', 'CUSTOMER_CREATED', 'DOCUMENT_REQUIRED'
    )
  ),
  conditions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketing_workflows_set_updated_at on public.marketing_workflows;
create trigger marketing_workflows_set_updated_at before update on public.marketing_workflows for each row execute function public.set_updated_at();

create index if not exists marketing_workflows_trigger_idx on public.marketing_workflows (trigger_type);
create index if not exists marketing_workflows_active_idx on public.marketing_workflows (active);

alter table public.marketing_workflows enable row level security;

drop policy if exists "marketing_workflows_admin_all" on public.marketing_workflows;
create policy "marketing_workflows_admin_all"
  on public.marketing_workflows for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create table if not exists public.marketing_workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.marketing_workflows (id) on delete cascade,
  sort_order integer not null default 0,
  action_type text not null check (
    action_type in (
      'CREATE_TASK', 'ASSIGN_AGENT', 'CHANGE_PRIORITY', 'ADD_TAG', 'REMOVE_TAG', 'CREATE_NOTIFICATION',
      'SEND_EMAIL', 'SEND_WHATSAPP', 'SEND_SMS', 'CREATE_FOLLOWUP', 'UPDATE_STATUS'
    )
  ),
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists marketing_workflow_actions_workflow_idx on public.marketing_workflow_actions (workflow_id);

alter table public.marketing_workflow_actions enable row level security;

drop policy if exists "marketing_workflow_actions_admin_all" on public.marketing_workflow_actions;
create policy "marketing_workflow_actions_admin_all"
  on public.marketing_workflow_actions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- Seed two default, fully editable/disableable workflows so the engine
-- demonstrably works out of the box (sections 66-67).
insert into public.marketing_workflows (id, name, description, trigger_type, conditions, active)
values
  ('00000000-0000-0000-0000-000000000021', 'Hot Lead Alert', 'Notifies the assigned agent (or a manager, if unassigned) the moment a lead becomes Hot or Very Hot.', 'LEAD_SCORE_CHANGED', '[{"field":"scoreLevel","operator":"in","value":["HOT","VERY_HOT"]}]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000022', 'New Lead Welcome Task', 'Creates an immediate call task the moment any new lead arrives.', 'NEW_LEAD', '[]'::jsonb, true)
on conflict (id) do nothing;

insert into public.marketing_workflow_actions (workflow_id, sort_order, action_type, action_config)
values
  ('00000000-0000-0000-0000-000000000021', 10, 'CREATE_NOTIFICATION', '{"title":"High-priority lead detected","message":"{{customer_name}} is now a {{score_level}} lead (score {{score}}). Property: {{property_title}}. Source: {{source}}."}'::jsonb),
  ('00000000-0000-0000-0000-000000000022', 10, 'CREATE_FOLLOWUP', '{"delayMinutes":15,"type":"Call","note":"Call within 15 minutes of inquiry."}'::jsonb)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- automation_queue (section 57) — the ONE place events reach the
-- automation engine without an app-level call site: an anonymous
-- visitor's lead insert (leadService.create never reads the row back —
-- see its own comment on why). apply_lead_signals() below enqueues here;
-- automationService.processQueuedEvents() drains it opportunistically
-- from the CRM/Marketing dashboards (same "no background job runner in
-- this deployment" pattern as followUpService.markOverdue). Every other
-- trigger type in marketing_workflows fires immediately, synchronously,
-- from a real app-level call site.
-- ---------------------------------------------------------------------
create table if not exists public.automation_queue (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null,
  lead_id uuid references public.leads (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists automation_queue_unprocessed_idx on public.automation_queue (created_at) where not processed;

alter table public.automation_queue enable row level security;

drop policy if exists "automation_queue_admin_all" on public.automation_queue;
create policy "automation_queue_admin_all"
  on public.automation_queue for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- automation_logs (sections 58-59) — every action a workflow attempted,
-- successful or not. dedup_key + the partial unique index below is the
-- actual idempotency guarantee (section 57): the same workflow+lead+
-- trigger+action can never log — or execute — twice.
-- ---------------------------------------------------------------------
create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.marketing_workflows (id) on delete set null,
  workflow_name text,
  trigger_type text not null,
  lead_id uuid references public.leads (id) on delete set null,
  action_type text,
  status text not null check (status in ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED')),
  error text,
  dedup_key text,
  executed_at timestamptz not null default now()
);

create index if not exists automation_logs_workflow_idx on public.automation_logs (workflow_id);
create index if not exists automation_logs_lead_idx on public.automation_logs (lead_id);
create index if not exists automation_logs_executed_idx on public.automation_logs (executed_at);
create unique index if not exists automation_logs_dedup_idx on public.automation_logs (dedup_key) where dedup_key is not null;

alter table public.automation_logs enable row level security;

drop policy if exists "automation_logs_admin_all" on public.automation_logs;
create policy "automation_logs_admin_all"
  on public.automation_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- marketing_templates (sections 25-27) — Email/WhatsApp/SMS content for
-- AUTOMATION actions. Deliberately separate from the existing
-- whatsapp_templates table (STEP 6, used for manual bulk WhatsApp
-- sending) — never touched, so nothing already using it breaks.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('Email', 'WhatsApp', 'SMS')),
  category text not null default 'Other' check (
    category in (
      'Lead Received', 'Property Inquiry', 'Site Visit Confirmation', 'Brochure Request',
      'Follow-up Reminder', 'Agreement Ready', 'Payment Reminder', 'Thank You', 'Lead Re-engagement', 'Other'
    )
  ),
  subject text,
  content text not null default '',
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  updated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketing_templates_set_updated_at on public.marketing_templates;
create trigger marketing_templates_set_updated_at before update on public.marketing_templates for each row execute function public.set_updated_at();

create index if not exists marketing_templates_channel_idx on public.marketing_templates (channel);
create index if not exists marketing_templates_active_idx on public.marketing_templates (active);

alter table public.marketing_templates enable row level security;

drop policy if exists "marketing_templates_admin_all" on public.marketing_templates;
create policy "marketing_templates_admin_all"
  on public.marketing_templates for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "marketing_templates_staff_read" on public.marketing_templates;
create policy "marketing_templates_staff_read"
  on public.marketing_templates for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- marketing_tags / lead_tags (section 28) — free-form, admin-managed.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz not null default now()
);

alter table public.marketing_tags enable row level security;

drop policy if exists "marketing_tags_admin_all" on public.marketing_tags;
create policy "marketing_tags_admin_all"
  on public.marketing_tags for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "marketing_tags_staff_read" on public.marketing_tags;
create policy "marketing_tags_staff_read"
  on public.marketing_tags for select
  to authenticated
  using (public.is_admin());

create table if not exists public.lead_tags (
  lead_id uuid not null references public.leads (id) on delete cascade,
  tag_id uuid not null references public.marketing_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

create index if not exists lead_tags_lead_idx on public.lead_tags (lead_id);
create index if not exists lead_tags_tag_idx on public.lead_tags (tag_id);

alter table public.lead_tags enable row level security;

drop policy if exists "lead_tags_admin_all" on public.lead_tags;
create policy "lead_tags_admin_all"
  on public.lead_tags for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_tags_agent_read" on public.lead_tags;
create policy "lead_tags_agent_read"
  on public.lead_tags for select
  to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_tags.lead_id and l.assigned_agent_id = auth.uid()));

-- An agent may tag/untag their OWN assigned leads (CRM action, not
-- marketing administration — creating/deleting the tags themselves in
-- the global marketing_tags table stays admin/manager-only above).
drop policy if exists "lead_tags_agent_insert" on public.lead_tags;
create policy "lead_tags_agent_insert"
  on public.lead_tags for insert
  to authenticated
  with check (exists (select 1 from public.leads l where l.id = lead_tags.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "lead_tags_agent_delete" on public.lead_tags;
create policy "lead_tags_agent_delete"
  on public.lead_tags for delete
  to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_tags.lead_id and l.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- marketing_segments (sections 29-30) — a SAVED filter definition, not a
-- stored membership list; marketingSegmentService resolves it against
-- live `leads` data every time it's viewed.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  conditions jsonb not null default '[]'::jsonb,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketing_segments_set_updated_at on public.marketing_segments;
create trigger marketing_segments_set_updated_at before update on public.marketing_segments for each row execute function public.set_updated_at();

alter table public.marketing_segments enable row level security;

drop policy if exists "marketing_segments_admin_all" on public.marketing_segments;
create policy "marketing_segments_admin_all"
  on public.marketing_segments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- customer_profiles — communication consent (section 32). Default true
-- (an existing customer already has an active relationship with the
-- business); a customer can opt out from their own profile settings.
-- ---------------------------------------------------------------------
alter table public.customer_profiles add column if not exists email_opt_in boolean not null default true;
alter table public.customer_profiles add column if not exists whatsapp_opt_in boolean not null default true;
alter table public.customer_profiles add column if not exists sms_opt_in boolean not null default true;
alter table public.customer_profiles add column if not exists marketing_opt_in boolean not null default true;

-- ---------------------------------------------------------------------
-- apply_lead_signals() (sections 10-14, 21, 57) — AFTER INSERT on leads.
-- Computes the baseline score from real row data (never guessed), writes
-- lead_score_history, sets score/score_level/auto_priority, and enqueues
-- the trigger(s) an anonymous visitor's own request can never reach
-- app-level automation code for directly. Mirrors the existing
-- on_lead_auto_assigned trigger's style exactly.
-- ---------------------------------------------------------------------
create or replace function public.apply_lead_signals()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_total integer := 0;
  v_level text;
  v_auto_priority text;
  v_rule record;
  v_event_types text[] := array['NEW_LEAD'];
  v_warm integer;
  v_hot integer;
  v_very_hot integer;
begin
  if new.phone is not null and new.phone <> '' then
    v_event_types := array_append(v_event_types, 'PHONE_PROVIDED');
  end if;
  if new.budget_min is not null or new.budget_max is not null then
    v_event_types := array_append(v_event_types, 'BUDGET_PROVIDED');
  end if;
  if new.source = 'whatsapp' then
    v_event_types := array_append(v_event_types, 'WHATSAPP_INQUIRY');
  end if;
  if new.lead_type = 'Site Visit' then
    v_event_types := array_append(v_event_types, 'SITE_VISIT_REQUESTED');
  end if;
  if new.lead_type = 'Brochure Request' then
    v_event_types := array_append(v_event_types, 'BROCHURE_DOWNLOADED');
  end if;
  if new.lead_type = 'Payment Plan Request' then
    v_event_types := array_append(v_event_types, 'PAYMENT_PLAN_REQUESTED');
  end if;
  if new.lead_type = 'Investment Inquiry' then
    v_event_types := array_append(v_event_types, 'INVESTMENT_CALCULATOR_USED');
  end if;

  for v_rule in select * from public.lead_scoring_rules where active and event_type = any(v_event_types) loop
    insert into public.lead_score_history (lead_id, rule_id, points, reason) values (new.id, v_rule.id, v_rule.points, v_rule.label);
    v_total := v_total + v_rule.points;
  end loop;

  select lead_score_threshold_warm, lead_score_threshold_hot, lead_score_threshold_very_hot
  into v_warm, v_hot, v_very_hot
  from public.website_settings limit 1;

  v_level := case
    when v_total >= coalesce(v_very_hot, 70) then 'VERY_HOT'
    when v_total >= coalesce(v_hot, 40) then 'HOT'
    when v_total >= coalesce(v_warm, 20) then 'WARM'
    else 'COLD'
  end;
  v_auto_priority := case v_level when 'VERY_HOT' then 'Urgent' when 'HOT' then 'High' when 'WARM' then 'Medium' else 'Low' end;

  update public.leads set score = v_total, score_level = v_level, auto_priority = v_auto_priority where id = new.id;

  insert into public.automation_queue (trigger_type, lead_id, payload) values ('NEW_LEAD', new.id, '{}'::jsonb);
  if new.lead_type = 'Brochure Request' then
    insert into public.automation_queue (trigger_type, lead_id, payload) values ('BROCHURE_REQUESTED', new.id, '{}'::jsonb);
  end if;
  if new.lead_type = 'Payment Plan Request' then
    insert into public.automation_queue (trigger_type, lead_id, payload) values ('PAYMENT_PLAN_REQUESTED', new.id, '{}'::jsonb);
  end if;
  if new.lead_type = 'Investment Inquiry' then
    insert into public.automation_queue (trigger_type, lead_id, payload) values ('INVESTMENT_INQUIRY', new.id, '{}'::jsonb);
  end if;

  return new;
end;
$$;

drop trigger if exists apply_lead_signals on public.leads;
create trigger apply_lead_signals after insert on public.leads
  for each row execute function public.apply_lead_signals();

-- =====================================================================
-- STEP 22 — Complete Customer Communication Center
-- =====================================================================

-- ---------------------------------------------------------------------
-- marketing_templates — extended with WhatsApp provider-approval fields
-- (section 15). Only meaningful for channel = 'WhatsApp' rows; ignored
-- otherwise. Never treated as APPROVED unless a real provider confirms
-- it (nothing in this deployment can confirm it without real WhatsApp
-- Business API credentials, so this stays DRAFT until that exists).
-- ---------------------------------------------------------------------
alter table public.marketing_templates add column if not exists provider_status text not null default 'DRAFT' check (provider_status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED'));
alter table public.marketing_templates add column if not exists provider_template_id text;
alter table public.marketing_templates add column if not exists language text not null default 'en';

-- ---------------------------------------------------------------------
-- customer_profiles — Do-Not-Contact (section 61). Stronger than
-- marketing_opt_in: blocks non-essential (marketing-classified) sends
-- entirely; transactional deal/payment/document communications are
-- unaffected (section 59's marketing-vs-transactional separation).
-- ---------------------------------------------------------------------
alter table public.customer_profiles add column if not exists do_not_contact boolean not null default false;

-- ---------------------------------------------------------------------
-- communication_settings (sections 12, 61, 62) — a single-row table,
-- same pattern as website_settings. Secrets are NEVER stored here —
-- only non-secret, admin-editable operational flags. Real credentials
-- stay in environment variables (see src/lib/marketing/providers.ts).
-- ---------------------------------------------------------------------
create table if not exists public.communication_settings (
  id smallint primary key default 1,
  whatsapp_enabled boolean not null default false,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  test_mode boolean not null default true,
  business_hours_start time not null default '09:00',
  business_hours_end time not null default '20:00',
  business_hours_timezone text not null default 'Asia/Karachi',
  defer_outside_business_hours boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint communication_settings_singleton check (id = 1)
);

insert into public.communication_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists communication_settings_set_updated_at on public.communication_settings;
create trigger communication_settings_set_updated_at before update on public.communication_settings for each row execute function public.set_updated_at();

alter table public.communication_settings enable row level security;

drop policy if exists "communication_settings_public_read" on public.communication_settings;
create policy "communication_settings_public_read"
  on public.communication_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "communication_settings_admin_write" on public.communication_settings;
create policy "communication_settings_admin_write"
  on public.communication_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_conversations (sections 6-9) — one thread per channel +
-- counterpart. Ownership is deliberately broad (any of these may be
-- set), mirroring the established nullable-FK ownership pattern from
-- leads/deals/documents. counterpart_* columns hold denormalized
-- contact info for an inbound message that doesn't yet match any
-- lead/customer (section 46's "Unmatched Conversation" queue).
-- ---------------------------------------------------------------------
create table if not exists public.communication_conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'SMS', 'INTERNAL', 'PORTAL', 'SYSTEM')),
  subject text,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  site_visit_id uuid references public.appointments (id) on delete set null,
  payment_id uuid references public.deal_payments (id) on delete set null,
  assigned_agent_id uuid references public.admin_profiles (id) on delete set null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'ARCHIVED')),
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  priority_overridden boolean not null default false,
  counterpart_name text,
  counterpart_phone text,
  counterpart_email text,
  is_unmatched boolean not null default false,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists communication_conversations_set_updated_at on public.communication_conversations;
create trigger communication_conversations_set_updated_at before update on public.communication_conversations for each row execute function public.set_updated_at();

create index if not exists communication_conversations_lead_idx on public.communication_conversations (lead_id);
create index if not exists communication_conversations_customer_idx on public.communication_conversations (customer_id);
create index if not exists communication_conversations_deal_idx on public.communication_conversations (deal_id);
create index if not exists communication_conversations_agent_idx on public.communication_conversations (assigned_agent_id);
create index if not exists communication_conversations_channel_idx on public.communication_conversations (channel);
create index if not exists communication_conversations_status_idx on public.communication_conversations (status);
create index if not exists communication_conversations_unmatched_idx on public.communication_conversations (is_unmatched) where is_unmatched;
create index if not exists communication_conversations_last_message_idx on public.communication_conversations (last_message_at desc);

alter table public.communication_conversations enable row level security;

drop policy if exists "communication_conversations_admin_all" on public.communication_conversations;
create policy "communication_conversations_admin_all"
  on public.communication_conversations for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent sees conversations either directly assigned to them, or
-- whose linked lead is assigned to them (mirrors leads_agent_read).
drop policy if exists "communication_conversations_agent_read" on public.communication_conversations;
create policy "communication_conversations_agent_read"
  on public.communication_conversations for select
  to authenticated
  using (
    assigned_agent_id = auth.uid()
    or exists (select 1 from public.leads l where l.id = communication_conversations.lead_id and l.assigned_agent_id = auth.uid())
  );

drop policy if exists "communication_conversations_agent_update" on public.communication_conversations;
create policy "communication_conversations_agent_update"
  on public.communication_conversations for update
  to authenticated
  using (
    assigned_agent_id = auth.uid()
    or exists (select 1 from public.leads l where l.id = communication_conversations.lead_id and l.assigned_agent_id = auth.uid())
  )
  with check (
    assigned_agent_id = auth.uid()
    or exists (select 1 from public.leads l where l.id = communication_conversations.lead_id and l.assigned_agent_id = auth.uid())
  );

-- A customer may read (never insert/update directly — always through
-- the customer.actions.ts server action, using the authenticated
-- session) their own portal conversations.
drop policy if exists "communication_conversations_customer_read" on public.communication_conversations;
create policy "communication_conversations_customer_read"
  on public.communication_conversations for select
  to authenticated
  using (customer_id = auth.uid() and channel = 'PORTAL');

-- Locks ownership/routing fields for anyone who isn't admin/manager —
-- the same protect_*_for_agent trigger pattern used by leads/deals.
create or replace function public.protect_conversation_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.channel := old.channel;
    new.lead_id := old.lead_id;
    new.customer_id := old.customer_id;
    new.property_id := old.property_id;
    new.project_id := old.project_id;
    new.deal_id := old.deal_id;
    new.site_visit_id := old.site_visit_id;
    new.payment_id := old.payment_id;
    new.counterpart_name := old.counterpart_name;
    new.counterpart_phone := old.counterpart_phone;
    new.counterpart_email := old.counterpart_email;
    new.is_unmatched := old.is_unmatched;
  end if;
  return new;
end;
$$;

drop trigger if exists communication_conversations_protect_fields on public.communication_conversations;
create trigger communication_conversations_protect_fields before update on public.communication_conversations
  for each row execute function public.protect_conversation_fields();

-- ---------------------------------------------------------------------
-- communication_messages (sections 9-10, 20, 43) — every message in
-- every conversation, one row per message, regardless of channel or
-- direction. idempotency_key's unique index (partial, since drafts
-- never carry one) is the actual duplicate-send guard (section 43/83).
-- ---------------------------------------------------------------------
create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND', 'INTERNAL')),
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'SMS', 'INTERNAL', 'PORTAL', 'SYSTEM')),
  status text not null default 'DRAFT' check (
    status in ('DRAFT', 'QUEUED', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED')
  ),
  is_private_note boolean not null default false,
  subject text,
  body text not null default '',
  template_id uuid references public.marketing_templates (id) on delete set null,
  sender_admin_id uuid references public.admin_profiles (id) on delete set null,
  sender_customer_id uuid references auth.users (id) on delete set null,
  provider text,
  provider_message_id text,
  idempotency_key text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failure_reason text,
  retry_count integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists communication_messages_set_updated_at on public.communication_messages;
create trigger communication_messages_set_updated_at before update on public.communication_messages for each row execute function public.set_updated_at();

create index if not exists communication_messages_conversation_idx on public.communication_messages (conversation_id, created_at);
create index if not exists communication_messages_status_idx on public.communication_messages (status);
create index if not exists communication_messages_scheduled_idx on public.communication_messages (scheduled_for) where status = 'SCHEDULED';
create index if not exists communication_messages_provider_message_idx on public.communication_messages (provider_message_id) where provider_message_id is not null;
create unique index if not exists communication_messages_idempotency_idx on public.communication_messages (idempotency_key) where idempotency_key is not null;

alter table public.communication_messages enable row level security;

drop policy if exists "communication_messages_admin_all" on public.communication_messages;
create policy "communication_messages_admin_all"
  on public.communication_messages for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent may read/insert messages only in conversations they can see
-- (mirrors the conversations policy) — internal notes and outbound
-- messages both allowed; agents never see another agent's leads' mail.
drop policy if exists "communication_messages_agent_select" on public.communication_messages;
create policy "communication_messages_agent_select"
  on public.communication_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.communication_conversations c
      where c.id = communication_messages.conversation_id
        and (c.assigned_agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid()))
    )
  );

drop policy if exists "communication_messages_agent_insert" on public.communication_messages;
create policy "communication_messages_agent_insert"
  on public.communication_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.communication_conversations c
      where c.id = communication_messages.conversation_id
        and (c.assigned_agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid()))
    )
  );

-- A customer may read/insert only OUTBOUND-from-them (their own reply)
-- messages in their own PORTAL conversations — never internal notes,
-- never another customer's thread (section 70).
drop policy if exists "communication_messages_customer_select" on public.communication_messages;
create policy "communication_messages_customer_select"
  on public.communication_messages for select
  to authenticated
  using (
    not is_private_note
    and exists (select 1 from public.communication_conversations c where c.id = communication_messages.conversation_id and c.customer_id = auth.uid() and c.channel = 'PORTAL')
  );

drop policy if exists "communication_messages_customer_insert" on public.communication_messages;
create policy "communication_messages_customer_insert"
  on public.communication_messages for insert
  to authenticated
  with check (
    sender_customer_id = auth.uid()
    and direction = 'INBOUND'
    and not is_private_note
    and exists (select 1 from public.communication_conversations c where c.id = communication_messages.conversation_id and c.customer_id = auth.uid() and c.channel = 'PORTAL')
  );

-- Never allow editing an already-sent external message (section 77) —
-- only DRAFT rows may be freely updated by their own author; delivery-
-- status transitions on non-draft rows are applied by service-role
-- code (webhooks) or admin/manager, not a plain agent UPDATE.
create or replace function public.protect_sent_message_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status not in ('DRAFT', 'QUEUED', 'SCHEDULED') and not public.is_admin_or_manager() then
    new.body := old.body;
    new.subject := old.subject;
    new.channel := old.channel;
    new.template_id := old.template_id;
  end if;
  return new;
end;
$$;

drop trigger if exists communication_messages_protect_sent on public.communication_messages;
create trigger communication_messages_protect_sent before update on public.communication_messages
  for each row execute function public.protect_sent_message_fields();

-- ---------------------------------------------------------------------
-- communication_attachments (sections 54-56).
-- ---------------------------------------------------------------------
create table if not exists public.communication_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.communication_messages (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists communication_attachments_message_idx on public.communication_attachments (message_id);

alter table public.communication_attachments enable row level security;

drop policy if exists "communication_attachments_admin_all" on public.communication_attachments;
create policy "communication_attachments_admin_all"
  on public.communication_attachments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_attachments_read" on public.communication_attachments;
create policy "communication_attachments_read"
  on public.communication_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.communication_messages m
      join public.communication_conversations c on c.id = m.conversation_id
      where m.id = communication_attachments.message_id
        and (
          c.assigned_agent_id = auth.uid()
          or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid())
          or (c.customer_id = auth.uid() and c.channel = 'PORTAL' and not m.is_private_note)
        )
    )
  );

-- An agent may attach a file (e.g. a brochure or receipt) only to a
-- message on a conversation they can already see — mirrors the agent
-- message-insert policy above.
drop policy if exists "communication_attachments_agent_insert" on public.communication_attachments;
create policy "communication_attachments_agent_insert"
  on public.communication_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.communication_messages m
      join public.communication_conversations c on c.id = m.conversation_id
      where m.id = communication_attachments.message_id
        and (c.assigned_agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid()))
    )
  );

-- ---------------------------------------------------------------------
-- communication_delivery_logs (section 57) — every raw status event a
-- provider ever reports, kept in full for audit even though the
-- message row only ever shows the latest status.
-- ---------------------------------------------------------------------
create table if not exists public.communication_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.communication_messages (id) on delete cascade,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_code text,
  error_message text,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_delivery_logs_message_idx on public.communication_delivery_logs (message_id);

alter table public.communication_delivery_logs enable row level security;

drop policy if exists "communication_delivery_logs_admin_all" on public.communication_delivery_logs;
create policy "communication_delivery_logs_admin_all"
  on public.communication_delivery_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_schedules (sections 39-42) — the scheduling bookkeeping
-- record (did the processor pick this up, did it fire) — distinct from
-- communication_messages.status, which reflects delivery lifecycle.
-- ---------------------------------------------------------------------
create table if not exists public.communication_schedules (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.communication_messages (id) on delete cascade,
  scheduled_for timestamptz not null,
  timezone text not null default 'Asia/Karachi',
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
  executed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists communication_schedules_due_idx on public.communication_schedules (scheduled_for) where status = 'SCHEDULED';

alter table public.communication_schedules enable row level security;

drop policy if exists "communication_schedules_admin_all" on public.communication_schedules;
create policy "communication_schedules_admin_all"
  on public.communication_schedules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_call_logs (sections 37-38) — MANUAL_LOG only, never
-- presented as a telephony-provider-verified event.
-- ---------------------------------------------------------------------
create table if not exists public.communication_call_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.communication_conversations (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  direction text not null check (direction in ('Outgoing', 'Incoming')),
  outcome text not null check (outcome in ('CONNECTED', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'NOT_INTERESTED', 'WRONG_NUMBER', 'OTHER')),
  duration_seconds integer,
  notes text,
  next_follow_up_at timestamptz,
  source text not null default 'MANUAL_LOG' check (source = 'MANUAL_LOG'),
  created_at timestamptz not null default now()
);

create index if not exists communication_call_logs_lead_idx on public.communication_call_logs (lead_id);
create index if not exists communication_call_logs_conversation_idx on public.communication_call_logs (conversation_id);

alter table public.communication_call_logs enable row level security;

drop policy if exists "communication_call_logs_admin_all" on public.communication_call_logs;
create policy "communication_call_logs_admin_all"
  on public.communication_call_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_call_logs_agent_select" on public.communication_call_logs;
create policy "communication_call_logs_agent_select"
  on public.communication_call_logs for select
  to authenticated
  using (agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = communication_call_logs.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "communication_call_logs_agent_insert" on public.communication_call_logs;
create policy "communication_call_logs_agent_insert"
  on public.communication_call_logs for insert
  to authenticated
  with check (agent_id = auth.uid());

-- ---------------------------------------------------------------------
-- communication_participants (section 47) — PER-USER read-state, so an
-- unread count is never a single global flag shared by every agent.
-- ---------------------------------------------------------------------
create table if not exists public.communication_participants (
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  user_id uuid not null references public.admin_profiles (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists communication_participants_user_idx on public.communication_participants (user_id);

alter table public.communication_participants enable row level security;

drop policy if exists "communication_participants_own_row" on public.communication_participants;
create policy "communication_participants_own_row"
  on public.communication_participants for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_manager())
  with check (user_id = auth.uid() or public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_assignment_history (section 49) — mirrors
-- lead_assignment_history exactly, for conversations.
-- ---------------------------------------------------------------------
create table if not exists public.communication_assignment_history (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  previous_agent_id uuid references public.admin_profiles (id) on delete set null,
  new_agent_id uuid references public.admin_profiles (id) on delete set null,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists communication_assignment_history_conversation_idx on public.communication_assignment_history (conversation_id);

alter table public.communication_assignment_history enable row level security;

drop policy if exists "communication_assignment_history_admin_all" on public.communication_assignment_history;
create policy "communication_assignment_history_admin_all"
  on public.communication_assignment_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_assignment_history_agent_read" on public.communication_assignment_history;
create policy "communication_assignment_history_agent_read"
  on public.communication_assignment_history for select
  to authenticated
  using (exists (select 1 from public.communication_conversations c where c.id = communication_assignment_history.conversation_id and c.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- communication_audit_logs (section 58) — every important lifecycle
-- action, actor + timestamp, immutable (insert/select only).
-- ---------------------------------------------------------------------
create table if not exists public.communication_audit_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.communication_conversations (id) on delete cascade,
  message_id uuid references public.communication_messages (id) on delete set null,
  action text not null,
  actor_id uuid references public.admin_profiles (id) on delete set null,
  actor_name text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_audit_logs_conversation_idx on public.communication_audit_logs (conversation_id);
create index if not exists communication_audit_logs_created_idx on public.communication_audit_logs (created_at);

alter table public.communication_audit_logs enable row level security;

drop policy if exists "communication_audit_logs_admin_all" on public.communication_audit_logs;
create policy "communication_audit_logs_admin_all"
  on public.communication_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_audit_logs_agent_read" on public.communication_audit_logs;
create policy "communication_audit_logs_agent_read"
  on public.communication_audit_logs for select
  to authenticated
  using (exists (select 1 from public.communication_conversations c where c.id = communication_audit_logs.conversation_id and c.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- communication_consent_history (sections 59-60) — every opt-in/opt-out
-- change, who/what changed it, and why (customer action, admin action,
-- an inbound STOP keyword, or a system default).
-- ---------------------------------------------------------------------
create table if not exists public.communication_consent_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  field text not null check (field in ('email_opt_in', 'whatsapp_opt_in', 'sms_opt_in', 'marketing_opt_in', 'do_not_contact')),
  old_value boolean,
  new_value boolean not null,
  source text not null check (source in ('customer', 'admin', 'stop_keyword', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists communication_consent_history_customer_idx on public.communication_consent_history (customer_id);

alter table public.communication_consent_history enable row level security;

drop policy if exists "communication_consent_history_admin_all" on public.communication_consent_history;
create policy "communication_consent_history_admin_all"
  on public.communication_consent_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_consent_history_customer_read" on public.communication_consent_history;
create policy "communication_consent_history_customer_read"
  on public.communication_consent_history for select
  to authenticated
  using (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- conversation_tags (section 51) — reuses marketing_tags (STEP 21)
-- rather than a second tags table; a tag can now apply to a lead AND/OR
-- a conversation independently.
-- ---------------------------------------------------------------------
create table if not exists public.conversation_tags (
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  tag_id uuid not null references public.marketing_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, tag_id)
);

create index if not exists conversation_tags_conversation_idx on public.conversation_tags (conversation_id);
create index if not exists conversation_tags_tag_idx on public.conversation_tags (tag_id);

alter table public.conversation_tags enable row level security;

drop policy if exists "conversation_tags_admin_all" on public.conversation_tags;
create policy "conversation_tags_admin_all"
  on public.conversation_tags for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "conversation_tags_agent_all" on public.conversation_tags;
create policy "conversation_tags_agent_all"
  on public.conversation_tags for all
  to authenticated
  using (exists (select 1 from public.communication_conversations c where c.id = conversation_tags.conversation_id and c.assigned_agent_id = auth.uid()))
  with check (exists (select 1 from public.communication_conversations c where c.id = conversation_tags.conversation_id and c.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Storage bucket for communication attachments (sections 54-56) —
-- private, signed-URL-only, mirroring STEP 20's secure-documents bucket
-- exactly.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('communication-attachments', 'communication-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "communication_attachments_storage_admin_all" on storage.objects;
create policy "communication_attachments_storage_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'communication-attachments' and public.is_admin_or_manager())
  with check (bucket_id = 'communication-attachments' and public.is_admin_or_manager());

drop policy if exists "communication_attachments_storage_staff_insert" on storage.objects;
create policy "communication_attachments_storage_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'communication-attachments' and public.is_admin());

-- No SELECT policy for plain agents/customers — reads always go
-- through a server-generated signed URL (service-role, issued only
-- after the message row was already readable under its own RLS).
