# Deployment Readiness Checklist — 5STAR.M Estate & Builders (STEP 33)

Checked items reflect what was actually verified in this audit or in prior STEPs' own build verification. Unchecked items are either genuinely unverifiable from this session (no live dashboard/credentials access) or require the user's own action.

## ENVIRONMENT

- [x] Production environment configured — live at `https://5starmarketing-5adv.vercel.app/` (confirmed reachable and serving STEP 32 content this session)
- [x] No secrets in repository — verified by grep across tracked source + `git check-ignore -v .env.local`
- [ ] Production secrets configured securely — **NOT independently verified**; this session has no access to Vercel's environment-variable dashboard for this project (a standing, previously-documented limitation)
- [ ] Correct Supabase project — assumed correct (same project used throughout this multi-day build); not independently re-confirmed against a Vercel dashboard this pass
- [ ] Correct storage buckets — not independently re-verified this pass (see SECURITY_AUDIT_REPORT, Storage section — code-level pattern confirmed, live bucket configuration not)
- [x] Correct domain / HTTPS enabled — confirmed via live browser check (`https://5starmarketing-5adv.vercel.app/`)
- [ ] Email provider configured — **NOT CONFIGURED** (disclosed since STEP 21; SMTP vars in `.env.local.example` are empty)
- [ ] WhatsApp provider configured — **NOT CONFIGURED** (`WHATSAPP_APP_SECRET` unset; webhook returns honest 501)
- [ ] SMS provider configured — **NOT CONFIGURED**
- [x] AI provider configured — `ANTHROPIC_API_KEY` was added to Vercel by the user and confirmed returning real AI responses in STEP 30/31
- [x] Analytics configured — `NEXT_PUBLIC_GA_ID` pattern exists; live GA4 configuration not independently re-verified this pass

## DATABASE

- [x] Migrations reviewed — every migration from STEP 1–32 reviewed at the time it was written; STEP 33 added no new migration (the one drafted was reverted after review)
- [x] RLS enabled — verified 209/209 tables, zero gaps
- [ ] RLS policies tested — **PARTIALLY**: policy text read and reasoned about; live cross-role testing NOT performed (no test accounts) — see RLS_PERMISSION_MATRIX.md
- [x] Indexes reviewed — sampled (leads/deals FK indexes confirmed present)
- [x] Constraints reviewed — confirmed real idempotency constraints on `deals`, `rent_schedules`; confirmed zero float/real financial columns
- [ ] Backup strategy confirmed — **NOT TESTED**, no dashboard access
- [ ] Restore procedure documented — **NOT TESTED**, no dashboard access

## SECURITY

- [ ] Authentication tested — code-reviewed only, no live login test (no credentials)
- [x] RBAC tested — **24 real gaps found and fixed** this pass (see SECURITY_AUDIT_REPORT SEC-02)
- [ ] IDOR tested — policy-level review only, no live cross-account attempt
- [x] Storage tested (code review) — signed-URL pattern confirmed, no public bucket found for sensitive documents
- [x] API security tested (sampled) — 4 representative routes read in full, no raw error/stack leakage found
- [x] File upload tested (sampled) — MIME allowlist + size cap confirmed on the one path read in full
- [x] Rate limiting reviewed — confirmed present on public forms + webhook; noted as in-memory/single-instance (KI-04)
- [x] Webhooks secured — HMAC signature verification confirmed on the WhatsApp webhook (currently unconfigured/blocked live)
- [x] Secrets reviewed — none found in source

## APPLICATION

- [x] Typecheck passes — `tsc --noEmit`, clean, re-run after this session's RBAC fixes
- [x] Lint passes — ESLint, clean, re-run after this session's RBAC fixes
- [ ] Production build passes — **build was still running in the background at the time this checklist was written; final PASS/FAIL to be confirmed in PRODUCTION_AUDIT_REPORT.md**
- [ ] Tests pass — no automated test suite exists (KI-05); N/A
- [ ] Critical workflows tested — code-traced only (INTEGRATION_TEST_REPORT.md); no live E2E run
- [x] Error handling verified (sampled) — no stack/raw error leakage found in the 4 routes read
- [x] Logging verified (sampled) — `console.error` server-side + AI `withLog()` calls confirmed present

## PUBLIC WEBSITE

- [x] SEO verified — `generateMetadata()`, canonical URLs, conditional noindex all confirmed by code read (STEP 32)
- [x] Sitemap verified — `src/app/sitemap.ts` includes properties/projects/blog/locations; campaign landing pages deliberately excluded (noindex)
- [x] Robots verified — `/admin`, `/agent`, `/api`, `/customer` all disallowed (the `/agent` entry was a real gap found and fixed in STEP 32)
- [x] Canonical URLs verified — confirmed on property search + property detail pages
- [x] Public forms verified — honeypot + rate-limit confirmed on contact/inquiry/site-visit forms (the site-visit gap was found and fixed in STEP 32)
- [x] Lead creation verified (code trace) — real INSERT into `leads`, real UTM capture
- [x] Mobile verified — responsive layouts + bottom nav confirmed built (STEP 31)

## PWA

- [x] Manifest verified — live-checked at `/manifest.webmanifest`, well-formed (STEP 31)
- [x] Service worker verified — confirmed registered and `active: true` via live browser check (STEP 31)
- [x] Offline behavior verified — `public/offline.html` fallback confirmed present
- [x] Sensitive data caching reviewed — service worker explicitly excludes `/admin`, `/agent`, `/customer`, `/api` from all caching (verified by reading `public/sw.js`)

## FINAL

- [ ] No CRITICAL issues — **confirmed true**: zero CRITICAL findings this pass
- [x] HIGH issues reviewed — 1 found (SEC-02), fixed this pass
- [x] Known issues documented — see KNOWN_ISSUES.md
- [ ] Deployment rollback strategy documented — **NOT DOCUMENTED THIS PASS**: recommend `git revert` of the STEP commit + Vercel's own "redeploy previous deployment" feature as the practical rollback path, since no custom deployment tooling exists
- [ ] Production monitoring plan documented — **NOT DOCUMENTED THIS PASS**: no APM/error-tracking service (e.g. Sentry) is configured anywhere in this codebase; Vercel's own function logs are the only current observability surface
- [ ] Final smoke test completed — see PRODUCTION_AUDIT_REPORT.md for what was actually smoke-tested via the Browser pane this session
