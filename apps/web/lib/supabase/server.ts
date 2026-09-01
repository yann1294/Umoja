import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnvironment } from "./env";
import { supabaseServerCookieOptions } from "./cookies";
import type { Database } from "../../../../supabase/database.types";

/** Per-request user client. It deliberately has no secret key and therefore obeys RLS. */
export async function createSupabaseServerClient() {
  const env = getSupabaseEnvironment();
  const cookieStore = await cookies();
  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, supabaseServerCookieOptions(options)),
            );
          } catch {
            // Server Components cannot write cookies. proxy.ts performs refresh for page requests.
          }
        },
      },
    },
  );
}
