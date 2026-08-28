import "server-only";

import { rolesHaveCapability } from "@/lib/auth/policy";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerPrincipal } from "@/lib/supabase/auth";
import { SupabaseCmsRepository } from "@/lib/cms/supabase-repository";
import {
  cmsMediaMaximumBytes,
  cmsMediaTypes,
  validCmsMediaSignature,
} from "@/lib/cms/supabase-media";

const notFound = () =>
  new Response("Not found", {
    status: 404,
    headers: { "Cache-Control": "no-store, private", "Referrer-Policy": "no-referrer" },
  });

/**
 * Delivers an editorial source only after the current Supabase SSR principal and RLS have both
 * approved it. Object paths stay exclusively inside this server boundary.
 */
export async function GET(
  _request: Request,
  { params }: Readonly<{ params: Promise<{ assetKey: string }> }>,
) {
  const { assetKey } = await params;
  if (!/^[a-z0-9-]{16,64}$/.test(assetKey)) return notFound();
  const principal = await getSupabaseServerPrincipal();
  if (
    !principal ||
    !principal.membershipActive ||
    !rolesHaveCapability(principal.roles, "cms.manage")
  )
    return notFound();
  const client = await createSupabaseServerClient();
  const { data: row } = await client
    .from("cms_pages")
    .select("id")
    .eq("stable_key", `media:${assetKey}`)
    .eq("locale", "en")
    .maybeSingle();
  if (!row?.id) return notFound();
  const page = await new SupabaseCmsRepository(client).getDraft(row.id);
  const metadata = page?.blocks.find(
    (block) => block.type === "media-metadata" && block.assetKey === assetKey,
  );
  if (!metadata || metadata.type !== "media-metadata" || !cmsMediaTypes.has(metadata.mimeType))
    return notFound();
  const { data, error } = await client.storage.from("cms-private").download(metadata.fileId);
  if (error || !data || data.size < 1 || data.size > cmsMediaMaximumBytes) return notFound();
  const bytes = new Uint8Array(await data.arrayBuffer());
  if (!validCmsMediaSignature(metadata.mimeType, bytes)) return notFound();
  const extension = metadata.mimeType === "image/jpeg" ? "jpg" : metadata.mimeType.split("/")[1];
  return new Response(bytes, {
    headers: {
      "Content-Type": metadata.mimeType,
      "Content-Disposition": `attachment; filename="cms-source.${extension}"`,
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
