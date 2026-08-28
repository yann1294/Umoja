# Umoja Freelance Platform — Product and Platform Blueprint

Status: proposed foundation with a provisioned development baseline  
Working name: Umoja Freelance Platform (UFP)  
Product promise: **African expertise. One trusted force.**

## 1. Executive recommendation

Build one bilingual platform with two connected surfaces:

1. **Umoja public website** — vision, services, selected talent, projects, partner organizations, AfricIT learning, and project/talent application funnels.
2. **Umoja workspace** — private operations for vetting people, accepting and decomposing projects, staffing modules, tracking delivery, documentation, contributions, availability, and advancement from Extended to Core.

Do not begin as a fully open Upwork-style marketplace. Umoja's advantage is not listing volume; it is a trusted, managed, modular workforce. The first release should behave like a curated talent collective and delivery network. Open bidding, escrow, ratings, and automated cross-border payouts should follow only after legal and operational rules are validated through real projects.

## 2. Clarified organizational model

Use these names consistently across governance, product copy, and source code.

```text
Umoja Corporation (umbrella / eventual legal entity)
├── Knowledge Group (founding council and governance)
├── Umoja Core (vetted, trusted delivery workforce)
├── Umoja Extended (community and candidate bench)
├── UFP (the digital platform and project marketplace)
├── AfricIT (learning, workshops, R&D, and public thought leadership)
└── Affiliated organizations (independent project-originating partners)
    ├── UWW
    ├── Yobah Corp
    ├── Congo Bébé Clinique
    ├── Zing Records / Empire
    ├── DAX
    └── iBOS Consulting
```

### What each part means

| Part | Purpose | Appears publicly? | Platform privileges |
|---|---|---:|---|
| Umoja Corporation | Umbrella mission, brand, governance, and shared economic model | Yes | Platform ownership and policy |
| Knowledge Group | Founding/governance council; major membership and policy decisions | Limited | Highest governance permissions |
| Umoja Core | Vetted internal workforce with broad project context and delivery responsibility | Curated profiles | Full assigned-project context; can lead and supervise |
| Umoja Extended | Candidate/community pool and external specialists | Opt-in profiles only | Sees only assigned modules and their required interfaces |
| UFP | Website and software through which clients, talent, and operators interact | Yes | Not a separate membership tier |
| AfricIT | Workshops, courses, R&D, market analysis, and knowledge publishing | Yes | Learning and event management |
| Affiliated organizations | Independent entities that source work and use the shared workforce | Yes, after verification | Organization and project-originator accounts |

“AFP” in the source notes should be normalized to **UFP** unless the organization intentionally chooses a different name.

## 3. Positioning

### Primary audience

- African companies, NGOs, startups, and institutions needing trusted digital delivery.
- International organizations seeking African technical and cultural expertise.
- African technologists seeking meaningful projects, mentorship, and a path into a trusted collective.
- Affiliated organizations needing a reusable technical workforce.

### Positioning statement

Umoja is a pan-African technology collective that assembles vetted specialists into managed teams to design, build, and operate digital products. Clients get one accountable delivery partner; talent gets real projects, a community, and a transparent path from contributor to Core member.

### Differentiators

- Managed teams, not an anonymous freelancer directory.
- A visible progression path: Applicant → Extended → Core → Lead/Governance.
- Modular delivery protects client context and makes external collaboration safer.
- Francophone and anglophone Africa treated as one network from day one.
- A reinvestment model funding learning, shared capability, and R&D.
- Affiliated African organizations can reuse a common engineering workforce.

### Recommended language

Avoid “mercenary workforce” in public copy. Use **mission-ready workforce**, **delivery collective**, or **on-demand expert teams**. Keep individual nicknames for internal culture unless each member explicitly chooses them for a public profile.

## 4. Product principles

1. **Trust before scale.** Every public profile and organization is verified before discovery.
2. **One project, many modules.** Projects are decomposed before staffing or estimation.
3. **Least necessary context.** Extended members see their task, interfaces, inputs, outputs, acceptance criteria, and dependencies—but not unrelated confidential material.
4. **Document as you build.** No milestone closes without module documentation and an accepted deliverable.
5. **Privacy by default.** Contact details, legal names, rates, internal performance, and client-sensitive work are private unless explicitly published.
6. **Mobile and low-bandwidth first.** Core workflows must remain usable on modest Android devices and unstable connections.
7. **Bilingual by design.** French and English content have equal product status.
8. **Operations before automation.** Early processes may require administrator approval; automate only after the policy is stable.

## 5. Information architecture

### Public website

