# Umoja Platform — Product and Platform Blueprint

Status: accepted product foundation with a Supabase development runtime

Working name: Umoja Platform (UFP remains an operational abbreviation)

Product promise: **African expertise. One trusted force.**

## 1. Executive recommendation

Build one bilingual platform with two connected surfaces and two curated engagement paths:

1. **Umoja public website** — vision, services, selected talent, projects, partner organizations, AfricIT learning, and project/talent application funnels.
2. **Umoja workspace** — private operations for vetting people, accepting and decomposing projects, staffing modules, tracking delivery, documentation, contributions, availability, and advancement from Extended to Core.

Clients may either request an approved African technology professional for an individual
engagement or ask Umoja to help assemble a complete expert team. Both paths begin with human
qualification. They do not create public bidding, unrestricted discovery, automated contracting,
escrow, payouts, or access to private contact details and rates.

Do not begin as a fully open Upwork-style marketplace. Umoja's advantage is not listing volume; it
is a trusted, curated network with human qualification and explicit delivery boundaries. The
responsible party depends on the approved engagement and contract model: an individual placement,
a client-directed assembled team, and an Umoja-managed delivery engagement are not legally
interchangeable. Legal, tax, subcontracting, liability, and jurisdiction decisions remain pending.

## 2. Clarified organizational model

Use these names consistently across governance, product copy, and source code.

