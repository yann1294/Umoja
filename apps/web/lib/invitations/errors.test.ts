import { describe, expect, it } from "vitest";
import { classifyInvitationListQueryError } from "./errors";

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
