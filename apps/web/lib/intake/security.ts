export type RateLimitDecision = Readonly<{ allowed: boolean; retryAfterSeconds?: number }>;
export interface IntakeRateLimiter {
  check(key: string): Promise<RateLimitDecision>;
}

export interface IntakeIdempotencyStore {
  claim(keyHash: string, expiresAt: Date): Promise<"claimed" | "duplicate">;
  complete(keyHash: string, submissionId: string, publicReference: string): Promise<void>;
  release(keyHash: string): Promise<void>;
}

export const INTAKE_FILE_MAX_BYTES = 10_000_000;
const allowed = new Set(["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp"]);

function signature(bytes: Uint8Array, extension: string) {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value);
  if (extension === "pdf") return starts(0x25, 0x50, 0x44, 0x46);
  if (extension === "png") return starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (extension === "jpg" || extension === "jpeg") return starts(0xff, 0xd8, 0xff);
  if (extension === "webp")
    return (
      starts(0x52, 0x49, 0x46, 0x46) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  if (extension === "doc") return starts(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1);
  if (extension === "docx") return starts(0x50, 0x4b, 0x03, 0x04);
  return false;
}

export function validateIntakeFile(
  input: Readonly<{ name: string; size: number; bytes: Uint8Array }>,
) {
  const extension = input.name.split(".").pop()?.toLowerCase() ?? "";
  if (!allowed.has(extension)) return { valid: false as const, reason: "extension" as const };
  if (input.size <= 0 || input.size > INTAKE_FILE_MAX_BYTES)
    return { valid: false as const, reason: "size" as const };
  if (!signature(input.bytes, extension))
    return { valid: false as const, reason: "signature" as const };
  return { valid: true as const, extension };
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizePhone = (value: string) => value.trim().replace(/[\s().-]+/g, "");
export function normalizeUrl(value: string) {
  if (!value.trim()) return "";
  const url = new URL(value.trim());
  url.hash = "";
  return url.toString();
}

export function honeypotWasFilled(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}
