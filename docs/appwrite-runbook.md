# Umoja Appwrite provisioning and operations runbook

## Status language

Use **repository ready** only when the code, versioned infrastructure, tests, and build pass. Use
**development Cloud project provisioned** only after `pnpm appwrite:provision` has read every
resource back from the Appwrite project named `umoja-development`. A successful command without
read-back verification is not sufficient.

## Architecture

- Browser code uses the singleton in `packages/appwrite/src/browser.ts`. It receives only the
  public endpoint and project ID.
- `apps/web/lib/appwrite/admin.ts` creates separate server-only clients for SSR authentication,
  runtime data/file access, and temporary bootstrap work.
- `apps/web/lib/appwrite/session.ts` creates a per-request user client from the HTTP-only Appwrite
  session cookie. Ordinary workspace authorization uses this client and Appwrite permissions.
- Authentication route handlers live under `apps/web/app/api/auth`. No signup handler exists.
- The public CMS reader filters for `published` rows on the server and falls back to reviewed static
  content when Appwrite is unavailable. Draft/review/publish/rollback operations use the CMS
  repository and create revisions and audit digests.
- Public intake remains connected to the clearly labelled mock adapter. The later persistence work
  must call `prepareIntakeSubmission`, then upload validated files and create rows through a runtime
  server boundary. Applicants do not receive Appwrite accounts.
- `apps/web/lib/appwrite/encryption.ts` is a server-only AES-256-GCM boundary. The intake repository
  encrypts validated applicant payloads before Appwrite receives a row. HMAC blind indexes support
  exact email and duplicate lookup without storing plaintext email.
- Private intake file bytes are validated, then encrypted with a separate file key before upload.
  Authorized server code performs download and decryption; applicant files never use public URLs or
  Appwrite previews.
- `appwrite.config.json` is the versioned source of truth for the application team, database,
  tables, indexes, permissions, and buckets. Provisioning is additive and refuses any project whose
  verified name is not `umoja-development`.

## Environment variables

Copy the committed contract without committing the result:

```sh
cp .env.example apps/web/.env.local
```

Set the two public values and three separately scoped secrets. The database/table/bucket IDs have
stable development defaults. `APP_URL` must be the exact application origin. Set
`NEXT_REVALIDATION_SECRET` before enabling external publish webhooks.

Application encryption additionally requires these server-only values before intake persistence or
private-file upload is enabled:

- `APPWRITE_DATA_ENCRYPTION_KEY_V1`
- `APPWRITE_FILE_ENCRYPTION_KEY_V1`
- `APPWRITE_LOOKUP_HMAC_KEY_V1`
- `APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION=v1`

Each key must decode to exactly 32 independently generated random bytes. Generate each separately
with a cryptographically secure tool such as `openssl rand -base64 32`; never reuse a value across
purposes. Source, tests, preview deployments and setup scripts must not contain fallback keys. Tests
inject dedicated non-production key material.

