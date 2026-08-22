import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";

import { getIntakeCopy } from "@/content/intake-copy";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";

import { IntakePage } from "../intake/intake-page";

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const copy = getIntakeCopy(locale).talent;
  return publicMetadata(locale, "join", copy.title, copy.intro);
}

export default async function JoinPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  return <IntakePage locale={locale} kind="talent" />;
}
