-- Number of family members for a rent demand (how many people will live in the
-- rented place). Optional; only asked for when the client wants to rent.

alter table public.property_demands
  add column if not exists family_members integer;

alter table public.property_demands
  drop constraint if exists property_demands_family_members_range;
alter table public.property_demands
  add constraint property_demands_family_members_range
  check (family_members is null or (family_members >= 1 and family_members <= 40));
