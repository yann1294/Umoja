import "server-only";

const sensitiveKey =
  /authorization|body|cookie|credential|email|encryption|key|password|payload|phone|secret|session|token/i;
const sensitiveValue =
  /(?:bearer\s+\S+|sb_secret_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i;

function sanitize(value: unknown, key = "", depth = 0): unknown {
  if (sensitiveKey.test(key)) return "[REDACTED]";
  if (depth > 4) return "[TRUNCATED]";
  if (value instanceof Error) return { name: value.name };
  if (typeof value === "string") {
    if (sensitiveValue.test(value)) return "[REDACTED]";
    return value.replace(/[\r\n\t]+/g, " ").slice(0, 256);
  }
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => sanitize(item, key, depth + 1));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .slice(0, 40)
        .map(([entryKey, entryValue]) => [entryKey, sanitize(entryValue, entryKey, depth + 1)]),
    );
  }
  return String(value).slice(0, 128);
}

function write(level: "error" | "info" | "warn", event: string, context: Record<string, unknown>) {
  console[level](
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event: sanitize(event),
      context: sanitize(context),
    }),
  );
}

export const logInfo = (event: string, context: Record<string, unknown> = {}) =>
  write("info", event, context);
export const logWarn = (event: string, context: Record<string, unknown> = {}) =>
  write("warn", event, context);
export const logError = (event: string, context: Record<string, unknown> = {}) =>
  write("error", event, context);
