import { Container, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { getServices } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { cmsField, getSupabasePublishedCmsPage } from "@/lib/cms/service";

import { Breadcrumbs, ContentHero, SectionHeading, ServiceCards } from "../public-content";

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const cms = await getSupabasePublishedCmsPage(locale, "services");
  return publicMetadata(
    locale,
    "services",
    cmsField(cms, "hero.title", cms?.title ?? t("servicesTitle")),
    cmsField(cms, "hero.summary", cms?.seoDescription ?? t("servicesSummary")),
  );
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const cms = await getSupabasePublishedCmsPage(locale, "services");
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[{ label: t("home"), href: `/${locale}` }, { label: t("servicesTitle") }]}
      />
      <ContentHero
        eyebrow={cmsField(cms, "hero.eyebrow", t("servicesEyebrow"))}
        title={cmsField(cms, "hero.title", cms?.title ?? t("servicesTitle"))}
        summary={cmsField(cms, "hero.summary", t("servicesSummary"))}
      />
      <Section aria-labelledby="services-list-title">
        <Container>
          <SectionHeading
            title={t("servicesSectionTitle")}
            description={t("servicesSectionDescription")}
          />
          <div id="services-list-title">
            <ServiceCards
              services={getServices()}
              locale={locale}
              actionLabel={t("exploreService")}
            />
          </div>
        </Container>
      </Section>
    </>
  );
}
