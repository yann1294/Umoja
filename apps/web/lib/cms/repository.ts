import "server-only";

import { createHash } from "node:crypto";
import { ID, Query, type Models, type TablesDB } from "node-appwrite";
import {
  cmsBlocksSchema,
  cmsPageInputSchema,
  type CmsLocale,
  type CmsPage,
  type CmsPageInput,
  type CmsRepository,
  type CmsState,
} from "@umoja/appwrite/cms";
import { getAppwriteConfig } from "@/lib/appwrite/config";

type PageRow = Models.Row & Record<string, unknown>;

function fromRow(row: PageRow): CmsPage {
  const input = cmsPageInputSchema.parse({
    stableKey: row.stableKey,
    translationGroupId: row.translationGroupId,
    locale: row.locale,
    slug: row.slug,
    title: row.title,
    seoTitle: row.seoTitle || undefined,
    seoDescription: row.seoDescription || undefined,
    blocks: cmsBlocksSchema.parse(JSON.parse(String(row.blocks))),
  });
  return {
    ...input,
    id: row.$id,
    state: String(row.state) as CmsState,
    authorId: String(row.authorId),
    updatedById: String(row.updatedById),
    publishedAt: row.publishedAt ? String(row.publishedAt) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
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
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt: state === "published" ? now : (existing?.publishedAt ?? null),
  };
}

export class AppwriteCmsRepository implements CmsRepository {
  private readonly resources = getAppwriteConfig();
  constructor(
    private readonly tables: TablesDB,
    private readonly onPublish: (page: CmsPage) => Promise<void> = async () => {},
  ) {}

  async getPublished(locale: CmsLocale, slug: string) {
    const result = await this.tables.listRows<PageRow>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      queries: [
        Query.equal("state", ["published"]),
        Query.equal("locale", [locale]),
        Query.equal("slug", [slug]),
        Query.limit(1),
      ],
      total: false,
      ttl: 300,
    });
    return result.rows[0] ? fromRow(result.rows[0]) : null;
  }

  async getDraft(pageId: string) {
    try {
      const row = await this.tables.getRow<PageRow>({
        databaseId: this.resources.databaseId,
        tableId: this.resources.tables.cmsPages,
        rowId: pageId,
      });
      return fromRow(row);
    } catch (error) {
      if ((error as { code?: number }).code === 404) return null;
      throw error;
    }
  }

  async createDraft(input: CmsPageInput, actorId: string) {
    const row = await this.tables.createRow<PageRow>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: ID.unique(),
      data: pageData(input, actorId, "draft"),
    });
    const page = fromRow(row);
    await this.audit("cms.create_draft", page.id, actorId, undefined, page);
    return page;
  }

  async updateDraft(pageId: string, input: CmsPageInput, actorId: string) {
    const existing = await this.mustGet(pageId);
    if (existing.state === "published" || existing.state === "archived")
      throw new Error("Only draft or review content can be edited.");
    await this.revise(existing, actorId, "Draft updated");
    const row = await this.tables.updateRow<PageRow>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: pageId,
      data: pageData(input, actorId, "draft", existing),
    });
    const page = fromRow(row);
    await this.audit("cms.update_draft", page.id, actorId, existing, page);
    return page;
  }

  async submitForReview(pageId: string, actorId: string) {
    return this.transition(pageId, "review", actorId, "cms.submit_review");
  }

  async publish(pageId: string, actorId: string) {
    const page = await this.transition(pageId, "published", actorId, "cms.publish");
    await this.onPublish(page);
    return page;
  }

  async rollback(pageId: string, revisionId: string, actorId: string) {
    const existing = await this.mustGet(pageId);
    const revision = await this.tables.getRow<PageRow>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      rowId: revisionId,
    });
    if (String(revision.pageId) !== pageId)
      throw new Error("Revision does not belong to this page.");
    await this.revise(existing, actorId, "Before rollback");
    const input = cmsPageInputSchema.parse({
      ...existing,
      title: revision.title,
      seoTitle: revision.seoTitle || undefined,
      seoDescription: revision.seoDescription || undefined,
      blocks: JSON.parse(String(revision.blocks)),
    });
    const row = await this.tables.updateRow<PageRow>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: pageId,
      data: pageData(input, actorId, "draft", existing),
    });
    const page = fromRow(row);
    await this.audit("cms.rollback", pageId, actorId, existing, page);
    return page;
  }

  private async mustGet(pageId: string) {
    const page = await this.getDraft(pageId);
    if (!page) throw Object.assign(new Error("CMS page not found"), { code: 404 });
    return page;
  }

  private async transition(pageId: string, state: CmsState, actorId: string, action: string) {
    const existing = await this.mustGet(pageId);
    await this.revise(existing, actorId, `Before ${state}`);
    const row = await this.tables.updateRow<PageRow>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsPages,
      rowId: pageId,
      data: pageData(existing, actorId, state, existing),
    });
    const page = fromRow(row);
    await this.audit(action, pageId, actorId, existing, page);
    return page;
  }

  private async revise(page: CmsPage, actorId: string, changeSummary: string) {
    const current = await this.tables.listRows<PageRow>({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      queries: [
        Query.equal("pageId", [page.id]),
        Query.orderDesc("revisionNumber"),
        Query.limit(1),
      ],
      total: false,
    });
    await this.tables.createRow({
      databaseId: this.resources.databaseId,
      tableId: this.resources.tables.cmsRevisions,
      rowId: ID.unique(),
      data: {
        pageId: page.id,
        revisionNumber: Number(current.rows[0]?.revisionNumber ?? 0) + 1,
        locale: page.locale,
        state: page.state,
        title: page.title,
        seoTitle: page.seoTitle ?? null,
        seoDescription: page.seoDescription ?? null,
        blocks: JSON.stringify(page.blocks),
        authorId: actorId,
        changeSummary,
        createdAt: new Date().toISOString(),
        publishedAt: page.publishedAt ?? null,
      },
    });
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
    await this.tables.createRow({
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
