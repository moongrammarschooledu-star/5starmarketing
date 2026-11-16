-- Real estate agent contacts: other agents / dealers we want to promote the
-- website to and share properties with (so they can help sell or rent them).
-- Private staff data - never shown on the public site. Separate from
-- "Customer Contacts" (buyers, tenants and owners).

create table if not exists public.agent_contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- the agent's office / company, e.g. "Al-Madina Estate"
  agency text,
  phone text not null,
  whatsapp text,
  -- areas they work in, free text: "Johar Town, Wapda Town"
  area text,
  remarks text,
  -- how far the relationship has got
  status text not null default 'New' check (status in ('New', 'Contacted', 'Interested', 'Partner', 'Not interested')),
  last_contacted_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists agent_contacts_created_idx on public.agent_contacts (created_at desc);
create index if not exists agent_contacts_status_idx on public.agent_contacts (status);

alter table public.agent_contacts enable row level security;

drop policy if exists agent_contacts_staff_all on public.agent_contacts;
create policy agent_contacts_staff_all on public.agent_contacts
  for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- The public (anonymous) role gets no access at all.
revoke all on public.agent_contacts from anon;
