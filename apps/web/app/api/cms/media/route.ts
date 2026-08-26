import "server-only";

import { randomUUID } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseCmsEditorRepository } from "@/lib/cms/service";
import {
  cmsMediaMaximumBytes,
  cmsMediaTypes,
  uploadPrivateCmsMedia,
  validCmsMediaSignature,
} from "@/lib/cms/supabase-media";

export async function POST(request: Request) {
  const form = await request.formData();
  const locale = form.get("locale") === "fr" ? "fr" : "en";
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const file = form.get("file");
  const altEn = String(form.get("altEn") ?? "").trim();
  const altFr = String(form.get("altFr") ?? "").trim();
  const consentState = form.get("consentState") === "recorded" ? "recorded" : "not-required";
  if (
    !(file instanceof File) ||
    !cmsMediaTypes.has(file.type) ||
    file.size < 1 ||
    file.size > cmsMediaMaximumBytes ||
    !altEn ||
    !altFr
  ) {
    return Response.json(
      {
        error: locale === "fr" ? "Fichier ou métadonnées invalides." : "Invalid file or metadata.",
      },
      { status: 400 },
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validCmsMediaSignature(file.type, bytes))
    return Response.json(
      {
        error:
          locale === "fr"
            ? "La signature du fichier ne correspond pas à son type."
            : "The file signature does not match its type.",
      },
      { status: 400 },
    );

  const assetKey = randomUUID();
  const client = await createSupabaseServerClient();
  const fileId = await uploadPrivateCmsMedia(client, bytes, file.type as "image/png" | "image/jpeg" | "image/webp");
  try {
    const page = await (await createSupabaseCmsEditorRepository()).createDraft(
      {
        stableKey: `media:${assetKey}`,
        translationGroupId: assetKey,
        locale: "en",
        slug: `media/${assetKey}`,
        title: file.name,
        seoDescription: altEn,
        blocks: [
          {
            type: "media-metadata",
            assetKey,
            fileId,
            fileName: file.name,
            mimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
            size: file.size,
            altEn,
            altFr,
            ownerId: user.id,
            usageReferences: [],
            consentState,
            visibility: "published",
          },
        ],
      },
      user.id,
    );
    return Response.json({ id: page.id, assetKey }, { status: 201 });
  } catch {
    await createSupabaseAdminClient().storage.from("cms-private").remove([fileId]).catch(() => undefined);
    return Response.json(
      {
        error:
          locale === "fr"
            ? "Le média n’a pas pu être enregistré."
            : "The media could not be saved.",
      },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const form = await request.formData();
  const locale = form.get("locale") === "fr" ? "fr" : "en";
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  const pageId = String(form.get("pageId") ?? "");
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !cmsMediaTypes.has(file.type) ||
    file.size < 1 ||
    file.size > cmsMediaMaximumBytes
  ) {
    return Response.json(
      {
        error: locale === "fr" ? "Fichier de remplacement invalide." : "Invalid replacement file.",
      },
      { status: 400 },
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validCmsMediaSignature(file.type, bytes)) {
    return Response.json(
      {
        error:
          locale === "fr"
            ? "La signature du fichier ne correspond pas à son type."
            : "The file signature does not match its type.",
      },
      { status: 400 },
    );
  }
  const repository = await createSupabaseCmsEditorRepository();
  const page = await repository.getDraft(pageId);
  const metadata = page?.blocks.find((block) => block.type === "media-metadata");
  if (!page || !metadata || metadata.type !== "media-metadata") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const fileId = await uploadPrivateCmsMedia(
    await createSupabaseServerClient(),
    bytes,
    file.type as "image/png" | "image/jpeg" | "image/webp",
  );
  try {
    await repository.updateDraft(
      page.id,
      {
        ...page,
        title: file.name,
        blocks: page.blocks.map((block) =>
          block.type === "media-metadata"
            ? {
                ...block,
                fileId,
                fileName: file.name,
                mimeType: file.type as "image/png" | "image/jpeg" | "image/webp",
                size: file.size,
              }
            : block,
        ),
      },
      user.id,
      "Media file replaced; prior file retained for published references",
    );
    return Response.json({ replaced: true });
  } catch {
    await createSupabaseAdminClient().storage.from("cms-private").remove([fileId]).catch(() => undefined);
    return Response.json(
      {
        error:
          locale === "fr"
            ? "Le remplacement n’a pas pu être enregistré."
            : "The replacement could not be saved.",
      },
      { status: 503 },
    );
  }
}
