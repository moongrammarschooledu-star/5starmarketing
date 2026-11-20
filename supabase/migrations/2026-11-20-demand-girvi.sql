-- A client demand can now be "girvi" (rehan): the client wants a property on girvi,
-- besides buying (sale) or renting (rent). Only the allowed values of the purpose column change.
alter table public.property_demands drop constraint if exists property_demands_purpose_check;
alter table public.property_demands
  add constraint property_demands_purpose_check check (purpose in ('sale', 'rent', 'girvi'));