```text
/
├── /talent
│   └── /talent/[public-slug]
├── /services
│   ├── /product-engineering
│   ├── /data-ai
│   ├── /design-brand
│   ├── /cloud-enterprise
│   └── /digital-growth
├── /work
│   └── /work/[case-study-slug]
├── /organizations
├── /africit
│   ├── /workshops
│   ├── /research
│   └── /resources
├── /about
│   ├── /model
│   ├── /governance
│   └── /manifesto
├── /start-a-project
├── /join
├── /contact
├── /legal/terms
├── /legal/privacy
└── /legal/cookies
```

### Authenticated workspace

```text
/workspace
├── /overview
├── /opportunities
├── /projects
│   └── /[project-id]
│       ├── /brief
│       ├── /modules
│       ├── /team
│       ├── /milestones
│       ├── /documents
│       ├── /activity
│       └── /finance
├── /people
├── /organizations
├── /learning
├── /availability
├── /notifications
└── /settings

/admin
├── /intake
├── /vetting
├── /staffing
├── /portfolio
├── /contributions
├── /content
├── /audit
└── /configuration
```

Finance screens must remain feature-flagged until jurisdiction, contracting party, taxes, payout handling, and the 5% contribution rule are legally formalized.

## 6. Homepage narrative

The homepage should feel like a confident technology institution, not a generic job board.

1. **Hero:** “African expertise. One trusted force.” Two actions: “Start a project” and “Join the network.”
2. **Proof strip:** countries represented, vetted specialists, completed projects, skills—show only verified numbers.
3. **How Umoja works:** Discover → Assemble → Deliver → Grow.
4. **Capability blocks:** Product engineering, data/AI, enterprise modernization, cloud, design, and digital growth.
5. **Selected work:** honest case studies with challenge, contribution, result, status, and lessons.
6. **The network model:** a simple visual connecting Core, Extended, AfricIT, and partner organizations.
7. **Featured talent:** opt-in public profiles with first name/professional name, country/region, skills, seniority, and availability—not direct contact details.
8. **AfricIT:** upcoming workshops, resources, and research themes.
9. **Manifesto:** the five-year capability-building vision expressed positively and inclusively.
10. **Final split CTA:** “Build with Umoja” / “Grow with Umoja.”

The Poutine quote can appear on the manifesto page after written permission/attribution is confirmed. It should not dominate the homepage.

## 7. User types and permissions

Use role-based access plus project-level membership. A global role alone is insufficient.

| Role | Main capabilities |
|---|---|
| Visitor | Browse public content and submit contact/project/talent forms |
| Client contact | Manage their organization, project briefs, approvals, documents, and milestones |
| Applicant | Complete profile, assessments, consent, and application status |
| Extended contributor | Maintain availability; see opportunities and only assigned project modules |
| Core contributor | See full assigned projects, review cross-module interfaces, mentor, and document |
| Project lead | Plan, estimate, staff, assign, approve deliverables, and manage project access |
| Organization manager | Submit projects, manage organization members, review commercial data |
| AfricIT editor | Manage workshops, resources, research, and registrations |
| Operations admin | Vet people and organizations, moderate content, manage staffing and portfolios |
| Finance admin | View approved commercial and contribution records; cannot alter delivery evidence |
| Governance admin | Approve policy, Core promotions, partner entities, and high-risk changes |

### Confidentiality rule

For every project module, access is determined by:

```text
canAccess = platformRole permits action
         AND projectMembership is active
         AND (isCoreWithFullProjectAccess OR assignedModuleIds includes module)
```

Even Core members should receive full access only to projects on which they are active; “internal” must not mean universal access to every client project.

## 8. Essential workflows

### A. Client project intake and acceptance

1. Client submits a structured brief and optionally books a discovery call.
2. Operations verifies the organization and qualifies the opportunity.
3. A lead creates a hierarchical module tree with inputs, outputs, interfaces, risks, dependencies, and acceptance criteria.
4. System matches required skills against current availability and evidence.
5. Lead records feasibility across expertise, learning curve, timeline, budget, team availability, security, and legal risk.
6. Governance/commercial approver accepts, requests clarification, refers to a partner, or declines with a reason.
7. The accepted plan becomes a versioned statement of work; staffing and milestones begin.

Acceptance should never be a single checkbox. Store the assessment and who approved it.

### Public intake ownership and review semantics

Project and talent intake remain publicly accessible without authentication. A new anonymous
submission has no account owner and no applicant-readable access. Umoja must never infer ownership
from an email address, encrypted email, email blind index, submission reference, or another value
provided by the applicant.