Only these names may be available to browser code:

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`

Never expose or log the SSR, runtime, bootstrap, session, or revalidation secrets. Environment
validation returns a generic configuration error, and operational health output contains only
booleans.

Encryption and HMAC keys also never enter browser code, logs, errors, CI artifacts or Appwrite rows.
Keep an encrypted, access-audited backup outside the deployment. Losing a key permanently makes its
version's ciphertext and private files unrecoverable.

## Local setup

```sh
corepack enable
corepack prepare pnpm@10.15.0 --activate
pnpm install --frozen-lockfile
cp .env.example apps/web/.env.local
pnpm appwrite:validate
pnpm dev
```

Builds and unit tests do not require secrets. Authentication and live CMS operations return a safe
unavailable/unauthenticated result until the corresponding key exists.

## Development project and keys

Create or select exactly one Cloud project named `umoja-development`. A Console organization owner
must create these distinct keys; do not copy one key into another variable:

| Key name | Environment name | Responsibility |
| --- | --- | --- |
| `umoja-next-ssr` | `APPWRITE_SSR_API_KEY` | Account session, recovery, verification, and invite-auth operations only |
| `umoja-server-runtime` | `APPWRITE_SERVER_API_KEY` | Validated table rows, audit rows, and private files only |
| `umoja-bootstrap` | `APPWRITE_BOOTSTRAP_API_KEY` | Temporary project policy, platform, team, table, index, and bucket provisioning |

Grant only the scopes required by each operation. The runtime key does not need project-policy,
platform, key-management, or user-management scopes. The SSR key does not need database or storage
scopes. The bootstrap key must never be deployed as a runtime value.

The Console owner must also verify API-key scopes because creating standard keys and assigning
organization ownership cannot be bootstrapped from an untrusted application key.

## Provisioning development

1. Register the two web platforms `localhost` and `127.0.0.1` in the development project if the
   bootstrap key cannot manage platforms.
2. Create the three keys above and place their values only in `apps/web/.env.local`.
3. Run:

   ```sh
   pnpm appwrite:validate
   pnpm appwrite:provision
   pnpm appwrite:drift
   pnpm appwrite:health
   pnpm appwrite:integration
   pnpm appwrite:seed
   ```

Provisioning verifies the project name before any write, enables email/password authentication,
sets a minimum password length of 12, enables dictionary and personal-data protection, keeps five
passwords of history, restricts membership visibility, and enables TOTP/email MFA factors. It then
creates missing resources and reads the team, all five tables, and both buckets back. Existing
columns or indexes are not destructively rewritten; drift must be reviewed and migrated explicitly.

The bilingual seed command is explicitly development-only and creates two draft rows. It never
publishes or overwrites them.

## Free-plan application encryption

`umoja-development` cannot create Appwrite-native encrypted database columns on its current Cloud
plan. The schema therefore disables native column encryption and uses audited server-side
authenticated encryption. This is not permission to store applicant data in plaintext.

Field classification:

- **Public CMS content:** published titles, SEO text, structured blocks, slugs and locale remain
  plaintext so the public server repository can query and render them.
- **Private CMS drafts:** use the same plaintext content model, but confidentiality comes from
  deny-by-default permissions, authenticated preview authorization and explicit state filtering.
- **Operational metadata:** submission ID, state, locale, reviewer assignment, timestamps, consent
  timestamps/policy version, encryption-key version, counts and approved category fields remain
  plaintext for workflow queries. This metadata remains visible to principals allowed to read rows.
- **Sensitive project intake:** contact identity/email/phone, organization details, project title and
  narrative, budget, timing, attachment metadata/references and internal notes are encrypted.
- **Sensitive talent intake:** preferred identity, private contact, country/timezone, portfolio,
  availability, languages, attachment metadata/references and internal notes are encrypted. Skill
  and experience categories and optional public-profile consent remain operational fields; consent
  does not publish a profile by itself.
- **Audit data:** contains actor/action/target identifiers and non-reversible before/after digests.
  Never copy applicant payloads or plaintext personal data into audit metadata.
- **Files:** published CMS media may be plaintext with intentional publish-time read permission.
  Draft media remains permission-restricted. Intake file bytes are application-encrypted.

Database envelopes use `v1.<base64url-iv>.<base64url-auth-tag>.<base64url-ciphertext>`. Every value
uses a random 96-bit IV, AES-256-GCM authentication, its key version and contextual authenticated
data containing its purpose and submission identity. Encryption is non-deterministic. A generic
safe error is returned when an envelope, tag, context or key is wrong.

Normalized exact-match values use a separate HMAC-SHA-256 key and the format
`v1.<base64url-digest>`. Context separates project email, talent email and idempotency lookups. Never
replace this with an ordinary SHA hash, index ciphertext, or reuse a data/file key. `emailLookup` and
`idempotencyKeyHash` are the applicant lookup tokens.

The intake tables store `encryptedPayload` and separately encrypted internal notes with room for
envelope overhead. Validated schemas are applied before encryption and after authorized decryption,
so ciphertext is not an unvalidated product model. Decryption must follow server-side session and
`umoja-operations` role authorization; possession of a runtime key is not application authorization.

## Schema changes

1. Edit `appwrite.config.json` and update its tests.
2. Run `pnpm appwrite:validate` and the full local quality suite.
3. For additive development changes, run provisioning and drift checks.
4. For renames, narrowing, or deletion, write and review a separate migration. Never delete a
   column, table, bucket, or production row through the additive provisioner.
5. Apply to staging, verify read-back and backups, then schedule a separately authorized production
   migration.

## Permission and role model

Appwrite is deny-by-default. No anonymous visitor receives table or bucket permissions. Public CMS
reads and public intake submissions pass through validated Next.js server code. `Role.any()` write
permissions are forbidden. Published media can later receive a per-file public-read permission only
as part of a publish operation; private intake files never do.

The Appwrite application Team is `umoja-operations`. Roles are `admin`, `cms-editor`, `reviewer`,
`core`, `extended`, and `project-manager`.

- `cms-editor`: read/create/update CMS drafts and revisions; no user or infrastructure management.
- `reviewer`: read/update intake workflow and private intake files; no CMS publishing by role alone.
- `admin`: application operational permissions and destructive CMS/intake actions where configured.
- `core`, `extended`, `project-manager`: initial workspace vocabulary with no broad data permission
  granted merely by membership.

Appwrite Console organization roles are not Umoja application roles. Server guards require a
confirmed `umoja-operations` membership and the appropriate application role.

## Invite-only onboarding

There is no public signup route. An application administrator invites an email address to the
`umoja-operations` team with selected application roles. The recipient signs into an existing or
administrator-created Appwrite account and accepts the membership using the signed invite values.
Sign-in verifies a confirmed application-team membership before setting the session cookie.

Sessions use an HTTP-only, `SameSite=Lax`, path-scoped cookie and `Secure` in production. Sign-out
deletes the Appwrite session and expires the cookie. Configure verified email and recovery URLs for
each real environment. Require MFA for production administrators as an organizational launch rule;
MFA factor availability alone does not enforce administrator enrollment.

## CMS publishing and revalidation

CMS rows are split by locale and linked by a translation group. Structured blocks are validated
before serialization. Public reads explicitly require `state=published`, locale, and slug. Draft
preview must require an authenticated editor and a hashed, expiring preview token; never place raw
preview tokens in rows or logs.

Publishing creates an audit entry and revision, sets the publication time, and revalidates the
affected locale route. External publish hooks must authenticate with `NEXT_REVALIDATION_SECRET` and
compare it in constant time. Static essential public content remains the outage fallback.

## Intake and file privacy

The existing public forms still use the mock adapter until the persistence prompt. The secure
boundary already validates shared schemas, normalizes email/phone/URL values, checks honeypots,
accepts a rate-limiter implementation, and claims an HMAC blind-index idempotency key before
persistence.

Before upload, enforce both size and magic-byte signature checks. The free plan allows one bucket, so
both `APPWRITE_CMS_MEDIA_BUCKET_ID` and `APPWRITE_INTAKE_FILES_BUCKET_ID` point to `cms_media`. The
shared bucket has File Security, no bucket-wide permissions, a 10 MB ceiling, native encryption,
antivirus and restricted extensions. CMS editor, published-public, reviewer and administrator access
must be assigned per file. The application wraps validated intake bytes in a versioned AES-256-GCM
binary envelope using the independent file key; Appwrite receives encrypted bytes and minimal
encrypted reference metadata. Native bucket encryption is defense in depth. Never produce a public
URL or Appwrite preview for applicant files. An authenticated reviewer/admin server endpoint decrypts
only after role authorization. Store consent timestamp, policy version, locale and workflow state;
do not log payloads. Applicant-facing projections exclude assignment and internal notes.

## Rotation and bootstrap-key deletion

Rotate one responsibility at a time: create a replacement key with identical least-privilege
scopes, deploy it, verify health/integration checks, then revoke the old key. Do not log either key.
After development provisioning and drift verification, delete `umoja-bootstrap` in the Console and
remove `APPWRITE_BOOTSTRAP_API_KEY` locally and from deployment secrets. Recreate a short-lived
bootstrap key only for an approved schema operation.

Rotate application data keys independently from Appwrite API keys:

1. Generate and securely back up three new independent 32-byte keys, for example version `v2`.
2. Add the version to the server keyring while retaining every older decryption key.
3. Set `APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION=v2` for new envelopes and blind indexes.
4. Re-encrypt rows and private files in an audited, resumable migration. Recompute blind indexes
   while both lookup versions are accepted.
5. Verify counts, authenticated decryption, permissions and backups before retiring old keys.

For suspected exposure, disable affected write paths, rotate immediately, preserve evidence,
identify rows/files by visible key version, re-encrypt from a trusted environment, replace lookup
indexes and review access/audit logs. Never delete an old key until every envelope using it has been
migrated and independently verified. If a key is lost without backup, report the affected data as
unrecoverable rather than bypassing authentication.

## Staging and production

Use separate Appwrite projects, keys, buckets, and data. Never point development tests or
provisioning at staging or production. Add only verified staging, preview, and production domains as
web platforms. Run schema validation locally, provision staging with separately authorized
credentials, verify read-back and permission tests, then use an approved production change window.

Back up/export tables and storage before destructive migrations and before launch. Record the
Appwrite region, project identifier, schema revision, export time, retention, encryption, and a
restore test. Do not store exports containing applicant data in public CI artifacts.

Development, staging and production use unrelated encryption/HMAC keys and separate encrypted
backups. A future reviewed migration may move envelopes to Appwrite native encrypted columns or a
managed KMS/envelope-encryption service. It must decrypt in an authorized trusted process, write the
managed format, verify every row/file, then retire application keys. Encryption never replaces
least-privilege permissions, data minimization, retention/deletion, consent governance, monitoring or
incident response.

## Troubleshooting

- **CORS/platform error:** ensure the exact browser hostname and scheme are registered. `localhost`
  and `127.0.0.1` are distinct platforms.
- **Cookie/session missing:** verify HTTPS in production, same-origin requests, the Appwrite endpoint
  region, project ID, cookie path, and recovery/verification redirect origins.
- **Missing permission:** identify whether the request should use an ordinary user session, SSR key,
  or runtime key. Add the narrow missing role/scope; never add anonymous writes or substitute the
  bootstrap key.
- **Health unavailable:** confirm names are present without printing values, then verify endpoint,
  project selection, key scopes, required resources, and project status in that order.
- **Schema drift:** compare committed column/index definitions with development. Create an explicit
  migration for incompatible changes.

## Cloud Console steps that remain manual

- Create/select the project and verify organization ownership.
- Create standard least-privilege keys and securely distribute/rotate/revoke them.
- Confirm outbound email delivery, sender identity, verification/recovery templates, and URLs.
- Confirm password and membership policies if the project plan/API does not expose an update.
- Enroll and enforce administrator MFA through organizational procedure.
- Register real preview, staging, and production domains after those domains are known.
- Configure backups/exports, retention, billing, alerts, and incident contacts.

## Launch checklist

- [ ] Register the production domain as an Appwrite web platform.
- [ ] Verify production email-verification and password-recovery URLs end to end.
- [ ] Require and verify MFA for every production administrator.
- [ ] Rotate SSR and runtime keys immediately before launch.
- [ ] Remove/revoke the bootstrap key from every environment.
- [ ] Audit production table, row, bucket, file, team-role, and API-key permissions.
- [ ] Verify encrypted backups and a restore/decryption exercise for every active key version.
- [ ] Verify no public signup route and no anonymous intake/CMS-draft/file access.
- [ ] Confirm backups and perform a restore exercise.
- [ ] Complete 200% browser-zoom review.
- [ ] Complete physical-device testing on supported Android and iOS devices.
