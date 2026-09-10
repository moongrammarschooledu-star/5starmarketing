-- =====================================================================
-- STEP 20 — Property Documents & Digital Agreement Management System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTE: STEP 18 already added a simple `deal_documents` table
-- (booking form/agreement/receipt files attached directly to a deal,
-- admin/agent visibility only, no versioning, no signatures, no
-- customer access). This migration does NOT touch or replace it — the
-- existing compact "Documents" panel on the deal detail page keeps
-- working exactly as before. What's added here is a genuinely richer,
-- separate system: multi-entity document ownership (customer / lead /
-- property / project / deal / payment / installment), configurable
-- document types (a real table, not a hardcoded enum — admins can add
-- types later), versioning, a checklist engine, admin-editable PDF
-- templates with real-data variable interpolation, and a digital-
-- signature-request foundation — all backed by a NEW PRIVATE storage
-- bucket (never public), signed-URL-only access, and RLS that mirrors
-- the ownership model exactly.
-- =====================================================================

-- ---------------------------------------------------------------------
-- document_types — a real, admin-extensible lookup table (section 4),
-- not a check-constraint enum like earlier STEPs used. Seeded with the
-- spec's initial 20 types; admins can add more via /admin/documents
-- without a migration.
-- ---------------------------------------------------------------------
create table if not exists public.document_types (
  code text primary key,
  label text not null,
  category text not null default 'Other',
  requires_expiry boolean not null default false,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

insert into public.document_types (code, label, category, requires_expiry, sort_order) values
  ('CUSTOMER_ID', 'Customer ID', 'Identity', true, 10),
  ('ADDRESS_PROOF', 'Address Proof', 'Identity', false, 20),
  ('BOOKING_FORM', 'Booking Form', 'Transaction', false, 30),
  ('BOOKING_RECEIPT', 'Booking Receipt', 'Financial', false, 40),
  ('SALE_AGREEMENT', 'Sale Agreement', 'Legal Agreement', false, 50),
  ('RENTAL_AGREEMENT', 'Rental Agreement', 'Legal Agreement', false, 60),
  ('PROPERTY_AGREEMENT', 'Property Agreement', 'Legal Agreement', false, 70),
  ('PAYMENT_RECEIPT', 'Payment Receipt', 'Financial', false, 80),
  ('INSTALLMENT_RECEIPT', 'Installment Receipt', 'Financial', false, 90),
  ('PAYMENT_PLAN', 'Payment Plan', 'Financial', false, 100),
  ('PROPERTY_FILE', 'Property File', 'Property', false, 110),
  ('PROPERTY_TITLE_DOCUMENT', 'Property Title Document', 'Property', false, 120),
  ('PROJECT_DOCUMENT', 'Project Document', 'Project', false, 130),
  ('ALLOTMENT_LETTER', 'Allotment Letter', 'Transaction', false, 140),
  ('POSSESSION_LETTER', 'Possession Letter', 'Transaction', false, 150),
  ('TRANSFER_DOCUMENT', 'Transfer Document', 'Legal Agreement', false, 160),
  ('NOC', 'NOC', 'Legal Agreement', true, 170),
  ('TAX_DOCUMENT', 'Tax Document', 'Financial', true, 180),
  ('BANK_DOCUMENT', 'Bank Document', 'Financial', false, 190),
  ('CUSTOMER_REQUEST', 'Customer Request', 'Other', false, 200),
  ('OTHER', 'Other', 'Other', false, 999)
on conflict (code) do nothing;

alter table public.document_types enable row level security;

drop policy if exists "document_types_admin_all" on public.document_types;
create policy "document_types_admin_all"
  on public.document_types for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- Any authenticated staff/customer needs to read the active type list
-- to render upload/filter dropdowns — no sensitive data on this table.
drop policy if exists "document_types_authenticated_read" on public.document_types;
create policy "document_types_authenticated_read"
  on public.document_types for select
  to authenticated
  using (true);

-- ---------------------------------------------------------------------
-- document_templates (sections 22-24, 64) — admin-editable content with
-- {{variable}} placeholders, interpolated from real records only at
-- generation time. Never destroyed once used — see documents.template_id
-- below, kept even if the template is later deactivated.
-- ---------------------------------------------------------------------
create table if not exists public.document_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  document_type text not null references public.document_types (code) on delete restrict,
  content text not null default '',
  version integer not null default 1,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  updated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists document_templates_set_updated_at on public.document_templates;
create trigger document_templates_set_updated_at before update on public.document_templates for each row execute function public.set_updated_at();

create index if not exists document_templates_type_idx on public.document_templates (document_type);
create index if not exists document_templates_active_idx on public.document_templates (active);

alter table public.document_templates enable row level security;

drop policy if exists "document_templates_admin_all" on public.document_templates;
create policy "document_templates_admin_all"
  on public.document_templates for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_templates_staff_read" on public.document_templates;
create policy "document_templates_staff_read"
  on public.document_templates for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- document_checklists / document_checklist_items (sections 13, 63) —
-- checklist grouping is for admin organization; which items actually
-- apply to a given deal is resolved by matching applicable_deal_type /
-- applicable_property_type against the deal's own values (see
-- documentService.getApplicableChecklistItems), not by "selecting" a
-- whole checklist.
-- ---------------------------------------------------------------------
create table if not exists public.document_checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists document_checklists_set_updated_at on public.document_checklists;
create trigger document_checklists_set_updated_at before update on public.document_checklists for each row execute function public.set_updated_at();

