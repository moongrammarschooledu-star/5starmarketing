# Known Issues — 5STAR.M Estate & Builders (STEP 33)

Every item below is either a genuine finding from this audit or a previously-disclosed, long-standing limitation re-confirmed during this pass. Severity follows the audit's own scale (CRITICAL/HIGH/MEDIUM/LOW/INFO).

## Open (not fixed this pass)

### KI-01 — `property_valuations` public read policy exposes internal analytical columns
**Severity:** MEDIUM · **See:** SECURITY_AUDIT_REPORT SEC-01
Anonymous/customer sessions can read `assumptions`, `confidence_factors`, `expense_assumptions`, and `created_by` for every valuation via direct PostgREST access, not just the safe subset the public UI renders. Recommended fix: a public-safe view + a small service-layer change, tested against a live Supabase project (not attempted blind in this pass).

### KI-02 — PostCSS vulnerability (transitive, via Next.js)
**Severity:** LOW/MEDIUM (low real-world exploitability in this app) · **See:** SECURITY_AUDIT_REPORT, Dependency Security
2 advisories (1 high, 1 moderate) in `postcss`, bundled inside `next`'s own `node_modules`. Fix requires a Next 15→16 major upgrade — deferred as its own future task with a full regression pass, not bundled into this audit.

### KI-03 — Rent/deal payment recording is not database-idempotent
**Severity:** LOW/MEDIUM · **See:** DATABASE_AUDIT_REPORT
`rentPaymentService.create()` validates against outstanding balance via a read-then-write pattern, not a database-level idempotency key or unique constraint. Real-world risk is low (staff-recorded, not public self-service), but a true double-submit (e.g. a slow network retry) is not database-blocked.

### KI-04 — In-memory rate limiter does not survive restarts or scale across instances
**Severity:** LOW/INFO
`src/lib/rateLimit.ts` is a single-process, in-memory limiter. Acceptable for current traffic; would need Redis/Upstash-backed limiting if traffic or deployment topology grows (multiple serverless instances don't share this state).

### KI-05 — No automated test suite exists anywhere in this codebase
**Severity:** INFO (long-standing, disclosed at every STEP since the beginning)
No `jest`/`vitest`/`playwright`/`cypress` dependency or config exists. Every "test" performed across all 33 STEPs has been `tsc`/ESLint/`next build` plus manual/code-trace verification. This audit did not introduce a testing framework (per the spec's own instruction: "Do not add a huge unnecessary testing framework").

### KI-06 — Backup/recovery strategy not verified from the codebase
**Severity:** INFO
This session has no access to the Supabase project dashboard. Point-in-time recovery / scheduled backup configuration should be confirmed directly by the user in Supabase Settings → Database → Backups.

### KI-07 — No live test accounts exist for any role
**Severity:** INFO (audit-process limitation, not a codebase defect)
This session was never given customer/agent/admin credentials at any point in the 33-STEP build. Every workflow-level "test" in INTEGRATION_TEST_REPORT.md is a code trace, not a live E2E run. See that report's "Honest summary" for the full caveat.

## Resolved this pass

### KI-08 (RESOLVED) — 24 admin pages missing section-level RBAC
**Severity:** HIGH → FIXED · **See:** SECURITY_AUDIT_REPORT SEC-02
Properties (3 pages), Projects (3 pages), Leads (2 pages), and 16 of 19 Rentals pages had no `requireSection()` call, relying only on "is any active staff member." Fixed by adding the missing guard to all 24 files, matching the existing pattern used by the other 178 admin pages.

### KI-09 (RESOLVED) — Site-visit booking form had no anti-spam protection
**Severity:** MEDIUM → FIXED (STEP 32, re-confirmed this pass)
Added honeypot field + IP rate-limiting to `createAppointmentAction()`, matching every other public form.

### KI-10 (RESOLVED) — Lead creation had no duplicate detection at insert time
**Severity:** MEDIUM → FIXED (STEP 32)
Added a `SECURITY DEFINER` `BEFORE INSERT` trigger (`flag_possible_duplicate_lead`) since anonymous visitors' RLS grant on `leads` is insert-only and cannot read existing rows to self-check.

### KI-11 (RESOLVED) — "Use My Location" map control silently broken since STEP 16
**Severity:** MEDIUM → FIXED (STEP 31)
The site's own `Permissions-Policy: geolocation=()` header blocked the feature in every browser that respects it, regardless of user consent, invisibly, for 15 STEPs. Fixed to `geolocation=(self)`.

## Deliberate, disclosed design decisions (not issues)

- No background job scheduler exists anywhere (SLA breach checks, rent reminders, marketing automation all use manual "sweep" buttons) — disclosed consistently since STEP 21.
- `property_valuations` is immutable by design (no UPDATE/DELETE for anyone, including admin) — a deliberate STEP 24 business rule.
- Compare uses client-side localStorage, not a server table — a deliberate STEP 24 decision (transient, no server round-trip needed).
- WhatsApp/SMS/email providers remain architecture-only (honest "not configured" responses) until the user supplies real provider credentials.
