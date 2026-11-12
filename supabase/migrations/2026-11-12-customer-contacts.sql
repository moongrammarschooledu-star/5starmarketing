-- Customer Contacts: a general contact book for every visitor or caller
-- (name, number, what they want, remarks). Private staff data - never public.
-- Separate from "Demands" (which tracks formal client demands).

create table if not exists public.customer_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  whatsapp text,
  -- free text: "5 marla house near Johar Town"
  property_detail text,
  remarks text,
  -- Walk-in / Phone call / Website / WhatsApp / Facebook / Reference / Other
  source text not null default 'Walk-in',
  -- optional, used only to suggest matching properties (all may stay empty)
  purpose text check (purpose is null or purpose in ('sale', 'rent')),
  property_type text,
  area text,
  budget_max numeric,
  size_marla numeric,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists customer_contacts_created_idx on public.customer_contacts (created_at desc);

alter table public.customer_contacts enable row level security;

drop policy if exists customer_contacts_staff_all on public.customer_contacts;
create policy customer_contacts_staff_all on public.customer_contacts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The public (anonymous) role gets no access at all.
revoke all on public.customer_contacts from anon;
