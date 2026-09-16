# 5STAR.M Estate & Builders — Architecture Inventory

**Compiled:** 2026-09-16 (STEP 33 Final Production Audit)
**Method:** Direct inspection of the current codebase (`Glob`/`Grep`/`Read` against the real files, not assumed structure) plus this session's own build history across STEPs 1–32. Every module below was actually built and verified (`tsc`/ESLint/`next build`) in this same multi-day session; this document indexes what exists today, not a plan.

**Stack:** Next.js 15 (App Router, Turbopack dev), React 19, TypeScript, Tailwind CSS v4, Supabase (Postgres + Auth + Storage), Vercel AI SDK (Anthropic), `web-push`, `sharp`. No test framework is configured anywhere in this repo (confirmed by `package.json` — no `jest`/`vitest`/`playwright`/`cypress` dependency, no `test` script beyond the placeholder).

---

## 1. Route surface (top-level)

| Area | Base path | Guard |
|---|---|---|
| Public site | `src/app/(site)/*` | none (intentionally public) |
| Admin | `src/app/admin/*` | `middleware.ts` (session + active `admin_profiles` row) + per-page `requireSection()` |
| Agent | `src/app/agent/*` | same middleware as admin (any active staff); page-level `requireSection()` |
| Customer | `src/app/customer/*` | `middleware.ts` (session only) |
| API routes | `src/app/api/*` | per-route (contact form: honeypot+rate-limit; AI chat: actor resolution; WhatsApp webhook: HMAC signature) |

`src/middleware.ts` matcher: `/admin/:path*`, `/agent/:path*`, `/customer/:path*` — delegates to `src/lib/supabase/middleware.ts::updateSession`.

## 2. Module inventory

For each module: routes · primary services · primary tables · status.

### A. Property Management
- Routes: `/admin/properties`, `/admin/properties/new`, `/admin/properties/[id]/edit`, public `/properties/[slug]`
- Services: `propertyService.ts`
- Tables: `properties` (209-table schema; `property_type`/`purpose`/`location_area` all closed enums)
- Status: **Built.** RBAC gap found and fixed in STEP 33 (list/new/edit pages were missing `requireSection("properties")` — see SECURITY_AUDIT_REPORT SEC-02).

### B. Projects Management
- Routes: `/admin/projects*`, public `/projects/[slug]`
- Services: `projectService.ts`
- Tables: `projects`
- Status: **Built.** Same RBAC gap class as Properties, fixed in STEP 33.

### C. Advanced Property Search
- Routes: `/properties` (grid/list/map/split, filters, sort, pagination, saved search)
- Services: `propertyService.search()`, `src/lib/propertySearchParams.ts` (param parsing + `isDeepFilterCombination` for noindex), `searchAnalyticsService.ts`
- Tables: `properties`, `saved_searches`, `search_events`
- Status: **Built** (STEP 16). `generateMetadata()` already sets canonical + conditional noindex — verified by direct code read, not re-derived from memory.

### D. Map-Based Property Search
- Components: `PropertyMap.tsx`, `PropertyMapLoader.tsx`, `PropertyMapControls.tsx` (Leaflet + `react-leaflet-cluster`, OpenStreetMap tiles — no paid Maps API key)
- Status: **Built** (STEP 16). One real, previously-invisible bug found and fixed in STEP 31: the site's own `Permissions-Policy: geolocation=()` header silently blocked the "Use My Location" control since STEP 16; fixed to `geolocation=(self)`.

### E. Customer Portal
- Routes: `src/app/customer/(panel)/*` (dashboard, favorites, inquiries, deals, payments, documents, investments, maintenance, construction, rentals, landlord, legal, support, assistant, profile, settings, saved-searches, property-alerts)
- Guard: `src/app/customer/(panel)/layout.tsx` (session + `customer_profiles` row check + disabled-account handling)
- Status: **Built** across STEPs 10–32.

### F. Favorites
- Table: `favorites` (real, DB-backed, not localStorage)
- Service: `favoritesService.ts`
- Status: **Built** (STEP 10).

### G. Property Compare
- Client-only (`CompareProvider`, localStorage) — a deliberate STEP 24 design choice (no server round-trip needed for a transient comparison set)
- Status: **Built.**

### H/I. Site Visits / Appointment Booking
- Routes: public `/book-visit/[slug]`, admin `/admin/appointments*`, agent `/agent/appointments`
- Services: `appointmentService.ts`
- Table: `appointments`
- Status: **Built** (STEP 11). Anti-spam gap found and fixed in STEP 32 (no honeypot/rate-limit on the public booking form — now has both, mirroring every other public form).

