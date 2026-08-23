export type SafeAppwriteErrorCode =
  | "configuration_unavailable"
  | "authentication_required"
  | "forbidden"
  | "duplicate"
  | "rate_limited"
  | "validation_failed"
  | "service_unavailable";

export class SafeAppwriteError extends Error {
  constructor(
    readonly code: SafeAppwriteErrorCode,
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SafeAppwriteError";
  }
}

type AppwriteLikeError = { code?: unknown; type?: unknown };

export function toSafeAppwriteError(error: unknown): SafeAppwriteError {
  const candidate = error as AppwriteLikeError;
  const status = typeof candidate?.code === "number" ? candidate.code : 503;
  const type = typeof candidate?.type === "string" ? candidate.type : "";
  if (status === 401)
    return new SafeAppwriteError("authentication_required", "Sign in is required.", 401);
  if (status === 403)
    return new SafeAppwriteError(
      "forbidden",
      "You do not have permission to perform this action.",
      403,
    );
  if (status === 409)
    return new SafeAppwriteError("duplicate", "This request has already been received.", 409);
  if (status === 429 || type.includes("rate_limit"))
    return new SafeAppwriteError("rate_limited", "Please wait before trying again.", 429);
  return new SafeAppwriteError(
    "service_unavailable",
    "The service is temporarily unavailable.",
    503,
  );
}
