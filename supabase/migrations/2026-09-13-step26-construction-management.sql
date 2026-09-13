-- =====================================================================
-- STEP 26 — Complete Construction Project Management System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
--
-- DESIGN NOTES (disclosed up front, not buried):
--   - "construction_suppliers" is NOT a separate table. Suppliers and
--     construction contractors are both just "an external company you
--     deal with" — exactly what STEP 25's `maintenance_vendors` already
--     models (business_name, contact_person, phone, email, address,
--     service_categories, status, notes, rating). Rather than a second,
--     near-identical directory, purchase orders reference
--     maintenance_vendors directly, and `construction_contractors`
--     below is a per-project ENGAGEMENT (contract value, dates,
--     performance) that references maintenance_vendors for identity —
--     never duplicating name/contact/phone. maintenance_vendors gains
--     one new nullable `tax_number` column for supplier tax info
--     (section 18), which does not affect any existing STEP 25 code.
--   - No separate per-workflow approval tables (budget/BOQ/PO/material-
--     request/change-order/work-order/expense/completion approvals).
--     Section 47's own table list already asks for ONE
--     `construction_approvals` table — a single polymorphic
--     (entity_type/entity_id) approval log serves every workflow
--     listed in section 34, exactly as named.
--   - Budget "committed/actual/remaining/variance" (section 23) and BOQ
--     estimated/approved/actual amounts, purchase-order totals, and
--     labor total-cost are computed figures. Only the real inputs
--     (budgeted_amount, quantity, rate, hours, ...) plus the computed
--     result are stored as NUMERIC — the same convention as every
--     financial figure elsewhere in this codebase (STEP 23 accounting,
--     STEP 24 investment, STEP 25 maintenance): a real NUMERIC/DECIMAL
--     column for storage precision, ordinary (rounded-at-write) JS
--     arithmetic in the service layer, never a client-side recompute of
--     an authoritative figure. "committed" and "actual" themselves are
--     NEVER stored on construction_budgets — they are always derived
--     live from real construction_expenses/purchase_orders/work_orders
--     rows, so there is nothing to drift out of sync (section 23's own
--     "never modify historical actual transactions to manipulate
--     profitability" requirement).
--   - Construction costs integrate with the EXISTING accounting module
--     exactly like STEP 25 maintenance did: a construction_expenses row
--     can be "logged as an expense" against the existing '5050
--     Construction' account (seeded in STEP 23) via the existing
--     expenseService — the normal Draft→Submitted→Approved→Paid
--     workflow and the real financial_transactions row on Paid are
--     reused unchanged. construction_expenses.expense_id just links to
--     that row.
--   - Payment tracking (section 39) reuses whatever real payment
--     records already exist against this project's linked deal
--     (deal_payments/financial_transactions) — never a parallel
--     "payment confirmation" of its own.
--   - construction_equipment optionally links to the EXISTING
--     maintenance_assets (asset_id) so equipment already tracked there
--     (with its own warranty/service history) is never duplicated.
--   - Photos/videos reuse the EXISTING private `secure-documents`
--     Storage bucket and signed-URL helpers (documentStorage.ts) from
--     STEP 20 — no new bucket, no public URLs, ever.
--   - Project documents (section 33) reuse the EXISTING `documents`
--     table/vault from STEP 20 (new document_type codes only).
--   - No contractor login/portal — exactly the same disclosed
--     limitation as STEP 25's vendor portal: contractors are admin-
--     managed records, contacted directly; work order progress is
--     recorded by staff on their behalf.
--   - Status-transition legality (project/phase/milestone/task/material
--     request/PO/contractor work order/change order/quality issue/
--     safety/snag/handover) is enforced in the TypeScript service layer
--     (ALLOWED_TRANSITIONS maps), exactly like every prior step.
--   - Circular task-dependency prevention (section 10) is enforced in
--     the service layer via a graph-reachability check before insert —
--     not a recursive DB constraint, consistent with how this codebase
--     always keeps business-rule validation in TypeScript.
-- =====================================================================

-- ---------------------------------------------------------------------
-- maintenance_vendors gains a nullable tax_number (section 18) — purely
-- additive, does not affect any STEP 25 code or data.
-- ---------------------------------------------------------------------
alter table public.maintenance_vendors add column if not exists tax_number text;

-- ---------------------------------------------------------------------
-- Server-side, never-frontend-generated reference numbers.
-- ---------------------------------------------------------------------
create sequence if not exists public.construction_project_seq;
create sequence if not exists public.construction_boq_seq;
create sequence if not exists public.construction_po_seq;
create sequence if not exists public.construction_work_order_seq;
create sequence if not exists public.construction_change_order_seq;
create sequence if not exists public.construction_site_report_seq;
create sequence if not exists public.construction_material_request_seq;
create sequence if not exists public.construction_snag_seq;
create sequence if not exists public.construction_task_seq;

create or replace function public.next_construction_project_number()
returns text language sql volatile as $$
  select 'CONST-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_project_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_boq_number()
returns text language sql volatile as $$
  select 'BOQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_boq_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_po_number()
returns text language sql volatile as $$
  select 'PO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_po_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_work_order_number()
returns text language sql volatile as $$
  select 'CWO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_work_order_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_change_order_number()
returns text language sql volatile as $$
  select 'CO-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_change_order_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_site_report_number()
returns text language sql volatile as $$
  select 'SITE-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_site_report_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_material_request_number()
returns text language sql volatile as $$
  select 'CMR-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_material_request_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_snag_number()
returns text language sql volatile as $$
  select 'SNAG-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_snag_seq')::text, 5, '0');
$$;

create or replace function public.next_construction_task_number()
returns text language sql volatile as $$
  select 'TSK-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.construction_task_seq')::text, 5, '0');
$$;

