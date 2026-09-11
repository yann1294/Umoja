import "server-only";

import type { UmojaRole } from "@/lib/auth/policy";
import { safeAuthReturnPath } from "./auth-return-path";

type AssuranceLevel = string | null;

export function resolveSupabaseAuthContinuation(input: {
  locale: "en" | "fr";
  requestedNext?: unknown;
  roles: readonly UmojaRole[];
  membershipActive: boolean;
  mfaRequired: boolean;
  currentLevel: AssuranceLevel;
  nextLevel: AssuranceLevel;
}) {
  const { locale, roles } = input;
  if (!input.membershipActive || roles.length === 0) {
    return `/${locale}/account-state?reason=membership-required`;
  }
  const fallback = roles.includes("admin") ? `/${locale}/admin` : `/${locale}/workspace`;
  const target =
    typeof input.requestedNext === "string"
      ? safeAuthReturnPath(input.requestedNext, locale)
      : fallback;
  if (roles.includes("admin") && input.mfaRequired && input.currentLevel !== "aal2") {
    if (input.nextLevel === "aal2") {
      return `/${locale}/mfa-challenge?next=${encodeURIComponent(target)}`;
    }
    return `/${locale}/account-state?reason=mfa-required`;
  }
  return target;
}
