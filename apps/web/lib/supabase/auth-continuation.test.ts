import { describe, expect, it } from "vitest";

import { resolveSupabaseAuthContinuation } from "./auth-continuation";

describe("post-authentication continuation", () => {
  it("sends a returning administrator through an enrolled MFA challenge", () => {
    expect(
      resolveSupabaseAuthContinuation({
        locale: "en",
        roles: ["admin"],
        membershipActive: true,
        mfaRequired: true,
        currentLevel: "aal1",
        nextLevel: "aal2",
      }),
    ).toBe("/en/mfa-challenge?next=%2Fen%2Fadmin");
  });

  it("opens the administrator workspace after AAL2 verification", () => {
    expect(
      resolveSupabaseAuthContinuation({
        locale: "fr",
        roles: ["admin"],
        membershipActive: true,
        mfaRequired: true,
        currentLevel: "aal2",
        nextLevel: "aal2",
      }),
    ).toBe("/fr/admin");
  });

  it("shows an explicit pending state for an active account without assignments", () => {
    expect(
      resolveSupabaseAuthContinuation({
        locale: "fr",
        roles: [],
        membershipActive: false,
        mfaRequired: true,
        currentLevel: "aal1",
        nextLevel: "aal1",
      }),
    ).toBe("/fr/account-state?reason=membership-required");
  });

  it("rejects an external requested continuation", () => {
    expect(
      resolveSupabaseAuthContinuation({
        locale: "en",
        requestedNext: "https://attacker.example/",
        roles: ["reviewer"],
        membershipActive: true,
        mfaRequired: false,
        currentLevel: "aal1",
        nextLevel: "aal1",
      }),
    ).toBe("/en/workspace");
  });
});
