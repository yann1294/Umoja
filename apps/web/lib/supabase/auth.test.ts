import { beforeEach, describe, expect, it, vi } from "vitest";

const resetPasswordForEmail = vi.hoisted(() => vi.fn());

vi.mock("./server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: { resetPasswordForEmail },
  })),
}));

import { requestSupabaseRecovery } from "./auth";

describe("Supabase recovery", () => {
  beforeEach(() => {
    vi.stubEnv("APP_URL", "https://umoja.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://supabase.example.test");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "secret-key");
    resetPasswordForEmail.mockReset().mockResolvedValue({ data: {}, error: null });
  });

  it("uses the PKCE callback route as the recovery email redirect target", async () => {
    await requestSupabaseRecovery("recover@example.test", "fr");

    expect(resetPasswordForEmail).toHaveBeenCalledWith("recover@example.test", {
      redirectTo: "https://umoja.example.test/api/supabase-auth/callback?locale=fr&flow=recovery",
    });
  });
});
