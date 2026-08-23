import { Permission, Role } from "node-appwrite";
import { UMOJA_OPERATIONS_TEAM_ID } from "./config";
export { UMOJA_OPERATIONS_TEAM_ID } from "./config";

export const UMOJA_ROLES = [
  "admin",
  "cms-editor",
  "reviewer",
  "core",
  "extended",
  "project-manager",
] as const;
export type UmojaRole = (typeof UMOJA_ROLES)[number];

export function isUmojaRole(value: string): value is UmojaRole {
  return UMOJA_ROLES.includes(value as UmojaRole);
}

export function hasUmojaRole(
  assigned: readonly string[],
  required: UmojaRole | readonly UmojaRole[],
) {
  const allowed = Array.isArray(required) ? required : [required];
  return assigned.some((role) => isUmojaRole(role) && allowed.includes(role));
}

export const applicationTeamRole = (role: UmojaRole) => Role.team(UMOJA_OPERATIONS_TEAM_ID, role);

export function cmsTablePermissions(): string[] {
  return [
    Permission.read(applicationTeamRole("cms-editor")),
    Permission.create(applicationTeamRole("cms-editor")),
    Permission.update(applicationTeamRole("cms-editor")),
    Permission.delete(applicationTeamRole("admin")),
    Permission.read(applicationTeamRole("admin")),
    Permission.create(applicationTeamRole("admin")),
    Permission.update(applicationTeamRole("admin")),
  ];
}

export function cmsMediaFilePermissions(published = false): string[] {
  return [
    ...(published ? [Permission.read(Role.any())] : []),
    Permission.read(applicationTeamRole("cms-editor")),
    Permission.update(applicationTeamRole("cms-editor")),
    Permission.delete(applicationTeamRole("cms-editor")),
    Permission.read(applicationTeamRole("admin")),
    Permission.update(applicationTeamRole("admin")),
    Permission.delete(applicationTeamRole("admin")),
  ];
}

export function isCmsMediaFileBoundary(
  file: Readonly<{
    mimeType: string;
    sizeOriginal: number;
    $permissions: readonly string[];
  }>,
) {
  const editorRole = `team:${UMOJA_OPERATIONS_TEAM_ID}/cms-editor`;
  return (
    ["image/png", "image/jpeg", "image/webp"].includes(file.mimeType) &&
    file.sizeOriginal > 0 &&
    file.sizeOriginal <= 10 * 1024 * 1024 &&
    file.$permissions.some(
      (permission) => permission.startsWith("read") && permission.includes(editorRole),
    ) &&
    file.$permissions.some(
      (permission) => permission.startsWith("update") && permission.includes(editorRole),
    )
  );
}

export function intakeTablePermissions(): string[] {
  return [
    Permission.read(applicationTeamRole("reviewer")),
    Permission.update(applicationTeamRole("reviewer")),
    Permission.read(applicationTeamRole("admin")),
    Permission.create(applicationTeamRole("admin")),
    Permission.update(applicationTeamRole("admin")),
    Permission.delete(applicationTeamRole("admin")),
  ];
}

export function auditTablePermissions(): string[] {
  return [
    Permission.read(applicationTeamRole("admin")),
    Permission.create(applicationTeamRole("admin")),
  ];
}

/**
 * Row permissions for an authenticated applicant's own record. Ownership does not grant Team
 * membership or workspace access; reviewers and administrators retain their separately scoped
 * operational access.
 */
export function applicantRecordPermissions(ownerUserId: string): string[] {
  const owner = Role.user(ownerUserId);
  return [
    Permission.read(owner),
    Permission.update(owner),
    Permission.read(applicationTeamRole("reviewer")),
    Permission.update(applicationTeamRole("reviewer")),
    Permission.read(applicationTeamRole("admin")),
    Permission.update(applicationTeamRole("admin")),
  ];
}
