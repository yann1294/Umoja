import { describe, expect, it } from "vitest";
import {
  assertPublishable,
  cmsPageInputSchema,
  FakeCmsRepository,
  isGovernanceControlled,
  resolvePublishedPage,
  type CmsPageInput,
} from "./cms";

const input = (locale: "en" | "fr" = "en"): CmsPageInput => ({
  stableKey: "homepage:home",
  translationGroupId: "home",
  locale,
  slug: "home",
  title: locale === "fr" ? "Accueil" : "Home",
  blocks: [
    {
      type: "field",
      key: "hero.title",
      label: "Title",
      value: locale === "fr" ? "Bâtir ensemble" : "Build together",
    },
  ],
});

describe("bilingual CMS boundaries", () => {
  it("keeps locale variants explicit and queryable", async () => {
    const repository = new FakeCmsRepository();
    const en = await repository.createDraft(input("en"), "editor");
    const fr = await repository.createDraft(input("fr"), "editor");
    expect((await repository.list({ locale: "fr" })).map((page) => page.id)).toEqual([fr.id]);
    expect(en.translationGroupId).toBe(fr.translationGroupId);
    await expect(
      repository.updateDraft(en.id, { ...input("en"), slug: "changed" }, "editor"),
    ).rejects.toThrow(/identity/i);
  });

  it("publishes an immutable complete snapshot while later drafts remain isolated", async () => {
    const repository = new FakeCmsRepository();
    const draft = await repository.createDraft(input(), "editor");
    await repository.submitForReview(draft.id, "editor");
    const published = await repository.publish(draft.id, "publisher");
    expect(published.currentRevisionId).toBeTruthy();
    await repository.updateDraft(
      draft.id,
      { ...input(), title: "Unfinished replacement" },
      "editor",
    );
    expect((await repository.getPublished("en", "home"))?.title).toBe("Home");
    expect((await repository.getDraft(draft.id))?.title).toBe("Unfinished replacement");
  });

  it("unpublishes without falling back to a draft and rollback creates a new working copy", async () => {
    const repository = new FakeCmsRepository();
    const draft = await repository.createDraft(input(), "editor");
    await repository.submitForReview(draft.id, "editor");
    const published = await repository.publish(draft.id, "publisher");
    const revisionId = published.currentRevisionId!;
    await repository.updateDraft(draft.id, { ...input(), title: "Changed" }, "editor");
    await repository.rollback(draft.id, revisionId, "editor");
    expect((await repository.getDraft(draft.id))?.title).toBe("Home");
    await repository.unpublish(draft.id, "publisher");
    expect(await repository.getPublished("en", "home")).toBeNull();
  });

  it("blocks governance publication and requires consent for profiles and case studies", () => {
    expect(
      isGovernanceControlled({ stableKey: "about:governance", slug: "about/governance" }),
    ).toBe(true);
    expect(() =>
      assertPublishable({ ...input(), stableKey: "about:governance", slug: "about/governance" }),
    ).toThrow(/Governance/);
    const profile = { ...input(), stableKey: "talent-profile:sample", slug: "talent/sample" };
    expect(() => assertPublishable(profile)).toThrow(/consent/i);
    expect(() =>
      assertPublishable({
        ...profile,
        blocks: [
          ...profile.blocks,
          {
            type: "publication-consent",
            recordedAt: "2026-08-23T00:00:00.000Z",
            reference: "consent-record-1",
          },
        ],
      }),
    ).not.toThrow();
  });

  it("rejects executable rich text and unsafe links", () => {
    expect(
      cmsPageInputSchema.safeParse({
        ...input(),
        blocks: [{ type: "paragraph", text: "<script>alert(1)</script>" }],
      }).success,
    ).toBe(false);
    expect(
      cmsPageInputSchema.safeParse({
        ...input(),
        blocks: [{ type: "link", label: "Unsafe", href: "javascript:alert(1)" }],
      }).success,
    ).toBe(false);
  });

  it("serves only the last known published value during an Appwrite outage", async () => {
    const repository = new FakeCmsRepository();
    const draft = await repository.createDraft(input(), "editor");
    await repository.submitForReview(draft.id, "editor");
    await repository.publish(draft.id, "publisher");
    const cached = new Map<string, Awaited<ReturnType<typeof repository.getPublished>>>();
    const first = await resolvePublishedPage(
      "en:home",
      () => repository.getPublished("en", "home"),
      cached,
      null,
    );
    const duringFailure = await resolvePublishedPage(
      "en:home",
      async () => {
        throw new Error("unavailable");
      },
      cached,
      null,
    );
    expect(duringFailure?.title).toBe(first?.title);
    await repository.unpublish(draft.id, "publisher");
    expect(
      await resolvePublishedPage(
        "en:home",
        () => repository.getPublished("en", "home"),
        cached,
        first,
      ),
    ).toBeNull();
  });
});
