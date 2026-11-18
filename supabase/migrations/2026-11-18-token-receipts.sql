-- Token money receipts (Rentals -> Token Receipts): the proof given to a client who pays a token
-- before the rent agreement. The form data is kept as JSON so a receipt can be opened,
-- corrected, printed or sent again. Staff only; the public (anonymous) role gets no access.

create sequence if not exists public.token_receipt_seq;

create table if not exists public.token_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no text not null unique
    default ('TR-' || lpad(nextval('public.token_receipt_seq')::text, 6, '0')),
  language text not null default 'ur' check (language in ('ur', 'en')),
  payer_name text not null default '',
  amount numeric not null default 0,
  receipt_date date,
  property_id uuid references public.properties (id) on delete set null,
  data jsonb not null,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists token_receipts_created_idx on public.token_receipts (created_at desc);
create index if not exists token_receipts_property_idx on public.token_receipts (property_id) where property_id is not null;

alter table public.token_receipts enable row level security;

drop policy if exists token_receipts_staff_all on public.token_receipts;
create policy token_receipts_staff_all on public.token_receipts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.token_receipts from anon;
