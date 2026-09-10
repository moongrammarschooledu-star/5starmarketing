-- =====================================================================
-- STEP 13 — Property & Project Brochure Generator
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
-- =====================================================================

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

drop trigger if exists set_updated_at on public.brochures;
create trigger set_updated_at before update on public.brochures
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- RLS — only admins can create/edit/delete or list every brochure;
-- public visitors can read only a brochure explicitly marked public
-- (matches the "Do not automatically publish every generated brochure"
-- instruction — publishing is a separate, deliberate admin action).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Storage: brochures bucket. A brochure PDF is finished marketing
-- material (no customer PII ever goes into it — see brochureService),
-- the same sensitivity level as the existing property-images /
-- project-images / documents buckets, so it follows the identical
-- public-read / admin-write shape. The brochures.public column controls
-- *discoverability* (whether a public page links to it), not storage
-- access — consistent with how the `documents` bucket already works.
-- ---------------------------------------------------------------------
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
