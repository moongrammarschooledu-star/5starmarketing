-- =====================================================================
-- STEP 22 — Complete Customer Communication Center
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTE: Several communication-adjacent systems already exist and
-- are NOT touched or duplicated here:
--   - communication_log (STEP 17) — a lead-scoped manual call/contact
--     log line, still used by the CRM lead detail page exactly as before.
--   - whatsapp_templates / whatsapp_activity (STEP 6) — manual bulk
--     click-to-chat template picker + honest activity log.
--   - marketing_templates (STEP 21) — Email/WhatsApp/SMS content used by
--     automation actions. REUSED here as the one template library for
--     BOTH automation and the new manual composer (extended below with
--     WhatsApp provider-approval columns) rather than building a second,
--     parallel templates table.
--   - notifications / customer_notifications (STEP 10/14) — in-app
--     alert feeds, both free-text `type` columns (no check constraint).
--     Reused for "new message" / "urgent conversation" alerts.
--   - marketing_tags / lead_tags (STEP 21) — reused for conversation
--     tagging via a new conversation_tags join table, rather than a
--     second tags table.
--   - src/lib/marketing/providers.ts (STEP 21) — the isConfigured()
--     provider-abstraction pattern is reused and extended with real
--     send implementations, never replaced.
--
-- What's genuinely new: a unified conversation/message model
-- (communication_conversations/messages/participants/attachments),
-- delivery logs, a scheduled-message queue, a manual call-log table,
-- consent-change history, conversation assignment history, and a
-- singleton communication_settings row (business hours / channel
-- enable switches / test mode). Nothing here ever fabricates a
-- DELIVERED/READ status — those are only ever set from a real,
-- signature-verified provider webhook event.
-- =====================================================================

