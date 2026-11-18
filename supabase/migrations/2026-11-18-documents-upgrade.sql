-- Documents upgrade:
--  1. a document can be attached to a Customer Contact (the office contact book),
--  2. columns that remember which expiry reminder emails were already sent,
--  3. extra document types for property / land paperwork (Fard, Registry, Intiqal ...).
-- Safe to run more than once.

alter table public.documents
  add column if not exists customer_contact_id uuid references public.customer_contacts (id) on delete set null,
  add column if not exists expiry_reminded_for date,
  add column if not exists expiry_reminder_stage smallint not null default 0;

create index if not exists documents_customer_contact_idx
  on public.documents (customer_contact_id)
  where customer_contact_id is not null;

insert into public.document_types (code, label, category, requires_expiry, sort_order) values
  ('FARD',               'Fard (Land Record)',                 'Property',        false, 400),
  ('REGISTRY',           'Registry',                           'Property',        false, 410),
  ('INTIQAL',            'Intiqal (Mutation)',                 'Property',        false, 420),
  ('KHASRA_KHATONI',     'Khasra / Khatoni',                   'Property',        false, 430),
  ('NOC_SOCIETY',        'Society / LDA NOC',                  'Legal Agreement', false, 440),
  ('TRANSFER_SLIP',      'Transfer Slip / Letter',             'Property',        false, 450),
  ('AGREEMENT_TO_SELL',  'Agreement to Sell (Bayana)',         'Legal Agreement', false, 460),
  ('OWNER_CNIC',         'Owner CNIC Copy',                    'Identity',        false, 470),
  ('SITE_PLAN',          'Site Plan / Map',                    'Property',        false, 480),
  ('UTILITY_BILL',       'Utility Bill (Electricity / Gas / Water)', 'Property',  false, 490),
  ('POWER_OF_ATTORNEY',  'Power of Attorney',                  'Legal Agreement', true,  495),
  ('PROPERTY_PHOTO',     'Property Photo (office record)',     'Property',        false, 505)
on conflict (code) do nothing;
