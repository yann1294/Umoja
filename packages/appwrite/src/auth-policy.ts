import { hasUmojaRole, type UmojaRole, UMOJA_ROLES } from "./permissions";

export const UMOJA_CAPABILITIES = [
  "workspace.access",
  "cms.manage",
  "intake.review",
  "projects.manage",
  "admin.operations",
  "governance.manage",
] as const;

export type UmojaCapability = (typeof UMOJA_CAPABILITIES)[number];
export type WorkspaceAccessReason =
  | "allowed"
  | "sign-in"
  | "session-expired"
  | "account-disabled"
  | "email-unverified"
  | "membership-required"
  | "invite-pending"
  | "forbidden"
  | "governance-policy-required";

export type WorkspacePrincipal = Readonly<{
  authenticated: boolean;
  sessionValid: boolean;
  accountEnabled: boolean;
  emailVerified: boolean;
  membershipConfirmed: boolean;
  membershipPresent: boolean;
  roles: readonly string[];
}>;

export type ApplicantRecordPrincipal = Readonly<{
  authenticated: boolean;
  sessionValid: boolean;
  accountEnabled: boolean;
  userId?: string;
}>;

const ROLE_CAPABILITIES: Readonly<Record<UmojaRole, readonly UmojaCapability[]>> = {
  admin: ["workspace.access", "cms.manage", "intake.review", "projects.manage", "admin.operations"],
  "cms-editor": ["workspace.access", "cms.manage"],
  reviewer: ["workspace.access", "intake.review"],
  core: ["workspace.access"],
  extended: ["workspace.access"],
  "project-manager": ["workspace.access", "projects.manage"],
};

export const WORKSPACE_POLICY_MATRIX = [
  { subject: "anonymous", workspace: "sign-in", governance: "governance-policy-required" },
  {
    subject: "applicant-record-owner",
    workspace: "membership-required",
    governance: "governance-policy-required",
  },
  ...UMOJA_ROLES.map((role) => ({
    subject: role,
    workspace: "allowed" as const,
    governance: "governance-policy-required" as const,
  })),
  {
    subject: "missing-membership",
    workspace: "membership-required",
    governance: "governance-policy-required",
  },
  {
    subject: "expired-session",
    workspace: "session-expired",
    governance: "governance-policy-required",
  },
  {
    subject: "disabled-account",
    workspace: "account-disabled",
    governance: "governance-policy-required",
  },
] as const;

export function isConfirmedWorkspaceMembership(
  membership: Readonly<{ confirm?: boolean }> | null | undefined,
) {
  return membership?.confirm === true;
}

export function roleHasCapability(role: UmojaRole, capability: UmojaCapability) {
  return ROLE_CAPABILITIES[role].includes(capability);
}

export function rolesHaveCapability(roles: readonly string[], capability: UmojaCapability) {
  if (capability === "governance.manage") return false;
  return roles.some(
    (role) =>
      UMOJA_ROLES.includes(role as UmojaRole) && roleHasCapability(role as UmojaRole, capability),
  );
}

export function evaluateWorkspaceAccess(
  principal: WorkspacePrincipal,
  capability: UmojaCapability = "workspace.access",
): WorkspaceAccessReason {
  if (!principal.authenticated) return "sign-in";
  if (!principal.sessionValid) return "session-expired";
  if (!principal.accountEnabled) return "account-disabled";
  if (!principal.emailVerified) return "email-unverified";
  if (!principal.membershipPresent) return "membership-required";
  if (!principal.membershipConfirmed) return "invite-pending";
  if (capability === "governance.manage") return "governance-policy-required";
  return rolesHaveCapability(principal.roles, capability) ? "allowed" : "forbidden";
}

export function applicantOwnsRecord(principal: ApplicantRecordPrincipal, ownerUserId: string) {
  return (
    principal.authenticated &&
    principal.sessionValid &&
    principal.accountEnabled &&
    Boolean(principal.userId) &&
    principal.userId === ownerUserId
  );
}

export function sessionCookiePolicy(production: boolean) {
  return {
    httpOnly: true as const,
    secure: production,
    sameSite: "lax" as const,
    path: "/" as const,
  };
}

/** Backwards-compatible role-only helper for code that has already resolved account state. */
export function workspaceAuthorization(
  user: Readonly<{ roles: readonly string[] }> | null,
  required?: UmojaRole | readonly UmojaRole[],
): "sign-in" | "forbidden" | "allowed" {
  if (!user) return "sign-in";
  if (required && !hasUmojaRole(user.roles, required)) return "forbidden";
  return "allowed";
}
