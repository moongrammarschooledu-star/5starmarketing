-- =====================================================================
-- STEP 30 — Real Estate AI Assistant + Smart AI Automation System
-- =====================================================================
--
-- DESIGN NOTES:
-- This module is purely additive. It does not touch or duplicate any
-- existing table — it reads authorized data from existing services at
-- request time (leads, properties, deals, rentals, leases, support
-- tickets, construction, maintenance, accounting) and only persists
-- its OWN AI-specific state here: conversations/messages, per-assistant
-- configuration, tool call logs, human-approval queue for write
-- actions, automation rules + run history, generated insights, curated
-- knowledge sources, and usage records.
--
-- Reuses existing conventions: uuid PKs, created_at/updated_at,
-- public.is_admin()/is_admin_or_manager() helpers, customer_id =
-- auth.uid() pattern for the customer-portal side, RLS on every table.
--
-- No new admin role is introduced — AI feature access is governed by
-- the existing AdminRole via ai_assistant_configs (application-layer
-- permission table) plus RLS on the rows themselves.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- ai_assistant_configs — admin-controlled per-assistant settings.
-- One row per assistant type. Global kill switch lives on each row's
-- `enabled` (and a single GLOBAL row with assistant_type = 'GLOBAL'
-- acts as the master enable/disable for the whole AI layer).
-- ---------------------------------------------------------------------
create table if not exists public.ai_assistant_configs (
  id uuid primary key default gen_random_uuid(),
  assistant_type text not null unique check (assistant_type in (
    'GLOBAL', 'ADMIN', 'SALES', 'SUPPORT', 'RENTAL', 'CONSTRUCTION', 'ACCOUNTING', 'CUSTOMER_PORTAL'
  )),
  enabled boolean not null default true,
  allowed_tools text[] not null default '{}',
  allow_write_actions boolean not null default false,
  require_approval_for_write boolean not null default true,
  conversation_retention_days integer not null default 180,
  daily_request_limit integer,
  model text not null default 'anthropic/claude-sonnet-4.5',
  system_notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ai_assistant_configs (assistant_type, enabled, allowed_tools, allow_write_actions, require_approval_for_write)
values
  ('GLOBAL', false, '{}', false, true),
  ('ADMIN', true, '{search_properties,get_property_details,search_leads,get_lead_summary,get_customer_summary,get_deal_summary,get_rental_summary,get_lease_summary,get_payment_status,get_support_ticket,search_knowledge_base,get_construction_project_summary,get_maintenance_summary,get_business_dashboard_summary,generate_report_summary}', true, true),
  ('SALES', true, '{search_properties,get_property_details,search_leads,get_lead_summary,get_customer_summary,get_deal_summary,search_knowledge_base}', true, true),
  ('SUPPORT', true, '{get_support_ticket,search_knowledge_base,get_customer_summary}', true, true),
  ('RENTAL', true, '{search_properties,get_property_details,get_rental_summary,get_lease_summary,get_payment_status}', true, true),
  ('CONSTRUCTION', true, '{get_construction_project_summary,get_maintenance_summary}', false, true),
  ('ACCOUNTING', true, '{get_payment_status,generate_report_summary,get_business_dashboard_summary}', false, true),
  ('CUSTOMER_PORTAL', true, '{search_properties,get_property_details,search_knowledge_base,get_support_ticket,get_rental_summary,get_lease_summary}', true, true)
on conflict (assistant_type) do nothing;

-- ---------------------------------------------------------------------
-- ai_conversations / ai_messages — chat history, admin + customer.
-- ---------------------------------------------------------------------
create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  assistant_type text not null check (assistant_type in (
    'ADMIN', 'SALES', 'SUPPORT', 'RENTAL', 'CONSTRUCTION', 'ACCOUNTING', 'CUSTOMER_PORTAL'
  )),
  admin_id uuid references auth.users(id) on delete cascade,
  customer_id uuid references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_conversations_owner_chk check (
    (admin_id is not null and customer_id is null) or (admin_id is null and customer_id is not null)
  )
);
create index if not exists ai_conversations_admin_idx on public.ai_conversations(admin_id, updated_at desc);
create index if not exists ai_conversations_customer_idx on public.ai_conversations(customer_id, updated_at desc);