A future account may claim a submission only through a cryptographically random, expiring,
single-use capability bound to the submission, intake kind, intended recipient, and verified user.
Until English and French verification, invitation, and recovery email delivery/exchange are proven,
rendered production paths must not issue claim links or expose applicant read-back. The confirmation
may show a non-secret submission reference and state that Umoja will contact the applicant.

Operational review may triage, request information, qualify or shortlist where the implemented
workflow supports those meanings, decline, or record withdrawal. The persisted `accepted` state is
reserved for a future governance/commercial approval capability. Reviewers and operations
administrators must not expose or apply it, and an intake review decision is not project acceptance.
Existing stored states remain stable until an additive, reviewed workflow migration defines any new
vocabulary and its compatibility mapping.

### B. Extended-to-Core progression

1. Applicant creates a private profile and consents to data use.
2. Operations checks identity, location, skills, portfolio, references, and availability.
3. Candidate completes a short structured interview and role-appropriate assessment.
4. Approved candidate enters Extended with a review date.
5. Candidate completes one or more supervised modules/trial projects.
6. Lead records evidence across delivery, communication, documentation, quality, and reliability.
7. Knowledge Group reviews the promotion packet.
8. Promotion to Core is approved, deferred with a growth plan, or declined with an appeal path.

Do not use a hidden opaque “talent score.” Show the criteria and supporting evidence to the person being evaluated.

### C. Modular delivery

1. Project lead creates modules and nested submodules.
2. Each module receives owner, reviewers, dates, inputs, output contract, dependencies, confidentiality level, and acceptance criteria.
3. Extended contributors receive only their assignment context and explicitly shared dependency outputs.
4. Deliverables are submitted with documentation and version history.
5. Core reviewer accepts, requests revision, or escalates a dependency issue.
6. Approved module outputs become usable inputs for downstream modules.
7. The lead integrates module documentation into the central project record.

Jira can be integrated later; UFP should initially own the canonical project/module record and provide external links rather than duplicate every Jira feature.

### D. Availability and staffing

- Contributors update weekly hours, next available date, preferred work mode, and temporary constraints.
- Stale availability expires automatically and becomes “unknown.”
- Matching produces a shortlist; a human lead confirms every assignment.
- Track allocation across projects to prevent overbooking.
- Never expose private rates or full personnel records to other contributors.

### E. 5% contribution record

Until legally validated, the platform should **calculate and record**, not automatically deduct or transfer.

```text
eligible project revenue
× approved contribution percentage (minimum policy currently proposed as 5%)
= Umoja capability contribution
```

Every record needs currency, exchange-rate source if converted, revenue basis, exclusions, approving entity, invoice/payment evidence, status, and an immutable audit trail.

## 9. Domain model

Use opaque IDs, timestamps, actor IDs, status history, and soft archival on all operational records.

### Identity and talent

- `profiles`: account ID, public slug, preferred/public name, locale, country, timezone, bio, visibility.
- `private_profile_details`: legal identity, contact details, address, work authorization, consent dates.
- `skills`: normalized skill catalogue and category.
- `profile_skills`: skill, level, years, last used, evidence IDs, verification state.
- `portfolio_items`: title, role, summary, links, media, client visibility approval.
- `availability_snapshots`: weekly capacity, next available date, preferences, expiry.
- `assessments`: type, rubric version, reviewer, outcome, evidence, appeal state.
- `membership_history`: applicant/extended/core/lead states with effective dates and approvals.

### Organizations and projects

- `organizations`: type, legal/public names, countries, verification, partner status.
- `organization_members`: organization role and access state.
- `opportunities`: intake source, client need, budget band, dates, qualification state.
- `feasibility_reviews`: expertise, availability, complexity, learning curve, risk, recommendation.
- `projects`: originating organization, representing organization, client, status, confidentiality, commercial owner.
- `project_members`: user, delivery role, access scope, allocation, start/end dates.
- `modules`: parent module, owner, output contract, acceptance criteria, confidentiality, dates, state.
- `module_dependencies`: upstream/downstream links and shared interface artifacts.
- `milestones`: scope, due date, amount/currency when enabled, approval status.
- `deliverables`: module, version, file/link, notes, submitter, review state.
- `project_documents`: canonical documentation with audience and version.
- `decisions`: decision record, options, rationale, owner, date.
- `risks`: likelihood, impact, mitigation, owner, state.

### Community, learning, and operations