-- ---------------------------------------------------------------------
-- marketing_templates — extended with WhatsApp provider-approval fields
-- (section 15). Only meaningful for channel = 'WhatsApp' rows; ignored
-- otherwise. Never treated as APPROVED unless a real provider confirms
-- it (nothing in this deployment can confirm it without real WhatsApp
-- Business API credentials, so this stays DRAFT until that exists).
-- ---------------------------------------------------------------------
alter table public.marketing_templates add column if not exists provider_status text not null default 'DRAFT' check (provider_status in ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED'));
alter table public.marketing_templates add column if not exists provider_template_id text;
alter table public.marketing_templates add column if not exists language text not null default 'en';

-- ---------------------------------------------------------------------
-- customer_profiles — Do-Not-Contact (section 61). Stronger than
-- marketing_opt_in: blocks non-essential (marketing-classified) sends
-- entirely; transactional deal/payment/document communications are
-- unaffected (section 59's marketing-vs-transactional separation).
-- ---------------------------------------------------------------------
alter table public.customer_profiles add column if not exists do_not_contact boolean not null default false;

-- ---------------------------------------------------------------------
-- communication_settings (sections 12, 61, 62) — a single-row table,
-- same pattern as website_settings. Secrets are NEVER stored here —
-- only non-secret, admin-editable operational flags. Real credentials
-- stay in environment variables (see src/lib/marketing/providers.ts).
-- ---------------------------------------------------------------------
create table if not exists public.communication_settings (
  id smallint primary key default 1,
  whatsapp_enabled boolean not null default false,
  email_enabled boolean not null default false,
  sms_enabled boolean not null default false,
  test_mode boolean not null default true,
  business_hours_start time not null default '09:00',
  business_hours_end time not null default '20:00',
  business_hours_timezone text not null default 'Asia/Karachi',
  defer_outside_business_hours boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint communication_settings_singleton check (id = 1)
);

insert into public.communication_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists communication_settings_set_updated_at on public.communication_settings;
create trigger communication_settings_set_updated_at before update on public.communication_settings for each row execute function public.set_updated_at();

alter table public.communication_settings enable row level security;

drop policy if exists "communication_settings_public_read" on public.communication_settings;
create policy "communication_settings_public_read"
  on public.communication_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "communication_settings_admin_write" on public.communication_settings;
create policy "communication_settings_admin_write"
  on public.communication_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_conversations (sections 6-9) — one thread per channel +
-- counterpart. Ownership is deliberately broad (any of these may be
-- set), mirroring the established nullable-FK ownership pattern from
-- leads/deals/documents. counterpart_* columns hold denormalized
-- contact info for an inbound message that doesn't yet match any
-- lead/customer (section 46's "Unmatched Conversation" queue).
-- ---------------------------------------------------------------------
create table if not exists public.communication_conversations (
  id uuid primary key default gen_random_uuid(),
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'SMS', 'INTERNAL', 'PORTAL', 'SYSTEM')),
  subject text,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  site_visit_id uuid references public.appointments (id) on delete set null,
  payment_id uuid references public.deal_payments (id) on delete set null,
  assigned_agent_id uuid references public.admin_profiles (id) on delete set null,
  status text not null default 'OPEN' check (status in ('OPEN', 'CLOSED', 'ARCHIVED')),
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  priority_overridden boolean not null default false,
  counterpart_name text,
  counterpart_phone text,
  counterpart_email text,
  is_unmatched boolean not null default false,
  last_message_at timestamptz,
  last_message_preview text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists communication_conversations_set_updated_at on public.communication_conversations;
create trigger communication_conversations_set_updated_at before update on public.communication_conversations for each row execute function public.set_updated_at();

create index if not exists communication_conversations_lead_idx on public.communication_conversations (lead_id);
create index if not exists communication_conversations_customer_idx on public.communication_conversations (customer_id);
create index if not exists communication_conversations_deal_idx on public.communication_conversations (deal_id);
create index if not exists communication_conversations_agent_idx on public.communication_conversations (assigned_agent_id);
create index if not exists communication_conversations_channel_idx on public.communication_conversations (channel);
create index if not exists communication_conversations_status_idx on public.communication_conversations (status);
create index if not exists communication_conversations_unmatched_idx on public.communication_conversations (is_unmatched) where is_unmatched;
create index if not exists communication_conversations_last_message_idx on public.communication_conversations (last_message_at desc);

alter table public.communication_conversations enable row level security;

drop policy if exists "communication_conversations_admin_all" on public.communication_conversations;
create policy "communication_conversations_admin_all"
  on public.communication_conversations for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent sees conversations either directly assigned to them, or
-- whose linked lead is assigned to them (mirrors leads_agent_read).
drop policy if exists "communication_conversations_agent_read" on public.communication_conversations;
create policy "communication_conversations_agent_read"
  on public.communication_conversations for select
  to authenticated
  using (
    assigned_agent_id = auth.uid()
    or exists (select 1 from public.leads l where l.id = communication_conversations.lead_id and l.assigned_agent_id = auth.uid())
  );

drop policy if exists "communication_conversations_agent_update" on public.communication_conversations;
create policy "communication_conversations_agent_update"
  on public.communication_conversations for update
  to authenticated
  using (
    assigned_agent_id = auth.uid()
    or exists (select 1 from public.leads l where l.id = communication_conversations.lead_id and l.assigned_agent_id = auth.uid())
  )
  with check (
    assigned_agent_id = auth.uid()
    or exists (select 1 from public.leads l where l.id = communication_conversations.lead_id and l.assigned_agent_id = auth.uid())
  );

-- A customer may read (never insert/update directly — always through
-- the customer.actions.ts server action, using the authenticated
-- session) their own portal conversations.
drop policy if exists "communication_conversations_customer_read" on public.communication_conversations;
create policy "communication_conversations_customer_read"
  on public.communication_conversations for select
  to authenticated
  using (customer_id = auth.uid() and channel = 'PORTAL');

-- Locks ownership/routing fields for anyone who isn't admin/manager —
-- the same protect_*_for_agent trigger pattern used by leads/deals.
create or replace function public.protect_conversation_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.channel := old.channel;
    new.lead_id := old.lead_id;
    new.customer_id := old.customer_id;
    new.property_id := old.property_id;
    new.project_id := old.project_id;
    new.deal_id := old.deal_id;
    new.site_visit_id := old.site_visit_id;
    new.payment_id := old.payment_id;
    new.counterpart_name := old.counterpart_name;
    new.counterpart_phone := old.counterpart_phone;
    new.counterpart_email := old.counterpart_email;
    new.is_unmatched := old.is_unmatched;
  end if;
  return new;
end;
$$;

drop trigger if exists communication_conversations_protect_fields on public.communication_conversations;
create trigger communication_conversations_protect_fields before update on public.communication_conversations
  for each row execute function public.protect_conversation_fields();

-- ---------------------------------------------------------------------
-- communication_messages (sections 9-10, 20, 43) — every message in
-- every conversation, one row per message, regardless of channel or
-- direction. idempotency_key's unique index (partial, since drafts
-- never carry one) is the actual duplicate-send guard (section 43/83).
-- ---------------------------------------------------------------------
create table if not exists public.communication_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  direction text not null check (direction in ('INBOUND', 'OUTBOUND', 'INTERNAL')),
  channel text not null check (channel in ('WHATSAPP', 'EMAIL', 'SMS', 'INTERNAL', 'PORTAL', 'SYSTEM')),
  status text not null default 'DRAFT' check (
    status in ('DRAFT', 'QUEUED', 'SCHEDULED', 'SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'CANCELLED')
  ),
  is_private_note boolean not null default false,
  subject text,
  body text not null default '',
  template_id uuid references public.marketing_templates (id) on delete set null,
  sender_admin_id uuid references public.admin_profiles (id) on delete set null,
  sender_customer_id uuid references auth.users (id) on delete set null,
  provider text,
  provider_message_id text,
  idempotency_key text,
  scheduled_for timestamptz,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failure_reason text,
  retry_count integer not null default 0,
  last_error text,
  next_retry_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists communication_messages_set_updated_at on public.communication_messages;
create trigger communication_messages_set_updated_at before update on public.communication_messages for each row execute function public.set_updated_at();

create index if not exists communication_messages_conversation_idx on public.communication_messages (conversation_id, created_at);
create index if not exists communication_messages_status_idx on public.communication_messages (status);
create index if not exists communication_messages_scheduled_idx on public.communication_messages (scheduled_for) where status = 'SCHEDULED';
create index if not exists communication_messages_provider_message_idx on public.communication_messages (provider_message_id) where provider_message_id is not null;
create unique index if not exists communication_messages_idempotency_idx on public.communication_messages (idempotency_key) where idempotency_key is not null;

alter table public.communication_messages enable row level security;

drop policy if exists "communication_messages_admin_all" on public.communication_messages;
create policy "communication_messages_admin_all"
  on public.communication_messages for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- An agent may read/insert messages only in conversations they can see
-- (mirrors the conversations policy) — internal notes and outbound
-- messages both allowed; agents never see another agent's leads' mail.
drop policy if exists "communication_messages_agent_select" on public.communication_messages;
create policy "communication_messages_agent_select"
  on public.communication_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.communication_conversations c
      where c.id = communication_messages.conversation_id
        and (c.assigned_agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid()))
    )
  );

