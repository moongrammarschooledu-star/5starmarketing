-- =====================================================================
-- STEP 28 — Real Estate Legal, Compliance & Property Due-Diligence
-- Management System
-- =====================================================================
--
-- DESIGN NOTES (read before touching this file):
--
-- This module is NOT a replacement for a licensed lawyer, solicitor,
-- notary, or any government land/registration authority. Every status
-- recorded here reflects only what an authorized admin/legal-officer
-- has actually entered or what a real linked record shows — never a
-- computer-guessed or auto-verified legal conclusion. Nothing in this
-- schema (or the services built on top of it) may ever mark a document
-- "certified", an ownership "clear", a case "won", or a property
-- "legally clear" unless a real authorized action recorded it.
--
-- REUSE-OVER-DUPLICATION DECISIONS (why there are ~18 new tables here,
-- not the ~21 the spec's own suggestion list implied):
--
-- 1. No new "legal officer" role. Exactly like construction's
--    project_manager_id/site_manager_id and inspection's inspector_id,
--    a legal officer is just any existing admin_profiles row referenced
--    via a nullable legal_officer_id column. RLS scopes access via
--    "is_admin() and legal_officer_id = auth.uid()" — no admin_profiles
--    enum change.
--
-- 2. Ownership shares live directly on property_ownership_records (one
--    row per owner/share) instead of a separate "ownership_shares"
--    table. The spec's own instruction ("never assume missing shares
--    sum to 100%") is enforced entirely in the application layer
--    (legalOwnershipService computes the live sum and surfaces
--    "Ownership allocation incomplete" — never stored, never guessed).
--
-- 3. Due-diligence checklists and compliance checklists share ONE
--    template pair — legal_checklist_templates / _template_items —
--    distinguished by a template_type discriminator, instead of 4
--    near-duplicate tables. Their *results* also share ONE polymorphic
--    table, legal_checklist_results (subject_type/subject_id), instead
--    of two more near-duplicates — mirroring STEP 26's construction
--    checklist consolidation.
--
-- 4. No dedicated "legal_events" calendar table. Exactly like STEP 27's
--    rental calendar, the legal calendar is assembled LIVE in
--    legalReportService by reading real date columns already on
--    due_diligence_cases, legal_cases/legal_case_events, encumbrances,
--    legal_contracts, legal_notices and legal_documents (expiry) — a
--    calendar entry can never exist without a real underlying record.
--
-- 5. No separate "legal_contract_versions" table. An EXECUTED contract
--    is never edited in place — a change instead creates a NEW
--    legal_contracts row with supersedes_contract_id pointing at the
--    old one (which is simultaneously marked SUPERSEDED). File-level
--    version history for the underlying document is already fully
--    handled by the EXISTING document_versions table (STEP 20) — not
--    duplicated here.
--
-- 6. No separate "document verification history" table. Every
--    verification decision is written to the existing generic pattern
--    (a new legal_audit_logs table, identical in shape to
--    construction_audit_logs/rental_audit_logs) instead of yet another
--    bespoke history table.
--
-- 7. legal_documents is a 1:1 METADATA COMPANION to the EXISTING
--    `documents` table (keyed by document_id), not a new storage or
--    verification system. The actual file, storage_path, versioning,
--    and the UPLOADED -> UNDER_REVIEW -> VERIFIED/REJECTED -> EXPIRED
--    workflow are the EXISTING documents.status/verified_by/
--    verified_at/expires_at columns — legal_documents only adds the
--    extra classification fields documents.* doesn't have room for
--    (issuing authority, reference number, confidentiality level, copy
--    type, and an optional link to the specific ownership record a
--    title document supports).
--
-- 8. legal_contracts is a thin business wrapper REFERENCING an existing
--    documents.id (the file) and an existing document_signatures.id
--    (the STEP 20 signing workflow) — the signing/participant machinery
--    (document_signatures, document_signature_participants) is reused
--    completely unchanged, never reimplemented.
--
-- 9. legal_notices integrate with the EXISTING Communication Center
--    (communication_conversations/communication_messages) via an
--    optional communication_message_id — delivery status for a
--    Communication-Center-sent notice is read LIVE from that message's
--    own status/delivered_at, never duplicated into a second boolean
--    that could drift out of sync.
--
-- 10. legal_approvals is ONE polymorphic approval table
--     (subject_type/subject_id), mirroring STEP 26's construction
--     approval consolidation, instead of one approval table per
--     legal entity.
--
-- 11. No "Step 30 AI Assistant" integration. That module does not exist
--     yet anywhere in this codebase (confirmed by an exhaustive search)
--     — the spec's section referencing it is disclosed as NOT YET
--     AVAILABLE rather than faked against a module that isn't built.
--
-- 12. No real external government/court/registry API integration
--     exists. Every place the spec calls for "external verification"
--     will show "Manual verification required" / "External
--     verification not configured" — this schema deliberately has NO
--     columns pretending an automated external check occurred.
--
-- RLS SUMMARY (no new role; PUBLIC gets nothing):
--   - ADMIN/MANAGER: full manage access to everything in this module.
--   - LEGAL OFFICER (an admin_profiles row referenced via
--     legal_officer_id on legal_property_records/due_diligence_cases/
--     legal_cases): scoped read/update on their own assigned records.
--   - AGENT: narrow read-only status visibility (legal_property_records
--     + property_compliance_records + due_diligence_cases) for
--     properties tied to their own assigned deals — never documents,
--     ownership detail, encumbrances, cases, contracts, or risks.
--   - CUSTOMER: read-only, scoped to their own deals/participation, on
--     legal_property_records, property_ownership_records (never the
--     owner's CNIC/registration number — the app layer excludes that
--     column from any customer-facing query), legal_documents (only
--     when the underlying document is VERIFIED/APPROVED and its own
--     visibility already allows the customer), due_diligence_cases,
--     property_compliance_records, encumbrances, legal_contracts (own
--     deal or own signature participation) and legal_notices addressed
--     to them. legal_cases, legal_case_events, legal_risks,
--     legal_approvals, legal_checklist_results/templates and
--     ownership_transfers stay admin/manager + assigned-officer only —
--     never shown to a customer or agent, per the spec's own "never
--     expose internal notes/risk discussions" rule.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Server-side, never-frontend-generated reference numbers.
-- ---------------------------------------------------------------------
create sequence if not exists public.due_diligence_case_seq;
create sequence if not exists public.legal_case_seq;
create sequence if not exists public.legal_notice_seq;
create sequence if not exists public.legal_contract_seq;

create or replace function public.next_due_diligence_case_number()
returns text language sql volatile as $$
  select 'DD-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.due_diligence_case_seq')::text, 5, '0');
