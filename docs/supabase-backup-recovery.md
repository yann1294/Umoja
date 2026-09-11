# Supabase backup, export, restore, and rollback

Status: development export/readback rehearsal automated; restore to a second empty project remains a manual gate

## What is protected

- Git is the source of truth for ordered SQL migrations, Storage policies, generated types, and
  application code. Record `supabase migration list --linked` with each release.
- `node scripts/supabase-recovery-rehearsal.mjs` exports application rows and Storage metadata to a
  mode-0600 operating-system temporary directory, verifies a SHA-256 checksum and counts, reports
  aggregates only, and removes the artifact in `finally`. It never writes an export into Git.
- Applicant file bytes are already AES-256-GCM ciphertext. A real backup must include those opaque
  Storage objects plus `intake_files` metadata; neither is useful without the separately backed-up
  key version. CMS private sources need equivalent private backup handling.
- Supabase Auth Admin inventory can enumerate identities, but password hashes, active sessions, MFA
  secrets, and external-provider credentials are not a portable application export. A restored
  project requires controlled re-invitation and recovery.

## Key custody

Back up every `UMOJA_DATA_ENCRYPTION_KEY_*`, `UMOJA_FILE_ENCRYPTION_KEY_*`, and
`UMOJA_LOOKUP_HMAC_KEY_*` version in an access-audited secret manager outside Supabase, source
control, CI artifacts, and application-data exports. Record custodians, recovery access, rotation
date, and test evidence. Never retire a version while a row or object references it. Loss of a key
makes its ciphertext unrecoverable; do not weaken authentication to compensate.

## Restore rehearsal into a fresh project

1. Obtain explicit authorization for a disposable project and independently verify it has zero Auth
   users, application rows, migrations, and Storage objects. Never reset the linked development
   project.
2. Link the CLI to that project, preview every committed migration, apply additively, read migration
   history back, and regenerate normalized types.
3. Create buckets and policies only through migrations. Import logical rows in foreign-key order;
   recreate synthetic Auth users through the Admin API before their role/membership/profile rows.
4. Upload encrypted objects under their recorded neutral paths. Verify ciphertext digests, counts,
   bucket privacy, MIME/size limits, and clean-only delivery. Do not decrypt during bulk restore.
5. Run the complete anonymous/role/owner/disabled/service RLS and Storage matrices, CMS publish and
   rollback, intake idempotency/decryption, scanner quarantine, and audit reconciliation.
6. Delete disposable synthetic users, rows, and objects in dependency order. Preserve only redacted
   counts/checksums and revoke disposable credentials.

No second authorized empty project is configured for this spike, so steps 2–6 have not been claimed
as executed.

Development rehearsal on 2026-08-28 verified the temporary export checksum and read-back for all 15
application tables, three bucket inventories, and Auth count, then removed the temporary artifact.
Application tables and `applicant-private` were empty. The project contained one pre-existing Auth
identity and five `cms-private` objects; this rehearsal did not inspect their contents, classify
them as synthetic, export them into Git, or delete them. They remain an explicit ownership/cleanup
reconciliation item. No restore target was configured, so restore remains unperformed.

## Recovery and rollback

- Deploy the last reviewed commit first; never repair an incident by rewriting migration history.
- For a Supabase outage, keep writes disabled until session, RLS, database, Storage, key custody,
  scanner, and audit integrity are verified. Restore into a new project rather than resetting the
  affected linked project.
- Appwrite rollback means redeploying the reviewed pre-cutover Git baseline with its separately held
  environment. It is not a runtime flag or dual write. Because Appwrite inventory is still blocked
  by a 401, do not direct new writes there or reconcile data until an owner completes the read-only
  inventory and approves a data plan.
- Rotation is version-additive: introduce a new key version, use it for new writes, re-encrypt and
  verify in a resumable audited job, then retire the old version only after independent count and
  decrypt checks.
