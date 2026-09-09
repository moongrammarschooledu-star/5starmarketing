# 5STAR.M Estate & Builders — Website + Admin Dashboard

A complete real-estate & construction business website with a full admin
dashboard, backed by **Supabase** (Auth + Postgres + Storage).

## 1. How to run the project

```bash
npm install
npm run dev
```

Then open **http://localhost:3000**. Public site: `/`, `/properties`,
`/properties/[slug]`. Admin dashboard: `/admin/login`.

To build for production: `npm run build` then `npm run start`.

## 2. Connecting Supabase (required)

The site and dashboard run on Supabase for authentication, the database and
image storage. Without it configured, the public site still renders (with
empty/error states instead of listings) and `/admin/*` always redirects to
login — nothing crashes, but nothing works either. Here's how to turn it on.

### Step 1 — Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free project, and wait
for it to finish provisioning (~2 minutes).

### Step 2 — Run the database migration

Open your project's **SQL Editor** (left sidebar) → **New query**, paste
the entire contents of [`supabase/schema.sql`](supabase/schema.sql), and
click **Run**. This creates all 6 tables, indexes, RLS policies, the
`property-images` Storage bucket and its policies. It's safe to re-run.

Optionally, also run [`supabase/seed.sql`](supabase/seed.sql) the same way
to add demo listings/projects/services for testing — every row is clearly
titled `DEMO — ...` so it's obvious what to delete once you add real data.

**Already ran `schema.sql` before STEP 5?** Run
[`supabase/migrations/2026-09-08-step5-leads-crm.sql`](supabase/migrations/2026-09-08-step5-leads-crm.sql)
once, the same way — it upgrades your existing `inquiries` table into the
new `leads` CRM table (keeping every row) and adds `lead_notes`. A brand
new project only needs `schema.sql`, which already includes both tables.

**Already on STEP 5?** Also run
[`supabase/migrations/2026-09-09-step6-whatsapp.sql`](supabase/migrations/2026-09-09-step6-whatsapp.sql)
once — it adds the WhatsApp settings fields, `whatsapp_templates` (with 8
starter templates) and `whatsapp_activity` tables. Fresh installs already
get these from `schema.sql`.

### Step 3 — Get your API keys

In your Supabase project: **Settings → API**. Copy:

- **Project URL**
- **anon / public** key (⚠️ not the `service_role` key — never use that
  one here or anywhere client-reachable)

### Step 4 — Set the two environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Restart `npm run dev` after saving.

### Step 5 — Create your first admin user

There's no public sign-up page (intentionally — this is a private admin
dashboard). Create your login in the Supabase dashboard:

1. **Authentication → Users → Add user → Create new user**.
2. Enter your email and a password, and check **Auto Confirm User**.
3. That's it — a matching row in `admin_profiles` is created automatically
   (see the `on_auth_user_created` trigger in `schema.sql`).
4. Go to `/admin/login` on your site and sign in with that email/password.

To add a second admin later, repeat the same steps with another email.

## 3. Environment variables required

Exactly two, both safe to expose to the browser (the `NEXT_PUBLIC_` prefix
is intentional — access control comes from Row Level Security, not from
keeping these secret):

| Variable | Where to find it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon/public key |

The `service_role` key is never used anywhere in this codebase.

## 4. Storage bucket

`supabase/schema.sql` creates a bucket named **`property-images`**
(public read, authenticated write) and its policies automatically — no
manual setup needed in the Storage UI. Property/project images and the
Settings page's logo/favicon uploads all go through this one bucket.
Admins upload from the dashboard (file picker with instant preview, or a
pasted hosted URL); files are validated server-side (JPEG/PNG/WEBP/GIF
only, 5MB max) before upload.

## 5. Authentication

- **Real Supabase Auth** (email + password) — no custom auth, no
  passwords stored in this app's own database, no localStorage tricks.
- `middleware.ts` refreshes the session on every request and redirects
  anyone without a valid session away from `/admin/*` (except
  `/admin/login`) straight to `/admin/login?redirect=<original path>`.
- Logout (`/admin/profile` sidebar → Logout) calls `supabase.auth.signOut()`
  and clears the session cookie.
- Change your password anytime from `/admin/profile`.

## 6. How to add properties / projects / services

Everything is managed from the admin dashboard — no code edits needed:

- **Properties**: `/admin/properties/new`, or edit/delete from
  `/admin/properties`. New properties get a unique slug generated from the
  title automatically and immediately appear on the public `/properties`
  page and (if marked Featured) on the homepage.
