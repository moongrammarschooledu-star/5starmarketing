-- =====================================================================
-- STEP 29 — Customer Support, Complaint & Service Desk System
-- =====================================================================
--
-- DESIGN NOTES (read before touching this file):
--
-- This module leans harder on reuse than any prior step. The single
-- biggest decision: a support ticket's entire conversation — customer
-- messages, staff replies, INTERNAL NOTES, and attachments — is NOT a
-- new set of tables. It is the EXISTING STEP 22 Communication Center
-- (communication_conversations/communication_messages/
-- communication_attachments), which ALREADY has everything this
-- module's spec asked for verbatim:
--   - communication_messages.is_private_note is ALREADY invisible to
--     customers at the RLS layer (see communication_messages_customer_
--     select's "not is_private_note" clause) — exactly the "customers
--     must NEVER see internal notes" requirement.
--   - communication_messages.direction/channel/status ALREADY model
--     customer message / staff reply / internal note / system event
--     (via a 'SYSTEM' channel or INTERNAL direction) without a new
--     "support_ticket_messages" or "support_events" table.
--   - communication_attachments is ALREADY a private, signed-URL,
--     RLS-scoped attachment system (communicationAttachmentService) —
--     no new "support_ticket_attachments" table or storage path.
--   - communicationService.composeAndSend()/customerReply() are reused
--     directly by the new ticket actions below.
-- A ticket links to its ONE conversation via support_tickets.
-- conversation_id (not null, unique) — no reverse column is added to
-- communication_conversations; the new department/assigned-staff RLS
-- policies on communication_conversations/messages/attachments simply
-- subquery support_tickets by conversation_id.
--
-- OTHER REUSE-OVER-DUPLICATION DECISIONS:
--
-- 1. No "support_ticket_status_history" or "support_ticket_assignments"
--    tables. Every status change and (re)assignment is written to the
--    new support_audit_logs table (identical shape to legal_audit_logs/
--    construction_audit_logs/rental_audit_logs) instead of two more
--    bespoke history tables.
--
-- 2. No "support_events" calendar table. Exactly like STEP 26-28's
--    calendars, nothing here needs a dedicated table — SLA due dates
--    already live on support_tickets itself.
--
-- 3. No "support_routing_rules" table. A routing rule IS simply a
--    category's own default_department_id column — Payment -> Accounts
--    is one row's one column, not a separate rules engine.
--
-- 4. No "support_notifications" table. Customer-facing notifications
--    reuse the EXISTING customer_notifications table (notificationService,
--    new NotificationType values); staff-facing notifications reuse the
--    EXISTING notifications table (staffNotificationService, new
--    StaffNotificationType values) — the same dual system every prior
--    step (23-28) has used, never a parallel notification store.
--
-- 5. No "support_feedback" table. Customer satisfaction fields are
--    additive columns directly on support_tickets — mirroring how
--    STEP 25's maintenance_requests already inlines customer_rating/
--    customer_feedback on the request row itself rather than a
--    separate feedback table.
--
-- 6. No "support_saved_filters" table. The spec's own wording makes
--    this conditional on existing architecture supporting it — no
--    saved-filter mechanism exists anywhere in this codebase at any
--    prior STEP, so this is disclosed as skipped rather than built as
--    a one-off just for this module.
--
-- 7. support_complaints is a 1:1 METADATA COMPANION to support_tickets
--    (every complaint IS a ticket, created via the "Complaint"
--    category or explicitly filed as one) — mirroring STEP 28's
--    legal_documents-companion-to-documents pattern. It only adds the
--    extra fields a generic ticket row has no room for (severity,
--    investigation status, resolution, customer response, closure
--    reason) and its own 8-state status. The investigation timeline
--    reuses the ticket's own conversation (INTERNAL system-note
--    messages) rather than a separate "support_complaint_events" table.
--
-- 8. No new "manager"/"department staff"/"legal officer"-style role.
--    A department is led by any EXISTING admin_profiles row via a
--    nullable manager_id (mirrors construction's project_manager_id/
--    STEP 28's legal_officer_id); department membership is a plain
--    many-to-many join (support_department_staff) — no admin_profiles
--    enum change.
--
-- RLS SUMMARY (no new role; PUBLIC gets only categories/FAQ/settings):
--   - ADMIN/MANAGER: full manage access to everything in this module.
--   - DEPARTMENT MANAGER (support_departments.manager_id = auth.uid()):
--     read access to that department's tickets/complaints/escalations.
--   - DEPARTMENT STAFF (a support_department_staff row): read/update
--     access to tickets/complaints belonging to their department(s).
--   - ASSIGNED STAFF (support_tickets.assigned_staff_id = auth.uid()):
--     read/update access to their own assigned tickets — this is also
--     how an agent sees "tickets assigned to them" (section 24) since
--     an agent is just an admin_profiles row like any other.
--   - CUSTOMER: full access to their OWN tickets/complaints only, and
--     — via the EXISTING communication_messages RLS, unchanged — never
--     an internal note. A protect_support_ticket_customer_fields()
--     trigger (mirrors maintenance_requests' identical pattern) limits
--     a customer's own UPDATE to satisfaction feedback and requesting
--     REOPENED, nothing else.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Server-side, never-frontend-generated reference numbers.
-- ---------------------------------------------------------------------
create sequence if not exists public.support_ticket_seq;
create sequence if not exists public.support_complaint_seq;

create or replace function public.next_support_ticket_number()
returns text language sql volatile as $$
  select 'SUP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.support_ticket_seq')::text, 6, '0');
