import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInvitationContext, parseInvitationContext } from "./context";

describe("invitation exchange context", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-key-with-sufficient-entropy");
    vi.stubEnv("APP_URL", "https://umoja.example.test");
  });

  it("binds an invite id and token digest to a short-lived signed context", () => {
    const now = Date.parse("2030-01-01T00:00:00Z");
    const id = "10000000-0000-4000-8000-000000000001";
    const digest = "a".repeat(64);
    const context = createInvitationContext(id, digest, now);
    expect(parseInvitationContext(context, now + 1_000)).toMatchObject({ id, digest });
    expect(parseInvitationContext(context, now + 31 * 60_000)).toBeNull();
    expect(parseInvitationContext(`${context}x`, now)).toBeNull();
  });
});
