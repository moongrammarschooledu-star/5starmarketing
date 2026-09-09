-- =====================================================================
-- STEP 5 — Lead Management & WhatsApp Inquiry CRM
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
--
-- What it does:
--   1. Renames the old `inquiries` table to `leads` (keeps every existing
--      row — nothing is deleted).
--   2. Adds the new CRM columns (whatsapp, consent, follow-up date/time,
--      assigned_to).
--   3. Expands the status/source options to the full CRM set.
--   4. Creates the new `lead_notes` table (follow-up notes/history).
--   5. Replaces the old RLS policies with the new leads/lead_notes ones.
--
-- It is safe to re-run — every step checks for existing state first.
-- =====================================================================

-- 1. Rename inquiries -> leads (only if inquiries still exists as such).
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'inquiries'
  ) and not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'leads'
  ) then
    alter table public.inquiries rename to leads;
  end if;
end $$;

-- If this is a brand-new project that never had `inquiries`, create
-- `leads` directly with the final shape.
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null default '',
  email text,
  property_id uuid references public.properties (id) on delete set null,
  property_title text,
  message text not null default '',
  source text not null default 'website',
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. New CRM columns.
alter table public.leads add column if not exists whatsapp text;
alter table public.leads add column if not exists consent boolean not null default false;
alter table public.leads add column if not exists next_follow_up_date date;
alter table public.leads add column if not exists next_follow_up_time time;
alter table public.leads add column if not exists assigned_to text;

-- 3. Normalize old data, then expand the status/source check constraints.
update public.leads set source = 'website' where source = 'contact_form';
update public.leads set status = 'follow_up' where status = 'follow-up';

alter table public.leads drop constraint if exists inquiries_status_check;
alter table public.leads drop constraint if exists inquiries_source_check;
alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads drop constraint if exists leads_source_check;

alter table public.leads add constraint leads_status_check check (
  status in ('new', 'contacted', 'interested', 'follow_up', 'closed', 'lost')
);
alter table public.leads add constraint leads_source_check check (
  source in ('website', 'property_page', 'whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'direct', 'other')
);

create index if not exists leads_status_idx on public.leads (status);
create index if not exists leads_property_idx on public.leads (property_id);
create index if not exists leads_source_idx on public.leads (source);
create index if not exists leads_follow_up_idx on public.leads (next_follow_up_date);
create index if not exists leads_phone_idx on public.leads (phone);
create index if not exists leads_whatsapp_idx on public.leads (whatsapp);

drop trigger if exists set_updated_at on public.leads;
create trigger set_updated_at before update on public.leads
  for each row execute function public.set_updated_at();

-- 4. lead_notes — follow-up notes/history, one row per note.
create table if not exists public.lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  note text not null,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists lead_notes_lead_idx on public.lead_notes (lead_id);

-- 5. RLS — public visitors may only INSERT a lead (submit an inquiry);
-- only authenticated admins may read/update/delete leads or notes.
alter table public.leads enable row level security;
alter table public.lead_notes enable row level security;

drop policy if exists "inquiries_public_insert" on public.leads;
drop policy if exists "inquiries_admin_read" on public.leads;
drop policy if exists "inquiries_admin_update" on public.leads;
drop policy if exists "inquiries_admin_delete" on public.leads;
drop policy if exists "leads_public_insert" on public.leads;
drop policy if exists "leads_admin_read" on public.leads;
drop policy if exists "leads_admin_update" on public.leads;
drop policy if exists "leads_admin_delete" on public.leads;

create policy "leads_public_insert"
  on public.leads for insert
  to anon, authenticated
  with check (true);

create policy "leads_admin_read"
  on public.leads for select
  to authenticated
  using (true);

create policy "leads_admin_update"
  on public.leads for update
  to authenticated
  using (true)
  with check (true);

create policy "leads_admin_delete"
  on public.leads for delete
  to authenticated
  using (true);

-- lead_notes: no public policy at all — anonymous visitors get zero
-- access (RLS defaults to deny when no policy matches). Only admins
-- (authenticated) can read or add notes.
drop policy if exists "lead_notes_admin_all" on public.lead_notes;
create policy "lead_notes_admin_all"
  on public.lead_notes for all
  to authenticated
  using (true)
  with check (true);