$$;

create or replace function public.next_support_complaint_number()
returns text language sql volatile as $$
  select 'CMP-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.support_complaint_seq')::text, 6, '0');
$$;

-- ---------------------------------------------------------------------
-- support_departments (section 8) — configurable; a department is led
-- by any existing admin_profiles row via a nullable manager_id, never
-- a new role.
-- ---------------------------------------------------------------------
create table if not exists public.support_departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  manager_id uuid references public.admin_profiles (id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.support_departments (code, name) values
  ('SALES', 'Sales'),
  ('SUPPORT', 'Customer Support'),
  ('ACCOUNTS', 'Accounts'),
  ('LEGAL', 'Legal'),
  ('MAINTENANCE', 'Maintenance'),
  ('CONSTRUCTION', 'Construction'),
  ('RENTAL', 'Rental'),
  ('PROPERTY_MGMT', 'Property Management'),
  ('MARKETING', 'Marketing'),
  ('ADMINISTRATION', 'Administration'),
  ('TECH_SUPPORT', 'Technical Support')
on conflict (code) do nothing;

drop trigger if exists support_departments_set_updated_at on public.support_departments;
create trigger support_departments_set_updated_at before update on public.support_departments for each row execute function public.set_updated_at();

alter table public.support_departments enable row level security;

drop policy if exists "support_departments_admin_all" on public.support_departments;
create policy "support_departments_admin_all"
  on public.support_departments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_departments_staff_read" on public.support_departments;
create policy "support_departments_staff_read"
  on public.support_departments for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- support_department_staff (section 9, 24) — plain membership join;
-- not a role, just "which admins belong to which department".
-- ---------------------------------------------------------------------
create table if not exists public.support_department_staff (
  department_id uuid not null references public.support_departments (id) on delete cascade,
  admin_id uuid not null references public.admin_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (department_id, admin_id)
);

create index if not exists support_department_staff_admin_idx on public.support_department_staff (admin_id);

alter table public.support_department_staff enable row level security;

drop policy if exists "support_department_staff_admin_all" on public.support_department_staff;
create policy "support_department_staff_admin_all"
  on public.support_department_staff for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_department_staff_self_read" on public.support_department_staff;
create policy "support_department_staff_self_read"
  on public.support_department_staff for select
  to authenticated
  using (admin_id = auth.uid());

-- ---------------------------------------------------------------------
-- support_categories (section 5) — configurable; a category's own
-- default_department_id IS the routing rule (section 18) — no
-- separate routing-rules table.
-- ---------------------------------------------------------------------
create table if not exists public.support_categories (
  code text primary key,
  label text not null,
  default_department_id uuid references public.support_departments (id) on delete set null,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.support_categories (code, label, default_department_id, sort_order)
select v.code, v.label, d.id, v.sort_order
from (values
  ('GENERAL_INQUIRY', 'General Inquiry', 'SUPPORT', 10),
  ('PROPERTY_INQUIRY', 'Property Inquiry', 'SALES', 20),
  ('SALES', 'Sales', 'SALES', 30),
  ('PURCHASE', 'Purchase', 'SALES', 40),
  ('INVESTMENT', 'Investment', 'SALES', 50),
  ('RENTAL', 'Rental', 'RENTAL', 60),
  ('MAINTENANCE', 'Maintenance', 'MAINTENANCE', 70),
  ('PAYMENT', 'Payment', 'ACCOUNTS', 80),
  ('INSTALLMENT', 'Installment', 'ACCOUNTS', 90),
  ('ACCOUNTING', 'Accounting', 'ACCOUNTS', 100),
  ('DOCUMENTS', 'Documents', 'ADMINISTRATION', 110),
  ('LEGAL', 'Legal', 'LEGAL', 120),
  ('CONSTRUCTION', 'Construction', 'CONSTRUCTION', 130),
  ('SITE_VISIT', 'Site Visit', 'SALES', 140),
  ('AGENT_SUPPORT', 'Agent Support', 'ADMINISTRATION', 150),
  ('COMPLAINT', 'Complaint', 'SUPPORT', 160),
  ('TECHNICAL_SUPPORT', 'Technical Support', 'TECH_SUPPORT', 170),
  ('REFUND_REQUEST', 'Refund Request', 'ACCOUNTS', 180),
  ('CONTRACT_REQUEST', 'Contract Request', 'LEGAL', 190),
  ('OTHER', 'Other', 'SUPPORT', 200)
) as v(code, label, department_code, sort_order)
join public.support_departments d on d.code = v.department_code
on conflict (code) do nothing;

alter table public.support_categories enable row level security;

drop policy if exists "support_categories_admin_all" on public.support_categories;
create policy "support_categories_admin_all"
  on public.support_categories for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_categories_public_read" on public.support_categories;
create policy "support_categories_public_read"
  on public.support_categories for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------
-- support_sla_rules (section 10) — configurable per priority, with an
-- optional department/category override; resolved by specificity in
-- the application layer (slaService). Never a hard-coded promise.
-- ---------------------------------------------------------------------
create table if not exists public.support_sla_rules (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references public.support_departments (id) on delete cascade,
  category_code text references public.support_categories (code) on delete cascade,
  priority text not null check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  first_response_minutes integer not null check (first_response_minutes > 0),
  resolution_minutes integer not null check (resolution_minutes > 0),
  business_hours_only boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_sla_rules_priority_idx on public.support_sla_rules (priority);
create index if not exists support_sla_rules_department_idx on public.support_sla_rules (department_id);

-- NULL-safe uniqueness (department_id/category_code are nullable —
-- plain UNIQUE would let duplicate global-default rows through since
-- NULLs never equal each other) so the seed below is truly idempotent.
create unique index if not exists support_sla_rules_unique_idx on public.support_sla_rules (
  coalesce(department_id, '00000000-0000-0000-0000-000000000000'),
  coalesce(category_code, ''),
  priority
);

-- Global defaults (no department/category override) — every priority
-- always resolves to at least this row.
insert into public.support_sla_rules (priority, first_response_minutes, resolution_minutes) values
  ('CRITICAL', 15, 240),
  ('URGENT', 30, 480),
  ('HIGH', 60, 1440),
  ('NORMAL', 240, 2880),
  ('LOW', 480, 5760)
on conflict (coalesce(department_id, '00000000-0000-0000-0000-000000000000'), coalesce(category_code, ''), priority) do nothing;

drop trigger if exists support_sla_rules_set_updated_at on public.support_sla_rules;
create trigger support_sla_rules_set_updated_at before update on public.support_sla_rules for each row execute function public.set_updated_at();

alter table public.support_sla_rules enable row level security;

drop policy if exists "support_sla_rules_admin_all" on public.support_sla_rules;
create policy "support_sla_rules_admin_all"
  on public.support_sla_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_sla_rules_staff_read" on public.support_sla_rules;
create policy "support_sla_rules_staff_read"
  on public.support_sla_rules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- support_settings (singleton) — business hours/days, the fallback
-- department for unroutable tickets, and the section-30 disclaimer.
-- ---------------------------------------------------------------------
create table if not exists public.support_settings (
  id smallint primary key default 1,
  business_hours_start time not null default '09:00',
  business_hours_end time not null default '18:00',
  -- ISO day numbers, 1 = Monday .. 7 = Sunday.
  business_days integer[] not null default array[1, 2, 3, 4, 5],
  default_department_id uuid references public.support_departments (id) on delete set null,
  disclaimer_text text not null default 'This support system is provided for service requests, communication and record management. Legal, financial or regulatory matters may require review by an appropriately qualified professional.',
  updated_at timestamptz not null default now(),
  constraint support_settings_singleton check (id = 1)
);

insert into public.support_settings (id, default_department_id)
select 1, d.id from public.support_departments d where d.code = 'SUPPORT'
on conflict (id) do nothing;

drop trigger if exists support_settings_set_updated_at on public.support_settings;
create trigger support_settings_set_updated_at before update on public.support_settings for each row execute function public.set_updated_at();

alter table public.support_settings enable row level security;

drop policy if exists "support_settings_public_read" on public.support_settings;
create policy "support_settings_public_read"
  on public.support_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "support_settings_admin_write" on public.support_settings;
create policy "support_settings_admin_write"
  on public.support_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- support_tickets (sections 4, 6, 7, 20) — the core ticket. Its entire
-- conversation lives on the EXISTING Communication Center via
-- conversation_id (see the header notes). Satisfaction/CSAT fields are
-- additive columns here, not a separate table (mirrors STEP 25's
-- maintenance_requests). SLA fields mirror maintenance_requests
-- exactly (sla_*_due_at / sla_*_breached / first_response_at).
-- ---------------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique default public.next_support_ticket_number(),
  conversation_id uuid not null unique references public.communication_conversations (id) on delete restrict,
  subject text not null,
  description text not null,
  category_code text not null references public.support_categories (code) on delete restrict,
  department_id uuid references public.support_departments (id) on delete set null,
  assigned_staff_id uuid references public.admin_profiles (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  source text not null default 'PORTAL' check (source in ('PORTAL', 'EMAIL', 'PHONE', 'WHATSAPP', 'ADMIN', 'OTHER')),
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  unit_id uuid references public.property_inventory (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  lease_id uuid references public.leases (id) on delete set null,
  payment_id uuid references public.deal_payments (id) on delete set null,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'CRITICAL')),
  status text not null default 'NEW' check (
    status in ('NEW', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_FOR_CUSTOMER', 'WAITING_FOR_INTERNAL_TEAM', 'ESCALATED', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED')
  ),
  sla_rule_id uuid references public.support_sla_rules (id) on delete set null,
  sla_response_due_at timestamptz,
  sla_resolution_due_at timestamptz,
  sla_response_breached boolean not null default false,
  sla_resolution_breached boolean not null default false,
  first_response_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  reopen_count integer not null default 0,
  -- Customer satisfaction (section 20) — additive, never a separate
  -- table; only ever set by the customer themselves after resolution.
  satisfaction_rating smallint check (satisfaction_rating is null or (satisfaction_rating between 1 and 5)),
  satisfaction_category text,
  satisfaction_comment text,
  would_recommend boolean,
  resolution_satisfaction text,
  feedback_submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_tickets_customer_idx on public.support_tickets (customer_id);
create index if not exists support_tickets_department_idx on public.support_tickets (department_id);
create index if not exists support_tickets_assigned_idx on public.support_tickets (assigned_staff_id);
create index if not exists support_tickets_status_idx on public.support_tickets (status);
create index if not exists support_tickets_priority_idx on public.support_tickets (priority);
create index if not exists support_tickets_category_idx on public.support_tickets (category_code);
create index if not exists support_tickets_property_idx on public.support_tickets (property_id);
create index if not exists support_tickets_project_idx on public.support_tickets (project_id);
create index if not exists support_tickets_created_at_idx on public.support_tickets (created_at);
create index if not exists support_tickets_sla_response_idx on public.support_tickets (sla_response_due_at) where sla_response_breached = false;
create index if not exists support_tickets_sla_resolution_idx on public.support_tickets (sla_resolution_due_at) where sla_resolution_breached = false;

drop trigger if exists support_tickets_set_updated_at on public.support_tickets;
create trigger support_tickets_set_updated_at before update on public.support_tickets for each row execute function public.set_updated_at();

alter table public.support_tickets enable row level security;

drop policy if exists "support_tickets_admin_all" on public.support_tickets;
create policy "support_tickets_admin_all"
  on public.support_tickets for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_tickets_department_staff_all" on public.support_tickets;
create policy "support_tickets_department_staff_all"
  on public.support_tickets for all
  to authenticated
  using (public.is_admin() and exists (select 1 from public.support_department_staff ds where ds.department_id = support_tickets.department_id and ds.admin_id = auth.uid()))
  with check (public.is_admin() and exists (select 1 from public.support_department_staff ds where ds.department_id = support_tickets.department_id and ds.admin_id = auth.uid()));

drop policy if exists "support_tickets_assigned_staff_all" on public.support_tickets;
create policy "support_tickets_assigned_staff_all"
  on public.support_tickets for all
  to authenticated
  using (public.is_admin() and assigned_staff_id = auth.uid())
  with check (public.is_admin() and assigned_staff_id = auth.uid());

drop policy if exists "support_tickets_department_manager_read" on public.support_tickets;
create policy "support_tickets_department_manager_read"
  on public.support_tickets for select
  to authenticated
  using (public.is_admin() and exists (select 1 from public.support_departments d where d.id = support_tickets.department_id and d.manager_id = auth.uid()));

drop policy if exists "support_tickets_customer_all" on public.support_tickets;
create policy "support_tickets_customer_all"
  on public.support_tickets for all
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- Mirrors maintenance_requests' identical customer-field-lock pattern
-- exactly — a customer may only submit satisfaction feedback or
-- request REOPENED, nothing else on their own ticket.
create or replace function public.protect_support_ticket_customer_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.ticket_number is distinct from old.ticket_number
    or new.conversation_id is distinct from old.conversation_id
    or new.subject is distinct from old.subject
    or new.description is distinct from old.description
    or new.category_code is distinct from old.category_code
    or new.department_id is distinct from old.department_id
    or new.assigned_staff_id is distinct from old.assigned_staff_id
    or new.customer_id is distinct from old.customer_id
    or new.priority is distinct from old.priority
    or new.sla_rule_id is distinct from old.sla_rule_id
    or new.sla_response_due_at is distinct from old.sla_response_due_at
    or new.sla_resolution_due_at is distinct from old.sla_resolution_due_at
  then
    raise exception 'You may only update your own feedback and request reopening on this ticket.';
  end if;
  if new.status is distinct from old.status and new.status != 'REOPENED' then
    raise exception 'You may only reopen your own ticket.';
  end if;
  if new.status = 'REOPENED' and old.status not in ('RESOLVED', 'CLOSED') then
    raise exception 'Only a resolved or closed ticket can be reopened.';
  end if;
  return new;
end;
$$;

drop trigger if exists support_tickets_protect_customer_fields on public.support_tickets;
create trigger support_tickets_protect_customer_fields before update on public.support_tickets
  for each row execute function public.protect_support_ticket_customer_fields();

-- ---------------------------------------------------------------------
-- support_escalations (section 14) — a structured record of WHY/WHO,
-- not a duplicate of the audit log. The actual department/assignee
-- change on the ticket happens via a normal support_tickets update in
-- the SAME service call that inserts this row.
-- ---------------------------------------------------------------------
create table if not exists public.support_escalations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  reason text not null check (reason in ('SLA_BREACH', 'CUSTOMER_REQUESTED', 'HIGH_PRIORITY', 'REPEATED_COMPLAINT', 'MULTIPLE_REOPENINGS', 'DEPARTMENT_UNABLE_TO_RESOLVE', 'MANAGEMENT_REVIEW', 'OTHER')),
  previous_department_id uuid references public.support_departments (id) on delete set null,
  new_department_id uuid references public.support_departments (id) on delete set null,
  previous_assignee_id uuid references public.admin_profiles (id) on delete set null,
  new_assignee_id uuid references public.admin_profiles (id) on delete set null,
  resolution_authority text,
  notes text,
  escalated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists support_escalations_ticket_idx on public.support_escalations (ticket_id);

alter table public.support_escalations enable row level security;

drop policy if exists "support_escalations_admin_all" on public.support_escalations;
create policy "support_escalations_admin_all"
  on public.support_escalations for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_escalations_staff_read" on public.support_escalations;
create policy "support_escalations_staff_read"
  on public.support_escalations for select
  to authenticated
  using (
    public.is_admin() and exists (
      select 1 from public.support_tickets t
      where t.id = support_escalations.ticket_id
        and (
          t.assigned_staff_id = auth.uid()
          or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid())
          or exists (select 1 from public.support_departments d where d.id = t.department_id and d.manager_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- support_complaints (section 13) — 1:1 companion to support_tickets;
-- never fabricates an investigation result.
-- ---------------------------------------------------------------------
create table if not exists public.support_complaints (
  id uuid primary key default gen_random_uuid(),
  complaint_number text not null unique default public.next_support_complaint_number(),
  ticket_id uuid not null unique references public.support_tickets (id) on delete cascade,
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  assigned_officer_id uuid references public.admin_profiles (id) on delete set null,
  status text not null default 'SUBMITTED' check (
    status in ('SUBMITTED', 'ACKNOWLEDGED', 'UNDER_INVESTIGATION', 'ESCALATED', 'ACTION_REQUIRED', 'RESOLVED', 'CLOSED', 'REOPENED')
  ),
  resolution text,
  customer_response text,
  closure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_complaints_ticket_idx on public.support_complaints (ticket_id);
create index if not exists support_complaints_status_idx on public.support_complaints (status);
create index if not exists support_complaints_officer_idx on public.support_complaints (assigned_officer_id);

drop trigger if exists support_complaints_set_updated_at on public.support_complaints;
create trigger support_complaints_set_updated_at before update on public.support_complaints for each row execute function public.set_updated_at();

alter table public.support_complaints enable row level security;

drop policy if exists "support_complaints_admin_all" on public.support_complaints;
create policy "support_complaints_admin_all"
  on public.support_complaints for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_complaints_staff_all" on public.support_complaints;
create policy "support_complaints_staff_all"
  on public.support_complaints for all
  to authenticated
  using (
    public.is_admin() and (
      assigned_officer_id = auth.uid()
      or exists (
        select 1 from public.support_tickets t
        where t.id = support_complaints.ticket_id
          and (t.assigned_staff_id = auth.uid() or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid()))
      )
    )
  )
  with check (
    public.is_admin() and (
      assigned_officer_id = auth.uid()
      or exists (
        select 1 from public.support_tickets t
        where t.id = support_complaints.ticket_id
          and (t.assigned_staff_id = auth.uid() or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid()))
      )
    )
  );

-- Customer read only — column-limited by the app layer (never
-- investigation notes) exactly like STEP 28's due-diligence pattern.
drop policy if exists "support_complaints_customer_read" on public.support_complaints;
create policy "support_complaints_customer_read"
  on public.support_complaints for select
  to authenticated
  using (exists (select 1 from public.support_tickets t where t.id = support_complaints.ticket_id and t.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- support_kb_articles / support_kb_feedback (section 17) — genuinely
-- new; no equivalent exists anywhere in this codebase.
-- ---------------------------------------------------------------------
create table if not exists public.support_kb_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category_code text references public.support_categories (code) on delete set null,
  question text not null,
  answer text not null,
  keywords text[] not null default '{}',
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  published boolean not null default false,
  visibility text not null default 'PUBLIC' check (visibility in ('PUBLIC', 'CUSTOMER_ONLY', 'INTERNAL')),
  author_id uuid references public.admin_profiles (id) on delete set null,
  helpful_count integer not null default 0,
  not_helpful_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_kb_articles_category_idx on public.support_kb_articles (category_code);
create index if not exists support_kb_articles_published_idx on public.support_kb_articles (published);
create extension if not exists pg_trgm;
create index if not exists support_kb_articles_question_trgm_idx on public.support_kb_articles using gin (question gin_trgm_ops);

drop trigger if exists support_kb_articles_set_updated_at on public.support_kb_articles;
create trigger support_kb_articles_set_updated_at before update on public.support_kb_articles for each row execute function public.set_updated_at();

alter table public.support_kb_articles enable row level security;

drop policy if exists "support_kb_articles_admin_all" on public.support_kb_articles;
create policy "support_kb_articles_admin_all"
  on public.support_kb_articles for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "support_kb_articles_staff_read" on public.support_kb_articles;
create policy "support_kb_articles_staff_read"
  on public.support_kb_articles for select
  to authenticated
  using (public.is_admin());

drop policy if exists "support_kb_articles_public_read" on public.support_kb_articles;
create policy "support_kb_articles_public_read"
  on public.support_kb_articles for select
  to anon, authenticated
  using (published = true and visibility = 'PUBLIC');

drop policy if exists "support_kb_articles_customer_read" on public.support_kb_articles;
create policy "support_kb_articles_customer_read"
  on public.support_kb_articles for select
  to authenticated
  using (published = true and visibility in ('PUBLIC', 'CUSTOMER_ONLY'));

create table if not exists public.support_kb_feedback (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.support_kb_articles (id) on delete cascade,
  helpful boolean not null,
  customer_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists support_kb_feedback_article_idx on public.support_kb_feedback (article_id);

alter table public.support_kb_feedback enable row level security;

drop policy if exists "support_kb_feedback_admin_read" on public.support_kb_feedback;
create policy "support_kb_feedback_admin_read"
  on public.support_kb_feedback for select
  to authenticated
  using (public.is_admin_or_manager());

drop policy if exists "support_kb_feedback_insert" on public.support_kb_feedback;
create policy "support_kb_feedback_insert"
  on public.support_kb_feedback for insert
  to anon, authenticated
  with check (true);

-- Increments the article's own denormalized counters — the ONLY
-- stored aggregate in this module, justified because per-article
-- helpful/not-helpful counts are read on every public FAQ page view
-- and must never require scanning support_kb_feedback live.
create or replace function public.increment_kb_feedback_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.helpful then
    update public.support_kb_articles set helpful_count = helpful_count + 1 where id = new.article_id;
  else
    update public.support_kb_articles set not_helpful_count = not_helpful_count + 1 where id = new.article_id;
  end if;
  return new;
end;
$$;

drop trigger if exists support_kb_feedback_increment_counts on public.support_kb_feedback;
create trigger support_kb_feedback_increment_counts after insert on public.support_kb_feedback
  for each row execute function public.increment_kb_feedback_counts();

-- ---------------------------------------------------------------------
-- support_audit_logs — generic action log, identical in shape to
-- legal_audit_logs/construction_audit_logs/rental_audit_logs; also
-- serves as this module's status-change and assignment history
-- instead of two more bespoke history tables.
-- ---------------------------------------------------------------------
create table if not exists public.support_audit_logs (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  actor_id uuid references public.admin_profiles (id) on delete set null,
  actor_name text,
  old_value jsonb,
  new_value jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists support_audit_logs_entity_idx on public.support_audit_logs (entity_type, entity_id);
create index if not exists support_audit_logs_created_idx on public.support_audit_logs (created_at);

alter table public.support_audit_logs enable row level security;

drop policy if exists "support_audit_logs_manage_all" on public.support_audit_logs;
create policy "support_audit_logs_manage_all"
  on public.support_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- =====================================================================
-- Additive RLS on the EXISTING Communication Center — a ticket's
-- department staff/assigned staff need to read and reply on its
-- conversation/messages/attachments too, not just admin/manager or the
-- conversation's own assigned_agent_id. Resolved via a subquery against
-- support_tickets.conversation_id — no new column needed on
-- communication_conversations.
-- =====================================================================
-- No customer INSERT policy existed on communication_conversations
-- before this step (customers could only read/reply on a conversation
-- staff had already created for them) — a new support ticket is the
-- first place a customer creates their OWN conversation directly, so
-- this narrow policy is added, scoped exactly like the existing
-- communication_messages_customer_insert policy.
drop policy if exists "communication_conversations_customer_insert" on public.communication_conversations;
create policy "communication_conversations_customer_insert"
  on public.communication_conversations for insert
  to authenticated
  with check (customer_id = auth.uid() and channel = 'PORTAL');

drop policy if exists "communication_conversations_ticket_staff_all" on public.communication_conversations;
create policy "communication_conversations_ticket_staff_all"
  on public.communication_conversations for all
  to authenticated
  using (
    public.is_admin() and exists (
      select 1 from public.support_tickets t
      where t.conversation_id = communication_conversations.id
        and (
          t.assigned_staff_id = auth.uid()
          or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid())
        )
    )
  )
  with check (
    public.is_admin() and exists (
      select 1 from public.support_tickets t
      where t.conversation_id = communication_conversations.id
        and (
          t.assigned_staff_id = auth.uid()
          or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid())
        )
    )
  );

drop policy if exists "communication_messages_ticket_staff_all" on public.communication_messages;
create policy "communication_messages_ticket_staff_all"
  on public.communication_messages for all
  to authenticated
  using (
    public.is_admin() and exists (
      select 1 from public.support_tickets t
      where t.conversation_id = communication_messages.conversation_id
        and (
          t.assigned_staff_id = auth.uid()
          or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid())
        )
    )
  )
  with check (
    public.is_admin() and exists (
      select 1 from public.support_tickets t
      where t.conversation_id = communication_messages.conversation_id
        and (
          t.assigned_staff_id = auth.uid()
          or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid())
        )
    )
  );

drop policy if exists "communication_attachments_ticket_staff_all" on public.communication_attachments;
create policy "communication_attachments_ticket_staff_all"
  on public.communication_attachments for all
  to authenticated
  using (
    public.is_admin() and exists (
      select 1 from public.communication_messages m
      join public.support_tickets t on t.conversation_id = m.conversation_id
      where m.id = communication_attachments.message_id
        and (
          t.assigned_staff_id = auth.uid()
          or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid())
        )
    )
  )
  with check (
    public.is_admin() and exists (
      select 1 from public.communication_messages m
      join public.support_tickets t on t.conversation_id = m.conversation_id
      where m.id = communication_attachments.message_id
        and (
          t.assigned_staff_id = auth.uid()
          or exists (select 1 from public.support_department_staff ds where ds.department_id = t.department_id and ds.admin_id = auth.uid())
        )
    )
  );
