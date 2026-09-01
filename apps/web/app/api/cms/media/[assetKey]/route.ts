import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabasePublicClient } from "@/lib/supabase/public";
import { SupabaseCmsRepository } from "@/lib/cms/supabase-repository";

export async function GET(
  _request: Request,
  { params }: Readonly<{ params: Promise<{ assetKey: string }> }>,
) {
  const { assetKey } = await params;
  if (!/^[a-z0-9-]{16,64}$/.test(assetKey)) return new Response("Not found", { status: 404 });
  const publicClient = createSupabasePublicClient();
  const { data: row } = await publicClient
    .from("cms_pages")
    .select("slug")
    .eq("stable_key", `media:${assetKey}`)
    .eq("locale", "en")
    .eq("state", "published")
    .not("current_revision_id", "is", null)
    .maybeSingle();
  if (!row?.slug) return new Response("Not found", { status: 404 });
  const page = await new SupabaseCmsRepository(publicClient).getPublished("en", row.slug);
  const metadata = page?.blocks.find(
    (block) => block.type === "media-metadata" && block.assetKey === assetKey,
  );
  if (!metadata || metadata.type !== "media-metadata" || metadata.visibility !== "published")
    return new Response("Not found", { status: 404 });
  // The service client is a deliberately narrow privileged boundary: publication is proven above
  // through anonymous RLS before it reads the otherwise private Storage bucket.
  const { data, error } = await createSupabaseAdminClient()
    .storage.from("cms-public")
    .download(metadata.fileId);
  if (error) return new Response("Not found", { status: 404 });
  return new Response(data, {
    headers: {
      "Content-Type": metadata.mimeType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
