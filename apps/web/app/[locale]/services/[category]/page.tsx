import { Container, LinkButton, Section } from "@umoja/ui";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";

import { getService, localize, SERVICE_SLUGS } from "@/content/public-content";
import { publicMetadata } from "@/content/public-metadata";
import { routing } from "@/i18n/routing";

import { Breadcrumbs, ContentHero, publicContentStyles as styles } from "../../public-content";

type Props = Readonly<{ params: Promise<{ locale: string; category: string }> }>;
export function generateStaticParams() {
  return SERVICE_SLUGS.map((category) => ({ category }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, category } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const service = getService(category);
  if (!service) notFound();
  return publicMetadata(
    locale,
    `services/${category}`,
    localize(service.title, locale),
    localize(service.summary, locale),
  );
}

export default async function ServicePage({ params }: Props) {
  const { locale, category } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  const service = getService(category);
  if (!service) notFound();
  const t = await getTranslations({ locale, namespace: "PublicContent" });
  const title = localize(service.title, locale);
  return (
    <>
      <Breadcrumbs
        ariaLabel={t("breadcrumbLabel")}
        items={[
          { label: t("home"), href: `/${locale}` },
          { label: t("servicesTitle"), href: `/${locale}/services` },
          { label: title },
        ]}
      />
      <ContentHero
        eyebrow={t("servicesEyebrow")}
        title={title}
        summary={localize(service.description, locale)}
        illustrativeLabel={localize(service.illustrativeLabel, locale)}
      />
      <Section aria-label={title}>
        <Container>
          <div className={styles.detailGrid}>
            <div>
              <h2>{t("capabilities")}</h2>
              <ul className={styles.detailList}>
                {service.capabilities.map((item) => (
                  <li className={styles.detailCard} key={localize(item, locale)}>
                    <p>{localize(item, locale)}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2>{t("approach")}</h2>
              <ul className={styles.detailList}>
                {service.approach.map((item) => (
                  <li className={styles.detailCard} key={localize(item, locale)}>
                    <p>{localize(item, locale)}</p>
                  </li>
                ))}
              </ul>
              <div className={styles.actionRow}>
                <LinkButton href={`/${locale}/start-a-project`}>{t("startProject")}</LinkButton>
              </div>
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