- `workshops`, `workshop_sessions`, `registrations`.
- `learning_resources`, `resource_access`, `learning_evidence`.
- `research_themes`, `market_opportunities`.
- `case_studies`: public-safe summaries separate from confidential project data.
- `content_entries`: stable content identity, type, slug, governance class, and current published revision.
- `content_revisions`: immutable bilingual draft/published snapshots, workflow state, authorship, approvals, and change summary.
- `media_assets`: protected source file, publishable derivative, bilingual alt text, ownership, usage references, and consent state.
- `publication_consents`: subject/client, permitted content and channels, effective dates, evidence, withdrawal, and approving actor.
- `contribution_records`: policy version, basis, percentage, amount, evidence, approvals.
- `notifications`: in-product and email delivery state.
- `audit_events`: actor, action, target, before/after digest, time, request context.

Public pages read only complete published content revisions. Editors work in drafts and previews; publishers approve releases; legal pages and governance claims require governance approval. Publishing creates an immutable revision and triggers targeted cache revalidation so authorized staff can update the public site without editing code or rebuilding the application.

### Status vocabulary

Normalize inconsistent historical terms:

- Opportunity: `new`, `qualifying`, `feasibility`, `proposed`, `won`, `lost`, `declined`.
- Project: `planned`, `active`, `blocked`, `on_hold`, `delivered`, `closed`, `cancelled`.
- Module: `draft`, `ready`, `assigned`, `in_progress`, `in_review`, `changes_requested`, `accepted`, `blocked`.
- Historical outcome: store delivery status separately from relationship outcome and client satisfaction.

For example, “completed, contract broken, client not satisfied” is three facts—not one status.

## 10. Recommended technical architecture

### Front end and application layer

- **Next.js App Router + TypeScript**, using the current stable release at implementation time.
- React Server Components for public and read-heavy pages; client components only for interactive workspace features.
- Server Actions or route handlers for trusted mutations; never expose Appwrite API keys to the browser.
- Tailwind CSS with CSS custom-property design tokens.
- A small accessible component system built on semantic primitives; avoid locking the visual identity to a heavy UI kit.
- `next-intl` (or an equivalent maintained library) for English/French routes and messages.
- Zod schemas shared by forms and server operations.
- React Hook Form for multi-step project and talent intake.
- MDX or structured Appwrite content for manifesto/resources; structured content is preferable for bilingual editing.

### Responsive support contract

- Use fluid layouts that work continuously from 320px through 1920px and remain coherent on wider screens; breakpoints are test points, not the only supported widths.
- Automated checks cover 320, 360, 390, 768, 1024, 1280, 1440, and 1920px widths, with a 2560px sanity check and relevant phone/tablet portrait-landscape pairs.
- Public, authentication, workspace, admin, and CMS surfaces must pass without unintended page-level horizontal scrolling, clipped English/French content, unreachable actions, or undersized touch targets.
- Forms, dialogs, dashboards, tables, module trees, editors, and every loading/empty/error/validation/permission state receive responsive treatment. Data tables either adapt to a small-screen representation or use a clearly labelled and keyboard-accessible controlled scroll region.
- Verify reflow and usability at 200% browser zoom in a real browser. Device pixel ratio is not a substitute for browser zoom testing.
- Maintain Playwright screenshot coverage for representative routes in every product surface and require recorded physical-device testing on Android and iOS before launch.

### Appwrite responsibilities

- **Auth:** invite-only email/password sign-in with verification and recovery initially; optional passwordless, magic-link, or OAuth sign-in later; MFA is required operationally for privileged roles.
- **Databases:** operational records with table/row permissions, server-enforced authorization, and application-layer encryption for classified sensitive fields that cannot use Appwrite native encrypted columns on the current plan.
- **Storage:** the current free-plan development architecture uses one encrypted, deny-by-default bucket with File Security and per-file permissions. Public CMS media and application-encrypted private files share the bucket but never share access rules or delivery paths. Separate buckets by sensitivity remain the target migration when the chosen plan or hosting architecture supports them.
- **Functions:** notifications, stale-availability reminders, document processing, audit enrichment, scheduled checks, and future webhooks.
- **Realtime:** selective notification and project-status updates, not as the sole source of truth.
- **Teams/labels:** coarse tenancy and role grouping only; combine with explicit project membership records.

Appwrite currently provides authentication, database, storage, and function primitives suitable for this scope. Keep domain authorization in a tested server-side policy layer instead of scattering permission checks throughout components.

### Current development Appwrite baseline

The provisioned development environment is `umoja-development` in the Appwrite `syd` region. This is an implementation baseline, not a claim that Sydney is the final production region or that it satisfies every future residency requirement.

