# Umoja account invitations and recovery

Status: implemented application foundation; external development configuration and live inbox proof remain owner-controlled preview gates.

## Supported journeys

| Entry point | Delivery owner | Exchange | Status |
| --- | --- | --- | --- |
| Umoja operations → account invitations | Umoja transactional-email adapter (Brevo API in preview) | Random Umoja token → server digest validation → short-lived HttpOnly context → password setup | Canonical onboarding path |
| Forgot password in Umoja | Supabase Auth using configured custom SMTP | Supabase `TokenHash` → fixed server confirmation route → password reset | Canonical recovery path |
| Supabase Dashboard “Invite user” | Supabase Auth | Legacy Supabase invite exchange | Deprecated for normal Umoja onboarding; emergency development-owner use only |
| PKCE callback | Supabase Auth | Authorization code exchange at the fixed callback handler | Only for entry points that actually produce a PKCE code |

The invitation table stores an application-encrypted address, a context-bound HMAC address lookup,
and only the SHA-256 digest of a cryptographically random invitation token. The plaintext address is
decrypted only inside authorized server operations and delivery. The raw token exists only in
process memory while the email is assembled. The first GET validates it without consuming it, sets
a signed 30-minute HttpOnly context, and redirects to a token-free localized page. Acceptance is the
only consuming operation, so link scanners do not accept an account.

The Auth Admin API and PostgreSQL cannot participate in one distributed transaction. Umoja first
creates exactly the targeted Auth user, then executes the database RPC that atomically consumes the
invitation, creates any approved relational role and active membership, and writes the audit event.
If that transaction fails, the application hard-deletes only the newly created Auth user. A failure
of that compensation is logged by identifiers only and requires an operator cleanup review.

## Application environment

Keep all values in ignored local configuration or a deployment secret manager:

```dotenv
APP_URL=http://127.0.0.1:3000

UMOJA_EMAIL_PROVIDER=brevo
UMOJA_EMAIL_FROM=verified-sender@example.org
UMOJA_EMAIL_FROM_NAME=Umoja
BREVO_API_KEY=use-the-Brevo-secret-manager-value
```

`UMOJA_EMAIL_FROM` must be a sender verified in Brevo. `BREVO_API_KEY` is used only by the Next.js
server and must never have a `NEXT_PUBLIC_` prefix. Local development may use
`UMOJA_EMAIL_PROVIDER=log`; that adapter records only provider, purpose, locale, and the fact that
delivery was suppressed. It never prints the recipient, message, link, token, or provider message
identifier. Production rejects the log adapter.

The boundary is provider-neutral. A future Resend adapter can implement the same
`TransactionalEmailClient` contract with `RESEND_API_KEY` and the same verified sender. Do not put a
Resend or Brevo secret in browser configuration and do not enable two providers simultaneously.

## Brevo owner setup

1. In Brevo, create and verify the sender/address used by `UMOJA_EMAIL_FROM`. Complete domain
   authentication before preview if the owned domain is available.
2. Create a restricted Brevo API key for Umoja transactional sending and place it in the server
   secret store as `BREVO_API_KEY`. Do not paste it into chat, source control, screenshots, or CI
   logs.
3. Set the four application variables above in the preview server environment. Restart only that
   application environment through its normal release process.
4. Disable click/open tracking for one-time authentication messages. Tracking URL rewriting can
   break or disclose authentication links.
5. Send one disposable EN and one disposable FR invitation from `/{locale}/admin/invitations` and
   verify delivery, token-free landing, password setup, sign-in, intended authorization, single-use
   rejection, and exact fixture cleanup.

Brevo’s API adapter uses `POST https://api.brevo.com/v3/smtp/email` with the API key in the
server-only `api-key` header. It sends inline bilingual content; no remote template is required for
Umoja-owned invitations.

## Supabase recovery email setup

Recovery remains a Supabase Auth operation. Configure Brevo SMTP separately in the Supabase
development Dashboard under Authentication SMTP settings:

- host: `smtp-relay.brevo.com`;
- port: `587` with TLS;
- username: the Brevo SMTP login shown in the account;
- password: a Brevo SMTP key (not the application API key unless Brevo explicitly issued the same
  credential for both purposes);
- sender address/name: the same verified Umoja sender.

Set Authentication → URL Configuration:

- Site URL: the exact `APP_URL` origin. For the current Vercel preview, use
  `https://umoja-appwrite-preview.vercel.app`;
- Redirect URLs: exact
  `APP_URL/api/supabase-auth/callback?locale=en&flow=recovery` and French equivalent;
- retain the two exact verification destinations if email verification is used;
- keep the PKCE callback for the real code-producing recovery flow. Do not use wildcard origins.

Install the versioned recovery template from `supabase/templates/recovery.html`. It must construct
the application route from `{{ .ConfirmationURL }}` or preserve the code-producing `{{ .RedirectTo }}`
callback URL configured above. The application also retains a token-hash compatibility bridge for
older custom templates. The server writes the session only to secure cookies and redirects to a clean
`/{locale}/recover-password` URL. Invalid, expired, replayed, wrong-flow, and disabled-user links show
a localized restart path rather than the homepage. Recovery requests always return the same generic
response, including malformed or unknown addresses.

## First development administrator

An Auth user is not an Umoja administrator. Authorization lives in protected `user_roles` and
`membership_history` rows; user metadata and email domains are never trusted.

1. Start the app with one exact `APP_URL`; do not mix `localhost`, `127.0.0.1`, ports, or schemes.
2. Identify the intended existing administrator by immutable Auth UUID. Do not create another admin
   merely to repair a password.
3. Use recovery to establish the password. Dashboard invitations are not the normal onboarding
   tool.
4. Through an explicitly owner-authorized database operation, verify one current `admin` role row
   and one active membership row for that exact UUID. The invitation screen cannot assign Admin,
   Core, or Lead and never promotes an applicant to Core.
5. Sign in, complete the required MFA challenge to AAL2, and open `/{locale}/admin`.

If the account is active but lacks a current protected role or membership, Umoja shows “access
pending”; it does not report an incorrect password. Core/Lead progression and administrator
bootstrap remain governance/owner operations outside the invitation UI.

The invitation operation fails closed when the target already exists in Supabase Auth. It never
uses an administrator invitation as a password-reset capability. Existing and previously invited
accounts must use the recovery journey.

## Verification and rollback

Apply `20260910100000_account_invitations.sql` additively to the development project before enabling
the UI. Verify linked migration history, generated types, database lint, grants and RLS. The runtime
must show that anonymous users have no table privilege; authenticated non-admin users see no invite
rows and cannot execute issue/resend/revoke functions; an active operations admin can perform those
actions; only `service_role` can record delivery or consume an invitation.

For live proof, use disposable addresses only. Record redacted statuses and timestamps, never email
content or token-bearing URLs. Test create, delivery, resend cooldown, resend token invalidation,
revoke, expiry, acceptance, replay rejection, existing/disabled-account rejection, EN/FR locale,
pending access, and an allowed Extended assignment. Delete only the disposable Auth users and their
invitation-owned rows after database work has ended.

Preview remains blocked until the migration, Brevo sender/API configuration, Supabase custom SMTP,
and actual EN/FR inbox tests have been completed. Production remains blocked by Gate B/C and the
existing owner-controlled legal, security, residency, backup, scanning, physical-device, and
production-email decisions.

Primary implementation references: [Brevo transactional send API](https://developers.brevo.com/reference/send-transac-email),
[Supabase Auth email templates](https://supabase.com/docs/guides/auth/auth-email-templates), and
[Supabase redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
