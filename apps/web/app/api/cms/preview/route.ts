import "server-only";

import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireSupabaseWorkspaceCapability } from "@/lib/supabase/auth";
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

/** Issues an opaque capability only after the SSR principal has passed CMS authorization. */
export async function POST(request: Request) {
  try {
    const input = cmsPreviewRequestSchema.parse(await request.json());
    await requireSupabaseWorkspaceCapability("cms.manage", input.locale);
    const token = createCmsPreviewToken();
    const expiresAt = new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString();
    const { error } = await (
      await createSupabaseServerClient()
    ).rpc(
      "issue_cms_preview_token" as never,
      {
        p_page_id: input.pageId,
        p_revision_id: input.revisionId,
        p_token_hash: hashCmsPreviewToken(token),
        p_expires_at: expiresAt,
      } as never,
    );
    if (error)
      return NextResponse.json(
        { error: "Preview unavailable." },
        { status: 403, headers: noStoreHeaders },
      );
    // The caller can send this one-time exchange URL directly. No final preview URL contains it.
    return NextResponse.json(
      {
        previewExchangePath: previewExchangePath({
          pageId: input.pageId,
          locale: input.locale,
          token,
        }),
      },
      { headers: noStoreHeaders },
    );
  } catch {
    return NextResponse.json(
      { error: "Preview unavailable." },
      { status: 400, headers: noStoreHeaders },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { pageId, locale } = cmsPreviewRequestSchema
      .pick({ pageId: true, locale: true })
      .parse(await request.json());
    await requireSupabaseWorkspaceCapability("cms.manage", locale);
    const { error } = await (
      await createSupabaseServerClient()
    ).rpc(
      "revoke_cms_preview_token" as never,
      {
        p_page_id: pageId,
      } as never,
    );
    if (error)
      return NextResponse.json(
        { error: "Preview unavailable." },
        { status: 403, headers: noStoreHeaders },
      );
    return new NextResponse(null, { status: 204, headers: noStoreHeaders });
  } catch {
    return NextResponse.json(
      { error: "Preview unavailable." },
      { status: 400, headers: noStoreHeaders },
    );
  }
}
