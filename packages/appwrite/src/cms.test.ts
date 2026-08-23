import { describe, expect, it } from "vitest";
import { selectPublishedPage, type CmsPage } from "./cms";

const base: CmsPage = {
  id: "page",
  stableKey: "home",
  translationGroupId: "home",
  locale: "en",
  slug: "home",
  state: "draft",
  title: "Draft",
  blocks: [{ type: "paragraph", text: "Draft text" }],
  authorId: "author",
  updatedById: "editor",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("public CMS filtering", () => {
  it("returns only the matching published locale and slug", () => {
    const published = { ...base, id: "published", state: "published" as const, title: "Published" };
    expect(selectPublishedPage([base, published], "en", "home")?.id).toBe("published");
    expect(selectPublishedPage([base], "en", "home")).toBeNull();
    expect(selectPublishedPage([published], "fr", "home")).toBeNull();
  });
});
