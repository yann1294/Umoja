# Prompt 13 Release Readiness

Date: 2026-09-01

Branch: `spike/supabase-migration`

Runtime: Supabase only; Appwrite is retained as migration history and rollback documentation

## Status boundary

| Area | Status | Meaning |
| --- | --- | --- |
| Prompt 12 | TECHNICALLY COMPLETE | Accepted authorization, rollback, REST/direct concurrency, bilingual lifecycle, responsive/Axe and genuine 200% zoom evidence is preserved. |
| Prompt 13 implementation | COMPLETE | Private-preview headers, fail-closed indexing, metadata, private response controls, structured redacted logging, input bounds, current generated types and browser-harness isolation are implemented. |
| Prompt 13 automated verification | COMPLETE | Formatting, lint, strict types, unit tests, production build, dependency audit, linked migrations/types/lint, RLS/Storage matrices, recovery export, secret scan and the full CI browser matrix passed (165 passed, 220 intentionally skipped). |
| Development integration review | READY | `spike/supabase-migration` is ready for review into `develop`; no merge, push or deployment is authorized by this record. |
| Private operations preview | BLOCKED — Gate B | Owner MFA/recovery ownership, all six real inbox flows, real malware scanning, an empty-target restore and adverse-network checks remain manual/external gates. |
| Public production launch | BLOCKED — Gate C | Physical Android/iPhone QA, legal/privacy/data-residency approval, real-data reconciliation, retention, monitoring, SMTP, support, incident response and launch approval remain open. |

`UMOJA_PUBLIC_INDEXING` defaults to disabled. Do not set it to `enabled` until public indexing is
explicitly approved. Private workspace, administration, preview and mutation responses remain
`no-store`, `private` and `noindex` independently of that switch.

## Hardening verification

- The production response includes a dependency-compatible CSP, deny-by-default framing,
  MIME-sniffing protection, a restrictive permissions policy and a strict referrer policy. HTTPS
  deployments additionally receive HSTS when `APP_URL` is HTTPS.
- Public metadata has canonical EN/FR alternates, `x-default` and Open Graph fields. Preview robots
  behavior fails closed through both `robots.txt` and `X-Robots-Tag`.
- Intake rejects declared requests above the bounded three-file envelope before parsing and returns
  private, non-cacheable error responses. CMS revalidation responses are private and non-cacheable.
- Server logs are one-line structured JSON. Credential/authorization/cookie/session/token/key,
  request-body, contact-field and token-shaped values are redacted; raw error messages and stacks
  are not emitted.
- The browser bundle scan covered 30 generated static files and found neither configured secret
  values nor privileged environment-variable names.
- The final CI browser matrix completed with 165 passing and 220 intentionally skipped cases. Its
  EN/FR viewport projects cover 320 through 1920 CSS pixels plus the 2560-wide sanity check; the
  shared-state remote lifecycle suites run only in their designated 1280 project.
- Production dependencies report no known vulnerabilities. The CSP intentionally retains inline
  script/style allowances required by the current Next.js bootstrap and styling output; removing
  them requires one coordinated nonce migration across static and dynamic rendering.

## Supabase operations

The development project is in `ap-southeast-2` (Sydney). Keep project identifiers public only where
required for client configuration; keep database passwords, secret/service keys and encryption
material in ignored local or approved secret storage.

