# Supabase Migration Spike and Cutover Runbook

Status: proposed remote-only development-project spike after Prompt 11  
Decision authority: `docs/adr/0001-evaluate-supabase-migration.md`

## 1. Safety boundary

### Current remote-only execution mode

This spike uses only the newly configured empty development project from ignored
`apps/web/.env.local`. Do not use Docker, `supabase start`, `supabase stop`, local database
resets, pgTAP, or `supabase db reset --linked`. The latter is prohibited in every environment.

Before each additive remote migration, read the configured project identity without printing any
credential, run `supabase migration list --linked`, inspect every pending migration, and run
`supabase db push --linked --dry-run`. Apply only the reviewed pending migration with
`supabase db push --linked`. Read migration history, buckets, and generated types back afterward.

Synthetic users must be created through the supported server-only Supabase Auth Admin API, given
unique test identifiers, and removed with all dependent records and objects in `finally` blocks.
Never seed or directly insert into `auth.users` or another Auth schema using SQL. Appwrite remains
untouched; its real-data state is unknown until a separately authorized read-only inventory works.

Run `node scripts/appwrite-inventory.mjs` for the idempotent, metadata-only disposition gate. It
prints aggregate counts, date ranges, and a conservative synthetic classification; it never prints
identifiers, emails, row contents, filenames, or credentials. A 401 is a blocked inventory—not
evidence that Appwrite is empty.

If the existing key is rejected, an Appwrite Console owner may create a temporary key named
`umoja-read-only-inventory`, store it only as `APPWRITE_INVENTORY_API_KEY`, and grant only the
Console read scopes for Users, Teams, Databases, Tables, Rows, Buckets, and Files (shown by the API
as `users.read`, `teams.read`, `databases.read`, `tables.read`, `rows.read`, `buckets.read`, and
`files.read`). Grant no create, update, delete, session, function, project, platform, or key scopes.
Run the inventory, record only its aggregate result, then revoke the temporary key. A data export or
reconciliation remains a separately authorized operation even when metadata inventory succeeds.

Start from the reviewed Prompt 11 baseline:

```bash
git status --short
git switch -c spike/supabase-migration
```

Do not delete, modify, or repurpose the Appwrite Cloud project during the spike. Do not merge the branch until the ADR acceptance gates pass. Never run destructive reset commands against a linked remote Supabase project. `supabase db reset --linked` is prohibited.

Use synthetic development data. If any real user or applicant data exists, stop and create a separately reviewed data inventory, consent/legal basis, export, reconciliation, and deletion plan before moving it.

## 2. User-created prerequisites

Create one Supabase development project in an appropriate available region. Record the region and project reference without committing secrets. In the Supabase dashboard:

- Keep public signup disabled or enforce invitation-only onboarding in the server flow.
- Configure the exact development Auth callback URL: `APP_URL/api/supabase-auth/callback`.
  The callback receives the one-time code server-side and then redirects only to the
  locale-preserving clean routes `/en|fr/verify-email`, `/en|fr/accept-invite`, or
  `/en|fr/recover-password`. Do not allow arbitrary redirect origins or destinations.
- Set the global Storage upload limit no higher than 10 MB for the pilot, even though Free supports up to 50 MB.
- Do not create permissive tables, buckets, or policies manually; migrations should remain the source of truth.
- Do not add real applicant data.

Store real values only in the ignored local environment:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=

SUPABASE_CMS_PUBLIC_BUCKET=cms-public
SUPABASE_CMS_PRIVATE_BUCKET=cms-private
SUPABASE_APPLICANT_PRIVATE_BUCKET=applicant-private

APPWRITE_DATA_ENCRYPTION_KEY_V1=
APPWRITE_FILE_ENCRYPTION_KEY_V1=
APPWRITE_LOOKUP_HMAC_KEY_V1=
APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION=v1