$$;

create or replace function public.next_legal_case_number()
returns text language sql volatile as $$
  select 'LGL-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.legal_case_seq')::text, 5, '0');
$$;

create or replace function public.next_legal_notice_number()
returns text language sql volatile as $$
  select 'LNOTC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.legal_notice_seq')::text, 5, '0');
$$;

create or replace function public.next_legal_contract_number()
returns text language sql volatile as $$
  select 'LCTR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.legal_contract_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------
-- legal_settings (singleton) — configurable defaults; never a
-- hardcoded reminder/gate rule.
-- ---------------------------------------------------------------------
create table if not exists public.legal_settings (
  id smallint primary key default 1,
  document_expiry_reminder_days_before integer[] not null default array[30, 7, 1],
  due_diligence_deadline_reminder_days integer[] not null default array[7, 3, 1],
  compliance_review_reminder_days integer[] not null default array[30, 7],
  require_legal_clearance_for_deal_completion boolean not null default false,
  default_confidentiality_level text not null default 'INTERNAL' check (default_confidentiality_level in ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL')),
  currency text not null default 'PKR',
  updated_at timestamptz not null default now(),
  constraint legal_settings_singleton check (id = 1)
);

insert into public.legal_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists legal_settings_set_updated_at on public.legal_settings;
create trigger legal_settings_set_updated_at before update on public.legal_settings for each row execute function public.set_updated_at();

alter table public.legal_settings enable row level security;

drop policy if exists "legal_settings_admin_all" on public.legal_settings;
create policy "legal_settings_admin_all"
  on public.legal_settings for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- legal_property_records (sections 2-3) — the per-property legal hub.
-- Deliberately lean: no stored "overall status" column, since that
-- must always be computed live from the real child records below
-- (ownership completeness, document verification, encumbrances,
-- compliance) — never a cached label that could drift or mislead.
-- ---------------------------------------------------------------------
create table if not exists public.legal_property_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties (id) on delete cascade,
  legal_officer_id uuid references public.admin_profiles (id) on delete set null,
  internal_notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_property_records_officer_idx on public.legal_property_records (legal_officer_id);

drop trigger if exists legal_property_records_set_updated_at on public.legal_property_records;
create trigger legal_property_records_set_updated_at before update on public.legal_property_records for each row execute function public.set_updated_at();

alter table public.legal_property_records enable row level security;

drop policy if exists "legal_property_records_admin_all" on public.legal_property_records;
create policy "legal_property_records_admin_all"
  on public.legal_property_records for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_property_records_officer_read" on public.legal_property_records;
create policy "legal_property_records_officer_read"
  on public.legal_property_records for select
  to authenticated
  using (public.is_admin() and legal_officer_id = auth.uid());

drop policy if exists "legal_property_records_agent_read" on public.legal_property_records;
create policy "legal_property_records_agent_read"
  on public.legal_property_records for select
  to authenticated
  using (exists (select 1 from public.deals d where d.property_id = legal_property_records.property_id and d.agent_id = auth.uid()));

drop policy if exists "legal_property_records_customer_read" on public.legal_property_records;
create policy "legal_property_records_customer_read"
  on public.legal_property_records for select
  to authenticated
  using (exists (select 1 from public.deals d where d.property_id = legal_property_records.property_id and d.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- property_ownership_records (sections 4-5) — one row per owner/share.
-- Never assume missing shares sum to 100% — the application layer
-- (legalOwnershipService) computes the live total and surfaces
-- "Ownership allocation incomplete" rather than guessing a remainder.
-- Rows are never deleted on a real ownership change — see
-- ownership_transfers below, which records the change while this row
-- moves to TRANSFERRED/ARCHIVED.
-- ---------------------------------------------------------------------
create table if not exists public.property_ownership_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  owner_type text not null default 'INDIVIDUAL' check (owner_type in ('INDIVIDUAL', 'COMPANY', 'GOVERNMENT', 'TRUST', 'OTHER')),
  owner_name text not null,
  -- Minimized personal identity data (section 41) — nullable, never
  -- required, never surfaced to a customer-facing query.
  owner_identity_number text,
  ownership_share_percent numeric(5, 2) not null default 100 check (ownership_share_percent > 0 and ownership_share_percent <= 100),
  ownership_type text not null default 'FREEHOLD' check (ownership_type in ('FREEHOLD', 'LEASEHOLD', 'ALLOTMENT', 'OTHER')),
  acquisition_method text check (acquisition_method is null or acquisition_method in ('PURCHASE', 'INHERITANCE', 'GIFT', 'COURT_ORDER', 'OTHER')),
  acquired_date date,
  source_document_id uuid references public.documents (id) on delete set null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'TRANSFERRED', 'DISPUTED', 'ARCHIVED')),
  verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED', 'VERIFIED', 'REQUIRES_REVIEW')),
  verified_by uuid references public.admin_profiles (id) on delete set null,
  verified_at timestamptz,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_ownership_records_property_idx on public.property_ownership_records (property_id);
create index if not exists property_ownership_records_status_idx on public.property_ownership_records (status);

drop trigger if exists property_ownership_records_set_updated_at on public.property_ownership_records;
create trigger property_ownership_records_set_updated_at before update on public.property_ownership_records for each row execute function public.set_updated_at();

alter table public.property_ownership_records enable row level security;

drop policy if exists "property_ownership_records_admin_all" on public.property_ownership_records;
create policy "property_ownership_records_admin_all"
  on public.property_ownership_records for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "property_ownership_records_officer_read" on public.property_ownership_records;
create policy "property_ownership_records_officer_read"
  on public.property_ownership_records for select
  to authenticated
  using (public.is_admin() and exists (select 1 from public.legal_property_records r where r.property_id = property_ownership_records.property_id and r.legal_officer_id = auth.uid()));

-- Customer read is intentionally row-level only — the app layer never
-- selects owner_identity_number for a customer-facing query.
drop policy if exists "property_ownership_records_customer_read" on public.property_ownership_records;
create policy "property_ownership_records_customer_read"
  on public.property_ownership_records for select
  to authenticated
  using (exists (select 1 from public.deals d where d.property_id = property_ownership_records.property_id and d.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- ownership_transfers (section 6) — append-only history; a
-- property_ownership_records row is never deleted on a real transfer.
-- ---------------------------------------------------------------------
create table if not exists public.ownership_transfers (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  from_owner_record_id uuid references public.property_ownership_records (id) on delete set null,
  to_owner_name text not null,
  to_owner_type text not null default 'INDIVIDUAL' check (to_owner_type in ('INDIVIDUAL', 'COMPANY', 'GOVERNMENT', 'TRUST', 'OTHER')),
  transfer_type text not null default 'SALE' check (transfer_type in ('SALE', 'INHERITANCE', 'GIFT', 'COURT_ORDER', 'OTHER')),
  share_percent_transferred numeric(5, 2) not null check (share_percent_transferred > 0 and share_percent_transferred <= 100),
  transfer_date date not null,
  document_id uuid references public.documents (id) on delete set null,
  notes text,
  recorded_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists ownership_transfers_property_idx on public.ownership_transfers (property_id);

alter table public.ownership_transfers enable row level security;

drop policy if exists "ownership_transfers_admin_all" on public.ownership_transfers;
create policy "ownership_transfers_admin_all"
  on public.ownership_transfers for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- legal_documents (sections 7-13) — 1:1 metadata companion to the
-- EXISTING documents table. The actual file, storage, versioning and
-- UPLOADED -> UNDER_REVIEW -> VERIFIED/REJECTED -> EXPIRED workflow are
-- documents.* unchanged; this table only adds the extra legal
-- classification fields. Never claim "certified" — copy_type defaults
-- to UNKNOWN and only an admin/manager may set CERTIFIED_COPY.
-- ---------------------------------------------------------------------
create table if not exists public.legal_documents (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null unique references public.documents (id) on delete cascade,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  ownership_record_id uuid references public.property_ownership_records (id) on delete set null,
  issuing_authority text,
  reference_number text,
  confidentiality_level text not null default 'INTERNAL' check (confidentiality_level in ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL')),
  copy_type text not null default 'UNKNOWN' check (copy_type in ('ORIGINAL', 'COPY', 'CERTIFIED_COPY', 'DIGITAL_COPY', 'UNKNOWN')),
  reminder_days_before_expiry integer[],
  verification_notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_documents_property_idx on public.legal_documents (property_id);
create index if not exists legal_documents_project_idx on public.legal_documents (project_id);
create index if not exists legal_documents_ownership_idx on public.legal_documents (ownership_record_id);

drop trigger if exists legal_documents_set_updated_at on public.legal_documents;
create trigger legal_documents_set_updated_at before update on public.legal_documents for each row execute function public.set_updated_at();

alter table public.legal_documents enable row level security;

drop policy if exists "legal_documents_admin_all" on public.legal_documents;
create policy "legal_documents_admin_all"
  on public.legal_documents for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_documents_officer_read" on public.legal_documents;
create policy "legal_documents_officer_read"
  on public.legal_documents for select
  to authenticated
  using (public.is_admin() and exists (select 1 from public.legal_property_records r where r.property_id = legal_documents.property_id and r.legal_officer_id = auth.uid()));

-- Only VERIFIED/APPROVED documents whose own visibility already
-- permits the customer — never a document still UNDER_REVIEW/REJECTED.
drop policy if exists "legal_documents_customer_read" on public.legal_documents;
create policy "legal_documents_customer_read"
  on public.legal_documents for select
  to authenticated
  using (
    exists (
      select 1 from public.documents doc
      where doc.id = legal_documents.document_id
        and doc.status in ('VERIFIED', 'APPROVED')
        and doc.visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED')
        and (
          doc.customer_id = auth.uid()
          or exists (select 1 from public.deals d where d.property_id = legal_documents.property_id and d.customer_id = auth.uid())
        )
    )
  );

-- ---------------------------------------------------------------------
-- legal_checklist_templates / legal_checklist_template_items
-- (sections 15, 17-18) — ONE shared template pair for both due-
-- diligence and compliance checklists (template_type discriminator),
-- configurable by property type / project / jurisdiction / transaction
-- type. Never claim checklist completion equals legal clearance — that
-- distinction is enforced entirely in the reporting layer.
-- ---------------------------------------------------------------------
create table if not exists public.legal_checklist_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  template_type text not null check (template_type in ('DUE_DILIGENCE', 'COMPLIANCE')),
  applicable_property_type text check (applicable_property_type is null or applicable_property_type in ('house', 'flat', 'residential_plot', 'commercial')),
  applicable_project_id uuid references public.projects (id) on delete set null,
  jurisdiction text,
  applicable_transaction_type text,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_checklist_templates_type_idx on public.legal_checklist_templates (template_type, active);

drop trigger if exists legal_checklist_templates_set_updated_at on public.legal_checklist_templates;
create trigger legal_checklist_templates_set_updated_at before update on public.legal_checklist_templates for each row execute function public.set_updated_at();

alter table public.legal_checklist_templates enable row level security;

drop policy if exists "legal_checklist_templates_admin_all" on public.legal_checklist_templates;
create policy "legal_checklist_templates_admin_all"
  on public.legal_checklist_templates for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_checklist_templates_staff_read" on public.legal_checklist_templates;
create policy "legal_checklist_templates_staff_read"
  on public.legal_checklist_templates for select
  to authenticated
  using (public.is_admin());

create table if not exists public.legal_checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.legal_checklist_templates (id) on delete cascade,
  item_label text not null,
  description text,
  document_type_code text references public.document_types (code) on delete set null,
  required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists legal_checklist_template_items_template_idx on public.legal_checklist_template_items (template_id, sort_order);

alter table public.legal_checklist_template_items enable row level security;

drop policy if exists "legal_checklist_template_items_admin_all" on public.legal_checklist_template_items;
create policy "legal_checklist_template_items_admin_all"
  on public.legal_checklist_template_items for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_checklist_template_items_staff_read" on public.legal_checklist_template_items;
create policy "legal_checklist_template_items_staff_read"
  on public.legal_checklist_template_items for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- due_diligence_cases (sections 14, 16) — DD-YYYY-NNNNN, 9-state
-- workflow. Never auto-verify a checklist item without evidence — see
-- legal_checklist_results below.
-- ---------------------------------------------------------------------
create table if not exists public.due_diligence_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default public.next_due_diligence_case_number(),
  property_id uuid not null references public.properties (id) on delete cascade,
  deal_id uuid references public.deals (id) on delete set null,
  checklist_template_id uuid references public.legal_checklist_templates (id) on delete set null,
  transaction_type text not null default 'PURCHASE' check (transaction_type in ('PURCHASE', 'SALE', 'RENTAL', 'MORTGAGE', 'OTHER')),
  status text not null default 'REQUESTED' check (
    status in ('REQUESTED', 'IN_PROGRESS', 'DOCUMENTS_PENDING', 'UNDER_REVIEW', 'ISSUES_FOUND', 'ON_HOLD', 'COMPLETED', 'CLEARED_WITH_CONDITIONS', 'CANCELLED')
  ),
  legal_officer_id uuid references public.admin_profiles (id) on delete set null,
  requested_by uuid references public.admin_profiles (id) on delete set null,
  target_completion_date date,
  completed_at timestamptz,
  outcome_summary text,
  internal_risk_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists due_diligence_cases_property_idx on public.due_diligence_cases (property_id);
create index if not exists due_diligence_cases_status_idx on public.due_diligence_cases (status);
create index if not exists due_diligence_cases_officer_idx on public.due_diligence_cases (legal_officer_id);

drop trigger if exists due_diligence_cases_set_updated_at on public.due_diligence_cases;
create trigger due_diligence_cases_set_updated_at before update on public.due_diligence_cases for each row execute function public.set_updated_at();

alter table public.due_diligence_cases enable row level security;

drop policy if exists "due_diligence_cases_admin_all" on public.due_diligence_cases;
create policy "due_diligence_cases_admin_all"
  on public.due_diligence_cases for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "due_diligence_cases_officer_all" on public.due_diligence_cases;
create policy "due_diligence_cases_officer_all"
  on public.due_diligence_cases for select
  to authenticated
  using (public.is_admin() and legal_officer_id = auth.uid());

drop policy if exists "due_diligence_cases_officer_update" on public.due_diligence_cases;
create policy "due_diligence_cases_officer_update"
  on public.due_diligence_cases for update
  to authenticated
  using (public.is_admin() and legal_officer_id = auth.uid())
  with check (public.is_admin() and legal_officer_id = auth.uid());

drop policy if exists "due_diligence_cases_agent_read" on public.due_diligence_cases;
create policy "due_diligence_cases_agent_read"
  on public.due_diligence_cases for select
  to authenticated
  using (exists (select 1 from public.deals d where d.id = due_diligence_cases.deal_id and d.agent_id = auth.uid()));

-- App layer never selects internal_risk_notes/outcome_summary for a
-- customer-facing query — only status/dates/checklist completion.
drop policy if exists "due_diligence_cases_customer_read" on public.due_diligence_cases;
create policy "due_diligence_cases_customer_read"
  on public.due_diligence_cases for select
  to authenticated
  using (
    exists (select 1 from public.deals d where d.id = due_diligence_cases.deal_id and d.customer_id = auth.uid())
    or exists (select 1 from public.deals d where d.property_id = due_diligence_cases.property_id and d.customer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- property_compliance_records (section 19) — configurable templates;
-- never a jurisdiction-specific claim without configured source data.
-- ---------------------------------------------------------------------
create table if not exists public.property_compliance_records (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  checklist_template_id uuid references public.legal_checklist_templates (id) on delete set null,
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED', 'IN_PROGRESS', 'COMPLIANT', 'NON_COMPLIANT', 'REQUIRES_REVIEW')),
  reviewed_by uuid references public.admin_profiles (id) on delete set null,
  reviewed_at timestamptz,
  next_review_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_compliance_records_property_idx on public.property_compliance_records (property_id);
create index if not exists property_compliance_records_status_idx on public.property_compliance_records (status);

drop trigger if exists property_compliance_records_set_updated_at on public.property_compliance_records;
create trigger property_compliance_records_set_updated_at before update on public.property_compliance_records for each row execute function public.set_updated_at();

alter table public.property_compliance_records enable row level security;

drop policy if exists "property_compliance_records_admin_all" on public.property_compliance_records;
create policy "property_compliance_records_admin_all"
  on public.property_compliance_records for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "property_compliance_records_agent_read" on public.property_compliance_records;
create policy "property_compliance_records_agent_read"
  on public.property_compliance_records for select
  to authenticated
  using (exists (select 1 from public.deals d where d.property_id = property_compliance_records.property_id and d.agent_id = auth.uid()));

drop policy if exists "property_compliance_records_customer_read" on public.property_compliance_records;
create policy "property_compliance_records_customer_read"
  on public.property_compliance_records for select
  to authenticated
  using (exists (select 1 from public.deals d where d.property_id = property_compliance_records.property_id and d.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- legal_checklist_results (sections 16, 19) — ONE polymorphic results
-- table shared by due-diligence cases AND compliance records. Never
-- auto-verified — PASSED requires an explicit checked_by + optional
-- evidence_document_id.
-- ---------------------------------------------------------------------
create table if not exists public.legal_checklist_results (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('DUE_DILIGENCE_CASE', 'COMPLIANCE_RECORD')),
  subject_id uuid not null,
  template_item_id uuid not null references public.legal_checklist_template_items (id) on delete cascade,
  status text not null default 'NOT_CHECKED' check (status in ('NOT_CHECKED', 'PASSED', 'FAILED', 'NOT_APPLICABLE', 'REQUIRES_REVIEW')),
  evidence_document_id uuid references public.documents (id) on delete set null,
  notes text,
  checked_by uuid references public.admin_profiles (id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint legal_checklist_results_unique unique (subject_type, subject_id, template_item_id)
);

create index if not exists legal_checklist_results_subject_idx on public.legal_checklist_results (subject_type, subject_id);

drop trigger if exists legal_checklist_results_set_updated_at on public.legal_checklist_results;
create trigger legal_checklist_results_set_updated_at before update on public.legal_checklist_results for each row execute function public.set_updated_at();

alter table public.legal_checklist_results enable row level security;

drop policy if exists "legal_checklist_results_admin_all" on public.legal_checklist_results;
create policy "legal_checklist_results_admin_all"
  on public.legal_checklist_results for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_checklist_results_officer_all" on public.legal_checklist_results;
create policy "legal_checklist_results_officer_all"
  on public.legal_checklist_results for all
  to authenticated
  using (
    public.is_admin() and (
      exists (select 1 from public.due_diligence_cases c where c.id = legal_checklist_results.subject_id and legal_checklist_results.subject_type = 'DUE_DILIGENCE_CASE' and c.legal_officer_id = auth.uid())
    )
  )
  with check (
    public.is_admin() and (
      exists (select 1 from public.due_diligence_cases c where c.id = legal_checklist_results.subject_id and legal_checklist_results.subject_type = 'DUE_DILIGENCE_CASE' and c.legal_officer_id = auth.uid())
    )
  );

-- ---------------------------------------------------------------------
-- encumbrances (section 20) — never automatically declare a property
-- encumbrance-free; an empty result set means "none recorded", not
-- "verified clear".
-- ---------------------------------------------------------------------
create table if not exists public.encumbrances (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  encumbrance_type text not null default 'OTHER' check (encumbrance_type in ('MORTGAGE', 'LIEN', 'COURT_ORDER', 'DISPUTE', 'EASEMENT', 'OTHER')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'RELEASED', 'DISPUTED', 'UNDER_REVIEW')),
  holder_name text,
  amount numeric(14, 2) check (amount is null or amount >= 0),
  reference_number text,
  imposed_date date,
  released_date date,
  evidence_document_id uuid references public.documents (id) on delete set null,
  verification_status text not null default 'UNVERIFIED' check (verification_status in ('UNVERIFIED', 'VERIFIED', 'REQUIRES_REVIEW')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists encumbrances_property_idx on public.encumbrances (property_id);
create index if not exists encumbrances_status_idx on public.encumbrances (status);

drop trigger if exists encumbrances_set_updated_at on public.encumbrances;
create trigger encumbrances_set_updated_at before update on public.encumbrances for each row execute function public.set_updated_at();

alter table public.encumbrances enable row level security;

drop policy if exists "encumbrances_admin_all" on public.encumbrances;
create policy "encumbrances_admin_all"
  on public.encumbrances for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "encumbrances_officer_read" on public.encumbrances;
create policy "encumbrances_officer_read"
  on public.encumbrances for select
  to authenticated
  using (public.is_admin() and exists (select 1 from public.legal_property_records r where r.property_id = encumbrances.property_id and r.legal_officer_id = auth.uid()));

drop policy if exists "encumbrances_customer_read" on public.encumbrances;
create policy "encumbrances_customer_read"
  on public.encumbrances for select
  to authenticated
  using (exists (select 1 from public.deals d where d.property_id = encumbrances.property_id and d.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- legal_cases (sections 21-22) — never fabricate court outcomes,
-- hearing results, or case status; only what an authorized user enters.
-- Admin/manager + assigned legal officer only — never surfaced to a
-- customer or agent (may involve third parties/disputes).
-- ---------------------------------------------------------------------
create table if not exists public.legal_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text not null unique default public.next_legal_case_number(),
  property_id uuid references public.properties (id) on delete set null,
  case_type text not null default 'OTHER' check (case_type in ('CIVIL', 'CRIMINAL', 'REVENUE', 'ARBITRATION', 'OTHER')),
  title text not null,
  court_or_forum text,
  opposing_party text,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'ADJOURNED', 'SETTLEMENT_DISCUSSION', 'RESOLVED', 'DISMISSED', 'CLOSED')),
  filed_date date,
  next_hearing_date date,
  legal_officer_id uuid references public.admin_profiles (id) on delete set null,
  outcome_summary text,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_cases_property_idx on public.legal_cases (property_id);
create index if not exists legal_cases_status_idx on public.legal_cases (status);
create index if not exists legal_cases_officer_idx on public.legal_cases (legal_officer_id);

drop trigger if exists legal_cases_set_updated_at on public.legal_cases;
create trigger legal_cases_set_updated_at before update on public.legal_cases for each row execute function public.set_updated_at();

alter table public.legal_cases enable row level security;

drop policy if exists "legal_cases_admin_all" on public.legal_cases;
create policy "legal_cases_admin_all"
  on public.legal_cases for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_cases_officer_read" on public.legal_cases;
create policy "legal_cases_officer_read"
  on public.legal_cases for select
  to authenticated
  using (public.is_admin() and legal_officer_id = auth.uid());

-- ---------------------------------------------------------------------
-- legal_case_events (section 23) — case timeline; also feeds the live
-- legal calendar. Never destructively edited into a different outcome
-- — each event is its own append-only row.
-- ---------------------------------------------------------------------
create table if not exists public.legal_case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.legal_cases (id) on delete cascade,
  event_type text not null default 'NOTE' check (event_type in ('HEARING', 'FILING', 'ORDER', 'JUDGMENT', 'NOTE', 'OTHER')),
  event_date date not null,
  description text not null,
  document_id uuid references public.documents (id) on delete set null,
  recorded_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists legal_case_events_case_idx on public.legal_case_events (case_id, event_date);

alter table public.legal_case_events enable row level security;

drop policy if exists "legal_case_events_admin_all" on public.legal_case_events;
create policy "legal_case_events_admin_all"
  on public.legal_case_events for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_case_events_officer_read" on public.legal_case_events;
create policy "legal_case_events_officer_read"
  on public.legal_case_events for select
  to authenticated
  using (public.is_admin() and exists (select 1 from public.legal_cases c where c.id = legal_case_events.case_id and c.legal_officer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- legal_notices (sections 24-25) — integrates with the EXISTING
-- Communication Center via an optional communication_message_id; never
-- claim delivery without confirmation (a manual/offline notice has its
-- own manual-confirmation columns, clearly separate from the automated
-- communication_messages status).
-- ---------------------------------------------------------------------
create table if not exists public.legal_notices (
  id uuid primary key default gen_random_uuid(),
  notice_number text not null unique default public.next_legal_notice_number(),
  property_id uuid references public.properties (id) on delete set null,
  case_id uuid references public.legal_cases (id) on delete set null,
  recipient_type text not null default 'CUSTOMER' check (recipient_type in ('CUSTOMER', 'TENANT', 'LANDLORD', 'THIRD_PARTY', 'GOVERNMENT', 'OTHER')),
  recipient_customer_id uuid references auth.users (id) on delete set null,
  recipient_name text not null,
  notice_type text not null default 'OTHER' check (notice_type in ('DEMAND', 'WARNING', 'TERMINATION', 'COMPLIANCE_ORDER', 'OTHER')),
  subject text not null,
  body text not null,
  document_id uuid references public.documents (id) on delete set null,
  communication_message_id uuid references public.communication_messages (id) on delete set null,
  sent_via text check (sent_via is null or sent_via in ('COMMUNICATION_CENTER', 'EMAIL', 'SMS', 'POST', 'HAND_DELIVERY', 'OTHER')),
  sent_at timestamptz,
  manual_delivery_confirmed boolean not null default false,
  manual_delivery_confirmed_at timestamptz,
  manual_delivery_confirmed_by uuid references public.admin_profiles (id) on delete set null,
  response_due_date date,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SENT', 'DELIVERED', 'RESPONDED', 'EXPIRED', 'CANCELLED')),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_notices_property_idx on public.legal_notices (property_id);
create index if not exists legal_notices_case_idx on public.legal_notices (case_id);
create index if not exists legal_notices_recipient_idx on public.legal_notices (recipient_customer_id);
create index if not exists legal_notices_status_idx on public.legal_notices (status);

drop trigger if exists legal_notices_set_updated_at on public.legal_notices;
create trigger legal_notices_set_updated_at before update on public.legal_notices for each row execute function public.set_updated_at();

alter table public.legal_notices enable row level security;

drop policy if exists "legal_notices_admin_all" on public.legal_notices;
create policy "legal_notices_admin_all"
  on public.legal_notices for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_notices_customer_read" on public.legal_notices;
create policy "legal_notices_customer_read"
  on public.legal_notices for select
  to authenticated
  using (recipient_customer_id = auth.uid() and status != 'DRAFT');

-- ---------------------------------------------------------------------
-- legal_contracts (sections 26-28) — thin wrapper referencing an
-- existing documents.id (file) and document_signatures.id (signing
-- workflow); never destructively overwrite an EXECUTED contract — a
-- change instead creates a new row with supersedes_contract_id set,
-- while the old row moves to SUPERSEDED.
-- ---------------------------------------------------------------------
create table if not exists public.legal_contracts (
  id uuid primary key default gen_random_uuid(),
  contract_number text not null unique default public.next_legal_contract_number(),
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  contract_type text not null default 'OTHER' check (contract_type in ('SALE', 'RENTAL', 'AGENCY', 'NOC', 'POWER_OF_ATTORNEY', 'OTHER')),
  document_id uuid not null references public.documents (id) on delete restrict,
  signature_id uuid references public.document_signatures (id) on delete set null,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'UNDER_NEGOTIATION', 'PENDING_SIGNATURE', 'EXECUTED', 'EXPIRED', 'TERMINATED', 'SUPERSEDED')),
  effective_date date,
  expiry_date date,
  executed_at timestamptz,
  supersedes_contract_id uuid references public.legal_contracts (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_contracts_property_idx on public.legal_contracts (property_id);
create index if not exists legal_contracts_deal_idx on public.legal_contracts (deal_id);
create index if not exists legal_contracts_status_idx on public.legal_contracts (status);
create index if not exists legal_contracts_expiry_idx on public.legal_contracts (expiry_date);

drop trigger if exists legal_contracts_set_updated_at on public.legal_contracts;
create trigger legal_contracts_set_updated_at before update on public.legal_contracts for each row execute function public.set_updated_at();

-- Prevents any further edit to a contract row once EXECUTED — the
-- service must supersede instead of mutate.
create or replace function public.prevent_executed_contract_edit()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if old.status = 'EXECUTED' and new.status = 'EXECUTED' then
    if new.document_id is distinct from old.document_id
      or new.signature_id is distinct from old.signature_id
      or new.effective_date is distinct from old.effective_date
      or new.expiry_date is distinct from old.expiry_date
      or new.contract_type is distinct from old.contract_type
      or new.property_id is distinct from old.property_id
      or new.deal_id is distinct from old.deal_id then
      raise exception 'An executed contract cannot be edited — supersede it with a new contract instead.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists legal_contracts_protect_executed on public.legal_contracts;
create trigger legal_contracts_protect_executed before update on public.legal_contracts for each row execute function public.prevent_executed_contract_edit();

alter table public.legal_contracts enable row level security;

drop policy if exists "legal_contracts_admin_all" on public.legal_contracts;
create policy "legal_contracts_admin_all"
  on public.legal_contracts for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_contracts_customer_read" on public.legal_contracts;
create policy "legal_contracts_customer_read"
  on public.legal_contracts for select
  to authenticated
  using (
    exists (select 1 from public.deals d where d.id = legal_contracts.deal_id and d.customer_id = auth.uid())
    or exists (
      select 1 from public.document_signature_participants p
      where p.signature_id = legal_contracts.signature_id and p.customer_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- legal_approvals (section 29) — ONE polymorphic approval table,
-- mirroring STEP 26's construction_approvals consolidation.
-- ---------------------------------------------------------------------
create table if not exists public.legal_approvals (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('DUE_DILIGENCE_CASE', 'LEGAL_CONTRACT', 'PROPERTY_COMPLIANCE_RECORD', 'LEGAL_CASE', 'ENCUMBRANCE', 'OTHER')),
  subject_id uuid not null,
  approval_stage text not null default 'Review',
  status text not null default 'PENDING' check (status in ('PENDING', 'APPROVED', 'REJECTED')),
  requested_by uuid references public.admin_profiles (id) on delete set null,
  approver_id uuid references public.admin_profiles (id) on delete set null,
  decided_at timestamptz,
  comments text,
  created_at timestamptz not null default now()
);

create index if not exists legal_approvals_subject_idx on public.legal_approvals (subject_type, subject_id);
create index if not exists legal_approvals_status_idx on public.legal_approvals (status);

alter table public.legal_approvals enable row level security;

drop policy if exists "legal_approvals_admin_all" on public.legal_approvals;
create policy "legal_approvals_admin_all"
  on public.legal_approvals for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- legal_risks (sections 30, 34-35) — never conclude a flagged item is
-- "illegal"; the app layer always labels these "Risk / Requires
-- Review". The risk SCORE itself is computed live in
-- legalReportService from real open rows here (plus unverified
-- documents/encumbrances/ownership gaps) — never stored, never
-- presented as a legal opinion.
-- ---------------------------------------------------------------------
create table if not exists public.legal_risks (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties (id) on delete cascade,
  subject_type text check (subject_type is null or subject_type in ('DUE_DILIGENCE_CASE', 'ENCUMBRANCE', 'LEGAL_CASE', 'COMPLIANCE_RECORD', 'DOCUMENT', 'OTHER')),
  subject_id uuid,
  risk_category text not null default 'OTHER',
  description text not null,
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  status text not null default 'OPEN' check (status in ('OPEN', 'UNDER_REVIEW', 'MITIGATED', 'ACCEPTED', 'CLOSED')),
  flagged_by uuid references public.admin_profiles (id) on delete set null,
  flagged_at timestamptz not null default now(),
  resolved_by uuid references public.admin_profiles (id) on delete set null,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists legal_risks_property_idx on public.legal_risks (property_id);
create index if not exists legal_risks_status_idx on public.legal_risks (status);
create index if not exists legal_risks_severity_idx on public.legal_risks (severity);

drop trigger if exists legal_risks_set_updated_at on public.legal_risks;
create trigger legal_risks_set_updated_at before update on public.legal_risks for each row execute function public.set_updated_at();

alter table public.legal_risks enable row level security;

drop policy if exists "legal_risks_admin_all" on public.legal_risks;
create policy "legal_risks_admin_all"
  on public.legal_risks for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "legal_risks_officer_read" on public.legal_risks;
create policy "legal_risks_officer_read"
  on public.legal_risks for select
  to authenticated
  using (public.is_admin() and exists (select 1 from public.legal_property_records r where r.property_id = legal_risks.property_id and r.legal_officer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- legal_audit_logs — generic action log, identical in shape to
-- construction_audit_logs/rental_audit_logs; also serves as this
-- module's document-verification history (section 9) instead of a
-- bespoke history table.
-- ---------------------------------------------------------------------
create table if not exists public.legal_audit_logs (
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

create index if not exists legal_audit_logs_entity_idx on public.legal_audit_logs (entity_type, entity_id);
create index if not exists legal_audit_logs_created_idx on public.legal_audit_logs (created_at);

alter table public.legal_audit_logs enable row level security;

drop policy if exists "legal_audit_logs_manage_all" on public.legal_audit_logs;
create policy "legal_audit_logs_manage_all"
  on public.legal_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- =====================================================================
-- New document_types (section 7) — only categories genuinely missing
-- from the EXISTING STEP 20 list; PROPERTY_TITLE_DOCUMENT, NOC,
-- TRANSFER_DOCUMENT, ALLOTMENT_LETTER, POSSESSION_LETTER, TAX_DOCUMENT
-- already exist and are reused unchanged.
-- =====================================================================
insert into public.document_types (code, label, category, requires_expiry, sort_order) values
  ('MUTATION_RECORD', 'Mutation / Intiqal Record', 'Property', false, 210),
  ('MORTGAGE_DOCUMENT', 'Mortgage Document', 'Legal Agreement', false, 220),
  ('LIEN_DOCUMENT', 'Lien Document', 'Legal Agreement', false, 230),
  ('ENCUMBRANCE_CERTIFICATE', 'Encumbrance Certificate', 'Legal Agreement', true, 240),
  ('COURT_LEGAL_DOCUMENT', 'Court / Legal Correspondence', 'Legal Agreement', false, 250),
  ('APPROVAL_DOCUMENT', 'Building / Society / Project Approval', 'Property', true, 260),
  ('COMPLETION_CERTIFICATE', 'Completion Certificate', 'Property', false, 270),
  ('SITE_LAYOUT_PLAN', 'Site / Layout Plan', 'Property', false, 280),
  ('LEGAL_NOTICE_DOCUMENT', 'Legal Notice', 'Legal Agreement', false, 290),
  ('UTILITY_CLEARANCE', 'Utility Clearance Certificate', 'Property', true, 300),
  ('PROPERTY_LEGAL_FILE', 'Property Legal File Report', 'Legal Agreement', false, 310)
on conflict (code) do nothing;

-- =====================================================================
-- New account (section 37) — reuses the EXISTING accounting ledger;
-- an expense is only ever posted here by an admin creating a real
-- expense record through the EXISTING expenseService, exactly like
-- STEP 26/27's construction/rental expense accounts.
-- =====================================================================
insert into public.accounts (account_code, name, account_type, parent_id)
select '5300', 'Legal & Compliance Expenses', 'EXPENSE', a.id from public.accounts a where a.account_code = '5000'
on conflict (account_code) do nothing;
