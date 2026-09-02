import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSupabaseAuthFlowContext,
  parseSupabaseAuthFlowContext,
  SUPABASE_AUTH_FLOW_TTL_SECONDS,
} from "./auth-flow-context";

const subject = "10000000-0000-4000-8000-000000000001";
const now = new Date("2026-09-02T12:00:00.000Z");

describe("Supabase password-flow context", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "publishable-test-key");
    vi.stubEnv("SUPABASE_SECRET_KEY", "server-only-test-key-with-sufficient-entropy");
    vi.stubEnv("APP_URL", "https://umoja.example.test");
  });

  it("accepts only the signed user and expected flow before expiry", () => {
    const value = createSupabaseAuthFlowContext(subject, "invite", now);
    expect(parseSupabaseAuthFlowContext(value, "invite", now)).toMatchObject({
      subject,
      flow: "invite",
    });
    expect(parseSupabaseAuthFlowContext(value, "recovery", now)).toBeNull();
    expect(
      parseSupabaseAuthFlowContext(
        value,
        "invite",
        new Date(now.getTime() + SUPABASE_AUTH_FLOW_TTL_SECONDS * 1000),
      ),
    ).toBeNull();
  });

  it("rejects forged and malformed contexts", () => {
    const value = createSupabaseAuthFlowContext(subject, "recovery", now);
    expect(parseSupabaseAuthFlowContext(`${value}x`, "recovery", now)).toBeNull();
    expect(parseSupabaseAuthFlowContext("v1.invalid.invalid", "recovery", now)).toBeNull();
    expect(parseSupabaseAuthFlowContext(null, "recovery", now)).toBeNull();
  });
});
