import "server-only";

import type { UmojaCapability, UmojaRole } from "./policy";

/** Provider-neutral request identity consumed by CMS/media mutations. */
export type ServerPrincipal = Readonly<{
  actorId: string;
  email: string;
  roles: readonly UmojaRole[];
  membershipActive: boolean;
  emailVerified: boolean;
  mfaVerified: boolean;
}>;

export function principalCan(principal: ServerPrincipal, capability: UmojaCapability) {
  if (!principal.membershipActive || !principal.emailVerified) return false;
  if (capability === "governance.manage") return false;
  if (capability === "cms.manage")
    return principal.roles.includes("admin") || principal.roles.includes("cms-editor");
  if (capability === "cms.publish") return principal.roles.includes("admin");
  if (capability === "intake.review")
    return principal.roles.includes("admin") || principal.roles.includes("reviewer");
  if (capability === "admin.operations") return principal.roles.includes("admin");
  return principal.roles.length > 0;
}
