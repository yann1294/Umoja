"use server";

import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseCmsEditorRepository } from "@/lib/cms/service";
import {
  publishCmsMediaDerivative,
  removePublishedCmsMediaDerivative,
} from "@/lib/cms/supabase-media";

export async function updateMediaMetadata(locale: string, pageId: string, form: FormData) {
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const repository = await createSupabaseCmsEditorRepository();
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
      await removePublishedCmsMediaDerivative(await createSupabaseServerClient(), metadata.fileId);
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
  const user = await requireSupabaseWorkspaceCapability(capability, locale);
  const repository = await createSupabaseCmsEditorRepository();
  const page = await repository.getDraft(pageId);
  const metadata = page?.blocks.find((block) => block.type === "media-metadata");
  if (!page || !metadata || metadata.type !== "media-metadata")
    throw new Error("Media record not found");
  if (metadata.consentState === "revoked" && action !== "unpublish")
    throw new Error("Media with revoked consent cannot enter review or publication");
  if (action === "submit") await repository.submitForReview(page.id, user.id);
  if (action === "publish") {
    await publishCmsMediaDerivative(await createSupabaseServerClient(), metadata.fileId);
    await repository.publish(page.id, user.id);
  }
  if (action === "unpublish") {
    await removePublishedCmsMediaDerivative(await createSupabaseServerClient(), metadata.fileId);
    await repository.unpublish(page.id, user.id);
  }
}
