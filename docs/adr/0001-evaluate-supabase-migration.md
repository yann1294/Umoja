# ADR 0001 — Evaluate Supabase before the Phase 12 backend expansion

- Status: Proposed — spike in progress; Appwrite remains the active runtime; no production cutover is approved.
- Date: 2026-08-26
- Owners: Umoja product and engineering leads
- Decision scope: Authentication, relational data, CMS persistence, intake persistence, private storage, authorization, and future workspace data

## Context

Prompts 8–11 established an Appwrite-backed development foundation with invite-only authentication, CMS and intake tables, application AES-256-GCM encryption, HMAC blind indexes, audit digests, and one shared Storage bucket. Prompt 12 adds a substantially more relational model: public and private profiles, skills, portfolio evidence, availability snapshots, membership history, and later organizations, projects, nested modules, dependencies, assignments, deliverables, and approvals.

A report claimed that Appwrite Cloud Free disables all file uploads. The official documentation does not support that interpretation. Appwrite lists disabled uploads as the consequence of reaching the Storage limit; its current pricing page lists 2 GB Storage, a 50 MB file-size limit, one bucket per project, and project pausing after one week of inactivity on Free. The absent bootstrap key is also an intentionally removed credential that can be recreated for an approved additive schema change, not a paid-plan restriction.

Supabase remains a credible architectural alternative. Its Free plan currently lists 500 MB Postgres, 1 GB file Storage, 50,000 monthly active users, 5 GB egress, a 50 MB maximum upload setting, and project pausing after one week of inactivity. Supabase provides Postgres migrations, Row Level Security (RLS), Auth integration, and Storage policies that map naturally to Umoja's future relational and project-scoped authorization model.

Sources checked on 2026-08-26:

- Appwrite Free-plan behavior: https://appwrite.io/docs/advanced/billing/free
- Appwrite pricing and limits: https://appwrite.io/pricing
- Supabase pricing: https://supabase.com/pricing
- Supabase Storage limits: https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Supabase Next.js SSR Auth: https://supabase.com/docs/guides/auth/server-side
- Supabase migrations: https://supabase.com/docs/guides/local-development/database-migrations

Pricing and plan limits are time-sensitive and must be rechecked before cutover and launch.

## Decision

Create a dedicated `spike/supabase-migration` branch from the reviewed Prompt 11 baseline. Implement a complete local/development Supabase proof covering Auth, SQL migrations, RLS, Storage, existing CMS/intake behavior, and the Phase 12 relational schema. Keep Appwrite Cloud unchanged and available as rollback while the spike is evaluated.

Do not run a production dual-backend architecture and do not split Auth/data into Appwrite while using Supabase only for files. The spike may keep both repository adapters temporarily for parity tests, but the accepted runtime must select one backend. If Supabase is accepted, migrate Auth, database, and Storage together and remove Appwrite runtime dependencies after parity and rollback evidence are complete.

Retain Umoja's application-layer encryption and HMAC model. RLS and private buckets provide access control; they do not replace application encryption for classified sensitive fields and private applicant files.

## Why a spike instead of immediate cutover

- The stated Appwrite upload blocker is not proven.
- The existing Appwrite implementation is complete and tested through Prompt 11.
- Auth/session migration, role mapping, CMS atomic publishing, storage policies, and RLS create meaningful security regression risk.
- Supabase's relational model is promising for future phases, but it should be demonstrated with tests rather than assumed.
- There is little or no real applicant data, so this is the least expensive time to evaluate or migrate.

## Supabase acceptance gates

Accept Supabase only when the branch proves all of the following:

1. Invite-only Auth, verification, recovery, secure Next.js SSR cookies, session refresh, account disablement, and MFA-ready privileged access work without public signup.
2. The role vocabulary `admin`, `cms-editor`, `reviewer`, `core`, `extended`, and `project-manager` is represented in trusted database records, not user-editable metadata.
3. RLS is enabled on every exposed table and tested separately for `anon`, record owner, every role, missing membership, disabled account, and service-role paths.
4. Public CMS queries expose only complete published revisions; draft, review, audit, intake, private profile, and membership rows remain private.
5. Project/talent intake validation, AES-256-GCM envelopes, HMAC blind indexes, idempotency, digest-only audit records, and review authorization retain behavior parity.
6. Separate `cms-public`, `cms-private`, and `applicant-private` buckets work with least-privilege Storage RLS. Private files remain application-encrypted and use authorized server delivery only.
7. Phase 12 profile, skill, portfolio, availability, and membership-history tables are reproducible from SQL migrations with deterministic RLS tests.
8. Existing public, authentication, workspace, admin, CMS, and intake UI behavior and responsive screenshots do not regress.
9. No Supabase secret/service key enters browser bundles, logs, screenshots, fixtures, or Git.
10. Local reset, remote migration status, generated TypeScript types, health checks, seed data, export, rollback, and free-plan quota/pausing procedures are documented and exercised.

## Rejection conditions

Keep Appwrite and stop the migration if the spike requires weakened RLS, public private-file URLs, duplicated authorization systems, user-editable role claims, unreviewed destructive migration, loss of CMS/intake behavior, or a production dual-write strategy.

## Consequences if Supabase is accepted

- Postgres becomes the canonical operational data store.
- Supabase Auth becomes the only runtime identity provider; existing Appwrite users are re-invited or explicitly migrated, never silently duplicated.
- Supabase Storage replaces the shared Appwrite bucket and separates public CMS, private CMS, and applicant files.
- SQL migrations under `supabase/migrations` become the schema source of truth.
- RLS becomes a second authorization boundary alongside server-side domain policy checks.
- Appwrite Cloud remains untouched through a defined observation/rollback window, then is exported and decommissioned only with separate approval.
- Free-tier pausing, lack of production-grade backups/SLA, 500 MB database size, and 1 GB Storage remain private-preview limitations.

## Consequences if Supabase is rejected

- Recreate a temporary least-privilege Appwrite bootstrap key.
- Verify actual Storage usage and perform a real encrypted upload/download test below the 2 GB/50 MB limits.
- Continue Prompt 12 with additive Appwrite tables and the existing shared-bucket policy.
- Record the evidence that caused the Supabase spike to fail so the decision is not repeatedly reopened without new information.
