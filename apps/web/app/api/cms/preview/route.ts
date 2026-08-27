import "server-only";

import { rolesHaveCapability } from "@umoja/appwrite";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServerPrincipal } from "@/lib/supabase/auth";
import {
  cmsPreviewRequestSchema,
  createCmsPreviewToken,
  hashCmsPreviewToken,
  previewExchangePath,
} from "@/lib/cms/supabase-preview";

const noStoreHeaders = {
  "Cache-Control": "no-store, private",
  "Referrer-Policy": "no-referrer",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
};

function failure(status: number) {
  return NextResponse.json({ error: "Preview unavailable." }, { status, headers: noStoreHeaders });
}

async function canManagePreview() {
  const principal = await getSupabaseServerPrincipal();
  return principal?.membershipActive && rolesHaveCapability(principal.roles, "cms.manage")
    ? principal
    : null;
}

/** Issues an opaque capability only after the SSR principal has passed CMS authorization. */
export async function POST(request: Request) {
  try {
    const input = cmsPreviewRequestSchema.safeParse(await request.json());
    if (!input.success) return failure(400);
    const principal = await canManagePreview();
    if (!principal) return failure(403);
    const token = createCmsPreviewToken();
    const expiresAt = new Date(Date.now() + input.data.expiresInMinutes * 60_000).toISOString();
    const { error } = await (
      await createSupabaseServerClient()
    ).rpc(
      "issue_cms_preview_token" as never,
      {
        p_page_id: input.data.pageId,
        p_revision_id: input.data.revisionId,
        p_token_hash: hashCmsPreviewToken(token),
        p_expires_at: expiresAt,
      } as never,
    );
    if (error) return failure(403);
    // The caller can send this one-time exchange URL directly. No final preview URL contains it.
    return NextResponse.json(
      {
        previewExchangePath: previewExchangePath({
          pageId: input.data.pageId,
          locale: input.data.locale,
          token,
        }),
      },
      { headers: noStoreHeaders },
    );
  } catch {
    return failure(400);
  }
}

export async function DELETE(request: Request) {
  try {
    const input = cmsPreviewRequestSchema
      .pick({ pageId: true, locale: true })
      .safeParse(await request.json());
    if (!input.success) return failure(400);
    const principal = await canManagePreview();
    if (!principal) return failure(403);
    const { error } = await (
      await createSupabaseServerClient()
    ).rpc(
      "revoke_cms_preview_token" as never,
      {
        p_page_id: input.data.pageId,
      } as never,
    );
    if (error) return failure(403);
    return new NextResponse(null, { status: 204, headers: noStoreHeaders });
  } catch {
    return failure(400);
  }
}