- **Projects**: `/admin/projects` → Add Project.
- **Services**: `/admin/services` → Add Service, or toggle Enable/Disable
  to control what shows on the homepage.
- **Website Settings**: `/admin/settings` (business info, socials,
  logo/favicon).
- **Leads (CRM)**: `/admin/leads` — every property inquiry, WhatsApp click
  and contact-form submission lands here automatically. Open a lead
  (`/admin/leads/[id]`) to change its status, schedule a follow-up, assign
  it to a staff member, add notes, or contact the customer via WhatsApp /
  Call / Email. Switch between the Table and Pipeline (kanban) views from
  the toggle at the top.
- **WhatsApp Center**: `/admin/whatsapp` — WhatsApp-sourced lead stats and
  recent activity. Manage reusable message templates at
  `/admin/whatsapp/templates` (supports `{{customer_name}}`,
  `{{property_name}}`, `{{location}}`, `{{price}}`, `{{size}}`,
  `{{agent_name}}`). From a lead's page, "WhatsApp Customer" opens a
  preview you can edit before sending. All of this uses normal WhatsApp
  click-to-chat links — no Meta API credentials required.

## 7. Testing checklist

Run through this after connecting your Supabase project:

- [ ] `/admin/login` → log in with your Supabase user → lands on `/admin/dashboard`
- [ ] Visiting `/admin/dashboard` while logged out redirects to `/admin/login`
- [ ] `/admin/properties/new` → fill the form, upload 1–2 images → **Create Property** → redirected to the list, new row appears
- [ ] The new property appears on `/properties` and, if Featured, on `/`
- [ ] Open the property's public page at `/properties/<slug>` — gallery, details, map, "Request Property Details" form all render
- [ ] Submit that inquiry form → success message shown → appears in `/admin/inquiries`
- [ ] Change the inquiry's status in the dashboard → persists on reload
- [ ] Edit the property (price/status/images) → change reflects on the public page
- [ ] Toggle Featured / change Status from the properties table → updates immediately
- [ ] Delete a property → confirmation modal appears → confirms → removed from both admin and public
- [ ] Logout → redirected to `/admin/login`, protected routes now redirect again
- [ ] Test on mobile width — sidebar becomes a drawer, forms/tables stay usable
- [ ] Click a WhatsApp button on a property → opens WhatsApp **and** logs a lead in `/admin/inquiries`
- [ ] Click a phone number → triggers a call on mobile
- [ ] Submit the homepage contact form with an invalid email → validation error, no submission

I verified the build compiles cleanly and every page renders without
crashing (including with Supabase deliberately unconfigured, to confirm
the empty/error states work) — but I could not run this checklist against
real data myself, since I don't have your Supabase credentials. Please run
through it once you've connected your project.

## 8. Deploying to Vercel

1. Push this repo to GitHub (already done if you're reading this from the
   repo).
2. In Vercel: **New Project** → import the repo → framework auto-detects
   as Next.js.
3. **Before deploying**, add the same two environment variables under
   **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy. On future pushes to `main`, Vercel redeploys automatically.
5. In Supabase, no extra config is needed for a Vercel domain — RLS
   doesn't care about origin. (If you later add Supabase Auth email
   redirects, set the Site URL under Supabase → Authentication → URL
   Configuration to your Vercel domain.)

## Project structure

```
src/
  app/
    (site)/            Public site — layout with Navbar/Footer, home, /properties, /properties/[slug]
    admin/
      login/             Public login page
      (panel)/           Everything behind auth — dashboard, properties, inquiries, projects, services, settings, profile
    api/contact/         Public contact-form endpoint → inquiries table
  middleware.ts         Supabase session refresh + /admin/* route protection
  components/            UI components (admin/ subfolder for dashboard-only pieces)
  lib/
    supabase/            client.ts (browser), server.ts (Server Components/Actions), middleware.ts
    models/               TypeScript types: Property, Project, Service, Inquiry, AdminUser, WebsiteSettings
    actions/              Server Actions — call services/, never Supabase directly
    site.ts               Static fallback business info used by components that need synchronous values
  services/               propertyService, projectService, serviceService, inquiryService, settingsService, profileService
                           — the only files that talk to Supabase; swap internals here if you ever change backends
supabase/
  schema.sql             Full migration: tables, indexes, RLS policies, storage bucket — run this first
  seed.sql                Optional demo data, clearly marked — run this second (optional)
```
