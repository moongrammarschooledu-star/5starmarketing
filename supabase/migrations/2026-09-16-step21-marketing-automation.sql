-- =====================================================================
-- STEP 21 — Property Marketing & Lead Conversion Automation System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTE: STEP 15 already built campaigns, campaign_events, and the
-- full first/last-touch UTM attribution system on `leads`. STEP 14
-- already built automatic lead assignment (Round Robin / Least Assigned
-- Leads, as BEFORE INSERT trigger auto_assign_new_lead) and follow_ups.
-- STEP 17 already built the CRM (lead_notes, lead_assignment_history,
-- communication_log) and crmAnalyticsService's agent-performance/response
-- -time computations. None of that is touched or duplicated here.
--
-- What's genuinely new in this migration: lead scoring (rules + history +
-- score/score_level/auto_priority on leads), an admin-configurable
-- automation workflow engine (trigger -> condition -> action, with an
-- automation_queue for the one trigger — NEW_LEAD — that a plain INSERT
-- can reach from an anonymous visitor before any app code sees the row),
-- follow-up scheduling rules, marketing templates (Email/WhatsApp/SMS —
-- separate from the existing whatsapp_templates table used for manual
-- bulk sending, which is untouched), tags/segments, and SLA response-time
-- tracking. Nothing here claims a message was ever actually sent unless a
-- real provider is configured — see src/lib/marketing/providers.ts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- lead_scoring_rules (sections 10-13) — admin-configurable, seeded with
-- the spec's own example point values. Negative rules (Invalid Contact,
-- Unreachable, etc.) never delete a lead — see lead_score_history.
-- ---------------------------------------------------------------------
create table if not exists public.lead_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  event_type text not null unique check (
    event_type in (
      'NEW_LEAD', 'PHONE_PROVIDED', 'WHATSAPP_INQUIRY', 'BUDGET_PROVIDED', 'SITE_VISIT_REQUESTED',
      'BROCHURE_DOWNLOADED', 'PAYMENT_PLAN_REQUESTED', 'INVESTMENT_CALCULATOR_USED', 'MULTIPLE_PROPERTY_VIEWS',
      'RETURN_VISITOR', 'DEAL_CREATED', 'DEAL_COMPLETED',
      'INVALID_CONTACT', 'UNREACHABLE', 'NOT_INTERESTED', 'DUPLICATE_LEAD', 'SPAM'
    )
  ),
  label text not null,
  points integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.lead_scoring_rules (event_type, label, points) values
  ('NEW_LEAD', 'Property inquiry submitted', 10),
  ('PHONE_PROVIDED', 'Phone number provided', 10),
  ('WHATSAPP_INQUIRY', 'WhatsApp inquiry', 15),
  ('BUDGET_PROVIDED', 'Budget provided', 10),
  ('SITE_VISIT_REQUESTED', 'Site visit requested', 20),
  ('BROCHURE_DOWNLOADED', 'Brochure downloaded', 5),
  ('PAYMENT_PLAN_REQUESTED', 'Payment plan requested', 15),
  ('INVESTMENT_CALCULATOR_USED', 'Investment calculator used', 10),
  ('MULTIPLE_PROPERTY_VIEWS', 'Multiple property views', 5),
  ('RETURN_VISITOR', 'Return visitor', 5),
  ('DEAL_CREATED', 'Deal created', 50),
  ('DEAL_COMPLETED', 'Deal completed', 100),
  ('INVALID_CONTACT', 'Invalid contact details', -20),
  ('UNREACHABLE', 'Unreachable after repeated attempts', -10),
  ('NOT_INTERESTED', 'Explicitly not interested', -30),
  ('DUPLICATE_LEAD', 'Duplicate lead', -15),
  ('SPAM', 'Spam submission', -50)
on conflict (event_type) do nothing;

alter table public.lead_scoring_rules enable row level security;

drop policy if exists "lead_scoring_rules_admin_all" on public.lead_scoring_rules;
create policy "lead_scoring_rules_admin_all"
  on public.lead_scoring_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_scoring_rules_staff_read" on public.lead_scoring_rules;
