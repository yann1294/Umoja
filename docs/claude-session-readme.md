# Homepage update with Claude Code — November 2026

Status: implemented on `mygobranch`, opened as pull request #14 into `develop`, awaiting admin
review and merge. Nothing here is deployed.

This note records what was done with Claude Code (Anthropic's coding assistant) between
2026-11-04 and 2026-11-14: studying the repository, running it locally, and implementing the
stakeholder homepage feedback. The decision record for each feedback point lives in
[public-site-feedback-2026-11.md](public-site-feedback-2026-11.md).

## 1. Repository study

Claude read the product blueprint, brand system, ADRs 0001–0002, the post-Prompt-13 roadmap, the
release-readiness record, the Supabase migrations, the app routes, and the CI workflow, then
summarized the project:

- pnpm monorepo: `apps/web` (Next.js 16 App Router, next-intl EN/FR) and shared `packages/`.
- Supabase is the only active runtime; Appwrite remains only as migration and rollback history.
- Prompts 1–13 are complete. Prompt 14 (organizations and opportunity qualification) is next.
  Gate B (private preview) and Gate C (production) remain open owner gates.

Observations raised during the study, not fixed in this branch:

- `docs/prompt13-release-readiness.md` names `UMOJA_ENCRYPTION_ACTIVE_VERSION`, but the code reads
  `UMOJA_ACTIVE_ENCRYPTION_KEY_VERSION`.
- The root `Readme.md` still describes the original planning package.
- The root `.env.example` still lists the historical Appwrite variables.

## 2. Running the app locally

- pnpm 10.15.0 (the version pinned in `package.json`) was installed globally with
  `npm install -g pnpm@10`, followed by `pnpm install --frozen-lockfile`.
- The local environment file must live at `apps/web/.env.local`. Next.js reads env files only from
  the app folder; a copy in `apps/` is ignored, which made `/talent`, `/work`, `/workspace` and
  `/admin` fail with HTTP 500 until it was moved.
- Start the site:

  ```bash
  APP_URL=http://localhost:3950 pnpm --filter @umoja/web dev -p 3950
  ```

  then open `http://localhost:3950/en` or `/fr`.

Be aware that the local environment points at the shared Sydney development project, and with
`UMOJA_EMAIL_PROVIDER=brevo` invitation and recovery emails sent from a local run are real emails.
Use `log` to keep them in the server output instead.

## 3. Homepage changes

Source: the stakeholder document “Umoja Site” (homepage remarks, a proposed section outline, and
marketplace examples). Only changes compatible with the accepted curated-engagement model
(ADR 0002) were implemented.

| Area | Change |
| --- | --- |
| Hero copy | Leads with hiring one professional or a team; removed “Every request is qualified by people, not opened to public bidding.” Human qualification stays a product rule and is still explained in “How Umoja works”. |
| Hero actions | “Hire a professional” kept; “Join the network” replaced by “Hire a team” / “Recruter une équipe”, linking to `/{locale}/hire#team`. |
| Hero visual | The abstract logo graphic became a code-native animation: project brief → reviewed by Umoja → four role cards → “Your Umoja team”. Decorative, silent, no media download, and static under `prefers-reduced-motion`. |
| Section order | Services → capabilities → benefits → how it works → talent → selected work → final paths. |
| Benefits (new) | Reviewed public profiles; one specialist or a full team; private by default; English and French parity. Only rules the platform enforces today. |
| Final paths | Client card first, then “Are you a seasoned professional?” → Join, and “Want to strengthen your skills first?” → AfricIT, without implying enrolment or coaching. |
| CMS | 30 new Homepage surface fields so editors can change all new copy without a code change. |
| Docs | Blueprint section 6 rewritten for the new structure; decision record added. |

The development CMS held no published pages on 2026-11-06, so the code fallbacks are what visitors
see. If a homepage page is published later, the same text must be edited in
`/{locale}/admin/content`.

Deliberately not implemented, with reasons in the decision record: hero video, testimonials,
“AfroGuru” naming, AfricIT training and coaching, marketplace search, and AI recommendations.

### Files changed

- `apps/web/app/[locale]/page.tsx`, `page.module.css`
- `apps/web/messages/en.json`, `fr.json`
- `apps/web/lib/cms/public-surfaces.ts` and its unit test
- `tests/e2e/public-shell.spec.ts`
- `docs/product-blueprint.md`, `docs/public-site-feedback-2026-11.md`, and this note

## 4. Verification

Passed:

- `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.
- Unit tests: all pass except one pre-existing failure (below).
- Browser pane, EN and FR at 320, 360, 390, 768, 1024, 1280, 1440, 1920 and 2560 px: no page-level
  horizontal scroll, no clipped text, no touch target under 44 px, and every homepage link resolves.

Not done:

- `pnpm test:e2e`: Playwright browsers were not installed locally. The homepage screenshot
  baselines show the old design and need regenerating:

  ```bash
  pnpm exec playwright install chromium
  ```

  ```bash
  pnpm exec playwright test --update-snapshots
  ```

- Genuine 200% browser zoom and physical Android/iPhone checks.

Known pre-existing failure: `apps/web/lib/profile/service.test.ts` expects availability dated
`2026-10-01` to be public, but that date has passed, so the code correctly reports it as expired.
It fails on `develop` as well and needs a fixed clock or a relative date in the test.

## 5. Branch and pull request

The work was moved from a local branch onto a fresh branch cut from `origin/develop`, committed in
three focused Conventional Commits (website, tests, docs), pushed as `mygobranch`, and opened as
pull request #14 into `develop` for the admin to review and merge.
