import { beforeEach, describe, expect, it, vi } from "vitest";

const { exchangeCodeForSession, createSupabaseServerClient } = vi.hoisted(() => {
  const exchangeCodeForSession = vi.fn();
  return {
    exchangeCodeForSession,
    createSupabaseServerClient: vi.fn(async () => ({ auth: { exchangeCodeForSession } })),
  };
});

vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient }));

import { GET } from "./route";

describe("Supabase Auth callback", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-key");
    vi.stubEnv("APP_URL", "https://umoja.example.test");
    exchangeCodeForSession.mockReset().mockResolvedValue({
      data: { user: { id: "00000000-0000-4000-8000-000000000001" } },
      error: null,
    });
  });

  it("exchanges the one-time code server-side then redirects to a clean localized verified state", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const response = await GET(
      new Request(
        "https://umoja.example.test/api/supabase-auth/callback?locale=en&flow=verification&code=one-time-code",
      ),
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://umoja.example.test/en/verify-email?verified=1",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    const log = JSON.parse(String(info.mock.calls[0]?.[0]));
    expect(log).toMatchObject({
      level: "info",
      event: "supabase-auth-callback",
      context: {
        flow: "verification",
        locale: "en",
        codePresent: true,
        exchange: "succeeded",
        finalRoute: "/en/verify-email?verified=1",
      },
    });
    info.mockRestore();
  });

  it("never uses a proxy-supplied origin as the final destination", async () => {
    const response = await GET(
      new Request(
        "https://attacker.example/api/supabase-auth/callback?locale=en&flow=verification&code=one-time-code",
      ),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://umoja.example.test/en/verify-email?verified=1",
    );
    expect(exchangeCodeForSession).toHaveBeenCalledWith("one-time-code");
  });
});
