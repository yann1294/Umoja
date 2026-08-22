# Codex Kickstart Playbook

This playbook turns the Umoja blueprint into small, reviewable, independently buildable commits. Use one prompt per Codex task. Let Codex finish validation and the commit before starting the next task. The sequence contains thirteen implementation commits, including a dedicated CMS slice so authorized Umoja editors can update the public site without code changes.

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

## Prompt 1 — Scaffold the workspace

Target commit: `chore: scaffold Next.js workspace`

```text
Read AGENTS.md, docs/product-blueprint.md, and docs/brand-system.md. Scaffold the Umoja platform as a pnpm workspace without changing the planning documents.

Create apps/web as the single deployable Next.js App Router application using TypeScript strict mode. Add packages/ui, packages/domain, packages/validation, packages/i18n, packages/appwrite, and packages/config with minimal package manifests and clear public exports. Move or copy the existing brand assets into the web app's public/brand path while preserving the root documentation links. Add root workspace scripts for dev, build, lint, typecheck, and test. Add appropriate gitignore and environment-example files with placeholder names only.

Render a minimal branded placeholder page proving that the workspace and SVG assets resolve. Avoid Appwrite integration, authentication, and feature implementation in this commit. Use maintained stable dependencies compatible with each other.

Acceptance: a clean install works; lint, typecheck, tests if configured, and production build pass; no secret values exist; README contains exact local setup commands. If all checks pass, create exactly one commit named "chore: scaffold Next.js workspace" and report the checks and any assumptions.
```

## Prompt 2 — Establish automated quality checks

Target commit: `chore: add quality gates and CI`

```text
Add the minimum reliable quality foundation for the existing Umoja workspace.

Configure consistent formatting, linting, strict TypeScript checks, Vitest for unit tests, React Testing Library for components, and Playwright for browser tests. Add one meaningful unit test and one smoke browser test for the placeholder page. Add a GitHub Actions workflow that installs with the lockfile and runs lint, typecheck, unit tests, browser tests, and the production build. Cache dependencies where appropriate without hiding failures.

Do not add application features or perform unrelated refactors. Keep scripts runnable from the repository root and document the commands developers should use before opening a pull request.

Acceptance: every local quality command passes; the workflow uses the same commands; a failing test would fail CI. If all checks pass, create exactly one commit named "chore: add quality gates and CI" and report evidence.
```

## Prompt 3 — Implement the design foundation

Target commit: `feat: implement Umoja design system foundation`

```text
Implement the Umoja design foundation from docs/brand-system.md in packages/ui and apps/web.

Create CSS design tokens for the approved colours, spacing, radii, typography, content widths, and focus states. Self-host Manrope and Noto Sans through the framework's font support. Build accessible Button, LinkButton, Container, Section, Card, Badge, Logo, and VisuallyHidden primitives with documented variants. Add a development-only /design-system page showing each token and component on light and dark surfaces.

Preserve the SVG logo artwork. Do not invent new brand colours or add a general-purpose UI framework. Verify the documented contrast restrictions, keyboard focus, reduced motion, and mobile rendering.

Acceptance: components are typed and reusable; component tests cover variants and accessible names; /design-system is visually checked at mobile and desktop widths; lint, typecheck, tests, and build pass. Create exactly one commit named "feat: implement Umoja design system foundation".
```

## Prompt 4 — Add bilingual routing and the public shell

Target commit: `feat: add bilingual public site shell`

```text
Add first-class English and French support to the Umoja web app using a maintained App Router-compatible internationalization library.

Implement locale-prefixed routes, English as the default experience, a visible language switcher that preserves the current page where possible, translated metadata, and a missing-translation failure strategy suitable for development. Build the responsive public header, mobile navigation, skip link, and footer using the Umoja design system. Navigation must include Services, Work, Talent, AfricIT, About, Start a project, and Join.

Create equivalent English and French placeholder routes for every navigation item. Do not machine-translate legal claims or invent organization metrics. Persist locale preference without blocking users who reject cookies.

Acceptance: both locales build statically where appropriate; navigation and language switching work with keyboard and touch; no untranslated keys appear; browser tests cover locale switching and mobile navigation. Run all checks and create exactly one commit named "feat: add bilingual public site shell".
```

