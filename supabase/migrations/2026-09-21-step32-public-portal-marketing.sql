-- =====================================================================
-- STEP 32 — Public Property Portal + Marketing & Lead Generation Engine
-- =====================================================================
-- DESIGN NOTES:
--
-- This step is overwhelmingly an EXTENSION of things already built
-- across STEPs 1-31: property search/filters/map (STEP 16), favorites/
-- compare, WhatsApp/call CTAs, UTM/campaign attribution (STEP 15),
-- SEO metadata + sitemap.xml + robots.txt, PWA (STEP 31), the STEP 30
-- AI assistant, and THREE existing analytics tables that already cover
-- most of section 37's tracking ask (property_views, search_events,
-- website_events — none of these are duplicated here).
--
-- Genuinely new tables:
--   blog_posts             — real admin-authored content (STEP 32
--                             section 31). No content exists yet; the
--                             table starts empty, never seeded with
--                             placeholder posts.
--   public_landing_pages   — CMS-driven campaign landing pages (section
--                             13). FAQ items are stored as a jsonb array
--                             on the row itself rather than a separate
--                             join table — a landing page's FAQ list is
--                             always small and edited as a unit, so a
--                             child table would add join overhead with
--                             no real benefit.
--   public_testimonials    — admin-entered, admin-approved only
--                             (section 36 explicitly requires approval
--                             before publication) — there is no public
--                             self-submission form, so no anon-insert
--                             policy is needed here at all.
--
-- Deliberately NOT created (all reuse existing tables):
--   public_inquiry_forms / public_form_submissions — every inquiry type
--     already has its own purpose-built form component calling the
--     EXISTING leadService.create()/leads table; a generic form-builder
--     schema would just be a second, parallel way to create the exact
--     same lead rows.
--   property_view_events — property_views (STEP 9) already exists.
--   public_conversion_events — search_events (STEP 16) + website_events
--     (STEP 9) already cover this.
--   seo_metadata (generic side-table) — three nullable override columns
--     added directly onto properties/projects instead (see below);
--     every other entity in this codebase already derives its metadata
--     live from its own fields, so a side-table would be the only
--     inconsistent case.
--
-- Lead deduplication (section 48) needed a different mechanism than a
-- simple app-layer check: leadService.create() is called by ANONYMOUS
-- visitors, whose RLS grant is INSERT-ONLY on leads (they can never
-- SELECT existing leads to check for a duplicate themselves — see that
-- function's own comments). So, exactly like the existing
-- resolve_lead_campaign_attribution trigger already does for the same
-- reason, duplicate detection runs in a SECURITY DEFINER trigger at
-- INSERT time, flagging (never blocking, never merging) a match.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Leads: dedup flag + a couple of additive inquiry-form fields.
-- ---------------------------------------------------------------------
alter table public.leads add column if not exists possible_duplicate boolean not null default false;
alter table public.leads add column if not exists duplicate_of_lead_id uuid references public.leads (id) on delete set null;
alter table public.leads add column if not exists preferred_contact_method text check (
  preferred_contact_method is null or preferred_contact_method in ('Phone', 'WhatsApp', 'Email')
);
alter table public.leads add column if not exists preferred_contact_time text;

create index if not exists leads_possible_duplicate_idx on public.leads (possible_duplicate) where possible_duplicate;

-- Widen lead_type's check constraint (found by introspection rather than
-- a guessed name, since it's more reliable than assuming Postgres's
-- default naming convention held).
do $$
declare
  cname text;
begin
  select conname into cname
  from pg_constraint
  where conrelid = 'public.leads'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%lead_type%';
  if cname is not null then
    execute format('alter table public.leads drop constraint %I', cname);
  end if;
end $$;

alter table public.leads add constraint leads_lead_type_check check (
  lead_type in (
    'General Inquiry', 'Property Details', 'Callback Request', 'Site Visit', 'Brochure Request',
    'Investment Inquiry', 'Project Inquiry', 'Price Request', 'Payment Plan Request',
    'Rental Inquiry', 'Seller Inquiry', 'Construction Inquiry'
  )
);