Current Free-plan constraints must be rechecked before preview and launch. As reviewed on
2026-09-01, the plan includes 500 MB database storage, 1 GB object storage, 5 GB egress and 50,000
monthly active users, can pause after low activity over seven days, and does not provide a production
backup/SLA guarantee. Official references: [billing and quotas](https://supabase.com/docs/guides/platform/billing-on-supabase),
[project pausing](https://supabase.com/docs/guides/platform/free-project-pausing), and
[database backups](https://supabase.com/docs/guides/platform/backups).

Use additive, reviewed SQL only:

```bash
pnpm exec supabase migration list --linked
pnpm exec supabase db push --linked --dry-run
pnpm exec supabase db lint --linked
node scripts/supabase-types.mjs
```

Never run a linked reset. Keep RLS enabled and grants explicit on every exposed table. Keep
`cms-public` public-read/published-only; keep `cms-private` and `applicant-private` behind RLS and
authorized server paths. The 2026-09-01 final aggregate inventory retained one non-synthetic Auth
administrator, one role/membership row, zero profile/intake/CMS fixtures, and eight total
`cms-private` objects. Historical evidence separately records seven unknown objects and retained
quarantine resources; this aggregate check did not reopen that classification. No object name or
private row content was inspected or recorded.

## Encryption, backup and recovery

Canonical variables are `UMOJA_DATA_ENCRYPTION_KEY_V1`, `UMOJA_FILE_ENCRYPTION_KEY_V1`,
`UMOJA_LOOKUP_HMAC_KEY_V1` and `UMOJA_ENCRYPTION_ACTIVE_VERSION`. They must remain independent,
base64-encoded 32-byte values. Supabase aliases exist only to read preserved development material;
Appwrite aliases are rollback-only and are not silent runtime fallbacks.

Before any private preview, the owner must confirm an encrypted off-device backup and recovery
ownership without sharing keys in chat or committing them. Key loss makes the corresponding
ciphertext or blind indexes unrecoverable. Rotation is additive: create a new numbered version,
deploy readers for old and new versions, switch the active version for new writes, re-encrypt through
authorized application paths, verify complete readback, and only then retire the old version from
runtime while retaining its protected recovery copy for the approved retention period. Never replace
an existing version in place.

The logical recovery rehearsal exported application rows, aggregate Auth inventory and Storage
metadata to a mode-0600 temporary artifact, verified its checksum and removed it. It does not export
Auth passwords/sessions/MFA secrets or Storage object bodies. Gate B remains open until a separately
authorized restore into an explicitly empty disposable project passes schema, RLS and Storage probes.
Free-plan projects require owner-managed logical exports and off-site Storage-object backups; see the
[Supabase CLI backup/restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore).

Real-data retention, export and deletion require an approved privacy/legal schedule. Until then, use
synthetic data only, clean it by exact ownership, and do not migrate or delete real Appwrite data.
Appwrite recovery documentation and resources remain intact until a separately approved production
cutover and decommission window closes.

## Manual gates

### Gate B — private operations preview

- Verify the existing administrator's MFA enrollment and named recovery owner.
- Complete EN/FR verification, invitation and recovery inbox flows using the six allow-listed URLs.
- Configure and verify a real malware scanner before releasing any quarantined file.
- Restore into an explicitly empty disposable project; rerun migration, RLS and Storage checks.
- Exercise high latency, intermittent connectivity, interrupted upload, retry and session-expiry
  recovery without real applicant data.
- Confirm encrypted off-device key backup and recovery ownership.

### Gate C — public production

- Record supported physical Android and iPhone results; current status is **NOT RUN**.
- Approve legal model, privacy/data residency, real-data reconciliation, retention and deletion.
- Approve quotas/plan, backup RPO/RTO, monitoring, SMTP, support and incident response.
- Obtain explicit owner launch approval. Finance and automatic payments remain disabled.

## Development integration plan

The actual foundation branch is `feat/platform-foundation`. It is an ancestor of the migration
branch and its tree matches `origin/develop`; the four commits unique to `origin/develop` are merge
commits for that same foundation tree. The migration branch contains the migration series ahead of
that foundation, and the read-only three-way merge simulation found no content conflict.

Proposed sequence, requiring separate authorization:

1. Push `spike/supabase-migration` and open one pull request targeting `develop`.
2. Require the `Quality` workflow: frozen install, format, lint, typecheck, unit, responsive browser
   tests and production build. Review this checklist, security diff and synthetic screenshots.
3. Merge that one pull request into `develop` after approval. Do not also merge it through
   `feat/platform-foundation`; that foundation is already represented in `develop`.
4. Keep `main`, deployment and production activation unchanged until Gate B/C authorization.
