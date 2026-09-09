-- =====================================================================
-- STEP 7 — Projects & Premium Property Presentation System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
-- =====================================================================

-- 1. New columns on projects.
alter table public.projects add column if not exists short_description text not null default '';
alter table public.projects add column if not exists highlights text[] not null default '{}';
alter table public.projects add column if not exists property_types text[] not null default '{}';
alter table public.projects add column if not exists payment_options text[] not null default '{}';
alter table public.projects add column if not exists maps_url text;
alter table public.projects add column if not exists cover_image text;
alter table public.projects add column if not exists whatsapp_number text;
alter table public.projects add column if not exists documents jsonb not null default '[]'::jsonb;
alter table public.projects add column if not exists published boolean not null default false;

create index if not exists projects_published_idx on public.projects (published);

-- Existing projects predate the draft/publish concept — treat them as
-- already published so nothing disappears from the live site.
update public.projects set published = true where published = false;

-- 2. New columns on properties.
alter table public.properties add column if not exists project_id uuid;
alter table public.properties add column if not exists payment_total_price numeric;
alter table public.properties add column if not exists payment_down_payment numeric;
alter table public.properties add column if not exists payment_monthly_installment numeric;
alter table public.properties add column if not exists payment_duration_months integer;
alter table public.properties add column if not exists payment_installments_count integer;
alter table public.properties add column if not exists documents jsonb not null default '[]'::jsonb;

create index if not exists properties_project_idx on public.properties (project_id);

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

-- 3. RLS: projects are now gated by `published` for public visitors.
-- Admins still see everything via the existing "projects_admin_write"
-- (for all, using true) policy.
drop policy if exists "projects_public_read" on public.projects;
create policy "projects_public_read"
  on public.projects for select
  to anon, authenticated
  using (published = true);

-- 4. Storage: project-images bucket.
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

-- 5. Storage: documents bucket (brochures, floor plans, payment plans).
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