### J/K. Installment / Investment Calculators
- Routes: `/calculator`, `/investment-calculator`, `InvestmentCalculator` component embedded on property pages
- Lib: `src/lib/calculator.ts`
- Status: **Built.**

### L. Brochure/PDF Generator
- Service: `brochureService.ts`, `@react-pdf/renderer`-based document renderers (`DocumentPdf`, `ValuationReportDocument`, `PropertyLegalFileDocument`, BOQ/Progress Report renderers)
- Status: **Built** across several STEPs; each renderer is a thin wrapper over the same PDF pattern (no duplicated PDF engine).

### M. Sales Team / Agents
- Routes: `/admin/team*`, `/agent/*` (dashboard, leads, properties, customers, appointments, deals, tasks, performance, communications)
- Services: `teamService.ts`, `agentCommissionService.ts`
- Tables: `admin_profiles` (role enum: `super_admin`/`admin`/`editor`/`sales_agent`/`sales_manager`)
- Status: **Built** (STEP 14, extended in STEP 31 with the mobile Agent App tabs).

### N/O. Marketing Campaigns / UTM Tracking
- Routes: `/admin/marketing/*` (dashboard, analytics, audience, automation, calendar, campaigns, leads, reports, sources, templates, `public-portal` — new in STEP 32)
- Services: `marketingAnalyticsService.ts`, `campaignService.ts`, `src/lib/attribution.ts` (client-side first/last-touch capture)
- Tables: `campaigns`, `campaign_events`, `search_events`, `website_events`
- Status: **Built** (STEP 15, extended STEP 21 automation, STEP 32 public-portal dashboard reusing existing tables).

### P/Q. Lead Management / CRM
- Routes: `/admin/leads*`, `/admin/crm/leads/[id]`, `/agent/leads*`
- Services: `leadService.ts`
- Table: `leads`
- Status: **Built** (STEP 17). Genuine gap found and fixed in STEP 33: `leadService.create()` had zero pre-insert duplicate detection (a separate `findPossibleDuplicates()` existed but was only ever called from the admin detail page, never from creation itself). STEP 32 added a database-level fix: a `flag_possible_duplicate_lead` `SECURITY DEFINER` trigger (necessary because anonymous visitors' RLS grant on `leads` is insert-only — they can never read existing rows to check themselves).

### R/S. Deals / Sales Transactions
- Routes: `/admin/deals*`
- Services: `dealService.ts`
- Table: `deals`
- Status: **Built** (STEP 18). Concurrency-verified: `deals_property_confirmed_unique_idx`, a partial unique index on `(property_id) WHERE status IN ('Booked','Documentation','Payment In Progress','Completed')`, is real and enforced at the database level — confirmed by direct schema read, not assumed. `dealService.updateStatus()` catches the resulting `23505` and surfaces a friendly "Another transaction has already reserved this property" message.

### T/U. Property Inventory / Availability Management
- Table: `property_inventory` (project-unit inventory, distinct from standalone `properties`)
- Service: `inventoryService.ts`
- Status: **Built** (STEP 19).

### V/W. Property Documents / Digital Agreements
- Service: `documentService.ts`, `src/lib/documentStorage.ts` (signed-URL generation, scoped storage paths)
- Table: `documents`, `document_types`, `document_signatures`
- Status: **Built** (STEP 20). Signed-URL pattern confirmed by direct code read (`getSignedUrl(documentId, kind, actor)`), not assumed.

### X. Communication Center
- Service: `communicationService.ts`, `communicationWebhookService.ts` (WhatsApp Meta Cloud API webhook — signature-verified, rate-limited, honest 501 when unconfigured; verified by direct code read in STEP 33)
- Tables: `communication_conversations`, `communication_messages`, `communication_attachments`
- Status: **Built** (STEP 22). Reused wholesale by STEP 29's Support ticket messaging (no parallel messaging system).

### Y–AB. Accounting / Expenses / Profit / Commission
- Services: `financialTransactionService.ts`, `expenseService.ts`, `payableService.ts`, `financialAdjustmentService.ts`, `reconciliationService.ts`, `agentCommissionService.ts`
- Tables: `financial_transactions`, `expenses`, `payables`, `agent_commissions`, `chart_of_accounts`
- Status: **Built** (STEP 23). Financial-type audit (STEP 33): **zero** `float`/`real`/`double precision` columns exist anywhere in the 209-table schema — verified by grep across the full `schema.sql`, not sampled.

### AC/AD. Property Valuation / Investment Intelligence
- Services: `propertyValuationService.ts`, `investmentAnalysisService.ts`, `marketDataService.ts`
- Tables: `property_valuations` (immutable — `prevent_valuation_modify()` trigger blocks UPDATE/DELETE), `investment_analyses`, `market_data`
- Status: **Built** (STEP 24). **Finding (SEC-01, see SECURITY_AUDIT_REPORT):** `property_valuations`' public read policy is broader than the public pages actually need — documented, not yet fixed (a naive column-GRANT fix was attempted and reverted in this same session after realizing Postgres GRANTs can't distinguish staff-authenticated from customer-authenticated in this schema, since both share the same `authenticated` role).