NEXT_REVALIDATION_SECRET=
```

If the project exposes legacy `anon` and `service_role` keys instead of the newer publishable/secret keys, use explicit legacy environment names and document the SDK version. Never place a secret/service-role key behind `NEXT_PUBLIC_`.

Shared application configuration is provider-neutral. `APP_URL`, `NEXT_REVALIDATION_SECRET`, and
the canonical `UMOJA_*` encryption key names are parsed outside either backend adapter. During the
reversible migration, existing `SUPABASE_*` and `APPWRITE_*` key aliases remain accepted after the
canonical names so existing AES-GCM envelopes, AAD contexts, and HMAC indexes remain readable.

The deterministic remote type-drift check is:

```sh
node scripts/supabase-types.mjs
```

It generates from the linked development project in memory, applies the repository Prettier
configuration, and compares normalized output without overwriting the committed type file. To
intentionally update types after reviewing an applied migration, run the same command with
`--write`, inspect the diff, and commit it with that migration.

## 3. Repository architecture

Use the current maintained Supabase packages compatible with the repository's Next.js version. For cookie-based Next.js SSR, use the current official SSR package and PKCE flow. Centralize:

```text
packages/supabase/
├── browser.ts
├── server.ts
├── admin.ts
├── auth.ts
├── repositories/
├── storage/
├── generated/
└── errors.ts

supabase/
├── config.toml
├── migrations/
├── seed.sql
└── tests/
```

- Browser client: publishable key only.
- Per-request server client: user's cookie session; respects RLS.
- Admin client: server-only secret/service key; bypasses RLS and is used only after explicit server validation/authorization for operations that cannot use a user-scoped client.
- Authenticated routes: dynamic/no-store wherever session refresh or private data is involved; never cache `Set-Cookie` responses publicly.
- Repository interfaces: preserve domain contracts so UI components do not depend directly on Supabase.

## 4. SQL migration model

Create timestamped, reversible-forward SQL migrations. Do not edit a migration after it has been applied remotely; add a new migration.

Initial parity tables:

- `user_roles`
- `cms_pages`
- `cms_revisions`
- `project_intakes`
- `talent_intakes`
- `audit_logs`

Phase 12 tables:

- `profiles`
- `private_profile_details`
- `skills`
- `profile_skills`
- `portfolio_items`
- `availability_snapshots`
- `membership_history`

Use UUID primary keys, foreign keys, check constraints, enums or constrained lookup tables for stable statuses, UTC timestamps, soft archival where required, and indexes only for demonstrated query paths. Do not store the relational model in generic JSON blobs. Keep public profile fields structurally separate from encrypted private details.

Roles remain `admin`, `cms-editor`, `reviewer`, `core`, `extended`, and `project-manager`. Store them in protected relational rows. Do not trust `raw_user_meta_data`, browser-provided role values, email domains, or editable JWT metadata for authorization.

## 5. RLS and grants

- Enable RLS on every table in an exposed schema.
- Revoke broad default grants and grant only the operations each role requires.
- Write separate `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies.
- Public CMS access must use a narrowly scoped published-only table/view/RPC with no draft/private columns.
- Applicants may access only their own eligible profile/application rows.
- `admin` and `reviewer` receive only approved operational intake access.
- `cms-editor` receives only approved content actions.
- Governance-only actions remain blocked.
- Future project/module policies must require both an allowed role and active project/module membership.
- Put authorization helper functions in a non-exposed `private` schema. Prefer `security invoker`; if `security definer` is necessary, pin `search_path = ''`, schema-qualify every object, revoke public execution, grant only intended callers, and test it directly.
- Test grants as well as policies; a passing service-role query does not prove RLS works.

## 6. Auth migration

Implement invitation-led Supabase Auth with email verification, recovery, sign-out, session refresh, account-state checks, and MFA-ready privileged access. Preserve the refined authenticated shell and all Prompt 9 policy behavior.

Do not attempt to migrate live Appwrite sessions. If only synthetic/development users exist, create fresh Supabase users and re-invite the initial administrator. If real users exist, require an approved account migration and communication plan; do not copy password material without a documented supported method.

### Email-link validation evidence

- 2026-08-26: the controlled English verification email was received and clicked, but
  landed on the Umoja homepage rather than `/en/verify-email`. This is an **unresolved
  redirect mismatch**, not a successful verification test. The corrected callback flow
  is implemented but has not been manually exchanged successfully.
