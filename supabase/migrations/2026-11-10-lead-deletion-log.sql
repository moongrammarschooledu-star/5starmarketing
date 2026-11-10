-- =====================================================================
-- A safety net for leads: every deleted lead is copied here first.
-- It records the whole lead, who deleted it (a signed-in staff member,
-- the server, or someone in the Supabase SQL editor) and when, so a lost
-- lead can be traced and put back.
--
-- To put a lead back:
--   insert into public.leads
--   select * from jsonb_populate_record(null::public.leads,
--     (select row_data from public.lead_deletion_log where lead_id = '<lead id>'));
-- (Only the lead row itself is kept; its notes, follow-ups and score
-- history are removed together with it.)
-- =====================================================================
create table if not exists public.lead_deletion_log (
  id uuid primary key default gen_random_uuid(),
  deleted_at timestamptz not null default now(),
  lead_id uuid not null,
  lead_name text,
  lead_phone text,
  row_data jsonb not null,
  -- the signed-in staff member, when there was one
  deleted_by uuid,
  -- who ran it: 'authenticated' = the website / admin panel, 'service_role' =
  -- the server, 'postgres' = the Supabase SQL editor
  db_user text,
  request_role text
);

create index if not exists lead_deletion_log_deleted_at_idx on public.lead_deletion_log (deleted_at desc);

alter table public.lead_deletion_log enable row level security;

drop policy if exists lead_deletion_log_super_admin_read on public.lead_deletion_log;
create policy lead_deletion_log_super_admin_read on public.lead_deletion_log
  for select to authenticated
  using (public.current_admin_role() = 'super_admin');

create or replace function public.log_lead_deletion()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.lead_deletion_log (lead_id, lead_name, lead_phone, row_data, deleted_by, db_user, request_role)
  values (old.id, old.name, old.phone, to_jsonb(old), auth.uid(), session_user, current_setting('request.jwt.claim.role', true));
  return old;
end;
$$;

drop trigger if exists log_lead_deletion on public.leads;
create trigger log_lead_deletion
  before delete on public.leads
  for each row execute function public.log_lead_deletion();
