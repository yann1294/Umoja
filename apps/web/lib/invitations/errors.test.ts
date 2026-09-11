import { describe, expect, it } from "vitest";
import {
  InvitationActionUnavailableError,
  classifyInvitationListQueryError,
  invitationActionUnavailableReason,
  invitationCreateUnavailableReason,
} from "./errors";

describe("invitation list error classification", () => {
  it("identifies an unapplied account invitation migration", () => {
    expect(
      classifyInvitationListQueryError({
        code: "PGRST205",
        message: "Could not find the table public.account_invitations in the schema cache",
      }),
    ).toBe("schema-missing");
    expect(
      classifyInvitationListQueryError({
        code: "42P01",
        message: 'relation "public.account_invitations" does not exist',
      }),
    ).toBe("schema-missing");
    expect(
      classifyInvitationListQueryError({
        code: "PGRST202",
        message:
          "Could not find the function public.list_account_invitations without parameters in the schema cache",
      }),
    ).toBe("schema-missing");
  });

  it("identifies permission or RLS denial separately from missing schema", () => {
    expect(
      classifyInvitationListQueryError({
        code: "42501",
        message: "permission denied for table account_invitations",
      }),
    ).toBe("permission-denied");
    expect(
      classifyInvitationListQueryError({
        message: "new row violates row-level security policy",
      }),
    ).toBe("permission-denied");
  });
});

describe("invitation create error classification", () => {
  it("maps expected invitation failures to safe response reasons", () => {
    expect(
      invitationCreateUnavailableReason(new Error("invitation-account-exists-use-recovery")),
    ).toBe("account-exists");
    expect(invitationCreateUnavailableReason(new Error("untrusted-origin"))).toBe(
      "origin-mismatch",
    );
    expect(invitationCreateUnavailableReason(new Error("invitation-delivery-unavailable"))).toBe(
      "delivery-unavailable",
    );
    expect(invitationCreateUnavailableReason(new Error("invitation-create-unavailable"))).toBe(
      "database-unavailable",
    );
  });

  it("does not expose unexpected provider or database details", () => {
    expect(invitationCreateUnavailableReason(new Error("provider said token=secret"))).toBe(
      "unavailable",
    );
  });
});

describe("invitation action error classification", () => {
  it("maps resend and revoke failures to safe UI reasons", () => {
    expect(
      invitationActionUnavailableReason(
        new InvitationActionUnavailableError("cooldown-or-terminal"),
      ),
    ).toBe("cooldown-or-terminal");
    expect(invitationActionUnavailableReason(new Error("invitation-delivery-unavailable"))).toBe(
      "delivery-unavailable",
    );
    expect(invitationActionUnavailableReason(new Error("provider said token=secret"))).toBe(
      "unavailable",
    );
  });
});