-- Runs BEFORE resolve_lead_campaign_attribution (alphabetical trigger
-- order on the same event is unreliable in Postgres, so this reads only
-- columns already present on NEW at insert time — phone/whatsapp — not
-- anything another trigger would compute).
create or replace function public.flag_possible_duplicate_lead()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
begin
  if new.phone is null or new.phone = '' then
    return new;
  end if;
  select id into existing_id
  from public.leads
  where id <> new.id
    and (
      phone = new.phone
      or (new.whatsapp is not null and new.whatsapp <> '' and whatsapp = new.whatsapp)
    )
  order by created_at desc
  limit 1;

  if existing_id is not null then
    new.possible_duplicate := true;
    new.duplicate_of_lead_id := existing_id;
  end if;
  return new;
end;
$$;

drop trigger if exists flag_possible_duplicate_lead on public.leads;
create trigger flag_possible_duplicate_lead before insert on public.leads
  for each row execute function public.flag_possible_duplicate_lead();

-- ---------------------------------------------------------------------
-- SEO override columns — optional; every existing render path already
-- falls back to the property/project's own title/description when
-- these are unset (see generateMetadata() changes, not schema).
-- ---------------------------------------------------------------------
alter table public.properties add column if not exists seo_title text;
alter table public.properties add column if not exists seo_description text;
alter table public.properties add column if not exists og_image text;

alter table public.projects add column if not exists seo_title text;
alter table public.projects add column if not exists seo_description text;
alter table public.projects add column if not exists og_image text;

-- ---------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content text not null,
  featured_image text,
  author_name text not null default '5STAR.M Estate & Builders',
  category text not null check (
    category in (
      'Property Tips', 'Investment Education', 'Buying Guide', 'Selling Guide',
      'Rental Guide', 'Construction', 'Market Education'
    )
  ),
  tags text[] not null default '{}',
  seo_title text,
  seo_description text,
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED')),
  published_at timestamptz,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_status_idx on public.blog_posts (status, published_at desc);
create index if not exists blog_posts_category_idx on public.blog_posts (category);

alter table public.blog_posts enable row level security;

drop policy if exists blog_posts_public_read on public.blog_posts;
create policy blog_posts_public_read on public.blog_posts
  for select
  using (status = 'PUBLISHED');

drop policy if exists blog_posts_staff_all on public.blog_posts;
create policy blog_posts_staff_all on public.blog_posts
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_updated_at on public.blog_posts;
create trigger set_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
create table if not exists public.public_landing_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  hero_image text,
  description text not null,
  property_id uuid references public.properties (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  cta_label text not null default 'Get In Touch',
  faq_items jsonb not null default '[]',
  seo_title text,
  seo_description text,
  og_image text,
  campaign_source text,
  campaign_medium text,
  campaign_name text,
  active boolean not null default true,
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists public_landing_pages_active_idx on public.public_landing_pages (active);

alter table public.public_landing_pages enable row level security;

drop policy if exists public_landing_pages_public_read on public.public_landing_pages;
create policy public_landing_pages_public_read on public.public_landing_pages
  for select
  using (active = true);

drop policy if exists public_landing_pages_staff_all on public.public_landing_pages;
create policy public_landing_pages_staff_all on public.public_landing_pages
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop trigger if exists set_updated_at on public.public_landing_pages;
create trigger set_updated_at before update on public.public_landing_pages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Admin-entered and admin-approved only (section 36) — no public
-- self-submission form, so no anon-insert policy exists here at all.
-- ---------------------------------------------------------------------
create table if not exists public.public_testimonials (
  id uuid primary key default gen_random_uuid(),
  customer_display_name text not null,
  review text not null,
  rating smallint check (rating is null or (rating between 1 and 5)),
  property_id uuid references public.properties (id) on delete set null,
  approved boolean not null default false,
  approved_at timestamptz,
  approved_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists public_testimonials_approved_idx on public.public_testimonials (approved);

alter table public.public_testimonials enable row level security;

drop policy if exists public_testimonials_public_read on public.public_testimonials;
create policy public_testimonials_public_read on public.public_testimonials
  for select
  using (approved = true);

drop policy if exists public_testimonials_staff_all on public.public_testimonials;
create policy public_testimonials_staff_all on public.public_testimonials
  for all
  using (public.is_admin())
  with check (public.is_admin());