## Prompt 5 — Build the public homepage

Target commit: `feat: build Umoja public homepage`

```text
Build the bilingual Umoja homepage from section 6 of docs/product-blueprint.md and the approved brand system.

Implement the hero, trust statement, four-step operating model, capability areas, selected-work placeholder state, network model, talent placeholder state, AfricIT feature, manifesto excerpt, and final split call to action. Write concise English and French copy grounded only in the blueprint. Do not display invented numbers, fake testimonials, fake client logos, or unverified project outcomes. Use tasteful CSS-based modular graphics and the existing SVG brand assets rather than stock imagery.

The result should feel like a credible pan-African technology institution, not a generic marketplace template. Keep the page fast, accessible, responsive, and legible on modest mobile devices. Use Server Components unless interaction truly requires otherwise.

Acceptance: all calls to action resolve; heading order and landmarks are correct; mobile and desktop screenshots are visually reviewed; accessibility scan has no serious violations; tests and build pass. Create exactly one commit named "feat: build Umoja public homepage".
```

## Prompt 6 — Build the public content routes

Target commit: `feat: add public services and organization pages`

```text
Build the first complete bilingual public content routes defined in docs/product-blueprint.md: Services and its five categories, Work index and case-study detail template, Talent index and public-profile template, Organizations, AfricIT, About, Model, Governance, and Manifesto.

Use typed local seed content so the UI can later switch to Appwrite without page rewrites. Seed only clearly labelled illustrative content; do not publish names, repositories, client outcomes, metrics, or profiles from the planning notes. Include deliberate empty states explaining that verified work and opt-in profiles will appear after approval. Add route metadata, breadcrumbs where useful, and not-found handling.

Acceptance: every route exists in English and French; content schemas prevent private profile fields from entering public page props; layout is responsive and accessible; representative route and schema tests pass; full checks pass. Create exactly one commit named "feat: add public services and organization pages".
```

## Prompt 7 — Build validated intake journeys

Target commit: `feat: add project and talent intake journeys`

```text
Build bilingual multi-step interfaces for /start-a-project, /join, and /contact using shared Zod schemas and accessible form components.

Project intake should collect contact, organization, need, service areas, budget band, desired timing, attachments metadata, and consent. Talent intake should collect public/preferred name, private contact, country/timezone, skill areas, experience, portfolio metadata, availability, languages, visibility consent, and data-processing consent. Make public-profile consent explicitly optional and separate from application consent. Add review steps, field-level errors, progress indication, back navigation, and a clear submission-success state.

For this commit, submit through a typed in-memory/mock server adapter and mark it clearly; do not pretend data is persisted. Do not collect legal identity documents yet.

Acceptance: schemas are shared server/client boundaries; keyboard and screen-reader flows work; tests cover validation, consent, back navigation, and successful submission; checks pass. Create exactly one commit named "feat: add project and talent intake journeys".
```

## Prompt 8 — Add the Appwrite foundation

Target commit: `feat: add Appwrite server foundation`

```text
Implement the Appwrite foundation described in docs/product-blueprint.md without requiring production credentials.

In packages/appwrite, add environment validation, separate server and browser clients, session-safe helpers, typed repository interfaces, and a health check. Keep API keys server-only. Add repeatable configuration scripts or documented commands for development collections/tables and storage buckets needed by project intake, talent applications, consent records, and audit events. Define least-privilege permissions and separate public-safe fields from private applicant data.

Provide a fake repository implementation for automated tests and local UI work when Appwrite is unavailable. Add .env.example names and setup documentation, never values. Do not add open registration, payments, finance, or broad user roles yet.

Acceptance: importing browser modules cannot expose server secrets; environment errors are actionable; repository contract tests run against the fake implementation; permission assumptions are documented; all checks pass. Create exactly one commit named "feat: add Appwrite server foundation".
```

