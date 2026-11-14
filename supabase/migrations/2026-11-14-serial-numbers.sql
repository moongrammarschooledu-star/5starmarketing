-- =====================================================================
-- Serial numbers for properties and demands.
--
--   Properties for sale (and investment) : 5Star.M-S-000001, 5Star.M-S-000002 ...
--   Properties for rent                  : 5Star.M-R-000001, 5Star.M-R-000002 ...
--   Client demands                       : 5Star.M-D-000001, 5Star.M-D-000002 ...
--
-- Each series has its own counter. The number is handed out by the
-- database itself the moment a record is created, so two people saving at
-- the same time can never get the same number, and it does not matter
-- which screen the record was added from. A serial number never changes
-- after it is given (even if the property is later switched from sale to
-- rent), and a number is never reused after a record is deleted.
--
-- Safe to run more than once: records that already have a number keep it.
-- =====================================================================

create sequence if not exists public.property_sale_serial_seq;
create sequence if not exists public.property_rent_serial_seq;
create sequence if not exists public.demand_serial_seq;

alter table public.properties add column if not exists serial_no text;
alter table public.property_demands add column if not exists serial_no text;

-- Give every existing record its number, oldest first. The other triggers
-- are switched off meanwhile so this does not touch any "updated" dates or
-- write history rows (and are switched back on at the end of the block).
do $$
declare
  r record;
begin
  alter table public.properties disable trigger user;
  alter table public.property_demands disable trigger user;

  for r in
    select id, purpose from public.properties where serial_no is null order by created_at, id
  loop
    update public.properties
       set serial_no = case
         when r.purpose = 'rent'
           then '5Star.M-R-' || lpad(nextval('public.property_rent_serial_seq')::text, 6, '0')
         else '5Star.M-S-' || lpad(nextval('public.property_sale_serial_seq')::text, 6, '0')
       end
     where id = r.id;
  end loop;

  for r in
    select id from public.property_demands where serial_no is null order by created_at, id
  loop
    update public.property_demands
       set serial_no = '5Star.M-D-' || lpad(nextval('public.demand_serial_seq')::text, 6, '0')
     where id = r.id;
  end loop;

  alter table public.properties enable trigger user;
  alter table public.property_demands enable trigger user;
end $$;

create unique index if not exists properties_serial_no_key on public.properties (serial_no);
create unique index if not exists property_demands_serial_no_key on public.property_demands (serial_no);

-- Hand out the next number to every new record, and never let it be changed.
-- security definer so any signed-in staff member (and any insert path) can
-- use the counters without needing direct rights on them.
create or replace function public.assign_property_serial_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.serial_no is not null then
      new.serial_no := old.serial_no;
    end if;
    return new;
  end if;
  if new.serial_no is null then
    if new.purpose = 'rent' then
      new.serial_no := '5Star.M-R-' || lpad(nextval('public.property_rent_serial_seq')::text, 6, '0');
    else
      new.serial_no := '5Star.M-S-' || lpad(nextval('public.property_sale_serial_seq')::text, 6, '0');
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.assign_demand_serial_no()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if old.serial_no is not null then
      new.serial_no := old.serial_no;
    end if;
    return new;
  end if;
  if new.serial_no is null then
    new.serial_no := '5Star.M-D-' || lpad(nextval('public.demand_serial_seq')::text, 6, '0');
  end if;
  return new;
end;
$$;

drop trigger if exists assign_serial_no_insert on public.properties;
create trigger assign_serial_no_insert before insert on public.properties
  for each row execute function public.assign_property_serial_no();
drop trigger if exists assign_serial_no_update on public.properties;
create trigger assign_serial_no_update before update on public.properties
  for each row execute function public.assign_property_serial_no();

drop trigger if exists assign_serial_no_insert on public.property_demands;
create trigger assign_serial_no_insert before insert on public.property_demands
  for each row execute function public.assign_demand_serial_no();
drop trigger if exists assign_serial_no_update on public.property_demands;
create trigger assign_serial_no_update before update on public.property_demands
  for each row execute function public.assign_demand_serial_no();
