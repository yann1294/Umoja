import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const idSchema = z.string().uuid();
const localeSchema = z.enum(["en", "fr"]);
const previewCookieName = "umoja_cms_preview";

export const cmsPreviewRequestSchema = z.object({
  pageId: idSchema,
  revisionId: idSchema,
  locale: localeSchema,
  expiresInMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60)
    .default(30),
});

export type CmsPreviewRequest = z.infer<typeof cmsPreviewRequestSchema>;

export function hashCmsPreviewToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createCmsPreviewToken() {
  return randomBytes(32).toString("base64url");
}

export async function validateCmsPreviewCapability(input: {
  pageId: string;
  locale: string;
  token: string;
}) {
  const pageId = idSchema.safeParse(input.pageId);
  const locale = localeSchema.safeParse(input.locale);
  const token = tokenSchema.safeParse(input.token);
  if (!pageId.success || !locale.success || !token.success) return null;
  const { data, error } = await createSupabaseAdminClient().rpc(
    "validate_cms_preview_token" as never,
    {
      p_page_id: pageId.data,
      p_locale: locale.data,
      p_token_hash: hashCmsPreviewToken(token.data),
    } as never,
  );
  const result = data as unknown;
  if (error || !Array.isArray(result) || result.length !== 1) return null;
  const binding = result[0] as { page_id: string; revision_id: string | null };
  return binding.revision_id ? { pageId: binding.page_id, revisionId: binding.revision_id } : null;
}

export function previewExchangePath(input: { pageId: string; locale: "en" | "fr"; token: string }) {
  const query = new URLSearchParams({
    pageId: input.pageId,
    locale: input.locale,
    token: input.token,
  });
  return `/api/cms/preview/exchange?${query.toString()}`;
}

export async function readCmsPreviewCookie(pageId: string) {
  const cookie = (await cookies()).get(previewCookieName)?.value;
  if (!cookie) return null;
  const [boundPageId, token] = cookie.split(":", 2);
  if (boundPageId !== pageId || !token) return null;
  return tokenSchema.safeParse(token).success ? token : null;
}

export const cmsPreviewCookie = {
  name: previewCookieName,
  options: (locale: "en" | "fr", pageId: string, maxAge: number) => ({
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: `/${locale}/preview/${pageId}`,
    maxAge,
  }),
};
