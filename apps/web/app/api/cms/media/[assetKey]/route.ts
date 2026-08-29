import "server-only";

import { Query } from "node-appwrite";
import { isCmsMediaFileBoundary } from "@umoja/appwrite/permissions";
import { createRuntimeServices } from "@/lib/appwrite/admin";
import { getAppwriteConfig } from "@/lib/appwrite/config";
import { AppwriteCmsRepository } from "@/lib/cms/repository";

export async function GET(
  _request: Request,
  { params }: Readonly<{ params: Promise<{ assetKey: string }> }>,
) {
  const { assetKey } = await params;
  if (!/^[a-z0-9-]{16,64}$/.test(assetKey)) return new Response("Not found", { status: 404 });
  const runtime = createRuntimeServices();
  const config = getAppwriteConfig();
  const rows = await runtime.tables.listRows({
    databaseId: config.databaseId,
    tableId: config.tables.cmsPages,
    queries: [
      Query.equal("stableKey", [`media:${assetKey}`]),
      Query.equal("locale", ["en"]),
      Query.limit(1),
    ],
    total: false,
  });
  const row = rows.rows[0] as { currentRevisionId?: string; slug?: string } | undefined;
  if (!row?.currentRevisionId || !row.slug) return new Response("Not found", { status: 404 });
  const page = await new AppwriteCmsRepository(runtime.tables).getPublished("en", row.slug);
  const metadata = page?.blocks.find(
    (block) => block.type === "media-metadata" && block.assetKey === assetKey,
  );
  if (!metadata || metadata.type !== "media-metadata" || metadata.visibility !== "published")
    return new Response("Not found", { status: 404 });
  const file = await runtime.storage.getFile({
    bucketId: config.buckets.cmsMedia,
    fileId: metadata.fileId,
  });
  if (!isCmsMediaFileBoundary(file)) return new Response("Not found", { status: 404 });
  const data = await runtime.storage.getFileView({
    bucketId: config.buckets.cmsMedia,
    fileId: metadata.fileId,
  });
  return new Response(data, {
    headers: {
      "Content-Type": metadata.mimeType,
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}
