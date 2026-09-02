import { Container, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { cmsField, getSupabasePublishedCmsPage } from "@/lib/cms/service";

import { EngagementOptions } from "../engagement-options";
import { Breadcrumbs, ContentHero, SectionHeading } from "../public-content";

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Engagement" });
  return publicMetadata(locale, "hire", t("title"), t("summary"));
}

export default async function HirePage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "Engagement" });
  const publicContent = await getTranslations({ locale, namespace: "PublicContent" });
  const cms = await getSupabasePublishedCmsPage(locale, "hire");
  const field = (key: string, fallback: string) => cmsField(cms, key, fallback);

  const options = [
    {
      id: "individual",
      title: field("individual.title", t("individualTitle")),
      description: field("individual.description", t("individualDescription")),
      action: field("individual.action", t("individualAction")),
      href: `/${locale}/start-a-project?engagement=individual`,
    },
    {
      id: "team",
      title: field("team.title", t("teamTitle")),
      description: field("team.description", t("teamDescription")),
      action: field("team.action", t("teamAction")),
      href: `/${locale}/start-a-project?engagement=team`,
    },
    {
      id: "project",
      title: field("project.title", t("projectTitle")),
      description: field("project.description", t("projectDescription")),
      action: field("project.action", t("projectAction")),
      href: `/${locale}/start-a-project`,
    },
  ] as const;

  return (
    <>
      <Breadcrumbs
        ariaLabel={publicContent("breadcrumbLabel")}
        items={[{ label: publicContent("home"), href: `/${locale}` }, { label: t("eyebrow") }]}
      />
      <ContentHero
        eyebrow={field("hero.eyebrow", t("eyebrow"))}
        title={field("hero.title", t("title"))}
        summary={field("hero.summary", t("summary"))}
      />
      <Section aria-label={field("boundary.title", t("boundaryTitle"))}>
        <Container>
          <SectionHeading
            title={field("boundary.title", t("boundaryTitle"))}
            description={field("boundary.description", t("boundaryDescription"))}
          />
          <EngagementOptions options={options} />
        </Container>
      </Section>
    </>
  );
}
