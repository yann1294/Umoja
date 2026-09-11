import { describe, expect, it } from "vitest";
import {
  invitationInputSchema,
  invitationLifecycle,
  invitationToken,
  invitationTokenDigest,
} from "./core";

describe("Umoja invitation invariants", () => {
  it("creates a random bearer token and stores only its deterministic digest", () => {
    const first = invitationToken();
    const second = invitationToken();
    expect(first.token).not.toBe(second.token);
    expect(first.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(invitationTokenDigest(first.token)).toBe(first.digest);
    expect(first.digest).not.toContain(first.token);
  });

  it("derives terminal and pending states without trusting a client status", () => {
    const future = "2030-01-02T00:00:00.000Z";
    const now = new Date("2030-01-01T00:00:00.000Z");
    expect(
      invitationLifecycle({ expires_at: future, accepted_at: null, revoked_at: null }, now),
    ).toBe("pending");
    expect(
      invitationLifecycle(
        { expires_at: "2029-01-01T00:00:00.000Z", accepted_at: null, revoked_at: null },
        now,
      ),
    ).toBe("expired");
    expect(
      invitationLifecycle(
        { expires_at: future, accepted_at: now.toISOString(), revoked_at: null },
        now,
      ),
    ).toBe("accepted");
    expect(
      invitationLifecycle(
        { expires_at: future, accepted_at: null, revoked_at: now.toISOString() },
        now,
      ),
    ).toBe("revoked");
  });

  it("never permits operations invitations to auto-promote Core or bootstrap Admin", () => {
    const base = {
      email: "person@example.test",
      locale: "en",
      membershipStatus: "active",
    } as const;
    expect(
      invitationInputSchema.safeParse({ ...base, intendedRole: null, membershipTier: "applicant" })
        .success,
    ).toBe(true);
    expect(
      invitationInputSchema.safeParse({
        ...base,
        intendedRole: "admin",
        membershipTier: "extended",
      }).success,
    ).toBe(false);
    expect(
      invitationInputSchema.safeParse({ ...base, intendedRole: "core", membershipTier: "extended" })
        .success,
    ).toBe(false);
    expect(
      invitationInputSchema.safeParse({
        ...base,
        intendedRole: "extended",
        membershipTier: "applicant",
      }).success,
    ).toBe(false);
    expect(
      invitationInputSchema.safeParse({ ...base, intendedRole: "extended", membershipTier: "core" })
        .success,
    ).toBe(false);
  });
});
