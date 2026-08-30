# Codex Kickstart Playbook

This playbook turns the Umoja blueprint into small, reviewable, independently buildable stages. Use one prompt per Codex task. Let Codex finish validation and every commit explicitly requested by that prompt before starting the next task. The sequence contains thirteen primary implementation stages, including a dedicated CMS slice so authorized Umoja editors can update the public site without code changes, plus an optional backend migration checkpoint after Prompt 11.

Official OpenAI guidance recommends outcome-focused prompts with the relevant constraints, evidence, success criteria, and expected output. It also recommends avoiding repeated instructions. This repository therefore keeps durable rules in `AGENTS.md`; the prompts below focus only on the outcome of each slice.

## Before prompt 1

Ensure the planning package is committed and the working tree is clean:

```bash
git add README.md AGENTS.md docs public/brand
git commit -m "docs: establish Umoja product and brand foundation"
```

If the original planning files are already committed, commit only `AGENTS.md` and this playbook:

```bash
git add AGENTS.md README.md docs/codex-kickstart-playbook.md
git commit -m "docs: add Codex build playbook"
```

Create a working branch:

```bash
git switch -c feat/platform-foundation
```

## Mandatory responsive acceptance contract

Every prompt that creates or changes an interface inherits the responsive contract in `AGENTS.md`. Codex must treat these as acceptance criteria, not optional polish:

- Fluid behavior from 320px through 1920px and a 2560px wide-layout sanity check.
- Automated widths: 320, 360, 390, 768, 1024, 1280, 1440, and 1920px.
- Relevant portrait/landscape pairs, including phone and tablet layouts where behavior changes.
- Real-browser verification at 200% zoom; `deviceScaleFactor` is not accepted as a substitute.
- No unintended page-level horizontal scrolling.
- Accessible mobile navigation and touch targets of at least 44×44 CSS pixels.
- Responsive forms, dialogs, dashboards, tables, module trees, CMS editors, action bars, and overlays.
- Adaptive tables or clearly labelled, focusable, keyboard-operable controlled scrolling with understandable row/column context.
- Stress fixtures for long English/French text, long names, unbroken strings, translated controls, and validation messages without clipping.
- Responsive loading, empty, error, validation, stale, offline where supported, and permission-denied states.
- Playwright screenshot coverage for representative public, authentication, workspace, admin, and CMS routes.
- A documented human launch gate on physical Android and iOS devices; emulation alone cannot mark this gate complete.

For each UI commit, Codex must list the exact viewport/orientation/zoom checks completed and link or identify screenshot artifacts. If a required real-browser or physical-device check cannot be performed in the current environment, Codex must report it as an unverified release blocker rather than claiming it passed.

## Prompt 1 — Scaffold the workspace

Target commit: `chore: scaffold Next.js workspace`

```text
Read AGENTS.md, docs/product-blueprint.md, and docs/brand-system.md. Scaffold the Umoja platform as a pnpm workspace without changing the planning documents.

Create apps/web as the single deployable Next.js App Router application using TypeScript strict mode. Add packages/ui, packages/domain, packages/validation, packages/i18n, packages/appwrite, and packages/config with minimal package manifests and clear public exports. Move or copy the existing brand assets into the web app's public/brand path while preserving the root documentation links. Add root workspace scripts for dev, build, lint, typecheck, and test. Add appropriate gitignore and environment-example files with placeholder names only.

Render a minimal branded placeholder page proving that the workspace and SVG assets resolve. Make the root shell fluid across the mandatory responsive contract so later pages inherit safe width, spacing, overflow, and media defaults. Avoid Appwrite integration, authentication, and feature implementation in this commit. Use maintained stable dependencies compatible with each other.

Acceptance: a clean install works; lint, typecheck, tests if configured, and production build pass; no secret values exist; README contains exact local setup commands. If all checks pass, create exactly one commit named "chore: scaffold Next.js workspace" and report the checks and any assumptions.
```

## Prompt 2 — Establish automated quality checks

Target commit: `chore: add quality gates and CI`

```text
Add the minimum reliable quality foundation for the existing Umoja workspace.

Configure consistent formatting, linting, strict TypeScript checks, Vitest for unit tests, React Testing Library for components, and Playwright for browser tests. Create reusable Playwright viewport definitions for 320, 360, 390, 768, 1024, 1280, 1440, and 1920px, plus a 2560px sanity project or targeted check and relevant phone/tablet landscape variants. Add helpers that fail on unintended page-level horizontal overflow and capture deterministic screenshots. Add one meaningful unit test and responsive smoke coverage for the placeholder page. Add a GitHub Actions workflow that installs with the lockfile and runs lint, typecheck, unit tests, responsive browser tests, and the production build. Cache dependencies where appropriate without hiding failures.

Do not add application features or perform unrelated refactors. Keep scripts runnable from the repository root and document the commands developers should use before opening a pull request.

Acceptance: every local quality command passes; CI exercises the required automated width matrix without confusing `deviceScaleFactor` with browser zoom; overflow failures and screenshot diffs fail CI; the documented 200% real-browser zoom and physical-device checks remain explicit manual launch gates. If all checks pass, create exactly one commit named "chore: add quality gates and CI" and report evidence.
```

## Prompt 3 — Implement the design foundation

Target commit: `feat: implement Umoja design system foundation`

