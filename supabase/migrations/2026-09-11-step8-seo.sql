-- =====================================================================
-- STEP 8 — Complete SEO & Local SEO System
--
-- Run this ONCE in your Supabase project's SQL Editor
-- (Dashboard → SQL Editor → New query → paste this whole file → Run).
-- Safe to re-run.
-- =====================================================================

-- Local Business Information — used for LocalBusiness JSON-LD and as
-- prep for a Google Business Profile.
alter table public.website_settings add column if not exists city text default 'Lahore';
alter table public.website_settings add column if not exists country text default 'Pakistan';
alter table public.website_settings add column if not exists latitude numeric;
alter table public.website_settings add column if not exists longitude numeric;
alter table public.website_settings add column if not exists website_url text;
alter table public.website_settings add column if not exists business_description text;

-- SEO defaults — fallbacks for page metadata.
alter table public.website_settings add column if not exists seo_site_title text;
alter table public.website_settings add column if not exists seo_site_description text;
alter table public.website_settings add column if not exists seo_default_og_image text;