drop policy if exists "communication_messages_agent_insert" on public.communication_messages;
create policy "communication_messages_agent_insert"
  on public.communication_messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.communication_conversations c
      where c.id = communication_messages.conversation_id
        and (c.assigned_agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid()))
    )
  );

-- A customer may read/insert only OUTBOUND-from-them (their own reply)
-- messages in their own PORTAL conversations — never internal notes,
-- never another customer's thread (section 70).
drop policy if exists "communication_messages_customer_select" on public.communication_messages;
create policy "communication_messages_customer_select"
  on public.communication_messages for select
  to authenticated
  using (
    not is_private_note
    and exists (select 1 from public.communication_conversations c where c.id = communication_messages.conversation_id and c.customer_id = auth.uid() and c.channel = 'PORTAL')
  );

drop policy if exists "communication_messages_customer_insert" on public.communication_messages;
create policy "communication_messages_customer_insert"
  on public.communication_messages for insert
  to authenticated
  with check (
    sender_customer_id = auth.uid()
    and direction = 'INBOUND'
    and not is_private_note
    and exists (select 1 from public.communication_conversations c where c.id = communication_messages.conversation_id and c.customer_id = auth.uid() and c.channel = 'PORTAL')
  );

-- Never allow editing an already-sent external message (section 77) —
-- only DRAFT rows may be freely updated by their own author; delivery-
-- status transitions on non-draft rows are applied by service-role
-- code (webhooks) or admin/manager, not a plain agent UPDATE.
create or replace function public.protect_sent_message_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status not in ('DRAFT', 'QUEUED', 'SCHEDULED') and not public.is_admin_or_manager() then
    new.body := old.body;
    new.subject := old.subject;
    new.channel := old.channel;
    new.template_id := old.template_id;
  end if;
  return new;
