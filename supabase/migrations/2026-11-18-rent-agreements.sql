-- Rent agreements made in the admin (Rentals -> Rent Agreements).
-- The form data is kept as JSON so an agreement can be opened, corrected and printed again.
-- Staff only; the public (anonymous) role gets no access.

create sequence if not exists public.rent_agreement_seq;

create table if not exists public.rent_agreements (
  id uuid primary key default gen_random_uuid(),
  agreement_no text not null unique
    default ('RA-' || lpad(nextval('public.rent_agreement_seq')::text, 6, '0')),
  language text not null default 'both' check (language in ('ur', 'en', 'both')),
  paper text not null default 'plain' check (paper in ('plain', 'stamp')),
  owner_name text not null default '',
  tenant_name text not null default '',
  monthly_rent numeric not null default 0,
  start_date date,
  lease_id uuid references public.leases (id) on delete set null,
  property_id uuid references public.properties (id) on delete set null,
  -- the copy saved in Documents, if any
  document_id uuid references public.documents (id) on delete set null,
  data jsonb not null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists rent_agreements_created_idx on public.rent_agreements (created_at desc);
create index if not exists rent_agreements_lease_idx on public.rent_agreements (lease_id) where lease_id is not null;
create index if not exists rent_agreements_property_idx on public.rent_agreements (property_id) where property_id is not null;

alter table public.rent_agreements enable row level security;

drop policy if exists rent_agreements_staff_all on public.rent_agreements;
create policy rent_agreements_staff_all on public.rent_agreements
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.rent_agreements from anon;