```text
umoja-development
├── Team: umoja-operations
│   └── Roles: admin, cms-editor, reviewer, core, extended, project-manager
├── Database: umoja
│   ├── cms_pages
│   ├── cms_revisions
│   ├── project_intakes
│   ├── talent_intakes
│   └── audit_logs
└── Storage bucket: cms_media
    ├── Intentionally public published CMS files — explicit per-file public read only
    ├── Private CMS drafts — authorized per-file access only
    └── Intake/portfolio files — application-encrypted and authorized server delivery only
```

All tables use row security and deny-by-default permissions. The bucket has empty bucket-wide permissions, File Security enabled, and native bucket encryption enabled. Both `APPWRITE_CMS_MEDIA_BUCKET_ID` and `APPWRITE_INTAKE_FILES_BUCKET_ID` resolve to `cms_media` in the free-plan environment. Code must treat those aliases as different sensitivity classes even though they currently resolve to the same physical bucket. No implementation may infer public access from the bucket ID alone.

The `umoja-operations` Team currently has no memberships. Inviting at least one minimum-privilege administrator, verifying administrator MFA, and retaining a recovery owner are manual gates before the private operations preview. Applicants are record owners and do not automatically become Team members. The current `admin` role represents approved operations capabilities only; it must not silently become governance authority. Legal/governance publication and other governance-only actions remain blocked until Umoja approves and implements a distinct policy or role.

The current schema persists project and talent intake only. The general `/contact` journey must remain an honest mock or route through a separately approved additive model; it must not overload unrelated project-intake fields merely to avoid a migration.

Appwrite native encrypted database columns are unavailable on the current free plan. Sensitive intake/profile fields therefore use versioned AES-256-GCM envelopes created in the trusted Next.js server before Appwrite receives them. Data and file encryption use independent 32-byte keys, random IVs, authentication tags, contextual authenticated data, and explicit key versions. Exact-match lookup and idempotency use a third independent key with context-separated HMAC-SHA-256 values such as `emailLookup` and `idempotencyKeyHash`; ciphertext is never indexed. Audit rows contain identifiers, actions, and non-reversible digests rather than duplicated personal data.

Public CMS content and approved operational metadata remain queryable plaintext because they are not classified secrets. Decryption of sensitive fields or files occurs only after server-side authentication and authorization. Private files are application-encrypted even when provider-native bucket encryption is enabled, and are delivered only through authorized server download/decryption routes—never public Appwrite URLs or previews.

Infrastructure is defined in version-controlled Appwrite configuration and provisioned additively with validation, drift, health, integration, read-back, and permission-filtered checks. Long-lived runtime and SSR keys are least-privilege server secrets. Schema changes use a separately scoped, short-lived bootstrap key that is removed after verified provisioning. Future profile/workspace tables require a new approved additive migration; `talent_intakes` must not become a permanent profile database merely to avoid a schema change.

### Backend decision checkpoint after Prompt 11

The existing Appwrite implementation remains valid and recoverable, but Phase 12 is the point at which the domain becomes substantially more relational. A proposed migration spike is recorded in `docs/adr/0001-evaluate-supabase-migration.md` and `docs/supabase-migration-runbook.md`.

Do not justify a migration with the claim that Appwrite Free categorically disables uploads. As checked on 2026-08-26, Appwrite lists 2 GB Storage and a 50 MB file-size limit on Free; its billing documentation says uploads are disabled after the Storage resource limit is reached. The missing bootstrap key is intentionally removable/recreatable for an approved schema operation. Verify actual usage and a real upload response before treating Storage as blocked.

Supabase is nevertheless a strong candidate for Umoja's future relational model because Postgres foreign keys, constraints, migrations, RLS, and Storage policies map directly to profiles, skills, availability, organizations, projects, nested modules, dependencies, assignments, deliverables, and audit records. Supabase Free is still pre-production infrastructure: it currently lists 500 MB database size, 1 GB file Storage, a 50 MB maximum upload setting, and project pausing after one week of inactivity.

Evaluate Supabase on a dedicated branch while leaving Appwrite Cloud unchanged. Do not operate a permanent hybrid with Appwrite Auth/data and Supabase files. If Supabase is accepted, migrate Auth, data, and Storage together; preserve application AES-256-GCM/HMAC protection; separate public CMS, private CMS, and applicant files; and make SQL migrations plus RLS tests the source of truth. Until the ADR acceptance gates pass, Appwrite remains the accepted runtime architecture.

### Deployment

