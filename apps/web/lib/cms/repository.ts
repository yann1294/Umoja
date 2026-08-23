import "server-only";

import { createHash } from "node:crypto";
import { ID, Query, type Models, type TablesDB } from "node-appwrite";
import {
  assertPublishable,
  cmsBlocksSchema,
  cmsPageInputSchema,
  type CmsListFilters,
  type CmsLocale,
  type CmsPage,
  type CmsPageInput,
  type CmsRepository,
  type CmsRevision,
  type CmsState,
} from "@umoja/appwrite/cms";
import { getAppwriteConfig } from "@/lib/appwrite/config";

type Row = Models.Row & Record<string, unknown>;

function parseBlocks(value: unknown) {
  return cmsBlocksSchema.parse(JSON.parse(String(value)));
}

function fromPageRow(row: Row): CmsPage {
  const input = cmsPageInputSchema.parse({
    stableKey: row.stableKey,
    translationGroupId: row.translationGroupId,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    seoTitle: row.seoTitle || undefined,
    seoDescription: row.seoDescription || undefined,
    blocks: parseBlocks(row.blocks),
  });
  return {
    ...input,
    id: row.$id,
    state: String(row.state) as CmsState,
    authorId: String(row.authorId),
    updatedById: String(row.updatedById),
    currentRevisionId: row.currentRevisionId ? String(row.currentRevisionId) : undefined,
    publishedAt: row.publishedAt ? String(row.publishedAt) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function fromRevisionRow(row: Row, page: CmsPage): CmsRevision {
  return {
    ...cmsPageInputSchema.parse({
      ...page,
      title: row.title,
      seoTitle: row.seoTitle || undefined,
      seoDescription: row.seoDescription || undefined,
      blocks: parseBlocks(row.blocks),
    }),
    id: row.$id,
    pageId: String(row.pageId),
    revisionNumber: Number(row.revisionNumber),
    state: String(row.state) as CmsState,
    actorId: String(row.authorId),
    changeSummary: String(row.changeSummary),
    createdAt: String(row.createdAt),
    publishedAt: row.publishedAt ? String(row.publishedAt) : undefined,
  };
}

function pageData(input: CmsPageInput, actorId: string, state: CmsState, existing?: CmsPage) {
  const now = new Date().toISOString();
  return {
    ...cmsPageInputSchema.parse(input),
    blocks: JSON.stringify(input.blocks),
    state,
    authorId: existing?.authorId ?? actorId,
    updatedById: actorId,
    currentRevisionId: existing?.currentRevisionId ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: existing?.publishedAt ?? null,
  };
}

export class AppwriteCmsRepository implements CmsRepository {
  private readonly resources = getAppwriteConfig();

  constructor(
    private readonly tables: TablesDB,
    private readonly onPublish: (page: CmsPage) => Promise<void> = async () => {},
    private readonly auditTables: TablesDB = tables,
  ) {}

  async list(filters: CmsListFilters = {}) {
    const result = await this.tables.listRows<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      queries: [Query.limit(100)],
      total: false,
    });
    const query = filters.query?.toLocaleLowerCase();
    return result.rows
      .map(fromPageRow)
      .filter(
        (page) =>
          (!filters.locale || page.locale === filters.locale) &&
          (!filters.state || page.state === filters.state) &&
          (!query ||
            `${page.title} ${page.slug} ${page.stableKey}`.toLocaleLowerCase().includes(query)),
      )
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async getPublished(locale: CmsLocale, slug: string) {
    const result = await this.tables.listRows<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      queries: [Query.limit(100)],
      total: false,
      ttl: 300,
    });
    const page =
      result.rows
        .map(fromPageRow)
        .find((candidate) => candidate.locale === locale && candidate.slug === slug) ?? null;
    if (!page?.currentRevisionId) return null;
    const revision = await this.tables.getRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      rowId: page.currentRevisionId,
    });
    const published = fromRevisionRow(revision, page);
    if (published.state !== "published") return null;
    return {
      ...page,
      title: published.title,
      seoTitle: published.seoTitle,
      seoDescription: published.seoDescription,
      blocks: published.blocks,
      state: "published" as const,
      publishedAt: published.publishedAt ?? published.createdAt,
    };
  }

  async getDraft(pageId: string) {
    try {
      return fromPageRow(
        await this.tables.getRow<Row>({
          databaseId: this.resources.databaseId,
          tableId: this.resources.tables.cmsPages,
          rowId: pageId,
        }),
      );
    } catch (error) {
      if ((error as { code?: number }).code === 404) return null;
      throw error;
    }
  }

  async listRevisions(pageId: string) {
    const page = await this.mustGet(pageId);
    const result = await this.tables.listRows<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      queries: [
        Query.equal("pageId", [pageId]),
        Query.orderDesc("revisionNumber"),
        Query.limit(100),
      ],
      total: false,
    });
    return result.rows.map((row) => fromRevisionRow(row, page));
  }

  async createDraft(input: CmsPageInput, actorId: string) {
    const row = await this.tables.createRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: ID.unique(),
      data: pageData(input, actorId, "draft"),
    });
    const page = fromPageRow(row);
    await this.audit("cms.create_draft", page.id, actorId, undefined, page);
    return page;
  }

  async updateDraft(
    pageId: string,
    input: CmsPageInput,
    actorId: string,
    summary = "Draft updated",
  ) {
    const existing = await this.mustGet(pageId);
    if (existing.state === "archived")
      throw new Error("Archived content must be restored before editing.");
    if (
      input.stableKey !== existing.stableKey ||
      input.translationGroupId !== existing.translationGroupId ||
      input.locale !== existing.locale ||
      input.slug !== existing.slug
    ) {
      throw new Error("Published content identity cannot be changed after creation.");
    }
    const row = await this.tables.updateRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: pageId,
      data: pageData(input, actorId, "draft", existing),
    });
    const page = fromPageRow(row);
    await this.revise(page, actorId, summary, "draft");
    await this.audit("cms.update_draft", page.id, actorId, existing, page);
    return page;
  }

  async submitForReview(pageId: string, actorId: string) {
    const page = await this.mustGet(pageId);
    assertPublishable(page);
    if (page.state !== "draft") throw new Error("Only a draft can be submitted for review.");
    return this.transition(page, "review", actorId, "cms.submit_review");
  }

  async publish(pageId: string, actorId: string) {
    const existing = await this.mustGet(pageId);
    assertPublishable(existing);
    if (existing.state !== "review")
      throw new Error("Content must be in review before publication.");

    // Creating an immutable complete snapshot before moving the pointer means public readers see
    // either the previous complete revision or this one—never the editable working copy.
    const revision = await this.revise(
      existing,
      actorId,
      "Published complete revision",
      "published",
    );
    const now = new Date().toISOString();
    const row = await this.tables.updateRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: pageId,
      data: {
        state: "published",
        currentRevisionId: revision.id,
        updatedById: actorId,
        updatedAt: now,
        publishedAt: now,
      },
    });
    const page = fromPageRow(row);
    await this.audit("cms.publish", pageId, actorId, existing, page);
    await this.onPublish(page);
    return page;
  }

  async unpublish(pageId: string, actorId: string) {
    const existing = await this.mustGet(pageId);
    const row = await this.tables.updateRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: pageId,
      data: {
        state: "draft",
        currentRevisionId: null,
        updatedById: actorId,
        updatedAt: new Date().toISOString(),
      },
    });
    const page = fromPageRow(row);
    await this.audit("cms.unpublish", pageId, actorId, existing, page);
    await this.onPublish(page);
    return page;
  }

  async archive(pageId: string, actorId: string) {
    const existing = await this.mustGet(pageId);
    const row = await this.tables.updateRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: pageId,
      data: {
        state: "archived",
        currentRevisionId: null,
        updatedById: actorId,
        updatedAt: new Date().toISOString(),
      },
    });
    const page = fromPageRow(row);
    await this.audit("cms.archive", pageId, actorId, existing, page);
    if (existing.currentRevisionId) await this.onPublish(page);
    return page;
  }
  async restore(pageId: string, actorId: string) {
    return this.transition(await this.mustGet(pageId), "draft", actorId, "cms.restore");
  }

  async rollback(pageId: string, revisionId: string, actorId: string) {
    const existing = await this.mustGet(pageId);
    const row = await this.tables.getRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      rowId: revisionId,
    });
    if (String(row.pageId) !== pageId) throw new Error("Revision does not belong to this page.");
    const revision = fromRevisionRow(row, existing);
    const input = cmsPageInputSchema.parse({
      ...existing,
      title: revision.title,
      seoTitle: revision.seoTitle,
      seoDescription: revision.seoDescription,
      blocks: revision.blocks,
    });
    const page = await this.updateDraft(
      pageId,
      input,
      actorId,
      `Restored from revision ${revision.revisionNumber}`,
    );
    await this.audit("cms.rollback", pageId, actorId, existing, page);
    return page;
  }

  private async mustGet(pageId: string) {
    const page = await this.getDraft(pageId);
    if (!page) throw Object.assign(new Error("CMS page not found"), { code: 404 });
    return page;
  }

  private async transition(existing: CmsPage, state: CmsState, actorId: string, action: string) {
    const row = await this.tables.updateRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: existing.id,
      data: { state, updatedById: actorId, updatedAt: new Date().toISOString() },
    });
    const page = fromPageRow(row);
    await this.audit(action, page.id, actorId, existing, page);
    return page;
  }

  private async revise(page: CmsPage, actorId: string, changeSummary: string, state: CmsState) {
    const current = await this.tables.listRows<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      queries: [
        Query.equal("pageId", [page.id]),
        Query.orderDesc("revisionNumber"),
        Query.limit(1),
      ],
      total: false,
    });
    const row = await this.tables.createRow<Row>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      rowId: ID.unique(),
      data: {
        pageId: page.id,
        revisionNumber: Number(current.rows[0]?.revisionNumber ?? 0) + 1,
        locale: page.locale,
        state,
        title: page.title,
        seoTitle: page.seoTitle ?? null,
        seoDescription: page.seoDescription ?? null,
        blocks: JSON.stringify(page.blocks),
        authorId: actorId,
        changeSummary,
        createdAt: new Date().toISOString(),
        publishedAt: state === "published" ? new Date().toISOString() : null,
      },
    });
    return fromRevisionRow(row, page);
  }

  private async audit(
    action: string,
    targetId: string,
    actorId: string,
    before?: unknown,
    after?: unknown,
  ) {
    const digest = (value: unknown) =>
      value ? createHash("sha256").update(JSON.stringify(value)).digest("hex") : null;
    await this.auditTables.createRow({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.auditLogs,
      rowId: ID.unique(),
      data: {
        actorId,
        action,
        targetType: "cms_page",
        targetId,
        requestId: null,
        beforeDigest: digest(before),
        afterDigest: digest(after),
        metadata: null,
        createdAt: new Date().toISOString(),
      },
    });
  }
}
