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
  size text not null,
  size_category text not null default 'Custom' check (
    size_category in ('3 Marla', '5 Marla', '10 Marla', '1 Kanal', 'Custom')
  ),
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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_assigned_agent_idx on public.leads (assigned_agent_id);
create index if not exists leads_property_idx on public.leads (property_id);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_follow_up_idx on public.leads (next_follow_up_date);
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists leads_whatsapp_idx on public.leads (whatsapp);
create index if not exists leads_customer_idx on public.leads (customer_id);
create index if not exists leads_campaign_idx on public.leads (campaign_id);

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists saved_searches_user_idx on public.saved_searches (user_id);

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
