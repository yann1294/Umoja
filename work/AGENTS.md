# Umoja repository instructions

## Product source of truth

Before changing product behavior or UI, read:

- `docs/product-blueprint.md`
- `docs/brand-system.md`

If code and documentation conflict, stop and explain the conflict. Do not silently reinterpret governance, privacy, finance, membership, or project-access rules.

## Product boundaries

- Umoja is a curated delivery collective, not an open bidding marketplace.
- The first release is bilingual English/French.
- Build mobile-first and for unreliable or low-bandwidth connections.
- Public profiles and case studies are opt-in and must not expose private contact or HR data.
- Approved editors must be able to update bilingual public content through the CMS without changing code or triggering a full application redeployment.
- Extended contributors may access only their assigned project modules and explicit dependency outputs.
- Finance and automatic payment features remain disabled until the legal model is approved.
- Avoid unverifiable claims and placeholder metrics presented as real facts.

## Engineering defaults

- Use TypeScript with strict type checking and the Next.js App Router.
- Prefer Server Components; add Client Components only where interactivity requires them.
- Keep Appwrite credentials and privileged operations server-side.
- Validate untrusted input at system boundaries.
- Enforce authorization in server-side policies, not only in navigation or UI visibility.
- Build accessible semantic interfaces targeting WCAG 2.2 AA.
- Reuse brand assets in `public/brand` and tokens from `docs/brand-system.md`.
- Keep English and French content structurally equivalent.
- Treat CMS content as untrusted input: validate schemas, sanitize rich text, preserve revision history, and enforce preview/publish permissions server-side.
- Use small domain-focused modules; do not introduce microservices.

## Quality bar

For every implementation task:

1. Inspect existing patterns before adding dependencies or abstractions.
2. Preserve unrelated user changes.
3. Add or update tests for changed behavior.
4. Run the relevant formatter, lint, type-check, tests, and production build.
5. Visually inspect changed pages at mobile and desktop sizes when UI changes.
6. Report changed files, checks run, material assumptions, and remaining risks.

Do not commit secrets, generated credentials, client data, CVs, contracts, or private project material.

## Git discipline

- Keep each commit focused and independently buildable.
- Use Conventional Commit messages.
- Do not combine broad refactors with feature work.
- Do not commit unless the active user prompt explicitly requests it.
