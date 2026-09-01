import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { resolvePublishedPage, type CmsLocale, type CmsPage } from "./domain";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { SupabaseCmsRepository } from "./supabase-repository";

export type StaticCmsFallback = Readonly<Record<string, CmsPage>>;

const lastKnownPublished = new Map<string, CmsPage | null>();

export async function createSupabaseCmsEditorRepository() {
  return new SupabaseCmsRepository(await createSupabaseServerClient(), async (page) => {
    revalidateTag(`cms:${page.locale}:${page.slug}`, "max");
    revalidatePath(page.slug === "home" ? `/${page.locale}` : `/${page.locale}/${page.slug}`);
  });
}

export async function getSupabasePublishedCmsPage(
  locale: CmsLocale,
  slug: string,
  fallback: StaticCmsFallback = {},
) {
  const key = `${locale}:${slug}`;
  const tag = `cms:${locale}:${slug}`;
  const read = unstable_cache(
    async () => new SupabaseCmsRepository(createSupabasePublicClient()).getPublished(locale, slug),
    ["supabase-cms-published", locale, slug],
    { revalidate: 300, tags: [tag] },
  );
  return resolvePublishedPage(key, read, lastKnownPublished, fallback[key] ?? null);
}

export function cmsField(page: CmsPage | null, key: string, fallback: string) {
  const block = page?.blocks.find(
    (candidate) => candidate.type === "field" && candidate.key === key,
  );
  return block?.type === "field" ? block.value : fallback;
}