```text
Implement the Umoja design foundation from docs/brand-system.md in packages/ui and apps/web.

Create CSS design tokens for the approved colours, spacing, radii, fluid typography, content widths, and focus states. Self-host Manrope and Noto Sans through the framework's font support. Build accessible Button, LinkButton, Container, Section, Card, Badge, Logo, and VisuallyHidden primitives with documented variants. Controls intended for touch must meet the 44×44 CSS-pixel contract. Add a development-only /design-system page showing each token and component on light and dark surfaces, including long English/French, long-name, unbroken-string, loading, empty, error, and validation stress fixtures.

Preserve the SVG logo artwork. Do not invent new brand colours or add a general-purpose UI framework. Verify the documented contrast restrictions, keyboard focus, reduced motion, and mobile rendering.

Acceptance: components are typed and reusable; component tests cover variants and accessible names; /design-system passes the mandatory viewport matrix, relevant orientations, overflow checks, long-content fixtures, 200% real-browser zoom review, and touch-target review; lint, typecheck, tests, and build pass. Create exactly one commit named "feat: implement Umoja design system foundation".
```

## Prompt 4 — Add bilingual routing and the public shell

Target commit: `feat: add bilingual public site shell`

```text
Add first-class English and French support to the Umoja web app using a maintained App Router-compatible internationalization library.

Implement locale-prefixed routes, English as the default experience, a visible language switcher that preserves the current page where possible, translated metadata, and a missing-translation failure strategy suitable for development. Build the responsive public header, mobile navigation, skip link, and footer using the Umoja design system. Mobile navigation must remain keyboard accessible, trap/restore focus appropriately when modal, expose 44×44 touch targets, and work without clipping at 200% zoom and in phone landscape. Navigation must include Services, Work, Talent, AfricIT, About, Start a project, and Join.

Create equivalent English and French placeholder routes for every navigation item. Do not machine-translate legal claims or invent organization metrics. Persist locale preference without blocking users who reject cookies.

Acceptance: both locales build statically where appropriate; navigation and language switching work with keyboard and touch; no untranslated keys appear; long translated labels do not clip; browser and screenshot tests cover locale switching and navigation across the mandatory viewport matrix and relevant orientations; 200% zoom is reviewed; no page-level overflow exists. Run all checks and create exactly one commit named "feat: add bilingual public site shell".
```

## Prompt 5 — Build the public homepage

Target commit: `feat: build Umoja public homepage`

```text
Build the bilingual Umoja homepage from section 6 of docs/product-blueprint.md and the approved brand system.

Implement the hero, trust statement, four-step operating model, capability areas, selected-work placeholder state, network model, talent placeholder state, AfricIT feature, manifesto excerpt, and final split call to action. Write concise English and French copy grounded only in the blueprint. Do not display invented numbers, fake testimonials, fake client logos, or unverified project outcomes. Use tasteful CSS-based modular graphics and the existing SVG brand assets rather than stock imagery.

The result should feel like a credible pan-African technology institution, not a generic marketplace template. Keep the page fast, accessible, fluid across the mandatory responsive contract, and legible on modest mobile devices. Stress-test long English/French headings, cards, calls to action, loading states, and empty content without clipping or unintended horizontal scrolling. Use Server Components unless interaction truly requires otherwise.

Acceptance: all calls to action resolve; heading order and landmarks are correct; Playwright screenshots cover the homepage at every required width and relevant orientation; 200% zoom, touch targets, long-content fixtures, and wide-screen behavior are reviewed; no serious accessibility violation or unintended overflow remains; tests and build pass. Create exactly one commit named "feat: build Umoja public homepage".
```

## Prompt 6 — Build the public content routes

Target commit: `feat: add public services and organization pages`

```text
Build the first complete bilingual public content routes defined in docs/product-blueprint.md: Services and its five categories, Work index and case-study detail template, Talent index and public-profile template, Organizations, AfricIT, About, Model, Governance, and Manifesto.

Use typed local seed content so the UI can later switch to Appwrite without page rewrites. Seed only clearly labelled illustrative content; do not publish names, repositories, client outcomes, metrics, or profiles from the planning notes. Include deliberate empty states explaining that verified work and opt-in profiles will appear after approval. Add route metadata, breadcrumbs where useful, and not-found handling.

Acceptance: every route exists in English and French; content schemas prevent private profile fields from entering public page props; representative content routes pass the mandatory viewport and screenshot matrix with long bilingual content, empty/loading/error states, 200% zoom review, and no unintended overflow; route and schema tests pass; full checks pass. Create exactly one commit named "feat: add public services and organization pages".
```

## Prompt 7 — Build validated intake journeys

Target commit: `feat: add project and talent intake journeys`

```text
Build bilingual multi-step interfaces for /start-a-project, /join, and /contact using shared Zod schemas and accessible form components.

Project intake should collect contact, organization, need, service areas, budget band, desired timing, attachments metadata, and consent. Talent intake should collect public/preferred name, private contact, country/timezone, skill areas, experience, portfolio metadata, availability, languages, visibility consent, and data-processing consent. Make public-profile consent explicitly optional and separate from application consent. Add review steps, field-level errors, progress indication, back navigation, and clear loading, submission-success, duplicate, network-error, and validation states. Forms, date/select controls, upload controls, review summaries, dialogs, and sticky actions must remain usable across the responsive contract, phone landscape, 200% zoom, on-screen keyboards, and long French validation messages.

For this commit, submit through a typed in-memory/mock server adapter and mark it clearly; do not pretend data is persisted. Do not collect legal identity documents yet.

Acceptance: schemas are shared server/client boundaries; keyboard and screen-reader flows work; tests cover validation, consent, back navigation, successful submission, and responsive state behavior; Playwright screenshots cover representative form steps and states at every required width; no control or error is clipped or hidden; checks pass. Create exactly one commit named "feat: add project and talent intake journeys".
```

