import "server-only";

const localePattern = "(en|fr)";

export function safeAuthReturnPath(value: unknown, locale: "en" | "fr") {
  const fallback = `/${locale}/workspace`;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }
  if (!new RegExp(`^/${localePattern}/`).test(value)) return fallback;
  if (/[\\\u0000-\u001f]/.test(value) || value.includes("?next=")) return fallback;
  return new RegExp(
    `^/${locale}/(?:workspace(?:/(?:profile|skills|languages|portfolio|availability))?|admin(?:/(?:content|intake)(?:/[^?#]*)?)?|account-state)(?:\\?[^#]*)?$`,
  ).test(value)
    ? value
    : fallback;
}