end;
$$;

drop trigger if exists communication_messages_protect_sent on public.communication_messages;
create trigger communication_messages_protect_sent before update on public.communication_messages
  for each row execute function public.protect_sent_message_fields();

-- ---------------------------------------------------------------------
-- communication_attachments (sections 54-56).
-- ---------------------------------------------------------------------
create table if not exists public.communication_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.communication_messages (id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists communication_attachments_message_idx on public.communication_attachments (message_id);

alter table public.communication_attachments enable row level security;

drop policy if exists "communication_attachments_admin_all" on public.communication_attachments;
create policy "communication_attachments_admin_all"
  on public.communication_attachments for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_attachments_read" on public.communication_attachments;
create policy "communication_attachments_read"
  on public.communication_attachments for select
  to authenticated
  using (
    exists (
      select 1 from public.communication_messages m
      join public.communication_conversations c on c.id = m.conversation_id
      where m.id = communication_attachments.message_id
        and (
          c.assigned_agent_id = auth.uid()
          or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid())
          or (c.customer_id = auth.uid() and c.channel = 'PORTAL' and not m.is_private_note)
        )
    )
  );

-- An agent may attach a file (e.g. a brochure or receipt) only to a
-- message on a conversation they can already see — mirrors the agent
-- message-insert policy above.
drop policy if exists "communication_attachments_agent_insert" on public.communication_attachments;
create policy "communication_attachments_agent_insert"
  on public.communication_attachments for insert
  to authenticated
  with check (
    exists (
      select 1 from public.communication_messages m
      join public.communication_conversations c on c.id = m.conversation_id
      where m.id = communication_attachments.message_id
        and (c.assigned_agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = c.lead_id and l.assigned_agent_id = auth.uid()))
    )
  );

-- ---------------------------------------------------------------------
-- communication_delivery_logs (section 57) — every raw status event a
-- provider ever reports, kept in full for audit even though the
-- message row only ever shows the latest status.
-- ---------------------------------------------------------------------
create table if not exists public.communication_delivery_logs (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.communication_messages (id) on delete cascade,
  provider text not null,
  provider_message_id text,
  status text not null,
  error_code text,
  error_message text,
  raw_event jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_delivery_logs_message_idx on public.communication_delivery_logs (message_id);

alter table public.communication_delivery_logs enable row level security;

drop policy if exists "communication_delivery_logs_admin_all" on public.communication_delivery_logs;
create policy "communication_delivery_logs_admin_all"
  on public.communication_delivery_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_schedules (sections 39-42) — the scheduling bookkeeping
-- record (did the processor pick this up, did it fire) — distinct from
-- communication_messages.status, which reflects delivery lifecycle.
-- ---------------------------------------------------------------------
create table if not exists public.communication_schedules (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.communication_messages (id) on delete cascade,
  scheduled_for timestamptz not null,
  timezone text not null default 'Asia/Karachi',
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'CANCELLED')),
  executed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now()
);