```text
Umoja Corporation (umbrella / eventual legal entity)
├── Knowledge Group (founding council and governance)
├── Umoja Core (vetted, trusted delivery workforce)
├── Umoja Extended (community and candidate bench)
├── UFP (the digital engagement and delivery platform)
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
| UFP | Website and software through which clients, talent, and operators interact | Yes | Not a separate membership tier or open marketplace |
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

Umoja is a pan-African technology collective through which clients can request a vetted specialist
or a complete expert team. Umoja may qualify, introduce, assemble, or manage delivery according to
the approved engagement and contract; the platform does not imply the same responsibility model
for every engagement. Talent gets access to reviewed opportunities, a community, and a transparent
path from contributor to Core member.

### Differentiators

- Curated individual and team engagements, not an anonymous freelancer directory.
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
├── /hire
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

The homepage should explain how a prospective client can engage Umoja immediately while retaining
the curated trust model. It must not resemble a public bidding marketplace.

1. **Hero:** “African expertise. One trusted force.” Primary action: “Hire a professional”; secondary action: “Join the network.”
2. **Talent pool:** explain consent-led, moderated visibility and show only approved public profiles.
3. **Capability blocks:** product engineering, data/AI, enterprise modernization, cloud, design, and digital growth.
4. **Engagement choices:** request an individual professional or ask Umoja to help assemble a team.
5. **How Umoja works:** qualify the need, confirm expertise and boundaries, then proceed under the approved engagement model.
6. **Verified proof:** selected work and testimonials only when evidence, consent, and publication approval exist.
7. **Final actions:** a clear client path and a visually secondary contributor path.

The detailed Core/Extended/partner network model, manifesto extract, AfricIT narrative, and long
capability-building explanation belong under About. AfricIT remains accessible contextually and in
the footer, but not in primary navigation or as a competing master brand.

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

### Public talent profile publication

Public talent pages may show only allow-listed, contributor-consented, moderation-approved fields:
professional display name, public slug, short headline, public biography, country/region code,
approved skills, consented language badges, current public availability summary, public avatar/logo
URL, public website URL, consented professional links, and approved portfolio examples. Portfolio
examples may include title, role/contribution summary, public URL, category, technologies, and
public date/year metadata when the contributor has consented and Umoja has approved publication.

The public projection must not expose private contact channels, emails, phone numbers, legal names,
rates, internal notes, hidden attachment paths, encrypted private details, applicant-only intake
fields, unapproved portfolio records, or unmoderated workspace edits. Website, avatar/logo, links,
skills, languages, availability, and portfolio entered in the workspace remain non-public until the
profile and each relevant public item satisfy explicit consent and moderation gates. Availability
must also be fresh and separately consented before a public summary can appear. The public talent pool is
curated discovery for qualified Umoja intake, not direct private messaging, public bidding, or an
unrestricted freelancer directory.

Homepage talent previews are a compact excerpt of the same public projection. They may show the
approved public name, avatar/logo or initials fallback, headline or short biography excerpt, public
country/region code, consented languages, approved skill badges, and fresh consented availability.
They must not use the full biography as the primary card content or introduce private/contact data.
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
- `account_invitations`: encrypted target address, address blind index, intended locale/access,
  expiry/revocation/acceptance state, and a one-time token digest. Raw invitation tokens and
  plaintext addresses never enter relational rows or audit logs.

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
- Server Actions or route handlers for trusted mutations; never expose database or service-role secrets to the browser.
- Tailwind CSS with CSS custom-property design tokens.
- A small accessible component system built on semantic primitives; avoid locking the visual identity to a heavy UI kit.
- `next-intl` (or an equivalent maintained library) for English/French routes and messages.
- Zod schemas shared by forms and server operations.
- React Hook Form for multi-step project and talent intake.
- Structured Supabase-backed CMS content for manifesto/resources and other editable bilingual public copy.

### Responsive support contract

- Use fluid layouts that work continuously from 320px through 1920px and remain coherent on wider screens; breakpoints are test points, not the only supported widths.
- Automated checks cover 320, 360, 390, 768, 1024, 1280, 1440, and 1920px widths, with a 2560px sanity check and relevant phone/tablet portrait-landscape pairs.
- Public, authentication, workspace, admin, and CMS surfaces must pass without unintended page-level horizontal scrolling, clipped English/French content, unreachable actions, or undersized touch targets.
- Forms, dialogs, dashboards, tables, module trees, editors, and every loading/empty/error/validation/permission state receive responsive treatment. Data tables either adapt to a small-screen representation or use a clearly labelled and keyboard-accessible controlled scroll region.
- Verify reflow and usability at 200% browser zoom in a real browser. Device pixel ratio is not a substitute for browser zoom testing.
- Maintain Playwright screenshot coverage for representative routes in every product surface and require recorded physical-device testing on Android and iOS before launch.

### Supabase responsibilities and accepted development baseline

- **Auth:** Supabase Auth is the sole active runtime identity provider. Invite-only email/password,
  verification, recovery, secure server-rendered sessions, account disablement, and MFA-ready
  privileged access remain bounded by the accepted Gate B/C evidence.
- **PostgreSQL:** additive SQL migrations, foreign keys, constraints, grants, and RLS are the source
  of truth for CMS, intake, profiles, membership, and subsequent relational domains.
- **Storage:** `cms-public`, `cms-private`, and `applicant-private` are separate buckets with explicit
  Storage RLS. Private applicant/profile files remain application-encrypted and quarantined until a
  real malware scanner returns a clean result.
- **Authorization:** RLS and grants form the database boundary; Next.js server policy checks validate
  the authenticated principal and action before trusted mutations. Neither boundary replaces the
  other.
- **Encryption:** classified values and private files use independent, versioned AES-256-GCM keys.
  Exact-match lookup and idempotency use a separate context-bound HMAC-SHA-256 key. Ciphertext is
  not indexed and secrets remain server-side.
- **CMS:** public reads expose only complete published revisions. Drafts, previews, publication
  consent, private media, and governance-controlled actions remain permissioned and audited.

The accepted development project is hosted in Supabase's Sydney region. That is not approval for a
production region, plan, residency posture, backup policy, or SLA. The general `/contact` journey
remains explicitly non-persistent until a separately approved additive model exists; it must not
overload project intake merely to simulate persistence.

Appwrite is not an active application dependency. Its implementation, cloud resources, inventories,
and recovery instructions remain only as historical migration/rollback evidence. Do not delete or
re-activate them without a separately approved rollback or decommission decision. ADR 0001 and the
Supabase migration runbook preserve the decision history and acceptance evidence.

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
Supabase
├── Auth
├── PostgreSQL, grants, and RLS
├── Separate public CMS, private CMS, and applicant Storage buckets
└── SQL migrations and audited RPCs

External services (behind adapters)
├── Transactional email
├── Analytics / error tracking
├── Calendar booking
├── Jira links or synchronization
└── Payment/escrow provider — later, after legal review
```

