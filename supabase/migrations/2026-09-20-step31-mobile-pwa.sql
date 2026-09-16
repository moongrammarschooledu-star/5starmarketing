-- =====================================================================
-- STEP 31 — Real Estate Mobile App + PWA System
-- =====================================================================
-- DESIGN NOTES (read before touching this file):
--
-- This step is deliberately thin on the database side. Almost
-- everything it needs already exists: property search, favorites,
-- compare, appointments, deals, payments, rentals, maintenance,
-- support, documents, notifications (customer_notifications /
-- notifications) and the STEP 30 AI assistant. The mobile/PWA layer is
-- mostly new UI (bottom nav, install prompt, service worker) and a
-- small amount of genuinely new server-side plumbing:
--
--   push_subscriptions      — one row per browser/device Web Push
--                              subscription (VAPID). This IS the device
--                              registry — no separate "user_devices"
--                              table, since a push subscription already
--                              uniquely identifies a device/browser via
--                              its endpoint.
--   mobile_app_preferences  — one row per actor (admin or customer):
--                              notification-category toggles, push
--                              opt-in, theme, language.
--   pwa_install_events      — install-funnel analytics (prompt shown /
--                              installed / dismissed). actor is
--                              nullable since an anonymous visitor on
--                              the public site can install the PWA
--                              before ever logging in.
--
-- Deliberately NOT created:
--   offline_action_queue — offline drafts (a support reply, a lead
--     note) are queued CLIENT-SIDE (localStorage) because that's the
--     only place they can exist while genuinely offline. On reconnect
--     they replay through the SAME existing authenticated server
--     actions any online user would call — the result lands in the
--     real table (support conversation messages, lead notes) exactly
--     as if it had been submitted online. There is nothing meaningful
--     left to persist server-side once that replay succeeds, so a
--     dedicated queue table would just be a second, redundant home for
--     data that already has one.
--
-- actor_type/actor_id (not a straight FK split into two tables) mirrors
-- the STEP 30 ai_conversations pattern — one row shape shared by both
-- admin_profiles and customer_profiles rows, since both ultimately key
-- to the same auth.users id and RLS only ever needs `actor_id =
-- auth.uid()`.
-- =====================================================================

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('ADMIN', 'CUSTOMER')),
  actor_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  device_label text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_actor_idx on public.push_subscriptions (actor_type, actor_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_own on public.push_subscriptions;
create policy push_subscriptions_own on public.push_subscriptions
  for all
  using (actor_id = auth.uid())
  with check (actor_id = auth.uid());

-- A staff-triggered action (e.g. an admin changing a customer's deal
-- status) needs to look up THAT CUSTOMER's push subscriptions to
-- deliver the push — mirrors the existing is_admin() read/write bypass
-- already used on notifications/customer_notifications. Read-only:
-- staff can look a subscription up to push to it, never modify/delete
-- someone else's.
drop policy if exists push_subscriptions_staff_read on public.push_subscriptions;
create policy push_subscriptions_staff_read on public.push_subscriptions
  for select
  using (public.is_admin());

-- ---------------------------------------------------------------------
create table if not exists public.mobile_app_preferences (
  id uuid primary key default gen_random_uuid(),
  actor_type text not null check (actor_type in ('ADMIN', 'CUSTOMER')),
  actor_id uuid not null references auth.users (id) on delete cascade,
  push_enabled boolean not null default true,
  notify_property boolean not null default true,
  notify_lead boolean not null default true,
  notify_appointment boolean not null default true,
  notify_payment boolean not null default true,
  notify_rental boolean not null default true,
  notify_maintenance boolean not null default true,
  notify_support boolean not null default true,
  notify_legal boolean not null default true,
  notify_construction boolean not null default true,
  notify_marketing boolean not null default true,
  notify_system boolean not null default true,
  theme text not null default 'system' check (theme in ('system', 'light', 'dark')),
  language text not null default 'en',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (actor_type, actor_id)
);

alter table public.mobile_app_preferences enable row level security;

drop policy if exists mobile_app_preferences_own on public.mobile_app_preferences;
create policy mobile_app_preferences_own on public.mobile_app_preferences
  for all
  using (actor_id = auth.uid())
  with check (actor_id = auth.uid());

-- Same reasoning as push_subscriptions_staff_read — the push dispatcher
-- runs in the SENDER's session and must check the RECIPIENT's category
-- toggle before delivering a push.
drop policy if exists mobile_app_preferences_staff_read on public.mobile_app_preferences;
create policy mobile_app_preferences_staff_read on public.mobile_app_preferences
  for select
  using (public.is_admin());

drop trigger if exists set_updated_at on public.mobile_app_preferences;
create trigger set_updated_at before update on public.mobile_app_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
create table if not exists public.pwa_install_events (
  id uuid primary key default gen_random_uuid(),
  actor_type text check (actor_type in ('ADMIN', 'CUSTOMER')),
  actor_id uuid references auth.users (id) on delete set null,
  event_type text not null check (event_type in ('PROMPT_SHOWN', 'INSTALLED', 'DISMISSED')),
  platform text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists pwa_install_events_created_idx on public.pwa_install_events (created_at desc);

alter table public.pwa_install_events enable row level security;

-- Anyone (including an anonymous visitor on the public site) may log
-- their own install-funnel event; only staff can read them back for
-- analytics.
drop policy if exists pwa_install_events_insert on public.pwa_install_events;
create policy pwa_install_events_insert on public.pwa_install_events
  for insert
  with check (actor_id is null or actor_id = auth.uid());

drop policy if exists pwa_install_events_staff_read on public.pwa_install_events;
create policy pwa_install_events_staff_read on public.pwa_install_events
  for select
  using (public.is_admin());
