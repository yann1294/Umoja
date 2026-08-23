import "server-only";

import { randomUUID } from "node:crypto";
import { ID } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import { cmsMediaFilePermissions } from "@umoja/appwrite/permissions";
import { requireWorkspaceCapability } from "@/lib/appwrite/auth";
import { createRuntimeServices } from "@/lib/appwrite/admin";
import { getAppwriteConfig } from "@/lib/appwrite/config";
import { createSessionServices } from "@/lib/appwrite/session";
import { createCmsEditorRepository } from "@/lib/cms/service";

const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maximumBytes = 10 * 1024 * 1024;

function validSignature(type: string, bytes: Uint8Array) {
  if (type === "image/png")
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (type === "image/webp")
    return (
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP"
    );
  return false;
}

export async function POST(request: Request) {
  const form = await request.formData();
  const locale = form.get("locale") === "fr" ? "fr" : "en";
  const user = await requireWorkspaceCapability("cms.manage", locale);
  const file = form.get("file");
  const altEn = String(form.get("altEn") ?? "").trim();
  const altFr = String(form.get("altFr") ?? "").trim();
  const consentState = form.get("consentState") === "recorded" ? "recorded" : "not-required";
  if (
    !(file instanceof File) ||
    !allowedTypes.has(file.type) ||
    file.size < 1 ||
    file.size > maximumBytes ||
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
  if (!validSignature(file.type, bytes))
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
  const fileId = ID.unique();
  const config = getAppwriteConfig();
  const runtime = createRuntimeServices();
  await runtime.storage.createFile({
    bucketId: config.buckets.cmsMedia,
    fileId,
    file: InputFile.fromBuffer(bytes, file.name),
    permissions: cmsMediaFilePermissions(false),
  });
  try {
    const session = await createSessionServices();
    if (!session) throw new Error("Session unavailable");
    const page = await createCmsEditorRepository(session.tables).createDraft(
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
    await runtime.storage
      .deleteFile({ bucketId: config.buckets.cmsMedia, fileId })
      .catch(() => undefined);
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
  const user = await requireWorkspaceCapability("cms.manage", locale);
  const pageId = String(form.get("pageId") ?? "");
  const file = form.get("file");
  if (
    !(file instanceof File) ||
    !allowedTypes.has(file.type) ||
    file.size < 1 ||
    file.size > maximumBytes
  ) {
    return Response.json(
      {
        error: locale === "fr" ? "Fichier de remplacement invalide." : "Invalid replacement file.",
      },
      { status: 400 },
    );
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!validSignature(file.type, bytes)) {
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
  const session = await createSessionServices();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const repository = createCmsEditorRepository(session.tables);
  const page = await repository.getDraft(pageId);
  const metadata = page?.blocks.find((block) => block.type === "media-metadata");
  if (!page || !metadata || metadata.type !== "media-metadata") {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  const fileId = ID.unique();
  const runtime = createRuntimeServices();
  const bucketId = getAppwriteConfig().buckets.cmsMedia;
  await runtime.storage.createFile({
    bucketId,
    fileId,
    file: InputFile.fromBuffer(bytes, file.name),
    permissions: cmsMediaFilePermissions(false),
  });
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
    await runtime.storage.deleteFile({ bucketId, fileId }).catch(() => undefined);
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