### AE–AG. Inspection / Maintenance / Facility Management
- Services: `propertyInspectionService.ts`, `maintenanceRequestService.ts`, `maintenanceWorkOrderService.ts`, `maintenanceVendorService.ts`, `maintenanceAssetService.ts`, `maintenanceScheduleService.ts`
- Tables: `property_inspections`, `maintenance_requests`, `maintenance_work_orders`, `maintenance_vendors`, `maintenance_assets`
- Status: **Built** (STEP 25).

### AH. Construction Project Management
- Routes: `/admin/construction/*` (32 tables across projects/phases/tasks/BOQ/materials/procurement/contractors/labor/equipment/budgets/expenses/change-orders/site-reports/quality/safety/delays/risks/handover/snags/approvals)
- Guard: `src/app/admin/(panel)/construction/projects/[id]/layout.tsx` calls `requireSection("construction")` once for all 18 nested tab pages — confirmed by direct read, this is the ONE place in the whole admin tree that already used a layout-level guard instead of per-page.
- Status: **Built** (STEP 26).

### AI. Rental Management
- Routes: `/admin/rentals/*`, `/customer/rentals`, `/customer/landlord`
- Services: `landlordService.ts`, `tenantService.ts`, `leaseService.ts`, `rentScheduleService.ts`, `rentPaymentService.ts`, `depositService.ts`, `rentalNoticeService.ts`, `leaseRenewalService.ts`, `moveRecordService.ts`, `landlordStatementService.ts`
- Tables: 15 tables incl. `rent_schedules` (real unique constraint `rent_schedules_unique_period unique(lease_id, period_start, period_end)` — verified, prevents duplicate rent generation for the same period)
- Status: **Built** (STEP 27). **13 of 16 rentals admin pages were missing `requireSection("rentals")` — found and fixed in STEP 33 (SEC-02).**

### AJ–AL. Legal / Compliance / Due Diligence
- Services: `legalPropertyService.ts`, `ownershipService.ts`, `legalDocumentService.ts`, `dueDiligenceService.ts`, `complianceService.ts`, `encumbranceService.ts`, `legalCaseService.ts`, `legalNoticeService.ts`, `legalContractService.ts`, `legalRiskService.ts`
- Status: **Built** (STEP 28). Explicit status vocabulary confirmed (`NOT_VERIFIED`-equivalent language used throughout; "Verified"/"Requires Review" language, never "Government Verified"/"Legally Cleared").

### AM–AO. Customer Support / Complaints / Service Desk
- Services: `ticketService.ts`, `complaintService.ts`, `escalationService.ts`, `supportSlaService.ts`, `kbService.ts`
- Tables: `support_tickets`, `support_complaints`, `support_escalations`, `support_kb_articles`
- Status: **Built** (STEP 29). Internal-note privacy verified structurally: ticket messaging reuses the Communication Center's `communication_messages.is_private_note`, which is RLS-invisible to customers (not just UI-hidden).

### AP/AQ. AI Assistant / AI Automation
- Services: `aiToolService.ts` (15 tools, **all confirmed read-only** — zero `.insert`/`.update`/`.delete` calls anywhere in the file, verified by direct grep in STEP 33), `aiChatService`/`aiConversationService`/`aiAutomationService`
- Tables: `ai_conversations`, `ai_messages`, `ai_action_requests`, `ai_automation_rules`, `ai_insights`, `ai_assistant_configs`, `ai_settings`
- Status: **Built** (STEP 30, by a separate concurrent Claude Code session on this machine — this session's own independent build was discarded per the user's choice once the conflict was discovered; documented in memory as a one-off multi-session event). Every tool checks `ctx.actor.kind` before returning data; customer-scoped tools call `assertCustomerOwnsOrThrow`.

