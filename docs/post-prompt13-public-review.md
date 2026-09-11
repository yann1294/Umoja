# Post-Prompt-13 public review

Status: technically complete and ready for development integration review; private-preview and production gates remain controlled separately.

## Product reconciliation

Umoja offers two curated ways to engage: request one approved African technology professional, or ask Umoja to help assemble a complete expert team. Both paths begin with human qualification. They do not create public bidding, an unrestricted directory, direct publication of private contacts or rates, opaque ranking, automated contracting, escrow, or payouts. Public profiles remain opt-in and moderated.

Delivery, legal, tax, subcontracting, and jurisdiction responsibilities depend on the approved engagement and contract. The public copy therefore does not assign responsibility universally to Umoja or to the client.

The active technical architecture is Supabase Auth, PostgreSQL with RLS and grants, private/public Storage boundaries, and additive migrations. Sensitive application fields use the accepted AES-256-GCM and HMAC boundaries, and privileged authorization remains in Next.js server paths. Appwrite appears only in retained migration, rollback, and recovery history.

## PDF annotation disposition

1. **Larger logo:** increased the existing full-lockup size with responsive `clamp()` sizing while preserving SVG proportions, clear space, and 44px controls.
2. **AfricIT hierarchy:** removed AfricIT from desktop and mobile primary navigation. The route remains available from About and the footer, with an introduction connecting learning, workshops, resources, and research to the talent pool.
3. **Contact and verified marketing:** made Contact primary and added four clear enquiry paths. Public profiles still come only from the moderated public view; work and testimonial proof remains absent or explicitly unavailable when no verified, consented record exists.
4. **Build/Grow repetition:** removed the repeated institutional explanation from Home and retained focused final client and contributor actions. The institutional explanation is now on About.
5. **Manifesto:** moved the institutional manifesto context to About and retained its existing route.
6. **AfricIT homepage block:** moved the detailed block to About without deleting the AfricIT route.
7. **Network model:** moved Core, Extended, and partner detail to About.
8. **Talent priority:** placed the moderated talent entry immediately after the hero and shortened its privacy explanation.
9. **Hiring CTA:** replaced the hero project CTA with “Hire a professional” / “Recruter un professionnel” and routed it to `/[locale]/hire`; the existing structured project journey remains unchanged at `/[locale]/start-a-project`.
10. **Two engagement models:** added distinct individual and team paths. Responsibility is described as engagement- and contract-specific rather than assigned through an unapproved universal legal claim.

## Changed public surfaces

- `/en` and `/fr`: hiring-first composition ordered as hero, talent, expertise, two engagement paths, concise process, verified proof state, and final actions.
- `/[locale]/about`: engagement model, network structure, AfricIT context, and manifesto/capability narrative.
- `/[locale]/hire`: individual, team, and structured-project choices, all entering qualified intake rather than direct contact.
- `/[locale]/contact`: individual hiring, team/project, network, and general-enquiry paths; the general form remains explicitly non-persistent in this release.
- Shared desktop/mobile navigation and footer: Contact and Hire are discoverable; AfricIT is contextual.

Editable page copy and CTA fields use the existing CMS field-block mechanism where public administrators are expected to manage content. The accepted homepage ordering stays in code so an editor cannot silently break the reviewed hierarchy.

## Verification

- Formatting, zero-warning lint, strict TypeScript, and the production build pass.
- Unit tests: 146 passed and 7 skipped across workspaces.
- Public Playwright suites pass at 320, 360, 390, 768, 1024, 1280, 1440, 1920, and 2560px, plus phone and tablet landscape.
- Revised Home, About, Hire, Contact, Services, Work, long-content states, navigation, and affected intake screenshots were reviewed individually before accepting baselines.
- Revised Home, About, Hire, and Contact report no serious or critical Axe findings at the representative desktop audit.
- Automated checks confirm no unintended page-level horizontal overflow, at least 44px relevant public targets, semantic headings/landmarks, localized navigation, keyboard-contained mobile navigation, and focus restoration.
- The 1280px representative intake regression passes after the shared-header and Contact baselines were reviewed and updated.
- A reported 200% zoom crowding defect in the bilingual Contact engagement cards was reproduced at the measured 729px CSS viewport. Compact cards now stack at and below 48rem. The focused regression verifies that all four French actions remain within their cards and viewport, preserve 44px targets, and do not create horizontal overflow. The affected 768px Contact baseline was updated and reviewed individually.

Google Chrome 152.0.7977.65 was used with a normal headed window and no device emulation. With owner participation limited to selecting actual browser zoom, the paired measurement recorded a stable 1470 × 923 outer window: 100% produced a 1458 × 829 CSS/visual viewport at DPR 2, while 200% produced a 729 × 414 CSS viewport (729 × 414.5 visual viewport) at DPR 4. Visual viewport scale remained 1, confirming browser zoom rather than pinch/page scaling, and neither state reported horizontal document overflow.

After the Contact fix, the live 200% browser audit recorded all four French CTA widths between 184px and 294px, each 45px high, with every action inside its card and the 729px viewport and with no internal text overflow. Mobile navigation at 200% also retained complete EN/FR labels, 44px controls, keyboard focus on open, and focus restoration on close. Home, About, Hire, and Contact were checked in both locales at the reduced CSS viewport.

Evidence is stored in `docs/evidence/post-prompt13-public/`. `public-home-zoom-100.png` records the baseline; `public-contact-fr-zoom-200-control-capture.jpg` is the genuine-zoom browser-control capture. The integration's image encoder crops that capture horizontally at 200%, so it is retained only as evidence of the visible fixed CTA region and is not used to infer full-page layout. `public-contact-fr-reflow-729.png` is the separately reviewed full-width reflow reference at the exact measured CSS width. The measured live DOM bounds and the focused Playwright regression provide the full-width overflow assertion.

## Remaining controlled decisions

- Approve engagement-specific legal, delivery, tax, subcontracting, and jurisdiction language before preview or production publication.
- Supply only verified and consented professionals, case studies, testimonials, logos, contact details, and outcomes through the CMS.
- Complete private-preview and production operational gates separately. Finance, public bidding, automated contracting, escrow, payouts, and production activation remain disabled.

Gate B/C restrictions remain unchanged. Technical completion and development integration readiness do not authorize preview publication, deployment, production activation, or any deferred finance/legal capability.

Prompt 14 and later operational domains are planned in `docs/roadmap/post-prompt13-roadmap-v1.md`; none is implemented by this review.
