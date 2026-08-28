import "server-only";

import { redirect } from "next/navigation";
import { getSupabaseServerPrincipal, type SupabaseWorkspaceUser } from "./auth";

export function principalCanReviewIntake(
  principal: Awaited<ReturnType<typeof getSupabaseServerPrincipal>>,
) {
  return Boolean(
    principal?.membershipActive &&
    (principal.roles.includes("reviewer") || principal.roles.includes("admin")),
  );
}

/** Request-scoped role/membership check for the atomically migrated intake administration group. */
export async function requireSupabaseIntakeReviewer(locale: string = "en") {
  const safeLocale = locale === "fr" ? "fr" : "en";
  const principal = await getSupabaseServerPrincipal();
  if (!principal) redirect(`/${safeLocale}/admin/intake/sign-in?next=/${safeLocale}/admin/intake`);
  if (!principalCanReviewIntake(principal))
    redirect(`/${safeLocale}/admin/intake/account-state?reason=forbidden`);
  if (process.env.SUPABASE_PRIVILEGED_MFA_REQUIRED === "1" && !principal.mfaVerified)
    redirect(`/${safeLocale}/admin/intake/account-state?reason=mfa-required`);
  return {
    id: principal.actorId,
    name: "",
    email: principal.email,
    emailVerified: principal.emailVerified,
    mfaEnabled: principal.mfaVerified,
    roles: principal.roles,
  } satisfies SupabaseWorkspaceUser;
}