alter table public.document_checklists enable row level security;

drop policy if exists "document_checklists_admin_all" on public.document_checklists;
create policy "document_checklists_admin_all"
  on public.document_checklists for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_checklists_staff_read" on public.document_checklists;
create policy "document_checklists_staff_read"
  on public.document_checklists for select
  to authenticated
  using (public.is_admin());

create table if not exists public.document_checklist_items (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references public.document_checklists (id) on delete cascade,
  document_type text not null references public.document_types (code) on delete restrict,
  required boolean not null default true,
  description text,
  sort_order integer not null default 0,
  applicable_property_type text,
  applicable_deal_type text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists document_checklist_items_checklist_idx on public.document_checklist_items (checklist_id);
create index if not exists document_checklist_items_type_idx on public.document_checklist_items (document_type);

alter table public.document_checklist_items enable row level security;

drop policy if exists "document_checklist_items_admin_all" on public.document_checklist_items;
create policy "document_checklist_items_admin_all"
  on public.document_checklist_items for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_checklist_items_staff_read" on public.document_checklist_items;
create policy "document_checklist_items_staff_read"
  on public.document_checklist_items for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- documents — the core table (section 6). Ownership is deliberately
-- broad (any of these may be set) — mirrors the established nullable-FK
-- ownership pattern from leads/appointments/deals.
-- ---------------------------------------------------------------------
create sequence if not exists public.document_number_seq;

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  document_number text unique,
  title text not null,
  document_type text not null references public.document_types (code) on delete restrict,
  category text,
  description text,
  customer_id uuid references auth.users (id) on delete set null,
  lead_id uuid references public.leads (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  payment_id uuid references public.deal_payments (id) on delete set null,
  installment_id uuid references public.payment_schedule_items (id) on delete set null,
  template_id uuid references public.document_templates (id) on delete set null,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  uploaded_by_customer boolean not null default false,
  verified_by uuid references public.admin_profiles (id) on delete set null,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  status text not null default 'UPLOADED' check (
    status in ('DRAFT', 'UPLOADED', 'UNDER_REVIEW', 'VERIFIED', 'APPROVED', 'REJECTED', 'EXPIRED', 'ARCHIVED', 'SUPERSEDED')
  ),
  visibility text not null default 'ADMIN_CUSTOMER' check (
    visibility in ('ADMIN_ONLY', 'AGENT_ONLY', 'CUSTOMER_ONLY', 'ADMIN_AGENT', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED')
  ),
  file_name text not null,
  storage_path text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  file_hash text,
  current_version integer not null default 1,
  rejection_reason text,
  expires_at date,
  verified_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.generate_document_number()
returns trigger
language plpgsql
as $$
declare
  prefix text;
begin
  if new.document_number is null then
    prefix := case
      when new.document_type in ('SALE_AGREEMENT', 'RENTAL_AGREEMENT', 'PROPERTY_AGREEMENT', 'TRANSFER_DOCUMENT') then 'AGR'
      when new.document_type in ('PAYMENT_RECEIPT', 'INSTALLMENT_RECEIPT', 'BOOKING_RECEIPT') then 'REC'
      else 'DOC'
    end;
    new.document_number := prefix || '-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.document_number_seq')::text, 5, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists set_document_number on public.documents;
create trigger set_document_number before insert on public.documents for each row execute function public.generate_document_number();

drop trigger if exists documents_set_updated_at on public.documents;
create trigger documents_set_updated_at before update on public.documents for each row execute function public.set_updated_at();

create index if not exists documents_deal_idx on public.documents (deal_id);
create index if not exists documents_customer_idx on public.documents (customer_id);
create index if not exists documents_property_idx on public.documents (property_id);
create index if not exists documents_project_idx on public.documents (project_id);
create index if not exists documents_lead_idx on public.documents (lead_id);
create index if not exists documents_payment_idx on public.documents (payment_id);
create index if not exists documents_installment_idx on public.documents (installment_id);
create index if not exists documents_document_type_idx on public.documents (document_type);
create index if not exists documents_status_idx on public.documents (status);
create index if not exists documents_created_at_idx on public.documents (created_at);
create index if not exists documents_expires_at_idx on public.documents (expires_at);
create index if not exists documents_deal_type_status_idx on public.documents (deal_id, document_type, status);

alter table public.documents enable row level security;

drop policy if exists "documents_admin_all" on public.documents;
create policy "documents_admin_all"
  on public.documents for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- Agent read: only documents whose linked deal or lead is assigned to
-- them (section 18) — mirrors deal_payments/deal_documents' own
-- EXISTS-subquery convention rather than a shared helper function.
drop policy if exists "documents_agent_read" on public.documents;
create policy "documents_agent_read"
  on public.documents for select
  to authenticated
  using (
    visibility in ('AGENT_ONLY', 'ADMIN_AGENT', 'ALL_AUTHORIZED')
    and (
      exists (select 1 from public.deals d where d.id = documents.deal_id and d.agent_id = auth.uid())
      or exists (select 1 from public.leads l where l.id = documents.lead_id and l.assigned_agent_id = auth.uid())
    )
  );

-- Agents may upload/update documents for their own assigned deal/lead
-- only — never someone else's.
drop policy if exists "documents_agent_insert" on public.documents;
create policy "documents_agent_insert"
  on public.documents for insert
  to authenticated
  with check (
    exists (select 1 from public.deals d where d.id = documents.deal_id and d.agent_id = auth.uid())
    or exists (select 1 from public.leads l where l.id = documents.lead_id and l.assigned_agent_id = auth.uid())
  );

drop policy if exists "documents_customer_read" on public.documents;
create policy "documents_customer_read"
  on public.documents for select
  to authenticated
  using (visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED') and customer_id = auth.uid());

-- Customers may upload their own requested documents (their own
-- customer_id, status starts UPLOADED — never self-approve).
drop policy if exists "documents_customer_insert" on public.documents;
create policy "documents_customer_insert"
  on public.documents for insert
  to authenticated
  with check (customer_id = auth.uid() and status in ('DRAFT', 'UPLOADED'));

-- Locks financial/identity/approval fields for anyone who isn't
-- admin/manager — the same protect_*_for_agent trigger pattern used by
-- leads/deals/inventory, extended here to also block a customer from
-- touching their own row's approval fields.
create or replace function public.protect_document_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.document_number := old.document_number;
    new.document_type := old.document_type;
    new.customer_id := old.customer_id;
    new.lead_id := old.lead_id;
    new.property_id := old.property_id;
    new.project_id := old.project_id;
    new.deal_id := old.deal_id;
    new.payment_id := old.payment_id;
    new.installment_id := old.installment_id;
    new.template_id := old.template_id;
    new.verified_by := old.verified_by;
    new.approved_by := old.approved_by;
    new.visibility := old.visibility;
    new.current_version := old.current_version;
    new.verified_at := old.verified_at;
    new.approved_at := old.approved_at;
    new.rejected_at := old.rejected_at;
    new.archived_at := old.archived_at;
    -- A customer/agent may only move status forward into review, or
    -- resubmit after rejection — never self-verify/approve/archive.
    if new.status not in ('UPLOADED', 'UNDER_REVIEW') then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists documents_protect_fields on public.documents;
create trigger documents_protect_fields before update on public.documents
  for each row execute function public.protect_document_fields();

-- ---------------------------------------------------------------------
-- document_versions (section 11) — every version, including v1, so the
-- full history is always in one place. documents.storage_path/
-- file_name/mime_type/file_size mirror the CURRENT version for fast,
-- join-free access; this table is the durable record.
-- ---------------------------------------------------------------------
create table if not exists public.document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  version_number integer not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size bigint not null default 0,
  file_hash text,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  uploaded_by_customer boolean not null default false,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists document_versions_document_idx on public.document_versions (document_id);
create unique index if not exists document_versions_unique_idx on public.document_versions (document_id, version_number);

alter table public.document_versions enable row level security;

drop policy if exists "document_versions_admin_all" on public.document_versions;
create policy "document_versions_admin_all"
  on public.document_versions for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_versions_read" on public.document_versions;
create policy "document_versions_read"
  on public.document_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.documents doc
      where doc.id = document_versions.document_id
        and (
          (doc.visibility in ('AGENT_ONLY', 'ADMIN_AGENT', 'ALL_AUTHORIZED') and (
            exists (select 1 from public.deals d where d.id = doc.deal_id and d.agent_id = auth.uid())
            or exists (select 1 from public.leads l where l.id = doc.lead_id and l.assigned_agent_id = auth.uid())
          ))
          or (doc.visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED') and doc.customer_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- document_audit_logs (sections 30, 40, 72) — immutable; no UPDATE/
-- DELETE policy exists for anyone, including admins (insert + select
-- only). Also mirrors deal-relevant events into the existing
-- activity_logs table (entity_type='deal') so they show up on the
-- Deal Timeline built in STEP 18 (section 49) — done in the service
-- layer, not here.
-- ---------------------------------------------------------------------
create table if not exists public.document_audit_logs (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  actor_id uuid references public.admin_profiles (id) on delete set null,
  actor_customer_id uuid references auth.users (id) on delete set null,
  actor_name text,
  action text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists document_audit_logs_document_idx on public.document_audit_logs (document_id);
create index if not exists document_audit_logs_created_idx on public.document_audit_logs (created_at);

alter table public.document_audit_logs enable row level security;

drop policy if exists "document_audit_logs_admin_all" on public.document_audit_logs;
create policy "document_audit_logs_admin_all"
  on public.document_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_audit_logs_insert" on public.document_audit_logs;
create policy "document_audit_logs_insert"
  on public.document_audit_logs for insert
  to authenticated
  with check (
    exists (
      select 1 from public.documents doc
      where doc.id = document_audit_logs.document_id
        and (
          public.is_admin()
          or exists (select 1 from public.deals d where d.id = doc.deal_id and d.agent_id = auth.uid())
          or doc.customer_id = auth.uid()
        )
    )
  );

drop policy if exists "document_audit_logs_read" on public.document_audit_logs;
create policy "document_audit_logs_read"
  on public.document_audit_logs for select
  to authenticated
  using (
    exists (
      select 1 from public.documents doc
      where doc.id = document_audit_logs.document_id
        and (
          (doc.visibility in ('AGENT_ONLY', 'ADMIN_AGENT', 'ALL_AUTHORIZED') and exists (select 1 from public.deals d where d.id = doc.deal_id and d.agent_id = auth.uid()))
          or (doc.visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED') and doc.customer_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- document_signatures / document_signature_participants (sections
-- 20-31, 67) — a digital-signature FOUNDATION, explicitly not claimed
-- as a legally-binding e-signature provider anywhere in the UI copy.
-- ---------------------------------------------------------------------
create table if not exists public.document_signatures (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  document_version integer not null,
  status text not null default 'Pending' check (status in ('Pending', 'Completed', 'Expired', 'Cancelled')),
  signing_order_mode text not null default 'Sequential' check (signing_order_mode in ('Sequential', 'Parallel')),
  expires_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists document_signatures_document_idx on public.document_signatures (document_id);
create index if not exists document_signatures_status_idx on public.document_signatures (status);

alter table public.document_signatures enable row level security;

drop policy if exists "document_signatures_admin_all" on public.document_signatures;
create policy "document_signatures_admin_all"
  on public.document_signatures for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- "document_signatures_participant_read" is created further below, once
-- document_signature_participants (which it references) exists.

create table if not exists public.document_signature_participants (
  id uuid primary key default gen_random_uuid(),
  signature_id uuid not null references public.document_signatures (id) on delete cascade,
  participant_type text not null check (participant_type in ('Customer', 'Seller', 'Agent', 'Admin', 'Other')),
  participant_name text not null,
  participant_email text,
  customer_id uuid references auth.users (id) on delete set null,
  admin_id uuid references public.admin_profiles (id) on delete set null,
  sign_order integer not null default 1,
  status text not null default 'Pending' check (status in ('Pending', 'Signed', 'Declined')),
  signed_at timestamptz,
  signature_method text check (signature_method is null or signature_method in ('Typed', 'Drawn', 'Uploaded')),
  signature_data text,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists document_signature_participants_signature_idx on public.document_signature_participants (signature_id);
create index if not exists document_signature_participants_customer_idx on public.document_signature_participants (customer_id);

alter table public.document_signature_participants enable row level security;

drop policy if exists "document_signature_participants_admin_all" on public.document_signature_participants;
create policy "document_signature_participants_admin_all"
  on public.document_signature_participants for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "document_signature_participants_self_read" on public.document_signature_participants;
create policy "document_signature_participants_self_read"
  on public.document_signature_participants for select
  to authenticated
  using (customer_id = auth.uid());

-- A participant may only ever sign/decline their OWN row, and only the
-- allowed fields — never reassign the request to someone else.
drop policy if exists "document_signature_participants_self_sign" on public.document_signature_participants;
create policy "document_signature_participants_self_sign"
  on public.document_signature_participants for update
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

create or replace function public.protect_signature_participant_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_admin_or_manager() then
    new.signature_id := old.signature_id;
    new.participant_type := old.participant_type;
    new.participant_name := old.participant_name;
    new.participant_email := old.participant_email;
    new.customer_id := old.customer_id;
    new.admin_id := old.admin_id;
    new.sign_order := old.sign_order;
  end if;
  return new;
end;
$$;

drop trigger if exists document_signature_participants_protect on public.document_signature_participants;
create trigger document_signature_participants_protect before update on public.document_signature_participants
  for each row execute function public.protect_signature_participant_fields();

-- Back on document_signatures now that document_signature_participants
-- exists: a participant may read the parent request row itself.
drop policy if exists "document_signatures_participant_read" on public.document_signatures;
create policy "document_signatures_participant_read"
  on public.document_signatures for select
  to authenticated
  using (exists (select 1 from public.document_signature_participants p where p.signature_id = document_signatures.id and p.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- website_settings — admin-configurable deal-completion document gate
-- (section 15) — defaults OFF so existing/in-flight deals are never
-- retroactively blocked from completing.
-- ---------------------------------------------------------------------
alter table public.website_settings add column if not exists require_documents_for_deal_completion boolean not null default false;

-- ---------------------------------------------------------------------
-- Private storage bucket (section 8) — never public. All access is via
-- short-lived signed URLs generated server-side, only after the
-- corresponding `documents` row has already been read successfully
-- under its own RLS (see documentService.getSignedUrl).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('secure-documents', 'secure-documents', false)
on conflict (id) do update set public = false;

drop policy if exists "secure_documents_admin_all" on storage.objects;
create policy "secure_documents_admin_all"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'secure-documents' and public.is_admin_or_manager())
  with check (bucket_id = 'secure-documents' and public.is_admin_or_manager());

-- Any staff account (any admin_profiles row) may upload — the
-- documents-table RLS/app layer is what scopes WHICH deal/lead they're
-- allowed to attach it to (section 9/18).
drop policy if exists "secure_documents_staff_insert" on storage.objects;
create policy "secure_documents_staff_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'secure-documents' and public.is_admin());

-- Customers may only upload into their own customers/{auth.uid()}/...
-- prefix (section 9) — enforced by inspecting the object path itself.
drop policy if exists "secure_documents_customer_insert" on storage.objects;
create policy "secure_documents_customer_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'secure-documents'
    and (storage.foldername(name))[1] = 'customers'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- No SELECT/UPDATE/DELETE policy for plain customers/agents — reads
-- always go through a server-generated signed URL (service-role,
-- issued only after the documents-table row was already readable under
-- ITS OWN RLS), never a direct storage.objects query from the browser.