create policy "lead_scoring_rules_staff_read"
  on public.lead_scoring_rules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- lead_score_history (section 13) — one row per point-change, so the
-- sales team can see exactly why a lead is hot.
-- ---------------------------------------------------------------------
create table if not exists public.lead_score_history (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads (id) on delete cascade,
  rule_id uuid references public.lead_scoring_rules (id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists lead_score_history_lead_idx on public.lead_score_history (lead_id);
create index if not exists lead_score_history_created_idx on public.lead_score_history (created_at);

alter table public.lead_score_history enable row level security;

drop policy if exists "lead_score_history_admin_all" on public.lead_score_history;
create policy "lead_score_history_admin_all"
  on public.lead_score_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_score_history_agent_read" on public.lead_score_history;
create policy "lead_score_history_agent_read"
  on public.lead_score_history for select
  to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_score_history.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "lead_score_history_agent_insert" on public.lead_score_history;
create policy "lead_score_history_agent_insert"
  on public.lead_score_history for insert
  to authenticated
  with check (exists (select 1 from public.leads l where l.id = lead_score_history.lead_id and l.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- leads — score/score_level/auto_priority (sections 10-14). `priority`
-- (STEP 17) stays the manual, agent-editable field; `auto_priority` is
-- the system's own suggestion, kept separately so one never silently
-- overwrites the other.
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists score integer not null default 0;
alter table public.leads add column if not exists score_level text not null default 'COLD' check (score_level in ('COLD', 'WARM', 'HOT', 'VERY_HOT'));
alter table public.leads add column if not exists auto_priority text check (auto_priority is null or auto_priority in ('Low', 'Medium', 'High', 'Urgent'));
alter table public.leads add column if not exists sla_alert_sent_at timestamptz;

create index if not exists leads_score_idx on public.leads (score);
create index if not exists leads_score_level_idx on public.leads (score_level);

-- website_settings — configurable score-level thresholds (section 11).
alter table public.website_settings add column if not exists lead_score_threshold_warm integer not null default 20;
alter table public.website_settings add column if not exists lead_score_threshold_hot integer not null default 40;
alter table public.website_settings add column if not exists lead_score_threshold_very_hot integer not null default 70;

-- ---------------------------------------------------------------------
-- lead_sla_rules (section 42) — configurable response-time SLA per score
-- level. Breach detection is computed at read time (elapsed time vs. this
-- limit, checked against whether any Outgoing communication_log entry
-- exists yet) rather than stored, matching this codebase's "never store
-- a value real-time computation already gives you" convention.
-- ---------------------------------------------------------------------
create table if not exists public.lead_sla_rules (
  score_level text primary key check (score_level in ('COLD', 'WARM', 'HOT', 'VERY_HOT')),
  response_minutes integer not null,
  active boolean not null default true
);

insert into public.lead_sla_rules (score_level, response_minutes) values
  ('VERY_HOT', 10),
  ('HOT', 15),
  ('WARM', 60),
  ('COLD', 240)
on conflict (score_level) do nothing;

alter table public.lead_sla_rules enable row level security;

drop policy if exists "lead_sla_rules_admin_all" on public.lead_sla_rules;
create policy "lead_sla_rules_admin_all"
  on public.lead_sla_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_sla_rules_staff_read" on public.lead_sla_rules;
create policy "lead_sla_rules_staff_read"
  on public.lead_sla_rules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- follow_ups — source/automation_group_key (sections 18-19). Tags a
-- follow-up as system-generated so that completing/cancelling ANY task
-- in the same automation group (same lead + same trigger event) can
-- auto-cancel the rest — the closest safe equivalent to "if no response,
-- escalate" without a background scheduler in this deployment (there
-- isn't one — see followUpService.markOverdue's own comment).
-- ---------------------------------------------------------------------
alter table public.follow_ups add column if not exists source text not null default 'manual' check (source in ('manual', 'automation'));
alter table public.follow_ups add column if not exists automation_group_key text;

create index if not exists follow_ups_automation_group_idx on public.follow_ups (automation_group_key) where automation_group_key is not null;

-- ---------------------------------------------------------------------
-- follow_up_rules (sections 18-19) — admin-configurable follow-up
-- scheduling per lifecycle event. Every matching active rule is
-- pre-scheduled at once (there's no scheduler to check "did anyone
-- respond yet" partway through); see follow_ups.automation_group_key
-- above for how completing one cancels the rest.
-- ---------------------------------------------------------------------
create table if not exists public.follow_up_rules (
  id uuid primary key default gen_random_uuid(),
  trigger_event text not null check (
    trigger_event in (
      'LEAD_CREATED', 'LEAD_QUALIFIED', 'SITE_VISIT_REQUESTED', 'SITE_VISIT_COMPLETED',
      'PROPOSAL_SENT', 'NEGOTIATION_STARTED', 'DEAL_CREATED', 'DEAL_BOOKED', 'PAYMENT_PENDING'
    )
  ),
  delay_minutes integer not null default 0,
  follow_up_type text not null default 'Call' check (follow_up_type in ('Call', 'WhatsApp', 'Meeting', 'Site Visit', 'Other')),
  note_template text not null default '',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists follow_up_rules_trigger_idx on public.follow_up_rules (trigger_event);

insert into public.follow_up_rules (trigger_event, delay_minutes, follow_up_type, note_template, sort_order) values
  ('LEAD_CREATED', 15, 'Call', 'Call within 15 minutes of inquiry.', 10),
  ('LEAD_CREATED', 240, 'Call', 'Follow up — no contact made yet (4 hours).', 20),
  ('LEAD_CREATED', 1440, 'WhatsApp', 'Next-day follow-up.', 30),
  ('LEAD_CREATED', 4320, 'Call', '3-day follow-up.', 40),
  ('SITE_VISIT_COMPLETED', 60, 'Call', 'Follow up after site visit.', 10),
  ('DEAL_BOOKED', 1440, 'Call', 'Confirm next payment/documentation steps.', 10)
on conflict do nothing;

alter table public.follow_up_rules enable row level security;

drop policy if exists "follow_up_rules_admin_all" on public.follow_up_rules;
create policy "follow_up_rules_admin_all"
  on public.follow_up_rules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "follow_up_rules_staff_read" on public.follow_up_rules;
create policy "follow_up_rules_staff_read"
  on public.follow_up_rules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- marketing_workflows / marketing_workflow_actions (sections 20-22) — a
-- structured (not drag-and-drop) trigger -> condition -> action engine.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_workflows (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trigger_type text not null check (
    trigger_type in (
      'NEW_LEAD', 'LEAD_SCORE_CHANGED', 'LEAD_STATUS_CHANGED', 'LEAD_CONVERTED', 'SITE_VISIT_BOOKED',
      'SITE_VISIT_COMPLETED', 'BROCHURE_REQUESTED', 'PAYMENT_PLAN_REQUESTED', 'INVESTMENT_INQUIRY',
      'DEAL_CREATED', 'DEAL_BOOKED', 'PAYMENT_OVERDUE', 'CUSTOMER_CREATED', 'DOCUMENT_REQUIRED'
    )
  ),
  conditions jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketing_workflows_set_updated_at on public.marketing_workflows;
create trigger marketing_workflows_set_updated_at before update on public.marketing_workflows for each row execute function public.set_updated_at();

create index if not exists marketing_workflows_trigger_idx on public.marketing_workflows (trigger_type);
create index if not exists marketing_workflows_active_idx on public.marketing_workflows (active);

alter table public.marketing_workflows enable row level security;

drop policy if exists "marketing_workflows_admin_all" on public.marketing_workflows;
create policy "marketing_workflows_admin_all"
  on public.marketing_workflows for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

create table if not exists public.marketing_workflow_actions (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.marketing_workflows (id) on delete cascade,
  sort_order integer not null default 0,
  action_type text not null check (
    action_type in (
      'CREATE_TASK', 'ASSIGN_AGENT', 'CHANGE_PRIORITY', 'ADD_TAG', 'REMOVE_TAG', 'CREATE_NOTIFICATION',
      'SEND_EMAIL', 'SEND_WHATSAPP', 'SEND_SMS', 'CREATE_FOLLOWUP', 'UPDATE_STATUS'
    )
  ),
  action_config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists marketing_workflow_actions_workflow_idx on public.marketing_workflow_actions (workflow_id);

alter table public.marketing_workflow_actions enable row level security;

drop policy if exists "marketing_workflow_actions_admin_all" on public.marketing_workflow_actions;
create policy "marketing_workflow_actions_admin_all"
  on public.marketing_workflow_actions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- Seed two default, fully editable/disableable workflows so the engine
-- demonstrably works out of the box (sections 66-67).
insert into public.marketing_workflows (id, name, description, trigger_type, conditions, active)
values
  ('00000000-0000-0000-0000-000000000021', 'Hot Lead Alert', 'Notifies the assigned agent (or a manager, if unassigned) the moment a lead becomes Hot or Very Hot.', 'LEAD_SCORE_CHANGED', '[{"field":"scoreLevel","operator":"in","value":["HOT","VERY_HOT"]}]'::jsonb, true),
  ('00000000-0000-0000-0000-000000000022', 'New Lead Welcome Task', 'Creates an immediate call task the moment any new lead arrives.', 'NEW_LEAD', '[]'::jsonb, true)
on conflict (id) do nothing;

insert into public.marketing_workflow_actions (workflow_id, sort_order, action_type, action_config)
values
  ('00000000-0000-0000-0000-000000000021', 10, 'CREATE_NOTIFICATION', '{"title":"High-priority lead detected","message":"{{customer_name}} is now a {{score_level}} lead (score {{score}}). Property: {{property_title}}. Source: {{source}}."}'::jsonb),
  ('00000000-0000-0000-0000-000000000022', 10, 'CREATE_FOLLOWUP', '{"delayMinutes":15,"type":"Call","note":"Call within 15 minutes of inquiry."}'::jsonb)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- automation_queue (section 57) — the ONE place events reach the
-- automation engine without an app-level call site: an anonymous
-- visitor's lead insert (leadService.create never reads the row back —
-- see its own comment on why). apply_lead_signals() below enqueues here;
-- automationService.processQueuedEvents() drains it opportunistically
-- from the CRM/Marketing dashboards (same "no background job runner in
-- this deployment" pattern as followUpService.markOverdue). Every other
-- trigger type in marketing_workflows fires immediately, synchronously,
-- from a real app-level call site.
-- ---------------------------------------------------------------------
create table if not exists public.automation_queue (
  id uuid primary key default gen_random_uuid(),
  trigger_type text not null,
  lead_id uuid references public.leads (id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists automation_queue_unprocessed_idx on public.automation_queue (created_at) where not processed;

alter table public.automation_queue enable row level security;

drop policy if exists "automation_queue_admin_all" on public.automation_queue;
create policy "automation_queue_admin_all"
  on public.automation_queue for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- automation_logs (sections 58-59) — every action a workflow attempted,
-- successful or not. dedup_key + the partial unique index below is the
-- actual idempotency guarantee (section 57): the same workflow+lead+
-- trigger+action can never log — or execute — twice.
-- ---------------------------------------------------------------------
create table if not exists public.automation_logs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid references public.marketing_workflows (id) on delete set null,
  workflow_name text,
  trigger_type text not null,
  lead_id uuid references public.leads (id) on delete set null,
  action_type text,
  status text not null check (status in ('PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'SKIPPED')),
  error text,
  dedup_key text,
  executed_at timestamptz not null default now()
);

create index if not exists automation_logs_workflow_idx on public.automation_logs (workflow_id);
create index if not exists automation_logs_lead_idx on public.automation_logs (lead_id);
create index if not exists automation_logs_executed_idx on public.automation_logs (executed_at);
create unique index if not exists automation_logs_dedup_idx on public.automation_logs (dedup_key) where dedup_key is not null;

alter table public.automation_logs enable row level security;

drop policy if exists "automation_logs_admin_all" on public.automation_logs;
create policy "automation_logs_admin_all"
  on public.automation_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- marketing_templates (sections 25-27) — Email/WhatsApp/SMS content for
-- AUTOMATION actions. Deliberately separate from the existing
-- whatsapp_templates table (STEP 6, used for manual bulk WhatsApp
-- sending) — never touched, so nothing already using it breaks.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null check (channel in ('Email', 'WhatsApp', 'SMS')),
  category text not null default 'Other' check (
    category in (
      'Lead Received', 'Property Inquiry', 'Site Visit Confirmation', 'Brochure Request',
      'Follow-up Reminder', 'Agreement Ready', 'Payment Reminder', 'Thank You', 'Lead Re-engagement', 'Other'
    )
  ),
  subject text,
  content text not null default '',
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  updated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketing_templates_set_updated_at on public.marketing_templates;
create trigger marketing_templates_set_updated_at before update on public.marketing_templates for each row execute function public.set_updated_at();

create index if not exists marketing_templates_channel_idx on public.marketing_templates (channel);
create index if not exists marketing_templates_active_idx on public.marketing_templates (active);

alter table public.marketing_templates enable row level security;

drop policy if exists "marketing_templates_admin_all" on public.marketing_templates;
create policy "marketing_templates_admin_all"
  on public.marketing_templates for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "marketing_templates_staff_read" on public.marketing_templates;
create policy "marketing_templates_staff_read"
  on public.marketing_templates for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- marketing_tags / lead_tags (section 28) — free-form, admin-managed.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz not null default now()
);

alter table public.marketing_tags enable row level security;

drop policy if exists "marketing_tags_admin_all" on public.marketing_tags;
create policy "marketing_tags_admin_all"
  on public.marketing_tags for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "marketing_tags_staff_read" on public.marketing_tags;
create policy "marketing_tags_staff_read"
  on public.marketing_tags for select
  to authenticated
  using (public.is_admin());

create table if not exists public.lead_tags (
  lead_id uuid not null references public.leads (id) on delete cascade,
  tag_id uuid not null references public.marketing_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lead_id, tag_id)
);

create index if not exists lead_tags_lead_idx on public.lead_tags (lead_id);
create index if not exists lead_tags_tag_idx on public.lead_tags (tag_id);

alter table public.lead_tags enable row level security;

drop policy if exists "lead_tags_admin_all" on public.lead_tags;
create policy "lead_tags_admin_all"
  on public.lead_tags for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "lead_tags_agent_read" on public.lead_tags;
create policy "lead_tags_agent_read"
  on public.lead_tags for select
  to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_tags.lead_id and l.assigned_agent_id = auth.uid()));

-- An agent may tag/untag their OWN assigned leads (CRM action, not
-- marketing administration — creating/deleting the tags themselves in
-- the global marketing_tags table stays admin/manager-only above).
drop policy if exists "lead_tags_agent_insert" on public.lead_tags;
create policy "lead_tags_agent_insert"
  on public.lead_tags for insert
  to authenticated
  with check (exists (select 1 from public.leads l where l.id = lead_tags.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "lead_tags_agent_delete" on public.lead_tags;
create policy "lead_tags_agent_delete"
  on public.lead_tags for delete
  to authenticated
  using (exists (select 1 from public.leads l where l.id = lead_tags.lead_id and l.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- marketing_segments (sections 29-30) — a SAVED filter definition, not a
-- stored membership list; marketingSegmentService resolves it against
-- live `leads` data every time it's viewed.
-- ---------------------------------------------------------------------
create table if not exists public.marketing_segments (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  conditions jsonb not null default '[]'::jsonb,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists marketing_segments_set_updated_at on public.marketing_segments;
create trigger marketing_segments_set_updated_at before update on public.marketing_segments for each row execute function public.set_updated_at();

alter table public.marketing_segments enable row level security;

drop policy if exists "marketing_segments_admin_all" on public.marketing_segments;
create policy "marketing_segments_admin_all"
  on public.marketing_segments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- customer_profiles — communication consent (section 32). Default true
-- (an existing customer already has an active relationship with the
-- business); a customer can opt out from their own profile settings.
-- ---------------------------------------------------------------------
alter table public.customer_profiles add column if not exists email_opt_in boolean not null default true;
alter table public.customer_profiles add column if not exists whatsapp_opt_in boolean not null default true;
alter table public.customer_profiles add column if not exists sms_opt_in boolean not null default true;
alter table public.customer_profiles add column if not exists marketing_opt_in boolean not null default true;

-- ---------------------------------------------------------------------
-- apply_lead_signals() (sections 10-14, 21, 57) — AFTER INSERT on leads.
-- Computes the baseline score from real row data (never guessed), writes
-- lead_score_history, sets score/score_level/auto_priority, and enqueues
-- the trigger(s) an anonymous visitor's own request can never reach
-- app-level automation code for directly. Mirrors the existing
-- on_lead_auto_assigned trigger's style exactly.
-- ---------------------------------------------------------------------
create or replace function public.apply_lead_signals()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_total integer := 0;
  v_level text;
  v_auto_priority text;
  v_rule record;
  v_event_types text[] := array['NEW_LEAD'];
  v_warm integer;
  v_hot integer;
  v_very_hot integer;
begin
  if new.phone is not null and new.phone <> '' then
    v_event_types := array_append(v_event_types, 'PHONE_PROVIDED');
  end if;
  if new.budget_min is not null or new.budget_max is not null then
    v_event_types := array_append(v_event_types, 'BUDGET_PROVIDED');
  end if;
  if new.source = 'whatsapp' then
    v_event_types := array_append(v_event_types, 'WHATSAPP_INQUIRY');
  end if;
  if new.lead_type = 'Site Visit' then
    v_event_types := array_append(v_event_types, 'SITE_VISIT_REQUESTED');
  end if;
  if new.lead_type = 'Brochure Request' then
    v_event_types := array_append(v_event_types, 'BROCHURE_DOWNLOADED');
  end if;
  if new.lead_type = 'Payment Plan Request' then
    v_event_types := array_append(v_event_types, 'PAYMENT_PLAN_REQUESTED');
  end if;
  if new.lead_type = 'Investment Inquiry' then
    v_event_types := array_append(v_event_types, 'INVESTMENT_CALCULATOR_USED');
  end if;

  for v_rule in select * from public.lead_scoring_rules where active and event_type = any(v_event_types) loop
    insert into public.lead_score_history (lead_id, rule_id, points, reason) values (new.id, v_rule.id, v_rule.points, v_rule.label);
    v_total := v_total + v_rule.points;
  end loop;

  select lead_score_threshold_warm, lead_score_threshold_hot, lead_score_threshold_very_hot
  into v_warm, v_hot, v_very_hot
  from public.website_settings limit 1;

  v_level := case
    when v_total >= coalesce(v_very_hot, 70) then 'VERY_HOT'
    when v_total >= coalesce(v_hot, 40) then 'HOT'
    when v_total >= coalesce(v_warm, 20) then 'WARM'
    else 'COLD'
  end;
  v_auto_priority := case v_level when 'VERY_HOT' then 'Urgent' when 'HOT' then 'High' when 'WARM' then 'Medium' else 'Low' end;

  update public.leads set score = v_total, score_level = v_level, auto_priority = v_auto_priority where id = new.id;

  insert into public.automation_queue (trigger_type, lead_id, payload) values ('NEW_LEAD', new.id, '{}'::jsonb);
  if new.lead_type = 'Brochure Request' then
    insert into public.automation_queue (trigger_type, lead_id, payload) values ('BROCHURE_REQUESTED', new.id, '{}'::jsonb);
  end if;
  if new.lead_type = 'Payment Plan Request' then
    insert into public.automation_queue (trigger_type, lead_id, payload) values ('PAYMENT_PLAN_REQUESTED', new.id, '{}'::jsonb);
  end if;
  if new.lead_type = 'Investment Inquiry' then
    insert into public.automation_queue (trigger_type, lead_id, payload) values ('INVESTMENT_INQUIRY', new.id, '{}'::jsonb);
  end if;

  return new;
end;
$$;

drop trigger if exists apply_lead_signals on public.leads;
create trigger apply_lead_signals after insert on public.leads
  for each row execute function public.apply_lead_signals();