-- ---------------------------------------------------------------------
-- construction_projects (sections 3-5)
-- ---------------------------------------------------------------------
create table if not exists public.construction_projects (
  id uuid primary key default gen_random_uuid(),
  project_number text not null unique default public.next_construction_project_number(),
  project_name text not null,
  reference_project_id uuid references public.projects (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  customer_id uuid references auth.users (id) on delete set null,
  deal_id uuid references public.deals (id) on delete set null,
  location text,
  project_type text not null check (project_type in ('Residential Construction', 'Commercial Construction', 'Renovation', 'Interior Fit-Out', 'Villa Construction', 'Apartment Construction', 'Office Construction', 'Retail Construction', 'Infrastructure', 'Maintenance Construction', 'Other')),
  description text,
  start_date date,
  planned_completion_date date,
  actual_completion_date date,
  status text not null default 'PLANNING' check (status in ('PLANNING', 'APPROVAL_PENDING', 'APPROVED', 'MOBILIZATION', 'IN_PROGRESS', 'ON_HOLD', 'DELAYED', 'PRACTICALLY_COMPLETE', 'COMPLETED', 'CANCELLED')),
  project_manager_id uuid references public.admin_profiles (id) on delete set null,
  site_manager_id uuid references public.admin_profiles (id) on delete set null,
  approved_budget numeric(16, 2) check (approved_budget is null or approved_budget >= 0),
  contract_value numeric(16, 2) check (contract_value is null or contract_value >= 0),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  updated_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_projects_reference_project_idx on public.construction_projects (reference_project_id);
create index if not exists construction_projects_property_idx on public.construction_projects (property_id);
create index if not exists construction_projects_customer_idx on public.construction_projects (customer_id);
create index if not exists construction_projects_status_idx on public.construction_projects (status);
create index if not exists construction_projects_pm_idx on public.construction_projects (project_manager_id);
create index if not exists construction_projects_sm_idx on public.construction_projects (site_manager_id);

drop trigger if exists construction_projects_set_updated_at on public.construction_projects;
create trigger construction_projects_set_updated_at before update on public.construction_projects for each row execute function public.set_updated_at();

alter table public.construction_projects enable row level security;

drop policy if exists "construction_projects_manage_all" on public.construction_projects;
create policy "construction_projects_manage_all"
  on public.construction_projects for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_projects_assigned_staff_all" on public.construction_projects;
create policy "construction_projects_assigned_staff_all"
  on public.construction_projects for all
  to authenticated
  using (public.is_admin() and (project_manager_id = auth.uid() or site_manager_id = auth.uid()))
  with check (public.is_admin() and (project_manager_id = auth.uid() or site_manager_id = auth.uid()));

drop policy if exists "construction_projects_customer_read" on public.construction_projects;
create policy "construction_projects_customer_read"
  on public.construction_projects for select
  to authenticated
  using (customer_id = auth.uid());

-- ---------------------------------------------------------------------
-- construction_phases (section 6)
-- ---------------------------------------------------------------------
create table if not exists public.construction_phases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  name text not null,
  sequence integer not null default 1,
  planned_start date,
  planned_finish date,
  actual_start date,
  actual_finish date,
  weight numeric(5, 2) not null default 0 check (weight >= 0 and weight <= 100),
  progress numeric(5, 2) not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'ON_HOLD', 'CANCELLED')),
  responsible_person_id uuid references public.admin_profiles (id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_phases_project_idx on public.construction_phases (project_id, sequence);
create index if not exists construction_phases_status_idx on public.construction_phases (status);

drop trigger if exists construction_phases_set_updated_at on public.construction_phases;
create trigger construction_phases_set_updated_at before update on public.construction_phases for each row execute function public.set_updated_at();

alter table public.construction_phases enable row level security;

drop policy if exists "construction_phases_manage_all" on public.construction_phases;
create policy "construction_phases_manage_all"
  on public.construction_phases for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "construction_phases_customer_read" on public.construction_phases;
create policy "construction_phases_customer_read"
  on public.construction_phases for select
  to authenticated
  using (exists (select 1 from public.construction_projects cp where cp.id = construction_phases.project_id and cp.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- construction_milestones (section 8)
-- ---------------------------------------------------------------------
create table if not exists public.construction_milestones (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  name text not null,
  planned_date date,
  actual_date date,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'DELAYED', 'CANCELLED')),
  weight numeric(5, 2) not null default 0 check (weight >= 0 and weight <= 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_milestones_project_idx on public.construction_milestones (project_id);
create index if not exists construction_milestones_status_idx on public.construction_milestones (status);
create index if not exists construction_milestones_planned_date_idx on public.construction_milestones (planned_date);

drop trigger if exists construction_milestones_set_updated_at on public.construction_milestones;
create trigger construction_milestones_set_updated_at before update on public.construction_milestones for each row execute function public.set_updated_at();

alter table public.construction_milestones enable row level security;

drop policy if exists "construction_milestones_manage_all" on public.construction_milestones;
create policy "construction_milestones_manage_all"
  on public.construction_milestones for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "construction_milestones_customer_read" on public.construction_milestones;
create policy "construction_milestones_customer_read"
  on public.construction_milestones for select
  to authenticated
  using (exists (select 1 from public.construction_projects cp where cp.id = construction_milestones.project_id and cp.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- construction_contractors (section 19) — the per-project ENGAGEMENT;
-- identity/contact lives in maintenance_vendors (see DESIGN NOTES).
-- ---------------------------------------------------------------------
create table if not exists public.construction_contractors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  vendor_id uuid not null references public.maintenance_vendors (id) on delete restrict,
  service_category text,
  contract_value numeric(16, 2) check (contract_value is null or contract_value >= 0),
  start_date date,
  end_date date,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INACTIVE', 'SUSPENDED', 'COMPLETED')),
  performance_notes text,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_contractors_project_idx on public.construction_contractors (project_id);
create index if not exists construction_contractors_vendor_idx on public.construction_contractors (vendor_id);
create index if not exists construction_contractors_status_idx on public.construction_contractors (status);

drop trigger if exists construction_contractors_set_updated_at on public.construction_contractors;
create trigger construction_contractors_set_updated_at before update on public.construction_contractors for each row execute function public.set_updated_at();

alter table public.construction_contractors enable row level security;

drop policy if exists "construction_contractors_manage_all" on public.construction_contractors;
create policy "construction_contractors_manage_all"
  on public.construction_contractors for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_contractors_staff_read" on public.construction_contractors;
create policy "construction_contractors_staff_read"
  on public.construction_contractors for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_tasks (sections 9-10)
-- ---------------------------------------------------------------------
create table if not exists public.construction_tasks (
  id uuid primary key default gen_random_uuid(),
  task_number text not null unique default public.next_construction_task_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  title text not null,
  description text,
  assigned_user_id uuid references public.admin_profiles (id) on delete set null,
  contractor_id uuid references public.construction_contractors (id) on delete set null,
  start_date date,
  due_date date,
  completion_date date,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'CRITICAL')),
  status text not null default 'TODO' check (status in ('TODO', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED', 'CANCELLED')),
  progress numeric(5, 2) not null default 0 check (progress >= 0 and progress <= 100),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_tasks_project_idx on public.construction_tasks (project_id);
create index if not exists construction_tasks_phase_idx on public.construction_tasks (phase_id);
create index if not exists construction_tasks_assigned_idx on public.construction_tasks (assigned_user_id);
create index if not exists construction_tasks_status_idx on public.construction_tasks (status);
create index if not exists construction_tasks_priority_idx on public.construction_tasks (priority);
create index if not exists construction_tasks_due_date_idx on public.construction_tasks (due_date);

drop trigger if exists construction_tasks_set_updated_at on public.construction_tasks;
create trigger construction_tasks_set_updated_at before update on public.construction_tasks for each row execute function public.set_updated_at();

alter table public.construction_tasks enable row level security;

drop policy if exists "construction_tasks_manage_all" on public.construction_tasks;
create policy "construction_tasks_manage_all"
  on public.construction_tasks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_task_dependencies (section 10)
-- ---------------------------------------------------------------------
create table if not exists public.construction_task_dependencies (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.construction_tasks (id) on delete cascade,
  depends_on_task_id uuid not null references public.construction_tasks (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint construction_task_dependencies_no_self check (task_id <> depends_on_task_id),
  constraint construction_task_dependencies_unique unique (task_id, depends_on_task_id)
);

create index if not exists construction_task_dependencies_task_idx on public.construction_task_dependencies (task_id);
create index if not exists construction_task_dependencies_depends_on_idx on public.construction_task_dependencies (depends_on_task_id);

alter table public.construction_task_dependencies enable row level security;

drop policy if exists "construction_task_dependencies_manage_all" on public.construction_task_dependencies;
create policy "construction_task_dependencies_manage_all"
  on public.construction_task_dependencies for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_boq + construction_boq_items (sections 12-13, 34)
-- ---------------------------------------------------------------------
create table if not exists public.construction_boq (
  id uuid primary key default gen_random_uuid(),
  boq_number text not null unique default public.next_construction_boq_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED')),
  created_by uuid references public.admin_profiles (id) on delete set null,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  approved_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_boq_project_idx on public.construction_boq (project_id);
create index if not exists construction_boq_status_idx on public.construction_boq (status);

drop trigger if exists construction_boq_set_updated_at on public.construction_boq;
create trigger construction_boq_set_updated_at before update on public.construction_boq for each row execute function public.set_updated_at();

alter table public.construction_boq enable row level security;

drop policy if exists "construction_boq_manage_all" on public.construction_boq;
create policy "construction_boq_manage_all"
  on public.construction_boq for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_boq_staff_read" on public.construction_boq;
create policy "construction_boq_staff_read"
  on public.construction_boq for select
  to authenticated
  using (public.is_admin());

create table if not exists public.construction_boq_items (
  id uuid primary key default gen_random_uuid(),
  boq_id uuid not null references public.construction_boq (id) on delete cascade,
  category text not null check (category in ('Civil', 'Structure', 'Brickwork', 'Concrete', 'Steel', 'Electrical', 'Plumbing', 'HVAC', 'Flooring', 'Painting', 'Woodwork', 'Aluminum', 'Glass', 'Kitchen', 'Sanitary', 'External Works', 'Labor', 'Other')),
  section text,
  item text not null,
  description text,
  unit text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  estimated_rate numeric(14, 2) not null default 0 check (estimated_rate >= 0),
  estimated_amount numeric(16, 2) not null default 0 check (estimated_amount >= 0),
  approved_rate numeric(14, 2) check (approved_rate is null or approved_rate >= 0),
  approved_amount numeric(16, 2) check (approved_amount is null or approved_amount >= 0),
  actual_quantity numeric(14, 3) check (actual_quantity is null or actual_quantity >= 0),
  actual_rate numeric(14, 2) check (actual_rate is null or actual_rate >= 0),
  actual_amount numeric(16, 2) check (actual_amount is null or actual_amount >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_boq_items_boq_idx on public.construction_boq_items (boq_id);
create index if not exists construction_boq_items_category_idx on public.construction_boq_items (category);

drop trigger if exists construction_boq_items_set_updated_at on public.construction_boq_items;
create trigger construction_boq_items_set_updated_at before update on public.construction_boq_items for each row execute function public.set_updated_at();

alter table public.construction_boq_items enable row level security;

drop policy if exists "construction_boq_items_manage_all" on public.construction_boq_items;
create policy "construction_boq_items_manage_all"
  on public.construction_boq_items for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_boq_items_staff_read" on public.construction_boq_items;
create policy "construction_boq_items_staff_read"
  on public.construction_boq_items for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_materials + movements + requests (sections 14-16)
-- ---------------------------------------------------------------------
create table if not exists public.construction_materials (
  id uuid primary key default gen_random_uuid(),
  material_code text not null,
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  name text not null,
  category text not null check (category in ('Cement', 'Steel', 'Bricks', 'Sand', 'Crush', 'Tiles', 'Paint', 'Pipes', 'Electrical Cable', 'Sanitary Items', 'Wood', 'Glass', 'Other')),
  unit text not null,
  required_quantity numeric(14, 3) not null default 0 check (required_quantity >= 0),
  ordered_quantity numeric(14, 3) not null default 0 check (ordered_quantity >= 0),
  received_quantity numeric(14, 3) not null default 0 check (received_quantity >= 0),
  used_quantity numeric(14, 3) not null default 0 check (used_quantity >= 0),
  reorder_threshold numeric(14, 3),
  estimated_rate numeric(14, 2),
  actual_rate numeric(14, 2),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_materials_code_unique unique (project_id, material_code)
);

create index if not exists construction_materials_project_idx on public.construction_materials (project_id);
create index if not exists construction_materials_category_idx on public.construction_materials (category);

drop trigger if exists construction_materials_set_updated_at on public.construction_materials;
create trigger construction_materials_set_updated_at before update on public.construction_materials for each row execute function public.set_updated_at();

alter table public.construction_materials enable row level security;

drop policy if exists "construction_materials_manage_all" on public.construction_materials;
create policy "construction_materials_manage_all"
  on public.construction_materials for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.construction_material_movements (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references public.construction_materials (id) on delete cascade,
  movement_type text not null check (movement_type in ('ORDERED', 'RECEIVED', 'ISSUED', 'RETURNED', 'ADJUSTED')),
  quantity numeric(14, 3) not null check (quantity <> 0),
  reference text,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists construction_material_movements_material_idx on public.construction_material_movements (material_id, created_at desc);
create index if not exists construction_material_movements_type_idx on public.construction_material_movements (movement_type);

alter table public.construction_material_movements enable row level security;

drop policy if exists "construction_material_movements_manage_all" on public.construction_material_movements;
create policy "construction_material_movements_manage_all"
  on public.construction_material_movements for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.construction_material_requests (
  id uuid primary key default gen_random_uuid(),
  request_number text not null unique default public.next_construction_material_request_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  material_id uuid references public.construction_materials (id) on delete set null,
  material_name text,
  requested_by uuid references public.admin_profiles (id) on delete set null,
  quantity numeric(14, 3) not null check (quantity > 0),
  required_date date,
  priority text not null default 'NORMAL' check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  reason text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_material_requests_name_check check (material_id is not null or material_name is not null)
);

create index if not exists construction_material_requests_project_idx on public.construction_material_requests (project_id);
create index if not exists construction_material_requests_status_idx on public.construction_material_requests (status);
create index if not exists construction_material_requests_priority_idx on public.construction_material_requests (priority);

drop trigger if exists construction_material_requests_set_updated_at on public.construction_material_requests;
create trigger construction_material_requests_set_updated_at before update on public.construction_material_requests for each row execute function public.set_updated_at();

alter table public.construction_material_requests enable row level security;

drop policy if exists "construction_material_requests_manage_all" on public.construction_material_requests;
create policy "construction_material_requests_manage_all"
  on public.construction_material_requests for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_purchase_orders + items (sections 17-18)
-- ---------------------------------------------------------------------
create table if not exists public.construction_purchase_orders (
  id uuid primary key default gen_random_uuid(),
  po_number text not null unique default public.next_construction_po_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  vendor_id uuid not null references public.maintenance_vendors (id) on delete restrict,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'ORDERED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED')),
  expected_delivery date,
  tax_percent numeric(5, 2) not null default 0 check (tax_percent >= 0),
  discount_amount numeric(14, 2) not null default 0 check (discount_amount >= 0),
  subtotal numeric(16, 2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(14, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(16, 2) not null default 0 check (total_amount >= 0),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_purchase_orders_project_idx on public.construction_purchase_orders (project_id);
create index if not exists construction_purchase_orders_vendor_idx on public.construction_purchase_orders (vendor_id);
create index if not exists construction_purchase_orders_status_idx on public.construction_purchase_orders (status);

drop trigger if exists construction_purchase_orders_set_updated_at on public.construction_purchase_orders;
create trigger construction_purchase_orders_set_updated_at before update on public.construction_purchase_orders for each row execute function public.set_updated_at();

alter table public.construction_purchase_orders enable row level security;

drop policy if exists "construction_purchase_orders_manage_all" on public.construction_purchase_orders;
create policy "construction_purchase_orders_manage_all"
  on public.construction_purchase_orders for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_purchase_orders_staff_read" on public.construction_purchase_orders;
create policy "construction_purchase_orders_staff_read"
  on public.construction_purchase_orders for select
  to authenticated
  using (public.is_admin());

create table if not exists public.construction_purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  po_id uuid not null references public.construction_purchase_orders (id) on delete cascade,
  material_id uuid references public.construction_materials (id) on delete set null,
  description text not null,
  quantity numeric(14, 3) not null check (quantity > 0),
  rate numeric(14, 2) not null default 0 check (rate >= 0),
  amount numeric(16, 2) not null default 0 check (amount >= 0),
  created_at timestamptz not null default now()
);

create index if not exists construction_purchase_order_items_po_idx on public.construction_purchase_order_items (po_id);

alter table public.construction_purchase_order_items enable row level security;

drop policy if exists "construction_purchase_order_items_manage_all" on public.construction_purchase_order_items;
create policy "construction_purchase_order_items_manage_all"
  on public.construction_purchase_order_items for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_purchase_order_items_staff_read" on public.construction_purchase_order_items;
create policy "construction_purchase_order_items_staff_read"
  on public.construction_purchase_order_items for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_work_orders (section 20) — contractor work packages;
-- distinct from STEP 25's maintenance_work_orders (different domain,
-- different number prefix "CWO-" to avoid any confusion).
-- ---------------------------------------------------------------------
create table if not exists public.construction_work_orders (
  id uuid primary key default gen_random_uuid(),
  work_order_number text not null unique default public.next_construction_work_order_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  contractor_id uuid not null references public.construction_contractors (id) on delete restrict,
  scope text not null,
  contract_amount numeric(16, 2) check (contract_amount is null or contract_amount >= 0),
  start_date date,
  due_date date,
  progress numeric(5, 2) not null default 0 check (progress >= 0 and progress <= 100),
  status text not null default 'ASSIGNED' check (status in ('ASSIGNED', 'STARTED', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED', 'CANCELLED')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_work_orders_project_idx on public.construction_work_orders (project_id);
create index if not exists construction_work_orders_contractor_idx on public.construction_work_orders (contractor_id);
create index if not exists construction_work_orders_status_idx on public.construction_work_orders (status);

drop trigger if exists construction_work_orders_set_updated_at on public.construction_work_orders;
create trigger construction_work_orders_set_updated_at before update on public.construction_work_orders for each row execute function public.set_updated_at();

alter table public.construction_work_orders enable row level security;

drop policy if exists "construction_work_orders_manage_all" on public.construction_work_orders;
create policy "construction_work_orders_manage_all"
  on public.construction_work_orders for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_labor_records (section 21) — cost tracking only, never
-- a payroll/disbursement system (none exists in this codebase).
-- ---------------------------------------------------------------------
create table if not exists public.construction_labor_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  worker_or_team text not null,
  trade text not null check (trade in ('Mason', 'Electrician', 'Plumber', 'Carpenter', 'Painter', 'Welder', 'Tile Worker', 'HVAC Technician', 'General Labor', 'Other')),
  record_date date not null default current_date,
  hours numeric(6, 2) not null check (hours >= 0),
  daily_rate numeric(12, 2) check (daily_rate is null or daily_rate >= 0),
  overtime_hours numeric(6, 2) not null default 0 check (overtime_hours >= 0),
  overtime_rate numeric(12, 2) check (overtime_rate is null or overtime_rate >= 0),
  total_labor_cost numeric(14, 2) not null default 0 check (total_labor_cost >= 0),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists construction_labor_records_project_idx on public.construction_labor_records (project_id, record_date desc);
create index if not exists construction_labor_records_trade_idx on public.construction_labor_records (trade);

alter table public.construction_labor_records enable row level security;

drop policy if exists "construction_labor_records_manage_all" on public.construction_labor_records;
create policy "construction_labor_records_manage_all"
  on public.construction_labor_records for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_equipment (section 22)
-- ---------------------------------------------------------------------
create table if not exists public.construction_equipment (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  equipment_name text not null,
  category text not null check (category in ('Generator', 'Excavator', 'Crane', 'Concrete Mixer', 'Scaffolding', 'Compactor', 'Vehicle', 'Other')),
  owner_or_vendor text,
  asset_id uuid references public.maintenance_assets (id) on delete set null,
  start_date date,
  end_date date,
  usage_hours numeric(10, 2) check (usage_hours is null or usage_hours >= 0),
  rental_rate numeric(12, 2) check (rental_rate is null or rental_rate >= 0),
  maintenance_status text not null default 'OPERATIONAL' check (maintenance_status in ('OPERATIONAL', 'UNDER_MAINTENANCE', 'OUT_OF_SERVICE')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_equipment_project_idx on public.construction_equipment (project_id);
create index if not exists construction_equipment_asset_idx on public.construction_equipment (asset_id);

drop trigger if exists construction_equipment_set_updated_at on public.construction_equipment;
create trigger construction_equipment_set_updated_at before update on public.construction_equipment for each row execute function public.set_updated_at();

alter table public.construction_equipment enable row level security;

drop policy if exists "construction_equipment_manage_all" on public.construction_equipment;
create policy "construction_equipment_manage_all"
  on public.construction_equipment for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_budgets (section 23) — only the real budgeted figure is
-- stored; committed/actual/remaining/variance are always derived live.
-- ---------------------------------------------------------------------
create table if not exists public.construction_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  category text not null check (category in ('Materials', 'Labor', 'Contractors', 'Equipment', 'Transportation', 'Permits', 'Consultants', 'Utilities', 'Other')),
  budgeted_amount numeric(16, 2) not null default 0 check (budgeted_amount >= 0),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint construction_budgets_category_unique unique (project_id, category)
);

create index if not exists construction_budgets_project_idx on public.construction_budgets (project_id);

drop trigger if exists construction_budgets_set_updated_at on public.construction_budgets;
create trigger construction_budgets_set_updated_at before update on public.construction_budgets for each row execute function public.set_updated_at();

alter table public.construction_budgets enable row level security;

drop policy if exists "construction_budgets_manage_all" on public.construction_budgets;
create policy "construction_budgets_manage_all"
  on public.construction_budgets for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_budgets_staff_read" on public.construction_budgets;
create policy "construction_budgets_staff_read"
  on public.construction_budgets for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_expenses (section 24) — integrates with the EXISTING
-- accounting module via expense_id, never a parallel ledger.
-- ---------------------------------------------------------------------
create table if not exists public.construction_expenses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  boq_item_id uuid references public.construction_boq_items (id) on delete set null,
  vendor_id uuid references public.maintenance_vendors (id) on delete set null,
  contractor_id uuid references public.construction_contractors (id) on delete set null,
  category text not null check (category in ('Materials', 'Labor', 'Contractors', 'Equipment', 'Transportation', 'Permits', 'Consultants', 'Utilities', 'Other')),
  description text not null,
  amount numeric(16, 2) not null check (amount >= 0),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID')),
  expense_id uuid references public.expenses (id) on delete set null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_expenses_project_idx on public.construction_expenses (project_id);
create index if not exists construction_expenses_phase_idx on public.construction_expenses (phase_id);
create index if not exists construction_expenses_category_idx on public.construction_expenses (category);
create index if not exists construction_expenses_status_idx on public.construction_expenses (status);

drop trigger if exists construction_expenses_set_updated_at on public.construction_expenses;
create trigger construction_expenses_set_updated_at before update on public.construction_expenses for each row execute function public.set_updated_at();

alter table public.construction_expenses enable row level security;

drop policy if exists "construction_expenses_manage_all" on public.construction_expenses;
create policy "construction_expenses_manage_all"
  on public.construction_expenses for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_expenses_staff_read" on public.construction_expenses;
create policy "construction_expenses_staff_read"
  on public.construction_expenses for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_change_orders (sections 26-27)
-- ---------------------------------------------------------------------
create table if not exists public.construction_change_orders (
  id uuid primary key default gen_random_uuid(),
  change_order_number text not null unique default public.next_construction_change_order_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  description text not null,
  reason text,
  requested_by uuid references public.admin_profiles (id) on delete set null,
  cost_impact numeric(16, 2) not null default 0,
  schedule_impact_days integer not null default 0,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'IMPLEMENTED', 'CANCELLED')),
  approved_by uuid references public.admin_profiles (id) on delete set null,
  approval_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_change_orders_project_idx on public.construction_change_orders (project_id);
create index if not exists construction_change_orders_status_idx on public.construction_change_orders (status);

drop trigger if exists construction_change_orders_set_updated_at on public.construction_change_orders;
create trigger construction_change_orders_set_updated_at before update on public.construction_change_orders for each row execute function public.set_updated_at();

alter table public.construction_change_orders enable row level security;

drop policy if exists "construction_change_orders_manage_all" on public.construction_change_orders;
create policy "construction_change_orders_manage_all"
  on public.construction_change_orders for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_change_orders_staff_read" on public.construction_change_orders;
create policy "construction_change_orders_staff_read"
  on public.construction_change_orders for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_site_reports + construction_site_media (sections 28-29)
-- ---------------------------------------------------------------------
create table if not exists public.construction_site_reports (
  id uuid primary key default gen_random_uuid(),
  report_number text not null unique default public.next_construction_site_report_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  report_date date not null default current_date,
  site_manager_id uuid references public.admin_profiles (id) on delete set null,
  weather text,
  workers_present integer check (workers_present is null or workers_present >= 0),
  contractors_present text,
  work_completed text,
  work_planned text,
  materials_received text,
  equipment_used text,
  issues text,
  safety_incidents text,
  delays text,
  visitors text,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_site_reports_project_idx on public.construction_site_reports (project_id, report_date desc);

drop trigger if exists construction_site_reports_set_updated_at on public.construction_site_reports;
create trigger construction_site_reports_set_updated_at before update on public.construction_site_reports for each row execute function public.set_updated_at();

alter table public.construction_site_reports enable row level security;

drop policy if exists "construction_site_reports_manage_all" on public.construction_site_reports;
create policy "construction_site_reports_manage_all"
  on public.construction_site_reports for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_quality_inspections + construction_quality_issues
-- (section 30) — created before construction_site_media so media can
-- reference an inspection.
-- ---------------------------------------------------------------------
create table if not exists public.construction_quality_inspections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  category text not null check (category in ('Concrete', 'Steel', 'Brickwork', 'Plaster', 'Electrical', 'Plumbing', 'Waterproofing', 'Flooring', 'Painting', 'Doors/Windows', 'Finishing', 'Other')),
  inspector_id uuid references public.admin_profiles (id) on delete set null,
  inspection_date date not null default current_date,
  result text not null default 'REQUIRES_REVIEW' check (result in ('PASSED', 'FAILED', 'CONDITIONAL', 'REQUIRES_REVIEW')),
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_quality_inspections_project_idx on public.construction_quality_inspections (project_id);
create index if not exists construction_quality_inspections_result_idx on public.construction_quality_inspections (result);

drop trigger if exists construction_quality_inspections_set_updated_at on public.construction_quality_inspections;
create trigger construction_quality_inspections_set_updated_at before update on public.construction_quality_inspections for each row execute function public.set_updated_at();

alter table public.construction_quality_inspections enable row level security;

drop policy if exists "construction_quality_inspections_manage_all" on public.construction_quality_inspections;
create policy "construction_quality_inspections_manage_all"
  on public.construction_quality_inspections for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.construction_quality_issues (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.construction_quality_inspections (id) on delete cascade,
  description text not null,
  corrective_action text,
  responsible_party text,
  due_date date,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED')),
  verified_by uuid references public.admin_profiles (id) on delete set null,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_quality_issues_inspection_idx on public.construction_quality_issues (inspection_id);
create index if not exists construction_quality_issues_status_idx on public.construction_quality_issues (status);

drop trigger if exists construction_quality_issues_set_updated_at on public.construction_quality_issues;
create trigger construction_quality_issues_set_updated_at before update on public.construction_quality_issues for each row execute function public.set_updated_at();

alter table public.construction_quality_issues enable row level security;

drop policy if exists "construction_quality_issues_manage_all" on public.construction_quality_issues;
create policy "construction_quality_issues_manage_all"
  on public.construction_quality_issues for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_site_media (section 29) — private, signed-URL access
-- only, exactly like STEP 25's inspection/maintenance photos.
-- ---------------------------------------------------------------------
create table if not exists public.construction_site_media (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  task_id uuid references public.construction_tasks (id) on delete set null,
  report_id uuid references public.construction_site_reports (id) on delete set null,
  inspection_id uuid references public.construction_quality_inspections (id) on delete set null,
  media_type text not null default 'PHOTO' check (media_type in ('PHOTO', 'VIDEO')),
  storage_path text not null,
  caption text,
  customer_visible boolean not null default false,
  uploaded_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists construction_site_media_project_idx on public.construction_site_media (project_id, created_at desc);
create index if not exists construction_site_media_customer_visible_idx on public.construction_site_media (project_id) where customer_visible;

alter table public.construction_site_media enable row level security;

drop policy if exists "construction_site_media_manage_all" on public.construction_site_media;
create policy "construction_site_media_manage_all"
  on public.construction_site_media for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "construction_site_media_customer_read" on public.construction_site_media;
create policy "construction_site_media_customer_read"
  on public.construction_site_media for select
  to authenticated
  using (customer_visible = true and exists (select 1 from public.construction_projects cp where cp.id = construction_site_media.project_id and cp.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- construction_safety_records (section 31)
-- ---------------------------------------------------------------------
create table if not exists public.construction_safety_records (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  record_type text not null check (record_type in ('INSPECTION', 'HAZARD', 'INCIDENT', 'NEAR_MISS')),
  description text not null,
  reported_by uuid references public.admin_profiles (id) on delete set null,
  record_date date not null default current_date,
  corrective_action text,
  responsible_person_id uuid references public.admin_profiles (id) on delete set null,
  due_date date,
  status text not null default 'OPEN' check (status in ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_safety_records_project_idx on public.construction_safety_records (project_id);
create index if not exists construction_safety_records_type_idx on public.construction_safety_records (record_type);
create index if not exists construction_safety_records_status_idx on public.construction_safety_records (status);

drop trigger if exists construction_safety_records_set_updated_at on public.construction_safety_records;
create trigger construction_safety_records_set_updated_at before update on public.construction_safety_records for each row execute function public.set_updated_at();

alter table public.construction_safety_records enable row level security;

drop policy if exists "construction_safety_records_manage_all" on public.construction_safety_records;
create policy "construction_safety_records_manage_all"
  on public.construction_safety_records for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_delays (section 32) — never auto-assigns blame; the
-- `responsibility` field is a plain, admin-entered description.
-- ---------------------------------------------------------------------
create table if not exists public.construction_delays (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  phase_id uuid references public.construction_phases (id) on delete set null,
  task_id uuid references public.construction_tasks (id) on delete set null,
  reason text not null check (reason in ('Weather', 'Material Delay', 'Labor', 'Design Change', 'Approval', 'Contractor', 'Client', 'Site Condition', 'Other')),
  start_date date not null,
  end_date date,
  responsibility text,
  impact text,
  notes text,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_delays_project_idx on public.construction_delays (project_id);
create index if not exists construction_delays_reason_idx on public.construction_delays (reason);

drop trigger if exists construction_delays_set_updated_at on public.construction_delays;
create trigger construction_delays_set_updated_at before update on public.construction_delays for each row execute function public.set_updated_at();

alter table public.construction_delays enable row level security;

drop policy if exists "construction_delays_manage_all" on public.construction_delays;
create policy "construction_delays_manage_all"
  on public.construction_delays for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_risks (section 44) — never claims a risk will occur;
-- risk_score is a transparent probability×impact score (1-3 each → 1-9).
-- ---------------------------------------------------------------------
create table if not exists public.construction_risks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  risk text not null,
  category text not null check (category in ('Cost', 'Schedule', 'Quality', 'Safety', 'Material', 'Contractor', 'Design', 'Approval', 'External', 'Other')),
  probability text not null check (probability in ('LOW', 'MEDIUM', 'HIGH')),
  impact text not null check (impact in ('LOW', 'MEDIUM', 'HIGH')),
  risk_score integer not null default 0 check (risk_score >= 0 and risk_score <= 9),
  owner_id uuid references public.admin_profiles (id) on delete set null,
  mitigation text,
  status text not null default 'OPEN' check (status in ('OPEN', 'MONITORING', 'MITIGATED', 'CLOSED', 'OCCURRED')),
  review_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_risks_project_idx on public.construction_risks (project_id);
create index if not exists construction_risks_status_idx on public.construction_risks (status);
create index if not exists construction_risks_score_idx on public.construction_risks (risk_score desc);

drop trigger if exists construction_risks_set_updated_at on public.construction_risks;
create trigger construction_risks_set_updated_at before update on public.construction_risks for each row execute function public.set_updated_at();

alter table public.construction_risks enable row level security;

drop policy if exists "construction_risks_manage_all" on public.construction_risks;
create policy "construction_risks_manage_all"
  on public.construction_risks for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_handover (section 37) — one record per project.
-- ---------------------------------------------------------------------
create table if not exists public.construction_handover (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.construction_projects (id) on delete cascade,
  practical_completion_date date,
  final_inspection_date date,
  defect_list_completed boolean not null default false,
  defects_resolved boolean not null default false,
  customer_verified boolean not null default false,
  customer_verified_at timestamptz,
  handover_approved boolean not null default false,
  handover_approved_by uuid references public.admin_profiles (id) on delete set null,
  handover_date date,
  status text not null default 'NOT_STARTED' check (status in ('NOT_STARTED', 'PRACTICAL_COMPLETION', 'FINAL_INSPECTION', 'DEFECT_RESOLUTION', 'CUSTOMER_VERIFICATION', 'APPROVED', 'COMPLETED')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_handover_status_idx on public.construction_handover (status);

drop trigger if exists construction_handover_set_updated_at on public.construction_handover;
create trigger construction_handover_set_updated_at before update on public.construction_handover for each row execute function public.set_updated_at();

alter table public.construction_handover enable row level security;

drop policy if exists "construction_handover_manage_all" on public.construction_handover;
create policy "construction_handover_manage_all"
  on public.construction_handover for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "construction_handover_customer_read" on public.construction_handover;
create policy "construction_handover_customer_read"
  on public.construction_handover for select
  to authenticated
  using (exists (select 1 from public.construction_projects cp where cp.id = construction_handover.project_id and cp.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- construction_snags (section 38) — mirrors STEP 25's property_defects
-- shape for a familiar, consistent snagging workflow.
-- ---------------------------------------------------------------------
create table if not exists public.construction_snags (
  id uuid primary key default gen_random_uuid(),
  snag_number text not null unique default public.next_construction_snag_number(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  unit_id uuid references public.property_inventory (id) on delete set null,
  category text not null,
  description text not null,
  location text,
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  assigned_contractor_id uuid references public.construction_contractors (id) on delete set null,
  due_date date,
  status text not null default 'OPEN' check (status in ('OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'VERIFIED', 'CLOSED')),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists construction_snags_project_idx on public.construction_snags (project_id);
create index if not exists construction_snags_status_idx on public.construction_snags (status);
create index if not exists construction_snags_severity_idx on public.construction_snags (severity);

drop trigger if exists construction_snags_set_updated_at on public.construction_snags;
create trigger construction_snags_set_updated_at before update on public.construction_snags for each row execute function public.set_updated_at();

alter table public.construction_snags enable row level security;

drop policy if exists "construction_snags_manage_all" on public.construction_snags;
create policy "construction_snags_manage_all"
  on public.construction_snags for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_approvals (section 34) — ONE polymorphic approval log
-- for every workflow (budget/BOQ/PO/material-request/change-order/
-- work-order/expense/completion), per section 47's own table list.
-- ---------------------------------------------------------------------
create table if not exists public.construction_approvals (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('BUDGET', 'BOQ', 'PURCHASE_ORDER', 'MATERIAL_REQUEST', 'CHANGE_ORDER', 'WORK_ORDER', 'EXPENSE', 'PROJECT_COMPLETION')),
  entity_id uuid not null,
  approver_id uuid references public.admin_profiles (id) on delete set null,
  decision text not null default 'PENDING' check (decision in ('APPROVED', 'REJECTED', 'PENDING')),
  comments text,
  created_at timestamptz not null default now()
);

create index if not exists construction_approvals_entity_idx on public.construction_approvals (entity_type, entity_id);

alter table public.construction_approvals enable row level security;

drop policy if exists "construction_approvals_manage_all" on public.construction_approvals;
create policy "construction_approvals_manage_all"
  on public.construction_approvals for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

drop policy if exists "construction_approvals_staff_read" on public.construction_approvals;
create policy "construction_approvals_staff_read"
  on public.construction_approvals for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- construction_progress_updates (sections 7, 36, 41) — the real,
-- timestamped record behind every progress percentage ever shown;
-- `customer_visible` gates what appears in the customer portal.
-- ---------------------------------------------------------------------
create table if not exists public.construction_progress_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.construction_projects (id) on delete cascade,
  update_type text not null check (update_type in ('OVERALL', 'PHASE', 'MILESTONE', 'TASK')),
  reference_id uuid,
  planned_percent numeric(5, 2),
  actual_percent numeric(5, 2),
  notes text,
  customer_visible boolean not null default false,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists construction_progress_updates_project_idx on public.construction_progress_updates (project_id, created_at desc);
create index if not exists construction_progress_updates_type_idx on public.construction_progress_updates (update_type);

alter table public.construction_progress_updates enable row level security;

drop policy if exists "construction_progress_updates_manage_all" on public.construction_progress_updates;
create policy "construction_progress_updates_manage_all"
  on public.construction_progress_updates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "construction_progress_updates_customer_read" on public.construction_progress_updates;
create policy "construction_progress_updates_customer_read"
  on public.construction_progress_updates for select
  to authenticated
  using (customer_visible = true and exists (select 1 from public.construction_projects cp where cp.id = construction_progress_updates.project_id and cp.customer_id = auth.uid()));

-- ---------------------------------------------------------------------
-- construction_audit_logs (section 50) — mirrors financial_audit_logs/
-- investment_audit_logs/maintenance_audit_logs exactly.
-- ---------------------------------------------------------------------
create table if not exists public.construction_audit_logs (
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

create index if not exists construction_audit_logs_entity_idx on public.construction_audit_logs (entity_type, entity_id);
create index if not exists construction_audit_logs_created_idx on public.construction_audit_logs (created_at);

alter table public.construction_audit_logs enable row level security;

drop policy if exists "construction_audit_logs_manage_all" on public.construction_audit_logs;
create policy "construction_audit_logs_manage_all"
  on public.construction_audit_logs for all
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- construction_settings (singleton, section 43) — configurable budget
-- alert thresholds; never a hardcoded business rule.
-- ---------------------------------------------------------------------
create table if not exists public.construction_settings (
  id smallint primary key default 1,
  budget_alert_thresholds numeric(5, 2)[] not null default array[70, 80, 90, 100]::numeric(5, 2)[],
  default_retention_percent numeric(5, 2) not null default 0,
  currency text not null default 'PKR',
  updated_at timestamptz not null default now(),
  constraint construction_settings_singleton check (id = 1)
);

insert into public.construction_settings (id) values (1) on conflict (id) do nothing;

drop trigger if exists construction_settings_set_updated_at on public.construction_settings;
create trigger construction_settings_set_updated_at before update on public.construction_settings for each row execute function public.set_updated_at();

alter table public.construction_settings enable row level security;

drop policy if exists "construction_settings_public_read" on public.construction_settings;
create policy "construction_settings_public_read"
  on public.construction_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "construction_settings_admin_write" on public.construction_settings;
create policy "construction_settings_admin_write"
  on public.construction_settings for update
  to authenticated
  using (public.is_admin_or_manager())
  with check (public.is_admin_or_manager());

-- ---------------------------------------------------------------------
-- New document_types (section 33) — construction documents reuse the
-- EXISTING secure document vault from STEP 20.
-- ---------------------------------------------------------------------
insert into public.document_types (code, label, category, requires_expiry, sort_order) values
  ('CONSTRUCTION_CONTRACT', 'Construction Contract', 'Legal Agreement', false, 250),
  ('BOQ_DOCUMENT', 'Bill of Quantities', 'Property', false, 260),
  ('CONSTRUCTION_DRAWING', 'Drawing', 'Property', false, 270),
  ('PURCHASE_ORDER_DOCUMENT', 'Purchase Order', 'Financial', false, 280),
  ('SITE_REPORT_DOCUMENT', 'Site Report', 'Property', false, 290),
  ('CHANGE_ORDER_DOCUMENT', 'Change Order', 'Legal Agreement', false, 300),
  ('CONSTRUCTION_CERTIFICATE', 'Certificate', 'Property', true, 310),
  ('HANDOVER_DOCUMENT', 'Handover Document', 'Property', false, 320),
  ('PROGRESS_REPORT_DOCUMENT', 'Progress Report', 'Property', false, 330)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------
-- Link the EXISTING document vault (documents table, STEP 20) directly
-- to a construction project, so construction contracts/BOQ/drawings/
-- POs/change orders/certificates/handover docs can be filed and listed
-- against the project's own Documents tab (section 33) — additive,
-- nullable column, never a duplicate/parallel documents table.
-- ---------------------------------------------------------------------
alter table public.documents add column if not exists construction_project_id uuid references public.construction_projects (id) on delete set null;
create index if not exists idx_documents_construction_project on public.documents (construction_project_id);

-- A construction document has no customer_id of its own (it belongs to
-- the project, not a specific customer upload), so the EXISTING
-- documents_customer_read policy (which requires customer_id =
-- auth.uid()) would never match it. This policy grants the project's
-- OWN linked customer read access instead, gated by the same
-- visibility flags as every other document.
drop policy if exists "documents_construction_customer_read" on public.documents;
create policy "documents_construction_customer_read"
  on public.documents for select
  to authenticated
  using (
    visibility in ('CUSTOMER_ONLY', 'ADMIN_CUSTOMER', 'ALL_AUTHORIZED')
    and construction_project_id is not null
    and exists (select 1 from public.construction_projects cp where cp.id = documents.construction_project_id and cp.customer_id = auth.uid())
  );

-- ---------------------------------------------------------------------
-- New AdminSection "construction" nav/permission gate — mirrors STEP
-- 23/24/25's additions (code-level in permissions.ts, no DB change
-- needed since section gating isn't stored in the database).
-- ---------------------------------------------------------------------
