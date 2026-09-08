-- =====================================================================
-- OPTIONAL DEMO DATA — 5STAR.M Estate & Builders
--
-- Everything in this file is placeholder/demo content for testing the
-- website and admin dashboard. None of these are real listings — do not
-- present them to real customers as available properties. Delete the
-- rows (or truncate the tables) from the admin dashboard once you're
-- ready to add your real properties, projects and services.
--
-- Run this AFTER supabase/schema.sql, from the Supabase SQL Editor.
-- Safe to re-run: it only inserts if a matching slug/title doesn't
-- already exist.
-- =====================================================================

insert into public.properties
  (title, slug, property_type, purpose, location, location_area, size, size_category,
   price, price_value, payment_option, status, featured, description, features, amenities, images)
select * from (values
  ('DEMO — Premium Residential House', 'demo-premium-residential-house', 'house', 'sale',
   'Johar Town, Lahore', 'Johar Town', '10 Marla', '10 Marla',
   'PKR 2.5 Crore', 25000000::numeric, 'both', 'available', true,
   'DEMO LISTING — for illustration only. A spacious, well-designed residential house in a prime Johar Town location.',
   array['5 Bedrooms with attached baths','Modern fitted kitchen','Covered car porch (2 cars)'],
   array['24/7 security in the block','Mosque nearby','Park within walking distance'],
   array['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop']),
  ('DEMO — Modern Family Home', 'demo-modern-family-home', 'house', 'sale',
   'Lahore', 'Lahore', '5 Marla', '5 Marla',
   'PKR 1.4 Crore', 14000000::numeric, 'cash', 'available', true,
   'DEMO LISTING — for illustration only. A modern, practical family home with quality construction.',
   array['3 Bedrooms','Open-plan lounge and dining'],
   array['Gated street','Close to schools'],
   array['https://images.unsplash.com/photo-1570129477492-45c003edd2be?q=80&w=1200&auto=format&fit=crop']),
  ('DEMO — Residential Plot', 'demo-residential-plot', 'residential_plot', 'investment',
   'LDA-Approved Society, Lahore', 'Lahore', '5 Marla', '5 Marla',
   'PKR 65 Lac', 6500000::numeric, 'installments', 'available', true,
   'DEMO LISTING — for illustration only. A residential plot in an LDA-approved society.',
   array['Clear, developed plot','Ready for construction'],
   array['LDA-approved society','Underground electricity'],
   array['https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop']),
  ('DEMO — Commercial Property', 'demo-commercial-property', 'commercial', 'investment',
   'Johar Town, Lahore', 'Johar Town', '4 Marla', 'Custom',
   'PKR 3.2 Crore', 32000000::numeric, 'cash', 'available', true,
   'DEMO LISTING — for illustration only. A commercial space suited for retail or office use.',
   array['Ground + 1 construction','Wide frontage'],
   array['High foot traffic area','Main-road visibility'],
   array['https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1200&auto=format&fit=crop'])
) as v(title, slug, property_type, purpose, location, location_area, size, size_category,
       price, price_value, payment_option, status, featured, description, features, amenities, images)
where not exists (select 1 from public.properties p where p.slug = v.slug);

insert into public.projects (name, slug, location, property_type, status, description, images)
select * from (values
  ('DEMO — Johar Town Residency', 'demo-johar-town-residency', 'Johar Town, Lahore', 'Residential', 'completed',
   'DEMO PROJECT — for illustration only.',
   array['https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1200&auto=format&fit=crop']),
  ('DEMO — 5STAR.M Heights', 'demo-5starm-heights', 'Lahore', 'Apartments', 'ongoing',
   'DEMO PROJECT — for illustration only.',
   array['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1200&auto=format&fit=crop'])
) as v(name, slug, location, property_type, status, description, images)
where not exists (select 1 from public.projects p where p.slug = v.slug);

insert into public.services (title, description, icon, enabled, sort_order)
select * from (values
  ('Property Buying', 'Guided assistance to help you find and purchase the right house, flat or plot with confidence.', 'Home', true, 1),
  ('Property Selling', 'Professional support to market and sell your property to serious, qualified buyers.', 'Wallet', true, 2),
  ('Property Investment', 'Practical guidance on property as a long-term investment opportunity.', 'TrendingUp', true, 3),
  ('Residential Properties', 'Houses, flats and residential plots across Lahore, including LDA-approved societies.', 'Building2', true, 4),
  ('Commercial Properties', 'Retail, office and commercial spaces suited to your business needs and budget.', 'Landmark', true, 5),
  ('Construction Services', 'Reliable construction and building solutions, from planning through to completion.', 'HardHat', true, 6),
  ('Property Consultancy', 'Honest, transparent advice at every step of your property journey.', 'Users', true, 7),
  ('Monthly Installment Options', 'Flexible payment structures, including cash and easy monthly installment plans.', 'ClipboardCheck', true, 8)
) as v(title, description, icon, enabled, sort_order)
where not exists (select 1 from public.services s where s.title = v.title);
