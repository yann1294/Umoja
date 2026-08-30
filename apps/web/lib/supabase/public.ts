import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../supabase/database.types";
import { getSupabaseEnvironment } from "./env";

/** Anonymous, published-only server reader. It has no cookie and always obeys public RLS. */
export function createSupabasePublicClient() {
  const env = getSupabaseEnvironment();
  return createClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init = {}) => fetch(input, { ...init, cache: "no-store" }),
      },
    },
  );
}