## Prompt 9 — Add authentication and workspace shells

Target commit: `feat: add secure role-aware workspace access`

```text
Implement Appwrite authentication and secure shells for /workspace and /admin.

Support invitation-led or administrator-approved access; do not create an open freelancer marketplace registration flow. Add sign-in, sign-out, session refresh, protected routing, and account-state handling. Implement the initial roles from the blueprint as typed policy inputs, but only activate applicant, operations-admin, and governance-admin capabilities needed by current screens. Enforce access in server-side policy functions and Appwrite permissions; hiding navigation is not authorization.

Add a policy test matrix covering anonymous visitors, applicants, operations admins, governance admins, expired sessions, and disabled accounts. Require an MFA-ready design for privileged roles and document what remains to enable it operationally.

Acceptance: direct URL access is protected; session cookies use secure production settings; role changes invalidate effective access; policy tests and browser auth tests pass; build passes. Create exactly one commit named "feat: add secure role-aware workspace access".
```

## Prompt 10 — Add bilingual public content management

Target commit: `feat: add bilingual public content management`

```text
Implement a secure Appwrite-backed CMS for Umoja's public website so authorized editors can change public content without editing code or requiring a full application redeployment.

Migrate the typed local content repository behind a shared content interface and provide Appwrite and fake/test implementations. Support structured content for homepage sections, service pages, case studies, public talent profiles, organizations, AfricIT resources and workshops, manifesto/about pages, navigation labels where safe, calls to action, and SEO/social metadata. Keep layout, components, brand tokens, authorization rules, and executable behavior code-controlled.

Build /admin/content with list, create, edit, preview, submit-for-review, publish, unpublish, archive, restore, and revision-history flows. Model English and French variants explicitly with draft, in_review, scheduled, published, and archived states. Publishing must be an atomic versioned action: visitors always receive the last complete published version, never a partial draft. Editors may draft and preview; publishers may approve and publish; governance approval is required for legal pages and governance claims. Enforce every permission server-side.

Add a protected media library using Appwrite Storage with metadata, alt text in both languages, ownership, usage references, file type/size limits, and replacement without breaking published URLs. Sanitize rich text with a strict allowlist; do not permit arbitrary HTML, scripts, embeds, CSS, or executable uploads. Preserve audit events and immutable revision snapshots containing actor, time, locale, change summary, and source revision. Support rollback by creating a new revision from an old one rather than rewriting history.

Public pages should fetch published content with safe caching and targeted revalidation after publishing so updates appear promptly without a full deployment. Define failure behavior: if Appwrite is temporarily unavailable, continue serving the most recently cached published content where safe; never expose drafts or private fields. Case studies and talent profiles require recorded publication consent before entering review. Legal pages cannot be edited or published by ordinary content editors.

Acceptance: an authorized editor can change English and French homepage copy, preview it privately, submit it, and an authorized publisher can publish it without a code change; anonymous visitors see only the complete published revision; tests cover role separation, locale parity, consent gates, sanitization, atomic publishing, rollback, cache revalidation, Appwrite failure, and draft isolation; mobile and desktop admin/editor flows are visually inspected; lint, typecheck, tests, and build pass. Create exactly one commit named "feat: add bilingual public content management".
```

## Prompt 11 — Persist intake and add a protected review queue

Target commit: `feat: persist intake submissions and admin review`

