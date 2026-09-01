import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { PRIVATE_RESPONSE_HEADERS } from "./lib/http/private-response";
import { refreshSupabaseRequest } from "./lib/supabase/refresh";

const intlMiddleware = createMiddleware(routing);

function isSupabaseCmsMediaPath(pathname: string) {
  return (
    /^\/(en|fr)\/admin\/content(?:\/|$)/.test(pathname) ||
    /^\/api\/cms\/(?:media|preview)(?:\/|$)/.test(pathname)
  );
}

function isSupabaseIntakeAdminPath(pathname: string) {
  return (
    /^\/(en|fr)\/admin\/intake(?:\/|$)/.test(pathname) ||
    /^\/api\/intake\/admin(?:\/|$)/.test(pathname)
  );
}

function isCanonicalSupabaseWorkspacePath(pathname: string) {
  return /^\/(en|fr)\/(?:workspace|admin)(?:\/|$)/.test(pathname);
}

function isPrivateResponsePath(pathname: string) {
  return (
    isCanonicalSupabaseWorkspacePath(pathname) ||
    pathname === "/api/cms/media" ||
    /^\/api\/cms\/media\/private(?:\/|$)/.test(pathname) ||
    /^\/api\/cms\/preview(?:\/|$)/.test(pathname) ||
    /^\/api\/intake\/admin(?:\/|$)/.test(pathname)
  );
}

/** Migrated protected route groups refresh the one canonical Supabase session per request. */
export default async function proxy(request: NextRequest) {
  const supabaseRoute =
    isSupabaseCmsMediaPath(request.nextUrl.pathname) ||
    isSupabaseIntakeAdminPath(request.nextUrl.pathname) ||
    isCanonicalSupabaseWorkspacePath(request.nextUrl.pathname);
  const response = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.next({ request })
    : intlMiddleware(request);
  const result = supabaseRoute
    ? (await refreshSupabaseRequest(request, response)).response
    : response;
  if (
    isPrivateResponsePath(request.nextUrl.pathname) ||
    /^\/(en|fr)\/preview\/[0-9a-f-]{36}$/.test(request.nextUrl.pathname)
  ) {
    for (const [key, value] of Object.entries(PRIVATE_RESPONSE_HEADERS)) {
      result.headers.set(key, value);
    }
  }
  return result;
}

export const config = {
  matcher: [
    "/((?!api|trpc|_next|_vercel|design-system|.*\\..*).*)",
    "/api/cms/media/:path*",
    "/api/cms/preview/:path*",
    "/api/intake/admin/:path*",
  ],
};
