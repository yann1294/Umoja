import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { resolvePublishedPage, type CmsLocale, type CmsPage } from "@umoja/appwrite/cms";
import { createRuntimeServices } from "@/lib/appwrite/admin";
import { AppwriteCmsRepository } from "./repository";

export type StaticCmsFallback = Readonly<Record<string, CmsPage>>;

const lastKnownPublished = new Map<string, CmsPage | null>();

export async function getPublishedCmsPage(
  locale: CmsLocale,
  slug: string,
  fallback: StaticCmsFallback = {},
) {
  const key = `${locale}:${slug}`;
  const read = unstable_cache(
    async () =>
      new AppwriteCmsRepository(createRuntimeServices().tables).getPublished(locale, slug),
    ["cms-published", locale, slug],
    { revalidate: 300, tags: [`cms:${locale}:${slug}`] },
  );

  return resolvePublishedPage(key, read, lastKnownPublished, fallback[key] ?? null);
}

export function createCmsEditorRepository(
  tables: ConstructorParameters<typeof AppwriteCmsRepository>[0],
) {
  return new AppwriteCmsRepository(
    tables,
    async (page) => {
      revalidateTag(`cms:${page.locale}:${page.slug}`, "max");
      revalidatePath(page.slug === "home" ? `/${page.locale}` : `/${page.locale}/${page.slug}`);
    },
    createRuntimeServices().tables,
  );
}

export function cmsField(page: CmsPage | null, key: string, fallback: string) {
  const block = page?.blocks.find(
    (candidate) => candidate.type === "field" && candidate.key === key,
  );
  return block?.type === "field" ? block.value : fallback;
}