## Prompt 8 — Add the Appwrite foundation

Primary target commit: `feat: add Appwrite server foundation` (use additional focused provisioning/security commits only when required)

```text
Implement and provision the Appwrite foundation described in docs/product-blueprint.md for the development project only. Read docs/appwrite-runbook.md and the existing Appwrite configuration before acting. Never modify staging or production, print secrets, commit .env.local, or weaken permissions to satisfy the Appwrite Cloud free plan.

Build typed, redacted environment validation; singleton browser, per-request session, SSR, runtime-admin, and temporary bootstrap clients; invite-only authentication helpers; server-side role guards; repository interfaces; safe error mapping; health, validation, drift, integration, seed, and idempotent provisioning commands. Keep every privileged client server-only and verify that no server secret name or value reaches the client bundle. Retain a fake repository for tests and local UI work when Appwrite is unavailable.

Provision the stable development resources:

- Database `umoja`.
- Team `umoja-operations` with the role vocabulary `admin`, `cms-editor`, `reviewer`, `core`, `extended`, and `project-manager`.
- Tables `cms_pages`, `cms_revisions`, `project_intakes`, `talent_intakes`, and `audit_logs`, with row security, deny-by-default permissions, typed columns, and bounded indexes.
- One free-plan Storage bucket, `cms_media`, with bucket-wide permissions empty, File Security enabled, native bucket encryption enabled where available, and per-file permissions. Set both `APPWRITE_CMS_MEDIA_BUCKET_ID` and the local non-secret alias `APPWRITE_INTAKE_FILES_BUCKET_ID` to `cms_media`. This shared-bucket arrangement is the explicit free-plan development exception to the blueprint's target of separate buckets by sensitivity; do not create a second bucket unless the plan and documented architecture change.

Appwrite encrypted database columns require a paid plan, so do not mark database columns as natively encrypted. Classify data before storage: published CMS fields are public; statuses, IDs, consent metadata, reviewer IDs, timestamps, key versions, counts, and approved categories are operational; applicant identity/contact details, organization details, narratives, budgets, timing, location, portfolio, availability, attachment references, and internal notes are sensitive. Encrypt sensitive values in the server before Appwrite receives them using versioned AES-256-GCM envelopes with independent 32-byte data and file keys, random IVs, authentication tags, contextual authenticated data, and key-version support. Use a separate HMAC-SHA-256 lookup key for `emailLookup` and `idempotencyKeyHash`; never index ciphertext or use an ordinary unsalted hash. Audit rows contain identifiers, actions, and non-reversible digests rather than duplicated personal data.

Require and document `APPWRITE_DATA_ENCRYPTION_KEY_V1`, `APPWRITE_FILE_ENCRYPTION_KEY_V1`, `APPWRITE_LOOKUP_HMAC_KEY_V1`, and `APPWRITE_ACTIVE_ENCRYPTION_KEY_VERSION=v1` as server-only secrets. Add no insecure fallback keys. Decryption occurs only after server-side authentication and authorization. Private files must also use application AES-256-GCM before upload, even when native bucket encryption is enabled; serve them only through authorized server download/decryption paths and never through public URLs or previews.

Seed only bilingual English/French homepage drafts. Public CMS queries must return published rows only. Anonymous reads of CMS drafts, intake rows, audit rows, and files must return zero results. Keep the project and talent forms on their mock adapter in this stage.

Provision additively and resumably: read existing resources, preserve compatible partial resources, wait for asynchronous columns before dependent indexes, and never delete or recreate data to recover from a failed run. Use separate least-privilege SSR and runtime keys and a temporary bootstrap key. After provisioning, run validation, drift, health, integration, read-back verification, and seed verification. Delete the bootstrap key only after every provisioning check passes; recreate a short-lived key for future approved schema changes.

Acceptance: all five tables, their configured columns/indexes, the Team, and the shared bucket are read back successfully; drift is zero; health and integration checks pass; anonymous private visibility is zero; published-only CMS behavior is proven; encryption, tamper rejection, key separation/versioning, blind indexes, server/client separation, permissions, and resumable provisioning have deterministic tests; environment errors are actionable and redacted; setup, free-plan constraints, key backup/rotation, shared-bucket rules, and bootstrap-key removal are documented; formatter, lint, strict typecheck, tests, and production build pass. Create the target commit if the work remains one independently buildable change; if SDK compatibility or provisioning corrections are required, use additional focused Conventional Commits and report every hash.
```

Current development baseline after the completed Prompt 8: `umoja-development` is provisioned in `syd`; the resources above have no drift; both homepage seeds remain drafts; the operations Team has no memberships; and the bootstrap key can be removed. Before private-file persistence, set the ignored local alias `APPWRITE_INTAKE_FILES_BUCKET_ID=cms_media`. The separate-bucket model remains the target for a future plan or hosting architecture that supports it.

## Prompt 9 — Add authentication and workspace shells

Target commit: `feat: add secure role-aware workspace access`

