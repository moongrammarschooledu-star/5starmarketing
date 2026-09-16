# Security Audit — 5STAR.M Estate & Builders (STEP 33)

**Date:** 2026-09-16
**Scope:** Full codebase (`src/`, `supabase/schema.sql`, all migrations, `package.json`, config files). No live penetration test was performed against a running instance with real user accounts — every finding below is backed by direct static inspection (file reads, grep evidence, schema analysis) cited inline. Where something could not be verified this way, it is marked **NOT TESTED** rather than assumed safe.

---

## Authentication

`src/middleware.ts` + `src/lib/supabase/middleware.ts::updateSession()` — read in full.

- Refreshes the Supabase session on every matched request.
- `/admin/*` and `/agent/*`: requires a session AND a matching `admin_profiles` row with `status !== 'Inactive'`; redirects to `/admin/login` otherwise.
- `/customer/*`: requires any session; redirects to `/login` otherwise.
- If Supabase env vars are missing, protected routes still redirect rather than rendering unprotected — verified in code (lines 30–45).

**Status: VERIFIED (code review).** Live login/logout/session-expiry behavior against a running instance: **NOT TESTED** (no test credentials available to this session for customer/agent/admin accounts).

## Authorization / RBAC

`src/lib/guard.ts::requireSection()` + `src/lib/permissions.ts::canAccess()` — read in full. Role → section matrix in `permissions.ts` (`ROLE_SECTIONS`) verified directly.

