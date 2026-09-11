import { describe, expect, it, vi } from "vitest";
import { acceptInvitationAcrossBoundaries } from "./acceptance";

const email = "person@example.test";
const lookup = "v1.safe-lookup";

function dependencies() {
  return {
    email,
    expectedEmailLookup: lookup,
    password: "Test-password-123",
    createEmailLookup: vi.fn(() => lookup),
    createAuthUser: vi.fn(async () => ({ id: "user-id", email })),
    acceptDatabase: vi.fn(async () => undefined),
    deleteAuthUser: vi.fn(async () => undefined),
    onCompensationFailure: vi.fn(),
  };
}

describe("invitation Auth/database orchestration", () => {
  it("accepts only the exact created Auth identity", async () => {
    const options = dependencies();
    await expect(acceptInvitationAcrossBoundaries(options)).resolves.toMatchObject({
      id: "user-id",
    });
    expect(options.acceptDatabase).toHaveBeenCalledWith("user-id");
    expect(options.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("compensates the new Auth user when the database transaction fails", async () => {
    const options = dependencies();
    options.acceptDatabase.mockRejectedValueOnce(new Error("database-failure"));
    await expect(acceptInvitationAcrossBoundaries(options)).rejects.toThrow(
      "invitation-acceptance-unavailable",
    );
    expect(options.deleteAuthUser).toHaveBeenCalledWith("user-id");
  });

  it("does not consume an invite when Auth rejects an existing or disabled account", async () => {
    const options = dependencies();
    options.createAuthUser.mockRejectedValueOnce(new Error("auth-user-unavailable"));
    await expect(acceptInvitationAcrossBoundaries(options)).rejects.toThrow(
      "auth-user-unavailable",
    );
    expect(options.acceptDatabase).not.toHaveBeenCalled();
    expect(options.deleteAuthUser).not.toHaveBeenCalled();
  });

  it("deletes a mismatched identity before database assignment", async () => {
    const options = dependencies();
    options.createEmailLookup.mockReturnValueOnce("v1.wrong-lookup");
    await expect(acceptInvitationAcrossBoundaries(options)).rejects.toThrow(
      "invitation-acceptance-unavailable",
    );
    expect(options.acceptDatabase).not.toHaveBeenCalled();
    expect(options.deleteAuthUser).toHaveBeenCalledWith("user-id");
  });
});
