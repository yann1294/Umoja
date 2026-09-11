import "server-only";

export function safeIntakeReturnPath(value: unknown, locale: "en" | "fr") {
  const fallback = `/${locale}/admin/intake`;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//"))
    return fallback;
  return new RegExp(`^/${locale}/admin/intake(?:/(?!sign-in(?:/|$))[^?#]*)?$`).test(value)
    ? value
    : fallback;
}