```text
Extend the existing Appwrite invite-only authentication foundation into secure shells for /workspace and /admin. Inspect and reuse the established SSR/session clients, protected-route helpers, verification, recovery, invite acceptance, and server role guards; do not create a second auth stack or expose the generic Appwrite public signup flow.

Use the provisioned `umoja-operations` Team and its exact current role vocabulary: `admin`, `cms-editor`, `reviewer`, `core`, `extended`, and `project-manager`. Treat an authenticated applicant as the owner of their application/profile records, not automatically as a Team member. Map `admin` only to the currently approved operations capabilities. Do not silently treat it as final governance authority: until a distinct governance policy/role is approved, governance-only actions and publication of legal/governance claims remain blocked.

Add sign-in, sign-out, session refresh, verification, recovery, protected routing, account-state handling, role-aware navigation, and accessible workspace/admin shells. Enforce access in server-side policy functions, per-record Appwrite permissions, active account state, and project membership where applicable; hiding navigation is not authorization. A user removed from the Team, disabled, or holding an expired/revoked session must lose effective access.

Add a policy matrix covering anonymous visitors, applicant record owners, every provisioned Team role, missing membership, expired sessions, disabled accounts, and denied governance-only actions. Keep privileged UX MFA-ready and document the operational launch steps: invite at least one initial administrator, assign the minimum role, require and verify MFA, and retain a second recovery owner. Do not invent an administrator email or membership in tests that touch Cloud.

Sign-in, account-state, recovery/error, workspace shell, admin shell, navigation, dialogs, loading, offline where supported, and permission-denied states must satisfy the responsive contract and remain operable at 200% browser zoom.

Acceptance: direct URL access is protected; session cookies use secure production settings; public signup remains unavailable; Team and account changes invalidate effective access; governance-only actions fail closed; policy and browser auth tests pass; representative authentication, workspace, and admin screenshots cover the viewport matrix and required states; mobile navigation, touch targets, orientation, zoom, long bilingual content, and overflow checks pass; build passes. Create exactly one commit named "feat: add secure role-aware workspace access".
```

## Prompt 10 — Add bilingual public content management

Target commit: `feat: add bilingual public content management`

```text
Implement the CMS UI and public-site integration on top of the provisioned `cms_pages`, `cms_revisions`, `audit_logs`, and shared `cms_media` bucket so authorized editors can change public content without editing code or requiring a full application redeployment. Reuse the existing content repositories, published-only query, revision operations, static fallback, audit helpers, and targeted revalidation boundary; do not replace them with a parallel CMS model.

Build inside the refined authenticated shell from Prompt 9. Reuse its branded sidebar, compact account menu, role-aware navigation, page-heading pattern, responsive drawer, spacing, typography, cards, notices, and status treatments. Do not create a second admin layout, expose the editor's full email persistently, return to the scaffold-like Prompt 9 layout, or present technical Appwrite/session controls as primary UI. Inspect the current shell in a real browser before designing CMS screens.

Migrate the typed local content repository behind a shared content interface and provide Appwrite and fake/test implementations. Support structured content for homepage sections, service pages, case studies, public talent profiles, organizations, AfricIT resources and workshops, manifesto/about pages, navigation labels where safe, calls to action, and SEO/social metadata. Keep layout, components, brand tokens, authorization rules, and executable behavior code-controlled.

Build /admin/content with list, create, edit, preview, submit-for-review, publish, unpublish, archive, restore, and revision-history flows. Model English and French variants explicitly using statuses supported by the provisioned schema; perform an additive schema migration before introducing any new status value. Publishing must be an atomic versioned action: visitors always receive the last complete published version, never a partial draft. `cms-editor` may draft and preview; an explicitly authorized publisher may approve and publish ordinary content. Until a distinct governance authorization is approved, legal pages and governance claims must remain code-controlled or publication-blocked rather than being publishable by `admin` or `cms-editor`. Enforce every permission server-side. Lists/tables, bilingual editors, media pickers, preview panes, revision comparisons, dialogs, toolbars, and long content must adapt across the responsive contract; tables must become readable small-screen views or use labelled accessible scrolling.

Treat the CMS as a working editorial product, not a collection of explanatory cards. The content index needs a clear primary action, useful search/filter controls, visible locale and workflow state, last-updated context, and an honest empty state. The editor needs explicit English/French structure, field grouping, validation, save state, unsaved-change protection, concise workflow actions, and a preview that accurately uses public components without exposing drafts. Use a balanced desktop editing layout and a single-column mobile flow; sticky action areas must not cover fields or validation. Revision history and comparisons must prioritize who changed what, when, locale, state, and change summary. Every visible button must work for the current role or be omitted; do not add decorative, disabled, or future actions merely to make the interface look populated.

Add a protected media library inside the existing shared `cms_media` bucket with metadata, alt text in both languages, ownership, usage references, consent state, file type/size limits, and replacement without breaking published references. Do not create a second bucket. Use per-file permissions to distinguish intentionally public published media from private drafts and encrypted intake files. Never broaden bucket-wide permissions. Sanitize rich text with a strict allowlist; do not permit arbitrary HTML, scripts, embeds, CSS, or executable uploads. Preserve audit events and immutable revision snapshots containing actor, time, locale, change summary, and source revision. Support rollback by creating a new revision from an old one rather than rewriting history.

Public pages should fetch published content with safe caching and targeted revalidation after publishing so updates appear promptly without a full deployment. Keep `NEXT_REVALIDATION_SECRET` server-only, validate it safely, and reject unauthorized revalidation requests. Define failure behavior: if Appwrite is temporarily unavailable, continue serving the most recently cached published content where safe; never expose drafts or private fields. Case studies and talent profiles require recorded publication consent before entering review. Legal pages cannot be edited or published by ordinary content editors.

Before accepting screenshots, inspect the CMS manually in a real browser in English and French at representative mobile, tablet, desktop, wide, and 200% zoom states. Review information hierarchy, line length, working density, empty space, repeated warnings, action priority, menu/drawer behavior, long content, and whether the interface clearly communicates the next editorial task. Do not automatically approve screenshot-baseline changes. Use synthetic content and redacted identities in committed screenshots.

Acceptance: an authorized editor can change English and French homepage copy, preview it privately, submit it, and an explicitly authorized publisher can publish ordinary content without a code change; legal/governance publication fails closed; anonymous visitors see only the complete published revision; private files remain unreadable after public media is published; tests cover role separation, locale parity, consent gates, sanitization, atomic publishing, rollback, authenticated cache revalidation, Appwrite failure, draft isolation, and shared-bucket permission isolation; the CMS inherits the refined authenticated shell and passes a documented manual UX review without scaffold-like layouts, fake controls, exposed private identity, excessive repeated notices, unclear next actions, or arbitrary empty space; CMS list, editor, media, preview, revision, loading, empty, error, validation, and permission states pass the required viewport screenshots, orientations, long-content fixtures, 200% zoom, touch targets, table behavior, and overflow checks; lint, typecheck, tests, and build pass. Create exactly one commit named "feat: add bilingual public content management" when the provisioned schema already supports the workflow. If an additive status/schema migration is genuinely required, commit and provision that infrastructure separately before the feature commit, verify zero drift, and report both hashes.
```