create table if not exists public.ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.ai_conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system', 'tool')),
  content text not null default '',
  tool_calls jsonb,
  tool_results jsonb,
  source_references jsonb not null default '[]',
  feedback text check (feedback in ('up', 'down')),
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on public.ai_messages(conversation_id, created_at);

-- ---------------------------------------------------------------------
-- ai_tool_logs — every server-side tool invocation (sensitive-access log).
-- ---------------------------------------------------------------------
create table if not exists public.ai_tool_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  message_id uuid references public.ai_messages(id) on delete set null,
  actor_admin_id uuid references auth.users(id) on delete set null,
  actor_customer_id uuid references auth.users(id) on delete set null,
  assistant_type text not null,
  tool_name text not null,
  input jsonb not null default '{}',
  record_ids text[] not null default '{}',
  status text not null check (status in ('SUCCESS', 'DENIED', 'ERROR')),
  error_message text,
  duration_ms integer,
  created_at timestamptz not null default now()
);
create index if not exists ai_tool_logs_actor_idx on public.ai_tool_logs(actor_admin_id, created_at desc);
create index if not exists ai_tool_logs_tool_idx on public.ai_tool_logs(tool_name, created_at desc);

-- ---------------------------------------------------------------------
-- ai_action_requests — the CONFIRMED-ACTION / human-approval queue.
-- ---------------------------------------------------------------------
create table if not exists public.ai_action_requests (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.ai_conversations(id) on delete set null,
  requested_by_admin_id uuid references auth.users(id) on delete set null,
  requested_by_customer_id uuid references auth.users(id) on delete set null,
  assistant_type text not null,
  action_type text not null,
  tier text not null default 'CONFIRMED' check (tier in ('SUGGESTED', 'CONFIRMED')),
  target_table text,
  target_record_id text,
  summary text not null,
  payload jsonb not null default '{}',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED', 'EXECUTED', 'FAILED', 'CANCELLED')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  executed_at timestamptz,
  execution_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_action_requests_status_idx on public.ai_action_requests(status, created_at desc);

-- ---------------------------------------------------------------------
-- ai_automation_rules / ai_automation_runs — trigger -> condition ->
-- suggested action -> (approval) -> execution, with audit trail.
-- ---------------------------------------------------------------------
create table if not exists public.ai_automation_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  trigger_type text not null check (trigger_type in (
    'NEW_LEAD', 'LEAD_INACTIVE', 'NEW_INQUIRY', 'RENT_OVERDUE', 'LEASE_EXPIRY',
    'SUPPORT_TICKET_CREATED', 'SLA_RISK', 'CONSTRUCTION_DELAY', 'MAINTENANCE_REQUEST',
    'PAYMENT_RECEIVED', 'DOCUMENT_EXPIRY'
  )),
  conditions jsonb not null default '{}',
  action_type text not null check (action_type in (
    'CREATE_TASK', 'CREATE_NOTIFICATION', 'SUGGEST_DRAFT', 'ASSIGN_QUEUE', 'REQUEST_HUMAN_REVIEW'
  )),
  action_config jsonb not null default '{}',
  requires_approval boolean not null default true,
  is_enabled boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_automation_runs (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid not null references public.ai_automation_rules(id) on delete cascade,
  trigger_context jsonb not null default '{}',
  idempotency_key text not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'ANALYZED', 'SUGGESTED', 'AWAITING_APPROVAL', 'EXECUTED', 'SKIPPED', 'FAILED')),
  ai_analysis text,
  suggested_action jsonb,
  action_request_id uuid references public.ai_action_requests(id) on delete set null,
  attempt_count integer not null default 1,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (rule_id, idempotency_key)
);
create index if not exists ai_automation_runs_rule_idx on public.ai_automation_runs(rule_id, created_at desc);

-- ---------------------------------------------------------------------
-- ai_insights — smart insights dashboard.
-- ---------------------------------------------------------------------
create table if not exists public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in (
    'LEAD_INACTIVITY', 'OVERDUE_TASK', 'LEASE_EXPIRY', 'OUTSTANDING_PAYMENT', 'SUPPORT_SLA_RISK',
    'CONSTRUCTION_DELAY', 'MAINTENANCE_BACKLOG', 'LOW_OCCUPANCY', 'UNUSUAL_CHANGE'
  )),
  title text not null,
  description text not null,
  data_source text not null,
  time_period text not null,
  reason text not null,
  related_records jsonb not null default '[]',
  confidence text not null default 'MEDIUM' check (confidence in ('LOW', 'MEDIUM', 'HIGH')),
  status text not null default 'OPEN' check (status in ('OPEN', 'ACKNOWLEDGED', 'DISMISSED')),
  generated_at timestamptz not null default now(),
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz
);
create index if not exists ai_insights_category_idx on public.ai_insights(category, status, generated_at desc);

