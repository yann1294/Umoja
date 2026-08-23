import { z } from "zod";

export const cmsBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().min(1).max(300),
  }),
  z.object({ type: z.literal("paragraph"), text: z.string().min(1).max(5000) }),
  z.object({ type: z.literal("callout"), title: z.string().max(200), text: z.string().max(2000) }),
  z.object({
    type: z.literal("link"),
    label: z.string().min(1).max(200),
    href: z.string().min(1).max(2048),
  }),
]);
export const cmsBlocksSchema = z.array(cmsBlockSchema).max(100);
export const cmsStateSchema = z.enum(["draft", "review", "published", "archived"]);
export const cmsLocaleSchema = z.enum(["en", "fr"]);

export const cmsPageInputSchema = z.object({
  stableKey: z.string().min(1).max(128),
  translationGroupId: z.string().min(1).max(64),
  locale: cmsLocaleSchema,
  slug: z.string().min(1).max(512),
  title: z.string().min(1).max(256),
  seoTitle: z.string().max(256).optional(),
  seoDescription: z.string().max(512).optional(),
  blocks: cmsBlocksSchema,
});

export type CmsBlock = z.infer<typeof cmsBlockSchema>;
export type CmsPageInput = z.infer<typeof cmsPageInputSchema>;
export type CmsState = z.infer<typeof cmsStateSchema>;
export type CmsLocale = z.infer<typeof cmsLocaleSchema>;
export type CmsPage = CmsPageInput & {
  id: string;
  state: CmsState;
  authorId: string;
  updatedById: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export interface CmsRepository {
  getPublished(locale: CmsLocale, slug: string): Promise<CmsPage | null>;
  getDraft(pageId: string): Promise<CmsPage | null>;
  createDraft(input: CmsPageInput, actorId: string): Promise<CmsPage>;
  updateDraft(pageId: string, input: CmsPageInput, actorId: string): Promise<CmsPage>;
  submitForReview(pageId: string, actorId: string): Promise<CmsPage>;
  publish(pageId: string, actorId: string): Promise<CmsPage>;
  rollback(pageId: string, revisionId: string, actorId: string): Promise<CmsPage>;
}

export function selectPublishedPage(pages: readonly CmsPage[], locale: CmsLocale, slug: string) {
  return (
    pages.find(
      (page) => page.state === "published" && page.locale === locale && page.slug === slug,
    ) ?? null
  );
}