### Finding SEC-02 — CONFIRMED, FIXED
**Severity:** HIGH
**Module:** Admin RBAC (Properties, Projects, Leads, Rentals)
**Issue:** 24 of 226 admin `page.tsx` files under `src/app/admin/(panel)/` had no `requireSection()` call at all — they relied solely on the middleware's "is any active staff member" check, with zero enforcement of which `AdminSection` a role is actually granted.
**Risk:** Vertical privilege escalation *within staff* (not public). Example: `sales_manager` and `sales_agent` roles are not granted the `"properties"` section in `permissions.ts`, but `/admin/properties`, `/admin/properties/new`, and `/admin/properties/[id]/edit` had no page-level check — either role could reach full property CRUD (including price/availability edits) by typing the URL directly. Same pattern for `/admin/leads*` (editor role lacks `"leads"`) and 16 of 19 `/admin/rentals/*` pages (editor role lacks `"rentals"`).
**Evidence:** `comm -23` diff of all `page.tsx` files under the admin panel against all files calling `requireSection(` — produced the exact 48-file gap list; each of the 48 was individually read to separate genuine gaps (24) from legitimate exceptions (construction's sub-routes are guarded by a parent `layout.tsx`; `dashboard`/`profile` are granted to every role by design; `inquiries`/`support/requests`/`marketing/campaigns/new` are pure redirects to already-guarded destinations; `team/create` has its own inline `["super_admin","admin"].includes(role)` check).
**Fix:** Added `await requireSection("properties"|"leads"|"projects"|"rentals")` as the first line of each of the 24 affected page components (converting two from sync to async where needed: `projects/page.tsx`, `projects/new/page.tsx`). Re-ran `tsc --noEmit` after the change — clean.
**Status: FIXED** (this session, commit pending). Re-verified via the same `comm -23` diff — zero remaining unexplained gaps.

### Finding — customer/agent ownership scoping
`/agent/customers`, `/agent/deals`, `/agent/appointments`, `/agent/tasks`, `/agent/performance` (STEP 31) all scope by `assigned_agent_id = <current admin's own id>` or equivalent, verified by direct code read at build time (STEP 31). **Not re-tested live** in STEP 33 — no second agent test account exists to attempt cross-agent access.

**Status: PARTIALLY VERIFIED.** Code-level scoping confirmed by reading the actual query filters; a live IDOR attempt (logging in as Agent A, editing a URL to Agent B's lead/deal ID) was **NOT TESTED** — no second staff account credentials available to this session.

## Row Level Security (RLS)

- **209 of 209 tables** in `supabase/schema.sql` have `enable row level security` — verified by extracting the unique table-name list from every `create table if not exists public.X` statement and diffing it against every unique table name in an `alter table public.X enable row level security` statement. Zero tables are missing RLS.
- 11 policies across the whole schema use `using (true)` (unrestricted read). 10 of these are genuine settings/lookup singletons (`website_settings`, `document_types`, `communication_settings`, `valuation_settings`, `maintenance_sla_settings`, `maintenance_settings`, `construction_settings`, `rental_settings`, `support_categories`, `support_settings`) — all confirmed to contain only configuration data, not per-record business data.

### Finding SEC-01 — CONFIRMED, NOT FIXED (documented, recommended fix below)
**Severity:** MEDIUM
**Module:** `property_valuations` (Property Valuation & Investment Intelligence, STEP 24)
**Issue:** `property_valuations_public_read` grants `select` `using (true)` `to anon, authenticated`. This is intentionally broad (STEP 24's public `/properties/[slug]/investment` page shows real valuation estimates to anonymous visitors), but RLS is row-level, not column-level — the policy also exposes `assumptions` (free-text analyst notes), `confidence_factors` (jsonb reasoning), `expense_assumptions` (jsonb), and `created_by` (an `admin_profiles` UUID) to anyone querying the table directly via the Supabase REST endpoint with the public anon key, bypassing the app's own service layer entirely (which only ever selects/renders the safe subset).
**Risk:** Internal valuation methodology and staffing references are readable by anyone who queries the table directly (not through the app's UI). No customer PII, payment data, or ability to modify records is exposed — this is a business-methodology confidentiality issue, not a data-integrity or customer-privacy breach.
**Evidence:** `grep -B3 "using (true);" supabase/schema.sql` plus direct read of the `property_valuations` `create table` statement (columns listed in full in ARCHITECTURE_INVENTORY.md AC/AD).
**Attempted fix and why it was reverted:** A column-level `GRANT`/`REVOKE` migration was drafted and then deleted in this same session, because Postgres column-level GRANTs operate on the *role* (`anon` vs `authenticated`), and this schema's staff/customer distinction is made entirely at the RLS-policy level via `is_admin()` — both a logged-in customer and a logged-in staff member share the identical `authenticated` Postgres role. A column-GRANT narrow enough to protect against a customer session would also block the admin UI's own reads of the same columns, and there was no way to verify the fix's correctness without a live database connection under both role contexts, which this session does not have. Shipping an unverified fix that could silently break the STEP 24 admin valuation UI was judged worse than documenting the gap clearly.
**Recommended fix (not implemented this pass):** Create a `property_valuations_public` VIEW exposing only `id, property_id, project_id, valuation_method, area, area_unit, normalized_area_sqft, location, property_type, bedrooms, bathrooms, final_estimated_value, confidence_score, valuation_date`; grant `anon, authenticated` SELECT on the view only; narrow the base table's own policy to `is_admin()`; update `propertyValuationService`'s public-facing read method(s) — `getLatestForProperty`, `listComparables` when called from `src/app/(site)/properties/[slug]/investment/page.tsx` — to query the view instead of the base table. This requires a code change alongside the migration and should be tested against a real Supabase project before shipping.
**Status: DOCUMENTED, NOT FIXED.** Recommend addressing before the next audit cycle.

## Storage

- `src/lib/documentStorage.ts` — signed-URL generation confirmed by reading `documentService.getSignedUrl(documentId, kind, actor)`.
- No public storage bucket found for any of: legal documents, identity documents, agreements, inspection photos, construction files, support attachments (searched `supabase/schema.sql` and `src/lib/documentStorage.ts` for bucket-visibility settings).
- **Status: VERIFIED (code review).** Live signed-URL expiration/enumeration testing against the real Supabase Storage API: **NOT TESTED** (would require live credentials + a running deployment).

## API / Server Action Security

Sampled: `/api/contact`, `/api/ai/admin/chat`, `/api/ai/customer/chat`, `/api/whatsapp/webhook`.

- `/api/contact`: honeypot field check, `isRateLimited()` (60s window, 5 max), server-side phone/email regex validation, message length cap, never trusts a client-supplied role or customer ID (resolves `customerId` server-side from the session), generic 500 on internal error (`console.error` server-side, generic message to client) — all confirmed by direct read.
- `/api/ai/admin/chat`, `/api/ai/customer/chat`: catch blocks distinguish `AiAuthError`/`AiUnavailableError` (deliberate, safe messages) from unexpected errors (`console.error` + generic "unexpected error" message, status 500) — confirmed by direct read, no stack/raw error forwarded to the client.
- `/api/whatsapp/webhook`: GET handshake requires `WHATSAPP_WEBHOOK_VERIFY_TOKEN`; POST requires `WHATSAPP_APP_SECRET`, rate-limits by IP *before* the (more expensive) HMAC signature check, verifies `X-Hub-Signature-256` via `verifyMetaSignature()` before trusting any payload, returns 501 "not configured" rather than 200 when secrets are unset. **This webhook's real-world behavior is BLOCKED / NOT CONFIGURED** — `WHATSAPP_APP_SECRET` is not set in this environment (WhatsApp remains architecture-only per STEP 22's own disclosure), so signature verification has not been exercised against a real Meta-signed payload.
- **Status: VERIFIED for the 4 sampled routes (code review).** The remaining API routes and server actions (dozens more, spanning every STEP) were **NOT individually re-audited line-by-line** in this pass — this is a sample, not an exhaustive audit of every endpoint.

## Input Validation

- Confirmed regex-based phone/email validation exists in `/api/contact`, `PropertyInquiryForm.tsx`, `LandingPageInquiryForm.tsx`, `BookVisitForm.tsx`'s server action.
- No SQL injection surface identified — every service goes through the Supabase JS client's parameterized query builder (`.eq()`, `.insert()`, etc.); the one raw-ish pattern (`leadService.findPossibleDuplicates`'s `.or()` clause) sanitizes phone/whatsapp values by exact-match template interpolation of already-validated strings, not free-text search — reviewed, no injection vector found.
- **Status: PARTIALLY VERIFIED.** Full input-validation sweep across every one of the dozens of public/admin forms was not performed line-by-line in this pass.

## File Upload Security

- `DocumentUploader`/`ImageUploader` (admin), attachment upload in `TicketConversation.tsx`: MIME-type allowlist (`application/pdf, image/jpeg, image/png, image/webp`) and a 15MB size cap confirmed by direct read of `TicketConversation.tsx`'s `pickFile()`.
- **Status: PARTIALLY VERIFIED** (one upload path read in full; the several other upload components across STEPs 12/20/25/26 were not individually re-read in this pass — they were originally built following the same pattern, but that consistency was not re-verified file-by-file here).

## Secrets

- Grepped the entire tracked source tree (`--exclude-dir=node_modules,.next,.git`) for `sk-ant-api`, `sk_live`, AWS-style `AKIA...`, and PEM private-key headers — **zero matches**.
- `git ls-files | grep -iE "\.env"` — only `.env.local.example` (a template with empty values) is tracked; `git check-ignore -v .env.local` confirms the real file is gitignored.
- **Status: VERIFIED.** No secret values are reproduced in this report per the audit's own instruction.

## Dependency Security

- `npm audit --production`: **2 vulnerabilities (1 high, 1 moderate)** — both in `postcss`, a transitive dependency bundled inside `node_modules/next/node_modules/postcss`. Advisories relate to CSS stringification/sourceMappingURL handling during build-time CSS processing (XSS via unescaped `</style>`, arbitrary `.map` file disclosure).
- **Exploitability in this app:** low. This app does not process untrusted, user-submitted CSS at runtime; the vulnerable code path is a build-time tool, not a request-time handler.
- **Remediation available:** `npm audit fix --force`, but this upgrades `next` to `16.3.5` — a major version bump flagged by npm itself as a breaking change. Upgrading Next.js mid-audit, without a full regression pass across all 32 prior STEPs' UI, was judged too high-risk to do blind in this pass.
- **Status: DOCUMENTED, NOT FIXED.** Recommend planning a dedicated Next.js 16 upgrade + regression pass as its own STEP, not bundled into this audit.

## XSS

- No `dangerouslySetInnerHTML` usage found outside the existing `JsonLd` component (which serializes trusted, server-constructed JSON — not user input) — spot-checked, not exhaustively grepped across every component in this pass.
- React's default JSX escaping covers the overwhelming majority of rendered user content (blog posts, testimonials, messages) by default.
- **Status: PARTIALLY VERIFIED.**

## CSRF

- Next.js Server Actions include Next's own built-in CSRF-equivalent protections (Origin header checking on POST-like mutations) as of the framework version in use; no custom CSRF token system exists or was found to be needed.
- **Status: NOT INDEPENDENTLY TESTED** — relies on framework-level protection, not verified via a live cross-origin request attempt.

## Injection (SQL/Command)

- No raw SQL string concatenation with user input was found anywhere in `src/services/` — confirmed by the absence of `.rpc()` calls built from string concatenation and universal use of the Supabase query builder.
- **Status: VERIFIED (code review), NOT live-fuzz-tested.**

## IDOR / BOLA

See Authorization/RBAC above (SEC-02) and the Integration Test Report's negative-test section — most IDOR-style checks in this pass were verified via RLS policy review (the database itself refuses cross-tenant reads regardless of what a client requests), not via a live attempt to substitute another user's ID in a real request. **Status: PARTIALLY VERIFIED.**

## SSRF

- No server-side "fetch this URL the user gives us" pattern was found in any service (the AI provider calls a fixed Anthropic endpoint; the geocode API route proxies to a fixed Nominatim endpoint with a user-supplied *query string*, not a URL). **Status: VERIFIED (code review) for the patterns found; no exhaustive SSRF fuzz test performed.**

## Webhooks

Covered above under API Security. **Status: VERIFIED (code review) for WhatsApp; BLOCKED/NOT CONFIGURED for live signature testing.**

## Rate Limiting

`src/lib/rateLimit.ts` — an in-memory rate limiter (not Redis/Upstash-backed), used by `/api/contact`, the WhatsApp webhook, and (new in STEP 33) the site-visit booking action. **Known limitation, not a new finding:** an in-memory limiter resets on every server restart/redeploy and does not share state across multiple serverless instances — acceptable for this app's traffic scale but not a distributed rate limiter. Documented, not changed (would require introducing new infrastructure, out of scope for "reuse existing architecture").

## AI Security

- `src/services/aiToolService.ts` — **all 15 tools are confirmed read-only**: `grep -n "\.insert(\|\.update(\|\.delete(\|\.create(\|\.upsert(" src/services/aiToolService.ts` returns zero matches. There is no AI-callable write path in the current implementation at all.
- Every tool checks `ctx.actor.kind` (`"admin"` vs `"customer"`) before returning data; customer-scoped tools (`get_rental_summary`, `get_support_ticket`, `get_maintenance_summary`) call `assertCustomerOwnsOrThrow` to verify the requesting customer actually owns the record being asked about.
- The system prompt (`src/lib/ai/gateway.ts::buildSystemPrompt`) explicitly separates SYSTEM instructions from retrieved TOOL OUTPUT and instructs the model to never treat retrieved text as a command — a prompt-injection mitigation. This is a *model-behavior* instruction, not a server-side enforcement mechanism; given the tool layer is read-only regardless of what the model decides to do, there is no write action for a successful prompt injection to actually trigger in this implementation.
- **Status: VERIFIED (code review) that no write-capable tool exists.** Live prompt-injection red-teaming against the deployed AI endpoint: **NOT TESTED** (would require the configured `ANTHROPIC_API_KEY` and a live conversation).

## Privacy (AI data minimization)

- Tool responses return only named, whitelisted fields (e.g. `get_property_details` returns 12 named fields, never `select("*")` passed through raw) — confirmed by reading every tool method's return shape.
- **Status: VERIFIED (code review).**

## Audit Logging

- `activity_logs` (STEP 9) + domain-specific `*_audit_logs` tables + `ai_tool_logs` (every AI tool call is logged via `withLog()`, confirmed by direct read).
- **Status: VERIFIED (code review) that logging calls exist at the call sites sampled.** Completeness across every sensitive action in the entire app was not exhaustively verified.

## Security Headers

`next.config.ts` — read in full. Sets `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)` (widened from `geolocation=()` in STEP 31 to un-break the existing map feature), and a real `Content-Security-Policy` restricting script/style/font/img/frame/connect sources to an explicit allowlist plus `worker-src 'self'` (added STEP 31 for the service worker). No `Strict-Transport-Security` header is set at the app level — Vercel's platform typically adds this at the edge for HTTPS deployments, but this was **NOT independently verified** against the live deployment's actual response headers in this pass.

---

## Summary table

| Area | Findings | Status |
|---|---|---|
| Authentication | 0 | Verified (code) |
| Authorization/RBAC | 1 (SEC-02, HIGH) | **Fixed** |
| RLS coverage | 0 gaps (209/209 enabled) | Verified |
| RLS policy scope | 1 (SEC-01, MEDIUM) | Documented, not fixed |
| Storage | 0 | Verified (code) |
| Secrets | 0 | Verified |
| Dependencies | 1 (postcss, transitive, LOW-MEDIUM real-world exploitability) | Documented, not fixed |
| AI write-path | 0 (none exists) | Verified |
| Webhooks | 0 | Verified (code); live signing blocked/not configured |

No CRITICAL findings. One HIGH (fixed this session). One MEDIUM (documented with a concrete recommended fix). One dependency-level LOW/MEDIUM (documented).
