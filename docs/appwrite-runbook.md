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

Only these names may be available to browser code:

- `NEXT_PUBLIC_APPWRITE_ENDPOINT`
- `NEXT_PUBLIC_APPWRITE_PROJECT_ID`

Never expose or log the SSR, runtime, bootstrap, session, or revalidation secrets. Environment
validation returns a generic configuration error, and operational health output contains only
booleans.

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
accepts a rate-limiter implementation, and claims a hashed idempotency key before persistence.

Before upload, enforce both size and magic-byte signature checks. `intake_files` has file security,
no anonymous bucket permissions, a 10 MB ceiling, encryption and antivirus settings, and restricted
extensions. Never produce a public URL for applicant files. Store attachment IDs, consent timestamp,
policy version, locale, and workflow state; do not log payloads. Applicant-facing projections must
exclude assignment and internal notes.

## Rotation and bootstrap-key deletion

Rotate one responsibility at a time: create a replacement key with identical least-privilege
scopes, deploy it, verify health/integration checks, then revoke the old key. Do not log either key.
After development provisioning and drift verification, delete `umoja-bootstrap` in the Console and
remove `APPWRITE_BOOTSTRAP_API_KEY` locally and from deployment secrets. Recreate a short-lived
bootstrap key only for an approved schema operation.

## Staging and production

Use separate Appwrite projects, keys, buckets, and data. Never point development tests or
provisioning at staging or production. Add only verified staging, preview, and production domains as
web platforms. Run schema validation locally, provision staging with separately authorized
credentials, verify read-back and permission tests, then use an approved production change window.

Back up/export tables and storage before destructive migrations and before launch. Record the
Appwrite region, project identifier, schema revision, export time, retention, encryption, and a
restore test. Do not store exports containing applicant data in public CI artifacts.

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
- [ ] Verify no public signup route and no anonymous intake/CMS-draft/file access.
- [ ] Confirm backups and perform a restore exercise.
- [ ] Complete 200% browser-zoom review.
- [ ] Complete physical-device testing on supported Android and iOS devices.
