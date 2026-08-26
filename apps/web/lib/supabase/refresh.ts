import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type { Database } from "../../../../supabase/database.types";
import { getSupabaseEnvironment } from "./env";

/**
 * Refreshes a Supabase PKCE session for a request and returns the response carrying
 * any rotated cookies. Call this only from a route group that is fully Supabase-backed.
 */
export async function refreshSupabaseRequest(request: NextRequest, initialResponse?: NextResponse) {
  const env = getSupabaseEnvironment();
  let response = initialResponse ?? NextResponse.next({ request });
  const client = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  const {
    data: { user },
  } = await client.auth.getUser();
  return { response, user };
}
