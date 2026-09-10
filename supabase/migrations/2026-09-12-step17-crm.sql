-- =====================================================================
-- STEP 17 — Complete Property CRM + Lead Management System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTE: this project already has a real lead/agent/follow-up/
-- attribution system (STEPs 5, 9, 11, 14, 15). This migration EXTENDS
-- `leads` with the CRM fields it's still missing (priority, lead type,
-- project link, customer requirements, lost/converted metadata,
-- archive flag) rather than creating a second lead table, and adds two
-- genuinely new tables (lead_assignment_history, communication_log)
-- that didn't exist before.
-- =====================================================================

-- ---------------------------------------------------------------------
-- leads — new CRM fields. All nullable (or defaulted to the neutral
-- value) so existing rows need no backfill and nothing is invented.
-- ---------------------------------------------------------------------
alter table public.leads
  add column if not exists priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High', 'Urgent')),
  add column if not exists lead_type text not null default 'General Inquiry' check (
    lead_type in (
      'General Inquiry', 'Property Details', 'Callback Request', 'Site Visit', 'Brochure Request',
      'Investment Inquiry', 'Project Inquiry', 'Price Request', 'Payment Plan Request'
    )
  ),
  add column if not exists project_id uuid references public.projects (id) on delete set null,
  add column if not exists project_title text,
  add column if not exists purpose text check (purpose is null or purpose in ('buy', 'rent', 'invest')),
  add column if not exists budget_min numeric,
  add column if not exists budget_max numeric,
  add column if not exists preferred_location text,
  add column if not exists preferred_property_type text,
  add column if not exists preferred_bedrooms integer,
  add column if not exists last_contacted_at timestamptz,
  add column if not exists lost_reason text check (
    lost_reason is null or lost_reason in (
      'Budget', 'Not Interested', 'Property Unavailable', 'Bought Elsewhere',
      'Rent Elsewhere', 'No Response', 'Invalid Lead', 'Other'
    )
  ),
  add column if not exists converted_at timestamptz,
  add column if not exists converted_by uuid references public.admin_profiles (id) on delete set null,
  -- Archive (section 44) — the preferred, reversible alternative to hard
  -- delete. The existing hard-delete method/RLS policy is untouched and
  -- stays restricted to admin/manager; archiving is the new default
  -- action surfaced in the CRM UI.
  add column if not exists archived boolean not null default false,
  add column if not exists archived_at timestamptz;

create index if not exists leads_priority_idx on public.leads (priority);
create index if not exists leads_lead_type_idx on public.leads (lead_type);
create index if not exists leads_project_idx on public.leads (project_id);
create index if not exists leads_created_at_idx on public.leads (created_at);
create index if not exists leads_archived_idx on public.leads (archived);

-- Trigram search on the leads a CRM search box actually searches by
-- name — phone/email already have plain btree indexes (leads_phone_idx/
-- leads_whatsapp_idx); pg_trgm itself was already enabled in STEP 16.
create index if not exists leads_name_trgm_idx on public.leads using gin (name gin_trgm_ops);

-- project_id/project_title are identity fields (which project this
-- lead is about) — extend the existing agent field-lock trigger to
-- cover them exactly like property_id/property_title already are.
-- Customer-requirement fields (purpose/budget/preferred_*/priority/
-- lead_type) stay agent-editable, since qualifying a lead by phone is
-- exactly when an agent learns and updates these.
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

-- ---------------------------------------------------------------------
-- lead_assignment_history (section 20) — accountability trail for every
-- assign/reassign, manual or automatic.
-- ---------------------------------------------------------------------
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

-- An agent may see the history of a lead currently or previously
-- assigned to them — never other agents' history.
drop policy if exists "lead_assignment_history_agent_read" on public.lead_assignment_history;
create policy "lead_assignment_history_agent_read"
  on public.lead_assignment_history for select
  to authenticated
  using (previous_agent_id = auth.uid() or new_agent_id = auth.uid());

-- ---------------------------------------------------------------------
-- communication_log (section 24) — a MANUAL record an agent/admin adds
-- after actually contacting a customer. Nothing here is auto-generated
-- (no telephony/WhatsApp Business API is wired up) — see leadService
-- for how logging an "Outgoing" entry also updates last_contacted_at.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Auto-assignment (STEP 14) now also records assignment history —
-- extends on_lead_auto_assigned() rather than duplicating its logic.
-- ---------------------------------------------------------------------
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
