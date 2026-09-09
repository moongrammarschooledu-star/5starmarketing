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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  message text not null default '',
  source text not null default 'website' check (
    source in ('website', 'property_page', 'whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'direct', 'other')
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

-- Auto-create an admin_profiles row whenever a new Supabase Auth user is
-- created, so the dashboard always has a profile to read/update.
create or replace function public.handle_new_admin_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.admin_profiles (id, name, title)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', 'Admin'), 'Director')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_admin_user();

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
  using (true)
  with check (true);

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
  using (true)
  with check (true);

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
  using (true)
  with check (true);

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
  using (true);

drop policy if exists "leads_admin_update" on public.leads;
create policy "leads_admin_update"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);

drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
  on public.leads for delete
  to authenticated
  using (true);

-- lead_notes: no public policy at all (RLS defaults to deny) — only
-- authenticated admins can read or add follow-up notes.
drop policy if exists "lead_notes_admin_all" on public.lead_notes;
create policy "lead_notes_admin_all"
  on public.lead_notes for all
  to authenticated
  using (true)
  with check (true);

-- whatsapp_templates / whatsapp_activity: no public policy at all —
-- these are internal admin tools (message drafting + activity history),
-- never exposed to anonymous visitors.
drop policy if exists "whatsapp_templates_admin_all" on public.whatsapp_templates;
create policy "whatsapp_templates_admin_all"
  on public.whatsapp_templates for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "whatsapp_activity_admin_all" on public.whatsapp_activity;
create policy "whatsapp_activity_admin_all"
  on public.whatsapp_activity for all
  to authenticated
  using (true)
  with check (true);

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
  using (true)
  with check (true);

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
  with check (bucket_id = 'property-images');

drop policy if exists "property_images_admin_update" on storage.objects;
create policy "property_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'property-images');

drop policy if exists "property_images_admin_delete" on storage.objects;
create policy "property_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'property-images');

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
  with check (bucket_id = 'project-images');

drop policy if exists "project_images_admin_update" on storage.objects;
create policy "project_images_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'project-images');

drop policy if exists "project_images_admin_delete" on storage.objects;
create policy "project_images_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'project-images');

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
  with check (bucket_id = 'documents');

drop policy if exists "documents_admin_update" on storage.objects;
create policy "documents_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'documents');

drop policy if exists "documents_admin_delete" on storage.objects;
create policy "documents_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'documents');
