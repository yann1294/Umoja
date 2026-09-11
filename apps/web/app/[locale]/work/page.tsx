import { Container, LinkButton, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";
import { getSupabasePublishedCmsPage, cmsField } from "@/lib/cms/service";
import { listPublishedCmsCaseStudies } from "@/lib/cms/public-rendering";
import { Breadcrumbs, ContentHero, ContentState, publicContentStyles as styles } from "../public-content";
import { localize } from "@/content/public-content";

type Props = Readonly<{ params: Promise<{ locale: string }> }>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const cms = await getSupabasePublishedCmsPage(locale, "work");
  return publicMetadata(
    locale,
    "work",
    cmsField(cms, "hero.title", cms?.title ?? t("workTitle")),
    cmsField(cms, "hero.summary", cms?.seoDescription ?? t("workSummary")),
  );
}

export default async function WorkPage({ params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const cms = await getSupabasePublishedCmsPage(locale, "work");
  const caseStudies = await listPublishedCmsCaseStudies(locale);
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[{ label: t("home"), href: `/${locale}` }, { label: t("workTitle") }]}
      />
      <ContentHero
        eyebrow={cmsField(cms, "hero.eyebrow", t("workEyebrow"))}
        title={cmsField(cms, "hero.title", cms?.title ?? t("workTitle"))}
        summary={cmsField(cms, "hero.summary", t("workSummary"))}
      />
      <Section aria-label={caseStudies.length ? t("workTitle") : t("workEmptyTitle")}>
        <Container>
          {caseStudies.length ? (
            <ul className={styles.portfolioGrid}>
              {caseStudies.map((study) => (
                <li className={styles.featureCard} key={study.slug}>
                  <h2>{localize(study.title, locale)}</h2>
                  <p>{localize(study.summary, locale)}</p>
                  <LinkButton href={`/${locale}/work/${study.slug}`} variant="secondary">
                    {t("viewCaseTemplate")}
                  </LinkButton>
                </li>
              ))}
            </ul>
          ) : (
            <ContentState
              title={cmsField(cms, "empty.title", t("workEmptyTitle"))}
              description={cmsField(cms, "empty.description", t("workEmptyDescription"))}
            >
              <LinkButton
                href={`/${locale}/work/illustrative-delivery-template`}
                variant="secondary"
              >
                {t("viewCaseTemplate")}
              </LinkButton>
            </ContentState>
          )}
        </Container>
      </Section>
    </>
  );
}
