"use server";

import { cmsMediaFilePermissions, isCmsMediaFileBoundary } from "@umoja/appwrite/permissions";
import { requireWorkspaceCapability } from "@/lib/appwrite/auth";
import { createRuntimeServices } from "@/lib/appwrite/admin";
import { getAppwriteConfig } from "@/lib/appwrite/config";
import { createSessionServices } from "@/lib/appwrite/session";
import { createCmsEditorRepository } from "@/lib/cms/service";

export async function updateMediaMetadata(locale: string, pageId: string, form: FormData) {
  const user = await requireWorkspaceCapability("cms.manage", locale);
  const session = await createSessionServices();
  if (!session) throw new Error("Session unavailable");
  const repository = createCmsEditorRepository(session.tables);
  const page = await repository.getDraft(pageId);
  if (!page) throw new Error("Media record not found");
  const altEn = String(form.get("altEn") ?? "").trim();
  const altFr = String(form.get("altFr") ?? "").trim();
  const consentState = String(form.get("consentState") ?? "not-required");
  const usageReferences = String(form.get("usageReferences") ?? "")
    .split("\n")
    .map((value) => value.trim())
    .filter(Boolean);
  const updated = await repository.updateDraft(
    page.id,
    {
      ...page,
      seoDescription: altEn,
      blocks: page.blocks.map((block) =>
        block.type === "media-metadata"
          ? {
              ...block,
              altEn,
              altFr,
              usageReferences,
              consentState:
                consentState === "recorded" || consentState === "revoked"
                  ? consentState
                  : "not-required",
            }
          : block,
      ),
    },
    user.id,
    "Bilingual media metadata updated",
  );
  if (consentState === "revoked" && page.currentRevisionId) {
    const metadata = updated.blocks.find((block) => block.type === "media-metadata");
    if (metadata?.type === "media-metadata") {
      const runtime = createRuntimeServices();
      await runtime.storage.updateFile({
        bucketId: getAppwriteConfig().buckets.cmsMedia,
        fileId: metadata.fileId,
        permissions: cmsMediaFilePermissions(false),
      });
      await repository.unpublish(page.id, user.id);
    }
  }
}

export async function transitionMedia(
  locale: string,
  pageId: string,
  action: "submit" | "publish" | "unpublish",
) {
  const capability = action === "submit" ? "cms.manage" : "cms.publish";
  const user = await requireWorkspaceCapability(capability, locale);
  const session = await createSessionServices();
  if (!session) throw new Error("Session unavailable");
  const repository = createCmsEditorRepository(session.tables);
  const page = await repository.getDraft(pageId);
  const metadata = page?.blocks.find((block) => block.type === "media-metadata");
  if (!page || !metadata || metadata.type !== "media-metadata")
    throw new Error("Media record not found");
  if (metadata.consentState === "revoked" && action !== "unpublish")
    throw new Error("Media with revoked consent cannot enter review or publication");
  const runtime = createRuntimeServices();
  const bucketId = getAppwriteConfig().buckets.cmsMedia;
  const file = await runtime.storage.getFile({ bucketId, fileId: metadata.fileId });
  if (!isCmsMediaFileBoundary(file)) throw new Error("File is outside the CMS media boundary");
  if (action === "submit") await repository.submitForReview(page.id, user.id);
  if (action === "publish") {
    await repository.publish(page.id, user.id);
    await runtime.storage.updateFile({
      bucketId,
      fileId: metadata.fileId,
      permissions: cmsMediaFilePermissions(true),
    });
  }
  if (action === "unpublish") {
    await runtime.storage.updateFile({
      bucketId,
      fileId: metadata.fileId,
      permissions: cmsMediaFilePermissions(false),
    });
    await repository.unpublish(page.id, user.id);
  }
}
