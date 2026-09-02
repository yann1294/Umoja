import { beforeEach, describe, expect, it, vi } from "vitest";

const { issueSupabaseInvite } = vi.hoisted(() => ({ issueSupabaseInvite: vi.fn() }));
vi.mock("@/lib/supabase/auth", () => ({ issueSupabaseInvite }));

import { POST } from "./route";

describe("Umoja account invitation route", () => {
  beforeEach(() => issueSupabaseInvite.mockReset().mockResolvedValue(undefined));

  it("passes only the account email and locale, never a client-supplied role or tier", async () => {
    const response = await POST(
      new Request("https://umoja.example.test/api/supabase-auth/invite", {
        method: "POST",
        body: JSON.stringify({
          email: "synthetic@example.test",
          locale: "fr",
          roles: ["admin"],
          tier: "core",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(issueSupabaseInvite).toHaveBeenCalledWith("synthetic@example.test", "fr");
    expect(issueSupabaseInvite).toHaveBeenCalledTimes(1);
  });
});
