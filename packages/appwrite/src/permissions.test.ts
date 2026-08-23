import { describe, expect, it } from "vitest";
import {
  applicantOwnsRecord,
  evaluateWorkspaceAccess,
  isConfirmedWorkspaceMembership,
  rolesHaveCapability,
  sessionCookiePolicy,
  WORKSPACE_POLICY_MATRIX,
  workspaceAuthorization,
  type WorkspacePrincipal,
} from "./auth-policy";
import {
  applicantRecordPermissions,
  cmsTablePermissions,
  cmsMediaFilePermissions,
  hasUmojaRole,
  intakeTablePermissions,
  isCmsMediaFileBoundary,
  UMOJA_ROLES,
} from "./permissions";

const activeMember: WorkspacePrincipal = {
  authenticated: true,
  sessionValid: true,
  accountEnabled: true,
  emailVerified: true,
  membershipPresent: true,
  membershipConfirmed: true,
  roles: ["reviewer"],
};

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

  it("fails closed for every inactive account and membership state", () => {
    expect(evaluateWorkspaceAccess({ ...activeMember, authenticated: false })).toBe("sign-in");
    expect(evaluateWorkspaceAccess({ ...activeMember, sessionValid: false })).toBe(
      "session-expired",
    );
    expect(evaluateWorkspaceAccess({ ...activeMember, accountEnabled: false })).toBe(
      "account-disabled",
    );
    expect(evaluateWorkspaceAccess({ ...activeMember, emailVerified: false })).toBe(
      "email-unverified",
    );
    expect(evaluateWorkspaceAccess({ ...activeMember, membershipPresent: false })).toBe(
      "membership-required",
    );
    expect(evaluateWorkspaceAccess({ ...activeMember, membershipConfirmed: false })).toBe(
      "invite-pending",
    );
  });

  it("maps each provisioned role to only its approved operational capabilities", () => {
    for (const role of UMOJA_ROLES) {
      expect(evaluateWorkspaceAccess({ ...activeMember, roles: [role] })).toBe("allowed");
      expect(rolesHaveCapability([role], "governance.manage")).toBe(false);
      expect(evaluateWorkspaceAccess({ ...activeMember, roles: [role] }, "governance.manage")).toBe(
        "governance-policy-required",
      );
    }
    expect(rolesHaveCapability(["admin"], "admin.operations")).toBe(true);
    expect(rolesHaveCapability(["admin"], "cms.publish")).toBe(true);
    expect(rolesHaveCapability(["cms-editor"], "cms.publish")).toBe(false);
    expect(rolesHaveCapability(["cms-editor"], "intake.review")).toBe(false);
    expect(rolesHaveCapability(["reviewer"], "cms.manage")).toBe(false);
    expect(rolesHaveCapability(["project-manager"], "projects.manage")).toBe(true);
  });

  it("keeps draft media private and grants public read only to explicitly published files", () => {
    expect(cmsMediaFilePermissions(false).some((permission) => permission.includes('"any"'))).toBe(
      false,
    );
    const published = cmsMediaFilePermissions(true);
    expect(
      published.some((permission) => permission.startsWith("read") && permission.includes('"any"')),
    ).toBe(true);
    expect(
      published.some(
        (permission) => !permission.startsWith("read") && permission.includes('"any"'),
      ),
    ).toBe(false);
    expect(published.some((permission) => permission.includes("reviewer"))).toBe(false);
    expect(
      isCmsMediaFileBoundary({
        mimeType: "image/png",
        sizeOriginal: 1200,
        $permissions: cmsMediaFilePermissions(false),
      }),
    ).toBe(true);
    expect(
      isCmsMediaFileBoundary({
        mimeType: "application/octet-stream",
        sizeOriginal: 1200,
        $permissions: intakeTablePermissions(),
      }),
    ).toBe(false);
  });

  it("treats an applicant as a record owner without creating Team access", () => {
    const applicant = {
      authenticated: true,
      sessionValid: true,
      accountEnabled: true,
      userId: "applicant-1",
    };
    expect(applicantOwnsRecord(applicant, "applicant-1")).toBe(true);
    expect(applicantOwnsRecord(applicant, "applicant-2")).toBe(false);
    expect(evaluateWorkspaceAccess({ ...activeMember, membershipPresent: false, roles: [] })).toBe(
      "membership-required",
    );
    const permissions = applicantRecordPermissions("applicant-1");
    expect(permissions.some((permission) => permission.includes("user:applicant-1"))).toBe(true);
    expect(permissions.some((permission) => permission.includes('"any"'))).toBe(false);
  });

  it("documents every required policy-matrix subject", () => {
    const subjects = WORKSPACE_POLICY_MATRIX.map(({ subject }) => subject);
    expect(subjects).toEqual(
      expect.arrayContaining([
        "anonymous",
        "applicant-record-owner",
        ...UMOJA_ROLES,
        "missing-membership",
        "expired-session",
        "disabled-account",
      ]),
    );
  });

  it("uses an HTTP-only, SameSite-protected, production-secure session cookie", () => {
    expect(sessionCookiePolicy(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    expect(sessionCookiePolicy(false).secure).toBe(false);
  });
});
