-- =====================================================================
-- Admin / agent login: a 6-digit code is emailed after the password.
-- Only a hash of the code is kept here, for 10 minutes, with a count of
-- wrong tries. Nobody can read or write this table from the browser: row
-- level security is on and there is deliberately NO policy, so only the
-- server (service role) can use it.
-- =====================================================================
create table if not exists public.admin_login_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts integer not null default 0,
  used boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists admin_login_codes_user_idx
  on public.admin_login_codes (user_id, created_at desc);

alter table public.admin_login_codes enable row level security;