```text
Connect the existing project, talent, and contact journeys to the Appwrite repository layer and build the first protected admin intake queue using the authentication and authorization policies already in the repository.

Submissions must be server-validated, rate-limited, assigned opaque IDs, timestamped, and recorded with consent versions and an audit event. Add safe attachment upload preparation with explicit type and size limits, but do not accept identity documents. Build /admin/intake with list, detail, status, ownership, notes, and activity history. Only authorized operations and governance roles may access private submissions.

Never render private submission data into public routes, logs, analytics, or error messages. Add duplicate-submission and abuse-resistant behavior.

Acceptance: integration tests prove public/private separation and server-side validation; anonymous, applicant, and disabled-account access to admin records is denied; fake-repository and configured-Appwrite modes have documented behavior; checks pass. Create exactly one commit named "feat: persist intake submissions and admin review".
```

## Prompt 12 — Deliver the first workspace vertical slice

Target commit: `feat: add profiles and availability workspace`

```text
Build the first useful authenticated Umoja workspace slice: applicant profile completion, skills, portfolio evidence metadata, languages, weekly availability, next available date, and application status.

Keep public profile data structurally separate from private contact and assessment data. Availability must expire to unknown after a documented period rather than remaining permanently current. Applicants can view and edit their own eligible fields; operations admins can review but sensitive changes generate audit events. Add honest empty, loading, error, stale, and permission-denied states. Do not add opaque talent scoring or Core promotion automation.

Acceptance: owner/admin authorization is enforced server-side; stale availability behavior has deterministic tests; public serializers cannot emit private fields; responsive UI is visually reviewed; accessibility, test, and build checks pass. Create exactly one commit named "feat: add profiles and availability workspace".
```

## Prompt 13 — Harden and document the first release

Target commit: `chore: harden platform foundation for preview`

```text
Prepare the current Umoja platform foundation for a private preview without deploying or modifying external services.

Audit the implementation against AGENTS.md and the MVP boundaries in docs/product-blueprint.md. Fix material accessibility, privacy, authorization, responsive-layout, performance, metadata, error-handling, and test gaps found within the current feature scope. Add security headers, a content-security-policy appropriate to the actual dependencies, robots behavior for preview environments, structured logging with private-field redaction, and an operational readiness checklist. Add a setup/runbook covering local development, Appwrite configuration, test data, environment variables, backup expectations, and rollback considerations.

Do not add new product features, production secrets, analytics, payments, or deployment integrations. Record remaining legal and operational blockers explicitly.

Acceptance: lint, typecheck, unit/integration/browser/accessibility tests, and production build all pass; key mobile/desktop routes are visually checked; no high-severity dependency issue is left unexplained. Create exactly one commit named "chore: harden platform foundation for preview".
```

## Commit map

| Order | Commit | Outcome |
|---:|---|---|
| 0 | `docs: establish Umoja product and brand foundation` | Product, brand, and Codex rules become the source of truth |
| 1 | `chore: scaffold Next.js workspace` | Buildable pnpm/Next.js workspace |
| 2 | `chore: add quality gates and CI` | Automated checks prevent unstable work |
| 3 | `feat: implement Umoja design system foundation` | Brand becomes reusable UI primitives |
| 4 | `feat: add bilingual public site shell` | English/French routing and navigation |
| 5 | `feat: build Umoja public homepage` | First polished public experience |
| 6 | `feat: add public services and organization pages` | Complete public information architecture |
| 7 | `feat: add project and talent intake journeys` | Tested forms before backend coupling |
| 8 | `feat: add Appwrite server foundation` | Secure backend contracts and configuration |
| 9 | `feat: add secure role-aware workspace access` | Server-enforced authentication/authorization |
| 10 | `feat: add bilingual public content management` | Editors can safely update the public site without code changes |
| 11 | `feat: persist intake submissions and admin review` | First end-to-end operational workflow |
| 12 | `feat: add profiles and availability workspace` | First useful contributor workspace slice |
| 13 | `chore: harden platform foundation for preview` | Private-preview readiness |

## How to run the prompts

- Use one Codex task for one prompt and one commit.
- Start the next task only after reviewing the diff and validation report.
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