```text
Browser / mobile web
        │
        ▼
Next.js application
├── Public SSR/ISR pages
├── Authenticated server-rendered workspace
├── Route handlers / server actions
└── Authorization + domain services
        │
        ▼
Appwrite
├── Auth
├── Databases
├── Storage (one shared free-plan bucket today; sensitivity enforced per file)
├── Functions / scheduled jobs
└── Realtime events

External services (behind adapters)
├── Transactional email
├── Analytics / error tracking
├── Calendar booking
├── Jira links or synchronization
└── Payment/escrow provider — later, after legal review
```

Host the Next.js application and Appwrite in regions chosen after data-residency, latency, support, and legal analysis. Do not market “African data sovereignty” until the actual hosting and subprocessors support that claim.

### Proposed repository

```text
umoja/
├── apps/
│   └── web/
│       ├── app/[locale]/(public)/
│       ├── app/[locale]/(auth)/
│       ├── app/[locale]/workspace/
│       ├── app/[locale]/admin/
│       └── app/api/
├── packages/
│   ├── ui/
│   ├── domain/
│   ├── appwrite/
│   ├── authz/
│   ├── validation/
│   ├── i18n/
│   └── config/
├── infra/
│   ├── appwrite/
│   └── scripts/
├── docs/
│   ├── adr/
│   ├── policies/
│   └── runbooks/
└── tests/
    ├── e2e/
    ├── integration/
    └── accessibility/
```

A monorepo is justified because the public site, workspace, policy layer, UI tokens, and Appwrite integration share types and rules. Start with one deployable web app; do not split into microservices.

## 11. Security and privacy baseline

- Deny by default on all private records.
- Separate public profile fields from private HR/identity records at the data-model level.
- Enforce authorization server-side and test every role/resource/action combination.
- MFA for admin, governance, finance, and project-lead roles.
- Short-lived sessions; revoke sessions when membership or project access ends.
- In the current free-plan environment, keep bucket-wide permissions empty and enforce sensitivity with File Security and explicit per-file permissions inside the shared `cms_media` bucket. Public CMS publication must never broaden access to private CMS, intake, portfolio, or future project files.
- Return private files only through authorized server download/decryption routes. Do not expose direct public Appwrite URLs or previews for encrypted private files.
- Malware scanning and type/size validation for uploads before making files available.
- Encryption in transit and provider-managed bucket encryption at rest, plus mandatory application AES-256-GCM for classified sensitive database values and private files in the current free-plan architecture.
- Use independent versioned keys for data encryption, file encryption, and HMAC blind indexes. Keep keys server-only, back them up securely, document rotation, and test authenticated-decryption failure. Key loss makes protected data unrecoverable.
- Keep public and approved operational fields queryable; never index ciphertext. Use context-separated HMAC-SHA-256 only for justified exact-match lookup and idempotency.
- Immutable audit events for permission, membership, finance, and approval changes.
- Audit events store identifiers, actions, and non-reversible digests rather than duplicated personal data. No secrets, plaintext private fields, contracts, CVs, legal names, or client documents may enter logs, analytics, screenshots, fixtures, cache keys, or error messages.
- Defined retention schedule and user data export/deletion process.
- Backups with documented restoration tests.
- Consent records for publishing profiles, case studies, testimonials, and images.
- Rate limits, anti-bot protection, and abuse review for public forms.
- Version-control all Appwrite resources and verify schema drift. Use a short-lived bootstrap key only for approved additive schema operations, then remove it from Appwrite and every local/deployment environment after read-back verification.
- Before production scale or storage of higher-risk evidence, review whether the hosting plan must migrate from the shared-bucket exception to separate buckets by sensitivity.

### Specific threat to prevent

The requirement to “keep profiles secret” should mean preventing external contributors from discovering unrelated team identities or confidential project context. It must not hide who performs work from the client, evade employment law, or enable undisclosed subcontracting. Client contracts should clearly permit and govern subcontractors.

## 12. Legal and policy gates

Obtain qualified legal and tax advice for each operating country. The platform design can support the answers but cannot choose them.

Before accepting paid work, decide:

- Incorporation country and which entity signs client contracts.
- Whether Umoja is an agency, marketplace, cooperative/collective, employer, or subcontracting prime contractor in each transaction.
- Independent contractor versus employee classification by country.
- VAT/GST/sales tax, withholding, invoicing, foreign exchange, and reporting obligations.
- Legal basis and cross-border safeguards for personal data.
- Intellectual-property assignment and open-source policy.
- Subcontractor disclosure, confidentiality, security, and background-check rules.
- Dispute resolution, liability, warranties, termination, and acceptance.
- Exact basis, approval, invoicing, use, and accounting treatment of the proposed 5% contribution.
- Payment custody: avoid holding client or freelancer funds until licensed-provider and regulatory obligations are clear.

Required policy documents before the wider launch:

