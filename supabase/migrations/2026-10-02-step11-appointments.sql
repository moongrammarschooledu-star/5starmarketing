-- =====================================================================
-- STEP 11 — Property Site Visit & Appointment System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Appointment Settings (section 21) — added to the existing single-row
-- website_settings table. All configurable from /admin/settings; nothing
-- here is claimed as real business hours unless the admin sets it.
-- ---------------------------------------------------------------------
alter table public.website_settings
  add column if not exists appointment_working_days text[] not null default array['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
  add column if not exists appointment_opening_time time not null default '10:00',
  add column if not exists appointment_closing_time time not null default '18:00',
  add column if not exists appointment_slot_duration_minutes integer not null default 60,
  add column if not exists appointment_break_start time,
  add column if not exists appointment_break_end time,
  add column if not exists appointment_max_visitors integer not null default 10,
  add column if not exists appointment_booking_notice_hours integer not null default 2;

-- ---------------------------------------------------------------------
-- leads.source — add 'site_visit' so a site-visit-originated lead can be
-- tagged honestly (STEP 11 section 15), without touching any existing
-- source value.
-- ---------------------------------------------------------------------
alter table public.leads drop constraint if exists leads_source_check;
alter table public.leads add constraint leads_source_check check (
  source in ('website', 'property_page', 'whatsapp', 'facebook', 'instagram', 'tiktok', 'youtube', 'direct', 'other', 'site_visit')
);

-- ---------------------------------------------------------------------
-- appointments
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

alter table public.appointments enable row level security;

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

-- ---------------------------------------------------------------------
-- appointment_history — admin-only end to end, shown on the admin
-- appointment detail page.
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

alter table public.appointment_history enable row level security;

drop policy if exists "appointment_history_admin_all" on public.appointment_history;
create policy "appointment_history_admin_all"
  on public.appointment_history for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- appointment_reminders (section 20) — architecture only. Nothing reads
-- or sends these yet; no SMS/email/WhatsApp provider is configured.
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

alter table public.appointment_reminders enable row level security;

drop policy if exists "appointment_reminders_admin_all" on public.appointment_reminders;
create policy "appointment_reminders_admin_all"
  on public.appointment_reminders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
