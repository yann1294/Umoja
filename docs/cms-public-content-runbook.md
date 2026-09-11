# Public website CMS runbook

Status: development editor model for the Supabase CMS foundation.

The admin CMS is organized around recognizable public website surfaces rather than raw database
records. Editors should start at `/{locale}/admin/content` and choose a surface such as Homepage,
About / Model, About / Governance, About / Manifesto, Work index, Services, Contact, Talent public
copy, or an existing Work case study.

## Bilingual editing

English and French variants are separate CMS records connected by the same translation group.
The content dashboard shows both locale states for every recognized surface:

- missing;
- draft;
- in review;
- published;
- archived.

Use the “Create EN/FR” action from the surface card when a translation is missing. The structured
editor locks the stable key, translation group, and public path for recognized surfaces so an editor
does not accidentally create a mismatched bilingual pair.

## Structured fields

Recognized surfaces expose fields that match the public route layout:

- Homepage: hero and talent-preview copy fields.
- About Model, Governance, Manifesto: hero title, intro, ordered section headings and bodies.
- Work index: hero and honest empty-state copy.
- Work case studies: title, summary, challenge, Umoja contribution, result, status, lessons,
  period/capabilities, explicit publishable approval, and publication consent reference.
- Services and Talent public copy: hero fields.
- Contact: contact-path headings, descriptions, and actions.

Generic body paragraphs remain available for fallback or specialized content, but page-specific
fields should be preferred for the listed public surfaces.

## Governance-sensitive content

Governance and Manifesto pages are draftable in the CMS, but ordinary CMS publication remains
blocked by the existing governance controls. Do not bypass this by changing stable keys or slugs.
Publication of governance-sensitive material requires a separately approved governance/legal
authority model and matching database policy/RPC change.

## Work and case-study publication

The public Work index reads only published CMS case-study pages in the requested locale. A case
study is public only when all of the following are true:

1. the CMS page is published;
2. the record is not archived;
3. the page has a recorded publication-consent block;
4. the structured `case.publishable` field is exactly `yes`;
5. the route locale matches the published CMS locale.

Unpublished, unapproved, unconsented, archived, wrong-locale, or missing case studies must not
render publicly. If no approved case studies exist, the public Work page keeps the honest empty
state and illustrative template link.

## Safe editing procedure

1. Open `/{locale}/admin/content`.
2. Find the website surface, not the database identifier.
3. Edit or create the English and French variants.
4. Preview each locale.
5. Submit ordinary non-governance content for review.
6. Publish only when authorized and after bilingual copy, consent, and review requirements are met.
7. For Governance or Manifesto updates, keep the draft and record the owner/governance decision
   before any future publication-policy change.

Never put private profile data, applicant files, emails, phone numbers, internal notes, private
project material, or unapproved client outcomes into public CMS fields.
