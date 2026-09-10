export type InvitationListUnavailableReason =
  "schema-missing" | "permission-denied" | "encryption-unavailable" | "query-unavailable";

export class InvitationListUnavailableError extends Error {
  constructor(readonly reason: InvitationListUnavailableReason) {
    super("invitation-list-unavailable");
    this.name = "InvitationListUnavailableError";
  }
}

export function classifyInvitationListQueryError(error: unknown): InvitationListUnavailableReason {
  const record = error && typeof error === "object" ? (error as Record<string, unknown>) : {};
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message.toLowerCase() : "";
  const details = typeof record.details === "string" ? record.details.toLowerCase() : "";
  const combined = `${message} ${details}`;

  if (
    code === "42P01" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    (combined.includes("account_invitations") &&
      (combined.includes("schema cache") ||
        combined.includes("does not exist") ||
        combined.includes("relation"))) ||
    (combined.includes("list_account_invitations") &&
      (combined.includes("schema cache") || combined.includes("function")))
  ) {
    return "schema-missing";
  }

  if (
    code === "42501" ||
    combined.includes("permission denied") ||
    combined.includes("row-level security") ||
    combined.includes("rls")
  ) {
    return "permission-denied";
  }

  return "query-unavailable";
}

export function invitationListUnavailableReason(error: unknown): InvitationListUnavailableReason {
  return error instanceof InvitationListUnavailableError ? error.reason : "query-unavailable";
}
