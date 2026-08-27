import "server-only";

import type { CookieOptions } from "@supabase/ssr";
import { getSupabaseEnvironment } from "./env";

/** Supabase sessions are consumed only by trusted SSR boundaries in this migration slice. */
export function supabaseServerCookieOptions(options: CookieOptions = {}): CookieOptions {
  return {
    ...options,
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(getSupabaseEnvironment().APP_URL).protocol === "https:",
    path: "/",
  };
}
