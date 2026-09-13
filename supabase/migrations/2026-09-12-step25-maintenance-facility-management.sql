-- =====================================================================
-- STEP 25 — Property Inspection + Maintenance + Facility Management
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTES (disclosed up front, not buried):
--   - No separate "maintenance_costs" table. Cost fields (estimated/
--     approved/actual/customer_charge/internal_cost) live directly on
--     maintenance_work_orders, with maintenance_work_order_items for a
--     parts/labor breakdown — a third cost table would only duplicate
--     these same figures.
--   - No separate "maintenance_feedback" table. Customer completion
--     confirmation (section 25) — confirmed/feedback/rating/reopened —
--     lives directly on maintenance_requests, since it's a 1:1 fact
--     about the request, not a repeating collection.
--   - No separate "maintenance_notifications" table. Reuses the EXISTING
--     `notifications` (staff, via staffNotificationService) and
--     `customer_notifications` (customer, via notificationService)
--     tables through new enum values — exactly the same pattern STEP 23
--     (expense_submitted, ...) and STEP 24 (investment_alert_triggered)
--     used for their own module-specific notifications.
--   - Maintenance costs integrate with the EXISTING accounting module
--     (expenses / financial_transactions) rather than a parallel ledger:
--     a work order may be "logged as an expense" against the existing
--     '5090 Maintenance' account (seeded in STEP 23) via the existing
--     expenseService — the normal Draft→Submitted→Approved→Paid
--     workflow and the real financial_transactions row on Paid are
--     reused unchanged. maintenance_work_orders.expense_id just links to
--     that expenses row.
--   - Inspection photos, defect photos and maintenance request/work
--     order photos reuse the EXISTING private `secure-documents` Storage
--     bucket and its signed-URL helpers (documentStorage.ts) from STEP
--     20 — no new bucket, no public URLs, ever.
--   - Digital sign-off (section 24) reuses the EXISTING
--     document_signatures / documentSignatureService architecture from
--     STEP 20: an inspection report is generated as a real `documents`
--     row (via documentService.createGeneratedDocument), and a
--     signature request is created against THAT document — not a new,
--     parallel sign-off table. The same non-legally-binding disclaimer
--     documentSignatureService already exports applies here too.
--   - No vendor login/portal. Section 42 itself makes this conditional
--     ("if vendor portal functionality is enabled") — it is not enabled
--     in this deployment. Vendors are admin-managed contacts only,
--     contacted the same way leads/customers already are (phone/
--     WhatsApp/email); "Technician" on a work order is either an
--     internal admin_profiles row (technician_id) or the vendor's own
--     staff (their existing contact_person on the vendor record).
--   - "asset_service_history" IS a real, dedicated table (per section 40)
--     — but populated only from real, already-recorded events (asset
--     creation, inspections, work orders, warranty changes), best-effort
--     and never fabricated.
--   - Status-transition legality (inspection/request/work-order/defect)
--     is enforced in the TypeScript service layer (ALLOWED_TRANSITIONS
--     maps), exactly like documentService/expenseService already do —
--     not a DB trigger — consistent with the rest of this codebase.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Server-side, never-frontend-generated reference numbers (section 3, 11).
-- ---------------------------------------------------------------------
create sequence if not exists public.inspection_seq;
create sequence if not exists public.work_order_seq;
create sequence if not exists public.maintenance_request_seq;
create sequence if not exists public.asset_seq;

create or replace function public.next_inspection_number()
returns text language sql volatile as $$
  select 'INS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.inspection_seq')::text, 5, '0');
$$;

create or replace function public.next_work_order_number()
returns text language sql volatile as $$
  select 'WO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.work_order_seq')::text, 5, '0');
$$;

create or replace function public.next_maintenance_request_number()
returns text language sql volatile as $$
  select 'MR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.maintenance_request_seq')::text, 5, '0');
$$;

create or replace function public.next_asset_number()
returns text language sql volatile as $$
  select 'AST-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.asset_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------
-- maintenance_vendors (section 13) — real, admin-entered contractor
-- directory only; never invented.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_vendors (
  id uuid primary key default gen_random_uuid(),
  business_name text not null,
  contact_person text,
  phone text,
  email text,
  address text,
  service_categories text[] not null default '{}',
  coverage_areas text[] not null default '{}',
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'SUSPENDED')),
  notes text,
  rating numeric(3, 2),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_vendors_status_idx on public.maintenance_vendors (status);

