import { Container, LinkButton, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { Breadcrumbs, ContentHero, ContentState } from "../public-content";
type Props = Readonly<{ params: Promise<{ locale: string }> }>;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  return publicMetadata(locale, "talent", t("talentTitle"), t("talentSummary"));
}
export default async function TalentPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[{ label: t("home"), href: `/${locale}` }, { label: t("talentTitle") }]}
      />
      <ContentHero
        eyebrow={t("talentEyebrow")}
        title={t("talentTitle")}
        summary={t("talentSummary")}
      />
      <Section aria-label={t("talentEmptyTitle")}>
        <Container>
          <ContentState title={t("talentEmptyTitle")} description={t("talentEmptyDescription")}>
            <LinkButton href={`/${locale}/talent/illustrative-public-profile`} variant="secondary">
              {t("viewProfileTemplate")}
            </LinkButton>
          </ContentState>
        </Container>
      </Section>
    </>
  );
}
