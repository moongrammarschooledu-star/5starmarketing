-- =====================================================================
-- Super Admin and Admin are now different roles:
--   * a Super Admin can do everything;
--   * an Admin (or a Sales Manager) can never create, promote, demote or
--     switch off a Super Admin or another Admin.
-- The app already stops this in the team screens; this makes the database
-- refuse it too, even for someone calling the API by hand.
--
-- Only this one function is replaced (the trigger that calls it already
-- exists). Calls made by the server itself (the service role, no signed-in
-- person) are left alone so creating a team member keeps working.
-- =====================================================================
create or replace function public.protect_admin_profile_fields()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  actor text;
begin
  if auth.uid() is null then
    return new;
  end if;

  actor := public.current_admin_role();

  if actor is null or actor not in ('super_admin', 'admin', 'sales_manager') then
    -- agents and editors can never change role or status, not even their own
    new.role := old.role;
    new.status := old.status;
  elsif actor <> 'super_admin' then
    -- an Admin / Sales Manager may not touch the top two roles
    if old.role in ('super_admin', 'admin') or new.role in ('super_admin', 'admin') then
      new.role := old.role;
      if old.role in ('super_admin', 'admin') and old.id <> auth.uid() then
        new.status := old.status;
      end if;
    end if;
  end if;

  return new;
end;
$$;