- Manual delivery/exchange verification is deferred for all six required flows: English
  and French verification, invitation acceptance/password setup, and recovery/reset.
  No real user invitation, verification, or recovery may launch until every flow has
  been manually re-tested successfully against the configured dashboard URLs.
- This remains a required development/private-preview gate and a production-cutover
  blocker. Automated tests use only confirmed disposable Auth Admin users and cannot
  replace an inbox delivery/link-exchange check.

## 7. Storage migration

Create through migrations or a versioned provisioning script:

- `cms-public`: public only for deliberately published CMS derivatives; no public upload/update/delete.
- `cms-private`: private CMS drafts/source media; editor/publisher policies only.
- `applicant-private`: private encrypted intake and portfolio files; no public access.

Use random object IDs and neutral paths; never put names, emails, organizations, or project titles in object paths. Validate signature, MIME, extension, and size before upload. Keep the existing AES-256-GCM file envelope and independent key. Download/decrypt through an authorized server path. RLS and signed URLs are access controls, not replacements for application encryption.

Do not upload using the secret/service key when ownership-based RLS should apply. If a trusted server upload uses the secret key, write and verify the canonical ownership/authorization metadata explicitly because service-key uploads do not automatically represent the applicant.

## 8. Data migration

### Intake ownership and review decision

- Public project and talent submissions do not require an account.
- New anonymous rows use `applicant_id = null` and have no applicant-readable policy.
- Never derive ownership from email, encrypted values, HMAC blind indexes, submission references,
  or other applicant-supplied data.
- A future claim capability must be random, expiring, single-use, replacement/revocation aware, and
  bound to intake kind, submission, intended recipient, and verified user. Store only its digest and
  digest-only audit evidence.
- Keep claim issuance, claim delivery, and applicant read-back disabled in rendered paths until all
  six English/French verification, invitation, and recovery email flows pass.
- Public confirmation exposes only a non-secret reference and explains that Umoja will contact the
  applicant.
- `accepted` is reserved for a future governance/commercial approval capability. Reviewer and
  operations-admin routes must reject it.
- Preserve the current stored enum during the initial cutover. Map `new` to submitted, `triage` and
  `in_review` to operational review, `contacted` to an information/contact step, `closed` to a closed
  or declined outcome with separately encrypted notes, and `duplicate` to duplicate closure. Add a
  future migration before introducing distinct `needs_information`, `shortlisted`, `qualified`,
  `declined`, or `withdrawn` stored states.
- `/contact` remains mock-only and non-persistent.

Before copying anything, classify the Appwrite data:

- Published CMS content
- Draft CMS content
- Synthetic seeds
- Accounts and memberships
- Encrypted intake records
- Audit digests
- Storage objects

Prefer recreating known synthetic seeds. Preserve stable IDs only when application URLs or foreign keys require them. If AES-GCM authenticated context includes an Appwrite table/document ID or old resource name, decrypt and re-encrypt with the new Supabase context; copying ciphertext unchanged may make it undecryptable. Recompute blind indexes only from authorized plaintext using the existing independent HMAC key.

Produce counts and deterministic digests before and after migration. Never print plaintext or secrets during reconciliation.

## 9. Cutover sequence

1. Make the full test suite green against local Supabase.
2. Apply migrations to the empty Supabase development project with `supabase db push` only after reviewing the SQL and linked project.
3. Generate and commit TypeScript database types.
4. Seed synthetic bilingual CMS drafts and test accounts safely.
5. Run RLS tests using anon, owner, each role, unrelated authenticated user, disabled user, and service key.
6. Run Storage policy and encrypted upload/download tests.
7. Run CMS publish/revalidation and intake review parity tests.
8. Run all responsive, accessibility, screenshot, browser, and 200% zoom checks.
9. Scan the browser bundle and repository for Supabase/Appwrite secrets.
10. Switch the branch runtime fully to Supabase; do not leave production dual writes.
11. Remove Appwrite runtime dependencies, environment requirements, health checks, and adapters only after parity passes. Preserve migration/export tooling and Git history.
12. Keep Appwrite Cloud unchanged through the agreed rollback window.