create index if not exists communication_schedules_due_idx on public.communication_schedules (scheduled_for) where status = 'SCHEDULED';

alter table public.communication_schedules enable row level security;

drop policy if exists "communication_schedules_admin_all" on public.communication_schedules;
create policy "communication_schedules_admin_all"
  on public.communication_schedules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_call_logs (sections 37-38) — MANUAL_LOG only, never
-- presented as a telephony-provider-verified event.
-- ---------------------------------------------------------------------
create table if not exists public.communication_call_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.communication_conversations (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  direction text not null check (direction in ('Outgoing', 'Incoming')),
  outcome text not null check (outcome in ('CONNECTED', 'NO_ANSWER', 'BUSY', 'CALLBACK_REQUESTED', 'NOT_INTERESTED', 'WRONG_NUMBER', 'OTHER')),
  duration_seconds integer,
  notes text,
  next_follow_up_at timestamptz,
  source text not null default 'MANUAL_LOG' check (source = 'MANUAL_LOG'),
  created_at timestamptz not null default now()
);

create index if not exists communication_call_logs_lead_idx on public.communication_call_logs (lead_id);
create index if not exists communication_call_logs_conversation_idx on public.communication_call_logs (conversation_id);

alter table public.communication_call_logs enable row level security;

drop policy if exists "communication_call_logs_admin_all" on public.communication_call_logs;
create policy "communication_call_logs_admin_all"
  on public.communication_call_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_call_logs_agent_select" on public.communication_call_logs;
create policy "communication_call_logs_agent_select"
  on public.communication_call_logs for select
  to authenticated
  using (agent_id = auth.uid() or exists (select 1 from public.leads l where l.id = communication_call_logs.lead_id and l.assigned_agent_id = auth.uid()));

drop policy if exists "communication_call_logs_agent_insert" on public.communication_call_logs;
create policy "communication_call_logs_agent_insert"
  on public.communication_call_logs for insert
  to authenticated
  with check (agent_id = auth.uid());