-- ---------------------------------------------------------------------
-- ai_knowledge_sources — curated KB the AI prefers over unverified data.
-- ---------------------------------------------------------------------
create table if not exists public.ai_knowledge_sources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  source_type text not null default 'MANUAL' check (source_type in ('MANUAL', 'FAQ', 'POLICY', 'DOCUMENT')),
  department text,
  visibility text not null default 'INTERNAL' check (visibility in ('INTERNAL', 'CUSTOMER')),
  is_published boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_knowledge_sources_visibility_idx on public.ai_knowledge_sources(is_published, visibility);

-- ---------------------------------------------------------------------
-- ai_usage_records — request/tool/error/latency tracking.
-- ---------------------------------------------------------------------
create table if not exists public.ai_usage_records (
  id uuid primary key default gen_random_uuid(),
  assistant_type text not null,
  actor_admin_id uuid references auth.users(id) on delete set null,
  actor_customer_id uuid references auth.users(id) on delete set null,
  request_count integer not null default 1,
  tool_call_count integer not null default 0,
  error_count integer not null default 0,
  latency_ms integer,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(10,4),
  created_at timestamptz not null default now()
);
create index if not exists ai_usage_records_created_idx on public.ai_usage_records(created_at desc);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists ai_assistant_configs_updated_at on public.ai_assistant_configs;
create trigger ai_assistant_configs_updated_at before update on public.ai_assistant_configs
  for each row execute function public.set_updated_at();

drop trigger if exists ai_conversations_updated_at on public.ai_conversations;
create trigger ai_conversations_updated_at before update on public.ai_conversations
  for each row execute function public.set_updated_at();

drop trigger if exists ai_action_requests_updated_at on public.ai_action_requests;
create trigger ai_action_requests_updated_at before update on public.ai_action_requests
  for each row execute function public.set_updated_at();

drop trigger if exists ai_automation_rules_updated_at on public.ai_automation_rules;
create trigger ai_automation_rules_updated_at before update on public.ai_automation_rules
  for each row execute function public.set_updated_at();

drop trigger if exists ai_automation_runs_updated_at on public.ai_automation_runs;
create trigger ai_automation_runs_updated_at before update on public.ai_automation_runs
  for each row execute function public.set_updated_at();

drop trigger if exists ai_knowledge_sources_updated_at on public.ai_knowledge_sources;
create trigger ai_knowledge_sources_updated_at before update on public.ai_knowledge_sources
  for each row execute function public.set_updated_at();

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.ai_assistant_configs enable row level security;
alter table public.ai_conversations enable row level security;
alter table public.ai_messages enable row level security;
alter table public.ai_tool_logs enable row level security;
alter table public.ai_action_requests enable row level security;
alter table public.ai_automation_rules enable row level security;
alter table public.ai_automation_runs enable row level security;
alter table public.ai_insights enable row level security;
alter table public.ai_knowledge_sources enable row level security;
alter table public.ai_usage_records enable row level security;

-- ai_assistant_configs: admin/manager manage; any admin can read (to know
-- what's enabled for them); customers never touch this table directly.
drop policy if exists ai_assistant_configs_admin_select on public.ai_assistant_configs;
create policy ai_assistant_configs_admin_select on public.ai_assistant_configs for select
  using (public.is_admin());
drop policy if exists ai_assistant_configs_manager_write on public.ai_assistant_configs;
create policy ai_assistant_configs_manager_write on public.ai_assistant_configs for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ai_conversations: owner-only (admin owns theirs, customer owns theirs).
drop policy if exists ai_conversations_admin_own on public.ai_conversations;
create policy ai_conversations_admin_own on public.ai_conversations for all
  using (admin_id = auth.uid()) with check (admin_id = auth.uid());
drop policy if exists ai_conversations_customer_own on public.ai_conversations;
create policy ai_conversations_customer_own on public.ai_conversations for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());
drop policy if exists ai_conversations_admin_oversight on public.ai_conversations;
create policy ai_conversations_admin_oversight on public.ai_conversations for select
  using (public.is_admin_or_manager());