## Prompt 11 — Persist intake and add a protected review queue

Target commit: `feat: persist intake submissions and admin review`

```text
Connect the existing project and talent journeys to the provisioned `project_intakes` and `talent_intakes` repositories and build the first protected admin intake queue using the existing authentication, authorization, encryption, blind-index, file, rate-limit, idempotency, and audit foundations. Inspect the contact schema before changing /contact: persist it only if the current project-intake model explicitly supports a contact intake type; otherwise keep its honest mock behavior and propose an additive schema migration instead of overloading unrelated fields.

Build /admin/intake inside the refined authenticated shell and the admin information architecture established by the Prompt 9 UI refinement. Reuse its sidebar, mobile drawer, account menu, page headings, action hierarchy, notices, cards, tables, typography, spacing, and privacy treatment. Do not create a parallel admin shell or regress to a sparse collection of explanatory cards.

Submissions must be server-validated, rate-limited, assigned opaque IDs, timestamped, and recorded with consent versions and a digest-only audit event. Encrypt every classified sensitive payload and internal note with the existing versioned AES-256-GCM service before Appwrite receives it. Generate `emailLookup` and `idempotencyKeyHash` with the independent HMAC service. Never query ciphertext. Decrypt only after server-side role authorization.

Set the ignored/deployment alias `APPWRITE_INTAKE_FILES_BUCKET_ID=cms_media`. Upload only through the existing private-file service: validate signature/type/size, encrypt bytes with the independent file key, use per-file permissions in the shared bucket, and return files only through an authorized server download/decryption path. Do not accept identity documents, expose public URLs/previews, or broaden bucket permissions.

Build /admin/intake with list, detail, status, ownership, notes, attachment access, and activity history. `admin` and `reviewer` may receive the minimum approved review permissions; other Team roles, applicants, and disabled users are denied unless a later explicit policy grants access. Governance-only decisions remain blocked. The queue table, filters, details, notes, dialogs, status actions, long names, and every data state must satisfy the responsive contract; use an adaptive small-screen view or a labelled accessible table scroll region.

Design the queue around the reviewer's actual sequence: understand what needs attention, filter or search, open a submission, inspect only necessary information, assign ownership, change status, add an internal note, review safe attachments, and return to the same queue context. Desktop may use a well-labelled table or master/detail pattern; small screens must use readable summary cards or a controlled focusable table region and a full-page detail view. Preserve filter, sort, pagination, and return position where practical. Use clear status text plus icons, one obvious primary action at a time, safe confirmation for consequential changes, and non-blocking feedback. Do not add fake counts, charts, activity, bulk actions, or buttons that do not work.

Apply privacy by presentation as well as by authorization. Queue summaries should reveal only the minimum fields needed for triage; show full decrypted contact/narrative data only in the authorized detail context. Keep private email out of persistent shell chrome and mask or replace personal values in screenshot fixtures. Prevent sensitive data from appearing in page titles, breadcrumbs, URLs, client caches, browser storage, toast messages, copied diagnostics, or committed snapshots. Attachment controls must communicate file type, size, scan/validation state, and authorization without exposing storage identifiers.

Never render plaintext private submission data into public routes, logs, analytics, audit payloads, cache keys, error messages, screenshots, or test artifacts. Add duplicate-submission, idempotency, abuse-resistant behavior, retention hooks, and safe retry behavior that cannot create duplicate encrypted records or orphan files.

Inspect the queue and detail flow manually in a real browser before approving screenshots. Review English/French hierarchy, task clarity, density, line length, repeated warnings, empty space, focus movement, filter usability, table/card adaptation, dialogs, long decrypted values, loading/empty/error/permission states, and real 200% zoom. Screenshot updates require visual inspection and synthetic/redacted records; do not blanket-update baselines.

Acceptance: configured-Appwrite integration tests prove validation, encryption at the repository boundary, tamper failure, blind-index lookup, idempotency, public/private separation, shared-bucket file isolation, authorized download, and digest-only audits; anonymous, applicant, unrelated Team role, missing-membership, and disabled-account access is denied; fake-repository and configured-Appwrite behavior is documented; the review flow inherits the refined shell and passes a documented manual UX/privacy review without scaffold-like pages, fake controls, unnecessary PII, unclear status/actions, repeated policy prose, or arbitrary empty space; admin queue/detail screenshots cover the required widths and states with synthetic/redacted data; orientation, 200% zoom, touch targets, table behavior, long bilingual content, and overflow checks pass; drift and health remain green. Create exactly one commit named "feat: persist intake submissions and admin review".
```

