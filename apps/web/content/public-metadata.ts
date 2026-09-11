import type { Metadata } from "next";

import type { AppLocale } from "@/i18n/routing";

export function publicMetadata(
  locale: AppLocale,
  path: string,
  title: string,
  description: string,
): Metadata {
  const suffix = path ? `/${path}` : "";
  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}${suffix}`,
      languages: { en: `/en${suffix}`, fr: `/fr${suffix}`, "x-default": `/en${suffix}` },
    },
    openGraph: {
      type: "website",
      locale: locale === "fr" ? "fr_FR" : "en_GB",
      alternateLocale: locale === "fr" ? ["en_GB"] : ["fr_FR"],
      siteName: "Umoja",
      title,
      description,
      url: `/${locale}${suffix}`,
    },
  };
}
