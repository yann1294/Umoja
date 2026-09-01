export const UMOJA_ROLES = [
  "admin",
  "cms-editor",
  "reviewer",
  "core",
  "extended",
  "project-manager",
] as const;
export type UmojaRole = (typeof UMOJA_ROLES)[number];

export const UMOJA_CAPABILITIES = [
  "workspace.access",
  "cms.manage",
  "cms.publish",
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
  | "forbidden"
  | "mfa-required"
  | "governance-policy-required";

const ROLE_CAPABILITIES: Readonly<Record<UmojaRole, readonly UmojaCapability[]>> = {
  admin: [
    "workspace.access",
    "cms.manage",
    "cms.publish",
    "intake.review",
    "projects.manage",
    "admin.operations",
  ],
  "cms-editor": ["workspace.access", "cms.manage"],
  reviewer: ["workspace.access", "intake.review"],
  core: ["workspace.access"],
  extended: ["workspace.access"],
  "project-manager": ["workspace.access", "projects.manage"],
};

export function isUmojaRole(value: string): value is UmojaRole {
  return UMOJA_ROLES.includes(value as UmojaRole);
}

export function rolesHaveCapability(roles: readonly string[], capability: UmojaCapability) {
  if (capability === "governance.manage") return false;
  return roles.some(
    (role) => isUmojaRole(role) && ROLE_CAPABILITIES[role].includes(capability as never),
  );
}

export function capabilityRequiresMfa(capability: UmojaCapability) {
  return capability === "admin.operations" || capability === "cms.publish";
}
