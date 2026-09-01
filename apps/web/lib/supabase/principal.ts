import type { User } from "@supabase/supabase-js";
import type { ServerPrincipal } from "@/lib/auth/principal";
import type { UmojaRole } from "@/lib/auth/policy";

type RoleAssignment = Readonly<{ role: UmojaRole; revoked_at: string | null }>;
type Membership = Readonly<{ effective_from: string; effective_to: string | null }>;
type Factors = Readonly<{
  totp?: readonly Readonly<{ status: string }>[];
  webauthn?: readonly Readonly<{ status: string }>[];
}>;

function hasVerifiedFactor(factors: Factors | null | undefined) {
  return Boolean(
    factors?.totp?.some((factor) => factor.status === "verified") ||
    factors?.webauthn?.some((factor) => factor.status === "verified"),
  );
}

/** Pure conversion used by the SSR boundary and isolated transition tests. */
export function toSupabaseServerPrincipal(
  user: Pick<User, "id" | "email" | "email_confirmed_at" | "banned_until">,
  assignments: readonly RoleAssignment[],
  memberships: readonly Membership[],
  factors?: Factors | null,
  now = new Date(),
): ServerPrincipal | null {
  const bannedUntil = user.banned_until ? new Date(user.banned_until) : null;
  if (bannedUntil && Number.isFinite(bannedUntil.valueOf()) && bannedUntil > now) return null;

  const roles = assignments
    .filter((assignment) => assignment.revoked_at === null)
    .map((assignment) => assignment.role);
  const membershipActive = memberships.some(
    (membership) => membership.effective_to === null && new Date(membership.effective_from) <= now,
  );
  if (!user.email_confirmed_at || roles.length === 0 || !membershipActive) return null;

  return {
    actorId: user.id,
    email: user.email ?? "",
    roles,
    membershipActive,
    emailVerified: true,
    mfaVerified: hasVerifiedFactor(factors),
  };
}