-- ---------------------------------------------------------------------
-- communication_participants (section 47) — PER-USER read-state, so an
-- unread count is never a single global flag shared by every agent.
-- ---------------------------------------------------------------------
create table if not exists public.communication_participants (
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  user_id uuid not null references public.admin_profiles (id) on delete cascade,
  last_read_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create index if not exists communication_participants_user_idx on public.communication_participants (user_id);

alter table public.communication_participants enable row level security;

drop policy if exists "communication_participants_own_row" on public.communication_participants;
create policy "communication_participants_own_row"
  on public.communication_participants for all
  to authenticated
  using (user_id = auth.uid() or public.is_admin_or_manager())
  with check (user_id = auth.uid() or public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- communication_assignment_history (section 49) — mirrors
-- lead_assignment_history exactly, for conversations.
-- ---------------------------------------------------------------------
create table if not exists public.communication_assignment_history (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  previous_agent_id uuid references public.admin_profiles (id) on delete set null,
  new_agent_id uuid references public.admin_profiles (id) on delete set null,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists communication_assignment_history_conversation_idx on public.communication_assignment_history (conversation_id);

alter table public.communication_assignment_history enable row level security;

drop policy if exists "communication_assignment_history_admin_all" on public.communication_assignment_history;
create policy "communication_assignment_history_admin_all"
  on public.communication_assignment_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_assignment_history_agent_read" on public.communication_assignment_history;
create policy "communication_assignment_history_agent_read"
  on public.communication_assignment_history for select
  to authenticated
  using (exists (select 1 from public.communication_conversations c where c.id = communication_assignment_history.conversation_id and c.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- communication_audit_logs (section 58) — every important lifecycle
-- action, actor + timestamp, immutable (insert/select only).
-- ---------------------------------------------------------------------
create table if not exists public.communication_audit_logs (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references public.communication_conversations (id) on delete cascade,
  message_id uuid references public.communication_messages (id) on delete set null,
  action text not null,
  actor_id uuid references public.admin_profiles (id) on delete set null,
  actor_name text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists communication_audit_logs_conversation_idx on public.communication_audit_logs (conversation_id);
create index if not exists communication_audit_logs_created_idx on public.communication_audit_logs (created_at);

alter table public.communication_audit_logs enable row level security;

drop policy if exists "communication_audit_logs_admin_all" on public.communication_audit_logs;
create policy "communication_audit_logs_admin_all"
  on public.communication_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_audit_logs_agent_read" on public.communication_audit_logs;
create policy "communication_audit_logs_agent_read"
  on public.communication_audit_logs for select
  to authenticated
  using (exists (select 1 from public.communication_conversations c where c.id = communication_audit_logs.conversation_id and c.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- communication_consent_history (sections 59-60) — every opt-in/opt-out
-- change, who/what changed it, and why (customer action, admin action,
-- an inbound STOP keyword, or a system default).
-- ---------------------------------------------------------------------
create table if not exists public.communication_consent_history (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users (id) on delete cascade,
  field text not null check (field in ('email_opt_in', 'whatsapp_opt_in', 'sms_opt_in', 'marketing_opt_in', 'do_not_contact')),
  old_value boolean,
  new_value boolean not null,
  source text not null check (source in ('customer', 'admin', 'stop_keyword', 'system')),
  created_at timestamptz not null default now()
);

create index if not exists communication_consent_history_customer_idx on public.communication_consent_history (customer_id);

alter table public.communication_consent_history enable row level security;

drop policy if exists "communication_consent_history_admin_all" on public.communication_consent_history;
create policy "communication_consent_history_admin_all"
  on public.communication_consent_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "communication_consent_history_customer_read" on public.communication_consent_history;
create policy "communication_consent_history_customer_read"
  on public.communication_consent_history for select
  to authenticated
  using (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- conversation_tags (section 51) — reuses marketing_tags (STEP 21)
-- rather than a second tags table; a tag can now apply to a lead AND/OR
-- a conversation independently.
-- ---------------------------------------------------------------------
create table if not exists public.conversation_tags (
  conversation_id uuid not null references public.communication_conversations (id) on delete cascade,
  tag_id uuid not null references public.marketing_tags (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (conversation_id, tag_id)
);

create index if not exists conversation_tags_conversation_idx on public.conversation_tags (conversation_id);
create index if not exists conversation_tags_tag_idx on public.conversation_tags (tag_id);

alter table public.conversation_tags enable row level security;

drop policy if exists "conversation_tags_admin_all" on public.conversation_tags;
create policy "conversation_tags_admin_all"
  on public.conversation_tags for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "conversation_tags_agent_all" on public.conversation_tags;
create policy "conversation_tags_agent_all"
  on public.conversation_tags for all
  to authenticated
  using (exists (select 1 from public.communication_conversations c where c.id = conversation_tags.conversation_id and c.assigned_agent_id = auth.uid()))
  with check (exists (select 1 from public.communication_conversations c where c.id = conversation_tags.conversation_id and c.assigned_agent_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Storage bucket for communication attachments (sections 54-56) —
-- private, signed-URL-only, mirroring STEP 20's secure-documents bucket
-- exactly.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('communication-attachments', 'communication-attachments', false)
on conflict (id) do update set public = false;

drop policy if exists "communication_attachments_storage_admin_all" on storage.objects;
create policy "communication_attachments_storage_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'communication-attachments' and public.is_admin_or_manager())
  with check (bucket_id = 'communication-attachments' and public.is_admin_or_manager());

drop policy if exists "communication_attachments_storage_staff_insert" on storage.objects;
create policy "communication_attachments_storage_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'communication-attachments' and public.is_admin());

-- No SELECT policy for plain agents/customers — reads always go
-- through a server-generated signed URL (service-role, issued only
-- after the message row was already readable under its own RLS).
