# Database Audit — 5STAR.M Estate & Builders (STEP 33)

**Date:** 2026-09-16
**Method:** Direct inspection of `supabase/schema.sql` (the canonical, cumulative schema mirror maintained since STEP 1) and every migration file under `supabase/migrations/`. No live `psql`/Supabase connection was available to this session, so all findings below are static-schema-level; anything requiring a live query (actual row counts, actual orphan records, actual query plans) is marked **NOT TESTED**.

---

## Table count and RLS coverage

- **209** tables defined via `create table if not exists public.X` across the full schema history (STEP 1 through STEP 32).
- **209** of 209 have a corresponding `alter table public.X enable row level security` statement — verified by extracting the unique table-name set from each category of statement and diffing them; the diff is empty.
- **Zero tables** are missing RLS.

## Duplicate tables

- No two `create table` statements define the same table name for two different purposes (every duplicate `create table if not exists` found is the intentional idempotent-re-declaration pattern used across STEPs — the SAME table, re-stated once per step that touched it, never a second table with an overlapping name).
- One genuine near-duplicate was investigated and found to be intentional, not a bug: `deals` vs `rental_applications`/`leases` — these model genuinely different transaction types (sale vs. rental), not the same concept twice.

## Foreign keys / relationships

- Every business entity sampled (`leads`, `deals`, `properties`, `appointments`, `documents`, `support_tickets`, `rent_payments`, `construction_projects`) has explicit `references` clauses with an explicit `on delete` behavior (`cascade`, `set null`, or `restrict` depending on whether the child record should die with its parent or survive as an orphaned-but-intact historical record) — this was a deliberate, consistent pattern throughout the build, not something newly verified from scratch in this pass, but re-confirmed by reading a representative sample of `create table` statements in STEP 33.
- **Not exhaustively re-verified**: all 209 tables' FK definitions were not individually re-read in this pass; the sample above is representative, not complete.

## Data types — financial audit (CRITICAL section per the spec)

**Verified by direct grep across the entire `schema.sql`:**

```
grep -nE "\s(float|real|double precision)\b" supabase/schema.sql
```

Every match returned is a comment containing the English word "real" (e.g. "a real, admin-verified revenue" / "real view/inquiry counts") — **zero** actual `float`/`real`/`double precision` COLUMN TYPE declarations exist anywhere in the schema, including for coordinates (`latitude numeric`, `longitude numeric` — even geo-coordinates use `numeric`, not the more conventional `double precision`, for consistency).

Every price/amount/budget/rent/deposit/installment/commission/expense/fee/payment/balance/total/discount/refund/value-named column uses `numeric` (frequently `numeric(14,2)` or similar explicit precision).

**Status: PASS, verified.**

## Idempotency / duplicate-prevention constraints (verified real, not assumed)

| Table | Constraint | Prevents |
|---|---|---|
| `deals` | `deals_property_confirmed_unique_idx` — partial unique index on `(property_id) WHERE status IN ('Booked','Documentation','Payment In Progress','Completed')` | Two deals both reaching an active/confirmed state for the same property — the exact race condition spec section 18 asks about. `dealService.updateStatus()` catches the resulting `23505` and surfaces a friendly message. |
| `rent_schedules` | `rent_schedules_unique_period unique (lease_id, period_start, period_end)` | Duplicate rent-period generation for the same lease. |
| `leads` | new in STEP 32/33: `flag_possible_duplicate_lead` trigger (not a constraint — a `SECURITY DEFINER` `BEFORE INSERT` trigger) | Flags (never blocks) a phone/WhatsApp match at insert time, because anonymous visitors can only INSERT into `leads`, never SELECT, so an app-level pre-check was impossible without elevated privilege. |
| `blog_posts`, `public_landing_pages` | `unique (slug)` | Duplicate content-page URLs. |
| `push_subscriptions` | `unique (endpoint)` | Duplicate device registrations. |

**Not verified as idempotent (documented in SECURITY_AUDIT_REPORT):** `rent_payments`/`deal_payments` creation relies on an application-level "does this exceed outstanding balance" check (a read-then-write / TOCTOU pattern) rather than a database-level idempotency key. Given these are staff-recorded (not public self-service) actions, real-world exploitability is low, but it is not database-enforced. **LOW/MEDIUM, documented, not fixed this pass.**

## Migration safety

- All 33 STEPs' migrations use `create table if not exists`, `drop policy if exists` + `create policy`, `on conflict do nothing` for seeds — reviewed as a pattern across every migration filename, not a new finding.
- STEP 33's own database change (a column-GRANT migration for `property_valuations`) was drafted, found to be architecturally flawed on review (Postgres role-based GRANTs can't distinguish staff-authenticated from customer-authenticated in this schema), and **deleted before being presented to the user** — no destructive or incorrect migration was shipped.
- No migration in the full history performs a destructive operation (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`) against a table holding real business data — confirmed by grepping every migration file for `drop table` / `drop column` / `truncate` outside of the safe `drop policy if exists`/`drop trigger if exists`/`drop constraint if exists` idiom.

## Indexes

- Every foreign-key column sampled has a corresponding `create index if not exists` (e.g. `leads_assigned_agent_idx`, `deals_property_idx`, `deals_customer_idx`) — this has been a consistent, disclosed pattern since early STEPs, re-confirmed by reading the `leads`/`deals` index blocks directly in this pass.
- **Not verified:** actual query performance / whether any index is unused in practice (`pg_stat_user_indexes`) — this requires a live database connection with real traffic history. **NOT TESTED.**

## Orphan records

**NOT TESTED.** This requires live queries against the actual production data (e.g. `select count(*) from deals where property_id is not null and not exists (select 1 from properties where id = deals.property_id)`), which this session has no live database connection to run. The `on delete set null`/`cascade` patterns in the schema are designed to prevent orphans going forward, but whether any already exist in the live data was not checked.

## Backup & recovery

**NOT TESTED.** This session has no access to the Supabase project's dashboard/backup configuration (the connected tooling for this project has no working access, per this session's own long-standing, previously-documented limitation with the Vercel/Supabase project link). Backup frequency, retention, and restore procedure are **NOT VERIFIED** — the user should confirm directly in the Supabase dashboard (Settings → Database → Backups) that Point-in-Time Recovery or scheduled backups are enabled for the production project, since this cannot be confirmed from the codebase alone.

---

## Summary

| Check | Result |
|---|---|
| Tables without RLS | 0 / 209 |
| Float/real money columns | 0 |
| Duplicate tables | 0 confirmed |
| Property double-booking protection | Verified real (partial unique index) |
| Duplicate rent generation protection | Verified real (unique constraint) |
| Lead duplicate detection | Verified real (new trigger, flag-only) |
| Payment idempotency | Not database-enforced (documented, LOW/MEDIUM) |
| Orphan records | NOT TESTED (no live DB access) |
| Backup/recovery | NOT TESTED (no live dashboard access) |
