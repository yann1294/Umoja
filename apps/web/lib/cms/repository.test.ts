import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/appwrite/config", () => ({
  getAppwriteConfig: () => ({
    databaseId: "umoja",
    tables: { cmsPages: "cms_pages", cmsRevisions: "cms_revisions", auditLogs: "audit_logs" },
  }),
}));

import { AppwriteCmsRepository } from "./repository";

const pageRow = (overrides: Record<string, unknown> = {}) => ({
  $id: "page-1",
  stableKey: "homepage:home",
  translationGroupId: "home",
  locale: "en",
  slug: "home",
  state: "review",
  title: "Working draft",
  seoTitle: "Working draft",
  seoDescription: "Draft description",
  blocks: JSON.stringify([{ type: "paragraph", text: "Working draft text" }]),
  authorId: "author",
  updatedById: "editor",
  currentRevisionId: "revision-old",
  publishedAt: "2026-08-20T00:00:00.000Z",
  createdAt: "2026-08-01T00:00:00.000Z",
  updatedAt: "2026-08-23T00:00:00.000Z",
  ...overrides,
});

describe("Appwrite CMS repository publication boundary", () => {
  it("hydrates public content from the immutable revision pointer, never the draft fields", async () => {
    const tables = {
      listRows: vi.fn().mockResolvedValue({ rows: [pageRow()], total: 1 }),
      getRow: vi.fn().mockResolvedValue({
        $id: "revision-old",
        pageId: "page-1",
        revisionNumber: 1,
        state: "published",
        title: "Published title",
        seoTitle: "Published SEO",
        seoDescription: "Published description",
        blocks: JSON.stringify([{ type: "paragraph", text: "Published text" }]),
        authorId: "publisher",
        changeSummary: "Published",
        createdAt: "2026-08-20T00:00:00.000Z",
        publishedAt: "2026-08-20T00:00:00.000Z",
      }),
    };
    const page = await new AppwriteCmsRepository(tables as never).getPublished("en", "home");
    expect(page?.title).toBe("Published title");
    expect(page?.blocks).toEqual([{ type: "paragraph", text: "Published text" }]);
    expect(JSON.stringify(page)).not.toContain("Working draft text");
  });

  it("creates the complete revision before moving the public pointer", async () => {
    const calls: string[] = [];
    const createdRevision = {
      $id: "revision-new",
      pageId: "page-1",
      revisionNumber: 2,
      state: "published",
      title: "Working draft",
      seoTitle: "Working draft",
      seoDescription: "Draft description",
      blocks: JSON.stringify([{ type: "paragraph", text: "Working draft text" }]),
      authorId: "publisher",
      changeSummary: "Published complete revision",
      createdAt: "2026-08-23T00:00:00.000Z",
      publishedAt: "2026-08-23T00:00:00.000Z",
    };
    const tables = {
      getRow: vi.fn().mockResolvedValue(pageRow()),
      listRows: vi.fn().mockResolvedValue({ rows: [{ revisionNumber: 1 }], total: 1 }),
      createRow: vi.fn().mockImplementation(async ({ tableId }: { tableId: string }) => {
        calls.push(`create:${tableId}`);
        return tableId === "cms_revisions" ? createdRevision : {};
      }),
      updateRow: vi.fn().mockImplementation(async ({ data }: { data: Record<string, unknown> }) => {
        calls.push("update:cms_pages");
        return pageRow({
          state: "published",
          currentRevisionId: data.currentRevisionId,
          publishedAt: data.publishedAt,
        });
      }),
    };
    const page = await new AppwriteCmsRepository(tables as never).publish("page-1", "publisher");
    expect(calls.slice(0, 2)).toEqual(["create:cms_revisions", "update:cms_pages"]);
    expect(page.currentRevisionId).toBe("revision-new");
  });
});
