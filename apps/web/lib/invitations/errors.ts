export type InvitationListUnavailableReason =
  "schema-missing" | "permission-denied" | "encryption-unavailable" | "query-unavailable";

export type InvitationCreateUnavailableReason =
  | "account-exists"
  | "invalid-intent"
  | "delivery-unavailable"
  | "configuration-unavailable"
  | "origin-mismatch"
  | "database-unavailable"
  | "unavailable";

export type InvitationActionUnavailableReason =
  | "cooldown-or-terminal"
  | "delivery-unavailable"
  | "permission-denied"
  | "database-unavailable"
  | "unavailable";

export class InvitationListUnavailableError extends Error {
  constructor(readonly reason: InvitationListUnavailableReason) {
    super("invitation-list-unavailable");
    this.name = "InvitationListUnavailableError";
  }
}

export function invitationCreateUnavailableReason(
  error: unknown,
): InvitationCreateUnavailableReason {
  if (!(error instanceof Error)) return "unavailable";
  if (error.message === "untrusted-origin") return "origin-mismatch";
  if (error.message === "invitation-account-exists-use-recovery") return "account-exists";
  if (
    error.message === "invitation-delivery-unavailable" ||
    error.message === "transactional-email-unavailable"
  ) {
    return "delivery-unavailable";
  }
  if (
    error.message === "invitation-create-unavailable" ||
    error.message === "invitation-account-check-unavailable" ||
    error.message === "invitation-delivery-state-unavailable"
  ) {
    return "database-unavailable";
  }
  if (
    error.message === "Application configuration is unavailable." ||
    error.name === "ApplicationEnvironmentError"
  ) {
    return "configuration-unavailable";
  }
  if ("issues" in error || error.name === "ZodError") return "invalid-intent";
  return "unavailable";
}

export class InvitationActionUnavailableError extends Error {
  constructor(readonly reason: InvitationActionUnavailableReason) {
    super("invitation-action-unavailable");
    this.name = "InvitationActionUnavailableError";
  }
}

export function invitationActionUnavailableReason(
  error: unknown,
): InvitationActionUnavailableReason {
  if (error instanceof InvitationActionUnavailableError) return error.reason;
  if (!(error instanceof Error)) return "unavailable";
  if (
    error.message === "invitation-delivery-unavailable" ||
    error.message === "transactional-email-unavailable"
  ) {
    return "delivery-unavailable";
  }
  if (error.message === "invitation-action-cooldown-or-terminal") return "cooldown-or-terminal";
  if (error.message === "invitation-action-database-unavailable") return "database-unavailable";
  if (error.message === "invitation-action-permission-denied") return "permission-denied";
  return "unavailable";
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
