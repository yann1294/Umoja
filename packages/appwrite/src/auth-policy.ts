import { hasUmojaRole, type UmojaRole } from "./permissions";

export function isConfirmedWorkspaceMembership(
  membership: Readonly<{ confirm?: boolean }> | null | undefined,
) {
  return membership?.confirm === true;
}

export function workspaceAuthorization(
  user: Readonly<{ roles: readonly string[] }> | null,
  required?: UmojaRole | readonly UmojaRole[],
): "sign-in" | "forbidden" | "allowed" {
  if (!user) return "sign-in";
  if (required && !hasUmojaRole(user.roles, required)) return "forbidden";
  return "allowed";
}
