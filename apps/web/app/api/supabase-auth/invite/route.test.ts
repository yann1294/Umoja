import { beforeEach, describe, expect, it, vi } from "vitest";

const { issueUmojaInvitation } = vi.hoisted(() => ({ issueUmojaInvitation: vi.fn() }));
vi.mock("@/lib/invitations/service", () => ({ issueUmojaInvitation }));

import { POST } from "./route";

vi.stubEnv("APP_URL", "https://umoja.example.test");

describe("Umoja account invitation route", () => {
  beforeEach(() => issueUmojaInvitation.mockReset().mockResolvedValue({ id: "invite-id" }));

  it("passes the complete intent to the protected invitation service", async () => {
    const input = {
      email: "synthetic@example.test",
      locale: "fr",
      intendedRole: null,
      membershipTier: "applicant",
      membershipStatus: "pending",
    };
    const response = await POST(
      new Request("https://umoja.example.test/api/supabase-auth/invite", {
        method: "POST",
        headers: { origin: "https://umoja.example.test" },
        body: JSON.stringify(input),
      }),
    );
    expect(response.status).toBe(200);
    expect(issueUmojaInvitation).toHaveBeenCalledWith(input);
    expect(issueUmojaInvitation).toHaveBeenCalledTimes(1);
  });

  it("returns a private generic failure without leaking service details", async () => {
    issueUmojaInvitation.mockRejectedValueOnce(new Error("secret-provider-detail"));
    const response = await POST(
      new Request("https://umoja.example.test/api/supabase-auth/invite", {
        method: "POST",
        headers: { origin: "https://umoja.example.test" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(403);
    expect(await response.text()).not.toContain("secret-provider-detail");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
