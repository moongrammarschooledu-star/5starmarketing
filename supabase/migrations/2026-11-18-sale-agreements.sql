-- Sale agreements (Deals -> Sale Agreements): the agreement to sell (bayana / iqrar nama bai)
-- made between a seller and a buyer. The form data is kept as JSON so an agreement can be
-- opened, corrected and printed again. Staff only; the public (anonymous) role gets no access.

create sequence if not exists public.sale_agreement_seq;

create table if not exists public.sale_agreements (
  id uuid primary key default gen_random_uuid(),
  agreement_no text not null unique
    default ('SA-' || lpad(nextval('public.sale_agreement_seq')::text, 6, '0')),
  language text not null default 'ur' check (language in ('ur', 'en')),
  paper text not null default 'plain' check (paper in ('plain', 'stamp')),
  seller_name text not null default '',
  buyer_name text not null default '',
  total_price numeric not null default 0,
  agreement_date date,
  property_id uuid references public.properties (id) on delete set null,
  data jsonb not null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sale_agreements_created_idx on public.sale_agreements (created_at desc);
create index if not exists sale_agreements_property_idx on public.sale_agreements (property_id) where property_id is not null;

alter table public.sale_agreements enable row level security;

drop policy if exists sale_agreements_staff_all on public.sale_agreements;
create policy sale_agreements_staff_all on public.sale_agreements
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.sale_agreements from anon;
