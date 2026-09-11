import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
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
} from "./domain";
import type { Database } from "../../../../supabase/database.types";

type Client = SupabaseClient<Database>;
type PageRow = Database["public"]["Tables"]["cms_pages"]["Row"];
type RevisionRow = Database["public"]["Tables"]["cms_revisions"]["Row"];

function input(page: PageRow, revision: RevisionRow): CmsPageInput {
  return cmsPageInputSchema.parse({
    stableKey: page.stable_key,
    translationGroupId: page.translation_group_id,
    locale: page.locale,
    slug: page.slug,
    title: revision.title,
    seoTitle: revision.seo_title ?? undefined,
    seoDescription: revision.seo_description ?? undefined,
    blocks: cmsBlocksSchema.parse(revision.blocks),
  });
}
function page(page: PageRow, revision: RevisionRow): CmsPage {
  return {
    ...input(page, revision),
    id: page.id,
    state: page.state as CmsState,
    authorId: page.author_id,
    updatedById: page.updated_by_id,
    currentRevisionId: page.current_revision_id ?? undefined,
    publishedAt: page.published_at ?? undefined,
    createdAt: page.created_at,
    updatedAt: page.updated_at,
  };
}
function revision(row: RevisionRow, source: PageRow): CmsRevision {
  return {
    ...input(source, row),
    id: row.id,
    pageId: row.page_id,
    revisionNumber: row.revision_number,
    state: row.state as CmsState,
    actorId: row.author_id,
    changeSummary: row.change_summary,
    createdAt: row.created_at,
    publishedAt: row.published_at ?? undefined,
  };
}

