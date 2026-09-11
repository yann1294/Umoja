import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyOtp, createSupabaseRouteClient } = vi.hoisted(() => {
  const verifyOtp = vi.fn();
  return {
    verifyOtp,
    createSupabaseRouteClient: vi.fn(() => ({ auth: { verifyOtp } })),
  };
});

vi.mock("@/lib/supabase/route-client", () => ({ createSupabaseRouteClient }));

import { GET } from "./route";

describe("token-hash confirmation", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-key");
    vi.stubEnv("APP_URL", "https://umoja.example.test");
    verifyOtp.mockReset().mockResolvedValue({
      data: {
        user: {
          id: "00000000-0000-4000-8000-000000000001",
          banned_until: null,
          user_metadata: {},
        },
      },
      error: null,
    });
  });

  it("verifies a flow-bound hash and returns a token-free localized URL", async () => {
    const response = await GET(
      new Request(
        "https://umoja.example.test/api/supabase-auth/confirm?locale=fr&flow=recovery&type=recovery&token_hash=redacted-test-token-hash",
      ),
    );
    expect(verifyOtp).toHaveBeenCalledWith({
      token_hash: "redacted-test-token-hash",
      type: "recovery",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://umoja.example.test/fr/recover-password");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("location")).not.toContain("token");
  });

  it("accepts a Dashboard invitation without locale and defaults it to English", async () => {
    const response = await GET(
      new Request(
        "https://umoja.example.test/api/supabase-auth/confirm?flow=invite&type=invite&token_hash=redacted-test-token-hash",
      ),
    );
    expect(response.headers.get("location")).toBe("https://umoja.example.test/en/accept-invite");
    expect(response.headers.get("set-cookie")).toContain("umoja-auth-flow=");
  });

  it("fails closed for a wrong flow and type combination", async () => {
    const response = await GET(
      new Request(
        "https://umoja.example.test/api/supabase-auth/confirm?locale=en&flow=invite&type=recovery&token_hash=redacted-test-token-hash",
      ),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://umoja.example.test/en/accept-invite?state=invalid",
    );
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("returns a neutral clean state for expired, replayed, or disabled links", async () => {
    verifyOtp.mockResolvedValueOnce({ data: { user: null }, error: new Error("expired") });
    const response = await GET(
      new Request(
        "https://umoja.example.test/api/supabase-auth/confirm?locale=en&flow=verification&type=signup&token_hash=redacted-test-token-hash",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://umoja.example.test/en/verify-email?state=invalid",
    );
  });
});