Host the Next.js application and Supabase in regions chosen after data-residency, latency, support,
backup, and legal analysis. Do not market “African data sovereignty” until the actual hosting and
subprocessors support that claim.

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
│   ├── authz/
│   ├── validation/
│   ├── i18n/
│   └── config/
├── supabase/
│   ├── migrations/
│   └── tests/
├── scripts/
├── docs/
│   ├── adr/
│   ├── policies/
│   └── runbooks/
└── tests/
    ├── e2e/
    ├── integration/
    └── accessibility/
```

A monorepo is justified because the public site, workspace, policy layer, UI tokens, and Supabase
integration share types and rules. Start with one deployable web app; do not split into microservices.

## 11. Security and privacy baseline

- Deny by default on all private records.
- Separate public profile fields from private HR/identity records at the data-model level.
- Enforce authorization server-side and test every role/resource/action combination.
- MFA for admin, governance, finance, and project-lead roles.
- Short-lived sessions; revoke sessions when membership or project access ends.
- Keep `cms-public`, `cms-private`, and `applicant-private` separated by explicit Storage RLS. Public CMS publication must never broaden access to private CMS, intake, portfolio, or future project files.
- Return private files only through authorized server download/decryption routes. Do not expose public Storage URLs or previews for encrypted private files.
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
- Version-control additive Supabase migrations and verify linked history, generated types, database lint, grants, RLS, Storage policies, and rollback procedures.
- Before production scale or storage of higher-risk evidence, approve the hosting plan, region, backup/recovery posture, quotas, support, and incident response.

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
- Invite-only Supabase Auth, application-encrypted private submissions/files, separate RLS-protected buckets, and an admin review queue.
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
- Keep Supabase as the sole active runtime. Configure it through additive SQL migrations, linked-history checks, generated types, RLS/grant matrices, Storage-policy tests, health checks, and verified read-back; never configure production only by clicking in a console.
- Keep browser-safe and privileged clients separate. Use per-request server sessions, keep every privileged key server-only, use the supported Supabase SSR cookie flow, and make RLS plus grants the data-access authority alongside server policy checks.
- Keep public CMS, private CMS, and applicant files in separate buckets protected by explicit Storage RLS. Never restore a permanent Appwrite/Supabase split runtime.
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
11. Which production Supabase region and plan satisfy the approved latency, residency, backup, quota, support, and recovery requirements? The Sydney development project is not production approval.
12. Who approves Storage retention, quarantine release, real malware scanning, and deletion policy for each sensitivity class?
13. Who is accountable for encryption-key generation, independent backup, access review, rotation, incident response, and recovery testing across any backend migration?

## 18. Recommendation in one sentence

Launch Umoja as a **curated pan-African engagement and delivery collective with a private modular project workspace**, prove both individual and team models on approved work, and only then consider broader commercial automation after legal approval.

## References checked

- AfricaWork demonstrates the value of clear employer/candidate paths and country coverage: https://www.africawork.com/fr/executive-search
- i-kiotahub demonstrates a regional innovation and learning ecosystem, although its current website appears compromised by unrelated spam links and should not be used as a technical or security model: https://ikiotahub.com/
- Appwrite documentation remains referenced only by ADR 0001 and the retained migration/rollback history.
- Supabase pricing and Storage upload limits: https://supabase.com/pricing, https://supabase.com/docs/guides/storage/uploads/file-limits
- Supabase RLS, Storage access control, Next.js SSR Auth, and migrations: https://supabase.com/docs/guides/database/postgres/row-level-security, https://supabase.com/docs/guides/storage/security/access-control, https://supabase.com/docs/guides/auth/server-side, https://supabase.com/docs/guides/local-development/database-migrations
