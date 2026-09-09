-- =====================================================================
-- STEP 10 — Customer Portal
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- IMPORTANT SECURITY NOTE: before this step, "authenticated" always meant
-- "a logged-in admin" (only admins could sign in at all), so every admin
-- policy below was written as `to authenticated using (true)`. Now that
-- customers can also sign in via Supabase Auth, those policies would
-- incorrectly let a logged-in CUSTOMER through too. This migration adds
-- an is_admin() check and re-creates every one of those policies to
-- actually require it.
-- =====================================================================

-- ---------------------------------------------------------------------
-- is_admin() — true only for a signed-in user with a row in
-- admin_profiles. Used everywhere "authenticated" used to mean "admin".
-- ---------------------------------------------------------------------
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
-- Harden existing admin-only policies to require is_admin(), not just
-- "any authenticated user".
-- ---------------------------------------------------------------------
drop policy if exists "properties_admin_write" on public.properties;
create policy "properties_admin_write"
  on public.properties for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "projects_admin_write" on public.projects;
create policy "projects_admin_write"
  on public.projects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "services_admin_all" on public.services;
create policy "services_admin_all"
  on public.services for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "lead_notes_admin_all" on public.lead_notes;
create policy "lead_notes_admin_all"
  on public.lead_notes for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

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

drop policy if exists "settings_admin_write" on public.website_settings;
create policy "settings_admin_write"
  on public.website_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "property_views_admin_read" on public.property_views;
create policy "property_views_admin_read"
  on public.property_views for select
  to authenticated
  using (public.is_admin());

drop policy if exists "website_events_admin_read" on public.website_events;
create policy "website_events_admin_read"
  on public.website_events for select
  to authenticated
  using (public.is_admin());

drop policy if exists "activity_logs_admin_all" on public.activity_logs;
create policy "activity_logs_admin_all"
  on public.activity_logs for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Storage: the write policies on every existing bucket were also
-- `to authenticated` unconditionally — restrict them to admins too.
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

-- ---------------------------------------------------------------------
-- leads: link a lead to the logged-in customer who submitted it (still
-- nullable — anonymous visitors can submit without an account), and let
-- that customer read (only) their own leads for "My Inquiries".
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists customer_id uuid references auth.users (id) on delete set null;
create index if not exists leads_customer_idx on public.leads (customer_id);

drop policy if exists "leads_admin_read" on public.leads;
create policy "leads_admin_read"
  on public.leads for select
  to authenticated
  using (public.is_admin());

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

-- ---------------------------------------------------------------------
-- customer_profiles — one row per customer, keyed to auth.users. email
-- is cached here (kept in sync by a trigger below) because the `auth`
-- schema itself is never queryable from the app (no service-role key is
-- used anywhere in this project), so /admin/customers needs a real place
-- to read a customer's email and registration date from.
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

drop trigger if exists set_updated_at on public.customer_profiles;
create trigger set_updated_at before update on public.customer_profiles
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

alter table public.customer_profiles enable row level security;

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

-- ---------------------------------------------------------------------
-- favorites — one row per (customer, property). The unique constraint is
-- what actually prevents saving the same property twice.
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

alter table public.favorites enable row level security;

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

-- ---------------------------------------------------------------------
-- property_alerts — architecture + UI only for now (STEP 10 section 10);
-- no email/WhatsApp automation is wired up yet.
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

drop trigger if exists set_updated_at on public.property_alerts;
create trigger set_updated_at before update on public.property_alerts
  for each row execute function public.set_updated_at();

alter table public.property_alerts enable row level security;

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

-- ---------------------------------------------------------------------
-- saved_searches
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

drop trigger if exists set_updated_at on public.saved_searches;
create trigger set_updated_at before update on public.saved_searches
  for each row execute function public.set_updated_at();

alter table public.saved_searches enable row level security;

drop policy if exists "saved_searches_owner_all" on public.saved_searches;
create policy "saved_searches_owner_all"
  on public.saved_searches for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- customer_notifications — architecture for STEP 10 section 22. Rows are
-- written by admin actions (e.g. a lead status change); no real
-- email/WhatsApp sending is wired up yet.
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

alter table public.customer_notifications enable row level security;

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

-- ---------------------------------------------------------------------
-- Signup routing: the SAME trigger that has always turned a new
-- auth.users row into an admin_profiles row now also handles customer
-- self-registration, routed by raw_user_meta_data->>'account_type'
-- (set explicitly by the /register form's signUp call — dashboard-created
-- admins never set this, so they keep working exactly as before).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Storage: customer-avatars bucket — public read, any signed-in user
-- (customer or admin) can manage their own uploaded avatar.
-- ---------------------------------------------------------------------
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