## Backend decision checkpoint after Prompt 11

Do not begin Prompt 12 until `docs/adr/0001-evaluate-supabase-migration.md` has been reviewed. The claim that Appwrite Free disables every upload is incorrect: current official pricing lists 2 GB Storage and a 50 MB file limit, while the Free billing page lists disabled uploads as the consequence of reaching the Storage limit. Verify actual usage and a real encrypted upload before declaring Appwrite technically blocked.

Supabase may still be the better long-term choice for Umoja's relational workspace. If Umoja authorizes the evaluation, run the migration prompt in `docs/supabase-migration-runbook.md` on a dedicated `spike/supabase-migration` branch. Keep Appwrite Cloud unchanged and do not build a permanent hybrid. Accept Supabase only after Auth, RLS, Storage, CMS, intake, encryption, responsive UI, and rollback parity pass. Otherwise recreate a short-lived Appwrite bootstrap key and continue the Appwrite path.

At the end of this checkpoint the repository must name exactly one active runtime backend. Prompt 12 and Prompt 13 must follow that accepted path; they must not require or write to both providers.

## Prompt 12 — Deliver the first workspace vertical slice

Target commits: `chore(supabase): add profile and availability schema`, then `feat: add profiles and availability workspace`. Supabase is the accepted canonical development runtime; Appwrite remains rollback/reconciliation evidence only.

```text
Build the first useful authenticated Umoja workspace slice: applicant profile completion, skills, portfolio evidence metadata, languages, weekly availability, next available date, and application status.

Build every screen inside the refined authenticated workspace shell from Prompt 9. Reuse its navigation, mobile drawer, account menu, page headings, cards, notices, controls, spacing, typography, and privacy patterns. Do not create a second workspace layout, expose the applicant's full email persistently, or reduce the experience to generic dashboard cards containing explanatory prose.

The existing Supabase foundation already contains dedicated `profiles`, `private_profile_details`, `skills`, `profile_skills`, `portfolio_items`, `availability_snapshots`, and `membership_history` tables. Do not recreate them or overload `talent_intakes` as a long-lived profile store. Extend the accepted schema additively with the smallest domain-correct changes aligned with section 9 of docs/product-blueprint.md. Keep public profile fields structurally separate from private profile/contact details and model skills, languages, portfolio metadata, availability, and membership/application history without one unvalidated JSON blob.

If Appwrite remains the accepted backend, update its version-controlled configuration and drift checks, provision with a newly created short-lived bootstrap key, and preserve the existing row-security/shared-bucket architecture. Check actual Storage usage and table/index quotas with a real API response; do not repeat the disproven blanket claim that Free disables all uploads.

For Supabase, create additive timestamped SQL migrations only; never run Docker, a local Supabase stack, pgTAP, `supabase db reset --linked`, or any linked reset. Preview and apply the reviewed migration remotely, read back migration history, lint the linked database, regenerate TypeScript types, and verify drift. Reuse the accepted Supabase Auth role model and separate private Storage buckets. Do not create Appwrite schema/adapters, retain Appwrite runtime calls, or add a provider-switching UI path.

For either backend, check current free-plan database, Storage, pausing, and backup limits before provisioning. If the plan blocks the domain-correct model, stop and report the exact request/limit evidence rather than collapsing privacy boundaries.

Apply the established application security model independently of the provider: leave approved public/operational fields queryable; encrypt private contact, constraints, internal notes, and other sensitive values with versioned AES-256-GCM; use separate blind indexes only for justified exact-match lookups; and keep audit events digest-only. Applicants use record ownership and active-account checks rather than automatic operations membership. `admin` may review eligible fields, while all sensitive changes generate audit events. On Appwrite, portfolio files use the existing shared `cms_media` bucket alias and strict per-file permissions. On Supabase, use the accepted private applicant/portfolio bucket and RLS. In both cases, keep application file encryption and authorized server delivery; never create a public private-file URL.

Availability must expire to unknown after a documented period rather than remaining permanently current. Public-profile visibility remains opt-in and revocable; no private contact, assessment, availability constraint, HR, or file data may enter a public serializer. Add honest empty, loading, error, validation, stale, offline where supported, and permission-denied states. Profile forms, availability controls, portfolio tables/cards, dashboards, dialogs, action bars, and future-compatible module-tree containers must satisfy the responsive contract without hiding context or actions. Do not add opaque talent scoring or Core promotion automation.

Design this as a guided contributor journey rather than a back-office form dump. The overview should identify the next real task using actual profile/application state without fake metrics or an opaque completion score. Break profile editing into understandable sections with clear public/private explanations, concise save state, unsaved-change protection, field-level validation, and one primary action per context. Skills and languages need efficient add/edit/remove interactions; portfolio evidence needs honest upload/metadata status; availability needs a legible weekly control, next-available date, expiry explanation, stale-state recovery, and timezone-aware wording. Application status must explain the current state and allowed next action without revealing internal assessments or promising acceptance.

On desktop, use the available workspace width with intentional form line lengths, supportive secondary panels only when they contain useful state, and balanced vertical rhythm. On mobile, use a single-column sequence, reachable actions above the on-screen keyboard, 44x44px controls, and no side-by-side fields that become cramped. Do not fill unused space with decorative cards, duplicate security/governance notices, fake activity, or unavailable modules. Every visible action must function for the current role or be omitted.

Before accepting screenshots, manually inspect the complete journey in a real browser in English and French using synthetic long names, multiple skills/languages, empty and populated portfolios, fresh/stale/unknown availability, validation errors, slow save, permission denial, and 200% zoom. Evaluate next-step clarity, information density, public/private comprehension, focus order, mobile keyboard behavior, error recovery, line length, empty space, and consistency with the authenticated shell. Do not blanket-update screenshot baselines.

Acceptance: exactly one runtime backend is active; the additive schema provisions from version control with read-back or migration-history verification and no drift; temporary provisioning credentials are removed after success; owner/admin authorization is enforced both server-side and in Appwrite permissions or Supabase RLS; sensitive fields/files are encrypted before the backend receives them; stale availability and consent withdrawal have deterministic tests; public serializers cannot emit private fields; the contributor journey inherits the refined shell and passes a documented manual UX/privacy review without scaffold-like pages, fake scores/actions, exposed private identity, cramped form layouts, repeated notices, or arbitrary empty space; representative profile, availability, dashboard, and state screenshots cover the required widths and relevant orientations with synthetic data; long names, 200% zoom, touch targets, adaptive table/card behavior, mobile keyboard behavior, and overflow checks pass; accessibility, integration, backend-policy, health, and build checks pass. Keep the feature implementation commit separate from any required infrastructure commit and report both hashes.
```

