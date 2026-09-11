import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  validateRawInvitationToken: vi.fn(),
  setInvitationContext: vi.fn(),
}));
vi.mock("@/lib/invitations/service", () => ({
  validateRawInvitationToken: mocks.validateRawInvitationToken,
}));
vi.mock("@/lib/invitations/context", () => ({ setInvitationContext: mocks.setInvitationContext }));

import { GET } from "./route";

describe("Umoja invitation token exchange", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-secret-key");
    vi.stubEnv("APP_URL", "https://umoja.example.test");
    mocks.validateRawInvitationToken.mockReset();
    mocks.setInvitationContext.mockReset();
  });

  it("uses the stored locale and removes the bearer token from the final URL", async () => {
    mocks.validateRawInvitationToken.mockResolvedValue({
      row: { id: "invite-id", locale: "fr" },
      digest: "a".repeat(64),
    });
    const response = await GET(
      new Request(
        "https://umoja.example.test/api/supabase-auth/invite/exchange?locale=en&token=private-token",
      ),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://umoja.example.test/fr/accept-invite");
    expect(response.headers.get("location")).not.toContain("token");
    expect(mocks.setInvitationContext).toHaveBeenCalledWith(response, "invite-id", "a".repeat(64));
  });

  it("shows a localized invalid state without setting a context", async () => {
    mocks.validateRawInvitationToken.mockResolvedValue(null);
    const response = await GET(
      new Request(
        "https://umoja.example.test/api/supabase-auth/invite/exchange?locale=fr&token=bad",
      ),
    );
    expect(response.headers.get("location")).toBe(
      "https://umoja.example.test/fr/accept-invite?state=invalid",
    );
    expect(mocks.setInvitationContext).not.toHaveBeenCalled();
  });
});
