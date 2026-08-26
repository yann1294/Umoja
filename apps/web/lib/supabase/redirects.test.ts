import { beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSupabaseAuthCallback, supabaseAuthCallbackUrl } from "./redirects";

describe("Supabase Auth redirect boundary", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-key");
    vi.stubEnv("APP_URL", "https://umoja.example.test");
  });

  it("uses APP_URL and preserves the selected verification locale through server exchange", () => {
    const callback = new URL(supabaseAuthCallbackUrl("en", "verification"));
    expect(callback.origin).toBe("https://umoja.example.test");
    expect(callback.pathname).toBe("/api/supabase-auth/callback");
    expect(resolveSupabaseAuthCallback(`${callback}&code=one-time-code`)?.toString()).toBe(
      "https://umoja.example.test/en/verify-email?verified=1",
    );
  });

  it("rejects foreign origins and unrecognised destinations", () => {
    expect(resolveSupabaseAuthCallback("https://attacker.example/api/supabase-auth/callback?locale=en&flow=verification")).toBeNull();
    expect(resolveSupabaseAuthCallback("https://umoja.example.test/api/supabase-auth/callback?locale=en&flow=workspace")).toBeNull();
  });
});
