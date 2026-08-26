import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";

import { routing } from "./i18n/routing";
import { refreshSupabaseRequest } from "./lib/supabase/refresh";

const intlMiddleware = createMiddleware(routing);

function isSupabaseCmsMediaPath(pathname: string) {
  return (
    /^\/(en|fr)\/admin\/content(?:\/|$)/.test(pathname) ||
    /^\/api\/cms\/media(?:\/|$)/.test(pathname)
  );
}

/** Only the atomically migrated CMS/media group refreshes Supabase session cookies. */
export default async function proxy(request: NextRequest) {
  const cmsMedia = isSupabaseCmsMediaPath(request.nextUrl.pathname);
  const response = request.nextUrl.pathname.startsWith("/api/")
    ? NextResponse.next({ request })
    : intlMiddleware(request);
  return cmsMedia ? (await refreshSupabaseRequest(request, response)).response : response;
}

export const config = {
  matcher: [
    "/((?!api|trpc|_next|_vercel|design-system|.*\\..*).*)",
    "/api/cms/media/:path*",
  ],
};
