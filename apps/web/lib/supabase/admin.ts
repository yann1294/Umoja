import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../supabase/database.types";
import { getSupabaseEnvironment } from "./env";

/** Privileged Auth/service boundary; every caller must authorize and validate first. Server-only. */
export function createSupabaseAdminClient() {
  const env = getSupabaseEnvironment();
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
}
