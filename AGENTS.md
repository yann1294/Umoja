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
- Keep every backend secret and privileged operation server-side. Browser code may receive only explicitly publishable Appwrite or Supabase project values.
- When Supabase is the active backend, enable RLS on every exposed table, test grants and policies for each operation/role, keep role assignments outside user-editable metadata, and use the secret/service key only in trusted server paths after explicit validation and authorization.
- Do not run Appwrite and Supabase as a permanent split Auth/data/storage architecture. A migration branch may keep adapters temporarily for parity tests, but the accepted runtime must have one canonical identity and authorization system.
- Validate untrusted input at system boundaries.
- Enforce authorization in server-side policies, not only in navigation or UI visibility.
- Build accessible semantic interfaces targeting WCAG 2.2 AA.
- Reuse brand assets in `public/brand` and tokens from `docs/brand-system.md`.
- Keep English and French content structurally equivalent.
- Treat CMS content as untrusted input: validate schemas, sanitize rich text, preserve revision history, and enforce preview/publish permissions server-side.
- Use small domain-focused modules; do not introduce microservices.

## Responsive interface contract

Every public, authentication, workspace, admin, and CMS interface must be fluid from 320px through 1920px and remain coherent beyond 1920px. Do not optimize only for named breakpoints.

- Automated viewport coverage must include widths of 320, 360, 390, 768, 1024, 1280, 1440, and 1920px. Add a 2560px wide-layout sanity check.
- Check portrait and landscape at phone and tablet sizes where the interaction changes materially.
- Verify browser zoom at 200% in a real browser. Do not treat device pixel ratio or Playwright `deviceScaleFactor` as browser zoom.
- Prevent unintended page-level horizontal scrolling. A deliberately scrollable data region is allowed only when clearly labelled, keyboard accessible, and visually indicated.
- Interactive touch targets must be at least 44×44 CSS pixels unless an equivalent accessible spacing technique satisfies the same usability goal.
- Navigation, forms, dialogs, dashboards, tables, module trees, editors, notifications, and action bars must adapt without hiding essential actions or information.
- Tables must transform into a readable small-screen presentation or use a labelled, focusable scroll region with persistent row/column context.
- Test long English and French content, long names, unbroken strings, validation messages, and translated labels without clipping or overlap.
- Loading, empty, error, validation, stale, offline where supported, and permission-denied states must remain usable at the viewport matrix.
- Maintain Playwright screenshot coverage for representative public, authentication, workspace, admin, and CMS routes.
- Before launch, record human physical-device results on at least one supported Android phone and one supported iPhone. Automated emulation does not satisfy this launch gate.

## Quality bar

For every implementation task:

1. Inspect existing patterns before adding dependencies or abstractions.
2. Preserve unrelated user changes.
3. Add or update tests for changed behavior.
4. Run the relevant formatter, lint, type-check, tests, and production build.
5. For UI changes, run the responsive contract's relevant automated checks and visually inspect every changed surface across the viewport matrix, orientations, long-content fixtures, and 200% browser zoom.
6. Report changed files, checks run, material assumptions, and remaining risks.

Do not commit secrets, generated credentials, client data, CVs, contracts, or private project material.

## Git discipline

- Keep each commit focused and independently buildable.
- Use Conventional Commit messages.
- Do not combine broad refactors with feature work.
- Do not commit unless the active user prompt explicitly requests it.
