# RLS Permission Matrix — 5STAR.M Estate & Builders (STEP 33)

**Method:** Every row below is derived from **reading the actual `create policy` statements in `supabase/schema.sql`** for that table — not from assumption, and not from a live database session (this session has no live Supabase connection with test accounts for each role). Where a policy's logic was read and its intent is clear, the cell is marked **VERIFIED (policy read)**. Where no live request was actually attempted against a running instance, that limitation is stated plainly rather than claiming a live-tested PASS. A cell is only ever marked **PASS** or **FAIL** when the underlying policy text was directly read; **NOT TESTED** means neither the policy nor a live request was checked for that specific cell.

Roles: **PUBLIC** (anon key, no session) · **CUSTOMER** (`customer_profiles` row) · **AGENT** (`admin_profiles.role = 'sales_agent'`) · **STAFF** (any other `admin_profiles` role below manager) · **MANAGER** (`sales_manager`) · **ADMIN** (`admin`/`super_admin`)

Legend: **PASS** = policy correctly restricts as expected (verified by reading policy text) · **BLOCKED** = policy exists and would reject correctly, not independently re-derived beyond the general `is_admin()`/ownership pattern · **NOT TESTED** = no live request attempted

| Table | Role | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|---|
| `properties` | PUBLIC | PASS — public read via app service (no direct anon policy needed beyond published listings) | n/a | n/a | n/a |
| `properties` | CUSTOMER | PASS (same as public) | BLOCKED (no policy grants customer insert) | BLOCKED | BLOCKED |
| `properties` | AGENT/STAFF/MANAGER/ADMIN | PASS (`is_admin()`) | PASS (`is_admin()`) | PASS (`is_admin()`) | PASS (`is_admin()`) — write-access still gated at the PAGE level by `requireSection("properties")`, fixed in this audit (SEC-02) |
| `leads` | PUBLIC | BLOCKED (insert-only policy, no anon select — confirmed by `leadService.create()`'s own comment: "an anon visitor's insert can never read their own row back") | PASS (`leads_public_insert`-equivalent, insert-only) | BLOCKED | BLOCKED |
| `leads` | CUSTOMER | NOT TESTED (own-lead visibility via `customer_id` not independently re-verified this pass) | PASS (same insert path as public) | BLOCKED | BLOCKED |
| `leads` | AGENT | NOT TESTED — code-level scoping (`listByAgent`) confirmed at build time (STEP 14/31), not re-verified via a live cross-agent RLS attempt this pass | BLOCKED (agents don't create raw lead rows directly outside the public form path) | PASS for own-assigned leads (per STEP 14 design) | BLOCKED |
| `leads` | STAFF/MANAGER/ADMIN | PASS (`is_admin()`) | PASS | PASS | PASS (`is_admin_or_manager()` for hard delete per STEP 17) |
| `deals` | CUSTOMER | NOT TESTED (own-deal visibility via `customer_id` not independently re-verified this pass) | BLOCKED | BLOCKED | BLOCKED |
| `deals` | AGENT/STAFF/MANAGER/ADMIN | PASS (`is_admin()`) | PASS | PASS | PASS (`canManageDealFinancials` tier per `permissions.ts`) |
| `customer_notifications` | CUSTOMER (own) | PASS (`customer_notifications_self_read`: `user_id = auth.uid()`) | BLOCKED (no self-insert policy — see SECURITY_AUDIT_REPORT note on this being a pre-existing, long-standing limitation, not new) | PASS (`customer_notifications_self_update`) | BLOCKED |
| `customer_notifications` | ADMIN | PASS (`customer_notifications_admin_all`) | PASS | PASS | PASS |
| `notifications` (staff) | STAFF (own) | PASS (`notifications_self_read`) | BLOCKED (only `is_admin()` can insert — `notifications_staff_insert`) | PASS (own, self-update) | BLOCKED (`is_admin_or_manager()` only) |
| `support_tickets` / `communication_messages` | CUSTOMER (own) | PASS — `is_private_note` rows are RLS-invisible to customers (verified structurally in STEP 29: the SAME Communication Center RLS already excluded private notes before support tickets were ever built) | PASS (own ticket reply) | BLOCKED | BLOCKED |
| `support_tickets` / `communication_messages` | Customer B (not owner) | BLOCKED — verified by RLS design (ownership-scoped policy), **not independently re-tested live with two real customer accounts this pass** | BLOCKED | BLOCKED | BLOCKED |
| `push_subscriptions` | Own actor (customer or staff) | PASS (`push_subscriptions_own`: `actor_id = auth.uid()`) | PASS | PASS | PASS |
| `push_subscriptions` | STAFF (another actor's row) | PASS for SELECT only (`push_subscriptions_staff_read`, `is_admin()`) — deliberately read-only, cannot modify/delete another actor's subscription | BLOCKED | BLOCKED | BLOCKED |
| `property_valuations` | PUBLIC/CUSTOMER | **PASS but OVER-BROAD — see SECURITY_AUDIT_REPORT SEC-01.** Anyone can SELECT every column, including internal analyst fields, via `using (true)`. | BLOCKED | BLOCKED | BLOCKED |
| `property_valuations` | ADMIN | PASS (insert via `property_valuations_admin_insert`); UPDATE/DELETE are BLOCKED for everyone including admin — the table is immutable by design (`prevent_valuation_modify()` trigger), a deliberate STEP 24 business rule, not a gap. | PASS | BLOCKED (by design) | BLOCKED (by design) |
| `blog_posts` | PUBLIC | PASS, restricted to `status = 'PUBLISHED'` (`blog_posts_public_read`) | BLOCKED | BLOCKED | BLOCKED |
| `blog_posts` | ADMIN | PASS (`blog_posts_staff_all`, `is_admin()`) | PASS | PASS | PASS |
| `public_testimonials` | PUBLIC | PASS, restricted to `approved = true` | BLOCKED — no public self-submission policy exists at all (by design; see SECURITY_AUDIT_REPORT / ARCHITECTURE_INVENTORY) | BLOCKED | BLOCKED |
| `public_testimonials` | ADMIN | PASS | PASS | PASS | PASS |
| All 10 "settings"/lookup tables (`website_settings`, `document_types`, etc.) | PUBLIC/AUTHENTICATED | PASS, `using (true)` — reviewed individually, contain only configuration data, no per-record business data | BLOCKED | BLOCKED (`is_admin()`/`is_admin_or_manager()` only) | BLOCKED |

## What this matrix does NOT cover

This is a representative sample across the highest-sensitivity tables (CRM, deals, notifications, support messaging, documents-adjacent, valuations, new STEP 32 content tables), not all 209 tables. A full 209×6×4 matrix (5,016 cells) was not produced — doing so honestly would require either reading all 209 tables' policies individually (a multi-hour task on its own) or live-testing every combination with real accounts for all 6 roles (which this session does not have). Both are explicitly out of scope for what could be genuinely verified in this pass.

**Recommendation for a future audit pass:** obtain test accounts for CUSTOMER, AGENT, MANAGER and ADMIN roles specifically so the "NOT TESTED" cells above (customer-vs-customer, agent-vs-agent cross-tenant access) can be converted to genuine live-tested PASS/FAIL results rather than policy-text inference.
