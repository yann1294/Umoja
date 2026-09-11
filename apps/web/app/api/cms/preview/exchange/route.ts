import "server-only";

import { NextResponse } from "next/server";
import { cmsPreviewCookie, validateCmsPreviewCapability } from "@/lib/cms/supabase-preview";

const notFound = () =>
  new NextResponse("Not found", {
    status: 404,
    headers: {
      "Cache-Control": "no-store, private",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });

/** Exchanges the URL capability for a narrowly scoped, HttpOnly cookie and immediately removes it from history. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale");
  const pageId = url.searchParams.get("pageId");
  const token = url.searchParams.get("token");
  if ((locale !== "en" && locale !== "fr") || !pageId || !token) return notFound();
  const binding = await validateCmsPreviewCapability({ pageId, locale, token });
  if (!binding || binding.pageId !== pageId) return notFound();
  const cleanPreviewPath = `/${locale}/preview/${pageId}`;
  const response = NextResponse.redirect(new URL(cleanPreviewPath, url.origin), 303);
  // Keep the capability exchange on the browser's current origin. Next may
  // normalize request.url to APP_URL behind a local or reverse proxy; an
  // absolute redirect would then strand this host-only preview cookie.
  response.headers.set("Location", cleanPreviewPath);
  response.headers.set("Cache-Control", "no-store, private");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
  response.cookies.set(
    cmsPreviewCookie.name,
    `${pageId}:${token}`,
    cmsPreviewCookie.options(locale, pageId, 24 * 60 * 60),
  );
  return response;
}
