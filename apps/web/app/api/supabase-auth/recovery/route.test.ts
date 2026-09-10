import { beforeEach, describe, expect, it, vi } from "vitest";

const requestSupabaseRecovery = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/auth", () => ({ requestSupabaseRecovery }));

import { POST } from "./route";

describe("password recovery request", () => {
  beforeEach(() => {
    vi.stubEnv("APP_URL", "https://umoja.example.test");
    requestSupabaseRecovery.mockReset();
  });

  it("returns the same generic private result when delivery rejects", async () => {
    requestSupabaseRecovery.mockRejectedValueOnce(new Error("unknown-account"));
    const response = await POST(
      new Request("https://umoja.example.test/api/supabase-auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://umoja.example.test" },
        body: JSON.stringify({ email: "unknown@example.test", locale: "fr" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ success: true });
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("does not send for a cross-origin request but preserves the generic response", async () => {
    const response = await POST(
      new Request("https://umoja.example.test/api/supabase-auth/recovery", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://attacker.example" },
        body: JSON.stringify({ email: "person@example.test", locale: "en" }),
      }),
    );
    expect(response.status).toBe(200);
    expect(requestSupabaseRecovery).not.toHaveBeenCalled();
  });
});
