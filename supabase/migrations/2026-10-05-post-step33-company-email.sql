-- =====================================================================
-- Replace the owner's personal email with the company email in the
-- admin-editable website settings. These settings take priority over the
-- hardcoded default in brochures, document PDFs and the public
-- structured data (JSON-LD), so the old value kept appearing there.
-- =====================================================================

alter table public.website_settings
  alter column email set default '5star.marketing.2233@gmail.com';

update public.website_settings
set email = '5star.marketing.2233@gmail.com'
where lower(email) = 'maos.edu@gmail.com';