drop trigger if exists maintenance_vendors_set_updated_at on public.maintenance_vendors;
create trigger maintenance_vendors_set_updated_at before update on public.maintenance_vendors for each row execute function public.set_updated_at();

alter table public.maintenance_vendors enable row level security;

drop policy if exists "maintenance_vendors_manage_all" on public.maintenance_vendors;
create policy "maintenance_vendors_manage_all"
  on public.maintenance_vendors for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "maintenance_vendors_staff_read" on public.maintenance_vendors;
create policy "maintenance_vendors_staff_read"
  on public.maintenance_vendors for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- maintenance_assets (section 19) — property/project equipment tracking.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_assets (
  id uuid primary key default gen_random_uuid(),
  asset_number text not null unique default public.next_asset_number(),
  property_id uuid references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  location text,
  category text not null,
  manufacturer text,
  model text,
  serial_number text,
  purchase_date date,
  warranty_expiry date,
  installation_date date,
  condition text not null default 'GOOD' check (condition in ('GOOD', 'FAIR', 'POOR', 'DAMAGED', 'NOT_INSPECTED', 'NOT_APPLICABLE')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_assets_property_idx on public.maintenance_assets (property_id);
create index if not exists maintenance_assets_project_idx on public.maintenance_assets (project_id);
create index if not exists maintenance_assets_status_idx on public.maintenance_assets (status);
create index if not exists maintenance_assets_warranty_expiry_idx on public.maintenance_assets (warranty_expiry);

drop trigger if exists maintenance_assets_set_updated_at on public.maintenance_assets;
create trigger maintenance_assets_set_updated_at before update on public.maintenance_assets for each row execute function public.set_updated_at();

alter table public.maintenance_assets enable row level security;

drop policy if exists "maintenance_assets_manage_all" on public.maintenance_assets;
create policy "maintenance_assets_manage_all"
  on public.maintenance_assets for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "maintenance_assets_staff_read" on public.maintenance_assets;
create policy "maintenance_assets_staff_read"
  on public.maintenance_assets for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- asset_warranties (section 21) — supports renewal history; an asset's
-- CURRENT warranty is simply the most recent active row.
-- ---------------------------------------------------------------------
create table if not exists public.asset_warranties (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.maintenance_assets (id) on delete cascade,
  provider text,
  start_date date,
  expiry_date date not null,
  coverage_description text,
  document_id uuid references public.documents (id) on delete set null,
  contact_name text,
  contact_phone text,
  contact_email text,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists asset_warranties_asset_idx on public.asset_warranties (asset_id);
create index if not exists asset_warranties_expiry_idx on public.asset_warranties (expiry_date);

alter table public.asset_warranties enable row level security;

drop policy if exists "asset_warranties_manage_all" on public.asset_warranties;
create policy "asset_warranties_manage_all"
  on public.asset_warranties for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "asset_warranties_staff_read" on public.asset_warranties;
create policy "asset_warranties_staff_read"
  on public.asset_warranties for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- inspection_templates + inspection_checklist_items (section 5) —
-- admin-configurable checklist templates. `inspection_checklist_items`
-- here is the TEMPLATE's item definitions; the per-inspection filled-in
-- results live in `inspection_results` (created further below).
-- ---------------------------------------------------------------------
create table if not exists public.inspection_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists inspection_templates_set_updated_at on public.inspection_templates;
create trigger inspection_templates_set_updated_at before update on public.inspection_templates for each row execute function public.set_updated_at();

alter table public.inspection_templates enable row level security;

drop policy if exists "inspection_templates_manage_all" on public.inspection_templates;
create policy "inspection_templates_manage_all"
  on public.inspection_templates for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "inspection_templates_staff_read" on public.inspection_templates;
create policy "inspection_templates_staff_read"
  on public.inspection_templates for select
  to authenticated
  using (public.is_admin());

create table if not exists public.inspection_checklist_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.inspection_templates (id) on delete cascade,
  category text not null check (category in ('Exterior', 'Structure', 'Roof', 'Walls', 'Doors', 'Windows', 'Flooring', 'Ceiling', 'Electrical', 'Plumbing', 'Kitchen', 'Bathrooms', 'HVAC', 'Water Supply', 'Drainage', 'Security', 'Parking', 'Garden', 'Common Areas', 'Other')),
  item text not null,
  required boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create index if not exists inspection_checklist_items_template_idx on public.inspection_checklist_items (template_id, sort_order);

alter table public.inspection_checklist_items enable row level security;

drop policy if exists "inspection_checklist_items_manage_all" on public.inspection_checklist_items;
create policy "inspection_checklist_items_manage_all"
  on public.inspection_checklist_items for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "inspection_checklist_items_staff_read" on public.inspection_checklist_items;
create policy "inspection_checklist_items_staff_read"
  on public.inspection_checklist_items for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- property_inspections (sections 3-4, 38) — the inspection record
-- itself. Linked to a deal where relevant (e.g. a pre-handover
-- inspection), never a duplicate of deal data.
-- ---------------------------------------------------------------------
create table if not exists public.property_inspections (
  id uuid primary key default gen_random_uuid(),
  inspection_number text not null unique default public.next_inspection_number(),
  property_id uuid not null references public.properties (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  template_id uuid references public.inspection_templates (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  agent_id uuid references public.admin_profiles (id) on delete set null,
  inspector_id uuid references public.admin_profiles (id) on delete set null,
  inspection_type text not null check (inspection_type in ('PRE_PURCHASE', 'PRE_SALE', 'PRE_RENTAL', 'MOVE_IN', 'MOVE_OUT', 'ROUTINE', 'MAINTENANCE', 'CONSTRUCTION', 'HANDOVER', 'FINAL')),
  scheduled_date date,
  completed_date date,
  status text not null default 'SCHEDULED' check (status in ('SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REVIEW_REQUIRED', 'APPROVED', 'CANCELLED')),
  overall_condition text check (overall_condition in ('GOOD', 'FAIR', 'POOR', 'DAMAGED', 'NOT_INSPECTED', 'NOT_APPLICABLE')),
  notes text,
  recommendations text,
  document_id uuid references public.documents (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  updated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_inspections_property_idx on public.property_inspections (property_id);
create index if not exists property_inspections_project_idx on public.property_inspections (project_id);
create index if not exists property_inspections_customer_idx on public.property_inspections (customer_id);
create index if not exists property_inspections_inspector_idx on public.property_inspections (inspector_id);
create index if not exists property_inspections_status_idx on public.property_inspections (status);
create index if not exists property_inspections_scheduled_date_idx on public.property_inspections (scheduled_date);
create index if not exists property_inspections_created_at_idx on public.property_inspections (created_at);

drop trigger if exists property_inspections_set_updated_at on public.property_inspections;
create trigger property_inspections_set_updated_at before update on public.property_inspections for each row execute function public.set_updated_at();

alter table public.property_inspections enable row level security;

drop policy if exists "property_inspections_manage_all" on public.property_inspections;
create policy "property_inspections_manage_all"
  on public.property_inspections for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- A regular staff member (inspector/agent) may fully manage only the
-- inspections assigned to them — mirrors the same "role-based, not a
-- granular ACL" philosophy as the rest of this codebase.
drop policy if exists "property_inspections_assigned_staff_all" on public.property_inspections;
create policy "property_inspections_assigned_staff_all"
  on public.property_inspections for all
  to authenticated
  using (public.is_admin() and (inspector_id = auth.uid() or agent_id = auth.uid()))
  with check (public.is_admin() and (inspector_id = auth.uid() or agent_id = auth.uid()));

drop policy if exists "property_inspections_customer_read" on public.property_inspections;
create policy "property_inspections_customer_read"
  on public.property_inspections for select
  to authenticated
  using (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- inspection_results (section 5) — the actual filled-in checklist for
-- ONE inspection instance. `checklist_item_id` is nullable to allow an
-- ad-hoc item not sourced from a template.
-- ---------------------------------------------------------------------
create table if not exists public.inspection_results (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.property_inspections (id) on delete cascade,
  checklist_item_id uuid references public.inspection_checklist_items (id) on delete set null,
  category text not null,
  item text not null,
  condition text not null default 'NOT_INSPECTED' check (condition in ('GOOD', 'FAIR', 'POOR', 'DAMAGED', 'NOT_INSPECTED', 'NOT_APPLICABLE')),
  severity text check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  notes text,
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inspection_results_inspection_idx on public.inspection_results (inspection_id);
create index if not exists inspection_results_condition_idx on public.inspection_results (condition);

drop trigger if exists inspection_results_set_updated_at on public.inspection_results;
create trigger inspection_results_set_updated_at before update on public.inspection_results for each row execute function public.set_updated_at();

alter table public.inspection_results enable row level security;

drop policy if exists "inspection_results_manage_all" on public.inspection_results;
create policy "inspection_results_manage_all"
  on public.inspection_results for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "inspection_results_assigned_staff_all" on public.inspection_results;
create policy "inspection_results_assigned_staff_all"
  on public.inspection_results for all
  to authenticated
  using (exists (select 1 from public.property_inspections pi where pi.id = inspection_results.inspection_id and (pi.inspector_id = auth.uid() or pi.agent_id = auth.uid())))
  with check (exists (select 1 from public.property_inspections pi where pi.id = inspection_results.inspection_id and (pi.inspector_id = auth.uid() or pi.agent_id = auth.uid())));

drop policy if exists "inspection_results_customer_read" on public.inspection_results;
create policy "inspection_results_customer_read"
  on public.inspection_results for select
  to authenticated
  using (exists (select 1 from public.property_inspections pi where pi.id = inspection_results.inspection_id and pi.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- property_defects (section 6) — every inspection issue that warrants
-- tracking as a defect; may later be linked to the work order that
-- fixes it (work_order_id is added by ALTER TABLE further below, once
-- maintenance_work_orders exists).
-- ---------------------------------------------------------------------
create table if not exists public.property_defects (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  inspection_id uuid references public.property_inspections (id) on delete set null,
  checklist_result_id uuid references public.inspection_results (id) on delete set null,
  category text not null,
  description text not null,
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  location text,
  recommended_action text,
  estimated_cost numeric(14, 2) check (estimated_cost is null or estimated_cost >= 0),
  actual_cost numeric(14, 2) check (actual_cost is null or actual_cost >= 0),
  status text not null default 'OPEN' check (status in ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED', 'CANCELLED')),
  assigned_vendor_id uuid references public.maintenance_vendors (id) on delete set null,
  assigned_technician_id uuid references public.admin_profiles (id) on delete set null,
  due_date date,
  completed_date date,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists property_defects_property_idx on public.property_defects (property_id);
create index if not exists property_defects_inspection_idx on public.property_defects (inspection_id);
create index if not exists property_defects_status_idx on public.property_defects (status);
create index if not exists property_defects_severity_idx on public.property_defects (severity);

drop trigger if exists property_defects_set_updated_at on public.property_defects;
create trigger property_defects_set_updated_at before update on public.property_defects for each row execute function public.set_updated_at();

alter table public.property_defects enable row level security;

drop policy if exists "property_defects_manage_all" on public.property_defects;
create policy "property_defects_manage_all"
  on public.property_defects for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- inspection_photos (section 7) — private; access only via a signed URL
-- minted server-side after the row is confirmed readable under RLS.
-- ---------------------------------------------------------------------
create table if not exists public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.property_inspections (id) on delete cascade,
  property_id uuid not null references public.properties (id) on delete cascade,
  checklist_result_id uuid references public.inspection_results (id) on delete set null,
  defect_id uuid references public.property_defects (id) on delete set null,
  storage_path text not null,
  caption text,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists inspection_photos_inspection_idx on public.inspection_photos (inspection_id);
create index if not exists inspection_photos_defect_idx on public.inspection_photos (defect_id);

alter table public.inspection_photos enable row level security;

drop policy if exists "inspection_photos_manage_all" on public.inspection_photos;
create policy "inspection_photos_manage_all"
  on public.inspection_photos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "inspection_photos_customer_read" on public.inspection_photos;
create policy "inspection_photos_customer_read"
  on public.inspection_photos for select
  to authenticated
  using (exists (select 1 from public.property_inspections pi where pi.id = inspection_photos.inspection_id and pi.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- maintenance_requests (sections 9-10, 14, 25-26) — the customer/staff
-- facing request. SLA due-by timestamps are computed at creation time
-- from maintenance_sla_settings (never a hardcoded promise).
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default public.next_maintenance_request_number(),
  property_id uuid not null references public.properties (id) on delete cascade,
  unit_id uuid references public.property_inventory (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  category text not null check (category in ('Plumbing', 'Electrical', 'HVAC', 'Civil Work', 'Carpentry', 'Painting', 'Cleaning', 'Appliance', 'Security', 'Water', 'Drainage', 'Internet/Communication', 'Other')),
  description text not null,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY')),
  preferred_visit_time timestamptz,
  status text not null default 'NEW' check (status in ('NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'WAITING_FOR_PARTS', 'WAITING_FOR_CUSTOMER', 'COMPLETED', 'VERIFICATION_REQUIRED', 'CLOSED', 'REJECTED', 'CANCELLED')),
  sla_response_due_at timestamptz,
  sla_resolution_due_at timestamptz,
  first_response_at timestamptz,
  sla_response_breached boolean not null default false,
  sla_resolution_breached boolean not null default false,
  closed_at timestamptz,
  customer_confirmed boolean not null default false,
  customer_confirmed_at timestamptz,
  customer_feedback text,
  customer_rating smallint check (customer_rating is null or (customer_rating between 1 and 5)),
  reported_unresolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_requests_property_idx on public.maintenance_requests (property_id);
create index if not exists maintenance_requests_unit_idx on public.maintenance_requests (unit_id);
create index if not exists maintenance_requests_customer_idx on public.maintenance_requests (customer_id);
create index if not exists maintenance_requests_status_idx on public.maintenance_requests (status);
create index if not exists maintenance_requests_priority_idx on public.maintenance_requests (priority);
create index if not exists maintenance_requests_created_at_idx on public.maintenance_requests (created_at);

drop trigger if exists maintenance_requests_set_updated_at on public.maintenance_requests;
create trigger maintenance_requests_set_updated_at before update on public.maintenance_requests for each row execute function public.set_updated_at();

alter table public.maintenance_requests enable row level security;

drop policy if exists "maintenance_requests_manage_all" on public.maintenance_requests;
create policy "maintenance_requests_manage_all"
  on public.maintenance_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "maintenance_requests_customer_all" on public.maintenance_requests;
create policy "maintenance_requests_customer_all"
  on public.maintenance_requests for all
  to authenticated
  using (customer_id = auth.uid())
  with check (customer_id = auth.uid());

-- A customer may only ever touch their own confirmation/feedback fields
-- (plus reopening to VERIFICATION_REQUIRED) — never priority, category,
-- assignment or any other operational field. Enforced here, not just in
-- the server action, exactly like protect_appointment_fields() already
-- does for appointments.
create or replace function public.protect_maintenance_request_customer_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if public.is_admin() then
    return new;
  end if;
  if new.property_id is distinct from old.property_id
    or new.unit_id is distinct from old.unit_id
    or new.customer_id is distinct from old.customer_id
    or new.created_by is distinct from old.created_by
    or new.category is distinct from old.category
    or new.description is distinct from old.description
    or new.priority is distinct from old.priority
    or new.request_number is distinct from old.request_number
    or new.sla_response_due_at is distinct from old.sla_response_due_at
    or new.sla_resolution_due_at is distinct from old.sla_resolution_due_at
  then
    raise exception 'You may only update your own confirmation and feedback on this request.';
  end if;
  if new.status is distinct from old.status and new.status not in ('VERIFICATION_REQUIRED', 'CANCELLED') then
    raise exception 'You may only reopen or cancel your own request.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_maintenance_request_customer_fields on public.maintenance_requests;
create trigger protect_maintenance_request_customer_fields before update on public.maintenance_requests
  for each row execute function public.protect_maintenance_request_customer_fields();

-- ---------------------------------------------------------------------
-- maintenance_work_orders (sections 11-12) — converts a request (or a
-- preventive schedule) into billable, trackable work.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_number text not null unique default public.next_work_order_number(),
  maintenance_request_id uuid references public.maintenance_requests (id) on delete set null,
  property_id uuid not null references public.properties (id) on delete cascade,
  unit_id uuid references public.property_inventory (id) on delete set null,
  asset_id uuid references public.maintenance_assets (id) on delete set null,
  vendor_id uuid references public.maintenance_vendors (id) on delete set null,
  technician_id uuid references public.admin_profiles (id) on delete set null,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY')),
  description text not null,
  scope_of_work text,
  scheduled_date date,
  started_date date,
  completed_date date,
  estimated_cost numeric(14, 2) check (estimated_cost is null or estimated_cost >= 0),
  approved_cost numeric(14, 2) check (approved_cost is null or approved_cost >= 0),
  actual_cost numeric(14, 2) check (actual_cost is null or actual_cost >= 0),
  customer_charge numeric(14, 2) check (customer_charge is null or customer_charge >= 0),
  internal_cost numeric(14, 2) check (internal_cost is null or internal_cost >= 0),
  notes text,
  status text not null default 'NEW' check (status in ('NEW', 'ASSIGNED', 'SCHEDULED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'VERIFICATION', 'CLOSED', 'CANCELLED')),
  expense_id uuid references public.expenses (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_work_orders_request_idx on public.maintenance_work_orders (maintenance_request_id);
create index if not exists maintenance_work_orders_property_idx on public.maintenance_work_orders (property_id);
create index if not exists maintenance_work_orders_vendor_idx on public.maintenance_work_orders (vendor_id);
create index if not exists maintenance_work_orders_asset_idx on public.maintenance_work_orders (asset_id);
create index if not exists maintenance_work_orders_status_idx on public.maintenance_work_orders (status);
create index if not exists maintenance_work_orders_scheduled_date_idx on public.maintenance_work_orders (scheduled_date);
create index if not exists maintenance_work_orders_created_at_idx on public.maintenance_work_orders (created_at);

drop trigger if exists maintenance_work_orders_set_updated_at on public.maintenance_work_orders;
create trigger maintenance_work_orders_set_updated_at before update on public.maintenance_work_orders for each row execute function public.set_updated_at();

alter table public.maintenance_work_orders enable row level security;

drop policy if exists "maintenance_work_orders_manage_all" on public.maintenance_work_orders;
create policy "maintenance_work_orders_manage_all"
  on public.maintenance_work_orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Customers never see work-order rows directly (internal cost fields
-- live here) — they only see request-level status/history (section 22).

-- Now that maintenance_work_orders exists, link defects to the work
-- order that resolves them (section 6).
alter table public.property_defects add column if not exists work_order_id uuid references public.maintenance_work_orders (id) on delete set null;
create index if not exists property_defects_work_order_idx on public.property_defects (work_order_id);

-- ---------------------------------------------------------------------
-- maintenance_work_order_items (section 40) — parts/labor breakdown.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_work_order_items (
  id uuid primary key default gen_random_uuid(),
  work_order_id uuid not null references public.maintenance_work_orders (id) on delete cascade,
  item_type text not null check (item_type in ('PART', 'LABOR', 'OTHER')),
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_cost numeric(14, 2) not null default 0 check (unit_cost >= 0),
  total_cost numeric(14, 2) not null default 0 check (total_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists maintenance_work_order_items_wo_idx on public.maintenance_work_order_items (work_order_id);

alter table public.maintenance_work_order_items enable row level security;

drop policy if exists "maintenance_work_order_items_manage_all" on public.maintenance_work_order_items;
create policy "maintenance_work_order_items_manage_all"
  on public.maintenance_work_order_items for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- asset_service_history (section 20) — a real, append-only timeline,
-- populated only from genuine recorded events (never fabricated).
-- ---------------------------------------------------------------------
create table if not exists public.asset_service_history (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.maintenance_assets (id) on delete cascade,
  event_type text not null check (event_type in ('INSTALLATION', 'INSPECTION', 'MAINTENANCE', 'REPAIR', 'WARRANTY_EVENT', 'OTHER')),
  event_date date not null default current_date,
  description text,
  cost numeric(14, 2) check (cost is null or cost >= 0),
  vendor_id uuid references public.maintenance_vendors (id) on delete set null,
  work_order_id uuid references public.maintenance_work_orders (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists asset_service_history_asset_idx on public.asset_service_history (asset_id, event_date desc);
create index if not exists asset_service_history_work_order_idx on public.asset_service_history (work_order_id);

alter table public.asset_service_history enable row level security;

drop policy if exists "asset_service_history_manage_all" on public.asset_service_history;
create policy "asset_service_history_manage_all"
  on public.asset_service_history for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "asset_service_history_staff_read" on public.asset_service_history;
create policy "asset_service_history_staff_read"
  on public.asset_service_history for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- maintenance_photos (section 8) — before/during/after photos for a
-- request or work order; private, signed-URL access only.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_photos (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('REQUEST', 'WORK_ORDER')),
  entity_id uuid not null,
  photo_type text not null default 'GENERAL' check (photo_type in ('BEFORE', 'DURING', 'AFTER', 'GENERAL')),
  storage_path text not null,
  caption text,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  uploaded_by_customer boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_photos_entity_idx on public.maintenance_photos (entity_type, entity_id);

alter table public.maintenance_photos enable row level security;

drop policy if exists "maintenance_photos_manage_all" on public.maintenance_photos;
create policy "maintenance_photos_manage_all"
  on public.maintenance_photos for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A customer may attach photos to (and view photos of) their OWN
-- request only — never a work order row directly (internal-only).
drop policy if exists "maintenance_photos_customer_request" on public.maintenance_photos;
create policy "maintenance_photos_customer_request"
  on public.maintenance_photos for all
  to authenticated
  using (entity_type = 'REQUEST' and exists (select 1 from public.maintenance_requests r where r.id = maintenance_photos.entity_id and r.customer_id = auth.uid()))
  with check (entity_type = 'REQUEST' and exists (select 1 from public.maintenance_requests r where r.id = maintenance_photos.entity_id and r.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- maintenance_status_history (section 43) — every status change on a
-- request or work order, for a real audit trail.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_status_history (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('REQUEST', 'WORK_ORDER')),
  entity_id uuid not null,
  from_status text,
  to_status text not null,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  changed_by_customer uuid references auth.users (id) on delete set null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_status_history_entity_idx on public.maintenance_status_history (entity_type, entity_id, created_at desc);

alter table public.maintenance_status_history enable row level security;

drop policy if exists "maintenance_status_history_manage_all" on public.maintenance_status_history;
create policy "maintenance_status_history_manage_all"
  on public.maintenance_status_history for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "maintenance_status_history_customer_read" on public.maintenance_status_history;
create policy "maintenance_status_history_customer_read"
  on public.maintenance_status_history for select
  to authenticated
  using (entity_type = 'REQUEST' and exists (select 1 from public.maintenance_requests r where r.id = maintenance_status_history.entity_id and r.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- maintenance_comments (section 40) — a simple shared thread on a
-- request/work order/inspection/defect; `internal_only` comments never
-- reach the customer portal.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_comments (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('REQUEST', 'WORK_ORDER', 'INSPECTION', 'DEFECT')),
  entity_id uuid not null,
  author_id uuid references public.admin_profiles (id) on delete set null,
  author_customer_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  body text not null,
  internal_only boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists maintenance_comments_entity_idx on public.maintenance_comments (entity_type, entity_id, created_at);

alter table public.maintenance_comments enable row level security;

drop policy if exists "maintenance_comments_manage_all" on public.maintenance_comments;
create policy "maintenance_comments_manage_all"
  on public.maintenance_comments for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "maintenance_comments_customer_request" on public.maintenance_comments;
create policy "maintenance_comments_customer_request"
  on public.maintenance_comments for all
  to authenticated
  using (entity_type = 'REQUEST' and internal_only = false and exists (select 1 from public.maintenance_requests r where r.id = maintenance_comments.entity_id and r.customer_id = auth.uid()))
  with check (entity_type = 'REQUEST' and internal_only = false and author_customer_id = auth.uid() and exists (select 1 from public.maintenance_requests r where r.id = maintenance_comments.entity_id and r.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- maintenance_schedules (sections 17-18) — preventive maintenance.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_schedules (
  id uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties (id) on delete cascade,
  asset_id uuid references public.maintenance_assets (id) on delete set null,
  maintenance_type text not null,
  frequency text not null check (frequency in ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'BIANNUAL', 'ANNUAL', 'CUSTOM')),
  custom_interval_days integer check (custom_interval_days is null or custom_interval_days > 0),
  last_completed_date date,
  next_due_date date not null,
  assigned_vendor_id uuid references public.maintenance_vendors (id) on delete set null,
  estimated_cost numeric(14, 2) check (estimated_cost is null or estimated_cost >= 0),
  notes text,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_schedules_property_idx on public.maintenance_schedules (property_id);
create index if not exists maintenance_schedules_asset_idx on public.maintenance_schedules (asset_id);
create index if not exists maintenance_schedules_next_due_idx on public.maintenance_schedules (next_due_date);
create index if not exists maintenance_schedules_active_idx on public.maintenance_schedules (active);

drop trigger if exists maintenance_schedules_set_updated_at on public.maintenance_schedules;
create trigger maintenance_schedules_set_updated_at before update on public.maintenance_schedules for each row execute function public.set_updated_at();

alter table public.maintenance_schedules enable row level security;

drop policy if exists "maintenance_schedules_manage_all" on public.maintenance_schedules;
create policy "maintenance_schedules_manage_all"
  on public.maintenance_schedules for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "maintenance_schedules_staff_read" on public.maintenance_schedules;
create policy "maintenance_schedules_staff_read"
  on public.maintenance_schedules for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- maintenance_sla_settings (section 26) — configurable response/
-- resolution targets per priority; never a hardcoded business promise.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_sla_settings (
  priority text primary key check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT', 'EMERGENCY')),
  response_minutes integer not null check (response_minutes > 0),
  resolution_minutes integer not null check (resolution_minutes > 0),
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.maintenance_sla_settings (priority, response_minutes, resolution_minutes) values
  ('EMERGENCY', 30, 240),
  ('URGENT', 60, 480),
  ('HIGH', 120, 1440),
  ('NORMAL', 480, 4320),
  ('LOW', 1440, 10080)
on conflict (priority) do nothing;

drop trigger if exists maintenance_sla_settings_set_updated_at on public.maintenance_sla_settings;
create trigger maintenance_sla_settings_set_updated_at before update on public.maintenance_sla_settings for each row execute function public.set_updated_at();

alter table public.maintenance_sla_settings enable row level security;

drop policy if exists "maintenance_sla_settings_public_read" on public.maintenance_sla_settings;
create policy "maintenance_sla_settings_public_read"
  on public.maintenance_sla_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "maintenance_sla_settings_manage_all" on public.maintenance_sla_settings;
create policy "maintenance_sla_settings_manage_all"
  on public.maintenance_sla_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- maintenance_settings (singleton, mirrors valuation_settings/
-- accounting_settings exactly) — section 34/35 thresholds, alert lead
-- times, currency and the inspection-report disclaimer.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_settings (
  id smallint primary key default 1,
  recurring_issue_threshold_count smallint not null default 3,
  recurring_issue_window_days integer not null default 90,
  warranty_alert_days_before integer not null default 30,
  preventive_maintenance_alert_days_before integer not null default 14,
  condition_score_excellent_min numeric(5, 2) not null default 90,
  condition_score_good_min numeric(5, 2) not null default 75,
  condition_score_fair_min numeric(5, 2) not null default 50,
  condition_score_needs_attention_min numeric(5, 2) not null default 25,
  currency text not null default 'PKR',
  disclaimer_text text not null default 'This inspection report reflects the condition observed on the inspection date only. It is not a warranty, guarantee, or certification of a property''s future condition. Estimated repair costs, where shown, are approximate and may vary. This report does not replace a specialized structural, electrical or engineering survey where one is required.',
  updated_at timestamptz not null default now(),
  constraint maintenance_settings_singleton check (id = 1)
);

insert into public.maintenance_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists maintenance_settings_set_updated_at on public.maintenance_settings;
create trigger maintenance_settings_set_updated_at before update on public.maintenance_settings for each row execute function public.set_updated_at();

alter table public.maintenance_settings enable row level security;

drop policy if exists "maintenance_settings_public_read" on public.maintenance_settings;
create policy "maintenance_settings_public_read"
  on public.maintenance_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "maintenance_settings_admin_write" on public.maintenance_settings;
create policy "maintenance_settings_admin_write"
  on public.maintenance_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- maintenance_audit_logs (section 43) — mirrors financial_audit_logs /
-- investment_audit_logs exactly.
-- ---------------------------------------------------------------------
create table if not exists public.maintenance_audit_logs (
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

create index if not exists maintenance_audit_logs_entity_idx on public.maintenance_audit_logs (entity_type, entity_id);
create index if not exists maintenance_audit_logs_created_idx on public.maintenance_audit_logs (created_at);

alter table public.maintenance_audit_logs enable row level security;

drop policy if exists "maintenance_audit_logs_manage_all" on public.maintenance_audit_logs;
create policy "maintenance_audit_logs_manage_all"
  on public.maintenance_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- New document_types (section 39, 23) — inspection reports and vendor/
-- warranty documents are stored through the EXISTING secure document
-- vault from STEP 20, so they just need their own type codes there.
-- ---------------------------------------------------------------------
insert into public.document_types (code, label, category, requires_expiry, sort_order) values
  ('INSPECTION_REPORT', 'Inspection Report', 'Property', false, 210),
  ('WARRANTY_DOCUMENT', 'Warranty Document', 'Property', true, 220),
  ('VENDOR_DOCUMENT', 'Vendor Document', 'Other', false, 230),
  ('MAINTENANCE_INVOICE', 'Maintenance Invoice', 'Financial', false, 240)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- New AdminSection "maintenance" nav/permission gate — mirrors STEP
-- 23/24's addition of "accounting"/"investment" (code-level in
-- permissions.ts, no DB change needed since section gating isn't stored
-- in the database).
-- ---------------------------------------------------------------------
