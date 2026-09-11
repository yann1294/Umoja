import { z } from "zod";

const safeText = (limit: number) =>
  z
    .string()
    .trim()
    .min(1)
    .max(limit)
    .refine((value) => !/<\/?[a-z][^>]*>/i.test(value), "HTML is not allowed in CMS text.");

const safeHref = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) => value.startsWith("/") || /^https:\/\//i.test(value) || /^mailto:/i.test(value),
    "Links must be internal paths, HTTPS URLs, or email links.",
  );

export const cmsContentKindSchema = z.enum([
  "homepage",
  "service",
  "case-study",
  "talent-profile",
  "organization",
  "africit-resource",
  "africit-workshop",
  "about",
  "manifesto",
  "navigation",
  "call-to-action",
  "media",
]);

export const cmsBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: safeText(300),
  }),
  z.object({ type: z.literal("paragraph"), text: safeText(5000) }),
  z.object({ type: z.literal("callout"), title: safeText(200), text: safeText(2000) }),
  z.object({ type: z.literal("link"), label: safeText(200), href: safeHref }),
  z.object({
    type: z.literal("field"),
    key: z
      .string()
      .regex(/^[a-z][a-z0-9._-]*$/)
      .max(128),
    label: safeText(200),
    value: safeText(5000),
  }),
  z.object({
    type: z.literal("media"),
    assetKey: z
      .string()
      .regex(/^[a-z0-9][a-z0-9._-]*$/)
      .max(128),
    alt: safeText(500),
    caption: safeText(1000).optional(),
  }),
  z.object({
    type: z.literal("publication-consent"),
    recordedAt: z.iso.datetime(),
    reference: z.string().trim().min(1).max(128),
  }),
  z.object({
    type: z.literal("media-metadata"),
    assetKey: z
      .string()
      .regex(/^[a-z0-9][a-z0-9._-]*$/)
      .max(128),
    fileId: z.string().min(1).max(64),
    fileName: safeText(256),
    mimeType: z.enum(["image/png", "image/jpeg", "image/webp"]),
    size: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    altEn: safeText(500),
    altFr: safeText(500),
    ownerId: z.string().min(1).max(64),
    usageReferences: z.array(z.string().min(1).max(512)).max(100),
    consentState: z.enum(["not-required", "recorded", "revoked"]),
    visibility: z.enum(["private", "published"]),
  }),
]);

export const cmsBlocksSchema = z.array(cmsBlockSchema).min(1).max(100);
export const cmsStateSchema = z.enum(["draft", "review", "published", "archived"]);
export const cmsLocaleSchema = z.enum(["en", "fr"]);
export const cmsPageInputSchema = z.object({
  stableKey: z
    .string()
    .regex(/^[a-z][a-z0-9._:-]*$/)
    .max(128),
  translationGroupId: z.string().min(1).max(64),
  locale: cmsLocaleSchema,
  slug: z
    .string()
    .regex(/^[a-z0-9][a-z0-9\/-]*$/)
    .max(512),
  title: safeText(256),
  seoTitle: safeText(256).optional(),
  seoDescription: safeText(512).optional(),
  blocks: cmsBlocksSchema,
});

export type CmsBlock = z.infer<typeof cmsBlockSchema>;
export type CmsContentKind = z.infer<typeof cmsContentKindSchema>;
export type CmsPageInput = z.infer<typeof cmsPageInputSchema>;
export type CmsState = z.infer<typeof cmsStateSchema>;
export type CmsLocale = z.infer<typeof cmsLocaleSchema>;
export type CmsPage = CmsPageInput & {
  id: string;
  state: CmsState;
  authorId: string;
  updatedById: string;
  currentRevisionId?: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};
export type CmsRevision = CmsPageInput & {
  id: string;
  pageId: string;
  revisionNumber: number;
  state: CmsState;
  actorId: string;
  changeSummary: string;
  createdAt: string;
  publishedAt?: string;
};
export type CmsListFilters = Readonly<{ locale?: CmsLocale; state?: CmsState; query?: string }>;

export interface CmsRepository {
  list(filters?: CmsListFilters): Promise<readonly CmsPage[]>;
  getPublished(locale: CmsLocale, slug: string): Promise<CmsPage | null>;
  getDraft(pageId: string): Promise<CmsPage | null>;
  listRevisions(pageId: string): Promise<readonly CmsRevision[]>;
  createDraft(input: CmsPageInput, actorId: string): Promise<CmsPage>;
  updateDraft(
    pageId: string,
    input: CmsPageInput,
    actorId: string,
    summary?: string,
  ): Promise<CmsPage>;
  submitForReview(pageId: string, actorId: string): Promise<CmsPage>;
  publish(pageId: string, actorId: string): Promise<CmsPage>;
  unpublish(pageId: string, actorId: string): Promise<CmsPage>;
  archive(pageId: string, actorId: string): Promise<CmsPage>;
  restore(pageId: string, actorId: string): Promise<CmsPage>;
  rollback(pageId: string, revisionId: string, actorId: string): Promise<CmsPage>;
}

export function contentKindFor(page: Pick<CmsPageInput, "stableKey">): CmsContentKind {
  return cmsContentKindSchema.catch("about").parse(page.stableKey.split(":", 1)[0]);
}
export function isGovernanceControlled(page: Pick<CmsPageInput, "stableKey" | "slug">) {
  return /(^|[:/.-])(governance|legal|privacy|terms)([:/.-]|$)/i.test(
    `${page.stableKey}:${page.slug}`,
  );
}
export function hasPublicationConsent(page: Pick<CmsPageInput, "blocks" | "stableKey">) {
  const kind = contentKindFor(page);
  return kind !== "case-study" && kind !== "talent-profile"
    ? true
    : page.blocks.some((block) => block.type === "publication-consent");
}
export function assertPublishable(page: CmsPageInput) {
  if (isGovernanceControlled(page))
    throw new Error("Governance-controlled content cannot be published through the CMS.");
  if (!hasPublicationConsent(page))
    throw new Error("Recorded publication consent is required before review or publication.");
}
export async function resolvePublishedPage(
  key: string,
  load: () => Promise<CmsPage | null>,
  lastKnown: Map<string, CmsPage | null>,
  fallback: CmsPage | null,
) {
  try {
    const page = await load();
    lastKnown.set(key, page);
    return page;
  } catch {
    return lastKnown.has(key) ? (lastKnown.get(key) ?? null) : fallback;
  }
}
