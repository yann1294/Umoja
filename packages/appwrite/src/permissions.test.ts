import { describe, expect, it } from "vitest";
import { isConfirmedWorkspaceMembership, workspaceAuthorization } from "./auth-policy";
import { cmsTablePermissions, hasUmojaRole, intakeTablePermissions } from "./permissions";

describe("Umoja authorization", () => {
  it("distinguishes application roles from arbitrary Console roles", () => {
    expect(hasUmojaRole(["owner"], "admin")).toBe(false);
    expect(hasUmojaRole(["reviewer"], ["reviewer", "admin"])).toBe(true);
  });

  it("requires a confirmed team membership and protects workspace routes", () => {
    expect(isConfirmedWorkspaceMembership({ confirm: false })).toBe(false);
    expect(workspaceAuthorization(null)).toBe("sign-in");
    expect(workspaceAuthorization({ roles: ["reviewer"] }, "cms-editor")).toBe("forbidden");
    expect(workspaceAuthorization({ roles: ["cms-editor"] }, "cms-editor")).toBe("allowed");
  });

  it("never grants anonymous writes", () => {
    const permissions = [...cmsTablePermissions(), ...intakeTablePermissions()];
    expect(permissions.some((permission) => permission.includes('"any"'))).toBe(false);
    expect(
      permissions.some(
        (permission) => permission.startsWith("create") && permission.includes("reviewer"),
      ),
    ).toBe(false);
  });
});
