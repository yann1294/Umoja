import { describe, expect, it } from "vitest";
import type { ServerPrincipal } from "@/lib/auth/principal";
import { principalCanReviewIntake } from "./intake-auth";

const principal = (role: ServerPrincipal["roles"][number], membershipActive = true) =>
  ({
    actorId: crypto.randomUUID(),
    email: "synthetic@example.test",
    emailVerified: true,
    membershipActive,
    mfaVerified: false,
    roles: [role],
  }) satisfies ServerPrincipal;

describe("intake reviewer principal", () => {
  it("allows only active reviewer and operations-admin principals", () => {
    expect(principalCanReviewIntake(principal("reviewer"))).toBe(true);
    expect(principalCanReviewIntake(principal("admin"))).toBe(true);
    for (const role of ["cms-editor", "core", "extended", "project-manager"] as const)
      expect(principalCanReviewIntake(principal(role))).toBe(false);
    expect(principalCanReviewIntake(principal("reviewer", false))).toBe(false);
    expect(principalCanReviewIntake(null)).toBe(false);
  });
});