export class SupabaseCmsRepository implements CmsRepository {
  constructor(
    private readonly client: Client,
    private readonly onPublish: (value: CmsPage) => Promise<void> = async () => {},
  ) {}
  private async latest(id: string) {
    const { data, error } = await this.client
      .from("cms_revisions")
      .select("*")
      .eq("page_id", id)
      .order("revision_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  }
  private async must(id: string) {
    const value = await this.getDraft(id);
    if (!value) throw Object.assign(new Error("CMS page not found"), { code: 404 });
    return value;
  }
  async list(filters: CmsListFilters = {}) {
    const { data, error } = await this.client
      .from("cms_pages")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    const values = (
      await Promise.all(
        data.map(async (row) => {
          const revision = await this.latest(row.id);
          return revision ? page(row, revision) : null;
        }),
      )
    ).filter((value): value is CmsPage => value !== null);
    return values.filter(
      (value) =>
        (!filters.locale || value.locale === filters.locale) &&
        (!filters.state || value.state === filters.state) &&
        (!filters.query ||
          `${value.title} ${value.slug} ${value.stableKey}`
            .toLowerCase()
            .includes(filters.query.toLowerCase())),
    );
  }
  async getDraft(id: string) {
    const { data, error } = await this.client
      .from("cms_pages")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const latest = await this.latest(id);
    return latest ? page(data, latest) : null;
  }
  async getPublished(locale: CmsLocale, slug: string) {
    const { data, error } = await this.client
      .from("cms_pages")
      .select("*")
      .eq("locale", locale)
      .eq("slug", slug)
      .eq("state", "published")
      .not("current_revision_id", "is", null)
      .maybeSingle();
    if (error) throw error;
    if (!data?.current_revision_id) return null;
    const { data: published, error: revisionError } = await this.client
      .from("cms_revisions")
      .select("*")
      .eq("id", data.current_revision_id)
      .eq("state", "published")
      .single();
    if (revisionError) throw revisionError;
    return page(data, published);
  }
  /** Server-only preview boundary calls this with an already validated capability binding. */
  async getPreviewRevision(id: string, revisionId: string) {
    const { data: source, error: pageError } = await this.client
      .from("cms_pages")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (pageError || !source) return null;
    const { data: selected, error: revisionError } = await this.client
      .from("cms_revisions")
      .select("*")
      .eq("id", revisionId)
      .eq("page_id", id)
      .maybeSingle();
    if (revisionError || !selected) return null;
    return page(source, selected);
  }
  async listRevisions(id: string) {
    await this.must(id);
    const { data, error } = await this.client
      .from("cms_revisions")
      .select("*")
      .eq("page_id", id)
      .order("revision_number", { ascending: false });
    if (error) throw error;
    const raw = await this.client.from("cms_pages").select("*").eq("id", id).single();
    if (raw.error) throw raw.error;
    return data.map((row) => revision(row, raw.data));
  }
  async createDraft(value: CmsPageInput, actorId: string) {
    const parsed = cmsPageInputSchema.parse(value);
    const { data: created, error } = await this.client
      .from("cms_pages")
      .insert({
        stable_key: parsed.stableKey,
        translation_group_id: parsed.translationGroupId,
        locale: parsed.locale,
        slug: parsed.slug,
        author_id: actorId,
        updated_by_id: actorId,
      })
      .select()
      .single();
    if (error) throw error;
    await this.writeRevision(created, parsed, actorId, "Draft created", "draft");
    return this.must(created.id);
  }
  async updateDraft(id: string, value: CmsPageInput, actorId: string, summary = "Draft updated") {
    const existing = await this.must(id);
    if (existing.state === "archived")
      throw new Error("Archived content must be restored before editing.");
    const parsed = cmsPageInputSchema.parse(value);
    if (
      parsed.stableKey !== existing.stableKey ||
      parsed.translationGroupId !== existing.translationGroupId ||
      parsed.locale !== existing.locale ||
      parsed.slug !== existing.slug
    )
      throw new Error("Published content identity cannot be changed after creation.");
    const { error } = await this.client
      .from("cms_pages")
      .update({ state: "draft", updated_by_id: actorId, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await this.writeRevision(await this.raw(id), parsed, actorId, summary, "draft");
    return this.must(id);
  }
  async submitForReview(id: string, actorId: string) {
    const current = await this.must(id);
    assertPublishable(current);
    return this.transition(id, actorId, "review");
  }
  async publish(id: string, actorId: string) {
    void actorId;
    const current = await this.must(id);
    assertPublishable(current);
    if (current.state !== "review")
      throw new Error("Content must be in review before publication.");
    // The RPC creates the immutable revision, moves the public pointer, and writes a digest-only
    // audit row in one transaction. The user-scoped client supplies auth.uid(); actorId remains a
    // Retained as part of the provider-neutral domain interface.
    const { data, error } = await this.client.rpc("publish_cms_page", {
      p_page_id: id,
      p_change_summary: "Published complete revision",
    });
    if (error) throw error;
    const published = await this.latest(id);
    if (!published) throw new Error("CMS revision not found after publication.");
    const result = page(data, published);
    await this.onPublish(result);
    return result;
  }
  async unpublish(id: string, actorId: string) {
    return this.transition(id, actorId, "draft", { current_revision_id: null });
  }
  async archive(id: string, actorId: string) {
    return this.transition(id, actorId, "archived", {
      current_revision_id: null,
      archived_at: new Date().toISOString(),
    });
  }
  async restore(id: string, actorId: string) {
    return this.transition(id, actorId, "draft", { archived_at: null });
  }
  async rollback(id: string, revisionId: string, actorId: string) {
    void actorId;
    const { data, error } = await this.client.rpc(
      "rollback_cms_page" as never,
      {
        p_page_id: id,
        p_revision_id: revisionId,
      } as never,
    );
    if (error) throw error;
    const result = await this.must((data as { id: string }).id);
    await this.onPublish(result);
    return result;
  }
  private async raw(id: string) {
    const { data, error } = await this.client.from("cms_pages").select("*").eq("id", id).single();
    if (error) throw error;
    return data;
  }
  private async transition(
    id: string,
    actorId: string,
    state: CmsState,
    extra: Record<string, unknown> = {},
  ) {
    const { data, error } = await this.client
      .from("cms_pages")
      .update({ state, updated_by_id: actorId, updated_at: new Date().toISOString(), ...extra })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    const latest = await this.latest(id);
    if (!latest) throw new Error("CMS revision not found after transition.");
    const result = page(data, latest);
    if (state !== "review") await this.onPublish(result);
    return result;
  }
  private async writeRevision(
    source: PageRow,
    value: CmsPageInput,
    actorId: string,
    summary: string,
    state: CmsState,
  ) {
    const { data: existing, error: existingError } = await this.client
      .from("cms_revisions")
      .select("revision_number")
      .eq("page_id", source.id)
      .order("revision_number", { ascending: false })
      .limit(1);
    if (existingError) throw existingError;
    const { data, error } = await this.client
      .from("cms_revisions")
      .insert({
        page_id: source.id,
        revision_number: (existing[0]?.revision_number ?? 0) + 1,
        state,
        title: value.title,
        seo_title: value.seoTitle ?? null,
        seo_description: value.seoDescription ?? null,
        blocks: value.blocks,
        author_id: actorId,
        change_summary: summary,
        ...(state === "published" ? { published_at: new Date().toISOString() } : {}),
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}
