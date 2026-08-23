import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getEditorialPage, localize } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { EditorialRoute } from "../editorial-page";
type Props = Readonly<{ params: Promise<{ locale: string }> }>;
const page = getEditorialPage("africit")!;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return publicMetadata(
    locale,
    "africit",
    localize(page.title, locale),
    localize(page.summary, locale),
  );
}
export default async function AfricIT({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <EditorialRoute locale={locale} page={page} emptyState="africit" showAfricITLinks />;
}