- Platform terms and privacy notice.
- Client master services agreement and statement of work.
- Contributor agreement and code of conduct.
- Confidentiality/IP agreement.
- Partner organization agreement.
- Core promotion and appeal policy.
- Project acceptance rubric.
- Contribution policy.
- Data retention and incident response policies.

## 13. Content migration from the source notes

The supplied project list is valuable operational history, but it is not ready to publish as-is.

### Migration steps

1. Deduplicate repeated entries and normalize names (`You & Us`, `You&US Technology`, etc.).
2. Separate originating party, representing organization, client, and delivery team.
3. Normalize status, relationship outcome, satisfaction, and maintenance state.
4. Verify repositories and ensure no private code is linked publicly.
5. Get client and contributor consent before publishing names, logos, metrics, or screenshots.
6. Replace internal notes with an honest case-study format: context, scope, Umoja role, result, lessons, and current state.
7. Archive dropped or disputed projects privately unless there is a clear public learning purpose and legal approval.

### Initial private imports

Import the known projects into the admin workspace as unverified historical records: Guide Me, IBOS Consulting, Zing Empire/Records work, Congo Bébé/Taraja, You & Us, Palmier, FMA/Office, GCC, Medz Trucking, Hostel Booking App, AEG, Yale Love NGO, Le Mystère Sexuel, KIC, and the prospective Geneva NGO/music-label work.

No project should appear in `/work` until a content owner marks every public field verified.

## 14. Analytics and success measures

### North-star measure

**Accepted project value delivered through verified Umoja teams**, paired with client acceptance and contributor growth. Revenue alone would reward poorly delivered work; utilization alone would reward busyness.

### Launch measures

- Qualified project briefs per month.
- Brief-to-discovery and discovery-to-accepted conversion.
- Time from accepted brief to staffed team.
- Milestones accepted on time.
- Project/client satisfaction captured at milestone and close.
- Active Extended and Core contributors with fresh availability.
- Extended-to-Core progression and time to progression.
- Documentation completeness at milestone close.
- Learning-resource participation and workshop completion.
- Rework, blocked days, and cancellation reasons.
- Contribution amount accrued/paid under the approved policy.

Use privacy-friendly analytics for public traffic and first-party product events for operational funnels. Never rank contributors publicly by utilization or earnings.

## 15. Delivery roadmap

### Phase 0 — Decisions and source-of-truth cleanup (2–3 weeks)

- Confirm names, ownership, governance, jurisdictions, and the legal-review owner.
- Interview Core members, two Extended candidates, two affiliated organizations, and two prospective clients.
- Normalize the people/project inventory and decide what can be public.
- Approve brand direction, English/French core copy, and the first service categories.
- Write project acceptance, privacy, public-profile consent, and Core promotion rules.

Exit: signed product vocabulary, approved MVP scope, named policy owners, and publishable seed content.

### Phase 1 — Public credibility and intake (4–6 weeks)

- Bilingual public site, services, model, selected work, AfricIT, contact.
- Project-intake and talent-application flows.
- Invite-only Appwrite auth, application-encrypted private submissions/files, shared-bucket per-file isolation for the free-plan pilot, and an admin review queue.
- Content editing, SEO, analytics, accessibility, security baseline.
- Seed only verified projects and opt-in profiles.

Exit: Umoja can credibly explain itself, receive work, receive candidates, and process both privately.

### Phase 2 — Delivery workspace pilot (6–8 weeks)

- Additively provision dedicated public/private profiles, skills, portfolio, availability, and membership-history records; do not overload talent-intake rows as permanent profiles.
- Organizations, opportunities, and feasibility reviews.
- Projects, hierarchical modules, staffing, assignments, milestones, deliverables, documentation.
- Core versus Extended access rules and audit trail.
- Notifications and weekly availability reminders.
- Pilot with one low-risk real project and 5–10 contributors.

Exit: a project can move from qualified brief to accepted documented delivery without spreadsheets or WhatsApp as the system of record.

### Phase 3 — Community and capability (4–6 weeks)

- Extended-to-Core assessment and progression workflow.
- AfricIT workshops, registrations, learning resources, and evidence.
- Case-study publishing workflow and client approval.
- Operational dashboards and contribution ledger (record-only).

Exit: Umoja can show how people grow and how project value strengthens shared capability.

### Phase 4 — Commercial scale (after legal and pilot validation)

- Contracts and e-signature integration.
- Quotes, invoices, milestone payment status, and approved payout provider.
- Partner organization commercial reporting.
- Jira/calendar integrations where measured need exists.
- Optional controlled talent discovery and invitations.

