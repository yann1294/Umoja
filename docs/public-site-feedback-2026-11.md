# Public site feedback — November 2026

Status: compatible homepage changes implemented on `feat/public-site-clarity`; deferred items below
need separate decisions. Source: stakeholder document “Umoja Site” (homepage remarks, a proposed
section outline, and marketplace examples).

## Content precedence

The homepage renders a published `homepage:home` CMS page first and falls back to the EN/FR message
catalogues. On 2026-11-06 the development Supabase project held no CMS pages, so these fallback
changes are what visitors see. If a homepage page is published later, editors must update the same
fields through `/{locale}/admin/content` (draft, preview both locales, review, publish); the new
fields are listed on the Homepage surface.

## Disposition

1. **Commercial hero:** the introduction now leads with hiring one professional or a team. The
   sentence “Every request is qualified by people, not opened to public bidding” was removed from
   the hero; human qualification remains a product rule and is still explained in “How Umoja works”.
2. **“Join the network” in the hero:** replaced with “Hire a team” / “Recruter une équipe”, linking
   to `/{locale}/hire#team`.
3. **Expressive hero media:** replaced the abstract logo graphic with a code-native, decorative
   animation of a brief being reviewed and assembled into a team (product, data, cloud, design).
   It is static under `prefers-reduced-motion`, has no audio, and costs no media download. No
   approved video exists in the repository.
4. **Section order:** services (individual/team) → capabilities → benefits → how it works → talent
   → selected work → final paths, following the requested outline.
5. **Benefits:** a new section states only rules the platform enforces today: reviewed public
   profiles, one specialist or a full team, private by default, English/French parity.
6. **Contributor paths:** “Are you a seasoned professional? Join the network” (to Join) and “Want to
   strengthen your skills first? Explore AfricIT” (to the AfricIT page). The client card stays first
   and visually primary.
7. **Testimonials:** omitted. No testimonial with recorded permission and publication approval
   exists; the selected-work section keeps its honest empty state.

## Deferred — needs a decision or a later phase

| Request | Why deferred | Depends on |
| --- | --- | --- |
| Hero video | No licensed, consented documentary footage of real Umoja work exists. Needed: 15–30 s, muted, loopable footage per brand-system §6, with a poster frame, captions if speech, and releases for everyone shown. | Asset and releases |
| “AfroGuru” / “AfricIT GuruZ” naming | Spelled two ways in the source and absent from the brand system; it also implies a named mentor or programme that does not exist yet. | Brand/naming approval; Prompt 21 |
| “Get trained by AfricIT” | AfricIT workshops, registrations, and learning resources are planned for Prompt 21. The homepage describes AfricIT but does not offer enrolment. | Prompt 21 |
| “Our coaching” | No coaching service, owner, or workflow exists. | Product and owner decision |
| “Marketplace with search” | A filter over already approved, consented public profile fields could fit curated discovery; open search, bidding, or packaged gigs would change the model in ADR 0002. | Decision on discovery scope |
| “AI recommendations” | The blueprint excludes AI-based hiring decisions and opaque ranking from the MVP. | Governance decision; Prompt 17 staffing evidence |
| Testimonials | Need recorded permission and publication approval per quote. | Consent records; Prompt 22 |

The marketplace comparison (Upwork, Fiverr, Contra, Toptal, and others) is research input only and
does not change the engagement model.