## Prompt 13 — Harden and document the first release

Target commit: `chore: harden platform foundation for preview`

```text
Prepare the current Umoja platform foundation for a private preview without deploying or modifying external services.

Audit the implementation against AGENTS.md, the mandatory responsive acceptance contract, and the MVP boundaries in docs/product-blueprint.md. Fix material accessibility, privacy, authorization, responsive-layout, performance, metadata, error-handling, and test gaps found within the current feature scope. Run a representative-route regression matrix spanning public, authentication, workspace, admin, and CMS surfaces at 320, 360, 390, 768, 1024, 1280, 1440, and 1920px plus the 2560px sanity check, relevant portrait/landscape pairs, long English/French fixtures, all required UI states, and real-browser 200% zoom. Verify no unintended page-level overflow and confirm touch targets and adaptive/labelled table behavior. Add security headers, a content-security-policy appropriate to the actual dependencies, robots behavior for preview environments, structured logging with private-field redaction, and an operational readiness checklist.

Perform a product-level visual and interaction audit, not only a screenshot-diff check. Inspect every representative route manually in a real browser and reject technically passing interfaces that still look like scaffolds, debug/status demonstrations, disconnected component galleries, or generic SaaS templates. Verify that public pages use the public shell and every workspace/admin/CMS route uses the single refined authenticated shell; remove accidental parallel headers, sidebars, account controls, spacing systems, page-title patterns, and navigation behavior.

For each surface, assess: clear purpose and next action, information hierarchy, working density, line length, meaningful use of width, intentional empty space, consistent brand expression, concise notices, action priority, real versus unavailable functionality, privacy of identity data, loading and recovery behavior, keyboard/focus flow, mobile drawer/menu behavior, and English/French parity. Remove repeated governance/security prose, permanently exposed private email, oversized technical status controls, fake metrics, decorative disabled actions, and cards that contain only explanations when a more useful task-oriented pattern exists. Do not hide genuine policy or security restrictions; present each once in the context where it affects the user's decision.

Require explicit visual sign-off for representative public, sign-in, workspace overview, admin overview, CMS list/editor, intake queue/detail, profile, and availability routes before updating baselines. Compare screenshots across mobile, tablet, desktop, wide and 200% zoom as one coherent product family. Baseline changes must be reviewed individually; never use a blanket screenshot update to make tests pass. All committed authenticated screenshots and fixtures must use synthetic/redacted identities and private data.

Re-run the active backend's validation, schema-history/drift, health, integration, anonymous-access, role-policy, Storage-policy, encrypted upload/download, and client-bundle secret checks. Exactly one runtime backend may be active. If Appwrite is active, verify the shared bucket aliases, empty bucket-wide permissions, File Security, native encryption, per-file isolation, and absence of the bootstrap key. If Supabase is active, verify clean migration history and generated types, RLS plus grants on every exposed table, published-only public CMS access, private bucket policies, absence of Appwrite runtime dependencies/environment requirements, and absence of the Supabase secret/service key from browser code. In either path, verify that AES-256-GCM/HMAC keys are backed up securely, versioned, independent, absent from logs/client bundles, and covered by a tested rotation/recovery procedure. Confirm that no plaintext private data appears in public caches, screenshots, fixtures, telemetry, audit rows, or errors.

Add or update the active backend runbook covering local development, the selected development region, test data, environment variables, free-plan quotas and inactivity pausing, schema migrations, temporary provisioning credentials where applicable, encryption-key backup/rotation and key-loss consequences, data retention/export/deletion, backups and restoration testing, rollback, and a physical-device QA record for Android and iOS. If Appwrite remains active, document the shared-bucket exception and redundant localhost-platform review. If Supabase is active, document SQL migration discipline, RLS/grant testing, Auth invitation and recovery, separate public/private buckets, logical exports, and the Appwrite rollback/decommission window. In either path, invite at least one initial administrator, verify administrator MFA and recovery ownership, and do not treat a Free plan as a production SLA.

Do not add new product features, production secrets, analytics, payments, or deployment integrations. Record remaining legal and operational blockers explicitly.

Acceptance: lint, typecheck, unit/integration/browser/accessibility tests, active-backend migration/drift/health/integration/RLS-or-permission/Storage security checks, client secret scan, responsive screenshot matrix, and production build all pass; exactly one backend is active and no temporary bootstrap, Supabase secret/service, or deprecated provider credential is present in client or deployed runtime contexts where it is not required; documented manual visual review confirms a coherent branded product with task-oriented layouts and finds no scaffold-like screens, parallel shells, fake controls/metrics, exposed private identities, repeated policy prose, arbitrary empty space, unclear next actions, clipping, broken reflow, inaccessible scrolling, unreachable actions, or unintended overflow; physical testing results are recorded for at least one supported Android phone and one supported iPhone. If physical devices are unavailable, mark public launch blocked and do not claim this acceptance item passed. If no initial administrator with verified MFA exists, mark the private operations preview blocked. No high-severity dependency, migration risk, or free-plan security limitation is left unexplained. Create exactly one commit named "chore: harden platform foundation for preview" only when all automatable checks and the manual visual review pass, and report manual launch gates separately and truthfully.
```

