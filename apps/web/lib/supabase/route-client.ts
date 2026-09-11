import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { NextResponse } from "next/server";
import type { Database } from "../../../../supabase/database.types";
import { supabaseServerCookieOptions } from "./cookies";
import { getSupabaseEnvironment } from "./env";

export function createSupabaseRouteClient(request: Request, response: NextResponse) {
  const env = getSupabaseEnvironment();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => {
          const raw = request.headers.get("cookie") ?? "";
          return raw
            .split(/;\s*/)
            .filter(Boolean)
            .map((entry) => {
              const separator = entry.indexOf("=");
              return { name: entry.slice(0, separator), value: entry.slice(separator + 1) };
            });
        },
        setAll: (entries) =>
          entries.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, supabaseServerCookieOptions(options)),
          ),
      },
    },
  );
}
