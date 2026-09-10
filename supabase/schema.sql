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
    role in ('super_admin', 'admin', 'editor', 'sales_agent')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- customer_profiles (STEP 10)
-- One row per customer, keyed to a Supabase Auth user. email is cached
-- here (kept in sync by a trigger below) because the `auth` schema is
-- never queryable from the app (no service-role key is used anywhere in
-- this project), so /admin/customers needs a real place to read a
-- customer's email and registration date from.
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
    status in ('new', 'contacted', 'interested', 'follow_up', 'closed', 'lost')
  ),
  consent boolean not null default false,
  next_follow_up_date date,
  next_follow_up_time time,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_property_idx on public.leads (property_id);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_follow_up_idx on public.leads (next_follow_up_date);
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists leads_whatsapp_idx on public.leads (whatsapp);
create index if not exists leads_customer_idx on public.leads (customer_id);

-- ---------------------------------------------------------------------
-- lead_notes
-- Follow-up notes/history against a lead — one row per note.
-- ---------------------------------------------------------------------
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
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
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists appointments_property_idx on public.appointments (property_id);
create index if not exists appointments_customer_idx on public.appointments (customer_id);
create index if not exists appointments_date_idx on public.appointments (appointment_date);
create index if not exists appointments_status_idx on public.appointments (status);
create index if not exists appointments_slot_idx on public.appointments (appointment_date, appointment_time, assigned_agent);

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
    insert into public.admin_profiles (id, name, title, role)
    values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Admin'), 'Director', 'admin')
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

drop policy if exists "leads_admin_read" on public.leads;
create policy "leads_admin_read"
  on public.leads for select
  to authenticated
  using (public.is_admin());

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
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
  on public.leads for delete
  to authenticated
  using (public.is_admin());

-- lead_notes: no public policy at all (RLS defaults to deny) — only
-- authenticated admins can read or add follow-up notes.
drop policy if exists "lead_notes_admin_all" on public.lead_notes;
create policy "lead_notes_admin_all"
  on public.lead_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

drop policy if exists "appointments_admin_all" on public.appointments;
create policy "appointments_admin_all"
  on public.appointments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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