## Commit map

| Order | Commit | Outcome |
|---:|---|---|
| 0 | `docs: establish Umoja product and brand foundation` | Product, brand, and Codex rules become the source of truth |
| 1 | `chore: scaffold Next.js workspace` | Buildable pnpm/Next.js workspace |
| 2 | `chore: add quality gates and CI` | Automated quality, viewport, overflow, and screenshot checks prevent unstable work |
| 3 | `feat: implement Umoja design system foundation` | Brand becomes reusable UI primitives |
| 4 | `feat: add bilingual public site shell` | English/French routing and navigation |
| 5 | `feat: build Umoja public homepage` | First polished public experience |
| 6 | `feat: add public services and organization pages` | Complete public information architecture |
| 7 | `feat: add project and talent intake journeys` | Tested forms before backend coupling |
| 8 | `feat: add Appwrite server foundation` plus focused provisioning fixes where necessary | Secure, provisioned free-plan backend contracts, application encryption, and shared storage configuration |
| 9 | `feat: add secure role-aware workspace access` | Server-enforced authentication/authorization |
| 10 | `feat: add bilingual public content management` | Editors can safely update the public site without code changes |
| 11 | `feat: persist intake submissions and admin review` | First end-to-end operational workflow |
| 11A (optional) | Focused commits listed in `docs/supabase-migration-runbook.md` | Reversible Supabase parity spike and explicit accept/reject decision; not a dual-backend release |
| 12 | `chore(appwrite): add profile and availability schema` or `chore(supabase): add profile and availability schema`, then `feat: add profiles and availability workspace` | Additive private profile model on the one accepted backend and first useful contributor workspace slice |
| 13 | `chore: harden platform foundation for preview` | Cross-viewport and private-preview readiness with a physical-device launch gate |

## How to run the prompts

- Use one Codex task for one prompt. Keep one commit when practical; create multiple commits only when the prompt explicitly requires independently buildable infrastructure or security corrections.
- Start the next task only after reviewing the diff and validation report.
- After Prompt 11, either continue with the accepted Appwrite architecture or run optional checkpoint 11A on a dedicated branch. Do not start Prompt 12 until the ADR records one accepted runtime backend.
- If a prompt uncovers an architectural conflict, resolve it in the documentation first, in a separate `docs:` commit.
- If checks fail because of pre-existing work, ask Codex to diagnose before authorizing unrelated fixes.
- Avoid adding “while you are there” features; put them into a later issue or prompt.
- Tag a stable preview after prompt 13, for example `preview-0.1.0`.

## Pull request structure

Use three reviewable pull requests rather than one enormous platform PR:

1. **Foundation:** commits 1–4.
2. **Public experience:** commits 5–7.
3. **Operational pilot:** commits 8–13.

Each pull request should summarize user-visible outcomes, screenshots for changed UI, test evidence, known limitations, data/privacy impact, and the next slice.

## Suggested prompt for every review task

```text
Review the current branch against AGENTS.md, docs/product-blueprint.md, and docs/brand-system.md. Focus on correctness, regressions, authorization/privacy leaks, accessibility, bilingual parity, and missing tests. Report findings in severity order with precise file and line references. Do not modify files or create a commit.
```

## After the private preview

Do not jump directly to payments or an open marketplace. The next prompt set should be based on evidence from one real pilot project and should cover opportunities, feasibility reviews, project module trees, module-scoped access, deliverables, documentation, and milestone acceptance.