-- ai_messages: follows parent conversation ownership.
drop policy if exists ai_messages_owner on public.ai_messages;
create policy ai_messages_owner on public.ai_messages for all
  using (exists (
    select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id
      and (c.admin_id = auth.uid() or c.customer_id = auth.uid())
  ))
  with check (exists (
    select 1 from public.ai_conversations c where c.id = ai_messages.conversation_id
      and (c.admin_id = auth.uid() or c.customer_id = auth.uid())
  ));
drop policy if exists ai_messages_admin_oversight on public.ai_messages;
create policy ai_messages_admin_oversight on public.ai_messages for select
  using (public.is_admin_or_manager());

-- ai_tool_logs: actor can see their own; admin/manager see all (audit).
drop policy if exists ai_tool_logs_actor_select on public.ai_tool_logs;
create policy ai_tool_logs_actor_select on public.ai_tool_logs for select
  using (actor_admin_id = auth.uid() or actor_customer_id = auth.uid() or public.is_admin_or_manager());
drop policy if exists ai_tool_logs_insert on public.ai_tool_logs;
create policy ai_tool_logs_insert on public.ai_tool_logs for insert
  with check (actor_admin_id = auth.uid() or actor_customer_id = auth.uid() or public.is_admin_or_manager());

-- ai_action_requests: requester sees their own; admin/manager manage all.
drop policy if exists ai_action_requests_requester_select on public.ai_action_requests;
create policy ai_action_requests_requester_select on public.ai_action_requests for select
  using (requested_by_admin_id = auth.uid() or requested_by_customer_id = auth.uid() or public.is_admin_or_manager());
drop policy if exists ai_action_requests_requester_insert on public.ai_action_requests;
create policy ai_action_requests_requester_insert on public.ai_action_requests for insert
  with check (requested_by_admin_id = auth.uid() or requested_by_customer_id = auth.uid());
drop policy if exists ai_action_requests_manager_update on public.ai_action_requests;
create policy ai_action_requests_manager_update on public.ai_action_requests for update
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ai_automation_rules / runs: admin/manager only.
drop policy if exists ai_automation_rules_manager on public.ai_automation_rules;
create policy ai_automation_rules_manager on public.ai_automation_rules for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
drop policy if exists ai_automation_runs_manager on public.ai_automation_runs;
create policy ai_automation_runs_manager on public.ai_automation_runs for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
drop policy if exists ai_automation_runs_admin_read on public.ai_automation_runs;
create policy ai_automation_runs_admin_read on public.ai_automation_runs for select
  using (public.is_admin());

-- ai_insights: any admin can read; admin/manager acknowledge/dismiss.
drop policy if exists ai_insights_admin_select on public.ai_insights;
create policy ai_insights_admin_select on public.ai_insights for select
  using (public.is_admin());
drop policy if exists ai_insights_manager_write on public.ai_insights;
create policy ai_insights_manager_write on public.ai_insights for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());

-- ai_knowledge_sources: admin/manager full manage; any admin reads;
-- customers only read published + CUSTOMER-visibility rows.
drop policy if exists ai_knowledge_sources_admin_select on public.ai_knowledge_sources;
create policy ai_knowledge_sources_admin_select on public.ai_knowledge_sources for select
  using (public.is_admin());
drop policy if exists ai_knowledge_sources_manager_write on public.ai_knowledge_sources;
create policy ai_knowledge_sources_manager_write on public.ai_knowledge_sources for all
  using (public.is_admin_or_manager()) with check (public.is_admin_or_manager());
drop policy if exists ai_knowledge_sources_customer_select on public.ai_knowledge_sources;
create policy ai_knowledge_sources_customer_select on public.ai_knowledge_sources for select
  using (is_published = true and visibility = 'CUSTOMER' and auth.uid() is not null);

-- ai_usage_records: admin/manager read all; actor reads their own; inserts by owner.
drop policy if exists ai_usage_records_select on public.ai_usage_records;
create policy ai_usage_records_select on public.ai_usage_records for select
  using (actor_admin_id = auth.uid() or actor_customer_id = auth.uid() or public.is_admin_or_manager());
drop policy if exists ai_usage_records_insert on public.ai_usage_records;
create policy ai_usage_records_insert on public.ai_usage_records for insert
  with check (actor_admin_id = auth.uid() or actor_customer_id = auth.uid() or public.is_admin_or_manager());
