"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  cmsBlocksSchema,
  cmsPageInputSchema,
  type CmsBlock,
  type CmsPageInput,
} from "@/lib/cms/domain";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
import { createSupabaseCmsEditorRepository } from "@/lib/cms/service";

export type CmsActionState = Readonly<{
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}>;

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function parseBlocks(form: FormData): CmsBlock[] {
  const preserved = text(form, "preservedBlocks");
  const blocks: CmsBlock[] = preserved ? cmsBlocksSchema.parse(JSON.parse(preserved)) : [];
  for (const key of [
    "hero.eyebrow",
    "hero.title",
    "hero.introduction",
    "hero.primaryAction",
    "hero.secondaryAction",
  ] as const) {
    const value = text(form, key);
    if (value) blocks.push({ type: "field", key, label: key.split(".").at(-1) ?? key, value });
  }
  const body = text(form, "body");
  for (const paragraph of body
    .split(/\n\s*\n/)
    .map((value) => value.trim())
    .filter(Boolean)) {
    blocks.push({ type: "paragraph", text: paragraph });
  }
  const consentReference = text(form, "consentReference");
  const consentRecordedAt = text(form, "consentRecordedAt");
  if (consentReference && consentRecordedAt) {
    const recordedAt = new Date(consentRecordedAt);
    if (!Number.isNaN(recordedAt.getTime())) {
      blocks.push({
        type: "publication-consent",
        recordedAt: recordedAt.toISOString(),
        reference: consentReference,
      });
    }
  }
  return blocks.length ? blocks : [{ type: "paragraph", text: text(form, "title") }];
}

function inputFrom(form: FormData): CmsPageInput {
  return cmsPageInputSchema.parse({
    stableKey: text(form, "stableKey"),
    translationGroupId: text(form, "translationGroupId"),
    locale: text(form, "contentLocale"),
    slug: text(form, "slug").replace(/^\/+|\/+$/g, "") || "home",
    title: text(form, "title"),
    seoTitle: text(form, "seoTitle") || undefined,
    seoDescription: text(form, "seoDescription") || undefined,
    blocks: parseBlocks(form),
  });
}

async function editor(locale: string) {
  const user = await requireSupabaseWorkspaceCapability("cms.manage", locale);
  return { user, repository: await createSupabaseCmsEditorRepository() };
}

function safeFailure(error: unknown, locale: string): CmsActionState {
  const validation = error as { flatten?: () => { fieldErrors: Record<string, string[]> } };
  return {
    ok: false,
    message:
      locale === "fr"
        ? "Corrigez les champs signalés et réessayez."
        : "Correct the highlighted fields and try again.",
    ...(typeof validation.flatten === "function"
      ? { fieldErrors: validation.flatten().fieldErrors }
      : {}),
  };
}

export async function createContent(
  locale: string,
  _previous: CmsActionState,
  form: FormData,
): Promise<CmsActionState> {
  try {
    const { user, repository } = await editor(locale);
    const page = await repository.createDraft(inputFrom(form), user.id);
    redirect(`/${locale}/admin/content/${page.id}/edit`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw error;
    return safeFailure(error, locale);
  }
}

export async function saveContent(
  locale: string,
  pageId: string,
  _previous: CmsActionState,
  form: FormData,
): Promise<CmsActionState> {
  try {
    const { user, repository } = await editor(locale);
    await repository.updateDraft(
      pageId,
      inputFrom(form),
      user.id,
      text(form, "changeSummary") || "Editorial draft saved",
    );
    revalidatePath(`/${locale}/admin/content/${pageId}/edit`);
    return { ok: true, message: locale === "fr" ? "Brouillon enregistré." : "Draft saved." };
  } catch (error) {
    return safeFailure(error, locale);
  }
}

export async function transitionContent(locale: string, pageId: string, action: string) {
  let user = await requireSupabaseWorkspaceCapability(
    action === "publish" || action === "unpublish" ? "cms.publish" : "cms.manage",
    locale,
  );
  const repository = await createSupabaseCmsEditorRepository();
  if (action === "archive" && (await repository.getDraft(pageId))?.currentRevisionId) {
    user = await requireSupabaseWorkspaceCapability("cms.publish", locale);
  }
  if (action === "submit") await repository.submitForReview(pageId, user.id);
  else if (action === "publish") await repository.publish(pageId, user.id);
  else if (action === "unpublish") await repository.unpublish(pageId, user.id);
  else if (action === "archive") await repository.archive(pageId, user.id);
  else if (action === "restore") await repository.restore(pageId, user.id);
  else throw new Error("Unsupported content action");
  revalidatePath(`/${locale}/admin/content`);
  revalidatePath(`/${locale}/admin/content/${pageId}/edit`);
}

export async function rollbackContent(locale: string, pageId: string, revisionId: string) {
  const { user, repository } = await editor(locale);
  await repository.rollback(pageId, revisionId, user.id);
  revalidatePath(`/${locale}/admin/content/${pageId}/edit`);
}