### Atomic intake cutover and rollback boundary

Switch the public project/talent APIs, attachment transfer, reviewer queue/detail/actions, private
file delivery/archive, and intake audits together. The switched group must use anonymous trusted
Supabase submission services and a Supabase reviewer/admin principal; it must not combine Appwrite
identity, tables, Storage, environment parsing, or crypto adapters with Supabase data.

Before merge, rollback is deployment of the reviewed Prompt 11 Appwrite baseline. Stop development
Supabase intake writes first and remove only synthetic spike records through their marker-scoped
cleanup. Do not copy or reconcile real records without a separately approved inventory and legal
plan. After the intake switch, remaining workspace and non-CMS administration may stay Appwrite-only
temporarily, but that route-group split is migration-only and cannot be accepted as the final
runtime.

## 10. Rollback

Before merge, rollback means switching back to the reviewed Appwrite branch. After a development cutover, rollback requires stopping Supabase writes, reconciling any development-only data, restoring the Appwrite environment configuration, and redeploying the last Appwrite commit. Do not promise data rollback after real dual-system writes unless a tested reconciliation mechanism exists.

## 11. Free-plan operating limits

- Treat Supabase Free as development/private-preview infrastructure, not a production SLA.
- Record the 500 MB database, 1 GB Storage, 5 GB egress, 50 MB global maximum, and inactivity-pausing limits from the current pricing page.
- Keep Umoja's application limit at 10 MB per upload.
- Add usage checks, a manual wake/restore procedure, and regular logical exports.
- Recheck pricing, region, backups, SMTP, log retention, and support before launch.

## 12. Required commits

Keep commits focused and independently buildable:

```text
docs: record Supabase migration decision and runbook
chore(supabase): add local stack and environment contract
feat(supabase): add relational schema and RLS policies
feat(supabase): migrate invite-only authentication
feat(supabase): migrate CMS and public content repositories
feat(supabase): migrate encrypted intake and private storage
test(supabase): verify RLS storage and backend parity
refactor(backend): complete Supabase cutover
docs(supabase): update operations and rollback guidance
```

Do not combine the schema/RLS implementation with UI redesigns or Phase 12 feature work. Complete and review the backend migration before implementing new workspace functionality.

## 13. Codex migration prompt

Run this only after reviewing ADR 0001 and choosing to execute the Supabase spike:

```text
Create and execute a complete, reversible Supabase migration spike for the Umoja platform after Prompt 11. This task migrates the backend foundation only; do not implement Prompt 12 profile/availability UI yet.

Read completely before acting:

- AGENTS.md
- docs/product-blueprint.md
- docs/brand-system.md
- docs/codex-kickstart-playbook.md
- docs/adr/0001-evaluate-supabase-migration.md
- docs/supabase-migration-runbook.md
- The existing Appwrite runbook, configuration, migrations/provisioning scripts, repository interfaces, encryption services, policy tests, Auth implementation, CMS implementation, intake implementation, and current Git history/status

The official Appwrite Free documentation was previously misread: uploads are disabled after reaching the Storage limit, while current pricing lists 2 GB Storage and a 50 MB file limit. Do not claim that Appwrite Free universally disables uploads. This migration is an architectural evaluation for Umoja's future relational model, not an emergency workaround based on that incorrect claim.

## Branch and safety

Confirm the current branch contains the reviewed Prompt 11 baseline and has no unresolved changes. Create and switch to:

`spike/supabase-migration`

If that branch already exists, stop and report it rather than overwriting it. Keep Appwrite Cloud untouched, readable, and available for rollback. Do not delete Appwrite resources, keys, users, data, or files. Do not modify production. Do not run any linked remote reset or destructive SQL command.

Inventory whether any non-synthetic Appwrite user, CMS, intake, audit, or file data exists. If real personal/client data exists, stop before copying it and report the need for an approved data-migration/legal/reconciliation plan. Synthetic seeds may be recreated.

## Supabase prerequisites

Use a Supabase development project only. Read endpoint/project values from ignored environment files without printing them. If remote credentials or an authenticated CLI session are absent, complete the local Supabase implementation and tests, then report the exact remote prerequisites; do not invent values.

Use the current official Supabase packages compatible with the repository's Next.js version. For cookie-based Next.js SSR, follow the current official PKCE/SSR pattern. Use the publishable key in browser-safe clients and keep the secret/service key server-only. Authenticated/private routes and session-refresh responses must be dynamic and non-cacheable.

Add a committed `.env.example` contract with placeholders only. Preserve the existing AES-256-GCM data/file keys, HMAC lookup key, active key version, and revalidation secret. Never commit or display any secret.

## Local and migration foundation

Initialize a version-controlled `supabase/` directory containing `config.toml`, timestamped SQL migrations, synthetic seed data, policy tests, and generated TypeScript database types. Use the Supabase CLI local stack where available. Never expose the local stack externally.

Implement scripts for local start/status/stop, database reset, migration lint/status, type generation/check, seed, health, RLS tests, Storage tests, parity tests, export, and remote push. Commands with different local/linked defaults must pass the target explicitly. Prohibit `supabase db reset --linked` in scripts and documentation.

## Schema

Create a relational, constrained schema for:

- user_roles
- cms_pages
- cms_revisions
- project_intakes
- talent_intakes
- audit_logs
- profiles
- private_profile_details
- skills
- profile_skills
- portfolio_items
- availability_snapshots
- membership_history

Use UUIDs, foreign keys to stable Auth user primary keys where appropriate, constraints, status enums/lookup tables, UTC timestamps, soft archival where required, and indexes based on real queries. Preserve public/private structural separation. Do not put the relational model into generic JSON blobs. Do not build future project/module tables in this migration unless they are required to prove the authorization pattern; document them as the next phase.

Store the existing role vocabulary in protected relational rows: admin, cms-editor, reviewer, core, extended, project-manager. Do not authorize from raw_user_meta_data, client input, email domains, or other user-editable claims. Admin remains operations authority, not governance authority.

## RLS and database security

Enable RLS on every exposed table. Revoke broad grants and write explicit operation-specific SELECT, INSERT, UPDATE, and DELETE policies. Test grants separately from RLS.

Required behavior:

- anon can read only complete published public CMS content and explicitly public profile fields with valid consent.
- anon cannot insert directly into intake tables or Storage; public forms continue through validated/rate-limited server boundaries.
- applicants can access only their own eligible application/profile rows.
- cms-editor can perform only approved draft/editorial actions.
- reviewer and admin can access only approved intake operations.
- other roles and unrelated authenticated users are denied.
- governance-only actions fail closed.
- future project/module authorization can combine role plus active membership without redesigning identity.

Put authorization helper functions in an unexposed private schema. Prefer security invoker. For every necessary security-definer function, use `security definer set search_path = ''`, schema-qualify all references, revoke public execution, grant only intended callers, and add direct abuse tests.

Do not use the secret/service client for ordinary signed-in operations that a user-scoped SSR client and RLS can enforce. Any server path that bypasses RLS must perform explicit input validation and domain authorization first and be tested as a privileged boundary.

## Authentication

Migrate Appwrite Auth behavior to invitation-led Supabase Auth:

- no public workspace signup
- sign in/out
- verification
- recovery
- callback handling
- secure cookie-based SSR session refresh
- account disabled/removed handling
- role and membership refresh
- MFA-ready privileged UX and server checks

Preserve the refined authenticated shell and route behavior. Do not migrate live Appwrite sessions. For synthetic/development users, create new Supabase users and document re-invitation. Do not claim MFA is active until verified operationally.

## CMS parity

Migrate the CMS repositories and atomic publish behavior to Postgres. Public queries must expose only the latest complete published revision. Draft, review, revision, audit, consent, rollback, preview, and targeted revalidation behavior must retain parity. Implement atomic transitions with a reviewed transaction/RPC where needed. Keep legal/governance publication blocked.

## Intake parity and encryption

Migrate project/talent intake repositories while preserving:

- server validation and normalization
- rate limiting and honeypot behavior
- opaque IDs and UTC timestamps
- consent version/time
- versioned AES-256-GCM encrypted sensitive payloads and notes
- HMAC-SHA-256 emailLookup and idempotencyKeyHash
- digest-only audits
- duplicate/idempotent retry behavior
- authorized review/decryption only

If existing ciphertext AAD includes Appwrite resource names or document IDs, do not copy it blindly. Recreate synthetic rows or decrypt/re-encrypt through an authorized migration path with the new stable context.

## Storage

Create and policy-test:

- cms-public: deliberately published derivatives only
- cms-private: private draft/source media
- applicant-private: encrypted intake and portfolio files

Set per-bucket MIME and 10 MB pilot limits. Use random neutral object paths without personal names, emails, organizations, or project titles. Keep application AES-256-GCM for private files. Validate signature/type/size before upload. Download/decrypt only through authorized server routes. Do not use public private-file URLs or previews.

Supabase Storage uses RLS on storage.objects. Add explicit policies for every required operation and prove anonymous listing/reading/writing is denied for private buckets. Do not assume owner_id alone grants access. If a secret/service upload bypasses RLS, explicitly record and verify canonical ownership metadata.

## Repository cutover

Preserve domain repository interfaces and implement Supabase adapters first. Temporary Appwrite adapters may remain only for automated parity comparison. Once parity passes, select Supabase as the only branch runtime and remove Appwrite runtime packages, imports, environment requirements, middleware/session handlers, health checks, and provider-switching behavior. Preserve Git history and documented export/rollback tooling.

Do not run production dual writes. Do not split Auth/data between Appwrite and Supabase. Do not redesign public, workspace, admin, CMS, or intake UI in this migration; only make provider-required behavioral corrections and preserve all refined responsive UX.

## Verification

Run and fix:

- formatter
- lint
- strict typecheck
- unit tests
- a clean local migration reset and seed
- generated-type drift check
- RLS/grant matrix for anon, owner, unrelated authenticated user, every role, disabled user, and secret/service client
- Storage upload/list/read/update/delete matrix for all buckets
- Auth SSR/caching tests
- CMS publish/rollback/revalidation parity
- intake encryption/blind-index/idempotency/audit parity
- health and export/rollback checks
- browser/auth/workspace/admin/CMS/intake regression tests
- full responsive screenshot matrix and real 200% zoom checks for any changed rendered output
- production build
- repository and browser-bundle secret scan

Use synthetic/redacted screenshots and fixtures. Do not blanket-update baselines.

If remote Supabase credentials exist, review every migration and apply it only to the empty development project using the safe linked push workflow. Read back schema, policies, buckets, limits, Auth settings, and seed counts. Never report remote success based only on a command exit code.

## Commits

Create focused, independently buildable commits:

- docs: record Supabase migration decision and runbook
- chore(supabase): add local stack and environment contract
- feat(supabase): add relational schema and RLS policies
- feat(supabase): migrate invite-only authentication
- feat(supabase): migrate CMS and public content repositories
- feat(supabase): migrate encrypted intake and private storage
- test(supabase): verify RLS storage and backend parity
- refactor(backend): complete Supabase cutover
- docs(supabase): update operations and rollback guidance

Do not commit if unrelated user changes cannot be isolated. Never commit secrets, exports containing data, database passwords, generated private keys, or real applicant files.

## Final decision report

Return:

1. Branch and starting commit
2. Appwrite inventory and whether any real data exists
3. Supabase project/region identifiers without secrets
4. Migrations, tables, constraints, indexes, functions, RLS policies, and buckets created
5. Auth and role parity
6. CMS and intake parity
7. Encryption and Storage results
8. Test/build/responsive results
9. Free-plan limits and operational risks
10. Rollback procedure tested
11. Commit hashes
12. ADR acceptance gates passed/failed with evidence
13. Recommendation: accept Supabase, reject it and keep Appwrite, or continue the spike with named blockers

Do not merge, delete Appwrite, or begin Prompt 12 automatically. Stop for explicit review of the final decision report.
```
