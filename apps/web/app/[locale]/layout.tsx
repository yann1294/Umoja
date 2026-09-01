import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

import "@umoja/ui/styles.css";
import "../globals.css";
import { fontVariables } from "../fonts";
import { routing } from "@/i18n/routing";
import { getApplicationEnvironment } from "@/lib/config/environment";
import { publicIndexingEnabled } from "@/lib/config/release-security";

import { PublicShell } from "./public-shell";

type LocaleLayoutProps = Readonly<{
  children: ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  const t = await getTranslations({ locale, namespace: "Metadata" });
  const publicIndexing = publicIndexingEnabled();

  return {
    metadataBase: new URL(getApplicationEnvironment().APP_URL),
    title: {
      default: t("title"),
      template: `%s | ${t("title")}`,
    },
    description: t("description"),
    robots: {
      index: publicIndexing,
      follow: publicIndexing,
      noarchive: !publicIndexing,
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <NextIntlClientProvider>
          <PublicShell locale={locale}>{children}</PublicShell>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
