import { Container, LinkButton, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { Breadcrumbs, ContentHero, ContentState } from "../public-content";

type Props = Readonly<{ params: Promise<{ locale: string }> }>;
export async function generateMetadata({ params }: Props): Promise<Metadata> { const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound(); const t = await getTranslations({ locale, namespace: "PublicContent" }); return publicMetadata(locale, "work", t("workTitle"), t("workSummary")); }
export default async function WorkPage({ params }: Props) { const { locale } = await params; if (!hasLocale(routing.locales, locale)) notFound(); const t = await getTranslations({ locale, namespace: "PublicContent" }); return <><Breadcrumbs ariaLabel={t("breadcrumbLabel")} items={[{label:t("home"),href:`/${locale}`},{label:t("workTitle")}]} /><ContentHero eyebrow={t("workEyebrow")} title={t("workTitle")} summary={t("workSummary")} /><Section aria-label={t("workEmptyTitle")}><Container><ContentState title={t("workEmptyTitle")} description={t("workEmptyDescription")}><LinkButton href={`/${locale}/work/illustrative-delivery-template`} variant="secondary">{t("viewCaseTemplate")}</LinkButton></ContentState></Container></Section></>; }
