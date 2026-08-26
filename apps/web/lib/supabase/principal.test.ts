import { describe, expect, it } from "vitest";
import { principalCan } from "@/lib/auth/principal";
import { toSupabaseServerPrincipal } from "./principal";

const user = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "synthetic@example.test",
  email_confirmed_at: "2026-08-26T00:00:00.000Z",
  banned_until: undefined,
} as const;
const role = [{ role: "cms-editor", revoked_at: null }] as const;
const membership = [{ effective_from: "2026-08-01T00:00:00.000Z", effective_to: null }] as const;
const now = new Date("2026-08-26T12:00:00.000Z");

describe("Supabase SSR principal", () => {
  it("refreshes protected relational roles and active membership rather than metadata", () => {
    const principal = toSupabaseServerPrincipal(user, role, membership, null, now);
    expect(principal).toMatchObject({ actorId: user.id, roles: ["cms-editor"], membershipActive: true });
    expect(principal && principalCan(principal, "cms.manage")).toBe(true);
  });

  it("fails closed for removed roles, expired memberships, unverified and disabled accounts", () => {
    expect(toSupabaseServerPrincipal(user, [{ role: "cms-editor", revoked_at: "2026-08-26T00:00:00.000Z" }], membership, null, now)).toBeNull();
    expect(toSupabaseServerPrincipal(user, role, [{ effective_from: "2026-08-01T00:00:00.000Z", effective_to: "2026-08-20T00:00:00.000Z" }], null, now)).toBeNull();
    expect(toSupabaseServerPrincipal({ ...user, email_confirmed_at: undefined }, role, membership, null, now)).toBeNull();
    expect(toSupabaseServerPrincipal({ ...user, banned_until: "2026-08-27T00:00:00.000Z" }, role, membership, null, now)).toBeNull();
  });

  it("keeps privileged access MFA-ready without claiming MFA is globally enforced", () => {
    const withoutMfa = toSupabaseServerPrincipal(user, [{ role: "admin", revoked_at: null }], membership, null, now);
    const withMfa = toSupabaseServerPrincipal(user, [{ role: "admin", revoked_at: null }], membership, { totp: [{ status: "verified" }] }, now);
    expect(withoutMfa?.mfaVerified).toBe(false);
    expect(withMfa?.mfaVerified).toBe(true);
  });
});
