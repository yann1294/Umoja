import { describe, expect, it } from "vitest";
import type { EditorialPage } from "@umoja/validation";

import type { CmsPage } from "./domain";
import {
  PUBLIC_CONTENT_SURFACES,
  blockWithoutStructuredFields,
  caseStudySurface,
  publicSurfaceForPage,
} from "./public-surfaces";
import { caseStudyFromCms, editorialPageFromCms } from "./public-rendering";

const basePage = {
  id: "00000000-0000-0000-0000-000000000001",
  state: "published",
  authorId: "00000000-0000-0000-0000-000000000002",
  updatedById: "00000000-0000-0000-0000-000000000002",
  currentRevisionId: "00000000-0000-0000-0000-000000000003",
  createdAt: "2026-09-12T00:00:00.000Z",
  updatedAt: "2026-09-12T00:00:00.000Z",
} satisfies Partial<CmsPage>;

function page(value: Partial<CmsPage>): CmsPage {
  return {
    ...basePage,
    stableKey: "about:model",
    translationGroupId: "about-model",
    locale: "en",
    slug: "about/model",
    title: "Stored title",
    blocks: [{ type: "paragraph", text: "Stored body" }],
    ...value,
  } as CmsPage;
}

describe("public CMS surfaces", () => {
  it("recognizes website surfaces without exposing raw record identifiers first", () => {
    expect(PUBLIC_CONTENT_SURFACES.map((surface) => surface.key)).toEqual(
      expect.arrayContaining([
        "homepage",
        "about:model",
        "about:governance",
        "about:manifesto",
        "work:index",
        "services:index",
        "contact:index",
        "talent:index",
      ]),
    );
    expect(publicSurfaceForPage(page({ stableKey: "about:model", slug: "about/model" }))?.key).toBe(
      "about:model",
    );
    expect(
      publicSurfaceForPage(page({ stableKey: "case-study:alpha", slug: "work/alpha" }))?.key,
    ).toBe("case-study:alpha");
  });

  it("marks governance-sensitive surfaces as draftable but ordinary-publication blocked", () => {
    const governance = PUBLIC_CONTENT_SURFACES.find(
      (surface) => surface.key === "about:governance",
    );
    const manifesto = PUBLIC_CONTENT_SURFACES.find((surface) => surface.key === "about:manifesto");
    expect(governance?.governanceSensitive).toBe(true);
    expect(manifesto?.governanceSensitive).toBe(true);
  });

  it("preserves non-field blocks while replacing structured fields on save", () => {
    expect(
      blockWithoutStructuredFields([
        { type: "field", key: "hero.title", label: "title", value: "Title" },
        { type: "paragraph", text: "Body" },
      ]),
    ).toEqual([{ type: "paragraph", text: "Body" }]);
  });

  it("maps structured CMS fields onto About topic fallbacks", () => {
    const fallback: EditorialPage = {
      slug: "model",
      eyebrow: { en: "Old eyebrow", fr: "Ancien surtitre" },
      title: { en: "Old title", fr: "Ancien titre" },
      summary: { en: "Old summary", fr: "Ancien résumé" },
      sections: [
        {
          title: { en: "Old section", fr: "Ancienne section" },
          body: { en: "Old body", fr: "Ancien corps" },
        },
        {
          title: { en: "Second", fr: "Deuxième" },
          body: { en: "Second body", fr: "Deuxième corps" },
        },
      ],
    };
    const mapped = editorialPageFromCms(
      fallback,
      page({
        blocks: [
          { type: "field", key: "hero.eyebrow", label: "eyebrow", value: "CMS eyebrow" },
          { type: "field", key: "hero.title", label: "title", value: "CMS title" },
          { type: "field", key: "hero.summary", label: "summary", value: "CMS summary" },
          { type: "field", key: "section.1.title", label: "section", value: "CMS section" },
          { type: "field", key: "section.1.body", label: "body", value: "CMS body" },
        ],
      }),
      "en",
    );
    expect(mapped.eyebrow.en).toBe("CMS eyebrow");
    expect(mapped.title.en).toBe("CMS title");
    expect(mapped.summary.en).toBe("CMS summary");
    expect(mapped.sections[0]?.title.en).toBe("CMS section");
    expect(mapped.sections[0]?.body.en).toBe("CMS body");
    expect(mapped.sections[1]?.title.en).toBe("Second");
  });

  it("renders case studies only after consent and explicit publishable approval", () => {
    const surface = caseStudySurface("approved-work");
    const base = page({
      stableKey: surface.stableKey,
      translationGroupId: surface.translationGroupId,
      slug: surface.slug,
      blocks: [
        { type: "field", key: "hero.title", label: "title", value: "Approved work" },
        { type: "field", key: "hero.summary", label: "summary", value: "Short summary" },
        { type: "field", key: "case.challenge", label: "challenge", value: "Challenge" },
        { type: "field", key: "case.contribution", label: "contribution", value: "Contribution" },
        { type: "field", key: "case.result", label: "result", value: "Result" },
        { type: "field", key: "case.status", label: "status", value: "Delivered" },
        { type: "field", key: "case.lessons", label: "lessons", value: "Lessons" },
        {
          type: "publication-consent",
          recordedAt: "2026-09-12T00:00:00.000Z",
          reference: "owner-approved-case-study",
        },
      ],
    });
    expect(caseStudyFromCms(base)).toBeNull();
    expect(
      caseStudyFromCms({
        ...base,
        blocks: [
          ...base.blocks.filter((block) => block.type !== "publication-consent"),
          { type: "field", key: "case.publishable", label: "publishable", value: "yes" },
        ],
      }),
    ).toBeNull();
    expect(
      caseStudyFromCms({
        ...base,
        blocks: [
          ...base.blocks,
          { type: "field", key: "case.publishable", label: "publishable", value: "yes" },
        ],
      })?.slug,
    ).toBe("approved-work");
  });
});
