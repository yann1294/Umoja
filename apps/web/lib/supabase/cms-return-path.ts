import "server-only";

export function safeCmsReturnPath(value: unknown, locale: "en" | "fr") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return `/${locale}/admin/content`;
  const allowed = new RegExp(`^/${locale}/(?:admin/content(?:/.*)?|api/cms/media(?:/.*)?)$`);
  return allowed.test(value) ? value : `/${locale}/admin/content`;
}
