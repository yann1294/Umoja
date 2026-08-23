import "server-only";

import { unstable_cache, revalidatePath } from "next/cache";
import type { CmsLocale, CmsPage } from "@umoja/appwrite/cms";
import { createRuntimeServices } from "@/lib/appwrite/admin";
import { AppwriteCmsRepository } from "./repository";

export type StaticCmsFallback = Readonly<Record<string, CmsPage>>;

export async function getPublishedCmsPage(
  locale: CmsLocale,
  slug: string,
  fallback: StaticCmsFallback,
) {
  const read = unstable_cache(
    async () => {
      try {
        return await new AppwriteCmsRepository(createRuntimeServices().tables).getPublished(
          locale,
          slug,
        );
      } catch {
        return null;
      }
    },
    ["cms-published", locale, slug],
    { revalidate: 300, tags: [`cms:${locale}:${slug}`] },
  );
  return (await read()) ?? fallback[`${locale}:${slug}`] ?? null;
}

export function createCmsEditorRepository(
  tables: ConstructorParameters<typeof AppwriteCmsRepository>[0],
) {
  return new AppwriteCmsRepository(tables, async (page) => {
    revalidatePath(`/${page.locale}/${page.slug}`);
  });
}
