-- =====================================================================
-- STEP 14 — Sales Team, Agent Management, Lead Assignment & Performance
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTE: the spec asks for a `profiles` table for staff — that's
-- exactly what `admin_profiles` (STEP 3/9) already is, so this extends
-- it in place rather than creating a duplicate. Likewise `lead_notes`
-- already exists (STEP 5) and is extended, not recreated. This avoids
-- duplicate auth accounts and keeps every existing STEP working.
-- =====================================================================

-- ---------------------------------------------------------------------
-- admin_profiles — new staff fields + roles.
-- ---------------------------------------------------------------------
alter table public.admin_profiles
  add column if not exists email text,
  add column if not exists phone text,
  add column if not exists whatsapp text,
  add column if not exists specialization text,
  add column if not exists bio text,
  add column if not exists status text not null default 'Active' check (status in ('Active', 'Inactive')),
  add column if not exists availability text not null default 'Available' check (
    availability in ('Available', 'Busy', 'On Leave', 'Inactive')
  );

-- admin_profiles never stored email before (profileService read it live
-- from the Auth session instead) — /admin/team needs to show OTHER
-- members' emails too, which the app's RLS-bound client can never read
-- from auth.users directly. Denormalize it here (kept in sync going
-- forward by the updated handle_new_admin_user() trigger below) and
-- backfill every existing row once, straight from auth.users — this
-- migration runs with the privileges to read that schema.
update public.admin_profiles ap
set email = au.email
from auth.users au
where au.id = ap.id and ap.email is null;

alter table public.admin_profiles drop constraint if exists admin_profiles_role_check;
alter table public.admin_profiles add constraint admin_profiles_role_check check (
  role in ('super_admin', 'admin', 'editor', 'sales_agent', 'sales_manager')
);

-- Keep the new email column populated for every admin/agent created from
-- here on (self-registration is customer-only, so the "admin" branch is
-- always a dashboard-created staff account, never a duplicate).
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

-- ---------------------------------------------------------------------
-- current_admin_role() / is_admin_or_manager() — role-aware helpers,
-- alongside the existing is_admin() (STEP 10) which only checks "is any
-- kind of staff". CRM tables below need the finer-grained check so a
-- sales_agent's database access is actually scoped to their own leads,
-- not just hidden in the UI.
-- ---------------------------------------------------------------------
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
-- admin_profiles — /admin/team needs the whole roster, not just "my own
-- row" (the only thing the STEP 9/10 self-read/self-update policies
-- allow). Add team-wide read/update for admin_or_manager, ON TOP OF the
-- existing self policies (Postgres OR's multiple policies together for
-- the same command) — a sales_agent still only ever sees their own row.
--
-- The self-update policy has no column lock at all today, which means
-- right now ANY signed-in staff member — including a sales_agent —
-- could update their OWN role/status column and self-promote to
-- super_admin. That was harmless while every admin_profiles row was
-- equally trusted (STEP 9), but sales_agent is a genuinely
-- lower-privilege role now, so this closes that gap: only
-- is_admin_or_manager() may change role/status/availability going
-- forward via team management; a self-update trigger locks those
-- columns back to their old value for anyone else.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- leads — assignment by id (kept alongside the existing `assigned_to`
-- text column for backward compatibility with anything already reading
-- it), and two new pipeline statuses.
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists assigned_agent_id uuid references public.admin_profiles (id) on delete set null;
create index if not exists leads_assigned_agent_idx on public.leads (assigned_agent_id);

alter table public.leads drop constraint if exists leads_status_check;
alter table public.leads add constraint leads_status_check check (
  status in ('new', 'contacted', 'interested', 'follow_up', 'site_visit', 'negotiation', 'closed', 'lost')
);

-- A sales_agent may only ever change status/consent/follow-up fields on
-- a lead — never reassign it, change whose customer it is, or edit the
-- customer's own contact details. Admins and sales managers are
-- unaffected. Enforced here, not just in the UI.
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

-- Replace the old "any staff" leads policies with role-aware ones.
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

-- ---------------------------------------------------------------------
-- appointments — assignment by id, and role-aware access so an agent
-- only ever sees their own assigned visits.
-- ---------------------------------------------------------------------
alter table public.appointments add column if not exists assigned_agent_id uuid references public.admin_profiles (id) on delete set null;
create index if not exists appointments_assigned_agent_idx on public.appointments (assigned_agent_id);

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

-- ---------------------------------------------------------------------
-- lead_notes — add user_id (FK) and updated_at alongside the existing
-- created_by (text name), and scope access to assigned agents.
-- ---------------------------------------------------------------------
alter table public.lead_notes add column if not exists user_id uuid references public.admin_profiles (id) on delete set null;
alter table public.lead_notes add column if not exists updated_at timestamptz not null default now();

drop trigger if exists set_updated_at on public.lead_notes;
create trigger set_updated_at before update on public.lead_notes
  for each row execute function public.set_updated_at();

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

-- ---------------------------------------------------------------------
-- follow_ups — a dedicated, re-schedulable follow-up history per lead
-- (richer than the simple next_follow_up_date/time fields already on
-- `leads`, which stay untouched and keep working for existing widgets).
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

drop trigger if exists set_updated_at on public.follow_ups;
create trigger set_updated_at before update on public.follow_ups
  for each row execute function public.set_updated_at();

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

-- ---------------------------------------------------------------------
-- notifications — STAFF-facing (admin/sales_manager/sales_agent), kept
-- separate from customer_notifications (STEP 10), which is for
-- customers only and must never mix audiences.
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

-- Any signed-in staff member can create a notification for a colleague
-- (e.g. assigning them a lead) — same shape as customer_notifications.
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

-- ---------------------------------------------------------------------
-- Lead Assignment Method (section 6) — an admin setting, off (Manual)
-- by default. No automatic assignment happens unless explicitly changed.
-- ---------------------------------------------------------------------
alter table public.website_settings
  add column if not exists lead_assignment_method text not null default 'Manual' check (
    lead_assignment_method in ('Manual', 'Round Robin', 'Least Assigned Leads')
  );

-- ---------------------------------------------------------------------
-- Automatic lead assignment — runs entirely inside the database as a
-- BEFORE INSERT trigger, so it works for an anonymous website visitor's
-- inquiry too (the app-level client never has permission to read
-- admin_profiles or other leads, by design; a security-definer trigger
-- can, without granting that access more broadly). No-ops when the
-- setting is 'Manual' (the default) or when something has already set
-- assigned_agent_id on insert. "Round Robin" is a deterministic
-- modulo rotation over the active roster (ordered by name) driven by
-- how many leads have ever been auto/mananually assigned so far —
-- intentionally no separate "last assigned" pointer table, so there is
-- nothing extra to keep in sync or reset.
-- ---------------------------------------------------------------------
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
-- someone — a manually-created lead (assigned_agent_id null at insert)
-- generates neither, exactly like today.
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
