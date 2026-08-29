export const SUPPORTED_LOCALES = ["en", "fr"] as const;
export const DEFAULT_LOCALE = "en" as const;
export const LOCALE_COOKIE_NAME = "umoja_locale" as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