Exit: repeatable commercial operations across approved jurisdictions.

### Explicitly not in MVP

- Open freelancer bidding.
- Public star ratings.
- Built-in video calls.
- Custom chat replacing established communication tools.
- Automated escrow or multi-country payouts.
- AI-based hiring decisions or opaque ranking.
- Native mobile apps.
- Microservices.

## 16. First implementation backlog

### Foundation

- Initialize monorepo, checks, preview deployments, environment validation, and architecture decisions.
- Implement design tokens, typography, responsive shell, bilingual routing, metadata, and accessibility checks.
- Keep Appwrite as the accepted runtime until ADR 0001's Supabase acceptance gates pass. Configure the active backend from version-controlled migrations or additive provisioning with validation, schema-history/drift, health, integration, read-back, and authorization-policy checks; never configure production only by clicking in a console.
- Keep browser-safe and privileged clients separate. Use per-request server sessions, keep every privileged key server-only, and remove temporary bootstrap credentials after verified schema operations. If Supabase is accepted, use its supported Next.js SSR cookie flow and make RLS plus grants the data-access authority.
- On Appwrite Free, maintain the `cms_media` shared-bucket aliases and strict per-file sensitivity boundaries. If Supabase is accepted, replace that exception with separate public CMS, private CMS, and applicant buckets protected by explicit Storage RLS policies. Never run Appwrite Auth/data with Supabase files as the permanent architecture.
- Build versioned AES-256-GCM data/file encryption, independent HMAC blind indexes, authorization policies, digest-only audit helpers, key-rotation documentation, and deterministic test fixtures.

### Public release

- Home, services, model, work index/detail, AfricIT, about/manifesto, contact.
- Start-a-project multi-step form with drafts and server-validated, application-encrypted protected uploads.
- Join multi-step form with profile visibility consent and server-validated, application-encrypted protected portfolio/CV uploads; do not collect identity evidence in the initial release.
- Admin intake queues with status, notes, ownership, and activity history.

### Pilot workspace

- User onboarding and profile completion.
- Skills, availability, organization, opportunity, and feasibility views.
- Project and module tree with assignment and access scope.
- Deliverable submission/review and project documentation.
- Notifications and audit views.

## 17. Decisions required from Umoja

These are organizational decisions, not software questions:

1. Is “Umoja” protectable and available as a name/domain in target jurisdictions?
2. Is UFP the final external product name, or should the market see only “Umoja”?
3. Which entity signs the first client contract and receives payment?
4. Who holds final authority for project acceptance, Core promotion, and public case studies?
5. Is the 5% based on gross receipts, net project revenue, or another defined base?
6. Which information about Core and Extended members may be public?
7. What evidence is mandatory for Core promotion?
8. Which two service categories and countries are the launch focus?
9. Which historical projects have client permission to appear publicly?
10. Who owns English/French content quality and operational data quality?
11. Which production backend, region, and plan satisfy the approved relational-model, latency, residency, backup, quota, and support requirements? Appwrite `syd` is the current development baseline; Supabase remains a proposed migration until its ADR gates pass.
12. If Appwrite remains active, at what risk or scale threshold must Umoja replace the shared free-plan bucket with separate buckets by sensitivity? If Supabase is accepted, which separate bucket policy is the approved equivalent?
13. Who is accountable for encryption-key generation, independent backup, access review, rotation, incident response, and recovery testing across any backend migration?

## 18. Recommendation in one sentence

Launch Umoja as a **curated pan-African delivery collective with a private modular project workspace**, prove the operating model on real work, and only then expand UFP into a broader marketplace and payment platform.

## References checked

- AfricaWork demonstrates the value of clear employer/candidate paths and country coverage: https://www.africawork.com/fr/executive-search
- i-kiotahub demonstrates a regional innovation and learning ecosystem, although its current website appears compromised by unrelated spam links and should not be used as a technical or security model: https://ikiotahub.com/
- Appwrite product documentation: https://appwrite.io/docs/products/auth, https://appwrite.io/docs/products/databases, https://appwrite.io/docs/products/storage, https://appwrite.io/docs/products/functions
- Appwrite Free-plan limits and pricing: https://appwrite.io/docs/advanced/billing/free, https://appwrite.io/pricing
- Supabase pricing and Storage upload limits: https://supabase.com/pricing, https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase RLS, Storage access control, Next.js SSR Auth, and migrations: https://supabase.com/docs/guides/database/postgres/row-level-security, https://supabase.com/docs/guides/storage/security/access-control, https://supabase.com/docs/guides/auth/server-side, https://supabase.com/docs/guides/local-development/database-migrations