### AR. Mobile/PWA
- Files: `src/app/manifest.ts`, `public/sw.js` (hand-written, no `next-pwa`), `public/offline.html`, `src/components/pwa/*`
- Tables: `push_subscriptions`, `mobile_app_preferences`, `pwa_install_events`
- Status: **Built** (STEP 31). Service worker explicitly excludes `/admin`, `/agent`, `/customer`, `/api` from all caching (verified by direct read of `public/sw.js`'s `PRIVATE_PREFIXES` list).

### AS/AT. Public Property Portal / Marketing & Lead Generation
- Routes: `/blog`, `/landing/[slug]`, `/locations`, `/property-types/[slug]`, `/buy`, `/rent`, `/commercial`, `/residential`, `/faq`
- Tables: `blog_posts`, `public_landing_pages`, `public_testimonials`
- Status: **Built** (STEP 32).

### AU. Notifications
- Services: `notificationService.ts` (customer), `staffNotificationService.ts` (staff/agent)
- Tables: `customer_notifications`, `notifications`
- Push: `src/lib/push/provider.ts` (real Web Push/VAPID, wired into both notify() functions — confirmed by direct read)
- Status: **Built.** Honest delivery-status pattern confirmed: WhatsApp status is never marked "Delivered" without a real Meta webhook confirmation (verified — the ONLY place a message is marked DELIVERED/READ is the signature-verified webhook handler).

### AV/AW. Analytics / Reporting
- Tables: `property_views`, `search_events`, `website_events`, plus the `property_popularity` VIEW (live-computed, never stored — confirmed by schema read)
- Status: **Built.** STEP 33 confirmed no new event tables were needed for the STEP 32 admin dashboard — it's a pure reporting view over what already existed.

### AX/AY. Authentication / Authorization/RBAC
- `src/middleware.ts` + `src/lib/supabase/middleware.ts`: session + active-staff-row check for `/admin`/`/agent`; session check for `/customer`.
- `src/lib/guard.ts::requireSection()` + `src/lib/permissions.ts::canAccess()`: page-level RBAC.
- Status: **Built, with a real gap found and fixed in STEP 33** — see SECURITY_AUDIT_REPORT SEC-02. 178 of 226 admin `page.tsx` files called `requireSection()` directly before this audit; the other 48 were checked individually — 24 were genuine gaps (now fixed), the rest were legitimately safe (construction's layout-level guard, dashboard/profile open to every role by design, or pure redirects to already-guarded destinations).

### AZ/BA. Supabase Database / Storage
- 209 tables, all with `enable row level security` (verified 1:1 by name-diff, zero gaps).
- Storage: private buckets + signed URLs throughout (`documentStorage.ts`); no public bucket found for any customer/legal/identity document class.

### BB. Audit Logs
- Tables: `activity_logs` (STEP 9, admin-only), plus domain-specific `*_audit_logs` tables (legal, support, construction, rental) and `ai_tool_logs`.
- Status: **Built.**

### BC. Background Jobs / Automations
- No cron/queue infrastructure exists anywhere in this codebase (confirmed — disclosed at every relevant STEP since STEP 21/22: SLA breaches, rent reminders, and marketing automation all use manual "sweep" buttons, not a scheduler).
- Status: **Architecture exists, execution is manual-trigger-only.** Documented consistently across STEPs 21, 25, 27, 29 — not a new finding, a long-standing disclosed limitation.

---

## 3. Known cross-cutting patterns (for future consistency)

- **"Derive, don't duplicate":** almost nothing is stored that can be computed live from a real child table (`property_popularity`, deal outstanding balances, construction budget variance, etc.).
- **"Reuse, don't parallel-build":** STEP 29 support messaging = STEP 22 Communication Center; STEP 32 blog/landing pages are new because nothing existed; STEP 32 admin analytics = existing `property_views`/`search_events`/`website_events`.
- **"Assigned staff via nullable FK, not a new role":** `project_manager_id`, `legal_officer_id`, `assigned_agent_id` all reference `admin_profiles` directly rather than inventing new roles.
- **Route correction convention:** every spec-requested `/portal/*` route was corrected to this codebase's actual `/customer/*` convention across all 32 steps.
